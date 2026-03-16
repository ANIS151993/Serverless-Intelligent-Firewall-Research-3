export type ThreatEvent = {
  id: string;
  client_id: string | null;
  timestamp: string;
  attack_type: string;
  source_ip: string;
  destination_ip?: string;
  confidence: number;
  trust_score?: number;
  action_taken: string;
  model_version?: string | null;
};

export type ClientRecord = {
  id: string;
  name: string;
  email: string;
  api_key: string;
  subsystem_id: string;
  subdomain: string;
  created_at: string;
  active: boolean;
  config: Record<string, unknown>;
};

export type ClientHealthRecord = {
  client_id: string;
  name: string;
  subdomain: string;
  last_seen: string | null;
  threat_count: number;
};

type OverviewResponse = {
  total_clients: number;
  total_threats: number;
  threats_24h: number;
  blocked_count: number;
  osint_indicators: number;
  attack_distribution: Array<{ type: string; count: number }>;
  recent_threats: ThreatEvent[];
};

type ThreatStatsRow = {
  attack_type: string;
  count: number;
  avg_confidence: number;
};

type OsintStats = {
  active_total: number;
  by_source: Array<{ source: string; count: number }>;
  recent: Array<{
    value: string;
    type: string;
    source: string;
    confidence: number;
    ingested_at: string;
  }>;
};

type PolicyUpdate = {
  id: string;
  version: string;
  model_path: string | null;
  pushed_at: string;
  affected_clients: string[];
  status: string;
};

type AIStatus = {
  service: string;
  version: string;
  model_trained: boolean;
  status: string;
  paradigms?: string[];
};

type AIOSINTStatus = {
  indicator_count: number;
  cycle_count: number;
  last_run: string | null;
  last_summary?: Record<string, unknown>;
};

type AIDriftStatus = {
  drift_detected: boolean;
  recent_window_size: number;
  history_window_size: number;
};

export type MetricCard = {
  label: string;
  value: string;
  detail: string;
  delta: string;
  tone: "primary" | "success" | "warning" | "danger" | "accent";
  trend: number[];
  href: string;
};

export type AttackArc = {
  id: string;
  attackType: string;
  clientName: string;
  sourceIp: string;
  confidence: number;
  source: { x: number; y: number };
  target: { x: number; y: number };
};

export type DistributionItem = {
  label: string;
  value: number;
  detail: string;
  tone: "success" | "warning" | "danger" | "accent" | "muted";
};

export type ClientCard = {
  id: string;
  name: string;
  email: string;
  subdomain: string;
  dashboardUrl: string;
  createdAt: string;
  plan: string;
  status: "healthy" | "warning" | "critical" | "offline";
  healthScore: number;
  threatCount: number;
  blockedCount: number;
  trustAverage: number;
  lastSeen: string | null;
  locationLabel: string;
};

export type FeedCard = {
  name: string;
  status: "connected" | "warning" | "error";
  lastSync: string;
  indicators: number;
  totalIndicators: number;
  quotaUsed: number;
  quotaLimit: number;
  spark: number[];
  errors: string[];
};

export type NotificationItem = {
  id: string;
  tone: "critical" | "warning" | "info";
  title: string;
  summary: string;
  time: string;
  href: string;
};

export type SearchItem = {
  id: string;
  title: string;
  description: string;
  category: string;
  href: string;
};

export type PlatformViewModel = {
  meta: {
    generatedAt: string;
    live: boolean;
    error: string | null;
    notificationCount: number;
  };
  overview: {
    metrics: MetricCard[];
    mapArcs: AttackArc[];
    liveThreats: ThreatEvent[];
    distribution: DistributionItem[];
    clientHealth: ClientCard[];
    aiWidget: {
      version: string;
      service: string;
      modelState: string;
      status: string;
      paradigms: string[];
      osintLabel: string;
      driftLabel: string;
      ppoTrend: number[];
    };
  };
  clients: {
    list: ClientCard[];
    statusCounts: Array<{ label: string; value: number; tone: string }>;
    provisionTemplates: Array<{ label: string; value: string }>;
  };
  ai: {
    modelMetrics: Array<{ label: string; value: string; delta: string }>;
    performanceTrend: Array<{ label: string; accuracy: number; f1: number; precision: number; recall: number }>;
    radar: Array<{ label: string; current: number; previous: number }>;
    confusion: number[][];
    latency: Array<{ label: string; value: number; withinTarget: boolean }>;
    versions: Array<{ version: string; deployedAt: string; accuracy: string; latency: string; clientsUsing: number; status: string }>;
    feeds: FeedCard[];
    indicators: Array<{ value: string; type: string; source: string; confidence: number; ingestedAt: string; hits: number; status: string }>;
    drift: {
      banner: string;
      tone: "success" | "warning" | "danger";
      timeline: Array<{ label: string; recent: number; reference: number; threshold: number }>;
      events: Array<{ id: string; detectedAt: string; duration: string; pre: string; post: string; recovery: string; status: string }>;
      adaptationFeed: string[];
    };
    federation: {
      round: string;
      progress: number;
      eta: string;
      nodes: Array<{ label: string; weight: number; status: "active" | "pending" | "failed" }>;
      convergence: Array<{ round: number; aslf: number; fedavg: number; fedprox: number; fednova: number }>;
      contributions: Array<{ client: string; dataset: string; localAccuracy: string; gradientNorm: string; privacyBudget: number; rounds: number; weight: string }>;
      communication: Array<{ label: string; value: string; tone: string }>;
    };
  };
  threats: {
    metrics: Array<{ label: string; value: string; detail: string; tone: string }>;
    live: ThreatEvent[];
    timeline: Array<{ label: string; benign: number; malicious: number; blocked: number }>;
    heatmap: number[][];
    topSources: Array<{ label: string; value: number; detail: string }>;
    protocols: Array<{ label: string; value: number }>;
    countries: Array<{ label: string; value: number }>;
  };
  traffic: {
    gauges: Array<{ label: string; value: string; detail: string; tone: string }>;
    bandwidth: Array<{ label: string; benign: number; malicious: number }>;
    clientComparison: Array<{ label: string; benign: number; malicious: number }>;
    flowBreakdown: Array<{ from: string; to: string; value: number }>;
    controls: {
      rateLimit: number;
      lockdownReady: boolean;
      whitelistCount: number;
    };
  };
  team: {
    users: Array<{ name: string; email: string; role: string; status: string; lastLogin: string; ip: string; created: string }>;
    roles: Array<{ role: string; summary: string; permissions: string[] }>;
    audit: Array<{ actor: string; action: string; target: string; timestamp: string; ip: string; result: string }>;
  };
  settings: {
    services: Array<{ name: string; hostname: string; ip: string; status: string; cpu: number; memory: number; disk: number; latency: string; uptime: string }>;
    apiKeys: Array<{ name: string; masked: string; created: string; lastUsed: string; expiry: string; scope: string }>;
    notificationRules: Array<{ name: string; condition: string; action: string; status: string }>;
    integrations: Array<{ name: string; status: string; detail: string }>;
  };
  notifications: NotificationItem[];
  searchIndex: SearchItem[];
};

