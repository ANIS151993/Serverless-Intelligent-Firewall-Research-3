# Autonomous Self-Learning Serverless Intelligent Firewall (Research-3)

## Title
Autonomous Self-Learning Serverless Intelligent Firewall: Integrating REST API-Driven Open-Source Threat Intelligence, Multi-Paradigm Machine Learning, and Federated Zero-Trust Architectures

## Authors
Md Anisur Rahman Chowdhury* and Kefei Wang  
Department of Computer and Information Science, Gannon University, Erie, Pennsylvania, USA  
*Corresponding author: engr.aanis@gmail.com

## Abstract
Cloud-native systems require defense models that can adapt to fast-changing attack behavior, ephemeral compute execution, and fragmented trust boundaries across providers and private infrastructure. This work presents ASLF-OSINT, an autonomous self-learning serverless intelligent firewall that combines REST API-driven open-source threat intelligence, multi-paradigm learning, and federated zero-trust control. The framework integrates reinforcement learning for policy optimization (PPO), continual drift adaptation (SSF), few-shot meta-learning for emerging attacks, transfer learning for cross-domain generalization, and privacy-preserving federated aggregation (FedNova). It is evaluated with CICIDS2017, CIC-IDS2018, UNSW-NB15, NSL-KDD, and 30 days of live threat-intel signals from MISP, AlienVault OTX, and VirusTotal. Reported outcomes include 98.7% detection accuracy, 87 ms average response latency, 94.3% few-shot zero-day detection, 12.4-minute concept-drift adaptation, and 99.8% federated policy consistency. The proposed Research-3 architecture introduces a super control plane for global orchestration and per-client compact tenant subsystems that reduce central dependency while preserving synchronized upgrade and policy behavior.

## Keywords
Serverless security; autonomous learning; open-source threat intelligence; federated learning; zero trust; multi-tenant control plane

## 1. Introduction
Serverless workloads challenge static perimeter defenses. Functions are short-lived, identity context changes rapidly, and attack patterns evolve faster than periodic retraining pipelines. Earlier Research-1 and Research-2 artifacts established strong baseline IDS and cross-cloud orchestration capabilities, but they still depended on static training snapshots and centralized update workflows. This study extends that lineage into an autonomous and multi-tenant operational model.

## 2. Research Gap
Existing serverless security frameworks commonly exhibit one or more limitations:
1. weak integration of live threat-intelligence into model updates,
2. limited adaptation to concept drift,
3. low support for few-shot zero-day recognition,
4. centralized architectures that are fragile under control-plane disruption,
5. insufficient multi-tenant governance for enterprise-scale deployment.

## 3. Contributions
1. A full ASLF-OSINT architecture integrating live OSINT ingestion and multi-paradigm learning.
2. A super-control / tenant-subsystem design supporting autonomous local protection plus global synchronization.
3. Policy-governed cross-cloud response orchestration across AWS, Azure, GCP, and private nodes.
4. Explainable model outputs (SHAP/LIME-compatible) for analyst trust and auditability.
5. A reproducible artifact containing runnable code, tests, dashboards, and encrypted manuscript/source distribution.

## 4. System Architecture
### 4.1 Super Control System
The super control plane provisions client accounts, manages global policy bundles, publishes platform upgrades, aggregates telemetry, and monitors all tenant security activity in real time.

### 4.2 Tenant Compact Subsystem
Each corporate client receives a compact local subsystem that:
- ingests local and cloud telemetry,
- performs local threat scoring and enforcement,
- remains protective under temporary super-control unavailability,
- syncs upgrades and policies automatically during reconnect cycles.

### 4.3 Tenant Sub-Dashboard
Each client dashboard supports:
- onboarding local networks and cloud services,
- real-time traffic and threat visibility,
- response-action traceability,
- policy and asset health monitoring.

### 4.4 Federated Sync Path
Telemetry, policy state, and version metadata are synchronized between tenant subsystems and super control through lightweight federation endpoints, enabling global adaptation without full data centralization.

## 5. Learning Stack
1. PPO-based policy optimizer for action strategy refinement.
2. SSF-style continual learning for drift-aware adaptation.
3. Prototypical meta-learning for few-shot novel class handling.
4. Transfer learning bridge across heterogeneous domains.
5. FedNova aggregation for distributed, privacy-preserving updates.

## 6. Experimental Setup
Datasets: CICIDS2017, CIC-IDS2018, UNSW-NB15, NSL-KDD  
Live threat-intel feeds: MISP, AlienVault OTX, VirusTotal (30 days)  
Deployment targets: AWS Lambda, Azure Functions, Google Cloud Functions, Proxmox federation nodes

## 7. Reported Results
1. Detection accuracy: 98.7%
2. Average response latency: 87 ms
3. Few-shot zero-day detection: 94.3% (five labeled samples/class)
4. Drift adaptation time: 12.4 minutes
5. Federated policy consistency: 99.8%
6. Analyst trust via explainability: 91.2%

## 8. Operational Impact
The super-control/tenant architecture supports enterprise service models where a provider can onboard and manage many corporate clients while each client retains resilient local protection and near-real-time visibility of defended assets.

## 9. Limitations and Future Work
1. Extend live validation to longer production windows and broader sector-specific datasets.
2. Add formal adversarial robustness benchmarking for prompt-injection-like traffic patterns.
3. Integrate stricter cryptographic attestation for tenant-super synchronization.
4. Expand auto-remediation policies with workload-aware cost optimization.

## 10. Reproducibility and Artifact Map
- Code: `src/sif/*`
- Multi-tenant runtime: `src/sif/multi_tenant.py`, `src/sif/api_server.py`
- Example events: `examples/events/*`
- Tests: `tests/test_firewall.py`, `tests/test_multi_tenant.py`
- Dashboards: `docs/super-dashboard.html`, `docs/tenant-dashboard.html`
- Deployment playbook: `DEPLOYMENT_PROXMOX_GUIDE.md`

## 11. Conclusion
Research-3 delivers a complete transition from static serverless IDS prototypes to an autonomous, federated, and commercially deployable intelligent firewall platform. By combining live OSINT-driven learning, multi-paradigm adaptation, and super-to-tenant operational governance, ASLF-OSINT advances both scientific contribution and practical deployment readiness.
