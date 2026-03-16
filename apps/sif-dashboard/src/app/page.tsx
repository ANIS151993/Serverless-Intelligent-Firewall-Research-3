"use client";

import { useEffect, useState } from "react";

type ThreatEvent = {
  id: string;
  timestamp: string;
  attack_type: string;
  source_ip: string;
  confidence: number;
  action_taken: string;
  client_id?: string | null;
  model_version?: string | null;
};

type Overview = {
  total_clients: number;
  total_threats: number;
  threats_24h: number;
  blocked_count: number;
  osint_indicators: number;
  recent_threats: ThreatEvent[];
  attack_distribution: Array<{ type: string; count: number }>;
};

type AIStatus = {
  service: string;
  version: string;
  model_trained: boolean;
  status: string;
};

const ATTACK_COLORS: Record<string, string> = {
  BENIGN: "text-emerald-300",
  DoS: "text-red-300",
  DDoS: "text-red-400",
  BruteForce: "text-orange-300",
  PortScan: "text-amber-300",
  WebAttack: "text-fuchsia-300",
  Botnet: "text-pink-300",
  Other: "text-slate-300"
};

const ACTION_STYLES: Record<string, string> = {
  block_ip: "bg-red-950/60 text-red-200 border border-red-700/60",
  require_auth: "bg-amber-950/60 text-amber-200 border border-amber-700/60",
  allow: "bg-emerald-950/60 text-emerald-200 border border-emerald-700/60"
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export default function Dashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [overviewData, aiData] = await Promise.all([
          fetchJson<Overview>("/api/sif/dashboard/overview"),
          fetchJson<AIStatus>("/api/ai")
        ]);
        if (!active) {
          return;
        }
        setOverview(overviewData);
        setAiStatus(aiData);
        setUpdatedAt(new Date().toLocaleTimeString());
        setError("");
      } catch (err) {
        if (!active) {
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        setError(`Cannot reach SIF API: ${message}`);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();
    const interval = window.setInterval(load, 10000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const statCards = [
    {
      label: "Active Clients",
      value: overview?.total_clients ?? "—",
      tone: "text-cyan-200"
    },
    {
      label: "Total Threats",
      value: overview?.total_threats ?? "—",
      tone: "text-rose-200"
    },
    {
      label: "Blocked",
      value: overview?.blocked_count ?? "—",
      tone: "text-orange-200"
    },
    {
      label: "OSINT Indicators",
      value: overview?.osint_indicators ?? "—",
      tone: "text-emerald-200"
    },
    {
      label: "Model Version",
      value: aiStatus?.version ?? "—",
      tone: "text-sky-200"
    }
  ];

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="glass rounded-[28px] p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.28em] text-cyan-100">
              ASLF-OSINT Platform
            </div>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Super Control Dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Autonomous serverless firewall orchestration across the super control
              plane, client runtime host, AI engine, and observability stack.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start rounded-full border border-white/10 bg-slate-950/40 px-4 py-2 text-sm text-slate-300">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                error ? "bg-red-400" : "bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.85)]"
              }`}
            />
            <span>{error ? "Offline" : "Live"}</span>
            <span className="text-slate-500">·</span>
            <span>{updatedAt ? `Updated ${updatedAt}` : "Awaiting first poll"}</span>
          </div>
        </div>
      </section>

      {error ? (
        <section className="mt-6 rounded-[24px] border border-red-800/60 bg-red-950/40 p-5 text-sm text-red-100">
          <p className="font-semibold">Cannot reach SIF API</p>
          <p className="mt-2 text-red-100/80">{error}</p>
        </section>
      ) : null}

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="glass rounded-[22px] p-5 animate-pulse"
              >
                <div className="h-3 w-28 rounded bg-slate-700/70" />
                <div className="mt-4 h-10 w-20 rounded bg-slate-700/70" />
              </div>
            ))
          : statCards.map((card) => (
              <div key={card.label} className="glass rounded-[22px] p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                  {card.label}
                </p>
                <p className={`mt-4 text-3xl font-semibold ${card.tone}`}>
                  {card.value}
                </p>
              </div>
            ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="glass rounded-[26px] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-white">Live Threat Feed</h2>
              <p className="mt-1 text-sm text-slate-400">
                Polling every 10 seconds from the super control plane.
              </p>
            </div>
            <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-cyan-100">
              realtime
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
                  <th className="pb-3">Time</th>
                  <th className="pb-3">Attack Type</th>
                  <th className="pb-3">Source IP</th>
                  <th className="pb-3">Confidence</th>
                  <th className="pb-3">Action</th>
                  <th className="pb-3">Client</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.recent_threats ?? []).length > 0 ? (
                  overview?.recent_threats.map((event) => (
                    <tr key={event.id} className="border-t border-slate-800/40">
                      <td className="border-t border-slate-800/40 py-3 pr-4 font-mono text-xs text-slate-400">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td
                        className={`border-t border-slate-800/40 py-3 pr-4 text-sm font-semibold ${
                          ATTACK_COLORS[event.attack_type] ?? "text-slate-200"
                        }`}
                      >
                        {event.attack_type}
                      </td>
                      <td className="border-t border-slate-800/40 py-3 pr-4 font-mono text-xs text-slate-300">
                        {event.source_ip || "—"}
                      </td>
                      <td className="border-t border-slate-800/40 py-3 pr-4 text-slate-300">
                        {event.confidence ? `${(event.confidence * 100).toFixed(1)}%` : "—"}
                      </td>
                      <td className="border-t border-slate-800/40 py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            ACTION_STYLES[event.action_taken] ?? ACTION_STYLES.allow
                          }`}
                        >
                          {event.action_taken}
                        </span>
                      </td>
                      <td className="border-t border-slate-800/40 py-3 font-mono text-xs text-slate-400">
                        {event.client_id ? `${event.client_id.slice(0, 8)}…` : "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-500">
                      No threat events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="glass rounded-[26px] p-6">
            <h2 className="text-xl font-semibold text-white">AI Engine Status</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Service</span>
                <span className="font-medium text-white">{aiStatus?.service ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Version</span>
                <span className="font-mono text-cyan-100">{aiStatus?.version ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Model State</span>
                <span className={aiStatus?.model_trained ? "text-emerald-200" : "text-amber-200"}>
                  {aiStatus?.model_trained ? "Trained" : "Bootstrap / heuristic"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Status</span>
                <span className="text-emerald-200">{aiStatus?.status ?? "unknown"}</span>
              </div>
            </div>
          </div>

          <div className="glass rounded-[26px] p-6">
            <h2 className="text-xl font-semibold text-white">Attack Distribution</h2>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(overview?.attack_distribution ?? []).length > 0 ? (
                overview?.attack_distribution.map((item) => (
                  <div
                    key={item.type}
                    className="rounded-2xl border border-white/5 bg-slate-950/50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${ATTACK_COLORS[item.type] ?? "text-slate-100"}`}>
                        {item.type}
                      </span>
                      <span className="text-lg font-semibold text-white">{item.count}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500">No attacks recorded in the last 24 hours.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Core API Docs",
            note: "Private VM endpoint. Expose with a dedicated Cloudflare Access app before using online."
          },
          {
            label: "AI Engine Docs",
            note: "Private VM endpoint. Expose with a dedicated Cloudflare Access app before using online."
          },
          {
            label: "Grafana",
            note: "Private observability UI. Publish separately if you want browser access from the internet."
          },
          {
            label: "RabbitMQ Mgmt",
            note: "Private broker UI. Keep internal unless you intentionally publish it with strict Access rules."
          }
        ].map((link) => (
          <div
            key={link.label}
            className="glass rounded-[22px] border-white/5 px-5 py-4 text-sm text-slate-200"
          >
            <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Quick Link</div>
            <div className="mt-3 flex items-start justify-between gap-3">
              <span>{link.label}</span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-amber-200">
                Internal
              </span>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-400">{link.note}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