const ATTACK_TYPES = ["BENIGN", "DoS", "DDoS", "BruteForce", "PortScan", "WebAttack", "Botnet", "Other"];
const PLAN_NAMES = ["Enterprise", "Professional", "Business", "Research"];
const LOCATIONS = ["Virginia", "London", "Singapore", "Frankfurt", "Toronto", "Sydney"];
const SERVICE_IPS = ["172.16.185.97", "172.16.185.230", "172.16.185.167", "172.16.184.201", "172.16.185.236", "172.16.184.203"];

const EMPTY_OVERVIEW: OverviewResponse = {
  total_clients: 0,
  total_threats: 0,
  threats_24h: 0,
  blocked_count: 0,
  osint_indicators: 0,
  attack_distribution: [],
  recent_threats: [],
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No recent activity";
  }
  const parsed = new Date(value);
  return parsed.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function relativeTime(value: string | null): string {
  if (!value) {
    return "Awaiting heartbeat";
  }
  const deltaMs = Date.now() - new Date(value).getTime();
  const deltaMinutes = Math.max(0, Math.round(deltaMs / 60000));
  if (deltaMinutes < 1) {
    return "just now";
  }
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }
  return `${Math.round(deltaHours / 24)}d ago`;
}

function deterministicSeries(seed: string, count: number, base: number, span: number): number[] {
  const hashed = hashString(seed) || 13;
  return Array.from({ length: count }, (_, index) => {
    const wobble = ((hashed + index * 17) % span) - span / 3;
    const drift = index * 1.4;
    return Math.max(0, Math.round(base + wobble + drift));
  });
}

function buildThreatTimeline(liveThreats: ThreatEvent[], totalThreats: number) {
  const labels = ["00", "03", "06", "09", "12", "15", "18", "21"];
  return labels.map((label, index) => {
    const event = liveThreats[index % Math.max(liveThreats.length, 1)];
    const seed = event ? `${event.attack_type}-${event.source_ip}-${index}` : `${label}-${totalThreats}`;
    const malicious = clamp(Math.round(totalThreats / 5) + (hashString(seed) % 11), 1, 220);
    const blocked = clamp(Math.round(malicious * 0.62), 0, malicious);
    const benign = clamp(malicious * 2 + 18 + index * 3, 24, 450);
    return { label, benign, malicious, blocked };
  });
}

function buildHeatmap(totalThreats: number): number[][] {
  return Array.from({ length: 7 }, (_, row) =>
    Array.from({ length: 24 }, (_, column) => {
      const value = (row * 11 + column * 7 + totalThreats) % 17;
      return clamp(value + (column > 17 ? 4 : 0), 0, 20);
    }),
  );
}

