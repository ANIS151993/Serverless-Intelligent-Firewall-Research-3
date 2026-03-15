"""
ASLF-OSINT multi-paradigm detection engine.

This implementation follows the project documents pragmatically:
- XGBoost + BiGRU fusion for the primary detector
- DAWMA-style drift tracking for online adaptation signals
- FedNova aggregation helper for multi-node updates
- Zero-trust trust scoring with OSINT enrichment

The runtime uses a heuristic fallback when no trained model artifacts exist yet.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import joblib
import numpy as np
import torch
import torch.nn as nn
import xgboost as xgb
from sklearn.preprocessing import StandardScaler


log = logging.getLogger("sif-ai.detector")

ATTACK_CLASSES = {
    0: "BENIGN",
    1: "DoS",
    2: "DDoS",
    3: "BruteForce",
    4: "PortScan",
    5: "WebAttack",
    6: "Botnet",
    7: "Other",
}
NUM_FEATURES = 67
SEQUENCE_LEN = 10
HIDDEN_DIM = 128
NUM_CLASSES = 8
MODEL_DIR = os.getenv("SIF_MODEL_DIR", "/opt/sif-ai/models")


class BiGRUModel(nn.Module):
    def __init__(self, input_dim: int = NUM_FEATURES, hidden_dim: int = HIDDEN_DIM, num_classes: int = NUM_CLASSES):
        super().__init__()
        self.bigru = nn.GRU(
            input_dim,
            hidden_dim,
            batch_first=True,
            bidirectional=True,
            num_layers=2,
            dropout=0.3,
        )
        self.classifier = nn.Sequential(
            nn.Linear(hidden_dim * 2, 256),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(256, num_classes),
            nn.Softmax(dim=1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        output, _ = self.bigru(x)
        return self.classifier(output[:, -1, :])


@dataclass
class DetectionResult:
    attack_type: str
    confidence: float
    probabilities: dict[str, float]


class ASLFDetector:
    def __init__(self):
        os.makedirs(MODEL_DIR, exist_ok=True)
        self.xgb_model = xgb.XGBClassifier(
            n_estimators=500,
            max_depth=6,
            learning_rate=0.1,
            reg_lambda=1.0,
            gamma=0.1,
            subsample=0.8,
            eval_metric="mlogloss",
            n_jobs=2,
            tree_method="hist",
        )
        self.bigru_model = BiGRUModel()
        self.scaler = StandardScaler()
        self.alpha = 0.5
        self.is_trained = False
        self.version = "3.0.0-base"
        self._load_if_exists()

    def _load_if_exists(self):
        xgb_path = os.path.join(MODEL_DIR, "xgb_model.json")
        gru_path = os.path.join(MODEL_DIR, "bigru_model.pt")
        scaler_path = os.path.join(MODEL_DIR, "scaler.pkl")
        version_path = os.path.join(MODEL_DIR, "version.json")
        if not (os.path.exists(xgb_path) and os.path.exists(gru_path) and os.path.exists(scaler_path)):
            return

        try:
            self.xgb_model.load_model(xgb_path)
            self.bigru_model.load_state_dict(torch.load(gru_path, map_location="cpu"))
            self.bigru_model.eval()
            self.scaler = joblib.load(scaler_path)
            if os.path.exists(version_path):
                with open(version_path, "r", encoding="utf-8") as handle:
                    self.version = json.load(handle).get("version", self.version)
            self.is_trained = True
            log.info("Loaded trained model artifacts from %s", MODEL_DIR)
        except Exception as exc:
            log.warning("Failed to load model artifacts: %s", exc)

    def save(self, version: str | None = None):
        if version:
            self.version = version
        self.xgb_model.save_model(os.path.join(MODEL_DIR, "xgb_model.json"))
        torch.save(self.bigru_model.state_dict(), os.path.join(MODEL_DIR, "bigru_model.pt"))
        joblib.dump(self.scaler, os.path.join(MODEL_DIR, "scaler.pkl"))
        with open(os.path.join(MODEL_DIR, "version.json"), "w", encoding="utf-8") as handle:
            json.dump({"version": self.version, "saved_at": datetime.utcnow().isoformat()}, handle)

    def predict_proba(self, features: np.ndarray) -> np.ndarray:
        if features.ndim != 2:
            raise ValueError("Features must be a 2D array")

        if features.shape[1] < NUM_FEATURES:
            features = np.pad(features, ((0, 0), (0, NUM_FEATURES - features.shape[1])))
        elif features.shape[1] > NUM_FEATURES:
            features = features[:, :NUM_FEATURES]

        if not self.is_trained:
            return self._heuristic_predict(features)

        scaled = self.scaler.transform(features)
        xgb_prob = self.xgb_model.predict_proba(scaled)
        sequence_batch = np.stack([scaled] * SEQUENCE_LEN, axis=1)
        with torch.no_grad():
            gru_prob = self.bigru_model(torch.tensor(sequence_batch, dtype=torch.float32)).numpy()
        return self.alpha * xgb_prob + (1.0 - self.alpha) * gru_prob

    def classify(self, features: np.ndarray) -> list[DetectionResult]:
        probabilities = self.predict_proba(features)
        results: list[DetectionResult] = []
        for row in probabilities:
            index = int(np.argmax(row))
            results.append(
                DetectionResult(
                    attack_type=ATTACK_CLASSES[index],
                    confidence=float(np.max(row)),
                    probabilities={ATTACK_CLASSES[i]: float(row[i]) for i in range(NUM_CLASSES)},
                )
            )
        return results

    def _heuristic_predict(self, features: np.ndarray) -> np.ndarray:
        probabilities = np.zeros((len(features), NUM_CLASSES))
        for idx, row in enumerate(features):
            pkt_rate = float(row[5]) if len(row) > 5 else 0.0
            dst_port = float(row[1]) if len(row) > 1 else 0.0
            if pkt_rate > 9000:
                probabilities[idx, 1] = 0.72
                probabilities[idx, 2] = 0.18
                probabilities[idx, 0] = 0.10
            elif pkt_rate > 4500:
                probabilities[idx, 2] = 0.68
                probabilities[idx, 1] = 0.14
                probabilities[idx, 0] = 0.18
            elif dst_port in {21.0, 22.0, 3389.0}:
                probabilities[idx, 3] = 0.66
                probabilities[idx, 0] = 0.34
            elif dst_port in {80.0, 443.0} and pkt_rate > 2000:
                probabilities[idx, 5] = 0.62
                probabilities[idx, 0] = 0.38
            else:
                probabilities[idx, 0] = 0.92
                probabilities[idx, 4] = 0.08 if pkt_rate > 1200 else 0.0
        return probabilities


class DAWMADriftDetector:
    def __init__(self, recent_window: int = 1000, reference_window: int = 10000, sigma_k: float = 3.0):
        self.recent_window = recent_window
        self.reference_window = reference_window
        self.sigma_k = sigma_k
        self.recent: list[int] = []
        self.history: list[int] = []
        self.drift = False

    def update(self, is_error: bool) -> bool:
        sample = int(is_error)
        self.recent.append(sample)
        self.history.append(sample)
        if len(self.recent) > self.recent_window:
            self.recent.pop(0)
        if len(self.history) > self.reference_window:
            self.history.pop(0)
        if len(self.history) < 100:
            self.drift = False
            return False

        recent_error = float(np.mean(self.recent))
        reference_error = float(np.mean(self.history))
        sigma = float(np.std(self.history)) + 1e-9
        self.drift = abs(recent_error - reference_error) > self.sigma_k * sigma
        return self.drift


class FedNovaAggregator:
    @staticmethod
    def aggregate(client_deltas: list[dict[str, float]], sample_counts: list[int]) -> dict[str, float]:
        if not client_deltas or not sample_counts or len(client_deltas) != len(sample_counts):
            raise ValueError("Client deltas and sample counts must be non-empty and aligned")
        total = sum(sample_counts)
        weights = [count / total for count in sample_counts]
        result: dict[str, float] = {}
        for key in client_deltas[0]:
            result[key] = sum(weight * delta[key] for weight, delta in zip(weights, client_deltas))
        return result


def compute_zta_trust_score(
    source_ip: str,
    features: dict[str, Any],
    osint_values: set[str] | None = None,
) -> float:
    score = 0.4

    if osint_values and source_ip in osint_values:
        score -= 0.35

    pkt_rate = float(features.get("flow_packets_per_s", 0.0))
    if pkt_rate > 8000:
        score -= 0.25
    elif pkt_rate > 3000:
        score -= 0.10
    elif pkt_rate < 500:
        score += 0.10

    hour = datetime.utcnow().hour
    if 6 <= hour <= 22:
        score += 0.10
    else:
        score -= 0.05

    return float(max(0.0, min(1.0, score)))
