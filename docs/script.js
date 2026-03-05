const PASS_HASH = "5b484d8b2799daf74779ce686501847d4a08b5e917c1e8395e1da7f7e73bce0d";
const IMPLEMENTATION_ACCESS_KEY = "sif-implementation-access";

const PRESETS = {
  benign: {
    failedAuth: 1,
    requestBurst: 48,
    geoSpread: 1,
    anomalyScore: 14,
    lateralHops: 1,
    policyDrift: 8,
    provider: "aws",
  },
  portscan: {
    failedAuth: 5,
    requestBurst: 520,
    geoSpread: 3,
    anomalyScore: 61,
    lateralHops: 3,
    policyDrift: 22,
    provider: "gcp",
  },
  credential: {
    failedAuth: 14,
    requestBurst: 180,
    geoSpread: 4,
    anomalyScore: 74,
    lateralHops: 5,
    policyDrift: 38,
    provider: "azure",
  },
  ddos: {
    failedAuth: 6,
    requestBurst: 980,
    geoSpread: 5,
    anomalyScore: 90,
    lateralHops: 4,
    policyDrift: 44,
    provider: "aws",
  },
};

const ARCH_DETAILS = {
  ingestion: {
    title: "Traffic ingestion and context capture",
    text: "Stream network telemetry and function-level events into the SIF pipeline while preserving cloud-origin metadata for policy-aware analysis.",
    bullets: [
      "Collect flow features and invocation metadata.",
      "Attach provider, identity, and tenancy context.",
      "Forward normalized records into AI detection pipelines.",
    ],
  },
  feature: {
    title: "Feature engineering and fusion",
    text: "Apply data cleaning, normalization, temporal sequencing, and threat-intel enrichment so Research-1/Research-2 lineage can be fused into Research-3 runtime scoring.",
    bullets: [
      "Run preprocessing, deduplication, and anomaly correction.",
      "Pull REST API threat-intel indicators and normalize confidence values.",
      "Map each event into behavior, anomaly, identity, and intel feature groups.",
    ],
  },
  detection: {
    title: "Threat detection across two model generations",
    text: "Run baseline lineage models and the Research-3 adaptive scoring layer, then reconcile confidence with federated policy thresholds.",
    bullets: [
      "Compute explainable contributions for each risk dimension.",
      "Compare confidence against allow/challenge/block thresholds.",
      "Emit deterministic decision payload for orchestration.",
    ],
  },
  orchestration: {
    title: "Cross-cloud serverless orchestration",
    text: "Invoke cloud-native handlers for AWS, Azure, and GCP using normalized events so mitigation logic remains consistent and auditable.",
    bullets: [
      "Dispatch BLOCK/CHALLENGE/ALLOW actions per provider.",
      "Coordinate event buses and function triggers.",
      "Persist execution telemetry with latency and cost metadata.",
    ],
  },
  policy: {
    title: "Unified zero-trust policy enforcement",
    text: "Use a policy decision layer to validate identity and context for every request, ensuring consistent governance across providers.",
    bullets: [
      "Evaluate policy-as-code rules and identity claims.",
      "Enforce least-privilege access at runtime.",
      "Propagate policy updates with low delay and high consistency.",
    ],
  },
};

const ARCH_MODE_DETAILS = {
  logical: {
    title: "Logical architecture view",
    text: "The system is organized into independent logical layers so data ingestion, detection quality, and policy governance can evolve without tightly coupled rewrites.",
    bullets: [
      "Layered separation keeps architecture maintainable.",
      "Detection model upgrades do not break policy engine logic.",
      "Unified policy remains central while execution stays distributed.",
    ],
  },
  dataflow: {
    title: "Data-flow architecture view",
    text: "Events move through a closed-loop path: telemetry capture, feature preparation, hybrid model scoring, policy evaluation, and response actuation with audit feedback.",
    bullets: [
      "Context-rich records are normalized before inference.",
      "Model outputs are converted into deterministic action payloads.",
      "Each decision writes back to telemetry for continual tuning.",
    ],
  },
  deployment: {
    title: "Deployment architecture view",
    text: "Runtime execution is cloud-distributed while policy intelligence stays unified. This enables provider resilience with consistent identity and access controls.",
    bullets: [
      "AWS, Azure, and GCP handlers share a common event contract.",
      "Control plane enforces zero-trust parity across clouds.",
      "Failover keeps policy behavior stable during provider shifts.",
    ],
  },
};

