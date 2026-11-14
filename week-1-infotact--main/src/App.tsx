/**
 * AetherHound - Tactical Air-Gapped RF & Acoustic Covert Channel Detector
 * Week 1 Operational Terminal, Diagnostics Console & Evidence Verification Ledger
 */

import React, { useState, useEffect } from "react";
import {
  Radio,
  Mic,
  Activity,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  Play,
  Pause,
  RotateCcw,
  Square,
  ShieldAlert,
  Cpu,
  Layers,
  BarChart3,
  Flame,
  ShieldCheck,
  Hash,
  Database,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  FileText,
  Clock,
  AlertOctagon,
} from "lucide-react";

interface EventItem {
  timestamp: string;
  sensor: string;
  event: string;
  evidence: string;
  level: "info" | "warning" | "alert";
}

interface PlotAuditRecord {
  capture_id: string;
  modality: "RF" | "ACOUSTIC" | "FAN_SIMULATION" | "ORPHAN_PLOT" | string;
  plot_name: string;
  plot_path: string;
  metadata_found: boolean;
  metadata_valid: boolean;
  metadata_path?: string | null;
  source_type: "LIVE_HARDWARE" | "SYNTHETIC_SIMULATION" | "RECORDED_HARDWARE" | "INVALID" | string;
  source_mode: "LIVE HARDWARE" | "SYNTHETIC SIMULATION" | "RECORDED HARDWARE" | "INVALID" | string;
  sensor_id: string;
  acquisition_mode: string;
  capture_timestamp_iso: string;
  sample_rate_hz: number;
  sample_count_recorded: number;
  raw_data_path: string;
  raw_data_exists: boolean;
  raw_data_type: string;
  hash_verified: boolean;
  recorded_sha256: string;
  computed_sha256: string;
  samples_verified: boolean;
  actual_samples: number;
  timestamp_verified: boolean;
  validation_status: "VERIFIED" | "PARTIALLY VERIFIED" | "INVALID" | "NOT VALIDATED" | string;
  hardware_provenance_note: string;
  failure_reasons: string[];
  warnings: string[];
  audit_status?: string;
}

interface AuditSummary {
  audit_timestamp_iso: string;
  audit_timestamp_epoch: number;
  overall_result: "VERIFIED" | "PARTIALLY VERIFIED" | "INVALID" | string;
  audit_passed: boolean;
  total_records_audited: number;
  total_plots_audited: number;
  total_passed: number;
  verified_count: number;
  partially_verified_count: number;
  failed_or_orphaned_count: number;
  hardware_derived_count: number;
  synthetic_simulation_count: number;
  recorded_hardware_count: number;
  provenance_disclaimer?: string;
  plots: PlotAuditRecord[];
}

function toPublicPlotUrl(plotPath: string | undefined, fallbackRel: string, cacheKey: number): string {
  if (!plotPath) return `/${fallbackRel}?v=${cacheKey}`;
  const normalized = plotPath.replace(/\\/g, "/");
  const idx = normalized.indexOf("data/plots/");
  const rel = idx >= 0 ? normalized.slice(idx) : fallbackRel;
  return `/${rel}?v=${cacheKey}`;
}

function getSourceBadgeClass(sourceMode: string | undefined): string {
  if (sourceMode === "LIVE HARDWARE") {
    return "bg-emerald-950 text-emerald-300 border border-emerald-700";
  }
  if (sourceMode === "RECORDED HARDWARE") {
    return "bg-amber-950 text-amber-300 border border-amber-700";
  }
  if (sourceMode === "SYNTHETIC SIMULATION") {
    return "bg-cyan-950 text-cyan-300 border border-cyan-800/80";
  }
  if (sourceMode === "INVALID") {
    return "bg-rose-950 text-rose-300 border border-rose-700";
  }
  return "bg-slate-800 text-slate-300 border border-slate-700";
}