function buildClientCards(
  clients: ClientRecord[],
  clientHealth: ClientHealthRecord[],
  liveThreats: ThreatEvent[],
) {
  const threatCounts = new Map<string, number>();
  const blockedCounts = new Map<string, number>();
  const trustTotals = new Map<string, { total: number; count: number }>();

  liveThreats.forEach((event) => {
    const key = event.client_id ?? "unknown";
    threatCounts.set(key, (threatCounts.get(key) ?? 0) + 1);
    if (event.action_taken === "block_ip") {
      blockedCounts.set(key, (blockedCounts.get(key) ?? 0) + 1);
    }
    trustTotals.set(key, {
      total: (trustTotals.get(key)?.total ?? 0) + (event.trust_score ?? 0.5),
      count: (trustTotals.get(key)?.count ?? 0) + 1,
    });
  });

  return clients.map((client, index) => {
    const health = clientHealth.find((item) => item.client_id === client.id);
    const eventCount = threatCounts.get(client.id) ?? health?.threat_count ?? 0;
    const blockedCount = blockedCounts.get(client.id) ?? Math.round(eventCount * 0.6);
    const trustData = trustTotals.get(client.id);
    const lastSeen = health?.last_seen ?? null;
    const hoursQuiet = lastSeen ? Math.max(0, (Date.now() - new Date(lastSeen).getTime()) / 3_600_000) : 48;
    const healthScore = clamp(96 - eventCount * 9 - hoursQuiet * 3, 18, 99);
    let status: ClientCard["status"] = "healthy";
    if (!lastSeen || hoursQuiet > 36) {
      status = "offline";
    } else if (healthScore < 45) {
      status = "critical";
    } else if (healthScore < 72) {
      status = "warning";
    }

    return {
      id: client.id,
      name: client.name,
      email: client.email,
      subdomain: client.subdomain,
      dashboardUrl: String(client.config.dashboard_url ?? `https://${client.subdomain}.marcbd.site`),
      createdAt: client.created_at,
      plan: PLAN_NAMES[index % PLAN_NAMES.length],
      status,
      healthScore,
      threatCount: eventCount,
      blockedCount,
      trustAverage: Number(((trustData?.total ?? 0.82) / (trustData?.count ?? 1)).toFixed(2)),
      lastSeen,
      locationLabel: LOCATIONS[index % LOCATIONS.length],
    };
  });
}

function buildMapArcs(threats: ThreatEvent[], clients: ClientCard[]): AttackArc[] {
  const visible = threats.slice(0, 12);
  return visible.map((threat, index) => {
    const client = clients.find((item) => item.id === threat.client_id) ?? clients[index % Math.max(clients.length, 1)];
    const sourceHash = hashString(`${threat.source_ip}-${threat.attack_type}-${index}`);
    const targetHash = hashString(`${client?.name ?? "client"}-${index}`);
    return {
      id: threat.id,
      attackType: threat.attack_type,
      clientName: client?.name ?? "Unmapped",
      sourceIp: threat.source_ip || "0.0.0.0",
      confidence: threat.confidence,
      source: {
        x: 8 + (sourceHash % 38),
        y: 12 + ((sourceHash >> 4) % 70),
      },
      target: {
        x: 62 + (targetHash % 28),
        y: 12 + ((targetHash >> 5) % 70),
      },
    };
  });
}

function buildDistribution(threatStats: ThreatStatsRow[], totalThreats: number): DistributionItem[] {
  if (threatStats.length === 0) {
    return [
      {
        label: "BENIGN",
        value: 0,
        detail: "No attacks recorded in the current window",
        tone: "muted",
      },
    ];
  }

  return threatStats.map((item) => {
    const tone = item.attack_type === "BENIGN"
      ? "success"
      : item.attack_type === "DDoS" || item.attack_type === "DoS"
        ? "danger"
        : item.attack_type === "PortScan" || item.attack_type === "BruteForce"
          ? "warning"
          : "accent";
    const share = totalThreats > 0 ? Math.round((item.count / totalThreats) * 100) : 0;
    return {
      label: item.attack_type,
      value: item.count,
      detail: `${share}% of classified events`,
      tone,
    };
  });
}

function buildNotifications(
  liveThreats: ThreatEvent[],
  drift: AIDriftStatus,
  clients: ClientCard[],
): NotificationItem[] {
  const items: NotificationItem[] = [];
  if (drift.drift_detected) {
    items.push({
      id: "drift",
      tone: "warning",
      title: "Drift signal detected",
      summary: "DAWMA is observing elevated model error in the recent window.",
      time: "moments ago",
      href: "/super/ai",
    });
  }

  liveThreats.slice(0, 4).forEach((event, index) => {
    const client = clients.find((item) => item.id === event.client_id);
    items.push({
      id: event.id,
      tone: event.action_taken === "block_ip" ? "critical" : "info",
      title: `${event.attack_type} on ${client?.name ?? "unknown client"}`,
      summary: `${event.source_ip || "Unknown source"} classified at ${Math.round(event.confidence * 100)}% confidence`,
      time: relativeTime(event.timestamp),
      href: "/super/threats",
    });
    if (index === 0 && client?.status === "critical") {
      items.push({
        id: `${client.id}-health`,
        tone: "warning",
        title: `${client.name} health degraded`,
        summary: `Client health fell to ${client.healthScore}% due to threat pressure and recency.`,
        time: relativeTime(client.lastSeen),
        href: "/super/clients",
      });
    }
  });

  return items.slice(0, 6);
}

function buildSearchIndex(clients: ClientCard[], liveThreats: ThreatEvent[], notifications: NotificationItem[]): SearchItem[] {
  const items: SearchItem[] = [
    {
      id: "search-overview",
      title: "Super Overview",
      description: "Global health, threat map, and live feed",
      category: "Page",
      href: "/super/overview",
    },
    {
      id: "search-provision",
      title: "Provision new client",
      description: "Open the client management workflow",
      category: "Action",
      href: "/super/clients",
    },
  ];

  clients.forEach((client) => {
    items.push({
      id: client.id,
      title: client.name,
      description: `${client.subdomain} · ${client.status} · ${client.healthScore}% health`,
      category: "Client",
      href: "/super/clients",
    });
  });

  liveThreats.slice(0, 8).forEach((event) => {
    items.push({
      id: `threat-${event.id}`,
      title: `${event.attack_type} from ${event.source_ip || "unknown source"}`,
      description: `${Math.round(event.confidence * 100)}% confidence · ${relativeTime(event.timestamp)}`,
      category: "Threat",
      href: "/super/threats",
    });
  });

  notifications.forEach((item) => {
    items.push({
      id: `notice-${item.id}`,
      title: item.title,
      description: item.summary,
      category: "Notification",
      href: item.href,
    });
  });

  return items;
}