const EMAIL_TEMPLATE = [
  "Subject: Password request for ASLF-OSINT research download",
  "",
  "Hello Md Anisur Rahman Chowdhury,",
  "I followed the GitHub profile, subscribed to the YouTube channel, and would like the password for the encrypted ASLF-OSINT research package.",
  "Name:",
  "Institution:",
  "Purpose of use:",
  "",
  "Regards,",
  "",
].join("\n");

function byId(id) {
  return document.getElementById(id);
}

async function sha256(value) {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function toggleNav() {
  const links = byId("nav-links");
  if (links) {
    links.classList.toggle("open");
  }
}

function closeNav() {
  const links = byId("nav-links");
  if (links) {
    links.classList.remove("open");
  }
}

function openGate() {
  const overlay = byId("download-gate");
  if (!overlay) {
    return;
  }
  overlay.classList.remove("is-hidden");
  goToGateStep(1);
}

function closeGate() {
  const overlay = byId("download-gate");
  if (overlay) {
    overlay.classList.add("is-hidden");
  }
}

function hasImplementationAccessToken() {
  try {
    return sessionStorage.getItem(IMPLEMENTATION_ACCESS_KEY) === "granted";
  } catch {
    return false;
  }
}

function grantImplementationAccessToken() {
  try {
    sessionStorage.setItem(IMPLEMENTATION_ACCESS_KEY, "granted");
  } catch {
    // Ignore storage restrictions and continue with current session unlock.
  }
}

function consumeImplementationAccessToken() {
  if (!hasImplementationAccessToken()) {
    return false;
  }
  try {
    sessionStorage.removeItem(IMPLEMENTATION_ACCESS_KEY);
  } catch {
    // Best effort token consume.
  }
  return true;
}

function showImplementationGate() {
  const overlay = byId("implementation-gate");
  if (!overlay) {
    return;
  }
  overlay.classList.remove("is-hidden");
  document.body.classList.add("gate-locked");
  goToImplementationStep(1);
}

function hideImplementationGate() {
  const overlay = byId("implementation-gate");
  if (!overlay) {
    return;
  }
  overlay.classList.add("is-hidden");
  document.body.classList.remove("gate-locked");
}

function goToImplementationStep(step) {
  document.querySelectorAll("[data-impl-step]").forEach((node) => {
    node.classList.add("is-hidden");
  });
  const active = document.querySelector(`[data-impl-step="${step}"]`);
  if (active) {
    active.classList.remove("is-hidden");
  }
  const error = byId("impl-error");
  if (error) {
    error.classList.add("is-hidden");
  }
}

function implementationStepOneReady() {
  const git = byId("impl-github");
  const yt = byId("impl-youtube");
  return Boolean(git && git.checked && yt && yt.checked);
}

function implementationStepTwoReady() {
  const req = byId("impl-request");
  return Boolean(req && req.checked);
}

function continueImplementationGate(step) {
  if (step === 2 && !implementationStepOneReady()) {
    return;
  }
  if (step === 3 && !implementationStepTwoReady()) {
    return;
  }
  goToImplementationStep(step);
}

function syncImplementationGateButtons() {
  const step1 = byId("impl-next-1");
  const step2 = byId("impl-next-2");
  if (step1) {
    step1.disabled = !implementationStepOneReady();
  }
  if (step2) {
    step2.disabled = !implementationStepTwoReady();
  }
}

async function unlockImplementationGuide() {
  const overlay = byId("implementation-gate");
  const input = byId("impl-password");
  const error = byId("impl-error");
  if (!input) {
    return;
  }
  if (!implementationStepOneReady()) {
    goToImplementationStep(1);
    return;
  }
  if (!implementationStepTwoReady()) {
    goToImplementationStep(2);
    return;
  }
  const hash = await sha256(input.value.trim());
  if (hash === PASS_HASH) {
    const redirect = overlay?.dataset?.implRedirect || "";
    if (redirect) {
      grantImplementationAccessToken();
      input.value = "";
      window.location.href = redirect;
      return;
    }
    input.value = "";
    hideImplementationGate();
    return;
  }
  if (error) {
    error.classList.remove("is-hidden");
  }
  input.value = "";
}

function initImplementationGate() {
  const overlay = byId("implementation-gate");
  if (!overlay) {
    return;
  }

  const gateMode = overlay.dataset.implMode || "page";

  ["impl-github", "impl-youtube", "impl-request"].forEach((id) => {
    const input = byId(id);
    if (input) {
      input.addEventListener("change", syncImplementationGateButtons);
    }
  });

  const input = byId("impl-password");
  if (input) {
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        unlockImplementationGuide();
      }
    });
  }

  if (gateMode === "entry") {
    document.querySelectorAll("[data-open-implementation-gate]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        showImplementationGate();
        syncImplementationGateButtons();
      });
    });
    return;
  }

  if (consumeImplementationAccessToken()) {
    hideImplementationGate();
    return;
  }

  showImplementationGate();
  syncImplementationGateButtons();
}

