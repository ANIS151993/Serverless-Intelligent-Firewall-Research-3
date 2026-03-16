"use client";

import Link from "next/link";
import { useState } from "react";

import {
  attackTone,
  formatDate,
  relativeTime,
  statusTone,
  type ClientCard,
  type DistributionItem,
  type FeedCard,
  type MetricCard,
  type PlatformViewModel,
  type ThreatEvent,
} from "../lib/platform";
import { useSuperData } from "./super-context";

const TONE_COLORS: Record<string, string> = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  accent: "var(--accent-alt)",
  primary: "var(--primary-light)",
  muted: "var(--surface-4)",
  critical: "var(--critical)",
  info: "var(--accent)",
};

function toneColor(tone: string) {
  return TONE_COLORS[tone] ?? "var(--primary-light)";
}

function toneClass(tone: string) {
  switch (tone) {
    case "success":
      return "tone-success";
    case "warning":
      return "tone-warning";
    case "danger":
    case "critical":
      return "tone-danger";
    case "accent":
    case "info":
      return "tone-accent";
    default:
      return "tone-muted";
  }
}

function PageIntro({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="panel hero-panel">
      <div className="hero-copy">
        <div className="eyebrow">ASLF-OSINT Platform</div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="hero-action">{action}</div> : null}
    </section>
  );
}

function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          {description ? <p className="panel-description">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
  return <span className={`status-pill ${toneClass(tone)}`}>{label}</span>;
}

function MetricCardView({ item }: { item: MetricCard }) {
  return (
    <Link href={item.href} className="metric-card">
      <div className="metric-card-top">
        <span className="metric-label">{item.label}</span>
        <StatusPill label={item.delta} tone={item.tone} />
      </div>
      <div className="metric-value">{item.value}</div>
      <div className="metric-detail">{item.detail}</div>
      <Sparkline values={item.trend} tone={item.tone} />
    </Link>
  );
}

function Sparkline({ values, tone }: { values: number[]; tone: string }) {
  const width = 180;
  const height = 52;
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const range = Math.max(1, maxValue - minValue);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - minValue) / range) * (height - 8) - 4;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="rgba(148,163,184,0.18)"
        strokeWidth="1"
        points={`0,${height - 8} ${width},${height - 8}`}
      />
      <polyline
        fill="none"
        stroke={toneColor(tone)}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function ProgressBar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="progress-shell">
      <div className="progress-bar" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: toneColor(tone) }} />
    </div>
  );
}