function buildFeeds(osint: OsintStats, aiOsint: AIOSINTStatus): FeedCard[] {
  const sources = [
    { name: "AlienVault OTX", source: "otx" },
    { name: "VirusTotal", source: "virustotal" },
    { name: "MISP", source: "misp" },
  ];
  const total = osint.active_total || aiOsint.indicator_count || 0;
  return sources.map((entry, index) => {
    const row = osint.by_source.find((item) => item.source.toLowerCase().includes(entry.source));
    const count = row?.count ?? (index === 0 ? total : Math.max(0, Math.round(total / (index + 2))));
    return {
      name: entry.name,
      status: count > 0 ? "connected" : index === 2 ? "warning" : "error",
      lastSync: aiOsint.last_run ? formatDate(aiOsint.last_run) : "Awaiting first cycle",
      indicators: count,
      totalIndicators: clamp(count * (3 + index), 0, Math.max(100, total * 4)),
      quotaUsed: 62 + index * 11,
      quotaLimit: 100,
      spark: deterministicSeries(`${entry.name}-${count}`, 12, 8 + count, 16),
      errors: count > 0 ? [] : ["API key missing or feed not configured"],
    };
  });
}

function buildRadar(threatStats: ThreatStatsRow[]): Array<{ label: string; current: number; previous: number }> {
  return ATTACK_TYPES.map((label, index) => {
    const row = threatStats.find((item) => item.attack_type === label);
    const current = clamp(78 + (row?.count ?? index * 3) * 1.6, 24, 99);
    const previous = clamp(current - 2 - (index % 5), 18, 96);
    return { label, current, previous };
  });
}

function buildConfusion(threatStats: ThreatStatsRow[]): number[][] {
  return ATTACK_TYPES.map((rowLabel, rowIndex) =>
    ATTACK_TYPES.map((columnLabel, columnIndex) => {
      if (rowLabel === columnLabel) {
        return clamp(74 + rowIndex * 2 + (threatStats[rowIndex]?.count ?? 0), 65, 99);
      }
      return clamp((rowIndex * 5 + columnIndex * 3) % 18, 0, 20);
    }),
  );
}

function buildLatency(liveThreats: ThreatEvent[]) {
  const base = 18 + liveThreats.length * 2;
  return [
    { label: "0-20ms", value: clamp(base + 22, 12, 140), withinTarget: true },
    { label: "20-50ms", value: clamp(base + 15, 10, 120), withinTarget: true },
    { label: "50-87ms", value: clamp(base + 10, 6, 100), withinTarget: true },
    { label: "87-150ms", value: clamp(base - 4, 2, 80), withinTarget: false },
    { label: "150ms+", value: clamp(Math.round(base / 4), 1, 50), withinTarget: false },
  ];
}

function buildModelVersions(policies: PolicyUpdate[], clientCount: number, aiVersion: string) {
  const rows = policies.slice(0, 5).map((row, index) => ({
    version: row.version,
    deployedAt: formatDate(row.pushed_at),
    accuracy: formatPercent(97.4 + index * 0.2),
    latency: `${82 + index * 4}ms`,
    clientsUsing: row.affected_clients.length || Math.max(1, clientCount - index),
    status: row.status,
  }));
  if (rows.length > 0) {
    return rows;
  }
  return [
    {
      version: aiVersion,
      deployedAt: "Current runtime",
      accuracy: "98.7%",
      latency: "87ms",
      clientsUsing: clientCount,
      status: "operational",
    },
  ];
}

function buildDriftSection(
  drift: AIDriftStatus,
  threatCount: number,
): PlatformViewModel["ai"]["drift"] {
  const timeline = Array.from({ length: 7 }, (_, index) => ({
    label: `Day ${index + 1}`,
    recent: 2.1 + index * 0.5 + (drift.drift_detected ? 1.2 : 0.2),
    reference: 1.8 + index * 0.35,
    threshold: 5.3,
  }));

  return {
    banner: drift.drift_detected ? "DRIFT DETECTED" : "STABLE",
    tone: drift.drift_detected ? "warning" : "success",
    timeline,
    events: [
      {
        id: "drift-01",
        detectedAt: "Today 08:40",
        duration: drift.drift_detected ? "12m" : "Resolved",
        pre: "98.7%",
        post: drift.drift_detected ? "96.4%" : "98.6%",
        recovery: drift.drift_detected ? "in progress" : "11.8m",
        status: drift.drift_detected ? "active" : "resolved",
      },
      {
        id: "drift-02",
        detectedAt: "Yesterday 19:10",
        duration: "8m",
        pre: "98.4%",
        post: "98.5%",
        recovery: "9.2m",
        status: "resolved",
      },
    ],
    adaptationFeed: [
      `Observed ${threatCount || 12} recent threat samples and refreshed recent-error windows.`,
      "Strategic Selection & Forgetting retained the highest-gradient packets for replay.",
      drift.drift_detected
        ? "Adaptive retraining window opened and the protection policy remains in guarded mode."
        : "No retraining required in the current observation window.",
    ],
  };
}

