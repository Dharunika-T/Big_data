import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Box,
  ChartColumnIncreasing,
  ChevronDown,
  CircleHelp,
  Clock3,
  Cloud,
  Database,
  Download,
  FileText,
  Gauge,
  House,
  Lightbulb,
  ListChecks,
  Map,
  MapPin,
  Medal,
  Menu,
  PackageCheck,
  ShieldAlert,
  Search,
  ShieldCheck,
  Sparkles,
  ShoppingCart,
  Star,
  Truck,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Treemap,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getCities, getDashboard, getDeliveries, getReviews, getStates } from "./api.js";

const navigation = [
  { id: "overview", label: "Home", icon: House },
  { id: "health", label: "Business health", icon: Activity },
  { id: "states", label: "State intelligence", icon: Map },
  { id: "locations", label: "City insights", icon: MapPin },
  { id: "customer", label: "Customer analytics", icon: Star },
  { id: "revenue", label: "Revenue analytics", icon: ChartColumnIncreasing },
  { id: "delivery", label: "Delivery performance", icon: Truck },
  { id: "recommendations", label: "Recommendation engine", icon: Lightbulb },
  { id: "alerts", label: "Alerts & monitoring", icon: ShieldAlert },
  { id: "rankings", label: "Business rankings", icon: Medal },
  { id: "report", label: "Report generator", icon: FileText },
];

const chartPalette = ["#20d7a2", "#4994ff", "#ffbd4a", "#bd70ff", "#ff637e", "#20c9d9", "#ff8f49", "#6de176"];

const currency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