function goToGateStep(step) {
  document.querySelectorAll("[data-gate-step]").forEach((node) => {
    node.classList.add("is-hidden");
  });
  const active = document.querySelector(`[data-gate-step="${step}"]`);
  if (active) {
    active.classList.remove("is-hidden");
  }
  const error = byId("gate-error");
  if (error) {
    error.classList.add("is-hidden");
  }
}

function gateStepOneReady() {
  const git = byId("gate-github");
  const yt = byId("gate-youtube");
  return Boolean(git && git.checked && yt && yt.checked);
}

function gateStepTwoReady() {
  const req = byId("gate-request");
  return Boolean(req && req.checked);
}

function continueGate(step) {
  if (step === 2 && !gateStepOneReady()) {
    return;
  }
  if (step === 3 && !gateStepTwoReady()) {
    return;
  }
  goToGateStep(step);
}

async function unlockDownloads() {
  const input = byId("gate-password");
  const error = byId("gate-error");
  if (!input) {
    return;
  }
  const hash = await sha256(input.value.trim());
  if (hash === PASS_HASH) {
    goToGateStep(4);
    input.value = "";
    return;
  }
  if (error) {
    error.classList.remove("is-hidden");
  }
  input.value = "";
}

function syncGateButtons() {
  const step1 = byId("gate-next-1");
  const step2 = byId("gate-next-2");
  if (step1) {
    step1.disabled = !gateStepOneReady();
  }
  if (step2) {
    step2.disabled = !gateStepTwoReady();
  }
}

function copyEmailTemplate(button) {
  const scopedTemplate = button?.previousElementSibling?.classList?.contains("email-template")
    ? button.previousElementSibling.textContent
    : "";
  const templateToCopy = (scopedTemplate || EMAIL_TEMPLATE).trimEnd();

  navigator.clipboard.writeText(templateToCopy).then(() => {
    if (!button) {
      return;
    }
    const prev = button.textContent;
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = prev;
    }, 1500);
  });
}

function fillPreset(name) {
  const preset = PRESETS[name];
  if (!preset) {
    return;
  }
  Object.entries(preset).forEach(([key, value]) => {
    const input = byId(key);
    if (input) {
      input.value = value;
    }
  });
  runSimulation();
}

