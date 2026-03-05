from __future__ import annotations

import json
import unittest
from pathlib import Path

from sif.firewall import ServerlessIntelligentFirewall


class FirewallTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.repo_root = Path(__file__).resolve().parents[1]
        cls.firewall = ServerlessIntelligentFirewall(cls.repo_root)

    def _load(self, name: str):
        path = self.repo_root / "examples" / "events" / f"{name}.json"
        return json.loads(path.read_text(encoding="utf-8"))

    def test_benign_event_allowed(self):
        result = self.firewall.evaluate(self._load("benign"))
        self.assertEqual(result["decision"]["action"], "ALLOW")
        self.assertLess(result["model"]["risk_score"], 55)

    def test_ddos_event_blocked(self):
        result = self.firewall.evaluate(self._load("ddos"))
        self.assertEqual(result["decision"]["action"], "BLOCK")
        self.assertGreaterEqual(result["model"]["risk_score"], 80)

    def test_credential_abuse_not_allow(self):
        result = self.firewall.evaluate(self._load("credential_abuse"))
        self.assertIn(result["decision"]["action"], {"CHALLENGE", "BLOCK"})
        self.assertIn("mfa_not_verified", result["decision"]["rationale"])

    def test_learning_updates_weights(self):
        payload = self._load("policy_drift")
        before = self.firewall.model.explain_weights()
        self.firewall.learn(payload, is_malicious=True)
        after = self.firewall.model.explain_weights()
        self.assertNotEqual(before, after)


if __name__ == "__main__":
    unittest.main()