function App() {
  const [page, setPage] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [states, setStates] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [cities, setCities] = useState([]);
  const [meta, setMeta] = useState({ source: "loading" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [deliveryOffset, setDeliveryOffset] = useState(0);
  const [deliveryTotal, setDeliveryTotal] = useState(0);
  const deliveryLimit = 50;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const results = await Promise.all([
          getDashboard(),
          getStates(),
          getReviews(),
          getCities(),
        ]);
        if (cancelled) return;
        setDashboard(results[0].data);
        setStates(results[1].data);
        setReviews(results[2].data);
        setCities(results[3].data);
        setMeta(results[0].meta);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load dashboard data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (page !== "delivery") return undefined;
    let cancelled = false;
    setDeliveryLoading(true);
    setError("");
    getDeliveries({
      ...(stateFilter ? { state: stateFilter } : {}),
      ...(cityFilter ? { city: cityFilter } : {}),
      offset: deliveryOffset,
      limit: deliveryLimit,
    }).then((result) => {
      if (cancelled) return;
      setDeliveries(result.data);
      setDeliveryTotal(result.meta.total);
      setMeta(result.meta);
    }).catch((err) => {
      if (!cancelled) setError(err.message || "Could not load delivery records.");
    }).finally(() => {
      if (!cancelled) setDeliveryLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [page, stateFilter, cityFilter, deliveryOffset]);

  const changeStateFilter = (value) => {
    setStateFilter(value);
    setDeliveryOffset(0);
  };
  const changeCityFilter = (value) => {
    setCityFilter(value);
    setDeliveryOffset(0);
  };

  const setActivePage = (id) => {
    if (id === "delivery" && page !== "delivery") setDeliveryOffset(0);
    setPage(id);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ShoppingCart size={22} /></div>
          <div><strong>E-Comm BI</strong><span>Decision Support</span></div>
          <button className="icon-button close-menu" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X /></button>
        </div>
        <div className="profile-mini">
          <div className="avatar">DT</div>
          <div><strong>Analyst workspace</strong><span>Business intelligence</span></div>
        </div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-item ${page === id ? "active" : ""}`} onClick={() => setActivePage(id)}>
              <Icon size={18} /><span>{label}</span>{id === "overview" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="nav-caption nav-caption-bottom">MONITORING</div>
        <button className={`nav-item ${page === "alerts" ? "active" : ""}`} onClick={() => setActivePage("alerts")}><Bell size={18} /><span>Alerts & monitoring</span><span className="alert-count">{states.filter((row) => Number(row.avg_delay_days) > 0 || Number(row.avg_review_score) < 3.5).length}</span></button>
        <div className="connection-card">
          <div className="connection-title"><span className={`status-pulse ${meta.source === "mongodb" ? "live" : ""}`} />Data pipeline</div>
          <div className="connection-flow"><span>Hive</span><ArrowRight size={13} /><span>MongoDB</span></div>
          <div className={`source-pill ${meta.source === "mongodb" ? "source-live" : ""}`}>
            {meta.source === "mongodb" ? "Live data" : meta.source === "loading" ? "Connecting…" : "Sample data"}
          </div>
        </div>
        <div className="sidebar-foot">Big data. Better decisions.<small>© 2025 E-Comm BI</small></div>
      </aside>
      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation" />}

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu /></button>
          <div className="greeting">
            <div className="wave-icon">✦</div>
            <div><strong>{page === "overview" ? "Hello, Analyst!" : navigation.find((item) => item.id === page)?.label}</strong><span>Explore insights and make smarter decisions.</span></div>
          </div>
          <div className="topbar-tools">
            <div className="updated"><span>LAST UPDATED</span><strong>Analytics workspace</strong></div>
            <div className={`live-indicator ${meta.source === "mongodb" ? "live" : ""}`}><span />{meta.source === "mongodb" ? "Live" : "Demo"}</div>
            <button className="user-menu"><span className="avatar avatar-small">D</span><span>Dharunika T</span><ChevronDown size={15} /></button>
          </div>
        </header>

        <section className="page-content">
          {meta.warning && <div className="notice"><Database size={16} /><span>{meta.warning}</span></div>}
          {error && <div className="error-banner"><CircleHelp size={17} /><div><strong>API connection failed</strong><span>{error} Start the backend API to connect the dashboard.</span></div></div>}
          {loading && <div className="loading-banner"><span className="spinner" />Loading analytics…</div>}
          {!loading && !error && dashboard && (
            <>
              {page === "overview" && <Overview dashboard={dashboard} states={states} reviews={reviews} navigate={setActivePage} />}
              {page === "health" && <HealthPage dashboard={dashboard} states={states} reviews={reviews} navigate={setActivePage} />}
              {page === "states" && <StatePage states={states} navigate={setActivePage} />}
              {page === "locations" && <LocationsPage cities={cities} navigate={setActivePage} />}
              {page === "customer" && <ReviewPage reviews={reviews} />}
              {page === "delivery" && <DeliveryPage deliveries={deliveries} total={deliveryTotal} offset={deliveryOffset} limit={deliveryLimit} setOffset={setDeliveryOffset} states={states} stateFilter={stateFilter} cityFilter={cityFilter} setStateFilter={changeStateFilter} setCityFilter={changeCityFilter} cities={cities} loading={deliveryLoading} />}
              {page === "revenue" && <RevenuePage dashboard={dashboard} />}
              {page === "recommendations" && <RecommendationsPage states={states} reviews={reviews} navigate={setActivePage} />}
              {page === "alerts" && <AlertsPage states={states} reviews={reviews} navigate={setActivePage} />}
              {page === "rankings" && <RankingsPage states={states} dashboard={dashboard} navigate={setActivePage} />}
              {page === "report" && <ReportPage dashboard={dashboard} states={states} reviews={reviews} />}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
      {action}
    </div>
  );
}

function MetricCard({ icon: Icon, title, value, change, tone, onClick, suffix }) {
  return (
    <button className={`metric-card ${tone}`} onClick={onClick}>
      <div className="metric-top"><span className="metric-icon"><Icon size={19} /></span><span className="metric-label">{title}</span><ArrowRight className="metric-arrow" size={16} /></div>
      <div className="metric-value">{value}<small>{suffix}</small></div>
      <div className="metric-bottom"><span className="metric-change"><ArrowUpRight size={14} />{change}</span></div>
      <div className="sparkline"><svg viewBox="0 0 140 32" preserveAspectRatio="none"><path d="M0 25 C14 28 14 12 28 17 S44 30 56 17 72 22 82 12 100 20 110 9 126 16 140 2" /></svg></div>
    </button>
  );
}

function Overview({ dashboard, states, reviews, navigate }) {
  const stateRevenue = dashboard.top_revenue_states || [];
  const ratings = [...reviews].sort((a, b) => Number(b.avg_review_score) - Number(a.avg_review_score));
  const stateLeader = [...states].sort((a, b) => Number(b.delivered_orders) - Number(a.delivered_orders))[0];
  const stateDelayLeader = [...states].sort((a, b) => Number(b.avg_delay_days) - Number(a.avg_delay_days))[0];
  const ratingLow = ratings.at(-1);
  const ratingHigh = ratings[0];
  const delayReviewCorrelation = stateMetricCorrelation(states, reviews);
  const recommendations = [];
  if (stateDelayLeader && Number(stateDelayLeader.avg_delay_days) > 0) {
    recommendations.push({ title: `Investigate delivery delays in ${stateDelayLeader.customer_state}`, detail: `Average delay is ${Number(stateDelayLeader.avg_delay_days).toFixed(1)} days.`, icon: Truck, tone: "red", target: "states", action: "View state" });
  }
  if (ratingLow && Number(ratingLow.avg_review_score) < 4) {
    recommendations.push({ title: `Review customer feedback in ${ratingLow.customer_state}`, detail: `The lowest state rating is ${Number(ratingLow.avg_review_score).toFixed(1)} out of 5.`, icon: Star, tone: "amber", target: "customer", action: "View ratings" });
  }
  if (stateLeader) {
    recommendations.push({ title: `Study order volume in ${stateLeader.customer_state}`, detail: `${Number(stateLeader.delivered_orders).toLocaleString()} delivered orders in the state summary.`, icon: TrendingUp, tone: "green", target: "rankings", action: "View ranking" });
  }
  return (
    <div className="reference-dashboard">
      <div className="metric-grid reference-metrics">
        <MetricCard icon={Box} title="Total orders" value={dashboard.total_orders.toLocaleString()} change="Orders analyzed" tone="blue" onClick={() => navigate("delivery")} />
        <MetricCard icon={ChartColumnIncreasing} title="Total revenue" value={currency(dashboard.total_revenue)} change="Payment total" tone="green" onClick={() => navigate("revenue")} />
        <MetricCard icon={Star} title="Avg. review" value={dashboard.avg_review_score.toFixed(1)} suffix=" / 5" change="Average rating" tone="purple" onClick={() => navigate("customer")} />
        <MetricCard icon={Clock3} title="Avg. delay" value={delayLabel(dashboard.avg_delay_days)} change="Negative = early" tone="orange" onClick={() => navigate("delivery")} />
        <MetricCard icon={ShieldCheck} title="Delivery success" value={dashboard.delivery_success_rate.toFixed(1)} suffix="%" change="On time or early" tone="cyan" onClick={() => navigate("delivery")} />
      </div>

      <section className="ref-panel satisfaction-feature">
        <PanelTitle number="01" title="Customer satisfaction analysis" subtitle="Customer sentiment overview · state-level review averages" link="View details" onClick={() => navigate("customer")} />
        <div className="satisfaction-feature-grid">
          <div className="sentiment-list">
            <div className="sentiment-heading">State rating leaders <span>27 states</span></div>
            {ratings.slice(0, 4).map((row, index) => <div className={`sentiment-row sentiment-${index}`} key={row.customer_state}>
              <span className="sentiment-emoji">{["★", "✦", "●", "◆"][index]}</span><div><strong>{["Excellent", "Very good", "Good", "Positive"][index]} · {Number(row.avg_review_score).toFixed(1)}</strong><small>{row.customer_state} state average</small></div><b>{Number(row.reviewed_orders).toLocaleString()}</b>
              <i style={{ width: `${Number(row.avg_review_score) / 5 * 100}%` }} />
            </div>)}
          </div>
          <div className="state-orbit">
            <div className="orbit-ring orbit-outer" /><div className="orbit-ring orbit-inner" />
            <div className="orbit-center"><span>Average review</span><strong>{dashboard.avg_review_score.toFixed(1)}<small> / 5</small></strong><Stars value={dashboard.avg_review_score} /><em>{dashboard.total_orders.toLocaleString()} analyzed orders</em></div>
            {ratings.slice(0, 5).map((row, index) => <button className={`orbit-state orbit-state-${index}`} key={row.customer_state} onClick={() => navigate("customer")} title={`${row.customer_state} average review`}>
              <small>{row.customer_state}</small><strong>{Number(row.avg_review_score).toFixed(1)}</strong><span>{index === 0 ? "Top rated" : `${Number(row.reviewed_orders).toLocaleString()} reviews`}</span>
            </button>)}
          </div>
        </div>
      </section>
      <section className="ref-panel correlation-feature">
        <PanelTitle number="01A" title="Review & delay correlation" subtitle="State-level averages · directional only" />
        <div className="correlation-score"><span>Review/delay correlation</span><strong className={delayReviewCorrelation < 0 ? "good-text" : "bad-text"}>{delayReviewCorrelation.toFixed(2)}</strong><small>{delayReviewCorrelation < 0 ? "Higher delays tend to occur with lower ratings." : "No clear inverse pattern in state averages."}</small></div>
        <div className="correlation-divider" />
        <div className="mini-panel-heading">Key insights <button onClick={() => navigate("customer")}>All insights <ArrowRight size={11} /></button></div>
        {[
          { label: "Highest state rating", value: ratingHigh ? `${ratingHigh.customer_state} · ${Number(ratingHigh.avg_review_score).toFixed(1)} / 5` : "—", tone: "green", icon: "↗" },
          { label: "Lowest state rating", value: ratingLow ? `${ratingLow.customer_state} · ${Number(ratingLow.avg_review_score).toFixed(1)} / 5` : "—", tone: "red", icon: "↓" },
          { label: "Highest average delay", value: stateDelayLeader ? `${stateDelayLeader.customer_state} · ${Number(stateDelayLeader.avg_delay_days).toFixed(1)} days` : "—", tone: "blue", icon: "◷" },
        ].map((item) => <div className={`satisfaction-insight ${item.tone}`} key={item.label}><span>{item.icon}</span><div><strong>{item.label}</strong><small>{item.value}</small></div></div>)}
      </section>

      <div className="reference-grid">
        <section className="ref-panel revenue-widget">
          <PanelTitle number="02" title="Revenue analytics" subtitle="Payment value composition" link="View all" onClick={() => navigate("revenue")} />
          <div className="revenue-widget-body"><div className="revenue-donut-wrap"><ResponsiveContainer width="100%" height={145}><PieChart><Pie data={[{ name: "Item total", value: dashboard.item_total }, { name: "Freight total", value: dashboard.freight_total }]} dataKey="value" innerRadius={42} outerRadius={59} paddingAngle={4} stroke="none"><Cell fill="#04d69b" /><Cell fill="#ffc338" /></Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /></PieChart></ResponsiveContainer><div className="donut-center compact"><strong>{currency(dashboard.total_revenue)}</strong><span>payments</span></div></div>
            <div className="revenue-breakdown"><div><i className="legend-blue" />Item total <b>{currency(dashboard.item_total)}</b></div><div><i className="legend-yellow" />Freight <b>{currency(dashboard.freight_total)}</b></div><div className="top-revenue-states"><strong>Top states</strong>{stateRevenue.slice(0, 3).map((row, i) => <span key={row.customer_state}><em>{i + 1}</em>{row.customer_state}<b>{currency(row.revenue)}</b></span>)}</div></div>
          </div>
        </section>

        <section className="ref-panel delivery-widget">
          <PanelTitle number="03" title="Delivery performance" subtitle="Order outcome" link="View all" onClick={() => navigate("delivery")} />
          <div className="delivery-widget-body"><div className="order-funnel">
            <div style={{ width: "100%" }}><b>{dashboard.total_orders.toLocaleString()}</b><span>Analyzed</span></div>
            <div style={{ width: `${Math.max(63, dashboard.delivery_success_rate)}%` }}><b>{(dashboard.total_orders - dashboard.delayed_orders).toLocaleString()}</b><span>On time / early</span></div>
            <div style={{ width: `${Math.max(40, 100 - dashboard.delivery_success_rate + 30)}%` }}><b>{dashboard.delayed_orders.toLocaleString()}</b><span>Delayed</span></div>
          </div><div className="delay-legend"><strong>Delivery results</strong><span><i className="flow-green" />On time <b>{dashboard.delivery_success_rate.toFixed(1)}%</b></span><span><i className="flow-red" />Delayed <b>{(100 - dashboard.delivery_success_rate).toFixed(1)}%</b></span><div className="delay-number"><Clock3 size={14} />Avg. {delayLabel(dashboard.avg_delay_days)}</div></div></div>
        </section>



        <section className="ref-panel recommendation-widget">
          <PanelTitle number="05" title="Recommendation engine" subtitle="Based on provided Hive summaries" link="View all" onClick={() => navigate("recommendations")} />
          {recommendations.map((item) => <button className={`recommendation-row ${item.tone}`} key={item.title} onClick={() => navigate(item.target)}><span><item.icon size={15} /></span><div><strong>{item.title}</strong><small>{item.detail}</small></div><em>{item.action}</em></button>)}
        </section>
      </div>

      <div className="reference-grid reference-bottom-grid">
        <section className="ref-panel alerts-widget">
          <PanelTitle number="06" title="Alerts & monitoring" subtitle="Rule-based from state summaries" link="View all" onClick={() => navigate("alerts")} />
          <AlertPreview states={states} reviews={reviews} />
        </section>
        <section className="ref-panel ranking-widget">
          <PanelTitle number="07" title="Business rankings" subtitle="State delivery volume" link="View rankings" onClick={() => navigate("rankings")} />
          <RankPreview states={states} topRevenue={stateRevenue} />
        </section>
        <section className="ref-panel report-widget">
          <PanelTitle number="08" title="Report generator" subtitle="Create a data snapshot" link="Open" onClick={() => navigate("report")} />
          <div className="report-preview"><span><FileText size={20} /></span><strong>Executive snapshot</strong><small>KPIs · state metrics · review summary</small><button onClick={() => navigate("report")}>Build report <ArrowRight size={12} /></button></div>
        </section>
        <section className="ref-panel ai-widget">
          <PanelTitle number="09" title="Business insights" subtitle="Findings from available data" link="View all" onClick={() => navigate("health")} />
          <div className="ai-insight-intro"><Sparkles size={15} /><strong>Key findings</strong></div>
          <ol className="finding-list">
            <li><span>1</span><p>Overall review average is <b>{dashboard.avg_review_score.toFixed(1)} / 5</b> across analyzed orders.</p></li>
            <li><span>2</span><p>Delivery success rate is <b>{dashboard.delivery_success_rate.toFixed(1)}%</b> using positive/zero delay as success.</p></li>
            <li><span>3</span><p><b>{states.length} states</b> are represented in the supplied summary data.</p></li>
          </ol>
          <button className="ask-insight" onClick={() => navigate("health")}>Explore business health <ArrowRight size={12} /></button>
        </section>
      </div>
    </div>
  );
}

function PanelTitle({ number, title, subtitle, link, onClick }) {
  return <div className="panel-title"><div className="panel-heading"><div className="panel-name"><span>{number}</span><h2>{title}</h2></div><p>{subtitle}</p></div>{link && <button className="panel-link" onClick={onClick}>{link}<ArrowRight size={14} /></button>}</div>;
}

function AlertPreview({ states, reviews }) {
  const reviewByState = new globalThis.Map(reviews.map((row) => [row.customer_state, row]));
  const alerts = states.filter((row) => {
    const rating = Number(reviewByState.get(row.customer_state)?.avg_review_score || 0);
    return Number(row.avg_delay_days) > 0 || rating > 0 && rating < 3.5;
  }).slice(0, 3);
  if (!alerts.length) return <div className="no-alerts"><ShieldCheck size={15} />No states currently match these alert rules.</div>;
  return <div className="alert-preview-list">{alerts.map((row) => {
    const review = reviewByState.get(row.customer_state);
    const delayed = Number(row.avg_delay_days) > 0;
    return <div className={`alert-preview-row ${delayed ? "alert-danger" : "alert-warning"}`} key={row.customer_state}>
      <span>{delayed ? <Clock3 size={14} /> : <Star size={14} />}</span>
      <div><strong>{delayed ? "High average delay" : "Low average review"}</strong><small>{row.customer_state} · {delayed ? `${Number(row.avg_delay_days).toFixed(1)} delay days` : `${Number(review?.avg_review_score).toFixed(1)} / 5 review average`}</small></div>
      <em>{delayed ? "HIGH" : "MED"}</em>
    </div>;
  })}</div>;
}

function RankPreview({ states, topRevenue }) {
  const leaders = [...states].sort((a, b) => Number(b.delivered_orders) - Number(a.delivered_orders)).slice(0, 4);
  const low = [...states].sort((a, b) => Number(a.delivered_orders) - Number(b.delivered_orders)).slice(0, 4);
  return <div className="rank-preview-columns">
    <div><h3>Top delivered</h3>{leaders.map((row, index) => <div className="rank-preview-row" key={row.customer_state}><span>{index + 1}</span><b>{row.customer_state}</b><strong>{Number(row.delivered_orders).toLocaleString()}</strong></div>)}</div>
    <div><h3>Revenue leaders</h3>{topRevenue.slice(0, 4).map((row, index) => <div className="rank-preview-row revenue-rank" key={row.customer_state}><span>{index + 1}</span><b>{row.customer_state}</b><strong>{currency(row.revenue)}</strong></div>)}</div>
  </div>;
}

function HealthPage({ dashboard, states, reviews, navigate }) {
  const bestReview = [...reviews].sort((a, b) => Number(b.avg_review_score) - Number(a.avg_review_score))[0];
  const worstReview = [...reviews].sort((a, b) => Number(a.avg_review_score) - Number(b.avg_review_score))[0];
  const positiveStates = states.filter((row) => Number(row.avg_delay_days) <= 0).length;
  return <>
    <PageHeading eyebrow="EXECUTIVE SUMMARY" title="Business health" description="A focused scorecard of the supplied delivery, payment and review analytics." />
    <div className="stat-strip"><MiniStat label="Payment total" value={currency(dashboard.total_revenue)} icon={ChartColumnIncreasing} /><MiniStat label="Delivery success" value={`${dashboard.delivery_success_rate.toFixed(1)}%`} icon={ShieldCheck} /><MiniStat label="On-time / early states" value={`${positiveStates} / ${states.length}`} icon={Map} /></div>
    <div className="reference-grid">
      <section className="ref-panel"><PanelTitle number="01" title="Business health scorecard" subtitle="Current analyzed dataset" /><HealthGauge label="Delivery success" value={dashboard.delivery_success_rate} color="#10d6a0" /><HealthGauge label="Average review score" value={dashboard.avg_review_score / 5 * 100} color="#b76eff" /></section>
      <section className="ref-panel"><PanelTitle number="02" title="Customer feedback" subtitle="Highest and lowest state rating" /><div className="health-comparison"><div className="health-best"><span>Highest rating</span><strong>{bestReview?.customer_state || "—"}</strong><b>{Number(bestReview?.avg_review_score || 0).toFixed(2)} / 5</b></div><div className="health-worst"><span>Lowest rating</span><strong>{worstReview?.customer_state || "—"}</strong><b>{Number(worstReview?.avg_review_score || 0).toFixed(2)} / 5</b></div></div><button className="compare-button" onClick={() => navigate("customer")}>Open customer analytics <ArrowRight size={12} /></button></section>
      <section className="ref-panel"><PanelTitle number="03" title="Regional delivery health" subtitle="Average delay by customer state" /><StateDelayBars states={states.slice(0, 12)} /></section>
      <section className="ref-panel"><PanelTitle number="04" title="Revenue concentration" subtitle="Top five states by payment total" /><RankPreview states={states} topRevenue={dashboard.top_revenue_states || []} /></section>
    </div>
  </>;
}

function HealthGauge({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  return <div className="health-gauge-row"><div><strong>{label}</strong><b>{pct.toFixed(1)}%</b></div><span><i style={{ width: `${pct}%`, background: color }} /></span></div>;
}

function StateDelayBars({ states }) {
  return <div className="state-delay-list">{states.map((row) => <div key={row.customer_state}><b>{row.customer_state}</b><span><i style={{ width: `${Math.min(100, Math.max(4, Math.abs(Number(row.avg_delay_days)) / 25 * 100))}%`, background: Number(row.avg_delay_days) > 0 ? "#ff647c" : "#08d39e" }} /></span><strong>{Number(row.avg_delay_days).toFixed(1)}d</strong></div>)}</div>;
}

function RecommendationsPage({ states, reviews, navigate }) {
  const delayStates = [...states].filter((row) => Number(row.avg_delay_days) > 0).sort((a, b) => Number(b.avg_delay_days) - Number(a.avg_delay_days)).slice(0, 5);
  const reviewWarnings = [...reviews].filter((row) => Number(row.avg_review_score) > 0 && Number(row.avg_review_score) < 3.8).sort((a, b) => Number(a.avg_review_score) - Number(b.avg_review_score)).slice(0, 5);
  const topOrders = [...states].sort((a, b) => Number(b.delivered_orders) - Number(a.delivered_orders)).slice(0, 3);
  return <>
    <PageHeading eyebrow="DECISION SUPPORT" title="Recommendation engine" description="Rule-based suggestions calculated from state delivery and review summaries." />
    <div className="recommendation-page-list">
      {delayStates.map((row) => <RecommendationCard key={`delay-${row.customer_state}`} icon={Truck} tone="red" title={`Review delivery operations in ${row.customer_state}`} detail={`Average delivery delay is ${Number(row.avg_delay_days).toFixed(2)} days. Compare local fulfillment and transport performance.`} action={() => navigate("states")} />)}
      {reviewWarnings.map((row) => <RecommendationCard key={`review-${row.customer_state}`} icon={Star} tone="amber" title={`Investigate customer feedback in ${row.customer_state}`} detail={`The average state review is ${Number(row.avg_review_score).toFixed(2)} / 5 across ${Number(row.reviewed_orders).toLocaleString()} reviewed orders.`} action={() => navigate("customer")} />)}
      {topOrders.map((row) => <RecommendationCard key={`volume-${row.customer_state}`} icon={TrendingUp} tone="green" title={`Use ${row.customer_state} as a delivery benchmark`} detail={`${Number(row.delivered_orders).toLocaleString()} delivered orders appear in the state summary.`} action={() => navigate("rankings")} />)}
      {!delayStates.length && !reviewWarnings.length && <div className="no-alerts">No state summaries meet the configured recommendation rules.</div>}
    </div>
    <p className="data-caveat">Recommendations use thresholds on current summary values only; validate operational context before taking action.</p>
  </>;
}

function RecommendationCard({ icon: Icon, tone, title, detail, action }) {
  return <button className={`recommendation-card ${tone}`} onClick={action}><span><Icon size={19} /></span><div><strong>{title}</strong><p>{detail}</p></div><em>Explore <ArrowRight size={12} /></em></button>;
}

function AlertsPage({ states, reviews, navigate }) {
  const reviewByState = new globalThis.Map(reviews.map((row) => [row.customer_state, row]));
  const alertStates = states.map((row) => ({ ...row, avg_review_score: reviewByState.get(row.customer_state)?.avg_review_score || 0 })).filter((row) => Number(row.avg_delay_days) > 0 || Number(row.avg_review_score) > 0 && Number(row.avg_review_score) < 3.5);
  return <>
    <PageHeading eyebrow="MONITORING" title="Alerts & monitoring" description="Transparent alerts from explicit delivery-delay and review thresholds." action={<button className="outline-button" onClick={() => navigate("recommendations")}><Lightbulb size={15} />Recommendations</button>} />
    <div className="stat-strip"><MiniStat label="States meeting alert rules" value={alertStates.length} icon={ShieldAlert} /><MiniStat label="Delay rule" value="Average > 0 days" icon={Clock3} /><MiniStat label="Review rule" value="Average < 3.5 / 5" icon={Star} /></div>
    <div className="alert-page-list">{alertStates.map((row) => {
      const delayed = Number(row.avg_delay_days) > 0;
      return <div className={`alert-page-card ${delayed ? "alert-danger" : "alert-warning"}`} key={row.customer_state}><span>{delayed ? <Clock3 size={18} /> : <Star size={18} />}</span><div><strong>{delayed ? "High average delivery delay" : "Low average customer rating"}</strong><p>{row.customer_state} · {delayed ? `${Number(row.avg_delay_days).toFixed(2)} days average delay` : `${Number(row.avg_review_score).toFixed(2)} average review score`}</p></div><em>{delayed ? "HIGH" : "MEDIUM"}</em></div>;
    })}</div>
    <p className="data-caveat">Alerts are derived from static Hive summaries and update when your friend reruns the data sync.</p>
  </>;
}

function RankingsPage({ states, dashboard, navigate }) {
  const delivered = [...states].sort((a, b) => Number(b.delivered_orders) - Number(a.delivered_orders));
  return <>
    <PageHeading eyebrow="PERFORMANCE LEAGUE" title="Business rankings" description="Compare state delivery volumes and payment totals from the supplied analytics." />
    <div className="content-grid two-columns">
      <section className="ref-panel"><PanelTitle number="01" title="States by delivered orders" subtitle="Descending, state summary" /><div className="table-wrap"><table><thead><tr><th>Rank</th><th>State</th><th>Delivered orders</th><th>Avg delay</th><th>Performance</th></tr></thead><tbody>{delivered.map((row, index) => <tr key={row.customer_state}><td><span className="rank">{index + 1}</span></td><td><b>{row.customer_state}</b></td><td>{Number(row.delivered_orders).toLocaleString()}</td><td className={Number(row.avg_delay_days) > 0 ? "bad-text" : "good-text"}>{Number(row.avg_delay_days).toFixed(2)}d</td><td><span className={`score-chip ${Number(row.avg_delay_days) > 0 ? "watch" : ""}`}>{Number(row.avg_delay_days) > 0 ? "Review" : "On track"}</span></td></tr>)}</tbody></table></div></section>
      <section className="ref-panel"><PanelTitle number="02" title="Revenue leaders" subtitle="Sorted from delivery payment totals" /><RankPreview states={states} topRevenue={dashboard.top_revenue_states || []} /><button className="compare-button" onClick={() => navigate("revenue")}>Open revenue analytics <ArrowRight size={12} /></button></section>
    </div>
  </>;
}

function ReportPage({ dashboard, states, reviews }) {
  const downloadReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      source: "dashboard API",
      metrics: dashboard,
      state_summary: states,
      review_summary: reviews,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ecommerce-bi-report.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  return <>
    <PageHeading eyebrow="REPORTING" title="Report generator" description="Export a shareable snapshot from the analytics currently served by the API." />
    <div className="report-builder">
      <div className="report-builder-icon"><FileText size={30} /></div><div><h2>Executive analytics snapshot</h2><p>Includes KPI totals, state delivery summaries, and state review aggregates. Delivery detail records can be browsed separately in the delivery section.</p></div>
      <div className="report-contents">{[["Summary KPIs", "Orders · Revenue · Review · Delivery"], ["State comparison", `${states.length} state records`], ["Review summary", `${reviews.length} state aggregates`]].map(([title, detail]) => <div key={title}><span><PackageCheck size={15} /></span><strong>{title}</strong><small>{detail}</small></div>)}</div>
      <button className="download-report" onClick={downloadReport}><Download size={16} />Download JSON report</button>
    </div>
  </>;
}

function StatePage({ states, navigate }) {
  const chartData = states.slice(0, 12).map((row) => ({ ...row, avg_delay_days: Number(row.avg_delay_days) || 0 }));
  const mostOrders = [...states].sort((a, b) => Number(b.delivered_orders) - Number(a.delivered_orders))[0];
  return (
    <>
      <PageHeading eyebrow="REGIONAL PERFORMANCE" title="State intelligence" description="Compare order volume and average delivery delay across all 27 states." action={<button className="outline-button" onClick={() => navigate("delivery")}><Truck size={15} />Delivery details</button>} />
      <div className="stat-strip"><MiniStat label="States tracked" value={states.length} icon={Map} /><MiniStat label="Top state by orders" value={mostOrders?.customer_state || "—"} icon={PackageCheck} /><MiniStat label="State with highest delay" value={states[0]?.customer_state || "—"} icon={Clock3} /></div>
      <div className="content-grid two-columns">
        <section className="panel state-trend-panel"><PanelTitle number="01" title="Average delivery delay" subtitle="State-by-state delay profile · below zero means early" /><div className="chart-area"><ResponsiveContainer width="100%" height={320}><AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}><defs><linearGradient id="stateDelayFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4c91ff" stopOpacity={0.42} /><stop offset="100%" stopColor="#4c91ff" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid stroke="#1d2d4b" vertical={false} /><XAxis dataKey="customer_state" tick={axisTick} axisLine={false} tickLine={false} /><YAxis tick={axisTick} axisLine={false} tickLine={false} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(2)} days`, "Average delay"]} /><ReferenceLine y={0} stroke="#ffbd4a" strokeDasharray="4 4" /><Area type="monotone" dataKey="avg_delay_days" stroke="#58a0ff" strokeWidth={2.5} fill="url(#stateDelayFill)" activeDot={{ r: 5, fill: "#a3ceff", stroke: "#0a1834", strokeWidth: 2 }} /></AreaChart></ResponsiveContainer></div></section>
        <section className="panel"><PanelTitle number="02" title="State summary" subtitle="Sorted by average delay, highest first" /><div className="table-wrap tall-table"><table><thead><tr><th>State</th><th>Delivered</th><th>Total delay</th><th>Avg. delay</th></tr></thead><tbody>{states.map((row) => <tr key={row.customer_state}><td><span className="state-name"><i className="state-dot dot-1" />{row.customer_state}</span></td><td>{Number(row.delivered_orders).toLocaleString()}</td><td>{Number(row.total_delay_days).toLocaleString(undefined, { maximumFractionDigits: 1 })}</td><td className={Number(row.avg_delay_days) > 0 ? "bad-text" : "good-text"}>{delayLabel(row.avg_delay_days)}</td></tr>)}</tbody></table></div></section>
      </div>
    </>
  );
}

function ReviewPage({ reviews }) {
  const sorted = [...reviews].sort((a, b) => Number(b.avg_review_score) - Number(a.avg_review_score));
  const reviewedOrders = reviews.reduce((total, row) => total + Number(row.reviewed_orders), 0);
  const weightedRating = reviews.reduce((total, row) => total + Number(row.avg_review_score) * Number(row.reviewed_orders), 0) / (reviewedOrders || 1);
  return (
    <>
      <PageHeading eyebrow="CUSTOMER EXPERIENCE" title="Review analytics" description="Review volumes and average ratings by customer state." />
      <div className="stat-strip"><MiniStat label="States with reviews" value={reviews.length} icon={Map} /><MiniStat label="Average rating" value={`${weightedRating.toFixed(2)} / 5`} icon={Star} /><MiniStat label="Reviewed orders" value={reviewedOrders.toLocaleString()} icon={Users} /></div>
      <div className="content-grid two-columns">
        <section className="panel review-radar-panel"><PanelTitle number="01" title="Review score constellation" subtitle="Top 12 state averages · 0 to 5 rating scale" /><div className="chart-area"><ResponsiveContainer width="100%" height={330}><RadarChart data={sorted.slice(0, 12)} outerRadius="75%"><PolarGrid stroke="#263958" /><PolarAngleAxis dataKey="customer_state" tick={{ ...axisTick, fontSize: 10 }} /><PolarRadiusAxis domain={[0, 5]} tick={axisTick} tickCount={6} axisLine={false} /><Radar name="Average review" dataKey="avg_review_score" stroke="#c17bff" strokeWidth={2.5} fill="#a354e8" fillOpacity={0.3} dot={{ r: 3, fill: "#e2bdff", stroke: "#30244f", strokeWidth: 1 }} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toFixed(2)} / 5`, "Average review"]} /></RadarChart></ResponsiveContainer></div></section>
        <section className="panel"><PanelTitle number="02" title="State review summary" subtitle="Sorted by average rating" /><div className="table-wrap tall-table"><table><thead><tr><th>State</th><th>Orders reviewed</th><th>Avg. score</th><th>Rating</th></tr></thead><tbody>{sorted.map((row) => <tr key={row.customer_state}><td><span className="state-name"><i className="state-dot dot-3" />{row.customer_state}</span></td><td>{Number(row.reviewed_orders).toLocaleString()}</td><td>{Number(row.avg_review_score).toFixed(2)}</td><td><Stars value={Number(row.avg_review_score)} /></td></tr>)}</tbody></table></div></section>
      </div>
    </>
  );
}

function DeliveryPage({ deliveries, total, offset, limit, setOffset, states, stateFilter, cityFilter, setStateFilter, setCityFilter, cities, loading }) {
  const outcomeData = [
    { name: "On time / early", value: deliveries.filter((row) => Number(row.delay_days) <= 0).length },
    { name: "Delayed", value: deliveries.filter((row) => Number(row.delay_days) > 0).length },
  ];
  return (
    <>
      <PageHeading eyebrow="FULFILLMENT" title="Delivery performance" description="Inspect order outcomes, delivery delays and the source records behind the analysis." />
      <div className="filter-bar"><div className="filter-label"><Search size={16} />Filter records</div><select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}><option value="">All states</option>{states.map((row) => <option key={row.customer_state} value={row.customer_state}>{row.customer_state}</option>)}</select><select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option value="">All cities</option>{cities.map((city) => <option key={city.customer_city} value={city.customer_city}>{city.customer_city}</option>)}</select><span className="result-count">{total.toLocaleString()} matching rows</span></div>
      <div className="stat-strip"><MiniStat label="Matching records" value={total.toLocaleString()} icon={Box} /><MiniStat label="On time / early (page)" value={outcomeData[0].value.toLocaleString()} icon={PackageCheck} /><MiniStat label="Delayed (page)" value={outcomeData[1].value.toLocaleString()} icon={Clock3} /></div>
      <section className="panel delivery-scatter-panel"><PanelTitle number="01" title="Order delay vs. review score" subtitle="Each point is an order on this page · positive delay means late" /><div className="chart-area"><ResponsiveContainer width="100%" height={300}><ScatterChart margin={{ top: 12, right: 22, bottom: 16, left: 4 }}><CartesianGrid stroke="#1d2d4b" /><XAxis type="number" dataKey="delay_days" name="Delay" unit=" days" tick={axisTick} axisLine={false} tickLine={false} /><YAxis type="number" dataKey="avg_review_score" name="Review" unit=" / 5" domain={[0, 5]} tick={axisTick} axisLine={false} tickLine={false} /><Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={tooltipStyle} formatter={(value, name) => [name === "Delay" ? `${Number(value).toFixed(2)} days` : `${Number(value).toFixed(1)} / 5`, name]} labelFormatter={() => "Order record"} /><ReferenceLine x={0} stroke="#ffbd4a" strokeDasharray="4 4" /><Scatter name="On time / early" data={deliveries.filter((row) => Number(row.delay_days) <= 0)} fill="#22d6aa" fillOpacity={0.72} /><Scatter name="Delayed" data={deliveries.filter((row) => Number(row.delay_days) > 0)} fill="#ff687f" fillOpacity={0.82} /></ScatterChart></ResponsiveContainer></div><div className="scatter-legend"><span><i className="on-time-dot" />On time / early</span><span><i className="late-dot" />Delayed</span><small>{loading ? "Loading page…" : `Showing ${deliveries.length} records on this page`}</small></div></section>
      <section className="panel delivery-records-panel"><PanelTitle number="02" title="Delivery analysis records" subtitle="Filter and page through the full order dataset" /><div className="table-wrap tall-table"><table><thead><tr><th>Order ID</th><th>City</th><th>State</th><th>Item total</th><th>Freight</th><th>Payment total</th><th>Review</th><th>Delay days</th><th>Result</th></tr></thead><tbody>{loading ? <tr><td colSpan="9" className="table-note">Loading delivery records…</td></tr> : deliveries.map((row) => <tr key={row.order_id}><td className="order-id">{row.order_id}</td><td>{row.customer_city}</td><td>{row.customer_state}</td><td>{currency(row.item_total)}</td><td>{currency(row.freight_total)}</td><td>{currency(row.payment_total)}</td><td>{Number(row.avg_review_score).toFixed(1)}</td><td className={Number(row.delay_days) > 0 ? "bad-text" : "good-text"}>{Number(row.delay_days).toFixed(1)}</td><td><span className={`result-pill ${Number(row.delay_days) > 0 ? "delayed" : ""}`}>{row.delivery_result}</span></td></tr>)}</tbody></table></div><div className="pagination"><span>{total ? `Showing ${offset + 1}–${Math.min(offset + deliveries.length, total)} of ${total.toLocaleString()}` : "Showing 0–0 of 0"}</span><div><button disabled={loading || offset === 0} onClick={() => setOffset((current) => Math.max(0, current - limit))}>Previous</button><button disabled={loading || offset + deliveries.length >= total} onClick={() => setOffset((current) => Math.min(current + limit, Math.max(0, total - 1)))}>Next</button></div></div></section>
    </>
  );
}

function RevenuePage({ dashboard }) {
  const breakdown = [
    { name: "Item total", value: dashboard.item_total, color: "#498cff" },
    { name: "Freight total", value: dashboard.freight_total, color: "#ffbd4a" },
  ];
  const top = dashboard.top_revenue_states || [];
  return (
    <>
      <PageHeading eyebrow="SALES PERFORMANCE" title="Revenue analytics" description="Payment totals are derived from item, freight and payment values in delivery analysis." />
      <div className="stat-strip"><MiniStat label="Total payment value" value={currency(dashboard.total_revenue)} icon={ChartColumnIncreasing} /><MiniStat label="Item value" value={currency(breakdown[0].value)} icon={Box} /><MiniStat label="Freight value" value={currency(breakdown[1].value)} icon={Truck} /></div>
      <div className="content-grid two-columns">
        <section className="panel"><PanelTitle number="01" title="Revenue by state" subtitle="Payment totals, highest first" /><div className="chart-area"><ResponsiveContainer width="100%" height={340}><BarChart data={top} layout="vertical" margin={{ top: 8, right: 25, left: 15, bottom: 0 }}><CartesianGrid stroke="#1d2d4b" horizontal={false} /><XAxis type="number" tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(value / 1000)}k`} /><YAxis type="category" dataKey="customer_state" tick={axisTick} axisLine={false} tickLine={false} width={40} /><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /><Bar dataKey="revenue" radius={[0, 5, 5, 0]}>{top.map((row, index) => <Cell key={row.customer_state} fill={chartPalette[(index + 1) % chartPalette.length]} />)}</Bar></BarChart></ResponsiveContainer></div></section>
        <section className="panel"><PanelTitle number="02" title="Payment composition" subtitle="Item value and freight based on order detail" /><div className="donut-wrap revenue-donut"><ResponsiveContainer width="100%" height={260}><PieChart><Pie data={breakdown} dataKey="value" innerRadius={72} outerRadius={99} paddingAngle={5} stroke="none">{breakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={tooltipStyle} formatter={(value) => currency(value)} /></PieChart></ResponsiveContainer><div className="donut-center"><strong>{currency(dashboard.total_revenue)}</strong><span>payments</span></div></div><div className="legend-list">{breakdown.map((item) => <div key={item.name}><span className="legend-label"><i style={{ background: item.color }} />{item.name}</span><strong>{currency(item.value)}</strong></div>)}</div></section>
      </div>
      <div className="panel top-revenue-panel"><PanelTitle number="03" title="Top revenue states" subtitle="Ranked from delivery analysis payment totals" /><div className="revenue-list">{top.slice(0, 10).map((row, index) => <div className="revenue-row" key={row.customer_state}><span className="rank">{index + 1}</span><strong>{row.customer_state}</strong><div className="revenue-track"><i style={{ width: `${Math.max(4, row.revenue / (top[0]?.revenue || 1) * 100)}%` }} /></div><span>{currency(row.revenue)}</span></div>)}</div></div>
    </>
  );
}

