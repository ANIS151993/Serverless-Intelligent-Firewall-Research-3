# Codex Prompt Pack for Research-3 Iteration

## Prompt 1: Improve detection logic

"Read `src/sif/model.py` and `tests/test_firewall.py`. Propose and implement a mathematically stronger scoring function that reduces false positives on benign burst traffic while keeping DDoS detection sensitivity above 95%. Update tests with at least two new edge-case scenarios."

## Prompt 2: Add new threat-intel provider

"Extend `src/sif/threat_intel.py` with a third OSINT REST source adapter (URLHaus or VirusTotal style endpoint abstraction). Make provider usage configurable in `config/threat_intel.json`, include retry/backoff logic, and add unit tests for timeout and malformed JSON responses."

## Prompt 3: Production API service

"Implement `api/server.py` using FastAPI (or stdlib HTTP fallback if dependencies are unavailable) exposing `/health`, `/evaluate`, `/learn`, and `/federation/ingest`. Add request validation, structured JSON logs, and a systemd deployment snippet in `DEPLOYMENT_PROXMOX_GUIDE.md`."

## Prompt 4: Federated policy drift analytics

"Add a policy drift analytics module that tracks drift score over time and exposes a rolling dashboard dataset in `docs/assets/data/policy_drift_timeseries.json`. Use this data to drive a new chart in `docs/index.html` and `docs/script.js`."

## Prompt 5: Journal readiness package

"Prepare a journal submission package by updating `JOURNAL_MANUSCRIPT_DRAFT.md`, `artifacts/latex/main.tex`, and `README.md` so methodology, ablation results, reproducibility steps, and ethics/compliance sections are publication-ready."
