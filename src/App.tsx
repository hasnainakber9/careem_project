import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock3,
  FileUp,
  Gauge,
  MapPin,
  RefreshCcw,
  Route,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { analyzeTrips, areaLabel, type MobilityMetrics, type RankedItem } from "./lib/analytics";
import { buildDecisionBrief, type DecisionBrief } from "./lib/brief";
import { formatCurrency, formatDuration, formatNumber, formatPercent } from "./lib/format";
import { parseTripsFromCsv, type TripRecord } from "./lib/parser";
import { ajmanTaxiRecords } from "./data/ajmanTaxi";

const chicagoDatasetUrl =
  "https://data.cityofchicago.org/Transportation/Transportation-Network-Providers-Trips-2023-2024-/n26f-ihde";
const ajmanDatasetUrl = "https://data.ajman.ae/explore/dataset/taxi-trips/";
const heroImageUrl = "/assets/mobility-night-road.svg";
const cityImageUrl = "/assets/city-signal-map.svg";

type AiState = {
  label: string;
  tone: "neutral" | "success" | "warning";
};

type ChartMode = "demand" | "economics" | "pooling";

type ChartPoint = {
  label: string;
  value: number;
  detail: string;
};

type AreaEconomics = {
  key: string;
  label: string;
  trips: number;
  avgTotal: number;
  poolRate: number;
};

const initialAiState: AiState = {
  label: "Rules brief",
  tone: "neutral",
};

const hourLabel = (hour: number) =>
  new Date(2024, 0, 1, hour).toLocaleTimeString("en", { hour: "numeric", hour12: true });

const serializeMetrics = (metrics: MobilityMetrics) => ({
  totalTrips: metrics.totalTrips,
  avgFare: metrics.avgFare,
  avgTripTotal: metrics.avgTripTotal,
  avgDurationMinutes: metrics.avgDurationMinutes,
  avgDistanceMiles: metrics.avgDistanceMiles,
  revenuePerMile: metrics.revenuePerMile,
  pooledTripRate: metrics.pooledTripRate,
  sharedAuthorizedRate: metrics.sharedAuthorizedRate,
  sharedMatchRate: metrics.sharedMatchRate,
  matchedShareOfAuthorized: metrics.matchedShareOfAuthorized,
  peakHour: metrics.peakHour,
  topPickupAreas: metrics.topPickupAreas,
  topDropoffAreas: metrics.topDropoffAreas,
  topCorridors: metrics.topCorridors,
});