function DonutChart({
  items,
  centerLabel,
}: {
  items: DistributionItem[];
  centerLabel: string;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let offset = 0;
  const segments = items
    .map((item) => {
      const share = total > 0 ? (item.value / total) * 100 : 100 / Math.max(items.length, 1);
      const start = offset;
      const end = offset + share;
      offset = end;
      return `${toneColor(item.tone)} ${start}% ${end}%`;
    })
    .join(", ");

  return (
    <div className="donut-layout">
      <div
        className="donut-chart"
        style={{
          background: `conic-gradient(${segments || "rgba(148,163,184,0.2) 0% 100%"})`,
        }}
      >
        <div className="donut-center">
          <strong>{total}</strong>
          <span>{centerLabel}</span>
        </div>
      </div>

      <div className="legend-list">
        {items.map((item) => (
          <div key={item.label} className="legend-row">
            <span className="legend-label">
              <span className="legend-dot" style={{ background: toneColor(item.tone) }} />
              {item.label}
            </span>
            <span className="legend-value">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttackMap({ data }: { data: PlatformViewModel["overview"]["mapArcs"] }) {
  return (
    <div className="attack-map">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="attackArc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(6,182,212,0.25)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0.9)" />
          </linearGradient>
        </defs>

        <rect x="0" y="0" width="100" height="100" fill="transparent" />
        {[20, 40, 60, 80].map((x) => (
          <line key={`v-${x}`} x1={x} y1={4} x2={x} y2={96} stroke="rgba(148,163,184,0.08)" strokeDasharray="2 4" />
        ))}
        {[20, 40, 60, 80].map((y) => (
          <line key={`h-${y}`} x1={4} y1={y} x2={96} y2={y} stroke="rgba(148,163,184,0.08)" strokeDasharray="2 4" />
        ))}

        {data.map((arc) => {
          const midX = (arc.source.x + arc.target.x) / 2;
          const midY = Math.min(arc.source.y, arc.target.y) - 18;
          return (
            <g key={arc.id}>
              <path
                d={`M ${arc.source.x} ${arc.source.y} Q ${midX} ${midY} ${arc.target.x} ${arc.target.y}`}
                stroke="url(#attackArc)"
                strokeWidth={1 + arc.confidence * 2}
                fill="none"
                strokeLinecap="round"
              />
              <circle cx={arc.source.x} cy={arc.source.y} r="1.8" fill="rgba(6,182,212,0.85)" />
              <circle cx={arc.target.x} cy={arc.target.y} r="2.4" fill="rgba(59,130,246,0.95)" />
            </g>
          );
        })}
      </svg>

      <div className="attack-map-footer">
        <span>Live attack lanes from source IPs to protected client edges</span>
        <StatusPill label={`${data.length} active paths`} tone="danger" />
      </div>
    </div>
  );
}

function ThreatTable({ threats, compact = false }: { threats: ThreatEvent[]; compact?: boolean }) {
  return (
    <div className="table-shell">
      <table className="data-table">
        <thead>
          <tr>
            <th>Time</th>
            {!compact ? <th>Client</th> : null}
            <th>Attack Type</th>
            <th>Source IP</th>
            {!compact ? <th>Confidence</th> : null}
            {!compact ? <th>Trust</th> : null}
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {threats.length === 0 ? (
            <tr>
              <td colSpan={compact ? 4 : 6} className="empty-cell">
                No threat events yet.
              </td>
            </tr>
          ) : (
            threats.map((event) => (
              <tr key={event.id}>
                <td>{relativeTime(event.timestamp)}</td>
                {!compact ? <td className="mono">{event.client_id ? `${event.client_id.slice(0, 8)}…` : "—"}</td> : null}
                <td>
                  <StatusPill label={event.attack_type} tone={attackTone(event.attack_type)} />
                </td>
                <td className="mono">{event.source_ip || "—"}</td>
                {!compact ? <td>{Math.round(event.confidence * 100)}%</td> : null}
                {!compact ? <td>{(event.trust_score ?? 0.5).toFixed(2)}</td> : null}
                <td>
                  <StatusPill
                    label={event.action_taken}
                    tone={
                      event.action_taken === "block_ip"
                        ? "danger"
                        : event.action_taken === "require_auth"
                          ? "warning"
                          : "success"
                    }
                  />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function ClientHealthList({ clients }: { clients: ClientCard[] }) {
  return (
    <div className="stack-list">
      {clients.slice(0, 6).map((client) => (
        <div key={client.id} className="client-row">
          <div>
            <div className="client-row-name">{client.name}</div>
            <div className="client-row-meta">
              {client.subdomain}.marcbd.site · {relativeTime(client.lastSeen)}
            </div>
          </div>
          <div className="client-row-right">
            <StatusPill label={client.status} tone={statusTone(client.status)} />
            <div className="client-row-health">{client.healthScore}%</div>
          </div>
          <ProgressBar value={client.healthScore} tone={statusTone(client.status)} />
        </div>
      ))}
    </div>
  );
}

function LineChart({
  rows,
  keys,
}: {
  rows: Array<Record<string, number | string>>;
  keys: Array<{ key: string; color: string; label: string }>;
}) {
  const width = 480;
  const height = 200;
  const numericValues = rows.flatMap((row) =>
    keys.map((item) => Number(row[item.key] ?? 0)),
  );
  const maxValue = Math.max(...numericValues, 1);

  function pathFor(key: string) {
    return rows
      .map((row, index) => {
        const x = (index / Math.max(rows.length - 1, 1)) * width;
        const y = height - (Number(row[key] ?? 0) / maxValue) * (height - 24) - 8;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }

  return (
    <div className="line-chart">
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[25, 50, 75].map((value) => (
          <line
            key={value}
            x1={0}
            y1={height - (value / 100) * height}
            x2={width}
            y2={height - (value / 100) * height}
            stroke="rgba(148,163,184,0.08)"
            strokeDasharray="4 6"
          />
        ))}
        {keys.map((item) => (
          <path key={item.key} d={pathFor(item.key)} fill="none" stroke={item.color} strokeWidth="3" strokeLinecap="round" />
        ))}
      </svg>
      <div className="chart-label-row">
        {rows.map((row) => (
          <span key={String(row.label)}>{row.label}</span>
        ))}
      </div>
      <div className="chart-legend-row">
        {keys.map((item) => (
          <span key={item.key}>
            <span className="legend-dot" style={{ background: item.color }} />
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RadarChart({
  items,
}: {
  items: Array<{ label: string; current: number; previous: number }>;
}) {
  const size = 280;
  const center = size / 2;
  const radius = 92;

  function polygon(values: number[]) {
    return values
      .map((value, index) => {
        const angle = (Math.PI * 2 * index) / values.length - Math.PI / 2;
        const pointRadius = (value / 100) * radius;
        const x = center + Math.cos(angle) * pointRadius;
        const y = center + Math.sin(angle) * pointRadius;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div className="radar-layout">
      <svg viewBox={`0 0 ${size} ${size}`}>
        {[25, 50, 75, 100].map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 100) * radius}
            fill="none"
            stroke="rgba(148,163,184,0.12)"
            strokeDasharray="4 6"
          />
        ))}
        {items.map((item, index) => {
          const angle = (Math.PI * 2 * index) / items.length - Math.PI / 2;
          const x = center + Math.cos(angle) * (radius + 20);
          const y = center + Math.sin(angle) * (radius + 20);
          return (
            <text key={item.label} x={x} y={y} textAnchor="middle" className="radar-label">
              {item.label}
            </text>
          );
        })}
        <polygon points={polygon(items.map((item) => item.previous))} fill="rgba(139,92,246,0.16)" stroke="rgba(139,92,246,0.8)" strokeWidth="2" />
        <polygon points={polygon(items.map((item) => item.current))} fill="rgba(59,130,246,0.18)" stroke="rgba(59,130,246,0.95)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function HeatGrid({ matrix }: { matrix: number[][] }) {
  const maxValue = Math.max(...matrix.flat(), 1);
  return (
    <div className="heat-grid">
      {matrix.map((row, rowIndex) =>
        row.map((value, columnIndex) => (
          <span
            key={`${rowIndex}-${columnIndex}`}
            className="heat-cell"
            style={{
              opacity: 0.18 + (value / maxValue) * 0.82,
              background:
                value > maxValue * 0.7
                  ? "rgba(220,38,38,0.92)"
                  : value > maxValue * 0.35
                    ? "rgba(245,158,11,0.85)"
                    : "rgba(6,182,212,0.55)",
            }}
          />
        )),
      )}
    </div>
  );
}

function Gauge({ value, label }: { value: number; label: string }) {
  return (
    <div className="gauge-card">
      <div
        className="gauge-ring"
        style={{
          background: `conic-gradient(var(--success) 0% ${value}%, rgba(148,163,184,0.12) ${value}% 100%)`,
        }}
      >
        <div className="gauge-inner">
          <strong>{value}%</strong>
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
}

function SourceBars({ rows }: { rows: Array<{ label: string; value: number; detail: string }> }) {
  const maxValue = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div className="stack-list">
      {rows.map((row) => (
        <div key={row.label} className="metric-line">
          <div className="metric-line-head">
            <span className="mono">{row.label}</span>
            <span>{row.detail}</span>
          </div>
          <ProgressBar value={(row.value / maxValue) * 100} tone="danger" />
        </div>
      ))}
    </div>
  );
}

function ProvisionForm() {
  const { provisionClient, refreshing } = useSuperData();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult("");
    try {
      const response = await provisionClient({ name, email });
      setResult(`Provisioned ${response.subdomain}.marcbd.site with Access status ${response.access_status}. API key ${response.api_key.slice(0, 10)}…`);
      setName("");
      setEmail("");
      setCompany("");
      setNotes("");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setResult(`Provisioning failed: ${message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-grid" onSubmit={handleSubmit}>
      <label className="input-group">
        <span>Client Name</span>
        <input className="input-shell" value={name} onChange={(event) => setName(event.target.value)} placeholder="Cost Effective Art" required />
      </label>
      <label className="input-group">
        <span>Client Email</span>
        <input className="input-shell" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="client@example.com" required />
      </label>
      <label className="input-group">
        <span>Company</span>
        <input className="input-shell" value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Cost Effective Art LLC" />
      </label>
      <label className="input-group">
        <span>Notes</span>
        <input className="input-shell" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Plan, sensitivity, onboarding notes" />
      </label>
      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={busy || refreshing}>
          {busy ? "Provisioning…" : "Provision Now"}
        </button>
      </div>
      {result ? <div className="inline-message">{result}</div> : null}
    </form>
  );
}

function ServiceGrid({ services }: { services: PlatformViewModel["settings"]["services"] }) {
  return (
    <div className="cards-grid cards-grid-3">
      {services.map((service) => (
        <div key={service.name} className="glass-card">
          <div className="glass-card-top">
            <div>
              <h4>{service.name}</h4>
              <p>
                {service.hostname} · {service.ip}
              </p>
            </div>
            <StatusPill label={service.status} tone={statusTone(service.status)} />
          </div>
          <div className="service-meters">
            <div>
              <span>CPU</span>
              <ProgressBar value={service.cpu} tone="accent" />
            </div>
            <div>
              <span>RAM</span>
              <ProgressBar value={service.memory} tone="primary" />
            </div>
            <div>
              <span>Disk</span>
              <ProgressBar value={service.disk} tone="warning" />
            </div>
          </div>
          <div className="stat-row">
            <span>Latency {service.latency}</span>
            <span>Uptime {service.uptime}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SuperOverviewPage() {
  const { data } = useSuperData();

  return (
    <div className="page-stack">
      <PageIntro
        title="Super Control Dashboard"
        description="Autonomous firewall orchestration across the control plane, AI engine, client host, and observability stack. The overview prioritizes immediate posture awareness and drill-down access."
        action={<Link href="/super/clients" className="button button-primary">Provision Client</Link>}
      />

      <section className="cards-grid cards-grid-5">
        {data.overview.metrics.map((item) => (
          <MetricCardView key={item.label} item={item} />
        ))}
      </section>

      <section className="layout-2-1">
        <Panel title="Global Threat Map" description="Live attack origin points and protected client edges.">
          <AttackMap data={data.overview.mapArcs} />
        </Panel>

        <Panel title="System Health" description="Average client posture and AI drift status.">
          <Gauge value={Number(data.overview.metrics[4]?.value.replace("%", "") || 0)} label="System health" />
          <div className="stack-list compact-stack">
            <div className="metric-line">
              <div className="metric-line-head">
                <span>AI engine</span>
                <StatusPill label={data.overview.aiWidget.status} tone={statusTone(data.overview.aiWidget.status)} />
              </div>
            </div>
            <div className="metric-line">
              <div className="metric-line-head">
                <span>OSINT cycle</span>
                <span>{data.overview.aiWidget.osintLabel}</span>
              </div>
            </div>
            <div className="metric-line">
              <div className="metric-line-head">
                <span>Drift monitor</span>
                <StatusPill label={data.overview.aiWidget.driftLabel} tone={data.overview.aiWidget.driftLabel === "Stable" ? "success" : "warning"} />
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="layout-2-1">
        <Panel title="Live Threat Feed" description="Polling every 10 seconds from the super control plane.">
          <ThreatTable threats={data.overview.liveThreats} />
        </Panel>

        <div className="panel-stack">
          <Panel title="Attack Distribution" description="Current classification mix in the active window.">
            <DonutChart items={data.overview.distribution} centerLabel="Events" />
          </Panel>

          <Panel title="Client Health Status" description="Recent tenant health, threat pressure, and recency.">
            <ClientHealthList clients={data.overview.clientHealth} />
          </Panel>

          <Panel title="AI Engine Pulse" description="Research paradigms, runtime state, and PPO reward trend.">
            <div className="stack-list compact-stack">
              <div className="metric-line">
                <div className="metric-line-head">
                  <span>Runtime</span>
                  <span>{data.overview.aiWidget.version}</span>
                </div>
              </div>
              <div className="metric-line">
                <div className="metric-line-head">
                  <span>Model state</span>
                  <span>{data.overview.aiWidget.modelState}</span>
                </div>
              </div>
              <div className="metric-line">
                <div className="metric-line-head">
                  <span>Paradigms</span>
                  <span>{data.overview.aiWidget.paradigms.join(" · ") || "Configured"}</span>
                </div>
              </div>
            </div>
            <Sparkline values={data.overview.aiWidget.ppoTrend} tone="accent" />
          </Panel>
        </div>
      </section>
    </div>
  );
}

export function SuperClientsPage() {
  const { data } = useSuperData();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"table" | "cards">("table");

  const filtered = data.clients.list.filter((client) =>
    `${client.name} ${client.email} ${client.subdomain}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="page-stack">
      <PageIntro
        title="Client Management"
        description="Provision, inspect, and operate per-tenant dashboards from the super control plane. Current onboarding uses the live provisioner and Cloudflare Access automation."
        action={<StatusPill label={`${data.clients.list.length} active tenants`} tone="success" />}
      />

      <section className="layout-2-1">
        <Panel title="All Clients" description="Search and operate all tenants from one place.">
          <div className="toolbar-row">
            <input
              className="input-shell"
              placeholder="Search by name, email, or subdomain"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="button-group">
              <button type="button" className={`button ${view === "table" ? "button-primary" : "button-ghost"}`} onClick={() => setView("table")}>
                Table
              </button>
              <button type="button" className={`button ${view === "cards" ? "button-primary" : "button-ghost"}`} onClick={() => setView("cards")}>
                Cards
              </button>
            </div>
          </div>

          {view === "table" ? (
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Subdomain</th>
                    <th>Status</th>
                    <th>Plan</th>
                    <th>Threats</th>
                    <th>Last Active</th>
                    <th>Health</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((client) => (
                    <tr key={client.id}>
                      <td>
                        <div className="table-primary">{client.name}</div>
                        <div className="table-secondary">{client.email}</div>
                      </td>
                      <td className="mono">{client.subdomain}.marcbd.site</td>
                      <td><StatusPill label={client.status} tone={statusTone(client.status)} /></td>
                      <td>{client.plan}</td>
                      <td>{client.threatCount}</td>
                      <td>{relativeTime(client.lastSeen)}</td>
                      <td>{client.healthScore}%</td>
                      <td>
                        <Link href={client.dashboardUrl} className="button button-ghost" target="_blank">
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="cards-grid cards-grid-3">
              {filtered.map((client) => (
                <div key={client.id} className="glass-card">
                  <div className="glass-card-top">
                    <div>
                      <h4>{client.name}</h4>
                      <p>{client.subdomain}.marcbd.site</p>
                    </div>
                    <StatusPill label={client.status} tone={statusTone(client.status)} />
                  </div>
                  <div className="stat-row">
                    <span>Threats {client.threatCount}</span>
                    <span>Blocked {client.blockedCount}</span>
                  </div>
                  <ProgressBar value={client.healthScore} tone={statusTone(client.status)} />
                  <div className="stat-row">
                    <span>Trust {client.trustAverage.toFixed(2)}</span>
                    <Link href={client.dashboardUrl} target="_blank">Open dashboard</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <div className="panel-stack">
          <Panel title="Provision New Client" description="This form calls the live core API and provisioner workflow.">
            <ProvisionForm />
          </Panel>

          <Panel title="Client Health Map" description="Geographic placement is derived from onboarding profiles until geo APIs are added.">
            <div className="cards-grid cards-grid-2">
              {data.clients.list.slice(0, 6).map((client) => (
                <div key={client.id} className="health-map-card">
                  <div className="stat-row">
                    <strong>{client.name}</strong>
                    <StatusPill label={client.status} tone={statusTone(client.status)} />
                  </div>
                  <p>{client.locationLabel}</p>
                  <ProgressBar value={client.healthScore} tone={statusTone(client.status)} />
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

export function SuperAIPage() {
  const { data } = useSuperData();
  const [tab, setTab] = useState<"model" | "osint" | "drift" | "federated">("model");

  return (
    <div className="page-stack">
      <PageIntro
        title="AI Activity Monitor"
        description="Model quality, OSINT ingestion, drift monitoring, and federated collaboration are surfaced as first-class operational signals."
        action={
          <div className="button-group">
            {[
              ["model", "Model Monitor"],
              ["osint", "OSINT Feeds"],
              ["drift", "Drift Detection"],
              ["federated", "Federated Learning"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`button ${tab === value ? "button-primary" : "button-ghost"}`}
                onClick={() => setTab(value as typeof tab)}
              >
                {label}
              </button>
            ))}
          </div>
        }
      />

      {tab === "model" ? (
        <>
          <section className="cards-grid cards-grid-6">
            {data.ai.modelMetrics.map((metric) => (
              <div key={metric.label} className="metric-mini">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em>{metric.delta}</em>
              </div>
            ))}
          </section>

          <section className="layout-2-1">
            <Panel title="Model Performance Over Time" description="Research-aligned quality metrics across deployments.">
              <LineChart
                rows={data.ai.performanceTrend}
                keys={[
                  { key: "accuracy", color: "var(--primary-light)", label: "Accuracy" },
                  { key: "f1", color: "var(--accent-alt)", label: "F1" },
                  { key: "precision", color: "var(--accent)", label: "Precision" },
                  { key: "recall", color: "var(--success)", label: "Recall" },
                ]}
              />
            </Panel>

            <Panel title="Latency Distribution" description="Target response time remains 87ms.">
              <div className="stack-list">
                {data.ai.latency.map((row) => (
                  <div key={row.label} className="metric-line">
                    <div className="metric-line-head">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    <ProgressBar value={row.value} tone={row.withinTarget ? "success" : "danger"} />
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="layout-2-1">
            <Panel title="Per-Class Detection Radar" description="Current model versus previous deployment.">
              <RadarChart items={data.ai.radar} />
            </Panel>

            <Panel title="Model Versions" description="Policy updates recorded by sif-core.">
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Version</th>
                      <th>Deploy Date</th>
                      <th>Accuracy</th>
                      <th>Latency</th>
                      <th>Clients Using</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.ai.versions.map((version) => (
                      <tr key={version.version}>
                        <td>{version.version}</td>
                        <td>{version.deployedAt}</td>
                        <td>{version.accuracy}</td>
                        <td>{version.latency}</td>
                        <td>{version.clientsUsing}</td>
                        <td><StatusPill label={version.status} tone={statusTone(version.status)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>
        </>
      ) : null}

      {tab === "osint" ? (
        <section className="layout-2-1">
          <Panel title="Feed Status" description="Real counts are shown where configured; missing feeds stay visible to signal onboarding gaps.">
            <div className="cards-grid cards-grid-3">
              {data.ai.feeds.map((feed) => (
                <div key={feed.name} className="glass-card">
                  <div className="glass-card-top">
                    <div>
                      <h4>{feed.name}</h4>
                      <p>Last sync {feed.lastSync}</p>
                    </div>
                    <StatusPill label={feed.status} tone={statusTone(feed.status)} />
                  </div>
                  <div className="stat-row">
                    <span>Cycle {feed.indicators}</span>
                    <span>Total {feed.totalIndicators}</span>
                  </div>
                  <ProgressBar value={(feed.quotaUsed / feed.quotaLimit) * 100} tone={feed.status === "connected" ? "success" : "warning"} />
                  <Sparkline values={feed.spark} tone={feed.status === "connected" ? "success" : "warning"} />
                  {feed.errors[0] ? <div className="inline-message">{feed.errors[0]}</div> : null}
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Recent Indicators" description="Indicators recently surfaced to the control plane.">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Source</th>
                    <th>Confidence</th>
                    <th>Hits</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ai.indicators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="empty-cell">No indicators ingested yet.</td>
                    </tr>
                  ) : (
                    data.ai.indicators.map((indicator) => (
                      <tr key={`${indicator.source}-${indicator.value}`}>
                        <td>{indicator.type}</td>
                        <td className="mono">{indicator.value}</td>
                        <td>{indicator.source}</td>
                        <td>{Math.round(indicator.confidence * 100)}%</td>
                        <td>{indicator.hits}</td>
                        <td><StatusPill label={indicator.status} tone={indicator.status === "active" ? "success" : "warning"} /></td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      ) : null}

      {tab === "drift" ? (
        <section className="layout-2-1">
          <Panel title="Drift Status" description="Recent versus reference error windows using the platform drift monitor.">
            <div className="stack-list compact-stack">
              <div className="stat-row">
                <strong>{data.ai.drift.banner}</strong>
                <StatusPill label={data.ai.drift.banner} tone={data.ai.drift.tone} />
              </div>
              <LineChart
                rows={data.ai.drift.timeline}
                keys={[
                  { key: "recent", color: "var(--warning)", label: "Recent error" },
                  { key: "reference", color: "var(--primary-light)", label: "Reference error" },
                  { key: "threshold", color: "var(--danger)", label: "3σ threshold" },
                ]}
              />
            </div>
          </Panel>

          <Panel title="Adaptation Activity" description="Strategic Selection & Forgetting operations during drift windows.">
            <div className="stack-list">
              {data.ai.drift.adaptationFeed.map((entry) => (
                <div key={entry} className="timeline-note">{entry}</div>
              ))}
            </div>
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Detected</th>
                    <th>Duration</th>
                    <th>Pre</th>
                    <th>Post</th>
                    <th>Recovery</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ai.drift.events.map((event) => (
                    <tr key={event.id}>
                      <td>{event.id}</td>
                      <td>{event.detectedAt}</td>
                      <td>{event.duration}</td>
                      <td>{event.pre}</td>
                      <td>{event.post}</td>
                      <td>{event.recovery}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      ) : null}

      {tab === "federated" ? (
        <section className="layout-2-1">
          <Panel title="Federation Network" description="Participating clients, contribution weights, and current round state.">
            <div className="stack-list">
              <div className="stat-row">
                <strong>Round {data.ai.federation.round}</strong>
                <span>{data.ai.federation.eta}</span>
              </div>
              <ProgressBar value={data.ai.federation.progress} tone="accent" />
              <div className="cards-grid cards-grid-3">
                {data.ai.federation.nodes.map((node) => (
                  <div key={node.label} className="glass-card compact-card">
                    <div className="stat-row">
                      <strong>{node.label}</strong>
                      <StatusPill label={node.status} tone={statusTone(node.status)} />
                    </div>
                    <ProgressBar value={node.weight} tone="primary" />
                  </div>
                ))}
              </div>
            </div>
          </Panel>

          <Panel title="Convergence + Contributions" description="Accuracy versus research baselines and per-client contribution.">
            <LineChart
              rows={data.ai.federation.convergence.map((row) => ({
                label: `R${row.round}`,
                aslf: row.aslf,
                fedavg: row.fedavg,
                fedprox: row.fedprox,
                fednova: row.fednova,
              }))}
              keys={[
                { key: "aslf", color: "var(--accent)", label: "ASLF-OSINT" },
                { key: "fedavg", color: "var(--text-tertiary)", label: "FedAvg" },
                { key: "fedprox", color: "var(--warning)", label: "FedProx" },
                { key: "fednova", color: "var(--primary-light)", label: "FedNova" },
              ]}
            />
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Dataset</th>
                    <th>Local Accuracy</th>
                    <th>Gradient Norm</th>
                    <th>Privacy</th>
                    <th>Rounds</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ai.federation.contributions.map((row) => (
                    <tr key={row.client}>
                      <td>{row.client}</td>
                      <td>{row.dataset}</td>
                      <td>{row.localAccuracy}</td>
                      <td>{row.gradientNorm}</td>
                      <td>{row.privacyBudget}%</td>
                      <td>{row.rounds}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </section>
      ) : null}
    </div>
  );
}

export function SuperThreatsPage() {
  const { data } = useSuperData();
  return (
    <div className="page-stack">
      <PageIntro
        title="Threat Intelligence"
        description="Live events, attack analytics, and OSINT-enriched context for analyst workflows."
      />

      <section className="cards-grid cards-grid-6">
        {data.threats.metrics.map((metric) => (
          <div key={metric.label} className="metric-mini">
            <span>{metric.label}</span>
            <strong className={metric.tone}>{metric.value}</strong>
            <em>{metric.detail}</em>
          </div>
        ))}
      </section>

      <section className="layout-2-1">
        <Panel title="Live Feed" description="Most recent events across all clients.">
          <ThreatTable threats={data.threats.live} />
        </Panel>

        <div className="panel-stack">
          <Panel title="Attack Analytics" description="Stacked trend by benign, malicious, and blocked traffic.">
            <LineChart
              rows={data.threats.timeline}
              keys={[
                { key: "benign", color: "var(--success)", label: "Benign" },
                { key: "malicious", color: "var(--danger)", label: "Malicious" },
                { key: "blocked", color: "var(--warning)", label: "Blocked" },
              ]}
            />
          </Panel>

          <Panel title="Attack Heatmap" description="Hourly pressure over the last seven days.">
            <HeatGrid matrix={data.threats.heatmap} />
          </Panel>
        </div>
      </section>

      <section className="layout-2-1">
        <Panel title="Top Source IPs" description="Most active observed sources in the recent window.">
          <SourceBars rows={data.threats.topSources} />
        </Panel>

        <Panel title="Protocol + Country Mix" description="Protocol distribution and estimated origin concentration.">
          <div className="stack-list">
            {data.threats.protocols.map((row) => (
              <div key={row.label} className="metric-line">
                <div className="metric-line-head">
                  <span>{row.label}</span>
                  <span>{row.value}%</span>
                </div>
                <ProgressBar value={row.value} tone="accent" />
              </div>
            ))}
            <div className="divider" />
            {data.threats.countries.map((row) => (
              <div key={row.label} className="stat-row">
                <span>{row.label}</span>
                <span>{row.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export function SuperTrafficPage() {
  const { data } = useSuperData();
  return (
    <div className="page-stack">
      <PageIntro
        title="Traffic Monitor"
        description="Platform-wide flow telemetry, per-client comparisons, and emergency control posture."
      />

      <section className="cards-grid cards-grid-5">
        {data.traffic.gauges.map((gauge) => (
          <div key={gauge.label} className="metric-mini">
            <span>{gauge.label}</span>
            <strong className={gauge.tone}>{gauge.value}</strong>
            <em>{gauge.detail}</em>
          </div>
        ))}
      </section>

      <section className="layout-2-1">
        <Panel title="Bandwidth Chart" description="Estimated benign and malicious throughput over the last eight slices.">
          <LineChart
            rows={data.traffic.bandwidth}
            keys={[
              { key: "benign", color: "var(--success)", label: "Benign" },
              { key: "malicious", color: "var(--danger)", label: "Malicious" },
            ]}
          />
        </Panel>

        <Panel title="Traffic Controls" description="Controls are presented here; only backend-supported actions should be automated.">
          <div className="stack-list">
            <div className="metric-line">
              <div className="metric-line-head">
                <span>Global rate limit</span>
                <span>{data.traffic.controls.rateLimit} flows/sec</span>
              </div>
              <ProgressBar value={68} tone="warning" />
            </div>
            <div className="metric-line">
              <div className="metric-line-head">
                <span>Emergency lockdown</span>
                <StatusPill label={data.traffic.controls.lockdownReady ? "armed" : "disabled"} tone={data.traffic.controls.lockdownReady ? "danger" : "muted"} />
              </div>
            </div>
            <div className="metric-line">
              <div className="metric-line-head">
                <span>Whitelist entries</span>
                <span>{data.traffic.controls.whitelistCount}</span>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <section className="layout-2-1">
        <Panel title="Per-Client Comparison" description="Traffic volume split by benign and malicious flows.">
          <div className="stack-list">
            {data.traffic.clientComparison.map((row) => {
              const total = row.benign + row.malicious;
              return (
                <div key={row.label} className="metric-line">
                  <div className="metric-line-head">
                    <span>{row.label}</span>
                    <span>{total}</span>
                  </div>
                  <div className="dual-progress">
                    <div style={{ width: `${(row.benign / total) * 100}%`, background: "var(--success)" }} />
                    <div style={{ width: `${(row.malicious / total) * 100}%`, background: "var(--danger)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Protocol Flow Breakdown" description="Simplified sankey-style view of client traffic.">
          <div className="stack-list">
            {data.traffic.flowBreakdown.map((row) => (
              <div key={`${row.from}-${row.to}`} className="stat-row">
                <span>{row.from} → {row.to}</span>
                <span>{row.value}%</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </div>
  );
}

export function SuperTeamPage() {
  const { data } = useSuperData();
  return (
    <div className="page-stack">
      <PageIntro
        title="Team Management"
        description="Platform users, role posture, and recent audit activity. This page currently combines live operational events with admin reference data."
      />

      <section className="layout-2-1">
        <Panel title="Users" description="Current engineering and analyst seats.">
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {data.team.users.map((user) => (
                  <tr key={user.email}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td><StatusPill label={user.status} tone={statusTone(user.status)} /></td>
                    <td>{user.lastLogin}</td>
                    <td className="mono">{user.ip}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="Roles & Permissions" description="High-level permission groupings.">
          <div className="stack-list">
            {data.team.roles.map((role) => (
              <div key={role.role} className="glass-card compact-card">
                <div className="glass-card-top">
                  <div>
                    <h4>{role.role}</h4>
                    <p>{role.summary}</p>
                  </div>
                </div>
                <div className="token-row">
                  {role.permissions.map((permission) => (
                    <span key={permission} className="token">{permission}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel title="Audit Log" description="Recent operational and administrative actions.">
        <div className="table-shell">
          <table className="data-table">
            <thead>
              <tr>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Time</th>
                <th>IP</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {data.team.audit.map((entry, index) => (
                <tr key={`${entry.actor}-${index}`}>
                  <td>{entry.actor}</td>
                  <td>{entry.action}</td>
                  <td>{entry.target}</td>
                  <td>{entry.timestamp}</td>
                  <td className="mono">{entry.ip}</td>
                  <td><StatusPill label={entry.result} tone={entry.result === "success" ? "success" : "warning"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

export function SuperSettingsPage() {
  const { data } = useSuperData();
  return (
    <div className="page-stack">
      <PageIntro
        title="Platform Settings"
        description="VM status, API key posture, notification rules, and runtime integrations."
      />

      <Panel title="System Health" description="Core services across the six-VM deployment.">
        <ServiceGrid services={data.settings.services} />
      </Panel>

      <section className="layout-2-1">
        <Panel title="API Keys" description="Masked credentials and their recent usage.">
          <div className="table-shell">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Masked</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th>Expiry</th>
                  <th>Scope</th>
                </tr>
              </thead>
              <tbody>
                {data.settings.apiKeys.map((key) => (
                  <tr key={key.name}>
                    <td>{key.name}</td>
                    <td className="mono">{key.masked}</td>
                    <td>{key.created}</td>
                    <td>{key.lastUsed}</td>
                    <td>{key.expiry}</td>
                    <td>{key.scope}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="panel-stack">
          <Panel title="Notification Rules" description="Current response automation policy.">
            <div className="stack-list">
              {data.settings.notificationRules.map((rule) => (
                <div key={rule.name} className="glass-card compact-card">
                  <div className="glass-card-top">
                    <div>
                      <h4>{rule.name}</h4>
                      <p>{rule.condition}</p>
                    </div>
                    <StatusPill label={rule.status} tone="success" />
                  </div>
                  <div className="table-secondary">{rule.action}</div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Integrations" description="External or internal service posture.">
            <div className="stack-list">
              {data.settings.integrations.map((integration) => (
                <div key={integration.name} className="metric-line">
                  <div className="metric-line-head">
                    <span>{integration.name}</span>
                    <StatusPill label={integration.status} tone={statusTone(integration.status)} />
                  </div>
                  <div className="table-secondary">{integration.detail}</div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}

export function LoginPage() {
  const [step, setStep] = useState<"credentials" | "mfa">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function submitCredentials(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@")) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters.");
      return;
    }
    setMessage("");
    setStep("mfa");
  }

  return (
    <div className="login-shell">
      <div className="login-brand">
        <div className="network-grid">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="network-node"
              style={{
                left: `${8 + ((index * 19) % 80)}%`,
                top: `${10 + ((index * 13) % 72)}%`,
                animationDelay: `${index * 0.1}s`,
              }}
            />
          ))}
        </div>
        <div className="login-brand-copy">
          <div className="eyebrow">ASLF-OSINT</div>
          <h1>Welcome to SIF Control Center</h1>
          <p>IEEE-grade autonomous firewall operations for engineering teams and client SOCs.</p>
          <div className="login-metrics">
            <div><strong>98.7%</strong><span>Detection Accuracy</span></div>
            <div><strong>87ms</strong><span>Average Latency</span></div>
            <div><strong>94.3%</strong><span>Zero-Day Detection</span></div>
          </div>
        </div>
      </div>

      <div className="login-panel">
        <div className="panel glass-panel">
          <div className="eyebrow">Secure Access</div>
          <h2>{step === "credentials" ? "Super Admin Login" : "Multi-Factor Verification"}</h2>
          <p className="panel-description">
            {step === "credentials"
              ? "Cloudflare Access protects the production deployment. This page models the first-party login UX requested in the design brief."
              : "Enter the 6-digit verification code from your authenticator."}
          </p>

          {step === "credentials" ? (
            <form className="form-grid" onSubmit={submitCredentials}>
              <label className="input-group">
                <span>Email</span>
                <input className="input-shell" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="engr.aanis@gmail.com" />
              </label>
              <label className="input-group">
                <span>Password</span>
                <input className="input-shell" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••••" />
              </label>
              <label className="check-row">
                <input type="checkbox" defaultChecked />
                <span>Remember this device for 30 days</span>
              </label>
              <button type="submit" className="button button-primary">Sign In</button>
              <div className="table-secondary">Or continue with Google, Microsoft, or GitHub SSO.</div>
            </form>
          ) : (
            <div className="form-grid">
              <div className="mfa-grid">
                {Array.from({ length: 6 }).map((_, index) => (
                  <input key={index} className="mfa-box" maxLength={1} inputMode="numeric" />
                ))}
              </div>
              <button type="button" className="button button-primary">Verify</button>
              <button type="button" className="button button-ghost" onClick={() => setStep("credentials")}>
                Back
              </button>
            </div>
          )}

          {message ? <div className="inline-message">{message}</div> : null}
          <div className="panel-footer">Version 3.0.0 · Gannon University IEEE research implementation</div>
        </div>
      </div>
    </div>
  );
}