function classify(score, anomalyScore, requestBurst, policyDrift, failedAuth) {
  if (requestBurst >= 800 || score >= 85) {
    return {
      label: "DDoS / volumetric surge",
      action: "Throttle function concurrency, isolate ingress path, and fan out provider-side mitigations.",
      decision: "Block and absorb",
    };
  }

  if (failedAuth >= 10 || (score >= 68 && anomalyScore >= 70)) {
    return {
      label: "Credential abuse / brute force",
      action: "Force step-up identity checks, revoke active tokens, and quarantine the principal.",
      decision: "Challenge and isolate",
    };
  }

  if (policyDrift >= 35 || (score >= 58 && anomalyScore >= 55)) {
    return {
      label: "Cross-cloud policy anomaly",
      action: "Pause inter-cloud trust propagation and re-apply OPA policy from the unified control plane.",
      decision: "Contain and re-sync",
    };
  }

  if (score >= 42) {
    return {
      label: "Reconnaissance / port-scan pattern",
      action: "Rate-limit source IPs, increase logging depth, and enforce narrow least-privilege paths.",
      decision: "Constrain",
    };
  }

  return {
    label: "Benign / low risk",
    action: "Allow traffic and keep continuous verification active.",
    decision: "Allow",
  };
}

function providerRoute(provider, score) {
  const routes = {
    aws: "AWS Lambda receives the event first, then forwards policy state to Azure and GCP.",
    azure: "Azure Functions executes the first response and propagates identity state through the unified control plane.",
    gcp: "Google Cloud Functions handles ingress scoring, then triggers cross-cloud remediation hooks.",
  };

  const base = routes[provider] || routes.aws;
  if (score >= 70) {
    return `${base} Emergency mode enables synchronized policy push across all providers.`;
  }
  return base;
}

function runSimulation() {
  const values = {
    failedAuth: Number(byId("failedAuth")?.value || 0),
    requestBurst: Number(byId("requestBurst")?.value || 0),
    geoSpread: Number(byId("geoSpread")?.value || 1),
    anomalyScore: Number(byId("anomalyScore")?.value || 0),
    lateralHops: Number(byId("lateralHops")?.value || 0),
    policyDrift: Number(byId("policyDrift")?.value || 0),
    provider: byId("provider")?.value || "aws",
  };

  const score = Math.min(
    100,
    Math.round(
      values.failedAuth * 3 +
        values.requestBurst * 0.05 +
        values.geoSpread * 4 +
        values.anomalyScore * 0.35 +
        values.lateralHops * 4 +
        values.policyDrift * 0.35
    )
  );

  const result = classify(
    score,
    values.anomalyScore,
    values.requestBurst,
    values.policyDrift,
    values.failedAuth
  );

  const riskFill = byId("riskFill");
  if (riskFill) {
    riskFill.style.width = `${score}%`;
  }

  const scoreValue = byId("scoreValue");
  const resultLabel = byId("resultLabel");
  const resultAction = byId("resultAction");
  const resultDecision = byId("resultDecision");
  const resultProvider = byId("resultProvider");
  const statusChip = byId("statusChip");

  if (scoreValue) {
    scoreValue.textContent = String(score);
  }
  if (resultLabel) {
    resultLabel.textContent = result.label;
  }
  if (resultAction) {
    resultAction.textContent = result.action;
  }
  if (resultDecision) {
    resultDecision.textContent = result.decision;
  }
  if (resultProvider) {
    resultProvider.textContent = providerRoute(values.provider, score);
  }
  if (statusChip) {
    statusChip.textContent = score >= 70 ? "High-risk multi-cloud event" : "Simulated ASLF-OSINT assessment";
  }
}

function setArchitectureNode(key) {
  const item = ARCH_DETAILS[key];
  if (!item) {
    return;
  }

  document.querySelectorAll(".arch-node").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.archNode === key);
  });

  const title = byId("arch-detail-title");
  const text = byId("arch-detail-text");
  const list = byId("arch-detail-list");

  if (title) {
    title.textContent = item.title;
  }
  if (text) {
    text.textContent = item.text;
  }
  if (list) {
    list.innerHTML = "";
    item.bullets.forEach((bullet) => {
      const li = document.createElement("li");
      li.textContent = bullet;
      list.appendChild(li);
    });
  }
}

