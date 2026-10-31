import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  getDashboardMetrics,
  getQuestionsPerDayData,
  getInitialActionLog,
  getSimulatedNextAction,
  getNeedsHumanCases,
  getSalesLeads,
  getNowTime,
} from '../api/mock';
import Sticker from '../components/Sticker';

export const DashboardPage = () => {
  const { currentMerchant } = useAuth();

  // Mode: 'merchant' (Personalized Store) or 'cluster' (Paytm Ops Command Center)
  const [viewMode, setViewMode] = useState('merchant');

  // Ops Cluster State
  const [metrics, setMetrics] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [actionLogs, setActionLogs] = useState([]);
  const [humanCases, setHumanCases] = useState([]);
  const [salesLeads, setSalesLeads] = useState({ new: [], talking: [], booked: [] });
  const [simCounter, setSimCounter] = useState(0);
  const [toastMessage, setToastMessage] = useState(null);
  const [liveStreamRunning, setLiveStreamRunning] = useState(true);

  // Load initial data for ops cluster
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getDashboardMetrics(),
      getQuestionsPerDayData(),
      getInitialActionLog(),
      getNeedsHumanCases(),
      getSalesLeads(),
    ]).then(([m, c, a, h, l]) => {
      if (isMounted) {
        setMetrics(m);
        setChartData(c);
        setActionLogs(a);
        setHumanCases(h);
        setSalesLeads(l);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for live events cross-posted from the Demo Chat Page
  useEffect(() => {
    const handleNewAction = (e) => {
      const newAction = e.detail;
      if (!newAction) return;

      setActionLogs((current) => [newAction, ...current.slice(0, 7)]);
      setToastMessage(`⚡ Live Action from Demo Chat: ${newAction.action}`);

      // Bump Solved by Saathi counter
      setMetrics((prev) =>
        prev.map((m) =>
          m.label === 'Solved by Saathi' && m.count
            ? { ...m, count: m.count + 1, value: `${(((m.count + 1) / (6750 + 1)) * 100).toFixed(1)}%` }
            : m
        )
      );
    };

    window.addEventListener('saathi:new_action', handleNewAction);
    return () => {
      window.removeEventListener('saathi:new_action', handleNewAction);
    };
  }, []);

  // Clear toast after 4s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Simulate new action log entry every 6 seconds when live stream is active
  useEffect(() => {
    if (!liveStreamRunning) return;

    const interval = setInterval(async () => {
      setSimCounter((prev) => {
        const nextCount = prev + 1;
        getSimulatedNextAction(nextCount).then((newRow) => {
          setActionLogs((currentLogs) => [newRow, ...currentLogs.slice(0, 7)]);

          // Update metrics dynamically
          setMetrics((currentMetrics) =>
            currentMetrics.map((m) => {
              if (m.label === 'Solved by Saathi' && newRow.status === 'Solved' && m.count) {
                const nextCount = m.count + 1;
                return {
                  ...m,
                  count: nextCount,
                  value: `${((nextCount / 6750) * 100).toFixed(1)}%`,
                  subtext: `${nextCount.toLocaleString()} out of 6,750 questions without humans`,
                };
              }
              return m;
            })
          );
        });
        return nextCount;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [liveStreamRunning]);

  // Handle human case assignment and resolution
  const handleTakeCase = (caseId) => {
    setHumanCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? { ...c, status: 'Taken', takenBy: 'You (Senior Desk Officer)' }
          : c
      )
    );
    setToastMessage(`Case ${caseId} assigned to your desk.`);
  };

  const handleResolveCase = (caseId) => {
    setHumanCases((prev) => prev.filter((c) => c.id !== caseId));
    setToastMessage(`Case ${caseId} resolved and closed.`);
  };

  // Move lead between Kanban stages
  const advanceLead = (leadId, currentStage) => {
    setSalesLeads((prev) => {
      if (currentStage === 'new') {
        const item = prev.new.find((l) => l.id === leadId);
        if (!item) return prev;
        const advanced = {
          ...item,
          status: 'Merchant confirmed requirement on WhatsApp',
        };
        setToastMessage(`Lead ${item.shop} moved to Talking stage!`);
        return {
          ...prev,
          new: prev.new.filter((l) => l.id !== leadId),
          talking: [advanced, ...prev.talking],
        };
      }
      if (currentStage === 'talking') {
        const item = prev.talking.find((l) => l.id === leadId);
        if (!item) return prev;
        const booked = {
          ...item,
          agent: 'Rajesh K. (Field Agent)',
          time: 'Tomorrow, 11:30 AM',
        };
        setToastMessage(`Doorstep visit booked for ${item.shop}!`);
        return {
          ...prev,
          talking: prev.talking.filter((l) => l.id !== leadId),
          booked: [booked, ...prev.booked],
        };
      }
      return prev;
    });
  };

  const merchant = currentMerchant;

  return (
    <div className="min-h-screen bg-soft-blue py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-navy text-white px-5 py-3 rounded-2xl border-2 border-yellow shadow-hard-lg flex items-center gap-3 animate-fadeIn">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow animate-ping"></span>
            <p className="font-heading font-bold text-xs sm:text-sm text-yellow">
              {toastMessage}
            </p>
          </div>
        )}

        {/* Top Header & View Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b-2 border-navy/20">
          <div>
            <div className="flex items-center gap-3">
              <Sticker rotate="-rotate-1" color="bg-yellow">
                {viewMode === 'merchant' ? 'My Store Portal' : 'Ops Command Center'}
              </Sticker>
              <span className="text-xs font-mono font-bold text-royal bg-white px-2.5 py-1 rounded-lg border border-navy/20 flex items-center gap-1.5 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                {viewMode === 'merchant'
                  ? `${merchant?.shopName || 'Store'} • Terminal: ${merchant?.terminalId}`
                  : 'Paytm Cluster Lead • Dadar West'}
              </span>
            </div>
            
            <h1 className="font-heading font-extrabold text-navy text-2xl sm:text-4xl tracking-tight mt-2">
              {viewMode === 'merchant'
                ? `${merchant?.name}'s Dashboard`
                : 'Merchant Operations & Automation'}
            </h1>
            <p className="font-body text-slate-600 text-xs sm:text-sm mt-0.5">
              {viewMode === 'merchant'
                ? `${merchant?.shopName} • ${merchant?.city} • Connected to ${merchant?.bankName}`
                : 'Real-time automated orchestration across all Mumbai merchant clusters.'}
            </p>
          </div>

          {/* View Mode Toggle Pill & Switch Account Link */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white border-2 border-navy rounded-2xl p-1 shadow-hard-sm flex items-center gap-1">
              <button
                onClick={() => setViewMode('merchant')}
                className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all ${
                  viewMode === 'merchant'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                🏪 My Store
              </button>
              <button
                onClick={() => setViewMode('cluster')}
                className={`px-3 py-1.5 rounded-xl text-xs font-heading font-bold transition-all ${
                  viewMode === 'cluster'
                    ? 'bg-navy text-white shadow-sm'
                    : 'text-slate-600 hover:text-navy'
                }`}
              >
                📊 Ops Cluster
              </button>
            </div>

            <Link
              to="/login"
              className="btn-sm-yellow text-xs py-2 px-3.5 flex items-center gap-1.5"
            >
              <span>Switch Merchant</span>
              <span>⇄</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: PERSONALIZED MERCHANT STORE DASHBOARD (Unique per logged in merchant) */}
        {/* ========================================================================= */}
        {viewMode === 'merchant' && merchant && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Merchant Profile Status Bar */}
            <div className="card-hard bg-white p-5 sm:p-6 border-2 border-navy">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="flex items-center gap-3 md:border-r border-slate-200 pr-4">
                  <div className="w-12 h-12 rounded-2xl bg-yellow border-2 border-navy flex items-center justify-center font-heading font-black text-xl text-navy shadow-hard-sm">
                    {merchant.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-base text-navy leading-tight">{merchant.name}</p>
                    <p className="text-xs text-slate-500">{merchant.shopName}</p>
                    <span className="text-[10px] font-bold text-royal bg-soft-blue px-2 py-0.5 rounded border border-navy/10 mt-1 inline-block">
                      {merchant.category}
                    </span>
                  </div>
                </div>

                <div className="md:border-r border-slate-200 pr-4">
                  <p className="text-[11px] font-heading font-bold uppercase text-slate-400">Connected Device</p>
                  <p className="font-heading font-bold text-sm text-navy mt-0.5">{merchant.soundboxModel}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-emerald-700 font-semibold">Online • Battery {merchant.soundboxBattery}</span>
                  </div>
                </div>

                <div className="md:border-r border-slate-200 pr-4">
                  <p className="text-[11px] font-heading font-bold uppercase text-slate-400">Settlement Account</p>
                  <p className="font-heading font-bold text-sm text-navy mt-0.5">{merchant.bankName}</p>
                  <p className="text-xs text-slate-500 font-mono">{merchant.accountNumber} ({merchant.ifsc})</p>
                </div>

                <div>
                  <p className="text-[11px] font-heading font-bold uppercase text-slate-400">Active Action Status</p>
                  <p className="text-xs font-semibold text-royal leading-snug mt-0.5">{merchant.pendingIssue}</p>
                  <Link to="/demo" className="text-xs font-heading font-extrabold text-sky hover:underline mt-1 inline-block">
                    Ask Saathi to resolve →
                  </Link>
                </div>
              </div>
            </div>

            {/* Personalized 4 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              
              {/* Card 1: Today's QR Collections */}
              <div className="card-hard p-5 sm:p-6 bg-white flex flex-col justify-between border-2 border-navy ring-2 ring-yellow/60">
                <div>
                  <p className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                    <span>Today's Collections</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  </p>
                  <span className="font-heading font-black text-4xl text-navy block leading-none tracking-tight">
                    {merchant.qrCollectionsToday}
                  </span>
                </div>
                <p className="font-body text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-snug">
                  Paytm Soundbox + UPI QR live collections today
                </p>
              </div>

              {/* Card 2: Monthly Volume */}
              <div className="card-hard p-5 sm:p-6 bg-white flex flex-col justify-between">
                <div>
                  <p className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                    Monthly QR Volume
                  </p>
                  <span className="font-heading font-black text-4xl text-sky block leading-none tracking-tight">
                    {merchant.monthlyVolume}
                  </span>
                </div>
                <p className="font-body text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-snug">
                  Steady monthly QR turnover across 30 days
                </p>
              </div>

              {/* Card 3: Settlement Cycle */}
              <div className="card-hard p-5 sm:p-6 bg-white flex flex-col justify-between">
                <div>
                  <p className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                    Settlement Rail
                  </p>
                  <span className="font-heading font-extrabold text-2xl text-navy block leading-snug tracking-tight">
                    {merchant.settlementCycle}
                  </span>
                </div>
                <p className="font-body text-xs text-emerald-700 font-bold mt-3 pt-3 border-t border-slate-100 leading-snug">
                  Automated IMPS Bank Credit
                </p>
              </div>

              {/* Card 4: Pre-approved Loan */}
              <div className="card-hard p-5 sm:p-6 bg-white flex flex-col justify-between">
                <div>
                  <p className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500 mb-2">
                    Pre-Approved Credit
                  </p>
                  <span className="font-heading font-black text-2xl text-royal block leading-snug tracking-tight">
                    {merchant.loanEligibility}
                  </span>
                </div>
                <p className="font-body text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-snug">
                  Zero collateral • Daily automated deduction
                </p>
              </div>

            </div>

            {/* Merchant 7-Day Sales & Transactions Line Chart */}
            <div className="card-hard p-6 sm:p-7 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                <div>
                  <h2 className="font-heading font-extrabold text-lg sm:text-xl text-navy">
                    Daily Sales & Transactions: {merchant.shopName}
                  </h2>
                  <p className="font-body text-xs text-slate-500 mt-0.5">
                    Live settlement velocity and footfall analytics
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-heading font-bold">
                  <span className="flex items-center gap-1.5 text-navy">
                    <span className="w-3 h-3 rounded-full bg-navy"></span> Daily Sales (₹)
                  </span>
                  <span className="flex items-center gap-1.5 text-sky">
                    <span className="w-3 h-3 rounded-full bg-sky"></span> Transactions Count
                  </span>
                </div>
              </div>

              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={merchant.chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="day" stroke="#0B1B3F" tick={{ fill: '#0B1B3F', fontSize: 12, fontWeight: 600 }} />
                    <YAxis stroke="#0B1B3F" tick={{ fill: '#64748B', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '2px solid #0B1B3F',
                        boxShadow: '4px 4px 0px #0B1B3F',
                        fontFamily: 'DM Sans, sans-serif',
                        fontSize: '12px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      name="Collections (₹)"
                      stroke="#0B1B3F"
                      strokeWidth={3}
                      dot={{ fill: '#0B1B3F', r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#FFC845', stroke: '#0B1B3F', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      name="Transactions"
                      stroke="#00B9F5"
                      strokeWidth={3}
                      dot={{ fill: '#00B9F5', r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Merchant Terminal Transaction Log */}
            <div className="card-hard p-6 sm:p-7 bg-white">
              <div className="flex items-center justify-between pb-4 mb-4 border-b-2 border-navy/15">
                <div>
                  <h2 className="font-heading font-extrabold text-lg sm:text-xl text-navy">
                    Terminal Payment Feed: {merchant.terminalId}
                  </h2>
                  <p className="font-body text-xs text-slate-500 mt-0.5">
                    Live Soundbox voice alerts and settlement status for {merchant.name}
                  </p>
                </div>
                <Link to="/demo" className="btn-sm-yellow text-xs py-1.5 px-3">
                  Open Saathi Chat ➔
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" role="table">
                  <thead>
                    <tr className="border-b-2 border-navy/20 font-heading font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3">Txn ID</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Customer / Mode</th>
                      <th className="py-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-body">
                    {merchant.recentTransactions.map((t) => (
                      <tr key={t.id} className="hover:bg-soft-blue/50">
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{t.time}</td>
                        <td className="py-3 px-3 font-mono font-bold text-navy whitespace-nowrap">{t.id}</td>
                        <td className="py-3 px-3 font-heading font-black text-navy">{t.amount}</td>
                        <td className="py-3 px-3 text-slate-700">
                          <span className="font-semibold text-navy">{t.customer}</span> • <span className="text-slate-500">{t.mode}</span>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-heading font-extrabold text-xs border ${
                              t.status === 'Success'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : t.status === 'Re-routed'
                                ? 'bg-sky-light text-royal border-sky'
                                : t.status === 'Reversed'
                                ? 'bg-yellow text-navy border-navy'
                                : 'bg-red-100 text-red-700 border-red-300'
                            }`}
                          >
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: PAYTM OPS CLUSTER VIEW (Aggregate Command Center with live stream) */}
        {/* ========================================================================= */}
        {viewMode === 'cluster' && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* Top Row: 4 Numbers (Big numbers, no icons) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {metrics.map((m, idx) => (
                <div
                  key={idx}
                  className={`card-hard p-5 sm:p-6 bg-white flex flex-col justify-between ${
                    m.highlight ? 'border-2 border-navy ring-2 ring-yellow/60' : ''
                  }`}
                >
                  <div>
                    <p className="font-heading font-bold text-xs uppercase tracking-wider text-slate-500 mb-2 flex items-center justify-between">
                      <span>{m.label}</span>
                      {m.highlight && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      )}
                    </p>
                    <span className="font-heading font-black text-4xl sm:text-5xl text-navy block leading-none tracking-tight">
                      {m.value}
                    </span>
                  </div>
                  <p className="font-body text-xs text-slate-600 mt-3 pt-3 border-t border-slate-100 leading-snug">
                    {m.subtext}
                  </p>
                </div>
              ))}
            </div>

            {/* Line Chart & Needs Human Cases */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left: Recharts Line Chart */}
              <div className="lg:col-span-7 card-hard p-6 sm:p-7 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <h2 className="font-heading font-extrabold text-lg sm:text-xl text-navy">
                      Questions per day: Saathi vs humans
                    </h2>
                    <p className="font-body text-xs text-slate-500 mt-0.5">
                      7-day trend across Mumbai merchant clusters
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-heading font-bold">
                    <span className="flex items-center gap-1.5 text-navy">
                      <span className="w-3 h-3 rounded-full bg-navy"></span> Saathi
                    </span>
                    <span className="flex items-center gap-1.5 text-sky">
                      <span className="w-3 h-3 rounded-full bg-sky"></span> Humans
                    </span>
                  </div>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                      <XAxis dataKey="day" stroke="#0B1B3F" tick={{ fill: '#0B1B3F', fontSize: 12, fontWeight: 600 }} />
                      <YAxis stroke="#0B1B3F" tick={{ fill: '#64748B', fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '2px solid #0B1B3F',
                          boxShadow: '4px 4px 0px #0B1B3F',
                          fontFamily: 'DM Sans, sans-serif',
                          fontSize: '12px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="saathi"
                        name="Saathi (Autonomous)"
                        stroke="#0B1B3F"
                        strokeWidth={3}
                        dot={{ fill: '#0B1B3F', r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#FFC845', stroke: '#0B1B3F', strokeWidth: 2 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="human"
                        name="Human Hand-off"
                        stroke="#00B9F5"
                        strokeWidth={3}
                        dot={{ fill: '#00B9F5', r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                        activeDot={{ r: 6, fill: '#002970', stroke: '#FFFFFF', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Right: "Needs a Human" List */}
              <div className="lg:col-span-5 card-hard p-6 sm:p-7 bg-white">
                <div className="flex items-center justify-between pb-4 border-b-2 border-navy/15 mb-4">
                  <div>
                    <h2 className="font-heading font-extrabold text-lg sm:text-xl text-navy">
                      Needs a human
                    </h2>
                    <p className="font-body text-xs text-slate-500 mt-0.5">
                      High-value or sensitive exceptions requiring approval
                    </p>
                  </div>
                  <span className="bg-yellow text-navy font-heading font-extrabold text-xs px-2.5 py-1 rounded-full border border-navy shadow-hard-sm">
                    {humanCases.filter(c => c.status !== 'Taken').length} Pending
                  </span>
                </div>

                <div className="space-y-4">
                  {humanCases.map((c) => {
                    const isTaken = c.status === 'Taken';
                    return (
                      <div
                        key={c.id}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          isTaken
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm'
                            : 'bg-soft-blue border-navy/30 hover:border-navy'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div>
                            <span className="font-heading font-bold text-sm text-navy block">
                              {c.merchant}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-500">
                              {c.tag} • {c.amount}
                            </span>
                          </div>
                          <span className={`text-[10px] font-heading font-extrabold px-2 py-0.5 rounded-md border ${
                            isTaken ? 'bg-emerald-100 text-emerald-800 border-emerald-400' : 'bg-red-100 text-red-700 border-red-300'
                          }`}>
                            {c.priority} Priority
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-body leading-relaxed mb-3">
                          <strong>AI Summary:</strong> {c.summary}
                        </p>

                        <div className="flex items-center justify-between pt-2 border-t border-navy/10">
                          <span className="text-[11px] font-mono text-slate-500">{c.id}</span>
                          
                          {isTaken ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-heading font-bold text-emerald-700 flex items-center gap-1">
                                ✓ {c.takenBy || 'Taken by You'}
                              </span>
                              <button
                                onClick={() => handleResolveCase(c.id)}
                                className="text-[11px] font-heading font-bold bg-white hover:bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300"
                              >
                                Resolve
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleTakeCase(c.id)}
                              className="btn-sm-yellow text-xs py-1 px-3"
                            >
                              Take this case →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Live Action Log Table */}
            <div className="card-hard p-6 sm:p-7 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b-2 border-navy/15">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <h2 className="font-heading font-extrabold text-lg sm:text-xl text-navy">
                      Live Action Log
                    </h2>
                  </div>
                  <p className="font-body text-xs text-slate-500 mt-0.5">
                    Real-time API executions across settlements, KYC and Soundboxes • Live synced with Demo Chat
                  </p>
                </div>
                <button
                  onClick={() => setLiveStreamRunning(!liveStreamRunning)}
                  className="text-xs font-mono font-semibold text-slate-600 bg-soft-blue px-3 py-1 rounded-lg border border-navy/20"
                >
                  {liveStreamRunning ? '● Live Stream Active' : '○ Paused'}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" role="table">
                  <thead>
                    <tr className="border-b-2 border-navy/20 font-heading font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-3">Time</th>
                      <th className="py-3 px-3">Merchant</th>
                      <th className="py-3 px-3">Action Executed</th>
                      <th className="py-3 px-3">Result</th>
                      <th className="py-3 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-body">
                    {actionLogs.map((log) => (
                      <tr
                        key={log.id}
                        className={`transition-colors duration-1000 ${
                          log.isNew ? 'bg-yellow-light/90 border-l-4 border-yellow' : 'hover:bg-soft-blue/50'
                        }`}
                      >
                        <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">{log.time}</td>
                        <td className="py-3 px-3 font-heading font-bold text-navy whitespace-nowrap">{log.merchant}</td>
                        <td className="py-3 px-3 text-slate-800">{log.action}</td>
                        <td className="py-3 px-3 text-slate-600 font-mono text-xs">{log.result}</td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full font-heading font-extrabold text-xs border ${
                              log.status === 'Solved'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : log.status === 'Booked'
                                ? 'bg-sky-light text-royal border-sky'
                                : 'bg-yellow text-navy border-navy'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Leads Kanban */}
            <div className="card-hard p-6 sm:p-7 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-6 border-b-2 border-navy/15">
                <div>
                  <h2 className="font-heading font-extrabold text-lg sm:text-xl text-navy">
                    Merchant Sales & Expansion Leads
                  </h2>
                  <p className="font-body text-xs text-slate-500 mt-0.5">
                    Saathi pre-qualifies high volume merchants from their daily Soundbox volume
                  </p>
                </div>
                <Sticker rotate="rotate-1" color="bg-yellow">
                  3x Faster Follow-up
                </Sticker>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column 1: New */}
                <div className="bg-soft-blue/80 border-2 border-navy/20 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-navy/10">
                    <span className="font-heading font-extrabold text-sm text-navy uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky"></span> New Inquiries
                    </span>
                    <span className="bg-white text-navy font-mono text-xs font-bold px-2 py-0.5 rounded-md border border-navy/20">
                      {salesLeads.new.length}
                    </span>
                  </div>
                  <div className="space-y-3 flex-1">
                    {salesLeads.new.map((lead) => (
                      <div key={lead.id} className="bg-white border-2 border-navy rounded-xl p-3.5 shadow-hard-sm">
                        <p className="font-heading font-bold text-sm text-navy">{lead.shop}</p>
                        <p className="text-xs text-slate-500 mb-2">{lead.owner}</p>
                        <div className="bg-soft-blue p-2 rounded-lg border border-navy/10 text-xs mb-2.5">
                          <p className="font-semibold text-royal">Need: {lead.need}</p>
                          <p className="text-[11px] text-slate-600 mt-0.5">Avg Vol: {lead.monthlyVol}</p>
                        </div>
                        <button
                          onClick={() => advanceLead(lead.id, 'new')}
                          className="w-full text-center text-xs font-heading font-bold bg-navy text-white hover:bg-royal py-1.5 rounded-lg transition-colors"
                        >
                          Advance to Talking ➔
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Talking */}
                <div className="bg-soft-blue/80 border-2 border-navy/20 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-navy/10">
                    <span className="font-heading font-extrabold text-sm text-navy uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow"></span> In Conversation
                    </span>
                    <span className="bg-white text-navy font-mono text-xs font-bold px-2 py-0.5 rounded-md border border-navy/20">
                      {salesLeads.talking.length}
                    </span>
                  </div>
                  <div className="space-y-3 flex-1">
                    {salesLeads.talking.map((lead) => (
                      <div key={lead.id} className="bg-white border-2 border-navy rounded-xl p-3.5 shadow-hard-sm">
                        <p className="font-heading font-bold text-sm text-navy">{lead.shop}</p>
                        <p className="text-xs text-slate-500 mb-2">{lead.owner}</p>
                        <div className="bg-yellow/20 p-2 rounded-lg border border-yellow text-xs mb-2.5">
                          <p className="font-semibold text-navy">Need: {lead.need}</p>
                          <p className="text-[11px] text-slate-700 mt-0.5">Status: {lead.status}</p>
                        </div>
                        <button
                          onClick={() => advanceLead(lead.id, 'talking')}
                          className="w-full text-center text-xs font-heading font-bold bg-yellow text-navy hover:bg-yellow-hover py-1.5 rounded-lg transition-colors border border-navy shadow-hard-sm"
                        >
                          Book Doorstep Visit ➔
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 3: Booked */}
                <div className="bg-soft-blue/80 border-2 border-navy/20 rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-navy/10">
                    <span className="font-heading font-extrabold text-sm text-navy uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Booked & Assigned
                    </span>
                    <span className="bg-white text-navy font-mono text-xs font-bold px-2 py-0.5 rounded-md border border-navy/20">
                      {salesLeads.booked.length}
                    </span>
                  </div>
                  <div className="space-y-3 flex-1">
                    {salesLeads.booked.map((lead) => (
                      <div key={lead.id} className="bg-white border-2 border-navy rounded-xl p-3.5 shadow-hard-sm">
                        <div className="flex items-start justify-between">
                          <p className="font-heading font-bold text-sm text-navy">{lead.shop}</p>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded border border-emerald-300">
                            Scheduled
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{lead.owner}</p>
                        <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-xs">
                          <p className="font-semibold text-emerald-900">Need: {lead.need}</p>
                          <p className="text-[11px] text-emerald-800 mt-0.5">
                            {lead.agent} • {lead.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default DashboardPage;