function LocationsPage({ cities, navigate }) {
  return (
    <>
      <PageHeading eyebrow="CUSTOMER GEOGRAPHY" title="City insights" description="Order coverage by customer city. Customer-specific profiles are not available in the provided Hive schemas." action={<button className="outline-button" onClick={() => navigate("delivery")}><Truck size={15} />Order details</button>} />
      <div className="stat-strip"><MiniStat label="Cities represented" value={cities.length} icon={Map} /><MiniStat label="Highest city order count" value={cities[0]?.customer_city || "—"} icon={Users} /><MiniStat label="Orders in top city" value={Number(cities[0]?.orders || 0).toLocaleString()} icon={Box} /></div>
      <div className="content-grid two-columns">
        <section className="panel city-treemap-panel"><PanelTitle number="01" title="City order footprint" subtitle="Tile area represents order volume · top 12 cities" /><div className="chart-area"><ResponsiveContainer width="100%" height={350}><Treemap data={cities.slice(0, 12).map((row) => ({ name: row.customer_city, orders: Number(row.orders) }))} dataKey="orders" aspectRatio={1.5} stroke="#0b1830" content={<CityTreemapCell />}><Tooltip contentStyle={tooltipStyle} formatter={(value) => [`${Number(value).toLocaleString()} orders`, "Volume"]} /></Treemap></ResponsiveContainer></div></section>
        <section className="panel"><PanelTitle number="02" title="Cities in data" subtitle={`${cities.length} distinct cities from available orders`} /><div className="city-chips">{cities.slice(0, 160).map((row) => <span key={row.customer_city}>{row.customer_city}</span>)}</div>{cities.length > 160 && <div className="table-note">Showing the 160 highest-volume cities.</div>}</section>
      </div>
    </>
  );
}

