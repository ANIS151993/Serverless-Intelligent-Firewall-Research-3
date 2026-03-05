# Autonomous Self-Learning Serverless Intelligent Firewall (Research-3)

## Title
Autonomous Self-Learning Serverless Intelligent Firewall: Integrating REST API-Driven Open-Source Threat Intelligence, Multi-Paradigm Machine Learning, and Federated Zero-Trust Architectures

## Authors
Md Anisur Rahman Chowdhury* and Kefei Wang  
Department of Computer and Information Science, Gannon University, Erie, Pennsylvania, USA  
*Corresponding author: engr.aanis@gmail.com

## Abstract
This paper presents a new third-stage contribution in the Serverless Intelligent Firewall research line. Research-1 established an LSTM-based serverless intrusion detection baseline with zero-trust framing. Research-2 extended that baseline into cross-cloud operation with hybrid XGBoost+BiGRU scoring and unified policy control. Research-3 introduces ASLF-OSINT, an autonomous multi-tenant architecture that continuously learns from open-source threat intelligence and preserves local enforcement under control-plane instability. The framework combines five complementary learning tracks: policy optimization via PPO, continual drift adaptation, few-shot meta-learning for emerging attacks, transfer learning for domain migration, and federated aggregation with FedNova. Operationally, a super control system provisions tenants, publishes upgrades, and monitors fleet posture, while each tenant receives a compact subsystem and dashboard for local/cloud asset onboarding, real-time traffic visibility, and policy enforcement. Evaluation on CICIDS2017, CSE-CIC-IDS2018, UNSW-NB15, NSL-KDD, and 30 days of live OSINT signals reports 98.7% detection accuracy, 87 ms average response latency, 94.3% few-shot zero-day detection, 12.4-minute concept-drift adaptation, and 99.8% federated policy consistency. These results position Research-3 as a distinct transition from static experimental IDS prototypes to an enterprise-operable autonomous firewall platform.

## Keywords
Serverless security; autonomous adaptation; open-source threat intelligence; federated learning; zero trust; multi-tenant control plane

## 1. Introduction
Serverless computing has shifted enterprise security from static perimeter defense to continuously changing trust boundaries. Workloads are short-lived, identities are context-dependent, and attack behavior evolves faster than periodic retraining cycles. In this setting, static IDS models and centralized-only governance expose operational gaps.

This study is not a copy of earlier work. It is the synthesis and extension of two prior stages into a new architecture:

- Research-1: high-quality LSTM intrusion detection foundation in serverless environments.
- Research-2: cross-cloud adaptation and unified policy flow across AWS, Azure, and GCP.
- Research-3 (this work): autonomous OSINT-driven learning, multi-tenant super-control governance, and compact tenant subsystems that remain effective even when the central plane is degraded.

## 2. Research Lineage and Novelty

| Dimension | Research-1 | Research-2 | Research-3 (ASLF-OSINT) |
|---|---|---|---|
| Core detector | LSTM | XGBoost + BiGRU fusion | Multi-paradigm adaptive stack |
| Data regime | Offline benchmark training | Offline + cross-cloud replay | Offline + 30-day live OSINT ingestion |
| Deployment scope | Serverless IDS baseline | Cross-cloud orchestration | Super-control + tenant-local compact systems |
| Adaptation model | Manual retraining | Scheduled update | Continuous drift-aware autonomous update |
| Governance | Single-project view | Unified control plane | Hierarchical provider-to-tenant governance |
| Enterprise readiness | Limited | Medium | High (tenant onboarding, upgrades, real-time telemetry, API auth/RBAC, streaming) |

Research-3 novelty is therefore architectural, methodological, and operational:
1. Architectural novelty: hierarchical super-control and tenant subsystem federation.
2. Methodological novelty: integrated five-track learning pipeline with real-time OSINT context.
3. Operational novelty: authenticated API control, role-aware access boundaries, real-time dashboard streaming, and upgrade synchronization across tenants.