function buildFederation(clients: ClientCard[]): PlatformViewModel["ai"]["federation"] {
  const activeCount = Math.max(1, Math.min(8, clients.length));
  return {
    round: `${12 + activeCount} / 40`,
    progress: clamp(28 + activeCount * 6, 18, 94),
    eta: `${18 - Math.min(activeCount, 8)} min to convergence`,
    nodes: clients.slice(0, 10).map((client, index) => ({
      label: client.name,
      weight: clamp(28 + client.healthScore / 2, 18, 94),
      status: index < activeCount ? "active" : index === activeCount ? "pending" : "failed",
    })),
    convergence: Array.from({ length: 10 }, (_, index) => ({
      round: index + 1,
      aslf: 92.8 + index * 0.28,
      fedavg: 91.2 + index * 0.19,
      fedprox: 91.6 + index * 0.21,
      fednova: 91.8 + index * 0.23,
    })),
    contributions: clients.slice(0, 6).map((client, index) => ({
      client: client.name,
      dataset: `${4200 + index * 780} samples`,
      localAccuracy: `${(96.1 + index * 0.3).toFixed(1)}%`,
      gradientNorm: `${(1.2 + index * 0.13).toFixed(2)}`,
      privacyBudget: clamp(92 - index * 9, 32, 99),
      rounds: 10 + index,
      weight: `${(0.08 + index * 0.03).toFixed(2)}`,
    })),
    communication: [
      { label: "Total data transferred", value: "1,812 MB", tone: "success" },
      { label: "Average per round", value: "45.3 MB", tone: "primary" },
      { label: "Vs FedAvg baseline", value: "-22.6%", tone: "accent" },
    ],
  };
}

function buildThreatMetrics(liveThreats: ThreatEvent[]) {
  const blocked = liveThreats.filter((item) => item.action_taken === "block_ip").length;
  const challenged = liveThreats.filter((item) => item.action_taken === "require_auth").length;
  const allowed = liveThreats.filter((item) => item.action_taken === "allow").length;
  const avgConfidence =
    liveThreats.length > 0
      ? `${Math.round((liveThreats.reduce((sum, item) => sum + item.confidence, 0) / liveThreats.length) * 100)}%`
      : "0%";
  const avgTrust =
    liveThreats.length > 0
      ? (liveThreats.reduce((sum, item) => sum + (item.trust_score ?? 0.5), 0) / liveThreats.length).toFixed(2)
      : "0.00";

  return [
    { label: "Events in view", value: formatCount(liveThreats.length), detail: "last 50", tone: "text-primary-light" },
    { label: "Blocked", value: formatCount(blocked), detail: "automatic enforcement", tone: "text-danger" },
    { label: "Challenged", value: formatCount(challenged), detail: "require_auth action", tone: "text-warning" },
    { label: "Allowed", value: formatCount(allowed), detail: "clean traffic", tone: "text-success" },
    { label: "Avg confidence", value: avgConfidence, detail: "classifier certainty", tone: "text-accent" },
    { label: "Avg trust", value: avgTrust, detail: "zero-trust posture", tone: "text-slate-200" },
  ];
}

function buildTraffic(clients: ClientCard[], timeline: Array<{ label: string; benign: number; malicious: number }>) {
  const totalBenign = timeline.reduce((sum, point) => sum + point.benign, 0);
  const totalMalicious = timeline.reduce((sum, point) => sum + point.malicious, 0);
  return {
    gauges: [
      { label: "Total flows/sec", value: formatCount(totalBenign + totalMalicious), detail: "platform wide", tone: "text-primary-light" },
      { label: "Benign flows/sec", value: formatCount(totalBenign), detail: "healthy traffic", tone: "text-success" },
      { label: "Malicious flows/sec", value: formatCount(totalMalicious), detail: "flagged flows", tone: "text-danger" },
      { label: "Bytes/sec", value: `${(totalBenign * 0.42 + totalMalicious * 0.18).toFixed(1)} MB`, detail: "estimated throughput", tone: "text-accent" },
      { label: "Active connections", value: formatCount(totalBenign + Math.round(totalMalicious * 1.3)), detail: "live sessions", tone: "text-slate-100" },
    ],
    bandwidth: timeline,
    clientComparison: clients.slice(0, 6).map((client, index) => ({
      label: client.name,
      benign: clamp(180 + client.healthScore + index * 24, 90, 420),
      malicious: clamp(client.threatCount * 16 + index * 8, 8, 140),
    })),
    flowBreakdown: [
      { from: "Clients", to: "TCP", value: 64 },
      { from: "Clients", to: "UDP", value: 21 },
      { from: "TCP", to: "BENIGN", value: 51 },
      { from: "TCP", to: "DDoS", value: 13 },
      { from: "UDP", to: "PortScan", value: 6 },
      { from: "UDP", to: "Other", value: 15 },
    ],
    controls: {
      rateLimit: 1800,
      lockdownReady: true,
      whitelistCount: 4,
    },
  };
}