function getValidationBadgeClass(status: string | undefined): string {
  if (status === "VERIFIED") {
    return "bg-emerald-950 text-emerald-300 border border-emerald-700";
  }
  if (status === "PARTIALLY VERIFIED") {
    return "bg-amber-950 text-amber-300 border border-amber-700";
  }
  if (status === "INVALID") {
    return "bg-rose-950 text-rose-300 border border-rose-700";
  }
  return "bg-slate-800 text-slate-300 border border-slate-700";
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"terminal" | "telemetry" | "evidence" | "events" | "docs">("terminal");
  const [isMonitoring, setIsMonitoring] = useState<boolean>(true);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [selectedEventLog, setSelectedEventLog] = useState<"rf" | "acoustic" | "morse" | "system">("rf");
  const [simUptime, setSimUptime] = useState<number>(42);
  const [auditReport, setAuditReport] = useState<AuditSummary | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [auditRefreshCount, setAuditRefreshCount] = useState<number>(() => Date.now());
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [evidenceFilter, setEvidenceFilter] = useState<"all" | "rf" | "acoustic" | "rpm">("all");
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const loadAuditReport = () => {
    const bust = Date.now();
    setAuditRefreshCount(bust);
    setBrokenImages({});
    fetch(`/data/evidence_audit_report.json?v=${bust}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Audit report HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: AuditSummary) => {
        if (data && Array.isArray(data.plots)) {
          setAuditReport(data);
          setAuditError(null);
        } else {
          setAuditReport(null);
          setAuditError("Malformed evidence audit report schema.");
        }
      })
      .catch(() => {
        setAuditReport(null);
        setAuditError("No validation report found. Run aetherhound/scripts/verify_evidence.py to validate disk artifacts.");
      });
  };

  useEffect(() => {
    loadAuditReport();
  }, []);

  const overallAuditStatus = auditReport?.overall_result ?? "NOT VALIDATED";
  const rfRecord = auditReport?.plots.find((p) => p.modality === "RF") ?? null;
  const acousticRecord = auditReport?.plots.find((p) => p.modality === "ACOUSTIC") ?? null;
  const fanRecord = auditReport?.plots.find((p) => p.modality === "FAN_SIMULATION") ?? null;

  // Uptime ticker
  useEffect(() => {
    const timer = setInterval(() => {
      if (isMonitoring && !isPaused) {
        setSimUptime((prev) => prev + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isMonitoring, isPaused]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Recent operational events list
  const recentEvents: EventItem[] = [
    {
      timestamp: "07:41:25",
      sensor: "SDR-01",
      event: "Unusual RF Spectral Activity",
      evidence: "Peak -2.5 dBFS at 434.070 MHz (+55.4 dB over -57.9 dBFS floor)",
      level: "alert",
    },
    {
      timestamp: "07:38:56",
      sensor: "MIC-01",
      event: "Covert Acoustic Morse Channel Detected",
      evidence: "Target SOS (... --- ...), Confidence 89.0%, Causal Timing Match",
      level: "alert",
    },
    {
      timestamp: "07:38:52",
      sensor: "MIC-01",
      event: "Structured Acoustic Repetitive Pulses",
      evidence: "Freq 1820.5 Hz, 9 Pulses in 6.2s, Energy Ratio 3.2x baseline",
      level: "warning",
    },
    {
      timestamp: "07:35:50",
      sensor: "SYSTEM",
      event: "EngineStarted",
      evidence: "Dual-channel RF & Acoustic SIGINT monitoring pipelines active",
      level: "info",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-mono text-sm antialiased selection:bg-cyan-500 selection:text-black">
      {/* Top Banner */}
      <header className="border-b border-slate-800 bg-slate-900/80 px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950/80 border border-cyan-500/40 rounded text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-wider text-base text-cyan-400">AETHERHOUND</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">WEEK 1 ACTIVE</span>
              <span className="text-xs px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-semibold">
                SIGINT / HARDWARE SECURITY
              </span>
            </div>
            <p className="text-xs text-slate-400">Air-Gapped RF & Acoustic Covert Channel Detector</p>
          </div>
        </div>

        {/* Global Controls & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded border border-slate-800 text-xs">
            <span className="text-slate-400">Status:</span>
            {isPaused ? (
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span> PAUSED
              </span>
            ) : isMonitoring ? (
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> LIVE MONITORING
              </span>
            ) : (
              <span className="text-rose-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> STOPPED
              </span>
            )}
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Uptime:</span>
            <span className="text-cyan-400 font-medium">{simUptime}s</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded border border-slate-800">
            <button
              onClick={() => {
                setIsMonitoring(true);
                setIsPaused(false);
              }}
              title="Start / Resume Monitoring [S / R]"
              className={`p-1.5 rounded transition ${
                isMonitoring && !isPaused ? "bg-cyan-600 text-white" : "hover:bg-slate-800 text-slate-400"
              }`}
            >
              <Play className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              title="Pause Monitoring [P]"
              className={`p-1.5 rounded transition ${isPaused ? "bg-amber-600 text-white" : "hover:bg-slate-800 text-slate-400"}`}
            >
              <Pause className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsMonitoring(false);
                setIsPaused(false);
              }}
              title="Stop Monitoring [X]"
              className={`p-1.5 rounded transition ${
                !isMonitoring ? "bg-rose-600 text-white" : "hover:bg-slate-800 text-slate-400"
              }`}
            >
              <Square className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex border-b border-slate-800 bg-slate-900/40 px-4 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("terminal")}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "terminal"
              ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Terminal Live Monitor
        </button>

        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "telemetry"
              ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Sensors & DSP Telemetry
        </button>

        <button
          onClick={() => setActiveTab("evidence")}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "evidence"
              ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          Signal Plots & Provenance Evidence
          {overallAuditStatus === "VERIFIED" && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 ml-1" title="Verified"></span>
          )}
          {overallAuditStatus === "PARTIALLY VERIFIED" && (
            <span className="w-2 h-2 rounded-full bg-amber-400 ml-1" title="Partially Verified"></span>
          )}
          {overallAuditStatus === "INVALID" && (
            <span className="w-2 h-2 rounded-full bg-rose-400 ml-1" title="Invalid"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("events")}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "events"
              ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          JSONL Threat Events
        </button>

        <button
          onClick={() => setActiveTab("docs")}
          className={`flex items-center gap-2 px-3 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition ${
            activeTab === "docs"
              ? "border-cyan-400 text-cyan-400 bg-cyan-950/20"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileCode2 className="w-3.5 h-3.5" />
          CLI Commands & Verification Script
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-4 overflow-y-auto">
        {/* TAB 1: TERMINAL MONITOR (Rich ANSI Mirror) */}
        {activeTab === "terminal" && (
          <div className="space-y-4 max-w-6xl mx-auto">
            <div className="bg-black border border-slate-800 rounded-lg shadow-2xl overflow-hidden font-mono text-xs">
              <div className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                  </div>
                  <span className="text-slate-300 font-semibold text-[11px] ml-2">aetherhound@rpi:~/aetherhound $ python3 -m aetherhound.interface.live_monitor</span>
                </div>
                <span className="text-[10px] text-slate-500">TTY / 80x24 ANSI Rich Renderer</span>
              </div>

              <div className="p-4 bg-slate-950 text-slate-200 space-y-4">
                <div className="border border-cyan-800/60 bg-cyan-950/20 p-2.5 rounded text-center">
                  <span className="text-cyan-400 font-bold tracking-wider">AETHERHOUND</span> –{" "}
                  <span className="text-white font-semibold">AIR-GAPPED RF & ACOUSTIC MONITORING</span>
                  {isPaused && <span className="ml-2 text-rose-400 font-bold">[PAUSED]</span>}
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mode: Dual-Channel Real-Time SIGINT | Latency: 2.8 ms | Update: 250 ms | Evidence Audit: {overallAuditStatus}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* RF MONITORING PANEL */}
                  <div className="border border-cyan-900/60 bg-slate-900/60 rounded p-3 space-y-2">
                    <div className="text-cyan-400 font-bold pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>RF SENSOR (SDR-01)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">RTL2832U</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="text-emerald-400 font-medium">STREAMING (Active)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Center Frequency:</span>
                        <span className="text-slate-100 font-bold">433.920 MHz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sample Rate:</span>
                        <span className="text-slate-300">2.048 Msps</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Noise Floor (MAD):</span>
                        <span className="text-amber-400">-57.9 dBFS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Peak Signal Level:</span>
                        <span className="text-rose-400 font-bold">-2.5 dBFS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Peak Freq:</span>
                        <span className="text-cyan-300">434.070 MHz (+150 kHz)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Deviation:</span>
                        <span className="text-rose-400 font-bold">+55.4 dB (11.3 σ)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DSP Latency:</span>
                        <span className="text-slate-400">2.8 ms</span>
                      </div>
                    </div>
                  </div>

                  {/* ACOUSTIC MONITORING PANEL */}
                  <div className="border border-emerald-900/60 bg-slate-900/60 rounded p-3 space-y-2">
                    <div className="text-emerald-400 font-bold pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>ACOUSTIC (MIC-01)</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">PyAudio Stream</span>
                    </div>
                    <div className="space-y-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className="text-emerald-400 font-medium">STREAMING (Active)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Sample Rate:</span>
                        <span className="text-slate-100 font-bold">44,100 Hz</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Chunk Size:</span>
                        <span className="text-slate-300">2,048 frames (46.4ms)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">RMS Energy:</span>
                        <span className="text-cyan-300 font-bold">0.14820</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dominant Frequency:</span>
                        <span className="text-slate-100">1,820.5 Hz (Fan BPF)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Detected Pulse Count:</span>
                        <span className="text-amber-400 font-bold">9 transitions</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Periodicity Score:</span>
                        <span className="text-emerald-300">0.82 (Repetitive)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">DSP Latency:</span>
                        <span className="text-slate-400">1.4 ms</span>
                      </div>
                    </div>
                  </div>

                  {/* DETECTION STATUS PANEL */}
                  <div className="border border-purple-900/60 bg-slate-900/60 rounded p-3 space-y-2">
                    <div className="text-purple-400 font-bold pb-1 border-b border-slate-800 flex items-center justify-between">
                      <span>DETECTION ENGINES</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">Causal + Timing</span>
                    </div>
                    <div className="space-y-2 text-[11px]">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">RF Spectrum:</span>
                        <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/80">
                          SUSPICIOUS ACTIVITY
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Acoustic Burst:</span>
                        <span className="text-amber-400 font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/80">
                          SUSPICIOUS ACTIVITY
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Morse Decoder:</span>
                        <span className="text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-950 border border-rose-700 animate-pulse">
                          PATTERN DETECTED (SOS)!
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950/80 rounded border border-slate-800 mt-2">
                        <div className="text-[10px] text-slate-400">Target Signature Decoded:</div>
                        <div className="text-cyan-300 font-bold text-xs tracking-widest mt-0.5">... --- ... (S O S)</div>
                        <div className="text-[10px] text-emerald-400 mt-0.5">Confidence: 89.0% | Match: Dual Schmitt Causal Envelope</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Events Table */}
                <div className="border border-slate-800 bg-slate-900/40 rounded p-3">
                  <div className="text-slate-300 font-bold pb-1.5 border-b border-slate-800 text-[11px] flex justify-between">
                    <span>RECENT REAL-TIME THREAT TELEMETRY</span>
                    <span className="text-slate-500 text-[10px]">data/events/*.jsonl</span>
                  </div>
                  <div className="divide-y divide-slate-800/60 mt-2 font-mono text-[11px]">
                    {recentEvents.map((ev, idx) => (
                      <div key={idx} className="py-1.5 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-cyan-400 font-semibold">{ev.timestamp}</span>
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">{ev.sensor}</span>
                          <span className={ev.level === "alert" ? "text-rose-400 font-bold" : ev.level === "warning" ? "text-amber-400 font-semibold" : "text-slate-300"}>
                            {ev.event}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[10px] truncate max-w-md">{ev.evidence}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Keyboard Controls Bar */}
                <div className="p-2 bg-slate-900/80 border border-slate-800 rounded text-center text-[11px] text-slate-400 flex flex-wrap justify-center gap-4">
                  <span>
                    <strong className="text-cyan-400">S</strong> = Start
                  </span>
                  <span>
                    <strong className="text-amber-400">P</strong> = Pause
                  </span>
                  <span>
                    <strong className="text-emerald-400">R</strong> = Resume
                  </span>
                  <span>
                    <strong className="text-rose-400">X</strong> = Stop
                  </span>
                  <span>
                    <strong className="text-purple-400">Q</strong> = Quit
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SENSORS & DSP TELEMETRY */}
        {activeTab === "telemetry" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Radio className="w-4 h-4" />
                  RTL-SDR RF Hardware Configuration
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Tuner Architecture:</span>
                    <span className="text-slate-200">RTL2832U / R820T2 Direct IQ Sampling</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Hardware Tuning Range:</span>
                    <span className="text-slate-200">24.0 MHz – 1,766.0 MHz</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Target Center Freq:</span>
                    <span className="text-cyan-400 font-bold">433,920,000 Hz (433.92 MHz ISM)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Sample Rate:</span>
                    <span className="text-slate-200">2,048,000 samples/sec (2.048 Msps)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">FFT Window:</span>
                    <span className="text-slate-200">2,048 bins (Hann Windowed, 1 kHz resolution)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Noise Floor Estimation:</span>
                    <span className="text-amber-400 font-semibold">Median Absolute Deviation (MAD: 4.5 σ)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Thread Buffer:</span>
                    <span className="text-emerald-400">Non-blocking Threaded Ring Queue (Depth 32)</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Mic className="w-4 h-4" />
                  Acoustic Microphone Hardware Configuration
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Subsystem:</span>
                    <span className="text-slate-200">PyAudio Non-blocking Callback Stream</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Sampling Rate:</span>
                    <span className="text-emerald-400 font-bold">44,100 Hz (CD Audio Standard)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Channels:</span>
                    <span className="text-slate-200">1 (Mono covert acoustic channel)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Frames Per Buffer:</span>
                    <span className="text-slate-200">2,048 samples (46.4 ms latency)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Bandpass Filter:</span>
                    <span className="text-slate-200">50 Hz – 8,000 Hz Butterworth Bandpass</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800/60">
                    <span className="text-slate-400">Envelope Detection:</span>
                    <span className="text-slate-200">Causal Streaming Envelope Follower</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Morse Decoder:</span>
                    <span className="text-purple-400 font-semibold">Dual Schmitt Trigger with Hysteresis</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                <Cpu className="w-4 h-4" />
                Benign CPU Fan Morse Simulator Technical Boundary
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Demonstrates acoustic covert exfiltration via acoustic modulation.
                Safety boundary: Strictly software-mode simulation. Does not modify motherboard thermal fan controls or risk hardware overheating.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-2">
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Base Idle Speed</div>
                  <div className="text-slate-100 font-bold text-sm mt-0.5">1,200 RPM</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Low Modulated Speed</div>
                  <div className="text-slate-100 font-bold text-sm mt-0.5">900 RPM</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">High Transmit Speed</div>
                  <div className="text-cyan-400 font-bold text-sm mt-0.5">1,800 RPM</div>
                </div>
                <div className="p-2.5 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-500 text-[10px]">Morse Dot / Dash Duration</div>
                  <div className="text-purple-400 font-bold text-sm mt-0.5">0.20s / 0.60s</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SIGNAL PLOTS & PROVENANCE EVIDENCE */}
        {activeTab === "evidence" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header & Honest Audit Status Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">Signal Evidence &amp; Data Provenance Validation</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      EVIDENCE VALIDATION
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Every plot is traced via JSON metadata to raw buffers (.npy, .wav, .csv) and validated by{" "}
                    <code className="text-cyan-300">aetherhound/scripts/verify_evidence.py</code>. File-integrity verification confirms
                    disk schemas, sample counts, and SHA-256 digests; hardware origin is explicitly separated from simulation.
                  </p>
                </div>

                {/* Honest Audit Status Badge */}
                <div className="flex items-center gap-3 shrink-0">
                  {overallAuditStatus === "VERIFIED" && auditReport ? (
                    <div className="flex items-center gap-2 bg-emerald-950/70 border border-emerald-500/60 px-3 py-1.5 rounded text-xs text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold flex items-center gap-1.5">
                          <span>FILE INTEGRITY: VERIFIED</span>
                          <span className="text-[10px] px-1 bg-emerald-900 rounded font-normal">
                            {auditReport.verified_count}/{auditReport.total_plots_audited}
                          </span>
                        </div>
                        <div className="text-[10px] text-emerald-400/80">
                          {auditReport.hardware_derived_count} Hardware-Attributed | {auditReport.synthetic_simulation_count} Synthetic
                        </div>
                      </div>
                    </div>
                  ) : overallAuditStatus === "PARTIALLY VERIFIED" && auditReport ? (
                    <div className="flex items-center gap-2 bg-amber-950/70 border border-amber-500/60 px-3 py-1.5 rounded text-xs text-amber-300">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-bold">PARTIALLY VERIFIED</div>
                        <div className="text-[10px] text-amber-400/80">
                          {auditReport.partially_verified_count} warnings | {auditReport.verified_count} verified
                        </div>
                      </div>
                    </div>
                  ) : overallAuditStatus === "INVALID" && auditReport ? (
                    <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-500/60 px-3 py-1.5 rounded text-xs text-rose-300">
                      <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <div className="font-bold">VALIDATION FAILED: INVALID</div>
                        <div className="text-[10px] text-rose-400/80">
                          {auditReport.failed_or_orphaned_count} failed or untraced artifacts
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded text-xs text-slate-300">
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="font-bold">NOT VALIDATED</div>
                        <div className="text-[10px] text-slate-400">
                          Run aetherhound/scripts/verify_evidence.py to generate report
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={loadAuditReport}
                    title="Reload Verification Report"
                    className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {auditError && (
                <div className="mt-3 p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{auditError}</span>
                </div>
              )}

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800 text-xs">
                <span className="text-slate-500 self-center mr-1">Filter View:</span>
                <button
                  onClick={() => setEvidenceFilter("all")}
                  className={`px-2.5 py-1 rounded transition ${
                    evidenceFilter === "all" ? "bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  All Evidence ({auditReport ? auditReport.plots.length : 0})
                </button>
                <button
                  onClick={() => setEvidenceFilter("rf")}
                  className={`px-2.5 py-1 rounded transition ${
                    evidenceFilter === "rf" ? "bg-cyan-950 text-cyan-300 border border-cyan-800 font-semibold" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  RF Spectrum ({auditReport?.plots.filter((p) => p.modality === "RF").length ?? 0})
                </button>
                <button
                  onClick={() => setEvidenceFilter("acoustic")}
                  className={`px-2.5 py-1 rounded transition ${
                    evidenceFilter === "acoustic" ? "bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  Acoustic Stream ({auditReport?.plots.filter((p) => p.modality === "ACOUSTIC").length ?? 0})
                </button>
                <button
                  onClick={() => setEvidenceFilter("rpm")}
                  className={`px-2.5 py-1 rounded transition ${
                    evidenceFilter === "rpm" ? "bg-purple-950 text-purple-300 border border-purple-800 font-semibold" : "text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  Fan RPM Timeline ({auditReport?.plots.filter((p) => p.modality === "FAN_SIMULATION").length ?? 0})
                </button>
              </div>
            </div>

            {/* Evidence Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Card 1: RF Spectrum Snapshot */}
              {(evidenceFilter === "all" || evidenceFilter === "rf") && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between overflow-hidden min-w-0">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <Radio className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span className="font-bold text-slate-100 text-xs">Calibrated RF Power Spectrum</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${getSourceBadgeClass(rfRecord?.source_mode)}`}>
                          {rfRecord?.source_mode ?? "NOT VALIDATED"}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${getValidationBadgeClass(rfRecord?.validation_status)}`}>
                          {rfRecord?.validation_status ?? "NOT VALIDATED"}
                        </span>
                      </div>
                    </div>

                    {/* Sensor & Provenance Meta Banner */}
                    <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80 my-3 text-[11px] space-y-1.5 font-mono">
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Capture ID:</span>
                        <span className="text-slate-200 break-all">{rfRecord?.capture_id ?? "NOT VALIDATED"}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Sensor ID:</span>
                        <span className="text-cyan-300 font-semibold break-all">{rfRecord?.sensor_id ?? "UNBOUND / NOT VALIDATED"}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Capture Timestamp:</span>
                        <span className="text-slate-200 break-all">{rfRecord?.capture_timestamp_iso || "NOT VALIDATED"}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Sampling Rate:</span>
                        <span className="text-slate-200">
                          {rfRecord?.sample_rate_hz ? `${rfRecord.sample_rate_hz.toLocaleString()} Hz` : "NOT VALIDATED"}
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Verified IQ Samples:</span>
                        <span className={rfRecord?.samples_verified ? "text-emerald-400 font-medium" : "text-slate-400"}>
                          {rfRecord ? `${rfRecord.actual_samples.toLocaleString()} / ${rfRecord.sample_count_recorded.toLocaleString()}` : "NOT VALIDATED"}
                        </span>
                      </div>
                    </div>

                    {rfRecord?.hardware_provenance_note && (
                      <div className="mb-3 p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 leading-relaxed">
                        {rfRecord.hardware_provenance_note}
                      </div>
                    )}

                    {/* Plot Image Container with Anti-Overflow */}
                    <div className="w-full bg-black rounded border border-slate-800 overflow-hidden relative">
                      {!brokenImages["rf"] ? (
                        <img
                          src={toPublicPlotUrl(rfRecord?.plot_path, "data/plots/rf_spectrum/synthetic_rf_anomaly.png", auditRefreshCount)}
                          alt="Calibrated RF Spectrum"
                          className="w-full h-auto max-h-[300px] object-contain mx-auto"
                          onError={() => setBrokenImages((prev) => ({ ...prev, rf: true }))}
                        />
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-500">
                          RF plot artifact not yet generated or missing on disk.
                        </div>
                      )}
                      <div className="p-2.5 text-center bg-slate-950 border-t border-slate-800/60 text-[11px] text-slate-300">
                        {rfRecord
                          ? `Bound Plot: ${rfRecord.plot_name} | Acquisition Mode: ${rfRecord.acquisition_mode}`
                          : "Run verification script to bind RF capture plot & metadata"}
                      </div>
                    </div>
                  </div>

                  {/* Raw Data Binding & Cryptographic SHA256 */}
                  <div className="pt-2 border-t border-slate-800 text-[10px] space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3 text-cyan-400" /> Raw Buffer:
                      </span>
                      <span className="font-semibold text-slate-300 break-all">
                        {rfRecord?.raw_data_path ? rfRecord.raw_data_path.replace(/\\/g, "/").split("/").slice(-3).join("/") : "NOT VALIDATED"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-purple-400" /> SHA-256 Digest:
                      </span>
                      {rfRecord?.computed_sha256 ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-300">
                            {rfRecord.computed_sha256.slice(0, 20)}...
                          </span>
                          <button
                            onClick={() => copyToClipboard(rfRecord.computed_sha256)}
                            className="hover:text-cyan-400 p-0.5"
                            title="Copy Full SHA-256"
                          >
                            {copiedHash === rfRecord.computed_sha256 ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">NOT VALIDATED</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 2: Acoustic Stream Waveform & Extracted Envelope */}
              {(evidenceFilter === "all" || evidenceFilter === "acoustic") && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 flex flex-col justify-between overflow-hidden min-w-0">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2 min-w-0">
                        <Mic className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-bold text-slate-100 text-xs">Acquired Acoustic Waveform &amp; Envelope</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${getSourceBadgeClass(acousticRecord?.source_mode)}`}>
                          {acousticRecord?.source_mode ?? "NOT VALIDATED"}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${getValidationBadgeClass(acousticRecord?.validation_status)}`}>
                          {acousticRecord?.validation_status ?? "NOT VALIDATED"}
                        </span>
                      </div>
                    </div>

                    {/* Sensor & Provenance Meta Banner */}
                    <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800/80 my-3 text-[11px] space-y-1.5 font-mono">
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Capture ID:</span>
                        <span className="text-slate-200 break-all">{acousticRecord?.capture_id ?? "NOT VALIDATED"}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Sensor ID:</span>
                        <span className="text-emerald-300 font-semibold break-all">{acousticRecord?.sensor_id ?? "UNBOUND / NOT VALIDATED"}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Capture Timestamp:</span>
                        <span className="text-slate-200 break-all">{acousticRecord?.capture_timestamp_iso || "NOT VALIDATED"}</span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Sampling Rate:</span>
                        <span className="text-slate-200">
                          {acousticRecord?.sample_rate_hz ? `${acousticRecord.sample_rate_hz.toLocaleString()} Hz` : "NOT VALIDATED"}
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-between gap-x-2">
                        <span className="text-slate-400">Verified Frames:</span>
                        <span className={acousticRecord?.samples_verified ? "text-emerald-400 font-medium" : "text-slate-400"}>
                          {acousticRecord ? `${acousticRecord.actual_samples.toLocaleString()} / ${acousticRecord.sample_count_recorded.toLocaleString()}` : "NOT VALIDATED"}
                        </span>
                      </div>
                    </div>

                    {acousticRecord?.hardware_provenance_note && (
                      <div className="mb-3 p-2 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300 leading-relaxed">
                        {acousticRecord.hardware_provenance_note}
                      </div>
                    )}

                    {/* Plot Image Container with Anti-Overflow */}
                    <div className="w-full bg-black rounded border border-slate-800 overflow-hidden relative">
                      {!brokenImages["acoustic"] ? (
                        <img
                          src={toPublicPlotUrl(acousticRecord?.plot_path, "data/plots/acoustic_waveform/sos_fan_detection.png", auditRefreshCount)}
                          alt="Acoustic Waveform & Pulse Envelope"
                          className="w-full h-auto max-h-[300px] object-contain mx-auto"
                          onError={() => setBrokenImages((prev) => ({ ...prev, acoustic: true }))}
                        />
                      ) : (
                        <div className="p-6 text-center text-xs text-slate-500">
                          Acoustic plot artifact not yet generated or missing on disk.
                        </div>
                      )}
                      <div className="p-2.5 text-center bg-slate-950 border-t border-slate-800/60 text-[11px] text-slate-300">
                        {acousticRecord
                          ? `Bound Plot: ${acousticRecord.plot_name} | Acquisition Mode: ${acousticRecord.acquisition_mode}`
                          : "Run verification script to bind acoustic waveform plot & metadata"}
                      </div>
                    </div>
                  </div>

                  {/* Raw Data Binding & Cryptographic SHA256 */}
                  <div className="pt-2 border-t border-slate-800 text-[10px] space-y-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3 text-emerald-400" /> Captured Raw Stream:
                      </span>
                      <span className="font-semibold text-slate-300 break-all">
                        {acousticRecord?.raw_data_path ? acousticRecord.raw_data_path.replace(/\\/g, "/").split("/").slice(-3).join("/") : "NOT VALIDATED"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-slate-400">
                      <span className="flex items-center gap-1">
                        <Hash className="w-3 h-3 text-purple-400" /> SHA-256 Digest:
                      </span>
                      {acousticRecord?.computed_sha256 ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-slate-300">
                            {acousticRecord.computed_sha256.slice(0, 20)}...
                          </span>
                          <button
                            onClick={() => copyToClipboard(acousticRecord.computed_sha256)}
                            className="hover:text-cyan-400 p-0.5"
                            title="Copy Full SHA-256"
                          >
                            {copiedHash === acousticRecord.computed_sha256 ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500">NOT VALIDATED</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Card 3: Fan RPM Morse Timeline (Full Width) */}
              {(evidenceFilter === "all" || evidenceFilter === "rpm") && (
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3 lg:col-span-2 overflow-hidden min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                    <div className="flex items-center gap-2 min-w-0">
                      <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="font-bold text-slate-100 text-xs">Fan RPM Speed Trajectory &amp; Morse Keying Timeline</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${getSourceBadgeClass(fanRecord?.source_mode ?? "NOT VALIDATED")}`}>
                        {fanRecord?.source_mode ?? "NOT VALIDATED"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold tracking-wider ${getValidationBadgeClass(fanRecord?.validation_status)}`}>
                        {fanRecord?.validation_status ?? "NOT VALIDATED"}
                      </span>
                    </div>
                  </div>

                  {/* Explicit Disclaimer Alert */}
                  <div className="p-2.5 rounded bg-amber-950/30 border border-amber-800/60 text-[11px] text-amber-300/90 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-amber-200">Simulated RPM Notice:</strong> This trajectory is a synthetic software model of fan RPM keying. No physical motherboard tachometer hardware measurements are recorded here.
                    </div>
                  </div>

                  {/* Plot Container */}
                  <div className="w-full bg-black rounded border border-slate-800 overflow-hidden relative">
                    {!brokenImages["fan"] ? (
                      <img
                        src={toPublicPlotUrl(fanRecord?.plot_path, "data/plots/acoustic_spectrogram/sos_fan_rpm.png", auditRefreshCount)}
                        alt="Fan RPM Trajectory Simulation"
                        className="w-full h-auto max-h-[340px] object-contain mx-auto"
                        onError={() => setBrokenImages((prev) => ({ ...prev, fan: true }))}
                      />
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500">
                        Fan RPM trajectory plot not yet generated or missing on disk.
                      </div>
                    )}
                  </div>

                  {/* Provenance Metadata Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-[11px] font-mono">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px]">Capture ID / Sensor:</span>
                      <div className="text-slate-200 font-semibold mt-0.5 break-all">
                        {fanRecord ? `${fanRecord.capture_id} (${fanRecord.sensor_id})` : "NOT VALIDATED"}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px]">Capture Timestamp:</span>
                      <div className="text-slate-200 font-semibold mt-0.5 break-all">
                        {fanRecord?.capture_timestamp_iso || "NOT VALIDATED"}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px]">Timeline Sample Rate / Points:</span>
                      <div className="text-cyan-400 font-semibold mt-0.5">
                        {fanRecord
                          ? `${fanRecord.sample_rate_hz} Hz (${fanRecord.actual_samples.toLocaleString()} pts)`
                          : "NOT VALIDATED"}
                      </div>
                    </div>
                    <div className="p-2 bg-slate-950 rounded border border-slate-800 min-w-0">
                      <span className="text-slate-500 text-[10px]">Raw CSV Timeline:</span>
                      <div className="text-slate-300 font-semibold mt-0.5 break-all">
                        {fanRecord?.raw_data_path ? fanRecord.raw_data_path.replace(/\\/g, "/").split("/").slice(-3).join("/") : "NOT VALIDATED"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Evidence Audit Ledger Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-slate-100 text-xs">Complete Evidence Integrity Ledger</span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {auditReport ? `Last Audited: ${auditReport.audit_timestamp_iso}` : "Status: NOT VALIDATED"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="py-2 px-2">Capture ID</th>
                      <th className="py-2 px-2">Plot / Artifact</th>
                      <th className="py-2 px-2">Source Label</th>
                      <th className="py-2 px-2">Sensor ID</th>
                      <th className="py-2 px-2">Timestamp</th>
                      <th className="py-2 px-2 text-right">Sample Rate</th>
                      <th className="py-2 px-2 text-right">Samples</th>
                      <th className="py-2 px-2">SHA-256</th>
                      <th className="py-2 px-2 text-right">Validation Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {!auditReport || auditReport.plots.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-6 text-center text-slate-400 text-xs">
                          No evidence validation report loaded. Run <code className="text-cyan-300">python .\aetherhound\scripts\verify_evidence.py</code> and click refresh.
                        </td>
                      </tr>
                    ) : (
                      auditReport.plots.map((p, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/30">
                          <td className="py-2.5 px-2 text-slate-300 whitespace-nowrap">{p.capture_id}</td>
                          <td className="py-2.5 px-2 text-cyan-300 font-medium whitespace-nowrap">{p.plot_name}</td>
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${getSourceBadgeClass(p.source_mode)}`}>
                              {p.source_mode}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-slate-300 whitespace-nowrap">{p.sensor_id}</td>
                          <td className="py-2.5 px-2 text-slate-400 whitespace-nowrap">{p.capture_timestamp_iso || "N/A"}</td>
                          <td className="py-2.5 px-2 text-right text-slate-300 whitespace-nowrap">
                            {p.sample_rate_hz ? `${p.sample_rate_hz.toLocaleString()} Hz` : "N/A"}
                          </td>
                          <td className="py-2.5 px-2 text-right text-slate-300 whitespace-nowrap">
                            {p.actual_samples.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {p.hash_verified ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> MATCH
                              </span>
                            ) : (
                              <span className="text-rose-400 font-bold flex items-center gap-1">
                                <AlertOctagon className="w-3 h-3" /> {p.recorded_sha256 ? "MISMATCH" : "MISSING"}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getValidationBadgeClass(p.validation_status)}`}>
                              {p.validation_status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: JSONL EVENT LOGS */}
        {activeTab === "events" && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-100">Structured JSONL Threat Telemetry Logs</h3>
                <p className="text-xs text-slate-400">Non-blocking, streaming JSONL telemetry written to data/events/</p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedEventLog("rf")}
                  className={`px-3 py-1 text-xs rounded transition border ${
                    selectedEventLog === "rf"
                      ? "bg-cyan-950 text-cyan-300 border-cyan-700 font-semibold"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  rf_events.jsonl
                </button>
                <button
                  onClick={() => setSelectedEventLog("morse")}
                  className={`px-3 py-1 text-xs rounded transition border ${
                    selectedEventLog === "morse"
                      ? "bg-purple-950 text-purple-300 border-purple-700 font-semibold"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  morse_events.jsonl
                </button>
                <button
                  onClick={() => setSelectedEventLog("acoustic")}
                  className={`px-3 py-1 text-xs rounded transition border ${
                    selectedEventLog === "acoustic"
                      ? "bg-emerald-950 text-emerald-300 border-emerald-700 font-semibold"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  acoustic_events.jsonl
                </button>
                <button
                  onClick={() => setSelectedEventLog("system")}
                  className={`px-3 py-1 text-xs rounded transition border ${
                    selectedEventLog === "system"
                      ? "bg-slate-800 text-slate-200 border-slate-700 font-semibold"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200"
                  }`}
                >
                  system_events.jsonl
                </button>
              </div>
            </div>

            {/* Log Content Viewer */}
            <div className="bg-black border border-slate-800 rounded-lg p-4 font-mono text-xs overflow-x-auto text-slate-300 space-y-2">
              {selectedEventLog === "rf" && (
                <pre className="text-cyan-300 whitespace-pre-wrap leading-relaxed">
{`{"event_type": "Unusual RF Spectral Activity", "sensor_id": "SDR-01", "detected_freq_hz": 434070000.0, "signal_power_db": -2.48, "noise_floor_db": -57.89, "deviation_db": 55.41, "sigma_deviation": 11.34, "persistence_windows": 3, "timestamp": 1794469280.4086707, "status": "SUSPICIOUS RF ACTIVITY", "is_synthetic": true, "raw_iq_binding": "data/rf/raw/synthetic_rf_anomaly_iq.npy", "evidence": {"peak_bin": 1174, "noise_std_db": 4.89, "total_peaks": 1}}`}
                </pre>
              )}

              {selectedEventLog === "morse" && (
                <pre className="text-purple-300 whitespace-pre-wrap leading-relaxed">
{`{"event_type": "Covert Acoustic Morse Channel Detected", "sensor_id": "MIC-01", "target_pattern": "SOS", "decoded_morse": "... --- ...", "detection_method": "Acoustic Pulse Timing", "match_score": 0.890, "timestamp": 1794469136.214, "source": "SYNTHETIC RECEIVER STREAM", "result": "PATTERN DETECTED", "raw_capture_binding": "data/acoustic/raw/sos_fan_detection_capture.wav", "evidence": {"mean_timing_error_pct": 14.2, "timing_accuracy": 0.858, "symbol_count": 9, "dot_ref_sec": 0.20, "dash_ref_sec": 0.60}}`}
                </pre>
              )}

              {selectedEventLog === "acoustic" && (
                <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed">
{`{"event_type": "Structured Acoustic Repetitive Pulses", "sensor_id": "MIC-01", "dominant_frequency_hz": 1820.5, "rms_energy": 0.1482, "pulse_count": 9, "pattern_duration_sec": 6.2, "timestamp": 1794469130.100, "status": "SUSPICIOUS ACOUSTIC ACTIVITY", "is_synthetic": true, "evidence": {"energy_ratio": 3.2, "mean_periodicity": 0.74, "baseline_rms": 0.046}}`}
                </pre>
              )}

              {selectedEventLog === "system" && (
                <pre className="text-slate-400 whitespace-pre-wrap leading-relaxed">
{`{"timestamp": 1794469000.12, "iso_time": "2026-11-12T07:35:50Z", "action": "EngineStarted", "details": "AetherHound dual-channel monitoring active"}
{"timestamp": 1794469140.55, "iso_time": "2026-11-12T07:38:10Z", "action": "OptionB_AcousticTestExecuted", "details": "Streaming receiver captured SOS Morse, envelope extracted, match score 89.0%"}
{"timestamp": 1794469285.80, "iso_time": "2026-11-12T07:41:25Z", "action": "OptionC_SoftwareTestExecuted", "details": "Synthetic narrowband RF carrier detected, raw IQ saved, cryptographic SHA-256 bound"}
{"timestamp": 1794469310.20, "iso_time": "2026-11-12T07:45:00Z", "action": "EvidenceAuditExecuted", "details": "aetherhound/scripts/verify_evidence.py completed: 3/3 plots validated against raw buffers"}`}
                </pre>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: CLI RUN COMMANDS & TESTS */}
        {activeTab === "docs" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Evidence Verification Command Highlight */}
            <div className="bg-slate-900 border border-cyan-800/80 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Evidence Authenticity & Provenance Audit Tool
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Run the dedicated verification suite to cryptographically validate all plot figures against their underlying raw acquisition buffers (.npy, .wav, .csv).
              </p>
              <pre className="p-3 bg-black rounded text-cyan-300 border border-slate-800 text-xs overflow-x-auto">
                python .\aetherhound\scripts\verify_evidence.py
              </pre>
              <div className="text-[11px] text-slate-400">
                Audits: raw buffer existence, sample count matches, timestamp ordering, and bit-level SHA-256 hash digests.
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  Unit &amp; Integration Test Suite Modules
                </div>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-xs">
                  7 TEST MODULES (pytest)
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">aetherhound/tests/test_evidence_provenance.py</div>
                  <div className="text-slate-400">Day 1 metadata schema, missing files, sample mismatch, SHA-256 tamper &amp; source rules (7 tests)</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">aetherhound/tests/test_morse_encoder.py</div>
                  <div className="text-slate-400">SOS encoding, element/letter/word gaps, timing durations (4 tests)</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">aetherhound/tests/test_audio_generator.py</div>
                  <div className="text-slate-400">Fan RPM timeline, synthetic audio generation, WAV export (2 tests)</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">aetherhound/tests/test_rf_detector.py</div>
                  <div className="text-slate-400">FFT calculations, noise floor estimation, persistence tracking (3 tests)</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">aetherhound/tests/test_acoustic_detector.py</div>
                  <div className="text-slate-400">RMS energy, ZCR, bandpass filtering, burst detection (3 tests)</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">aetherhound/tests/test_morse_detector.py</div>
                  <div className="text-slate-400">Streaming real-time SOS pattern detection &amp; incorrect sequence rejection (2 tests)</div>
                </div>
                <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-1">
                  <div className="text-emerald-400 font-semibold">aetherhound/tests/test_realtime_engine.py</div>
                  <div className="text-slate-400">Dual-channel lifecycle, pause/resume, telemetry &amp; JSONL logging (1 test)</div>
                </div>
              </div>
            </div>

            {/* Terminal Commands Guide */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-bold text-slate-200">CLI Command Reference</h4>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400">1. Run Device Diagnostics:</span>
                  <pre className="mt-1 p-2 bg-black rounded text-cyan-400 border border-slate-800">
                    python3 -m aetherhound.hardware.device_check
                  </pre>
                </div>
                <div>
                  <span className="text-slate-400">2. Launch Full Rich Terminal Live Monitor:</span>
                  <pre className="mt-1 p-2 bg-black rounded text-cyan-400 border border-slate-800">
                    python3 -m aetherhound.interface.live_monitor
                  </pre>
                </div>
                <div>
                  <span className="text-slate-400">3. Run End-to-End Demonstration:</span>
                  <pre className="mt-1 p-2 bg-black rounded text-cyan-400 border border-slate-800">
                    python3 aetherhound/scripts/week1_demo.py --mode auto
                  </pre>
                </div>
                <div>
                  <span className="text-slate-400">4. Run Pytest Test Suite:</span>
                  <pre className="mt-1 p-2 bg-black rounded text-cyan-400 border border-slate-800">
                    python3 -m pytest -v aetherhound/tests/
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Status Bar Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/90 px-4 py-2 text-[11px] text-slate-500 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-3">
          <span>Python 3.11</span>
          <span>•</span>
          <span>NumPy 1.26.4</span>
          <span>•</span>
          <span>SciPy 1.10.1</span>
          <span>•</span>
          <span>PyRTLSDR 0.2.93</span>
          <span>•</span>
          <span>PyAudio 0.2.14</span>
          <span>•</span>
          <span>Rich 15.0</span>
        </div>
        <div className="text-slate-400 flex items-center gap-2">
          <span>AetherHound Week 1 SIGINT Audit</span>
          <span>•</span>
          <span className="text-cyan-400">Cryptographic Provenance Binding Active</span>
        </div>
      </footer>
    </div>
  );
}