## 3. Problem Statement
The target setting is a managed security provider operating a shared platform for many corporate clients. Each client needs local autonomy, while the provider needs fleet-wide observability and policy coherence.

### 3.1 Core Challenges
1. New indicators emerge faster than static dataset refresh cycles.
2. Data distribution shifts degrade fixed models.
3. Centralized enforcement alone creates a single operational bottleneck.
4. Multi-tenant platforms require strict role and scope separation.
5. Analysts need explainable decisions for trust and audit.

### 3.2 Research Questions
1. Can live OSINT ingestion improve adaptive detection quality without sacrificing latency?
2. Can a super-control and compact-tenant split reduce dependency on central availability?
3. Can federated updates preserve global policy consistency while keeping tenant data localized?
4. Can a single system deliver both research-grade metrics and deployment-grade manageability?

## 4. System Design

### 4.1 Super Control System
The super control layer performs global lifecycle functions:
1. corporate tenant provisioning and API credential issuance,
2. policy and model bundle publication,
3. cross-tenant telemetry aggregation,
4. fleet risk and upgrade status monitoring,
5. supervision of tenant synchronization health.

### 4.2 Tenant Compact Subsystem
Each tenant receives a compact runtime instance that can:
1. onboard local networks and cloud assets,
2. score and enforce traffic decisions locally,
3. keep protecting assets during temporary super-control disconnection,
4. re-synchronize telemetry, policy versions, and upgrades on reconnect.

### 4.3 Dashboard Hierarchy
1. Super dashboard: fleet-level posture, tenant activity, upgrades, and global incident trends.
2. Tenant dashboard: asset-level visibility, traffic/threat timeline, policy decisions, and response history.

### 4.4 Security Control Plane
The implementation applies:
1. token-based authentication with role-aware authorization boundaries,
2. tenant-scope isolation for all tenant endpoints,
3. real-time dashboard event streaming over WebSocket channels,
4. rate limiting and strict payload checks for API hardening.

## 5. Autonomous Learning Pipeline
The ASLF-OSINT engine combines five learning tracks.

### 5.1 Reinforcement-Guided Policy Optimization
PPO updates decision policy based on reward balancing detection quality, latency, and false positive impact.

### 5.2 Continual Drift Adaptation
A drift monitor tracks distribution changes in telemetry and triggers focused adaptation rather than full retraining.

### 5.3 Few-Shot Meta-Learning
Prototype-based meta-learning supports emerging-class adaptation from very small labeled sets.

### 5.4 Transfer Learning
Feature representations are reused between domains (provider, sector, cloud profile) to reduce warm-up time.

### 5.5 Federated Aggregation
FedNova-style normalization is used for distributed updates from tenant subsystems while keeping raw data local.

### 5.6 Composite Risk Score
For an event at time step \(t\), risk is represented as:
\[
R_t = \alpha B_t + \beta A_t + \gamma I_t + \delta O_t + \epsilon D_t
\]
where \(B_t\) is behavioral anomaly evidence, \(A_t\) is model anomaly confidence, \(I_t\) is identity risk, \(O_t\) is OSINT severity, and \(D_t\) captures drift pressure. Adaptive weights are periodically recalibrated using feedback from analyst validation and enforcement outcomes.

## 6. Threat Intelligence Ingestion
REST collectors query MISP, AlienVault OTX, and VirusTotal. Indicators are normalized into a common schema (IP, domain, hash, confidence, source reliability, timestamp) and fused with runtime telemetry.

OSINT fusion contributes in two ways:
1. immediate context for near-real-time policy decisions,
2. scheduled retraining input for medium-term model adaptation.

## 7. Experimental Design

### 7.1 Data Sources
1. CICIDS2017
2. CSE-CIC-IDS2018
3. UNSW-NB15
4. NSL-KDD
5. 30-day live OSINT feed stream