function App() {
  const [rows, setRows] = useState<TripRecord[]>([]);
  const [sourceLabel, setSourceLabel] = useState("Loading sample");
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [brief, setBrief] = useState<DecisionBrief | null>(null);
  const [aiState, setAiState] = useState<AiState>(initialAiState);
  const [isAiBusy, setIsAiBusy] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>("demand");
  const [activeCorridorIndex, setActiveCorridorIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCsvText = (csvText: string, nextSourceLabel: string) => {
    const parsed = parseTripsFromCsv(csvText);
    setRows(parsed.rows);
    setParseErrors(parsed.errors);
    setSourceLabel(nextSourceLabel);
    setAiState(initialAiState);
  };

  const loadSample = async () => {
    const response = await fetch("/data/chicago-tnp-sample.csv");
    const csvText = await response.text();
    loadCsvText(csvText, "Chicago TNP sample export");
  };

  useEffect(() => {
    void loadSample();
  }, []);

  const metrics = useMemo(() => analyzeTrips(rows), [rows]);
  const deterministicBrief = useMemo(() => buildDecisionBrief(metrics), [metrics]);
  const areaEconomics = useMemo(() => buildAreaEconomics(rows), [rows]);
  const chartSeries = useMemo(
    () => buildChartSeries(chartMode, rows, metrics, areaEconomics),
    [chartMode, rows, metrics, areaEconomics],
  );

  useEffect(() => {
    setBrief(deterministicBrief);
  }, [deterministicBrief]);

  const onFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const csvText = await file.text();
    loadCsvText(csvText, file.name);
    event.target.value = "";
  };

  const polishWithAi = async () => {
    setIsAiBusy(true);
    setAiState({ label: "Checking AI route", tone: "neutral" });

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metrics: serializeMetrics(metrics),
          brief: deterministicBrief,
        }),
      });
      const payload = await response.json();
      setBrief(payload.brief);
      setAiState({
        label: payload.source === "openrouter/free" ? "AI polished" : "Rules brief",
        tone: payload.source === "openrouter/free" ? "success" : "warning",
      });
    } catch {
      setBrief(deterministicBrief);
      setAiState({ label: "Rules brief", tone: "warning" });
    } finally {
      setIsAiBusy(false);
    }
  };

  const latestAjman = ajmanTaxiRecords[ajmanTaxiRecords.length - 1];
  const previousAjman = ajmanTaxiRecords[ajmanTaxiRecords.length - 2];
  const ajmanGrowth =
    latestAjman && previousAjman
      ? (latestAjman.regularTaxiTrips - previousAjman.regularTaxiTrips) / previousAjman.regularTaxiTrips
      : 0;

  return (
    <main className="app-shell">
      <header className="site-nav">
        <a className="brand" href="#top" aria-label="Mobility Decision Brief home">
          <span className="brand-mark">
            <Route size={20} />
          </span>
          <span>mobility</span>
        </a>
        <nav className="nav-pills" aria-label="Primary">
          <a href="#brief">Brief</a>
          <a href="#signals">Signals</a>
          <a href="#map">Map</a>
        </nav>
        <button className="start-button" type="button" onClick={() => fileInputRef.current?.click()}>
          Upload CSV
        </button>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span className="blue-dot" />
            Careem-style mobility intelligence
          </p>
          <h1>Turn ride-hailing signals into confident action.</h1>
          <p className="hero-text">
            A public-data decision cockpit for demand, fare efficiency, pooling, and supply movement.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={polishWithAi} disabled={isAiBusy}>
              <Brain size={18} />
              {isAiBusy ? "Polishing" : "Polish brief"}
            </button>
            <button className="secondary-button" type="button" onClick={loadSample}>
              <RefreshCcw size={18} />
              Reload sample
            </button>
          </div>
          <div className="scroll-cue">Scroll</div>
        </div>

        <div className="hero-media" aria-label="Open-source mobility operations visual">
          <img src={heroImageUrl} alt="Night road mobility operations visual" />
          <div className="media-overlay demand">
            <Gauge size={20} />
            <div>
              <strong>{formatCurrency(metrics.revenuePerMile)}</strong>
              <span>revenue per mile</span>
            </div>
          </div>
          <div className="media-overlay pool">
            <Users size={20} />
            <div>
              <strong>{formatPercent(metrics.pooledTripRate)}</strong>
              <span>pooled trip rate</span>
            </div>
          </div>
          <div className="media-overlay route">
            <MapPin size={20} />
            <div>
              <strong>{metrics.topPickupAreas[0]?.label ?? "Top area"}</strong>
              <span>highest pickup signal</span>
            </div>
          </div>
        </div>
      </section>

      <section className="focus-strip" aria-label="Prototype metadata">
        <span>Featured focus</span>
        <a href={chicagoDatasetUrl} target="_blank" rel="noreferrer">
          Chicago rideshare data
        </a>
        <a href={ajmanDatasetUrl} target="_blank" rel="noreferrer">
          Ajman taxi reference
        </a>
        <a href="/assets/IMAGE_LICENSE.md" target="_blank" rel="noreferrer">
          Open-source visuals
        </a>
      </section>

      <section className="workspace" id="signals">
        <div className="left-rail">
          <section className="source-panel">
            <div>
              <p className="panel-kicker">Dataset</p>
              <h2>{sourceLabel}</h2>
            </div>
            <div className="source-actions">
              <span>{formatNumber(metrics.totalTrips)} trips</span>
              <span>{formatNumber(parseErrors.length)} notices</span>
              <button className="icon-button" type="button" title="Reload sample" onClick={loadSample}>
                <RefreshCcw size={18} />
              </button>
              <button className="csv-button" type="button" onClick={() => fileInputRef.current?.click()}>
                <FileUp size={18} />
                CSV
              </button>
              <input ref={fileInputRef} className="hidden-input" type="file" accept=".csv" onChange={onFileChange} />
            </div>
          </section>

          {parseErrors.length > 0 && (
            <section className="notice-panel">
              {parseErrors.map((error) => (
                <p key={error}>{error}</p>
              ))}
            </section>
          )}

          <section className="kpi-grid">
            <KpiCard icon={<Activity size={18} />} label="Trips" value={formatNumber(metrics.totalTrips)} />
            <KpiCard icon={<Gauge size={18} />} label="Revenue / mile" value={formatCurrency(metrics.revenuePerMile)} />
            <KpiCard icon={<Clock3 size={18} />} label="Avg duration" value={formatDuration(metrics.avgDurationMinutes)} />
            <KpiCard icon={<Users size={18} />} label="Pooled rate" value={formatPercent(metrics.pooledTripRate)} />
          </section>

          <section className="analysis-grid">
            <section className="tool-panel chart-tool">
              <PanelHeader icon={<BarChart3 size={18} />} label="Interactive Signal Chart" />
              <div className="segmented-control" role="tablist" aria-label="Chart mode">
                {(["demand", "economics", "pooling"] as ChartMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={chartMode === mode ? "active" : ""}
                    type="button"
                    onClick={() => setChartMode(mode)}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <InteractiveChart series={chartSeries} mode={chartMode} />
            </section>

            <section className="tool-panel">
              <PanelHeader icon={<MapPin size={18} />} label="Pickup Areas" />
              <RankingList items={metrics.topPickupAreas} />
            </section>
          </section>

          <section className="analysis-grid">
            <section className="tool-panel" id="map">
              <PanelHeader icon={<ArrowRight size={18} />} label="Route Signal Map" />
              <SignalMap
                metrics={metrics}
                activeIndex={activeCorridorIndex}
                onActiveIndexChange={setActiveCorridorIndex}
              />
            </section>

            <section className="tool-panel regional-panel">
              <PanelHeader icon={<ShieldCheck size={18} />} label="UAE Reference" />
              <img className="regional-image" src={cityImageUrl} alt="City mobility signal map visual" />
              <div className="regional-metric">
                <span>Ajman regular taxi trips</span>
                <strong>{formatNumber(latestAjman.regularTaxiTrips)}</strong>
              </div>
              <div className="regional-metric">
                <span>Half-year movement</span>
                <strong>{formatPercent(ajmanGrowth)}</strong>
              </div>
              <div className="regional-pills">
                <span>Women taxi: {formatNumber(latestAjman.womenTaxiTrips)}</span>
                <span>Accessible: {formatNumber(latestAjman.specialNeedsTrips)}</span>
              </div>
            </section>
          </section>
        </div>

        <aside className="brief-panel" id="brief">
          <div className="brief-header">
            <div>
              <p className="panel-kicker">Decision brief</p>
              <h2>Operations recommendation</h2>
            </div>
            <span className={`status-pill ${aiState.tone}`}>
              <CheckCircle2 size={15} />
              {aiState.label}
            </span>
          </div>

          <div className="brief-section">
            <h3>Three Takeaways</h3>
            <ol>
              {(brief?.takeaways ?? []).map((takeaway) => (
                <li key={takeaway}>{takeaway}</li>
              ))}
            </ol>
          </div>

          <div className="action-box">
            <div className="action-title">
              <Sparkles size={18} />
              Action Point
            </div>
            <p>{brief?.action}</p>
          </div>

          <div className="risk-box">
            <strong>Validation note</strong>
            <p>{brief?.risk}</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function buildAreaEconomics(rows: TripRecord[]): AreaEconomics[] {
  const groups = new Map<string, { label: string; totals: number[]; pooled: number }>();

  rows.forEach((row) => {
    const key = row.pickupCommunityArea ? String(row.pickupCommunityArea) : "hidden";
    const current = groups.get(key) ?? {
      label: areaLabel(row.pickupCommunityArea),
      totals: [],
      pooled: 0,
    };
    current.totals.push(row.tripTotal);
    if (row.sharedTripMatch || row.tripsPooled > 1) current.pooled += 1;
    groups.set(key, current);
  });

  return [...groups.entries()]
    .map(([key, value]) => ({
      key,
      label: value.label,
      trips: value.totals.length,
      avgTotal: value.totals.reduce((total, item) => total + item, 0) / value.totals.length,
      poolRate: value.totals.length ? value.pooled / value.totals.length : 0,
    }))
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 8);
}

function buildChartSeries(
  mode: ChartMode,
  rows: TripRecord[],
  metrics: MobilityMetrics,
  areaEconomics: AreaEconomics[],
): ChartPoint[] {
  if (mode === "economics") {
    return areaEconomics.slice(0, 7).map((item) => ({
      label: item.label,
      value: item.avgTotal,
      detail: `${formatCurrency(item.avgTotal)} avg trip total across ${formatNumber(item.trips)} trips`,
    }));
  }

  if (mode === "pooling") {
    const byHour = new Map<number, { total: number; pooled: number }>();
    rows.forEach((row) => {
      const hour = new Date(row.tripStartTimestamp).getHours();
      const current = byHour.get(hour) ?? { total: 0, pooled: 0 };
      current.total += 1;
      if (row.sharedTripMatch || row.tripsPooled > 1) current.pooled += 1;
      byHour.set(hour, current);
    });

    return [...byHour.entries()]
      .sort(([a], [b]) => a - b)
      .map(([hour, value]) => ({
        label: hourLabel(hour),
        value: value.total ? value.pooled / value.total : 0,
        detail: `${formatPercent(value.total ? value.pooled / value.total : 0)} pooled in ${hourLabel(hour)}`,
      }));
  }

  return metrics.hourlyDemand
    .filter((item) => item.count > 0)
    .map((item) => ({
      label: hourLabel(item.hour),
      value: item.count,
      detail: `${formatNumber(item.count)} trips, ${formatPercent(item.share)} of sampled demand`,
    }));
}

function PanelHeader({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="panel-header">
      <span>{icon}</span>
      <h2>{label}</h2>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <article className="kpi-card">
      <span>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function RankingList({ items }: { items: RankedItem[] }) {
  return (
    <div className="ranking-list">
      {items.map((item) => (
        <button className="ranking-row" type="button" key={item.key}>
          <div>
            <strong>{item.label}</strong>
            <span>{formatNumber(item.count)} trips</span>
          </div>
          <p>{formatPercent(item.share)}</p>
        </button>
      ))}
    </div>
  );
}

function InteractiveChart({ series, mode }: { series: ChartPoint[]; mode: ChartMode }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const maxValue = Math.max(...series.map((item) => item.value), 1);
  const hovered = hoveredIndex === null ? series[0] : series[hoveredIndex];

  return (
    <div className="interactive-chart">
      <div className="chart-stage">
        <svg viewBox="0 0 720 270" role="img" aria-label={`${mode} chart`}>
          <line x1="36" y1="232" x2="690" y2="232" className="axis" />
          {series.map((item, index) => {
            const width = 640 / Math.max(series.length, 1);
            const barWidth = Math.min(width * 0.58, 42);
            const x = 52 + index * width;
            const height = Math.max((item.value / maxValue) * 180, 6);
            const y = 232 - height;
            const isActive = hoveredIndex === index || (hoveredIndex === null && index === 0);
            return (
              <g key={`${item.label}-${index}`}>
                <rect
                  className={isActive ? "chart-bar active" : "chart-bar"}
                  x={x}
                  y={y}
                  width={barWidth}
                  height={height}
                  rx="6"
                  tabIndex={0}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onFocus={() => setHoveredIndex(index)}
                />
                <text x={x + barWidth / 2} y="252" textAnchor="middle" className="chart-label">
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <div className="chart-readout">
        <span>{mode === "pooling" ? "Selected rate" : "Selected signal"}</span>
        <strong>{mode === "pooling" ? formatPercent(hovered?.value ?? 0) : formatNumber(hovered?.value ?? 0, 1)}</strong>
        <p>{hovered?.detail}</p>
      </div>
    </div>
  );
}

const nodePositions: Record<string, { x: number; y: number }> = {
  Loop: { x: 56, y: 46 },
  "West Town": { x: 34, y: 48 },
  "Near North Side": { x: 54, y: 27 },
  "O'Hare": { x: 16, y: 18 },
  "Lake View": { x: 58, y: 14 },
  "Near West Side": { x: 43, y: 59 },
  "Lincoln Park": { x: 51, y: 21 },
  "Garfield Ridge": { x: 28, y: 78 },
  "Outside or hidden": { x: 78, y: 75 },
};

function SignalMap({
  metrics,
  activeIndex,
  onActiveIndexChange,
}: {
  metrics: MobilityMetrics;
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
}) {
  const corridors = metrics.topCorridors;
  const activeCorridor = corridors[activeIndex] ?? corridors[0];
  const activeStart = nodePositions[activeCorridor?.pickupLabel] ?? { x: 35, y: 45 };
  const activeEnd = nodePositions[activeCorridor?.dropoffLabel] ?? { x: 65, y: 55 };
  const nodes = [...new Set(corridors.flatMap((item) => [item.pickupLabel, item.dropoffLabel]))];

  return (
    <div className="signal-map">
      <svg viewBox="0 0 100 90" role="img" aria-label="Route signal map">
        <path d="M5 74 C22 58, 34 65, 49 46 S76 17, 94 26" className="map-road" />
        <path d="M10 22 C29 32, 39 21, 55 37 S75 63, 92 54" className="map-road muted" />
        {corridors.map((corridor, index) => {
          const start = nodePositions[corridor.pickupLabel] ?? { x: 30 + index * 8, y: 44 };
          const end = nodePositions[corridor.dropoffLabel] ?? { x: 60 + index * 5, y: 52 };
          return (
            <line
              key={corridor.key}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              className={index === activeIndex ? "route-line active" : "route-line"}
            />
          );
        })}
        <line x1={activeStart.x} y1={activeStart.y} x2={activeEnd.x} y2={activeEnd.y} className="route-line glow" />
        {nodes.map((node) => {
          const point = nodePositions[node] ?? { x: 48, y: 48 };
          return (
            <g key={node}>
              <circle cx={point.x} cy={point.y} r="3.8" className="map-node" />
              <text x={point.x + 5} y={point.y + 1} className="map-label">
                {node}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="corridor-list">
        {corridors.map((corridor, index) => (
          <button
            className={index === activeIndex ? "corridor-row active" : "corridor-row"}
            type="button"
            key={corridor.key}
            onClick={() => onActiveIndexChange(index)}
          >
            <div>
              <strong>{corridor.pickupLabel}</strong>
              <span>{corridor.dropoffLabel}</span>
            </div>
            <p>{formatPercent(corridor.share)}</p>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;
