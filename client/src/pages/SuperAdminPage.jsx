import { useState, useEffect, useCallback } from 'react';
import PageBanner from '../components/common/PageBanner';
import ScrollReveal from '../components/common/ScrollReveal';
import { api } from '../services/api';

export default function SuperAdminPage() {
  const [period, setPeriod] = useState('this_month');
  const [financials, setFinancials] = useState(null);
  const [overview, setOverview] = useState(null);
  const [subAdmins, setSubAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Subadmin reassignment modal state
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newModule, setNewModule] = useState('front-desk');
  const [updatingModule, setUpdatingModule] = useState(false);

  // Fetch consolidated financials and system overview
  const loadDashboardData = useCallback(async (currentPeriod) => {
    setLoading(true);
    setError('');
    try {
      const [finRes, ovRes, subRes] = await Promise.all([
        api.financials.getConsolidated(currentPeriod).catch(() => ({ report: null })),
        api.superAdmin.getOverview().catch(() => ({ counts: {}, modules: {} })),
        api.superAdmin.getSubAdmins().catch(() => []),
      ]);

      setFinancials(finRes.report || finRes);
      setOverview(ovRes);
      setSubAdmins(subRes || []);
    } catch (err) {
      setError(err.message || 'Failed to load executive dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(async () => {
      if (!isMounted) return;
      loadDashboardData(period);
    });
    return () => {
      isMounted = false;
    };
  }, [period, loadDashboardData]);

  // Handle module reassignment
  const handleReassignModule = async (e) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setUpdatingModule(true);
    try {
      await api.superAdmin.updateSubAdminModule(selectedStaff.id, newModule);
      setActionSuccess(`Staff member ${selectedStaff.name} reassigned to '${newModule}' module successfully.`);
      setSelectedStaff(null);
      loadDashboardData(period);
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to update module assignment.');
    } finally {
      setUpdatingModule(false);
    }
  };

  // Safe metrics extraction
  const grossRevenue = financials?.summary?.grossRevenue || 0;
  const netEarnings = financials?.summary?.netEarnings || 0;
  const totalPayroll = financials?.liabilities?.totalPayrollLiability || 0;
  const walletLiabilities = financials?.liabilities?.circulatingWalletBalances || 0;

  const courtsRev = financials?.streams?.courts?.revenue || 0;
  const shopRev = financials?.streams?.gearShop?.totalRevenue || 0;
  const cafeRev = financials?.streams?.cafeAndBar?.revenue || 0;

  const maxStreamRev = Math.max(courtsRev, shopRev, cafeRev, 1);
  const courtsBarPct = Math.round((courtsRev / maxStreamRev) * 100);
  const shopBarPct = Math.round((shopRev / maxStreamRev) * 100);
  const cafeBarPct = Math.round((cafeRev / maxStreamRev) * 100);

  // Membership counts
  const usersMod = overview?.modules?.users || {};
  const goldCount = usersMod.byMembership?.GOLD || 0;
  const silverCount = usersMod.byMembership?.SILVER || 0;
  const juniorCount = usersMod.byMembership?.JUNIOR || 0;
  const totalMembers = goldCount + silverCount + juniorCount || 1;

  const goldPct = Math.round((goldCount / totalMembers) * 100);
  const silverPct = Math.round((silverCount / totalMembers) * 100);
  const juniorPct = Math.round((juniorCount / totalMembers) * 100);

  return (
    <main className="bg-[#0e0f0f] text-gray-100 min-h-screen">
      <PageBanner
        title="Super Admin Executive Analytics"
        current="Super Admin"
        bannerClass="banner-inner-booking"
      />

      <div className="section">
        <div className="hero-container">
          {/* Header Controls & Period Selector */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
            <div>
              <div className="sub-heading mb-1">
                <i className="fa-solid fa-circle accent-color-2"></i>
                <span className="sub-heading-title">Executive Intelligence Console</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-0">System Overview & Analytics</h2>
            </div>

            {/* Time Period Filter Pills */}
            <div className="d-flex align-items-center gap-1.5 p-1 bg-gray-900/80 rounded-xl border border-gray-800">
              {['today', 'this_week', 'this_month'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    period === p
                      ? 'bg-lime-400 text-black shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {p === 'today' ? 'Today' : p === 'this_week' ? 'This Week' : 'This Month'}
                </button>
              ))}
              <button
                onClick={() => loadDashboardData(period)}
                className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white ml-1"
                title="Refresh Analytics"
              >
                <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin text-lime-400' : ''}`}></i>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 mb-4 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-rose-400">&times;</button>
            </div>
          )}
          {actionSuccess && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button onClick={() => setActionSuccess('')} className="text-emerald-400">&times;</button>
            </div>
          )}

          {/* KPI Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Card 1: Gross Consolidated Revenue */}
            <ScrollReveal animation="fade-up" delay={50}>
              <div className="p-4 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gross Revenue</span>
                  <span className="w-8 h-8 rounded-xl bg-lime-400/10 text-lime-400 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-indian-rupee-sign"></i>
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono mb-1">
                  ₹{Number(grossRevenue).toLocaleString()}
                </div>
                <div className="text-[11px] text-lime-400 flex items-center gap-1 font-semibold">
                  <i className="fa-solid fa-arrow-trend-up"></i>
                  <span>Combined across Courts, Shop & Cafe</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Card 2: Net Operating Profit */}
            <ScrollReveal animation="fade-up" delay={100}>
              <div className="p-4 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Net Retained</span>
                  <span className="w-8 h-8 rounded-xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-wallet"></i>
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono mb-1">
                  ₹{Number(netEarnings).toLocaleString()}
                </div>
                <div className="text-[11px] text-gray-400">
                  After staff payroll & obligations
                </div>
              </div>
            </ScrollReveal>

            {/* Card 3: Total Registered Members */}
            <ScrollReveal animation="fade-up" delay={150}>
              <div className="p-4 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Club Members</span>
                  <span className="w-8 h-8 rounded-xl bg-blue-400/10 text-blue-400 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-users"></i>
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono mb-1">
                  {overview?.modules?.users?.total || 0}
                </div>
                <div className="text-[11px] text-blue-400">
                  {goldCount} Gold • {silverCount} Silver • {juniorCount} Junior
                </div>
              </div>
            </ScrollReveal>

            {/* Card 4: Active Staff & Sub-Admins */}
            <ScrollReveal animation="fade-up" delay={200}>
              <div className="p-4 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Staff</span>
                  <span className="w-8 h-8 rounded-xl bg-purple-400/10 text-purple-400 flex items-center justify-center text-sm">
                    <i className="fa-solid fa-id-badge"></i>
                  </span>
                </div>
                <div className="text-2xl font-black text-white font-mono mb-1">
                  {overview?.modules?.staff?.totalStaff || subAdmins.length}
                </div>
                <div className="text-[11px] text-purple-300">
                  Across Bar, Shop, Front Desk & Ops
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Charts & Visual Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Chart 1: Revenue Stream Comparison (Native SVG Bar Chart) */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-white text-base font-bold mb-0 flex items-center gap-2">
                      <i className="fa-solid fa-chart-column text-lime-400"></i>
                      Revenue Streams Comparison
                    </h4>
                    <p className="text-xs text-gray-400 mb-0">Consolidated gross contributions by module</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-lime-400 bg-lime-400/10 px-2 py-1 rounded-lg">
                    ₹{grossRevenue.toLocaleString()}
                  </span>
                </div>

                {/* SVG Visual Bars */}
                <div className="space-y-4 my-6">
                  {/* Courts Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-300 mb-1 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-lime-400"></span>
                        Sports Courts & Slots
                      </span>
                      <span className="font-mono text-lime-400">₹{courtsRev.toLocaleString()} ({courtsBarPct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800/80 rounded-full h-4 overflow-hidden p-0.5 border border-gray-700/50">
                      <div
                        className="bg-lime-400 h-full rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${Math.max(courtsBarPct, 4)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pro Shop Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-300 mb-1 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400"></span>
                        Pro Shop & Equipment Services
                      </span>
                      <span className="font-mono text-emerald-400">₹{shopRev.toLocaleString()} ({shopBarPct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800/80 rounded-full h-4 overflow-hidden p-0.5 border border-gray-700/50">
                      <div
                        className="bg-emerald-400 h-full rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${Math.max(shopBarPct, 4)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Cafe & Bar Bar */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-300 mb-1 font-semibold">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-amber-400"></span>
                        Cafe, Bar & Lounge Orders
                      </span>
                      <span className="font-mono text-amber-400">₹{cafeRev.toLocaleString()} ({cafeBarPct}%)</span>
                    </div>
                    <div className="w-full bg-gray-800/80 rounded-full h-4 overflow-hidden p-0.5 border border-gray-700/50">
                      <div
                        className="bg-amber-400 h-full rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${Math.max(cafeBarPct, 4)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Stream Footnotes */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-800/80 text-center text-xs">
                <div>
                  <div className="text-gray-400 text-[10px]">Courts Bookings</div>
                  <div className="font-bold text-white font-mono">{financials?.streams?.courts?.bookingsCount || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px]">Shop Purchases</div>
                  <div className="font-bold text-white font-mono">{financials?.streams?.gearShop?.purchasesCount || 0}</div>
                </div>
                <div>
                  <div className="text-gray-400 text-[10px]">Cafe Bills</div>
                  <div className="font-bold text-white font-mono">{financials?.streams?.cafeAndBar?.ordersCount || 0}</div>
                </div>
              </div>
            </div>

            {/* Chart 2: Membership Tier Distribution (SVG Donut Visual) */}
            <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl flex flex-col justify-between">
              <div>
                <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-gem text-lime-400"></i>
                  Membership Tiers
                </h4>
                <p className="text-xs text-gray-400 mb-4">Distribution of active member subscriptions</p>

                {/* SVG Donut Visual Representation */}
                <div className="flex items-center justify-center my-3">
                  <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                    {/* Background circle */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#27272a"
                      strokeWidth="3.8"
                    />
                    {/* Gold stroke */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="3.8"
                      strokeDasharray={`${goldPct} ${100 - goldPct}`}
                      strokeDashoffset="0"
                    />
                    {/* Silver stroke */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="3.8"
                      strokeDasharray={`${silverPct} ${100 - silverPct}`}
                      strokeDashoffset={`${-goldPct}`}
                    />
                    {/* Junior stroke */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.9155"
                      fill="none"
                      stroke="#a3e635"
                      strokeWidth="3.8"
                      strokeDasharray={`${juniorPct} ${100 - juniorPct}`}
                      strokeDashoffset={`${-(goldPct + silverPct)}`}
                    />
                  </svg>
                </div>

                {/* Donut Legend */}
                <div className="space-y-2 mt-4 text-xs">
                  <div className="flex justify-between items-center text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      Gold Tier (20% off)
                    </span>
                    <span className="font-mono font-bold text-yellow-400">{goldCount} ({goldPct}%)</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                      Silver Tier (10% off)
                    </span>
                    <span className="font-mono font-bold text-slate-300">{silverCount} ({silverPct}%)</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-lime-400"></span>
                      Junior Tier (15% off)
                    </span>
                    <span className="font-mono font-bold text-lime-400">{juniorCount} ({juniorPct}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Liabilities & Payment Methods Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Liabilities Card */}
            <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl">
              <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
                <i className="fa-solid fa-scale-balanced text-rose-400"></i>
                Liabilities & Obligations
              </h4>
              <p className="text-xs text-gray-400 mb-4">Prorated staff payroll and circulating member escrow</p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Staff Payroll Liabilities</div>
                    <div className="text-[11px] text-gray-400">Prorated salary commitments for {period.replace('_', ' ')}</div>
                  </div>
                  <span className="text-base font-mono font-bold text-rose-400">₹{totalPayroll.toLocaleString()}</span>
                </div>

                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">Member Virtual Card Escrow</div>
                    <div className="text-[11px] text-gray-400">Total unused funds held in customer wallets</div>
                  </div>
                  <span className="text-base font-mono font-bold text-amber-400">₹{walletLiabilities.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Distribution */}
            <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl">
              <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
                <i className="fa-solid fa-credit-card text-lime-400"></i>
                Payment Methods Volume
              </h4>
              <p className="text-xs text-gray-400 mb-4">Transactions processed by payment rail</p>

              <div className="space-y-2.5 text-xs">
                {Object.entries(financials?.paymentMethodsBreakdown || {}).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-900/40 border border-gray-800/80">
                    <span className="font-semibold text-gray-300 flex items-center gap-2">
                      <i className={`fa-solid ${
                        method === 'VIRTUAL_CARD' ? 'fa-mobile-screen-button text-lime-400' :
                        method === 'UPI' ? 'fa-qrcode text-emerald-400' :
                        method === 'CARD' ? 'fa-credit-card text-blue-400' :
                        'fa-money-bill-wave text-amber-400'
                      }`}></i>
                      {method.replace('_', ' ')}
                    </span>
                    <div className="text-right">
                      <span className="font-mono font-bold text-white">₹{data.revenue?.toLocaleString() || 0}</span>
                      <span className="text-[10px] text-gray-500 ml-2">({data.count || 0} txns)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sub-Admin & Department Staff Management Table */}
          <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl">
            <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
              <div>
                <h4 className="text-white text-base font-bold mb-0 flex items-center gap-2">
                  <i className="fa-solid fa-user-shield text-lime-400"></i>
                  Sub-Admins & Module Assignments
                </h4>
                <p className="text-xs text-gray-400 mb-0">Control department managers (Bar, Shop, Front Desk, Ops)</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-gray-900/40">
                  <tr>
                    <th className="p-3">Staff Name</th>
                    <th className="p-3">Email & Phone</th>
                    <th className="p-3">System Role</th>
                    <th className="p-3">Assigned Module</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {subAdmins.map((staff) => (
                    <tr key={staff.id} className="hover:bg-gray-800/30 transition">
                      <td className="p-3 font-bold text-white flex items-center gap-2">
                        <span className="w-7 h-7 rounded-full bg-lime-400/10 text-lime-400 flex items-center justify-center text-xs">
                          {staff.name?.[0] || 'S'}
                        </span>
                        {staff.name}
                      </td>
                      <td className="p-3 text-gray-400">
                        <div>{staff.email}</div>
                        <div className="text-[10px] text-gray-500">{staff.phone}</div>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                          {staff.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          staff.designation === 'bar' || staff.designation === 'cafe'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : staff.designation === 'shop'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-lime-500/20 text-lime-300 border-lime-500/30'
                        }`}>
                          {staff.designation || 'front-desk'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedStaff(staff);
                            setNewModule(staff.designation || 'front-desk');
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-lime-400 border border-gray-700 transition"
                        >
                          Reassign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Module Reassignment Modal */}
      {selectedStaff && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1A1D20] border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-white text-base font-bold mb-1">
              Reassign Module: {selectedStaff.name}
            </h4>
            <p className="text-xs text-gray-400 mb-4">
              Select which department portal this staff member directs to upon login.
            </p>

            <form onSubmit={handleReassignModule} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Assigned Department</label>
                <select
                  value={newModule}
                  onChange={(e) => setNewModule(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="front-desk">Front Desk & Reception (/front-desk)</option>
                  <option value="shop">Pro Sports Shop & Gear (/shop-admin)</option>
                  <option value="bar">Bar, Lounge & Cafe (/bar-admin)</option>
                  <option value="operations">General Operations (/admin)</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStaff(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white border border-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingModule}
                  className="py-2 px-4 rounded-xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-extrabold text-xs transition cursor-pointer shadow-md"
                >
                  {updatingModule ? 'Saving...' : 'Update Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