### 7.2 Platforms
1. AWS Lambda
2. Azure Functions
3. Google Cloud Functions
4. Proxmox-backed federation nodes for tenant/super-control deployment experiments

### 7.3 Metrics
1. Detection accuracy, precision, recall, F1
2. Decision latency
3. Few-shot zero-day detection rate
4. Drift adaptation delay
5. Federated policy consistency
6. Analyst trust score from explanation quality

## 8. Results

| Metric | Research-1 | Research-2 | Research-3 |
|---|---:|---:|---:|
| Detection accuracy | 98.0% | 98.0% | 98.7% |
| Mean response latency | 135 ms (baseline path) | 135 ms (cross-cloud) | 87 ms |
| Few-shot zero-day detection | Not primary target | Limited | 94.3% |
| Concept drift adaptation | Manual cycle | Scheduled update | 12.4 min |
| Policy consistency across nodes | Not measured | Near 99% class | 99.8% |
| Analyst trust (explainability) | Not measured | Partial | 91.2% |

The strongest gain appears in adaptation behavior: Research-3 improves zero-day handling and drift recovery while retaining low latency.

## 9. Ablation Analysis

| Configuration | Accuracy | Zero-day Detection | Drift Recovery |
|---|---:|---:|---:|
| LSTM baseline path | 96.1% | 71.2% | Manual |
| + Cross-cloud orchestration layer | 97.3% | 78.6% | Scheduled |
| + OSINT enrichment | 98.0% | 86.9% | 24.7 min |
| + Full autonomous stack (PPO + continual + meta + transfer + federated) | 98.7% | 94.3% | 12.4 min |

This progression shows that the gains are not from one component alone; they come from interaction between OSINT context and adaptive multi-paradigm learning.

## 10. Enterprise Operation Model
The proposed governance model supports managed security service operation:
1. provider creates and controls tenant accounts from a super dashboard,
2. tenant administrators onboard local systems, cloud services, and network segments,
3. tenant telemetry continuously informs global update strategy,
4. platform upgrades from super control propagate automatically to tenant subsystems.

This design reduces hard dependency on central availability while preserving coordinated evolution.

## 11. Security, Privacy, and Compliance Notes
1. Tenant data remains local by default; federated updates share model deltas and summary telemetry.
2. Role boundaries enforce least-privilege access to super and tenant interfaces.
3. Artifact distribution is policy-gated and encrypted for controlled dissemination.
4. Audit logs preserve decision traceability for governance and incident analysis.

## 12. Reproducibility and Artifact Map
1. Core runtime: `src/sif/firewall.py`, `src/sif/orchestrator.py`, `src/sif/zero_trust.py`
2. OSINT + learning logic: `src/sif/threat_intel.py`, `src/sif/model.py`, `src/sif/federation.py`
3. Multi-tenant control: `src/sif/multi_tenant.py`, `src/sif/api_server.py`, `src/sif/auth.py`
4. Dashboards: `docs/index.html`, `docs/super-dashboard.html`, `docs/tenant-dashboard.html`
5. Tests: `tests/test_firewall.py`, `tests/test_multi_tenant.py`, `tests/test_auth.py`
6. Deployment references: `IMPLEMENTATION_GUIDE.md`, `DEPLOYMENT_PROXMOX_GUIDE.md`

## 13. Limitations and Future Directions
1. Longer real-production windows are required for stronger longitudinal claims.
2. Adversarial poisoning resilience in OSINT pipelines requires deeper formal treatment.
3. Stronger cryptographic attestation can further harden upgrade integrity.
4. Economic optimization can be added to policy orchestration for cost-aware defense.

## 14. Conclusion
Research-3 is a distinct and complete extension of the previous two studies. It merges the validated foundations of Research-1 and Research-2 with a new autonomous, OSINT-driven, federated multi-tenant security architecture. The result is a deployable serverless intelligent firewall system that supports provider-scale governance, tenant-local resilience, and continuous adaptation against evolving threats.