function initArchitectureExplorer() {
  const nodes = document.querySelectorAll(".arch-node");
  if (!nodes.length) {
    return;
  }

  nodes.forEach((button) => {
    button.addEventListener("click", () => {
      setArchitectureNode(button.dataset.archNode);
    });
  });

  setArchitectureNode("ingestion");
}

function setArchitectureMode(modeKey) {
  const item = ARCH_MODE_DETAILS[modeKey];
  if (!item) {
    return;
  }

  document.querySelectorAll(".architecture-mode-btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.archMode === modeKey);
  });

  const title = byId("arch-mode-title");
  const text = byId("arch-mode-text");
  const list = byId("arch-mode-list");

  if (title) {
    title.textContent = item.title;
  }
  if (text) {
    text.textContent = item.text;
  }
  if (list) {
    list.innerHTML = "";
    item.bullets.forEach((bullet) => {
      const li = document.createElement("li");
      li.textContent = bullet;
      list.appendChild(li);
    });
  }
}

function initArchitectureModes() {
  const buttons = document.querySelectorAll(".architecture-mode-btn");
  if (!buttons.length) {
    return;
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      setArchitectureMode(button.dataset.archMode);
    });
  });

  setArchitectureMode("logical");
}

function initVideoInteractive() {
  const player = byId("overview-video-player");
  const buttons = document.querySelectorAll(".video-chapter-btn");
  if (!player || !buttons.length) {
    return;
  }

  const title = byId("video-chapter-title");
  const note = byId("video-chapter-note");
  const flowNodes = document.querySelectorAll(".video-flow-node");
  const base = "https://www.youtube.com/embed/O_pLEz7cyaY";

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("is-active"));
      button.classList.add("is-active");

      const start = button.dataset.videoStart || "0";
      const chapterTitle = button.dataset.videoTitle || "";
      const chapterNote = button.dataset.videoNote || "";
      const node = button.dataset.videoNode || "";

      player.src = `${base}?start=${encodeURIComponent(start)}&autoplay=1&rel=0`;

      if (title) {
        title.textContent = chapterTitle;
      }
      if (note) {
        note.textContent = chapterNote;
      }

      flowNodes.forEach((chip) => {
        chip.classList.toggle("is-active", chip.dataset.videoNode === node);
      });
    });
  });
}

function initReveal() {
  const targets = document.querySelectorAll(
    ".hero-sidecard, .metric-card, .card, .resource-card, .figure-card, .chart-card, .mini-card, .work-card, .research-bridge, .guide-callout, .roadmap-step, .architecture-figure, .paper-sheet, .policy-card"
  );

  if (!targets.length) {
    return;
  }

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => {
      el.classList.add("revealed");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -20px 0px" }
  );

  targets.forEach((el, idx) => {
    el.classList.add("is-reveal");
    el.style.transitionDelay = `${Math.min(idx * 15, 180)}ms`;
    observer.observe(el);
  });
}

function createChart(id, config) {
  if (!window.Chart) {
    return;
  }
  const canvas = byId(id);
  if (!canvas) {
    return;
  }
  new Chart(canvas, config);
}

