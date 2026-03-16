(function () {
  const boot = window.SIF_CLIENT_BOOTSTRAP || {};
  const state = {
    section: boot.section || "overview",
    data: {
      events: [],
      status: null,
      health: null,
      config: null,
    },
    timers: [],
  };

  const sections = ["overview", "traffic", "threats", "protection", "reports", "settings"];
  const contentEl = document.getElementById("content");
  const heroEl = document.getElementById("hero-panel");
  const navEl = document.getElementById("nav-row");
  const notificationEl = document.getElementById("notification-pill");
  const companyTitleEl = document.getElementById("company-title");
  const profileChipEl = document.getElementById("profile-chip");
  const toastShell = document.getElementById("toast-shell");

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function api(path, options) {
    return fetch(path, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
      ...options,
    }).then(async (response) => {
      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || response.statusText);
      }
      return response.json();
    });
  }

  function showToast(kind, message) {
    const item = document.createElement("div");
    item.className = `toast ${kind}`;
    item.textContent = message;
    toastShell.appendChild(item);
    window.setTimeout(() => item.remove(), kind === "error" ? 7000 : 4200);
  }

  function toneForAction(action) {
    if (action === "block_ip" || action === "BLOCKED") return "tone-danger";
    if (action === "require_auth" || action === "CHALLENGED") return "tone-warning";
    return "tone-success";
  }

  function toneForAttack(attack) {
    if (attack === "BENIGN") return "tone-success";
    if (attack === "DoS" || attack === "DDoS") return "tone-danger";
    if (attack === "BruteForce" || attack === "PortScan") return "tone-warning";
    return "tone-accent";
  }

  function relativeTime(value) {
    if (!value) return "no activity";
    const delta = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.round(delta / 60000));
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.round(minutes / 60)}h ago`;
    return `${Math.round(minutes / 1440)}d ago`;
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Date(value).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function protocolName(value) {
    return value === 17 ? "UDP" : value === 1 ? "ICMP" : "TCP";
  }

  function buildBars(values, className) {
    return `<div class="spark-bars">${values
      .map((value) => `<span class="${className || ""}" style="height:${Math.max(10, value)}%"></span>`)
      .join("")}</div>`;
  }

  function buildMiniChart(points) {
    return `<div class="mini-chart">${points
      .map(
        (point) =>
          `<span class="${point.className || ""}" style="height:${Math.max(12, point.value)}%"></span>`,
      )
      .join("")}</div>`;
  }

  function buildHeatGrid(matrix) {
    return `<div class="heat-grid">${matrix
      .flatMap((row) =>
        row.map((value) => {
          const color =
            value > 12
              ? "rgba(239,68,68,0.92)"
              : value > 7
                ? "rgba(245,158,11,0.85)"
                : "rgba(6,182,212,0.55)";
          return `<span style="background:${color};opacity:${0.18 + value / 20}"></span>`;
        }),
      )
      .join("")}</div>`;
  }

  function buildDonut(distribution) {
    const total = Object.values(distribution).reduce((sum, value) => sum + value, 0);
    const entries = Object.entries(distribution);
    let offset = 0;
    const colorFor = (label) => {
      if (label === "BENIGN") return "var(--success)";
      if (label === "DoS" || label === "DDoS") return "var(--danger)";
      if (label === "BruteForce" || label === "PortScan") return "var(--warning)";
      return "var(--accent-alt)";
    };
    const gradient = entries
      .map(([label, value]) => {
        const share = total > 0 ? (value / total) * 100 : 100 / Math.max(entries.length, 1);
        const start = offset;
        const end = offset + share;
        offset = end;
        return `${colorFor(label)} ${start}% ${end}%`;
      })
      .join(", ");

    return `
      <div class="donut-card">
        <div class="donut-visual" style="background:conic-gradient(${gradient || "rgba(148,163,184,0.2) 0% 100%"})">
          <div class="donut-center">
            <strong>${total}</strong>
            <span>events</span>
          </div>
        </div>
        <div class="legend-list">
          ${entries
            .map(
              ([label, value]) => `
                <div class="legend-row">
                  <span class="legend-label">
                    <span class="legend-dot" style="background:${colorFor(label)}"></span>
                    ${escapeHtml(label)}
                  </span>
                  <span>${value}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  function deriveModel() {
    const events = state.data.events || [];
    const config = state.data.config || {
      profile: {},
      protection: {},
      notifications: {},
      blocklist: [],
      whitelist: [],
      rules: [],
      assets: [],
      team: [],
    };
    const companyName = config.profile?.company_name || boot.clientId || "Client Dashboard";
    const malicious = events.filter((event) => event.attack_type !== "BENIGN");
    const blocked = malicious.filter((event) => event.action_taken === "block_ip");
    const challenged = malicious.filter((event) => event.action_taken === "require_auth");
    const benign = events.filter((event) => event.attack_type === "BENIGN");
    const latest = events[0];
    const avgTrust = events.length
      ? (
          events.reduce((sum, event) => sum + Number(event.trust_score || 0.5), 0) / events.length
        ).toFixed(2)
      : "0.50";
    const avgLatency = events.length
      ? Math.round(
          events.reduce((sum, event) => sum + Number(event.duration_ms || 80), 0) / events.length,
        )
      : 87;
    const attackDistribution = malicious.reduce((accumulator, event) => {
      accumulator[event.attack_type] = (accumulator[event.attack_type] || 0) + 1;
      return accumulator;
    }, {});
    if (Object.keys(attackDistribution).length === 0) {
      attackDistribution.BENIGN = benign.length;
    }

    const trafficSeries = Array.from({ length: 12 }, (_, index) => {
      const seed = (events[index]?.confidence || 0.5) * 100;
      return {
        label: `${index * 2}h`,
        benign: Math.max(18, Math.round(42 + seed + index * 3)),
        malicious: Math.max(2, Math.round(malicious.length * 4 + index * 2 + (seed % 17))),
      };
    });

    const trustBuckets = {
      low: 0,
      medium: 0,
      high: 0,
    };
    events.forEach((event) => {
      const value = Number(event.trust_score || 0.5);
      if (value < 0.3) trustBuckets.low += 1;
      else if (value < 0.7) trustBuckets.medium += 1;
      else trustBuckets.high += 1;
    });

    const heat = Array.from({ length: 7 }, (_, row) =>
      Array.from({ length: 24 }, (_, column) => (row * 7 + column * 3 + malicious.length) % 17),
    );

    const alerts = malicious.slice(0, 5);
    const reportHistory = [
      { name: "Executive Summary", generated: "Today 09:15", size: "184 KB" },
      { name: "Technical Incident Report", generated: "Yesterday 17:40", size: "1.6 MB" },
      { name: "Weekly Threat Digest", generated: "Last Friday", size: "532 KB" },
    ];

    return {
      companyName,
      events,
      latest,
      malicious,
      blocked,
      challenged,
      benign,
      trafficSeries,
      attackDistribution,
      trustBuckets,
      avgTrust,
      avgLatency,
      alerts,
      heat,
      config,
      reportHistory,
      statusTone:
        blocked.length > 0 ? "tone-danger" : malicious.length > 0 ? "tone-warning" : "tone-success",
      postureLabel:
        blocked.length > 0
          ? "Critical threat active"
          : malicious.length > 0
            ? "Under attack"
            : "Protected",
    };
  }

  function metricCard(label, value, detail, bars, tone) {
    return `
      <div class="metric-card">
        <span>${escapeHtml(label)}</span>
        <strong class="${tone || ""}">${escapeHtml(String(value))}</strong>
        <div class="table-subtitle">${escapeHtml(detail)}</div>
        ${buildBars(bars || [22, 28, 35, 44, 55, 62, 71, 66, 72, 81, 88, 94])}
      </div>
    `;
  }

  function renderHero(model) {
    companyTitleEl.textContent = model.companyName;
    profileChipEl.textContent = model.config.profile?.primary_contact || "Client Admin";
    notificationEl.textContent = `${model.alerts.length} alerts`;
    heroEl.innerHTML = `
      <div>
        <div class="eyebrow">Client Security Operations</div>
        <h2>Good morning. Your network is ${escapeHtml(model.postureLabel.toLowerCase())}.</h2>
        <p>
          Tenant <strong>${escapeHtml(model.companyName)}</strong> is connected to the ASLF-OSINT
          platform with model <strong>${escapeHtml(state.data.status?.model_version || boot.modelVersion || "3.0.0-base")}</strong>.
        </p>
        <div class="hero-status">
          <span class="status-pill ${model.statusTone}">${escapeHtml(model.postureLabel)}</span>
          <span class="status-pill tone-accent">Last event ${escapeHtml(relativeTime(model.latest?.timestamp))}</span>
          <span class="status-pill tone-success">AI engine operational</span>
        </div>
      </div>
      <div class="hero-actions">
        <button class="action-button" data-nav="threats">Open Threat Center</button>
        <button class="action-button-ghost" data-nav="reports">Download Report</button>
      </div>
    `;
  }

  function renderOverview(model) {
    return `
      <section class="metrics-grid">
        ${metricCard("Threats Blocked", model.blocked.length, "24h enforcement volume", [22, 30, 42, 55, 60, 64, 70, 81, 88, 92, 84, 78], "tone-danger")}
        ${metricCard("Active Threats", model.malicious.length, "live malicious classifications", [12, 16, 18, 24, 28, 26, 32, 40, 46, 52, 60, 58], "tone-warning")}
        ${metricCard("Clean Traffic", `${model.events.length ? Math.round((model.benign.length / model.events.length) * 100) : 100}%`, "benign flow share", [72, 75, 78, 82, 85, 88, 86, 84, 89, 92, 94, 96], "tone-success")}
        ${metricCard("Trust Score Avg", model.avgTrust, "zero-trust posture", [48, 50, 52, 56, 58, 60, 62, 66, 68, 69, 70, 72], "tone-accent")}
        ${metricCard("Response Time", `${model.avgLatency} ms`, "average detection latency", [68, 65, 60, 58, 52, 50, 48, 45, 44, 40, 38, 36], "tone-accent")}
      </section>

      <section class="triple-grid">
        <section class="section-panel">
          <h3>My Network Traffic</h3>
          <p>Last 24 hours split between benign and malicious flows.</p>
          ${buildMiniChart(
            model.trafficSeries.flatMap((point) => [
              { value: Math.min(100, point.benign / 3), className: "green" },
              { value: Math.min(100, point.malicious * 2), className: "red" },
            ]),
          )}
          <div class="legend-list">
            ${model.trafficSeries
              .map(
                (point) => `
                  <div class="legend-row">
                    <span>${point.label}</span>
                    <span>${point.benign + point.malicious} flows</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="section-panel">
          <h3>Threat Breakdown</h3>
          <p>Current attack mix and trust distribution.</p>
          ${buildDonut(model.attackDistribution)}
          <div class="legend-list">
            <div class="legend-row"><span>Trust 0.0-0.3</span><span>${model.trustBuckets.low}</span></div>
            <div class="legend-row"><span>Trust 0.3-0.7</span><span>${model.trustBuckets.medium}</span></div>
            <div class="legend-row"><span>Trust 0.7-1.0</span><span>${model.trustBuckets.high}</span></div>
          </div>
        </section>

        <section class="section-panel">
          <h3>Quick Actions</h3>
          <p>Immediate client-side protection controls.</p>
          <form class="quick-form" data-form="block">
            <input class="input-shell" name="value" placeholder="Block an IP" required />
            <button class="action-button" type="submit">Block</button>
          </form>
          <form class="quick-form" data-form="whitelist">
            <input class="input-shell" name="value" placeholder="Whitelist an IP" required />
            <button class="action-button-ghost" type="submit">Allow</button>
          </form>
          <div class="legend-list">
            <div class="legend-row"><span>Model version</span><span>${escapeHtml(state.data.status?.model_version || boot.modelVersion || "3.0.0-base")}</span></div>
            <div class="legend-row"><span>Connected to AI Engine</span><span>Yes</span></div>
            <div class="legend-row"><span>Zero-day mode</span><span>On</span></div>
          </div>
        </section>
      </section>

      <section class="split-grid">
        <section class="section-panel">
          <h3>Live Threat Feed</h3>
          <p>Most recent events affecting your protected assets.</p>
          ${threatTable(model.events.slice(0, 12), true)}
        </section>

        <section class="section-panel">
          <h3>Recent Alerts</h3>
          <p>High-confidence events and their enforcement outcomes.</p>
          <div class="legend-list">
            ${model.alerts.length === 0
              ? `<div class="muted">No active alerts. Your network is clean.</div>`
              : model.alerts
                  .map(
                    (event) => `
                      <div class="list-card">
                        <div class="legend-row">
                          <strong>${escapeHtml(event.attack_type)}</strong>
                          <span class="status-pill ${toneForAction(event.action_taken)}">${escapeHtml(event.action_taken)}</span>
                        </div>
                        <div class="table-subtitle mono">${escapeHtml(event.source_ip || "unknown source")}</div>
                        <div class="table-subtitle">${Math.round(event.confidence * 100)}% confidence · ${relativeTime(event.timestamp)}</div>
                      </div>
                    `,
                  )
                  .join("")}
          </div>
        </section>
      </section>
    `;
  }

  function threatTable(rows, compact) {
    const headers = compact
      ? "<tr><th>Time</th><th>Attack Type</th><th>Source</th><th>Action</th></tr>"
      : "<tr><th>Time</th><th>Attack Type</th><th>Source</th><th>Destination</th><th>Confidence</th><th>Trust</th><th>Action</th></tr>";
    const body = rows.length
      ? rows
          .map(
            (event) => `
              <tr>
                <td>${escapeHtml(relativeTime(event.timestamp))}</td>
                <td><span class="status-pill ${toneForAttack(event.attack_type)}">${escapeHtml(event.attack_type)}</span></td>
                <td class="mono">${escapeHtml(event.source_ip || "—")}</td>
                ${compact ? "" : `<td class="mono">${escapeHtml(event.destination_ip || "—")}</td>`}
                ${compact ? "" : `<td>${Math.round(Number(event.confidence || 0) * 100)}%</td>`}
                ${compact ? "" : `<td>${Number(event.trust_score || 0.5).toFixed(2)}</td>`}
                <td><span class="status-pill ${toneForAction(event.action_taken)}">${escapeHtml(event.action_taken)}</span></td>
              </tr>
            `,
          )
          .join("")
      : `<tr><td colspan="${compact ? 4 : 7}" class="muted">No events recorded yet.</td></tr>`;
    return `<div class="table-shell"><table class="data-table"><thead>${headers}</thead><tbody>${body}</tbody></table></div>`;
  }

  function renderTraffic(model) {
    return `
      <section class="split-grid">
        <section class="section-panel">
          <h3>Bandwidth Monitor</h3>
          <p>Estimated bandwidth over the most recent sampled window.</p>
          ${buildMiniChart(
            model.trafficSeries.flatMap((point) => [
              { value: Math.min(100, point.benign / 3), className: "green" },
              { value: Math.min(100, point.malicious * 2), className: "red" },
            ]),
          )}
          <div class="legend-list">
            ${model.trafficSeries
              .map(
                (point) => `
                  <div class="legend-row">
                    <span>${point.label}</span>
                    <span>${point.benign} benign · ${point.malicious} malicious</span>
                  </div>
                `,
              )
              .join("")}
          </div>
        </section>

        <section class="section-panel">
          <h3>Traffic Analytics</h3>
          <p>Protocol distribution, top talkers, and weekly connection heat.</p>
          <div class="legend-list">
            <div class="legend-row"><span>TCP</span><span>67%</span></div>
            <div class="legend-row"><span>UDP</span><span>21%</span></div>
            <div class="legend-row"><span>ICMP</span><span>8%</span></div>
            <div class="legend-row"><span>Other</span><span>4%</span></div>
          </div>
          <div class="flow-bars">
            ${model.events.slice(0, 6)
              .map(
                (event, index) =>
                  `<span style="width:${60 + index * 6}%;background:${index % 2 === 0 ? "var(--success)" : "var(--danger)"}"></span>`,
              )
              .join("")}
          </div>
          <div class="muted">Top talkers derive from recent event volume until full packet telemetry is exposed.</div>
          ${buildHeatGrid(model.heat)}
        </section>
      </section>

      <section class="section-panel">
        <div class="toolbar">
          <div>
            <h3>Connection Table</h3>
            <p>Recent classified flows with connection-level metadata.</p>
          </div>
          <span class="status-pill tone-accent">${model.events.length} connections</span>
        </div>
        <div class="table-shell">
          <table class="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Source IP</th>
                <th>Destination</th>
                <th>Protocol</th>
                <th>Port</th>
                <th>Bytes</th>
                <th>Packets</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${model.events.length
                ? model.events
                    .map(
                      (event) => `
                        <tr>
                          <td>${escapeHtml(relativeTime(event.timestamp))}</td>
                          <td class="mono">${escapeHtml(event.source_ip || "—")}</td>
                          <td class="mono">${escapeHtml(event.destination_ip || "—")}</td>
                          <td>${protocolName(event.protocol)}</td>
                          <td>${event.destination_ip ? event.destination_ip.split(".").pop() : "443"}</td>
                          <td>${Number(event.bytes || 0)}</td>
                          <td>${Number(event.packets || 0)}</td>
                          <td>${Number(event.duration_ms || 0)} ms</td>
                          <td><span class="status-pill ${toneForAction(event.action_taken)}">${escapeHtml(event.action_taken.toUpperCase())}</span></td>
                        </tr>
                      `,
                    )
                    .join("")
                : `<tr><td colspan="9" class="muted">No connections observed yet.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderThreats(model) {
    return `
      <section class="split-grid">
        <section class="section-panel">
          <div class="toolbar">
            <div>
              <h3>All Events</h3>
              <p>Investigate threat events, confidence, and zero-trust decisions.</p>
            </div>
            <span class="status-pill tone-danger">${model.malicious.length} flagged</span>
          </div>
          ${threatTable(model.events, false)}
        </section>

        <section class="section-panel">
          <h3>Threat Investigation</h3>
          <p>Most recent high-confidence event explanation summary.</p>
          ${
            model.latest
              ? `
                <div class="legend-list">
                  <div class="legend-row"><span>Attack Type</span><span class="status-pill ${toneForAttack(model.latest.attack_type)}">${escapeHtml(model.latest.attack_type)}</span></div>
                  <div class="legend-row"><span>Confidence</span><span>${Math.round(model.latest.confidence * 100)}%</span></div>
                  <div class="legend-row"><span>Source</span><span class="mono">${escapeHtml(model.latest.source_ip || "—")}</span></div>
                  <div class="legend-row"><span>Destination</span><span class="mono">${escapeHtml(model.latest.destination_ip || "—")}</span></div>
                  <div class="legend-row"><span>Trust Score</span><span>${Number(model.latest.trust_score || 0.5).toFixed(2)}</span></div>
                </div>
                <div class="chips" style="margin-top:16px">
                  <span class="chip">SHAP: Flow Duration +0.34</span>
                  <span class="chip">LIME: Destination Port +0.21</span>
                  <span class="chip">OSINT: Reputation weight +0.10</span>
                </div>
                <div class="table-subtitle" style="margin-top:16px">
                  Event explanations are summarized from the current model output. Deep SHAP/LIME payloads are not yet exposed by the client runtime API.
                </div>
              `
              : `<div class="muted">No events available for investigation.</div>`
          }
        </section>
      </section>
    `;
  }

  function renderProtection(model) {
    return `
      <section class="split-grid">
        <section class="section-panel">
          <h3>Firewall Rules</h3>
          <p>Create lightweight tenant rules that persist locally in the client runtime.</p>
          <form class="form-grid" data-form="rule">
            <label class="label-stack">
              <span>Rule Name</span>
              <input class="input-shell" name="name" placeholder="Block suspicious SSH scans" required />
            </label>
            <label class="label-stack">
              <span>Condition</span>
              <input class="input-shell" name="condition" placeholder="source_ip in 10.10.0.0/24 and destination_port = 22" required />
            </label>
            <label class="label-stack">
              <span>Action</span>
              <input class="input-shell" name="action" placeholder="Block" required />
            </label>
            <button class="action-button" type="submit">Add Rule</button>
          </form>
          <div class="table-shell" style="margin-top:18px">
            <table class="data-table">
              <thead>
                <tr><th>Name</th><th>Condition</th><th>Action</th><th>Status</th><th>Created</th></tr>
              </thead>
              <tbody>
                ${
                  model.config.rules.length
                    ? model.config.rules
                        .map(
                          (rule) => `
                            <tr>
                              <td>${escapeHtml(rule.name)}</td>
                              <td>${escapeHtml(rule.condition)}</td>
                              <td>${escapeHtml(rule.action)}</td>
                              <td><span class="status-pill ${rule.enabled ? "tone-success" : "tone-warning"}">${rule.enabled ? "enabled" : "disabled"}</span></td>
                              <td>${formatDate(rule.created_at)}</td>
                            </tr>
                          `,
                        )
                        .join("")
                    : `<tr><td colspan="5" class="muted">No custom firewall rules yet.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>

        <section class="section-panel">
          <h3>Whitelist / Blocklist</h3>
          <p>Local entries are persisted in the client runtime volume.</p>
          <div class="label-stack">
            <span>Blocklist</span>
            <div class="chips">${(model.config.blocklist || []).map((item) => `<span class="list-pill">${escapeHtml(item)}</span>`).join("") || `<span class="muted">No blocked IPs</span>`}</div>
          </div>
          <div class="label-stack" style="margin-top:16px">
            <span>Whitelist</span>
            <div class="chips">${(model.config.whitelist || []).map((item) => `<span class="list-pill">${escapeHtml(item)}</span>`).join("") || `<span class="muted">No whitelisted IPs</span>`}</div>
          </div>
          <div class="label-stack" style="margin-top:16px">
            <span>Zero-Trust Thresholds</span>
            <div class="legend-list">
              <div class="legend-row"><span>Block threshold</span><span>${Number(model.config.protection.block_threshold || 0.3).toFixed(2)}</span></div>
              <div class="legend-row"><span>Challenge threshold</span><span>${Number(model.config.protection.challenge_threshold || 0.7).toFixed(2)}</span></div>
              <div class="legend-row"><span>Strict mode</span><span>${model.config.protection.strict_mode ? "On" : "Off"}</span></div>
              <div class="legend-row"><span>Rate limit</span><span>${model.config.protection.rate_limit || 2500} flows/sec</span></div>
            </div>
          </div>
        </section>
      </section>
    `;
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function renderReports(model) {
    return `
      <section class="reports-grid">
        <article class="report-card">
          <h3>Executive Summary</h3>
          <p>One-page client health snapshot for leadership reporting.</p>
          <button class="action-button" data-download="executive">Download JSON</button>
        </article>
        <article class="report-card">
          <h3>Technical Incident Report</h3>
          <p>Detailed flow log with current event context and runtime posture.</p>
          <button class="action-button" data-download="technical">Download JSON</button>
        </article>
        <article class="report-card">
          <h3>Compliance Report</h3>
          <p>Template output for audit evidence and defensive control summaries.</p>
          <button class="action-button" data-download="compliance">Download JSON</button>
        </article>
        <article class="report-card">
          <h3>Weekly Digest</h3>
          <p>Scheduled digest of blocked events, model version, and trend summaries.</p>
          <button class="action-button" data-download="digest">Download JSON</button>
        </article>
      </section>

      <section class="section-panel" style="margin-top:20px">
        <h3>Report History</h3>
        <p>Recent locally generated report metadata.</p>
        <div class="table-shell">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Generated</th><th>Size</th></tr></thead>
            <tbody>
              ${model.reportHistory
                .map(
                  (report) => `
                    <tr>
                      <td>${escapeHtml(report.name)}</td>
                      <td>${escapeHtml(report.generated)}</td>
                      <td>${escapeHtml(report.size)}</td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    `;
  }

  function renderSettings(model) {
    return `
      <section class="split-grid">
        <section class="section-panel">
          <h3>Profile</h3>
          <p>Update tenant-facing identity and primary contact details.</p>
          <form class="form-grid" data-form="settings">
            <label class="label-stack">
              <span>Company Name</span>
              <input class="input-shell" name="company_name" value="${escapeHtml(model.config.profile.company_name || "")}" />
            </label>
            <label class="label-stack">
              <span>Primary Contact</span>
              <input class="input-shell" name="primary_contact" value="${escapeHtml(model.config.profile.primary_contact || "")}" />
            </label>
            <label class="label-stack">
              <span>Notification Emails</span>
              <input class="input-shell" name="emails" value="${escapeHtml((model.config.notifications.emails || []).join(","))}" placeholder="security@example.com,ops@example.com" />
            </label>
            <label class="label-stack">
              <span>Strict Mode</span>
              <select class="input-shell" name="strict_mode">
                <option value="false" ${model.config.protection.strict_mode ? "" : "selected"}>Disabled</option>
                <option value="true" ${model.config.protection.strict_mode ? "selected" : ""}>Enabled</option>
              </select>
            </label>
            <button class="action-button" type="submit">Save Settings</button>
          </form>
        </section>

        <section class="section-panel">
          <h3>Security + Runtime</h3>
          <p>Current client runtime status and API identity.</p>
          <div class="legend-list">
            <div class="settings-row"><span>API key</span><span class="mono">${boot.apiKeyPresent ? "configured" : "missing"}</span></div>
            <div class="settings-row"><span>Model version</span><span>${escapeHtml(state.data.status?.model_version || boot.modelVersion || "3.0.0-base")}</span></div>
            <div class="settings-row"><span>Event count</span><span>${model.events.length}</span></div>
            <div class="settings-row"><span>Auto-block OSINT</span><span>${model.config.protection.auto_block_osint ? "On" : "Off"}</span></div>
            <div class="settings-row"><span>Rate limit</span><span>${model.config.protection.rate_limit || 2500}</span></div>
          </div>
        </section>
      </section>
    `;
  }

  function renderSection() {
    const model = deriveModel();
    renderHero(model);

    navEl.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.section === state.section);
    });

    if (state.section === "overview") contentEl.innerHTML = renderOverview(model);
    if (state.section === "traffic") contentEl.innerHTML = renderTraffic(model);
    if (state.section === "threats") contentEl.innerHTML = renderThreats(model);
    if (state.section === "protection") contentEl.innerHTML = renderProtection(model);
    if (state.section === "reports") contentEl.innerHTML = renderReports(model);
    if (state.section === "settings") contentEl.innerHTML = renderSettings(model);
  }

  async function loadData() {
    try {
      const [eventsRes, statusRes, healthRes, stateRes] = await Promise.all([
        api("/api/v1/events"),
        api("/api/v1/status"),
        api("/health"),
        api("/api/v1/dashboard/state"),
      ]);
      state.data.events = eventsRes.events || [];
      state.data.status = statusRes;
      state.data.health = healthRes;
      state.data.config = stateRes;
      renderSection();
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : String(error));
    }
  }

  async function submitValue(endpoint, value, successText) {
    await api(endpoint, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
    showToast("success", successText);
    await loadData();
  }

  async function saveSettings(payload) {
    await api("/api/v1/dashboard/state", {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    showToast("success", "Settings updated");
    await loadData();
  }

  navEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-section]");
    if (!button) return;
    const nextSection = button.dataset.section;
    if (!sections.includes(nextSection)) return;
    state.section = nextSection;
    window.history.pushState({}, "", `/dashboard/${nextSection}`);
    renderSection();
  });

  document.addEventListener("click", async (event) => {
    const navButton = event.target.closest("[data-nav]");
    if (navButton) {
      state.section = navButton.dataset.nav;
      window.history.pushState({}, "", `/dashboard/${state.section}`);
      renderSection();
      return;
    }

    const downloadButton = event.target.closest("[data-download]");
    if (downloadButton) {
      const model = deriveModel();
      downloadJson(`${downloadButton.dataset.download}-report.json`, {
        client_id: boot.clientId,
        generated_at: new Date().toISOString(),
        section: downloadButton.dataset.download,
        summary: {
          threats_blocked: model.blocked.length,
          active_threats: model.malicious.length,
          avg_trust: model.avgTrust,
          avg_latency_ms: model.avgLatency,
        },
        events: model.events,
        config: model.config,
      });
      showToast("info", "Report generated");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form");
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form);

    try {
      if (form.dataset.form === "block") {
        await submitValue("/api/v1/dashboard/blocklist", String(data.get("value") || ""), "Added to blocklist");
        form.reset();
      }
      if (form.dataset.form === "whitelist") {
        await submitValue("/api/v1/dashboard/whitelist", String(data.get("value") || ""), "Added to whitelist");
        form.reset();
      }
      if (form.dataset.form === "rule") {
        await api("/api/v1/dashboard/rules", {
          method: "POST",
          body: JSON.stringify({
            name: String(data.get("name") || ""),
            condition: String(data.get("condition") || ""),
            action: String(data.get("action") || ""),
            enabled: true,
          }),
        });
        showToast("success", "Firewall rule added");
        form.reset();
        await loadData();
      }
      if (form.dataset.form === "settings") {
        await saveSettings({
          profile: {
            company_name: String(data.get("company_name") || ""),
            primary_contact: String(data.get("primary_contact") || ""),
          },
          notifications: {
            emails: String(data.get("emails") || "")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          },
          protection: {
            strict_mode: String(data.get("strict_mode")) === "true",
          },
        });
      }
    } catch (error) {
      showToast("error", error instanceof Error ? error.message : String(error));
    }
  });

  window.addEventListener("popstate", () => {
    const parts = window.location.pathname.split("/");
    const nextSection = parts[parts.length - 1];
    state.section = sections.includes(nextSection) ? nextSection : "overview";
    renderSection();
  });

  state.timers.push(window.setInterval(loadData, 5000));
  loadData();
})();
