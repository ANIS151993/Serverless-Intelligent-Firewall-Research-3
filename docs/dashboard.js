function byId(id) {
  return document.getElementById(id);
}

function toggleNav() {
  const links = byId("nav-links");
  if (links) {
    links.classList.toggle("open");
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const err = payload?.error || `HTTP ${response.status}`;
    throw new Error(err);
  }
  return payload;
}

function createChart(id, config) {
  if (!window.Chart) {
    return null;
  }
  const node = byId(id);
  if (!node) {
    return null;
  }
  return new Chart(node, config);
}

function authHeaders(token) {
  if (!token) {
    return { "Content-Type": "application/json" };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

function toWsUrl(baseUrl, path, token) {
  const clean = (baseUrl || "").trim().replace(/\/$/, "");
  if (!clean) {
    return "";
  }
  const wsBase = clean.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
  const q = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${wsBase}${path}${q}`;
}

function demoSuperDashboard() {
  return {
    platform_version: "3.0.0",
    tenant_count: 3,
    total_events: 3821,
    total_blocked: 712,
    total_challenged: 901,
    total_allowed: 2208,
    tenants: [
      {
        tenant_id: "tenant-a1f02c",
        organization: "Apex Finance",
        assets: 12,
        version: "3.0.0",
        events: 1440,
        blocked: 302,
        challenged: 348,
        allowed: 790,
        avg_risk_score: 43.8,
      },
      {
        tenant_id: "tenant-b8d9e2",
        organization: "Meridian Retail",
        assets: 8,
        version: "3.0.0",
        events: 1281,
        blocked: 202,
        challenged: 311,
        allowed: 768,
        avg_risk_score: 38.9,
      },
      {
        tenant_id: "tenant-c77ad0",
        organization: "Northwave Health",
        assets: 16,
        version: "3.0.0",
        events: 1100,
        blocked: 208,
        challenged: 242,
        allowed: 650,
        avg_risk_score: 47.1,
      },
    ],
  };
}

function demoTenantDashboard(tenantId) {
  const now = Date.now();
  const ts = [];
  for (let i = 0; i < 24; i += 1) {
    ts.push({
      t: new Date(now - (23 - i) * 60 * 60 * 1000).toISOString(),
      risk: Math.max(8, Math.min(95, Math.round(25 + Math.sin(i / 2) * 14 + (i % 5) * 3))),
      decision: i % 7 === 0 ? "BLOCK" : i % 3 === 0 ? "CHALLENGE" : "ALLOW",
    });
  }

  return {
    tenant: {
      tenant_id: tenantId,
      organization_name: "Demo Enterprise",
      event_count: ts.length,
      avg_risk_score: 41.5,
    },
    provider_distribution: {
      aws: 10,
      azure: 6,
      gcp: 5,
      proxmox: 3,
    },
    decision_distribution: {
      ALLOW: ts.filter((x) => x.decision === "ALLOW").length,
      CHALLENGE: ts.filter((x) => x.decision === "CHALLENGE").length,
      BLOCK: ts.filter((x) => x.decision === "BLOCK").length,
    },
    risk_timeseries: ts,
    assets: [
      {
        name: "HQ Core Network",
        asset_type: "local-network",
        provider: "onprem",
        endpoint: "10.20.0.0/16",
        criticality: "critical",
      },
      {
        name: "Payments API",
        asset_type: "cloud-service",
        provider: "aws",
        endpoint: "https://pay.demo.example",
        criticality: "critical",
      },
      {
        name: "Inventory Service",
        asset_type: "cloud-service",
        provider: "azure",
        endpoint: "https://inv.demo.example",
        criticality: "high",
      },
    ],
  };
}

let superCharts = [];
let tenantCharts = [];
let superSocket = null;
let tenantSocket = null;

function destroyCharts(list) {
  list.forEach((chart) => {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
    }
  });
  list.length = 0;
}

function renderSuperDashboard(data) {
  byId("metricPlatformVersion").textContent = data.platform_version || "-";
  byId("metricTenantCount").textContent = String(data.tenant_count || 0);
  byId("metricTotalEvents").textContent = String(data.total_events || 0);
  byId("metricBlocked").textContent = String(data.total_blocked || 0);

  const body = byId("tenantTableBody");
  if (body) {
    body.innerHTML = "";
    (data.tenants || []).forEach((tenant) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${tenant.tenant_id}</td>
        <td>${tenant.organization}</td>
        <td>${tenant.assets}</td>
        <td>${tenant.version}</td>
        <td>${tenant.events}</td>
        <td>${tenant.blocked}</td>
        <td>${tenant.avg_risk_score}</td>
      `;
      body.appendChild(row);
    });
  }

  destroyCharts(superCharts);

  superCharts.push(
    createChart("tenantEventsChart", {
      type: "bar",
      data: {
        labels: (data.tenants || []).map((x) => x.organization),
        datasets: [
          {
            label: "Events",
            data: (data.tenants || []).map((x) => x.events),
            backgroundColor: "#17395c",
            borderRadius: 10,
          },
          {
            label: "Blocked",
            data: (data.tenants || []).map((x) => x.blocked),
            backgroundColor: "#d97706",
            borderRadius: 10,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    })
  );

  superCharts.push(
    createChart("superDecisionChart", {
      type: "doughnut",
      data: {
        labels: ["ALLOW", "CHALLENGE", "BLOCK"],
        datasets: [
          {
            data: [data.total_allowed || 0, data.total_challenged || 0, data.total_blocked || 0],
            backgroundColor: ["#0f766e", "#285f8f", "#b42318"],
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    })
  );
}

function closeSuperSocket() {
  if (superSocket && superSocket.readyState <= 1) {
    superSocket.close();
  }
  superSocket = null;
}

function openSuperSocket() {
  const base = (byId("apiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const token = (byId("superJwtInput")?.value || "").trim();
  const modeChip = byId("superModeChip");
  if (!base || !token) {
    return;
  }

  closeSuperSocket();
  const url = toWsUrl(base, "/ws/super", token);
  try {
    superSocket = new WebSocket(url);
  } catch {
    return;
  }

  superSocket.onopen = () => {
    modeChip.textContent = "Mode: live API + WebSocket";
  };

  superSocket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "super_dashboard") {
        renderSuperDashboard(parsed.payload || {});
      }
    } catch {
      // Ignore malformed messages.
    }
  };

  superSocket.onerror = () => {
    modeChip.textContent = "Mode: live API (WS error)";
  };
}

async function loginSuperAdmin() {
  const base = (byId("apiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const username = (byId("superUserInput")?.value || "").trim();
  const password = byId("superPassInput")?.value || "";
  const modeChip = byId("superModeChip");

  if (!base || !username || !password) {
    modeChip.textContent = "Mode: missing credentials";
    return;
  }

  try {
    const result = await fetchJson(`${base}/auth/super/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    byId("superJwtInput").value = result.token || "";
    modeChip.textContent = "Mode: authenticated";
    await loadSuperDashboard();
  } catch (error) {
    modeChip.textContent = `Mode: login failed (${error.message})`;
  }
}

async function loadSuperDashboard() {
  const base = (byId("apiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const token = (byId("superJwtInput")?.value || "").trim();
  const modeChip = byId("superModeChip");

  if (!base || !token) {
    modeChip.textContent = "Mode: demo";
    renderSuperDashboard(demoSuperDashboard());
    closeSuperSocket();
    return;
  }

  try {
    const data = await fetchJson(`${base}/super/dashboard`, {
      headers: authHeaders(token),
    });
    modeChip.textContent = "Mode: live API";
    renderSuperDashboard(data);
    openSuperSocket();
  } catch (error) {
    modeChip.textContent = `Mode: demo (${error.message})`;
    renderSuperDashboard(demoSuperDashboard());
    closeSuperSocket();
  }
}

async function createTenantFromUi() {
  const base = (byId("apiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const token = (byId("superJwtInput")?.value || "").trim();
  const org = (byId("tenantOrgInput")?.value || "").trim();
  const email = (byId("tenantEmailInput")?.value || "").trim();
  const out = byId("createTenantResult");

  if (!org || !email) {
    out.textContent = "Provide organization name and admin email.";
    return;
  }

  try {
    const result = await fetchJson(`${base}/super/tenants`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ organization_name: org, admin_email: email }),
    });
    out.textContent = `Tenant created: ${result.tenant_id} | api_token: ${result.api_token}`;
    await loadSuperDashboard();
  } catch (error) {
    out.textContent = `Could not create tenant: ${error.message}`;
  }
}

async function publishUpgradeFromUi() {
  const base = (byId("apiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const token = (byId("superJwtInput")?.value || "").trim();
  const version = (byId("upgradeVersionInput")?.value || "").trim();
  const notes = (byId("upgradeNotesInput")?.value || "").trim();
  const out = byId("publishUpgradeResult");

  if (!version || !notes) {
    out.textContent = "Provide target version and release notes.";
    return;
  }

  try {
    const result = await fetchJson(`${base}/super/upgrades`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ version, release_notes: notes }),
    });
    out.textContent = `Upgrade response: ${result.status}`;
    await loadSuperDashboard();
  } catch (error) {
    out.textContent = `Could not publish upgrade: ${error.message}`;
  }
}

function renderTenantDashboard(data) {
  const tenant = data.tenant || {};
  byId("tenantOrgName").textContent = tenant.organization_name || tenant.tenant_id || "Unknown";
  byId("tenantAssetCount").textContent = String((data.assets || []).length);
  byId("tenantEventCount").textContent = String(tenant.event_count || 0);
  byId("tenantAvgRisk").textContent = String(Math.round((tenant.avg_risk_score || 0) * 100) / 100);

  const body = byId("tenantAssetTableBody");
  if (body) {
    body.innerHTML = "";
    (data.assets || []).forEach((asset) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${asset.name || asset.asset_id || "-"}</td>
        <td>${asset.asset_type || "-"}</td>
        <td>${asset.provider || "-"}</td>
        <td>${asset.endpoint || "-"}</td>
        <td>${asset.criticality || "-"}</td>
      `;
      body.appendChild(row);
    });
  }

  destroyCharts(tenantCharts);

  const ts = data.risk_timeseries || [];
  tenantCharts.push(
    createChart("tenantRiskChart", {
      type: "line",
      data: {
        labels: ts.map((x) => (x.t || "").slice(11, 19)),
        datasets: [
          {
            label: "Risk score",
            data: ts.map((x) => x.risk || 0),
            borderColor: "#17395c",
            backgroundColor: "rgba(23,57,92,0.14)",
            tension: 0.25,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { min: 0, max: 100 } },
      },
    })
  );

  const decision = data.decision_distribution || { ALLOW: 0, CHALLENGE: 0, BLOCK: 0 };
  tenantCharts.push(
    createChart("tenantDecisionChart", {
      type: "pie",
      data: {
        labels: ["ALLOW", "CHALLENGE", "BLOCK"],
        datasets: [
          {
            data: [decision.ALLOW || 0, decision.CHALLENGE || 0, decision.BLOCK || 0],
            backgroundColor: ["#0f766e", "#285f8f", "#b42318"],
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    })
  );

  const provider = data.provider_distribution || {};
  tenantCharts.push(
    createChart("tenantProviderChart", {
      type: "bar",
      data: {
        labels: Object.keys(provider),
        datasets: [
          {
            label: "Events",
            data: Object.values(provider),
            backgroundColor: ["#17395c", "#285f8f", "#4d8fc8", "#d97706"],
            borderRadius: 10,
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    })
  );
}

function closeTenantSocket() {
  if (tenantSocket && tenantSocket.readyState <= 1) {
    tenantSocket.close();
  }
  tenantSocket = null;
}

function openTenantSocket() {
  const base = (byId("tenantApiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const tenantId = (byId("tenantIdInput")?.value || "").trim();
  const token = (byId("tenantJwtInput")?.value || "").trim();
  const modeChip = byId("tenantModeChip");

  if (!base || !tenantId || !token) {
    return;
  }

  closeTenantSocket();
  const url = toWsUrl(base, `/ws/tenant/${encodeURIComponent(tenantId)}`, token);
  try {
    tenantSocket = new WebSocket(url);
  } catch {
    return;
  }

  tenantSocket.onopen = () => {
    modeChip.textContent = "Mode: live API + WebSocket";
  };

  tenantSocket.onmessage = (event) => {
    try {
      const parsed = JSON.parse(event.data);
      if (parsed.type === "tenant_dashboard") {
        renderTenantDashboard(parsed.payload || {});
      }
    } catch {
      // Ignore malformed frame data.
    }
  };

  tenantSocket.onerror = () => {
    modeChip.textContent = "Mode: live API (WS error)";
  };
}

async function loginTenantAdmin() {
  const base = (byId("tenantApiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const tenantId = (byId("tenantIdInput")?.value || "").trim();
  const apiToken = byId("tenantApiTokenInput")?.value || "";
  const modeChip = byId("tenantModeChip");

  if (!base || !tenantId || !apiToken) {
    modeChip.textContent = "Mode: missing tenant credentials";
    return;
  }

  try {
    const result = await fetchJson(`${base}/auth/tenant/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant_id: tenantId, api_token: apiToken }),
    });
    byId("tenantJwtInput").value = result.token || "";
    modeChip.textContent = "Mode: tenant authenticated";
    await loadTenantDashboard();
  } catch (error) {
    modeChip.textContent = `Mode: login failed (${error.message})`;
  }
}

async function loadTenantDashboard() {
  const base = (byId("tenantApiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const tenantId = (byId("tenantIdInput")?.value || "tenant-demo").trim();
  const token = (byId("tenantJwtInput")?.value || "").trim();
  const modeChip = byId("tenantModeChip");

  if (!base || !tenantId || !token) {
    modeChip.textContent = "Mode: demo";
    renderTenantDashboard(demoTenantDashboard(tenantId));
    closeTenantSocket();
    return;
  }

  try {
    const data = await fetchJson(`${base}/tenant/${encodeURIComponent(tenantId)}/dashboard`, {
      headers: authHeaders(token),
    });
    modeChip.textContent = "Mode: live API";
    renderTenantDashboard(data);
    openTenantSocket();
  } catch (error) {
    modeChip.textContent = `Mode: demo (${error.message})`;
    renderTenantDashboard(demoTenantDashboard(tenantId));
    closeTenantSocket();
  }
}

async function simulateTenantEvent() {
  const base = (byId("tenantApiBaseInput")?.value || "").trim().replace(/\/$/, "");
  const tenantId = (byId("tenantIdInput")?.value || "tenant-demo").trim();
  const token = (byId("tenantJwtInput")?.value || "").trim();

  const payload = {
    event_id: `evt-${Date.now()}`,
    provider: byId("simProvider")?.value || "aws",
    requests_per_second: Number(byId("simRps")?.value || 0),
    failed_auth: Number(byId("simFailedAuth")?.value || 0),
    anomaly_score: Number(byId("simAnomaly")?.value || 0),
    geo_velocity: 2,
    lateral_hops: 2,
    policy_drift: 20,
    payload_entropy: 7.2,
    identity_confidence: 0.72,
    mfa_verified: true,
    src_ip: "198.51.100.88",
    dst_service: "tenant-gateway",
    protocol: "https",
    user_id: "dashboard-user",
  };

  const out = byId("simulateResult");

  try {
    const result = await fetchJson(`${base}/tenant/${encodeURIComponent(tenantId)}/events`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    out.textContent = `Decision: ${result.decision?.action || "unknown"} | Risk: ${result.model?.risk_score || "-"}`;
    await loadTenantDashboard();
  } catch (error) {
    out.textContent = `Could not submit event: ${error.message}`;
  }
}

function initSuperPage() {
  if (!byId("refreshSuperBtn")) {
    return;
  }
  byId("refreshSuperBtn")?.addEventListener("click", loadSuperDashboard);
  byId("superLoginBtn")?.addEventListener("click", loginSuperAdmin);
  byId("createTenantBtn")?.addEventListener("click", createTenantFromUi);
  byId("publishUpgradeBtn")?.addEventListener("click", publishUpgradeFromUi);
  loadSuperDashboard();
}

function initTenantPage() {
  if (!byId("refreshTenantBtn")) {
    return;
  }
  byId("refreshTenantBtn")?.addEventListener("click", loadTenantDashboard);
  byId("tenantLoginBtn")?.addEventListener("click", loginTenantAdmin);
  byId("simulateEventBtn")?.addEventListener("click", simulateTenantEvent);
  loadTenantDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  initSuperPage();
  initTenantPage();
});