function buildLineTrendChart(id) {
  createChart(id, {
    type: "line",
    data: {
      labels: ["Epoch 1", "Epoch 10", "Epoch 20", "Epoch 30", "Epoch 40", "Epoch 50", "Epoch 60", "Epoch 80", "Epoch 100"],
      datasets: [
        {
          label: "Training accuracy",
          data: [82, 89, 92, 94.5, 95.5, 96.4, 97.1, 97.8, 98],
          borderColor: "#17395c",
          backgroundColor: "rgba(23,57,92,0.15)",
          pointRadius: 3,
          tension: 0.28,
          fill: true,
        },
        {
          label: "Validation accuracy",
          data: [80, 87, 90.4, 93, 94.8, 95.7, 96.5, 97.2, 97.8],
          borderColor: "#d97706",
          backgroundColor: "rgba(217,119,6,0.14)",
          pointRadius: 3,
          tension: 0.28,
          fill: true,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 75,
          max: 100,
          ticks: {
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
    },
  });
}

function buildPieChart(id) {
  createChart(id, {
    type: "pie",
    data: {
      labels: ["BENIGN", "DDoS", "DoS", "PortScan", "Other"],
      datasets: [
        {
          data: [38, 21, 19, 17, 5],
          backgroundColor: ["#17395c", "#285f8f", "#4d8fc8", "#d97706", "#0f766e"],
          borderColor: "#ffffff",
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });
}

function buildPolicyRadar(id) {
  createChart(id, {
    type: "radar",
    data: {
      labels: ["Identity fidelity", "Policy consistency", "Latency", "Scalability", "Cloud parity", "Threat-intel coverage"],
      datasets: [
        {
          label: "Research-3 ASLF-OSINT",
          data: [96, 99.6, 93, 95, 97, 98],
          borderColor: "#0f766e",
          backgroundColor: "rgba(15,118,110,0.16)",
          pointBackgroundColor: "#0f766e",
          pointRadius: 3,
        },
        {
          label: "Research-1 baseline",
          data: [90, 85, 88, 86, 70, 62],
          borderColor: "#d97706",
          backgroundColor: "rgba(217,119,6,0.12)",
          pointBackgroundColor: "#d97706",
          pointRadius: 3,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 60,
          max: 100,
        },
      },
    },
  });
}

function initCharts() {
  if (!window.Chart) {
    return;
  }

  createChart("performanceChart", {
    type: "bar",
    data: {
      labels: ["RF", "XGBoost", "CNN", "LSTM", "ASLF-OSINT"],
      datasets: [
        {
          label: "Accuracy (%)",
          data: [94.85, 95.41, 95.56, 96.14, 98],
          backgroundColor: ["#c3d3e4", "#a7c4df", "#8bb5d7", "#5f94bf", "#0f766e"],
          borderRadius: 10,
        },
        {
          label: "ROC-AUC",
          data: [94.2, 95.9, 95.1, 96.6, 99],
          backgroundColor: ["#f1ddbb", "#eec98f", "#eabf73", "#e4a146", "#d97706"],
          borderRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 90,
          max: 100,
          ticks: {
            callback(value) {
              return `${value}%`;
            },
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });

  createChart("cloudChart", {
    type: "bar",
    data: {
      labels: ["AWS Lambda", "Azure Functions", "Google Cloud", "Cross-cloud avg"],
      datasets: [
        {
          label: "Avg latency (ms)",
          data: [135, 142, 135, 135],
          backgroundColor: ["#17395c", "#285f8f", "#4d8fc8", "#0f766e"],
          borderRadius: 10,
        },
        {
          label: "Cold start (ms)",
          data: [221, 263, 249, 244],
          backgroundColor: ["#d9c4a5", "#d5b17b", "#d18e52", "#d97706"],
          borderRadius: 10,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });

  createChart("lineageChart", {
    type: "bar",
    data: {
      labels: ["Detection quality", "Threat-intel depth", "Policy federation", "Operational metrics", "Response automation"],
      datasets: [
        {
          label: "Research-1",
          data: [8.5, 2.5, 5.5, 5, 6],
          backgroundColor: "#a7c4df",
          borderRadius: 8,
        },
        {
          label: "Research-3",
          data: [9.8, 9.6, 9.7, 9.2, 9.5],
          backgroundColor: "#0f766e",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          min: 0,
          max: 10,
          title: {
            display: true,
            text: "Maturity score / 10",
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });

  createChart("lineageFeatureChart", {
    type: "radar",
    data: {
      labels: ["Model depth", "Zero-trust readiness", "Cross-cloud coverage", "Runtime monitoring", "Automated response", "OSINT integration"],
      datasets: [
        {
          label: "Research-1",
          data: [8.6, 7.2, 4.5, 6.5, 6.8, 3.2],
          borderColor: "#d97706",
          backgroundColor: "rgba(217,119,6,0.12)",
          pointBackgroundColor: "#d97706",
        },
        {
          label: "Research-3",
          data: [9.4, 9.6, 9.4, 9.2, 9.1, 9.7],
          borderColor: "#17395c",
          backgroundColor: "rgba(23,57,92,0.14)",
          pointBackgroundColor: "#17395c",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 10,
        },
      },
      plugins: {
        legend: {
          position: "bottom",
        },
      },
    },
  });

  buildLineTrendChart("accuracyTrendChart");
  buildLineTrendChart("reportTrendChart");
  buildPieChart("attackDistributionPieChart");
  buildPieChart("reportAttackPieChart");
  buildPolicyRadar("policyRadarChart");
  buildPolicyRadar("reportPolicyRadarChart");

  createChart("latencyCostScatterChart", {
    type: "scatter",
    data: {
      datasets: [
        {
          label: "AWS Lambda",
          data: [{ x: 135, y: 0.24 }],
          pointRadius: 9,
          backgroundColor: "#17395c",
        },
        {
          label: "Azure Functions",
          data: [{ x: 142, y: 0.27 }],
          pointRadius: 9,
          backgroundColor: "#285f8f",
        },
        {
          label: "Google Cloud Functions",
          data: [{ x: 135, y: 0.25 }],
          pointRadius: 9,
          backgroundColor: "#d97706",
        },
        {
          label: "Cross-cloud fused runtime",
          data: [{ x: 135, y: 0.25 }],
          pointRadius: 10,
          backgroundColor: "#0f766e",
        },
        {
          label: "Proxmox federated node",
          data: [{ x: 128, y: 0.19 }],
          pointRadius: 8,
          backgroundColor: "#4d8fc8",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: "Average latency (ms)",
          },
          min: 120,
          max: 160,
        },
        y: {
          title: {
            display: true,
            text: "Cost per 10K invocations (USD)",
          },
          min: 0.2,
          max: 0.3,
        },
      },
    },
  });

  createChart("realtimePhasesChart", {
    type: "bar",
    data: {
      labels: ["Data prep", "Model integration", "Orchestration", "Policy hardening", "Pilot rollout", "Scale-out"],
      datasets: [
        {
          label: "Engineering effort (days)",
          data: [6, 10, 8, 7, 6, 9],
          backgroundColor: "#17395c",
          stack: "effort",
          borderRadius: 8,
        },
        {
          label: "Validation and security checks (days)",
          data: [3, 4, 4, 5, 4, 4],
          backgroundColor: "#d97706",
          stack: "effort",
          borderRadius: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { stacked: true },
        y: {
          stacked: true,
          title: {
            display: true,
            text: "Estimated effort",
          },
        },
      },
      plugins: {
        legend: {
          position: "top",
        },
      },
    },
  });
}

function bindActions() {
  document.querySelectorAll("[data-open-gate]").forEach((button) => {
    button.addEventListener("click", openGate);
  });

  document.querySelectorAll(".nav-links a").forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.querySelectorAll(".preset-btn").forEach((button) => {
    button.addEventListener("click", () => fillPreset(button.dataset.preset));
  });

  ["gate-github", "gate-youtube", "gate-request"].forEach((id) => {
    const input = byId(id);
    if (input) {
      input.addEventListener("change", syncGateButtons);
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindActions();
  initImplementationGate();
  initReveal();
  initVideoInteractive();
  syncGateButtons();
  runSimulation();
  initArchitectureExplorer();
  initArchitectureModes();
  initCharts();
});