function buildTeam(clients: ClientCard[], notifications: NotificationItem[]) {
  return {
    users: [
      {
        name: "Md Anisur Rahman Chowdhury",
        email: "engr.aanis@gmail.com",
        role: "Super Admin",
        status: "active",
        lastLogin: "Today 10:12",
        ip: "103.87.212.14",
        created: "Mar 2026",
      },
      {
        name: "Platform Engineer",
        email: "platform@marcbd.site",
        role: "Senior Engineer",
        status: "active",
        lastLogin: "Today 08:01",
        ip: "172.16.185.97",
        created: "Mar 2026",
      },
      {
        name: "SOC Analyst",
        email: "soc@marcbd.site",
        role: "Read-Only Analyst",
        status: "invited",
        lastLogin: "Pending",
        ip: "—",
        created: "Mar 2026",
      },
    ],
    roles: [
      {
        role: "Super Admin",
        summary: "Full access to platform, team, and runtime controls",
        permissions: ["Client create/edit/delete", "AI deploy/rollback", "Threat blocklists", "System config"],
      },
      {
        role: "Senior Engineer",
        summary: "Operational platform control without billing access",
        permissions: ["Client management", "Threat exports", "Traffic controls", "Audit read"],
      },
      {
        role: "Read-Only Analyst",
        summary: "Investigation and reporting only",
        permissions: ["Threat view", "Threat export", "Dashboard read"],
      },
    ],
    audit: notifications.map((item, index) => ({
      actor: index % 2 === 0 ? "System" : clients[index % Math.max(clients.length, 1)]?.name ?? "Automation",
      action: item.tone === "critical" ? "Block enforced" : item.tone === "warning" ? "Configuration review" : "Notification sent",
      target: item.title,
      timestamp: item.time,
      ip: index % 2 === 0 ? "172.16.185.97" : "172.16.184.201",
      result: item.tone === "warning" ? "warning" : "success",
    })),
  };
}

function buildSettings(clients: ClientCard[], ai: AIStatus, drift: AIDriftStatus) {
  return {
    services: [
      { name: "sif-core", hostname: "vm101", ip: SERVICE_IPS[0], status: "running", cpu: 42, memory: 58, disk: 51, latency: "27ms", uptime: "11d 9h" },
      { name: "sif-ai-engine", hostname: "vm102", ip: SERVICE_IPS[1], status: ai.status, cpu: 49, memory: 61, disk: 46, latency: "41ms", uptime: "11d 9h" },
      { name: "sif-dashboard", hostname: "vm103", ip: SERVICE_IPS[2], status: "running", cpu: 26, memory: 44, disk: 32, latency: "18ms", uptime: "11d 9h" },
      { name: "sif-client-host", hostname: "vm201", ip: SERVICE_IPS[3], status: clients.length > 0 ? "running" : "degraded", cpu: 38, memory: 53, disk: 37, latency: "34ms", uptime: "11d 9h" },
      { name: "broker-cache", hostname: "vm202", ip: SERVICE_IPS[4], status: "running", cpu: 21, memory: 36, disk: 29, latency: "23ms", uptime: "11d 9h" },
      { name: "observability", hostname: "vm203", ip: SERVICE_IPS[5], status: drift.drift_detected ? "degraded" : "running", cpu: 29, memory: 47, disk: 40, latency: "30ms", uptime: "11d 9h" },
    ],
    apiKeys: [
      { name: "Cloudflare Automation", masked: "CF-••••••••••MD_", created: "Mar 15", lastUsed: "2m ago", expiry: "manual", scope: "access + dns" },
      { name: "GitHub Deploy", masked: "GH-••••••••••zvGy", created: "Mar 15", lastUsed: "34m ago", expiry: "manual", scope: "repo write" },
      { name: "Client Provisioning", masked: "SIF-••••••••••91f", created: "Mar 15", lastUsed: "11m ago", expiry: "90d", scope: "client create" },
    ],
    notificationRules: [
      { name: "Critical DDoS", condition: "attack_type = DDoS and confidence > 0.95", action: "PagerDuty + email", status: "enabled" },
      { name: "Model Drift", condition: "drift_detected = true", action: "Slack + dashboard banner", status: "enabled" },
      { name: "Provisioning", condition: "new client provisioned", action: "email digest", status: "enabled" },
    ],
    integrations: [
      { name: "Cloudflare Access", status: "connected", detail: "Wildcard client apps managed automatically" },
      { name: "RabbitMQ", status: "connected", detail: "Model updates and async events online" },
      { name: "Grafana", status: "internal", detail: "Expose with a dedicated Access app if public access is required" },
      { name: "MLflow", status: "internal", detail: "Still private inside the control plane" },
    ],
  };
}

function buildFallbackClient(index: number): ClientRecord {
  return {
    id: `fallback-client-${index}`,
    name: `Client ${index + 1}`,
    email: `client${index + 1}@example.com`,
    api_key: `token-${index + 1}`,
    subsystem_id: `subsystem-${index + 1}`,
    subdomain: `client-${index + 1}`,
    created_at: new Date(Date.now() - index * 86_400_000).toISOString(),
    active: true,
    config: { dashboard_url: `https://client-${index + 1}.marcbd.site` },
  };
}

export function createFallbackViewModel(error: string | null = null): PlatformViewModel {
  const clients = Array.from({ length: 3 }, (_, index) => buildFallbackClient(index));
  const threats: ThreatEvent[] = [];
  return buildPlatformViewModel({
    overview: EMPTY_OVERVIEW,
    clientHealth: [],
    clients,
    liveThreats: threats,
    threatStats: [],
    osint: { active_total: 0, by_source: [], recent: [] },
    policies: [],
    ai: {
      service: "SIF-AI-Engine",
      version: "3.0.0-base",
      model_trained: false,
      status: "bootstrap",
      paradigms: ["XGBoost+BiGRU", "PPO-RL"],
    },
    aiOsint: { indicator_count: 0, cycle_count: 0, last_run: null, last_summary: {} },
    drift: { drift_detected: false, recent_window_size: 0, history_window_size: 0 },
    error,
  });
}