function CityTreemapCell({ x, y, width, height, name, index = 0 }) {
  const color = chartPalette[(index + 5) % chartPalette.length];
  const showLabel = width > 48 && height > 32;
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={5} fill={color} fillOpacity={0.78} stroke="#0b1830" strokeWidth={3} />
      {showLabel && <text x={x + 9} y={y + 18} fill="#061128" fontSize={Math.min(12, Math.max(8, width / 12))} fontWeight={700}>{name}</text>}
    </g>
  );
}

function MiniStat({ label, value, icon: Icon }) {
  return <div className="mini-stat"><span className="mini-stat-icon"><Icon size={18} /></span><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function Insight({ icon: Icon, tone, title, text }) {
  return <div className="insight-row"><span className={`insight-icon ${tone}`}><Icon size={17} /></span><div><strong>{title}</strong><p>{text}</p></div><ArrowRight size={14} className="muted-arrow" /></div>;
}

function Stars({ value }) {
  return <span className="stars">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={12} fill={index < Math.round(value) ? "currentColor" : "none"} />)}</span>;
}

function reviewFor(reviews, state) {
  return Number(reviews.find((row) => row.customer_state === state)?.avg_review_score || 0);
}

function stateMetricCorrelation(states, reviews) {
  const ratings = new globalThis.Map(reviews.map((row) => [row.customer_state, Number(row.avg_review_score)]));
  const pairs = states
    .filter((row) => ratings.has(row.customer_state))
    .map((row) => [Number(row.avg_delay_days), ratings.get(row.customer_state)]);
  if (pairs.length < 2) return 0;
  const avgX = pairs.reduce((sum, pair) => sum + pair[0], 0) / pairs.length;
  const avgY = pairs.reduce((sum, pair) => sum + pair[1], 0) / pairs.length;
  const covariance = pairs.reduce((sum, pair) => sum + (pair[0] - avgX) * (pair[1] - avgY), 0);
  const spreadX = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair[0] - avgX) ** 2, 0));
  const spreadY = Math.sqrt(pairs.reduce((sum, pair) => sum + (pair[1] - avgY) ** 2, 0));
  return spreadX && spreadY ? covariance / (spreadX * spreadY) : 0;
}

function delayLabel(value) {
  const days = Number(value) || 0;
  return `${Math.abs(days).toFixed(1)} days ${days < 0 ? "early" : "late"}`;
}

const axisTick = { fill: "#8290ad", fontSize: 11 };
const tooltipStyle = { background: "#faf8f8", border: "2px solid #000000", borderRadius: 8, color: "#090a0a" };

export default App;
// eff4ff