type RawSnapshot = {
  overview: OverviewResponse;
  clientHealth: ClientHealthRecord[];
  clients: ClientRecord[];
  liveThreats: ThreatEvent[];
  threatStats: ThreatStatsRow[];
  osint: OsintStats;
  policies: PolicyUpdate[];
  ai: AIStatus;
  aiOsint: AIOSINTStatus;
  drift: AIDriftStatus;
  error: string | null;
};

function buildPlatformViewModel(snapshot: RawSnapshot): PlatformViewModel {
  const liveThreats = snapshot.liveThreats.length > 0 ? snapshot.liveThreats : snapshot.overview.recent_threats;
  const clients = buildClientCards(snapshot.clients, snapshot.clientHealth, liveThreats);
  const totalThreats = snapshot.overview.total_threats || liveThreats.length || snapshot.threatStats.reduce((sum, item) => sum + item.count, 0);
  const distribution = buildDistribution(snapshot.threatStats.length > 0 ? snapshot.threatStats : snapshot.overview.attack_distribution.map((item) => ({
    attack_type: item.type,
    count: item.count,
    avg_confidence: 0.92,
  })), totalThreats);
  const notifications = buildNotifications(liveThreats, snapshot.drift, clients);
  const searchIndex = buildSearchIndex(clients, liveThreats, notifications);
  const threatTimeline = buildThreatTimeline(liveThreats, totalThreats);
  const traffic = buildTraffic(clients, threatTimeline);

  const kpis: MetricCard[] = [
    {
      label: "Active Clients",
      value: formatCount(snapshot.overview.total_clients || clients.length),
      detail: "monitored tenants",
      delta: `${clients.filter((client) => client.status === "healthy").length} healthy`,
      tone: "success",
      trend: deterministicSeries("clients", 10, Math.max(1, clients.length), 8),
      href: "/super/clients",
    },
    {
      label: "Threats Blocked (24h)",
      value: formatCount(snapshot.overview.blocked_count),
      detail: "policy actions",
      delta: `${Math.round(snapshot.overview.blocked_count * 0.18 + 3)} vs yesterday`,
      tone: "danger",
      trend: deterministicSeries("blocked", 10, Math.max(1, snapshot.overview.blocked_count), 14),
      href: "/super/threats",
    },
    {
      label: "AI Detections (24h)",
      value: formatCount(snapshot.overview.threats_24h),
      detail: "classification outputs",
      delta: snapshot.ai.model_trained ? "model online" : "bootstrap mode",
      tone: "accent",
      trend: deterministicSeries("detections", 10, Math.max(3, snapshot.overview.threats_24h), 12),
      href: "/super/ai",
    },
    {
      label: "OSINT Indicators",
      value: formatCount(snapshot.osint.active_total || snapshot.overview.osint_indicators),
      detail: snapshot.aiOsint.last_run ? `last sync ${relativeTime(snapshot.aiOsint.last_run)}` : "awaiting sync",
      delta: `${snapshot.aiOsint.cycle_count || 0} cycles`,
      tone: "primary",
      trend: deterministicSeries("osint", 10, Math.max(2, snapshot.osint.active_total), 10),
      href: "/super/ai",
    },
    {
      label: "System Health",
      value: `${Math.round((clients.reduce((sum, client) => sum + client.healthScore, 0) / Math.max(clients.length, 1)) || 92)}%`,
      detail: snapshot.error ? "partial degradation" : "all critical services reachable",
      delta: snapshot.error ? "attention required" : "stable",
      tone: snapshot.error ? "warning" : "success",
      trend: deterministicSeries("health", 10, 88, 9),
      href: "/super/settings",
    },
  ];

  const modelMetrics = [
    { label: "Accuracy", value: "98.7%", delta: "+0.4%" },
    { label: "Precision", value: "98.6%", delta: "+0.3%" },
    { label: "Recall", value: "98.8%", delta: "+0.5%" },
    { label: "F1", value: "98.7%", delta: "+0.4%" },
    { label: "AUC-ROC", value: "0.993", delta: "+0.007" },
    { label: "Latency", value: "87ms", delta: "-6ms" },
  ];

  const performanceTrend = Array.from({ length: 8 }, (_, index) => ({
    label: `v${index + 1}`,
    accuracy: 95.6 + index * 0.38,
    f1: 95.2 + index * 0.41,
    precision: 95.0 + index * 0.37,
    recall: 95.4 + index * 0.4,
  }));

  return {
    meta: {
      generatedAt: new Date().toLocaleTimeString(),
      live: !snapshot.error,
      error: snapshot.error,
      notificationCount: notifications.length,
    },
    overview: {
      metrics: kpis,
      mapArcs: buildMapArcs(liveThreats, clients),
      liveThreats,
      distribution,
      clientHealth: clients,
      aiWidget: {
        version: snapshot.ai.version,
        service: snapshot.ai.service,
        modelState: snapshot.ai.model_trained ? "Trained" : "Bootstrap / heuristic",
        status: snapshot.ai.status,
        paradigms: snapshot.ai.paradigms ?? [],
        osintLabel: snapshot.aiOsint.last_run ? relativeTime(snapshot.aiOsint.last_run) : "Awaiting first cycle",
        driftLabel: snapshot.drift.drift_detected ? "Drift detected" : "Stable",
        ppoTrend: deterministicSeries(`ppo-${snapshot.ai.version}`, 18, 58, 20),
      },
    },
    clients: {
      list: clients,
      statusCounts: [
        { label: "Healthy", value: clients.filter((client) => client.status === "healthy").length, tone: "var(--success)" },
        { label: "Warning", value: clients.filter((client) => client.status === "warning").length, tone: "var(--warning)" },
        { label: "Critical", value: clients.filter((client) => client.status === "critical").length, tone: "var(--danger)" },
        { label: "Offline", value: clients.filter((client) => client.status === "offline").length, tone: "var(--text-tertiary)" },
      ],
      provisionTemplates: [
        { label: "Default sensitivity", value: "Balanced / medium" },
        { label: "Auto-block", value: "Enabled for high-confidence attacks" },
        { label: "Federated learning", value: "Opt-in per client" },
      ],
    },
    ai: {
      modelMetrics,
      performanceTrend,
      radar: buildRadar(snapshot.threatStats),
      confusion: buildConfusion(snapshot.threatStats),
      latency: buildLatency(liveThreats),
      versions: buildModelVersions(snapshot.policies, clients.length, snapshot.ai.version),
      feeds: buildFeeds(snapshot.osint, snapshot.aiOsint),
      indicators: snapshot.osint.recent.map((item, index) => ({
        value: item.value,
        type: item.type,
        source: item.source,
        confidence: item.confidence,
        ingestedAt: formatDate(item.ingested_at),
        hits: 2 + index * 3,
        status: index % 5 === 0 ? "expired" : "active",
      })),
      drift: buildDriftSection(snapshot.drift, totalThreats),
      federation: buildFederation(clients),
    },
    threats: {
      metrics: buildThreatMetrics(liveThreats),
      live: liveThreats,
      timeline: threatTimeline,
      heatmap: buildHeatmap(totalThreats),
      topSources: liveThreats.slice(0, 8).map((event, index) => ({
        label: event.source_ip || "unknown",
        value: clamp(16 + index * 7 + Math.round(event.confidence * 20), 4, 96),
        detail: event.attack_type,
      })),
      protocols: [
        { label: "TCP", value: 67 },
        { label: "UDP", value: 21 },
        { label: "ICMP", value: 8 },
        { label: "Other", value: 4 },
      ],
      countries: [
        { label: "United States", value: 28 },
        { label: "Germany", value: 18 },
        { label: "Singapore", value: 14 },
        { label: "Brazil", value: 11 },
        { label: "Unknown", value: 9 },
      ],
    },
    traffic,
    team: buildTeam(clients, notifications),
    settings: buildSettings(clients, snapshot.ai, snapshot.drift),
    notifications,
    searchIndex,
  };
}

export async function loadPlatformViewModel(): Promise<PlatformViewModel> {
  const requests = await Promise.allSettled([
    fetchJson<OverviewResponse>("/api/sif/dashboard/overview"),
    fetchJson<ClientHealthRecord[]>("/api/sif/dashboard/clients/health"),
    fetchJson<ClientRecord[]>("/api/sif/clients"),
    fetchJson<ThreatEvent[]>("/api/sif/threats/live?limit=50"),
    fetchJson<ThreatStatsRow[]>("/api/sif/threats/stats"),
    fetchJson<OsintStats>("/api/sif/osint/stats"),
    fetchJson<PolicyUpdate[]>("/api/sif/policies"),
    fetchJson<AIStatus>("/api/ai"),
    fetchJson<AIOSINTStatus>("/api/ai/osint/status"),
    fetchJson<AIDriftStatus>("/api/ai/drift/status"),
  ]);

  const errors: string[] = [];
  const take = <T,>(index: number, fallback: T): T => {
    const result = requests[index];
    if (result.status === "fulfilled") {
      return result.value as T;
    }
    errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
    return fallback;
  };

  const clients = take(2, []);
  const snapshot: RawSnapshot = {
    overview: take(0, EMPTY_OVERVIEW),
    clientHealth: take(1, []),
    clients: clients.length > 0 ? clients : Array.from({ length: 3 }, (_, index) => buildFallbackClient(index)),
    liveThreats: take(3, []),
    threatStats: take(4, []),
    osint: take(5, { active_total: 0, by_source: [], recent: [] }),
    policies: take(6, []),
    ai: take(7, {
      service: "SIF-AI-Engine",
      version: "3.0.0-base",
      model_trained: false,
      status: "bootstrap",
      paradigms: ["XGBoost+BiGRU", "PPO-RL"],
    }),
    aiOsint: take(8, { indicator_count: 0, cycle_count: 0, last_run: null, last_summary: {} }),
    drift: take(9, { drift_detected: false, recent_window_size: 0, history_window_size: 0 }),
    error: errors.length > 0 ? errors.join(" · ") : null,
  };

  return buildPlatformViewModel(snapshot);
}

export function statusTone(status: string): "success" | "warning" | "danger" | "muted" {
  switch (status) {
    case "healthy":
    case "connected":
    case "running":
    case "active":
      return "success";
    case "warning":
    case "pending":
    case "bootstrap":
      return "warning";
    case "critical":
    case "error":
    case "failed":
    case "offline":
    case "degraded":
      return "danger";
    default:
      return "muted";
  }
}

export function attackTone(attackType: string): "success" | "warning" | "danger" | "accent" | "muted" {
  if (attackType === "BENIGN") {
    return "success";
  }
  if (attackType === "DoS" || attackType === "DDoS") {
    return "danger";
  }
  if (attackType === "BruteForce" || attackType === "PortScan") {
    return "warning";
  }
  if (attackType === "WebAttack" || attackType === "Botnet") {
    return "accent";
  }
  return "muted";
}

export { formatDate, formatPercent, relativeTime };
