import { useState, useEffect } from 'react';
import PageBanner from '../components/common/PageBanner';
import ScrollReveal from '../components/common/ScrollReveal';
import api from '../services/api';

export default function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'walkins', 'calls', 'schedules'
  const [alert, setAlert] = useState(null);

  // Helper to show dismissible alert
  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 6000);
  };

  // -------------------------------------------------------------
  // TAB 1: DAILY ACTIVITIES STATE & ACTIONS
  // -------------------------------------------------------------
  const [dailyData, setDailyData] = useState(null);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [dailyDateFilter, setDailyDateFilter] = useState('');

  const fetchDailyActivities = async (date) => {
    setLoadingDaily(true);
    try {
      const res = await api.dailyActivities.get(date || undefined);
      if (res.success) {
        setDailyData(res.data);
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load daily activities');
    } finally {
      setLoadingDaily(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'daily') {
      fetchDailyActivities(dailyDateFilter);
    }
  }, [activeTab, dailyDateFilter]);

  // -------------------------------------------------------------
  // TAB 2: WALKINS STATE & ACTIONS
  // -------------------------------------------------------------
  const [walkins, setWalkins] = useState([]);
  const [walkinPagination, setWalkinPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
  const [walkinStats, setWalkinStats] = useState(null);
  const [loadingWalkins, setLoadingWalkins] = useState(false);
  const [walkinSearch, setWalkinSearch] = useState('');
  const [walkinMembership, setWalkinMembership] = useState('');
  const [walkinPhoneLookup, setWalkinPhoneLookup] = useState('');
  const [phoneLookupResult, setPhoneLookupResult] = useState(null);

  const [newWalkin, setNewWalkin] = useState({
    name: '',
    phone: '',
    email: '',
    membership: 'SILVER',
  });

  const fetchWalkins = async (page = 1) => {
    setLoadingWalkins(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        api.walkins.getAll({
          page,
          limit: 10,
          search: walkinSearch,
          membership: walkinMembership,
        }),
        api.walkins.getStats(),
      ]);
      if (listRes.success) {
        setWalkins(listRes.data || []);
        setWalkinPagination(listRes.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
      }
      if (statsRes.success) {
        setWalkinStats(statsRes.data);
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load walk-in records');
    } finally {
      setLoadingWalkins(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'walkins') {
      fetchWalkins(1);
    }
  }, [activeTab, walkinMembership]);

  const handleRegisterWalkin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.walkins.register(newWalkin);
      showAlert('success', res.message || 'Walk-in visitor registered successfully!');
      setNewWalkin({ name: '', phone: '', email: '', membership: 'SILVER' });
      fetchWalkins(1);
    } catch (err) {
      showAlert('error', err.message || (err.errors && err.errors[0]) || 'Failed to register walk-in');
    }
  };

  const handlePhoneLookup = async (e) => {
    e.preventDefault();
    if (!walkinPhoneLookup.trim()) return;
    try {
      const res = await api.walkins.getByPhone(walkinPhoneLookup.trim());
      if (res.success) {
        setPhoneLookupResult(res.data);
      }
    } catch (err) {
      showAlert('error', err.message || 'Member with this phone number not found');
      setPhoneLookupResult(null);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: CALL LOGS STATE & ACTIONS
  // -------------------------------------------------------------
  const [callLogs, setCallLogs] = useState([]);
  const [callPagination, setCallPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [callSearch, setCallSearch] = useState('');
  const [callTypeFilter, setCallTypeFilter] = useState('');

  const [newCallLog, setNewCallLog] = useState({
    callerName: '',
    phone: '',
    callType: 'INCOMING',
    purpose: '',
    notes: '',
  });

  const fetchCallLogs = async (page = 1) => {
    setLoadingCalls(true);
    try {
      const res = await api.callLogs.getAll({
        page,
        limit: 10,
        search: callSearch,
        callType: callTypeFilter,
      });
      if (res.success) {
        setCallLogs(res.data || []);
        setCallPagination(res.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load call logs');
    } finally {
      setLoadingCalls(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'calls') {
      fetchCallLogs(1);
    }
  }, [activeTab, callTypeFilter]);

  const handleCreateCallLog = async (e) => {
    e.preventDefault();
    try {
      const res = await api.callLogs.create(newCallLog);
      showAlert('success', res.message || 'Call log created successfully!');
      setNewCallLog({ callerName: '', phone: '', callType: 'INCOMING', purpose: '', notes: '' });
      fetchCallLogs(1);
    } catch (err) {
      showAlert('error', err.message || (err.errors && err.errors[0]) || 'Failed to create call log');
    }
  };

  // -------------------------------------------------------------
  // TAB 4: SCHEDULES STATE & ACTIONS
  // -------------------------------------------------------------
  const [schedules, setSchedules] = useState([]);
  const [schedulePagination, setSchedulePagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [scheduleDateFilter, setScheduleDateFilter] = useState('');

  const [newSchedule, setNewSchedule] = useState({
    staffId: '',
    shiftDate: new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '15:00',
    notes: '',
  });

  const fetchSchedules = async (page = 1) => {
    setLoadingSchedules(true);
    try {
      const res = await api.schedules.getAll({
        page,
        limit: 10,
        date: scheduleDateFilter,
      });
      if (res.success) {
        setSchedules(res.data || []);
        setSchedulePagination(res.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load staff schedules');
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'schedules') {
      fetchSchedules(1);
    }
  }, [activeTab, scheduleDateFilter]);

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      const shiftStart = new Date(`${newSchedule.shiftDate}T${newSchedule.startTime}:00.000Z`).toISOString();
      const shiftEnd = new Date(`${newSchedule.shiftDate}T${newSchedule.endTime}:00.000Z`).toISOString();

      const res = await api.schedules.create({
        staffId: newSchedule.staffId,
        shiftStart,
        shiftEnd,
        notes: newSchedule.notes,
      });

      showAlert('success', res.message || 'Staff shift scheduled successfully!');
      setNewSchedule({ ...newSchedule, notes: '' });
      fetchSchedules(1);
    } catch (err) {
      if (err.status === 409) {
        showAlert('error', 'SHIFT CONFLICT: This staff member already has an overlapping shift during this time.');
      } else {
        showAlert('error', err.message || (err.errors && err.errors[0]) || 'Failed to schedule shift');
      }
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this shift?')) return;
    try {
      await api.schedules.delete(id);
      showAlert('success', 'Shift cancelled successfully.');
      fetchSchedules(schedulePagination.page);
    } catch (err) {
      showAlert('error', err.message || 'Failed to delete shift');
    }
  };

  return (
    <main>
      {/* Page Banner */}
      <PageBanner
        title="Front Desk Management"
        current="Operations Portal"
        bannerClass="banner-inner-service"
      />

      <div className="section py-5">
        <div className="hero-container">
          {/* Notification Alert Banner */}
          {alert && (
            <div
              className={`p-4 rounded-xl mb-4 text-sm font-semibold flex items-center justify-between shadow-lg transition-all ${
                alert.type === 'success'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <i className={`fa-solid ${alert.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
                <span>{alert.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setAlert(null)}
                className="text-gray-400 hover:text-white bg-transparent border-0 cursor-pointer text-base"
              >
                &times;
              </button>
            </div>
          )}

          {/* Module Navigation Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6 bg-[#181818] p-2 rounded-2xl border border-gray-800">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('daily')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-0 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'daily'
                    ? 'bg-[#C6EF2E] text-black shadow-md'
                    : 'text-gray-300 hover:text-white bg-[#222222]'
                }`}
              >
                <i className="fa-solid fa-chart-pie"></i>
                Daily Activities
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('walkins')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-0 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'walkins'
                    ? 'bg-[#C6EF2E] text-black shadow-md'
                    : 'text-gray-300 hover:text-white bg-[#222222]'
                }`}
              >
                <i className="fa-solid fa-person-walking"></i>
                Walk-ins & Visitors
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('calls')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-0 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'calls'
                    ? 'bg-[#C6EF2E] text-black shadow-md'
                    : 'text-gray-300 hover:text-white bg-[#222222]'
                }`}
              >
                <i className="fa-solid fa-phone-volume"></i>
                Call Logs
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schedules')}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border-0 cursor-pointer flex items-center gap-2 ${
                  activeTab === 'schedules'
                    ? 'bg-[#C6EF2E] text-black shadow-md'
                    : 'text-gray-300 hover:text-white bg-[#222222]'
                }`}
              >
                <i className="fa-solid fa-calendar-days"></i>
                Staff Schedules
              </button>
            </div>

            <div className="flex items-center gap-2 pr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs text-gray-400 font-mono">Backend Connected (5000)</span>
            </div>
          </div>

          {/* -------------------------------------------------------- */}
          {/* TAB 1: DAILY ACTIVITIES OVERVIEW                         */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'daily' && (
            <div className="space-y-6">
              {/* Filter & Refresh Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141414] p-4 rounded-xl border border-gray-800">
                <div>
                  <h3 className="text-xl font-bold text-white mb-0.5">Today's Activity Feed</h3>
                  <p className="text-xs text-gray-400">Consolidated real-time member check-ins and call activities</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={dailyDateFilter}
                    onChange={(e) => setDailyDateFilter(e.target.value)}
                    className="bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#C6EF2E]"
                  />
                  <button
                    type="button"
                    onClick={() => fetchDailyActivities(dailyDateFilter)}
                    className="bg-[#C6EF2E] text-black font-bold text-xs px-4 py-2 rounded-lg border-0 cursor-pointer hover:bg-[#b0d825] transition"
                  >
                    <i className="fa-solid fa-rotate-right mr-1.5"></i>
                    Refresh Feed
                  </button>
                </div>
              </div>

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-[#181818] p-5 rounded-2xl border border-gray-800 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-gray-400">Total Activities</span>
                    <i className="fa-solid fa-bolt text-[#C6EF2E] text-lg"></i>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mb-0">
                    {dailyData?.summary?.totalActivities ?? 0}
                  </h2>
                  <span className="text-[11px] text-gray-500">Check-ins + Calls</span>
                </div>

                <div className="bg-[#181818] p-5 rounded-2xl border border-gray-800 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-gray-400">Member Check-ins</span>
                    <i className="fa-solid fa-id-card text-blue-400 text-lg"></i>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mb-0">
                    {dailyData?.summary?.totalCheckIns ?? 0}
                  </h2>
                  <span className="text-[11px] text-blue-400/80">Active visits today</span>
                </div>

                <div className="bg-[#181818] p-5 rounded-2xl border border-gray-800 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-gray-400">Incoming Calls</span>
                    <i className="fa-solid fa-phone-arrow-down-left text-emerald-400 text-lg"></i>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mb-0">
                    {dailyData?.summary?.totalIncomingCalls ?? 0}
                  </h2>
                  <span className="text-[11px] text-emerald-400/80">Enquiries received</span>
                </div>

                <div className="bg-[#181818] p-5 rounded-2xl border border-gray-800 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs uppercase font-bold text-gray-400">Outgoing Calls</span>
                    <i className="fa-solid fa-phone-arrow-up-right text-amber-400 text-lg"></i>
                  </div>
                  <h2 className="text-3xl font-extrabold text-white mb-0">
                    {dailyData?.summary?.totalOutgoingCalls ?? 0}
                  </h2>
                  <span className="text-[11px] text-amber-400/80">Follow-ups & reminders</span>
                </div>
              </div>

              {/* Activity Details Feeds */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Member Check-ins */}
                <div className="bg-[#161616] rounded-2xl border border-gray-800 p-4">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                    <span>
                      <i className="fa-solid fa-user-check text-blue-400 mr-2"></i>
                      Member Check-ins
                    </span>
                    <span className="bg-blue-900/60 text-blue-300 text-xs px-2 py-0.5 rounded-full">
                      {dailyData?.activities?.checkIns?.length || 0}
                    </span>
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {dailyData?.activities?.checkIns?.length ? (
                      dailyData.activities.checkIns.map((user) => (
                        <div key={user.id} className="bg-[#202020] p-3 rounded-xl border border-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-white">{user.name}</span>
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-yellow-900/60 text-yellow-300">
                              {user.membership}
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1 flex justify-between">
                            <span>{user.phone}</span>
                            <span className="text-[11px] text-gray-500">
                              {new Date(user.lastEntry).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-6">No check-ins recorded today.</p>
                    )}
                  </div>
                </div>

                {/* Incoming Calls */}
                <div className="bg-[#161616] rounded-2xl border border-gray-800 p-4">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                    <span>
                      <i className="fa-solid fa-phone-arrow-down-left text-emerald-400 mr-2"></i>
                      Incoming Calls
                    </span>
                    <span className="bg-emerald-900/60 text-emerald-300 text-xs px-2 py-0.5 rounded-full">
                      {dailyData?.activities?.incomingCalls?.length || 0}
                    </span>
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {dailyData?.activities?.incomingCalls?.length ? (
                      dailyData.activities.incomingCalls.map((call) => (
                        <div key={call.id} className="bg-[#202020] p-3 rounded-xl border border-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-white">{call.callerName}</span>
                            <span className="text-[10px] text-emerald-400 font-mono">{call.phone}</span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1 mb-1 font-medium">{call.purpose}</p>
                          {call.notes && <p className="text-[11px] text-gray-400 italic mb-0">"{call.notes}"</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-6">No incoming calls recorded today.</p>
                    )}
                  </div>
                </div>

                {/* Outgoing Calls */}
                <div className="bg-[#161616] rounded-2xl border border-gray-800 p-4">
                  <h4 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
                    <span>
                      <i className="fa-solid fa-phone-arrow-up-right text-amber-400 mr-2"></i>
                      Outgoing Calls
                    </span>
                    <span className="bg-amber-900/60 text-amber-300 text-xs px-2 py-0.5 rounded-full">
                      {dailyData?.activities?.outgoingCalls?.length || 0}
                    </span>
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {dailyData?.activities?.outgoingCalls?.length ? (
                      dailyData.activities.outgoingCalls.map((call) => (
                        <div key={call.id} className="bg-[#202020] p-3 rounded-xl border border-gray-800">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-sm text-white">{call.callerName}</span>
                            <span className="text-[10px] text-amber-400 font-mono">{call.phone}</span>
                          </div>
                          <p className="text-xs text-gray-300 mt-1 mb-1 font-medium">{call.purpose}</p>
                          {call.notes && <p className="text-[11px] text-gray-400 italic mb-0">"{call.notes}"</p>}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 text-center py-6">No outgoing calls recorded today.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 2: WALKINS & VISITORS                                */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'walkins' && (
            <div className="space-y-6">
              {/* Top Stats Banner */}
              {walkinStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-[#181818] p-4 rounded-xl border border-gray-800">
                    <span className="text-xs text-gray-400 uppercase font-semibold">Total Members</span>
                    <h3 className="text-2xl font-bold text-white mt-1 mb-0">{walkinStats.totalMembers}</h3>
                  </div>
                  <div className="bg-[#181818] p-4 rounded-xl border border-gray-800">
                    <span className="text-xs text-yellow-400 uppercase font-semibold">Gold Members</span>
                    <h3 className="text-2xl font-bold text-white mt-1 mb-0">{walkinStats.goldMembers}</h3>
                  </div>
                  <div className="bg-[#181818] p-4 rounded-xl border border-gray-800">
                    <span className="text-xs text-gray-300 uppercase font-semibold">Silver Members</span>
                    <h3 className="text-2xl font-bold text-white mt-1 mb-0">{walkinStats.silverMembers}</h3>
                  </div>
                  <div className="bg-[#181818] p-4 rounded-xl border border-gray-800">
                    <span className="text-xs text-sky-400 uppercase font-semibold">Junior Members</span>
                    <h3 className="text-2xl font-bold text-white mt-1 mb-0">{walkinStats.juniorMembers}</h3>
                  </div>
                </div>
              )}

              {/* Action Row: Register Visitor Form & Phone Lookup Drawer */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form: Register Walk-in */}
                <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800 lg:col-span-2">
                  <h4 className="text-base font-bold text-white mb-3">Register Walk-in Visitor</h4>
                  <form onSubmit={handleRegisterWalkin} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={newWalkin.name}
                        onChange={(e) => setNewWalkin({ ...newWalkin, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Phone Number (10 Digits)</label>
                      <input
                        type="tel"
                        required
                        pattern="[6-9][0-9]{9}"
                        value={newWalkin.phone}
                        onChange={(e) => setNewWalkin({ ...newWalkin, phone: e.target.value })}
                        placeholder="9876543210"
                        className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        value={newWalkin.email}
                        onChange={(e) => setNewWalkin({ ...newWalkin, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-400 block mb-1">Membership Plan</label>
                      <select
                        value={newWalkin.membership}
                        onChange={(e) => setNewWalkin({ ...newWalkin, membership: e.target.value })}
                        className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                      >
                        <option value="GOLD">GOLD Membership</option>
                        <option value="SILVER">SILVER Membership</option>
                        <option value="JUNIOR">JUNIOR Membership</option>
                      </select>
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        className="bg-[#C6EF2E] text-black font-bold px-6 py-2.5 rounded-xl border-0 cursor-pointer hover:bg-[#b5dc29] transition"
                      >
                        <i className="fa-solid fa-user-plus mr-2"></i>
                        Register & Check In
                      </button>
                    </div>
                  </form>
                </div>

                {/* Quick Phone Search */}
                <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800">
                  <h4 className="text-base font-bold text-white mb-3">Quick Phone Lookup</h4>
                  <form onSubmit={handlePhoneLookup} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Enter 10-digit phone"
                      value={walkinPhoneLookup}
                      onChange={(e) => setWalkinPhoneLookup(e.target.value)}
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                    <button
                      type="submit"
                      className="w-full bg-[#2a2a2a] hover:bg-[#333333] text-white font-bold py-2 rounded-lg text-xs transition border border-gray-700 cursor-pointer"
                    >
                      <i className="fa-solid fa-magnifying-glass mr-2"></i>
                      Search Member
                    </button>
                  </form>

                  {phoneLookupResult && (
                    <div className="mt-4 p-3 bg-[#202020] rounded-xl border border-gray-700 text-xs">
                      <div className="font-bold text-white text-sm">{phoneLookupResult.name}</div>
                      <div className="text-gray-400 mt-1">{phoneLookupResult.phone}</div>
                      <div className="text-gray-400">{phoneLookupResult.email}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-yellow-900/60 text-yellow-300 font-bold uppercase text-[10px]">
                          {phoneLookupResult.membership}
                        </span>
                        <span className="text-gray-500 text-[10px]">
                          {phoneLookupResult.lastEntry ? new Date(phoneLookupResult.lastEntry).toLocaleDateString() : 'No Entry'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Table of Walk-in Records with Filter & Search */}
              <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h4 className="text-base font-bold text-white mb-0">Registered Walk-ins Directory</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search name, phone, email..."
                      value={walkinSearch}
                      onChange={(e) => setWalkinSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchWalkins(1)}
                      className="bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs w-60 focus:outline-none"
                    />
                    <select
                      value={walkinMembership}
                      onChange={(e) => setWalkinMembership(e.target.value)}
                      className="bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs"
                    >
                      <option value="">All Tiers</option>
                      <option value="GOLD">GOLD</option>
                      <option value="SILVER">SILVER</option>
                      <option value="JUNIOR">JUNIOR</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => fetchWalkins(1)}
                      className="bg-[#C6EF2E] text-black text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer"
                    >
                      Filter
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#202020] text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Member Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Membership</th>
                        <th className="p-3">Last Entry</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {walkins.length ? (
                        walkins.map((w) => (
                          <tr key={w.id} className="hover:bg-[#1f1f1f]">
                            <td className="p-3 font-semibold text-white">{w.name}</td>
                            <td className="p-3 font-mono">{w.phone}</td>
                            <td className="p-3">{w.email}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  w.membership === 'GOLD'
                                    ? 'bg-yellow-900/60 text-yellow-300'
                                    : w.membership === 'SILVER'
                                    ? 'bg-gray-800 text-gray-200'
                                    : 'bg-sky-900/60 text-sky-300'
                                }`}
                              >
                                {w.membership}
                              </span>
                            </td>
                            <td className="p-3 text-gray-400">
                              {w.lastEntry ? new Date(w.lastEntry).toLocaleString() : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="p-6 text-center text-gray-500">
                            No walk-in records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                  <span>
                    Showing {walkins.length} of {walkinPagination.totalRecords} records (Page {walkinPagination.page} of {walkinPagination.totalPages})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={walkinPagination.page <= 1}
                      onClick={() => fetchWalkins(walkinPagination.page - 1)}
                      className="px-3 py-1 rounded bg-[#202020] border border-gray-700 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={walkinPagination.page >= walkinPagination.totalPages}
                      onClick={() => fetchWalkins(walkinPagination.page + 1)}
                      className="px-3 py-1 rounded bg-[#202020] border border-gray-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 3: CALL LOGS                                         */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'calls' && (
            <div className="space-y-6">
              {/* Form: Create Call Log */}
              <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800">
                <h4 className="text-base font-bold text-white mb-3">Log a Phone Call</h4>
                <form onSubmit={handleCreateCallLog} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Caller Name</label>
                    <input
                      type="text"
                      required
                      value={newCallLog.callerName}
                      onChange={(e) => setNewCallLog({ ...newCallLog, callerName: e.target.value })}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      required
                      pattern="[6-9][0-9]{9}"
                      value={newCallLog.phone}
                      onChange={(e) => setNewCallLog({ ...newCallLog, phone: e.target.value })}
                      placeholder="9876543210"
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Call Type</label>
                    <select
                      value={newCallLog.callType}
                      onChange={(e) => setNewCallLog({ ...newCallLog, callType: e.target.value })}
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    >
                      <option value="INCOMING">INCOMING Call</option>
                      <option value="OUTGOING">OUTGOING Call</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Call Purpose</label>
                    <input
                      type="text"
                      required
                      value={newCallLog.purpose}
                      onChange={(e) => setNewCallLog({ ...newCallLog, purpose: e.target.value })}
                      placeholder="Court booking enquiry / Membership follow-up"
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Notes (Optional)</label>
                    <input
                      type="text"
                      value={newCallLog.notes}
                      onChange={(e) => setNewCallLog({ ...newCallLog, notes: e.target.value })}
                      placeholder="Additional remarks..."
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="bg-[#C6EF2E] text-black font-bold px-6 py-2 rounded-xl border-0 cursor-pointer hover:bg-[#b2da26] transition text-sm"
                    >
                      <i className="fa-solid fa-phone-plus mr-2"></i>
                      Save Call Log
                    </button>
                  </div>
                </form>
              </div>

              {/* Call Logs Table */}
              <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h4 className="text-base font-bold text-white mb-0">Front Desk Call History</h4>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Search caller name or phone..."
                      value={callSearch}
                      onChange={(e) => setCallSearch(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchCallLogs(1)}
                      className="bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs w-60"
                    />
                    <select
                      value={callTypeFilter}
                      onChange={(e) => setCallTypeFilter(e.target.value)}
                      className="bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs"
                    >
                      <option value="">All Calls</option>
                      <option value="INCOMING">Incoming</option>
                      <option value="OUTGOING">Outgoing</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => fetchCallLogs(1)}
                      className="bg-[#C6EF2E] text-black text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer"
                    >
                      Filter
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#202020] text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Caller Name</th>
                        <th className="p-3">Phone</th>
                        <th className="p-3">Type</th>
                        <th className="p-3">Purpose</th>
                        <th className="p-3">Notes</th>
                        <th className="p-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {callLogs.length ? (
                        callLogs.map((c) => (
                          <tr key={c.id} className="hover:bg-[#1f1f1f]">
                            <td className="p-3 font-semibold text-white">{c.callerName}</td>
                            <td className="p-3 font-mono">{c.phone}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  c.callType === 'INCOMING'
                                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                    : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                              >
                                {c.callType}
                              </span>
                            </td>
                            <td className="p-3 text-gray-200">{c.purpose}</td>
                            <td className="p-3 text-gray-400 italic">{c.notes || '—'}</td>
                            <td className="p-3 text-gray-500">{new Date(c.callTime).toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-gray-500">
                            No call logs found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                  <span>
                    Showing {callLogs.length} of {callPagination.totalRecords} records (Page {callPagination.page} of {callPagination.totalPages})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={callPagination.page <= 1}
                      onClick={() => fetchCallLogs(callPagination.page - 1)}
                      className="px-3 py-1 rounded bg-[#202020] border border-gray-700 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={callPagination.page >= callPagination.totalPages}
                      onClick={() => fetchCallLogs(callPagination.page + 1)}
                      className="px-3 py-1 rounded bg-[#202020] border border-gray-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------- */}
          {/* TAB 4: STAFF SCHEDULES                                   */}
          {/* -------------------------------------------------------- */}
          {activeTab === 'schedules' && (
            <div className="space-y-6">
              {/* Form: Schedule Shift */}
              <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800">
                <h4 className="text-base font-bold text-white mb-3">Create Staff Shift Schedule</h4>
                <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Staff Member UUID</label>
                    <input
                      type="text"
                      required
                      value={newSchedule.staffId}
                      onChange={(e) => setNewSchedule({ ...newSchedule, staffId: e.target.value })}
                      placeholder="e.g. 1663bca4-b651-4694-bffc-d03dc88674cf"
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Shift Date</label>
                    <input
                      type="date"
                      required
                      value={newSchedule.shiftDate}
                      onChange={(e) => setNewSchedule({ ...newSchedule, shiftDate: e.target.value })}
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Start Time - End Time</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="time"
                        required
                        value={newSchedule.startTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, startTime: e.target.value })}
                        className="w-1/2 bg-[#202020] border border-gray-700 text-white rounded-lg px-2 py-2 text-xs"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="time"
                        required
                        value={newSchedule.endTime}
                        onChange={(e) => setNewSchedule({ ...newSchedule, endTime: e.target.value })}
                        className="w-1/2 bg-[#202020] border border-gray-700 text-white rounded-lg px-2 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-gray-400 block mb-1">Shift Notes</label>
                    <input
                      type="text"
                      value={newSchedule.notes}
                      onChange={(e) => setNewSchedule({ ...newSchedule, notes: e.target.value })}
                      placeholder="Front desk morning reception shift"
                      className="w-full bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C6EF2E]"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-[#C6EF2E] text-black font-bold py-2.5 rounded-xl border-0 cursor-pointer hover:bg-[#b0d825] transition text-sm"
                    >
                      <i className="fa-solid fa-calendar-plus mr-1.5"></i>
                      Schedule Shift
                    </button>
                  </div>
                </form>
              </div>

              {/* Schedules Table */}
              <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h4 className="text-base font-bold text-white mb-0">Current Shift Schedules</h4>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      value={scheduleDateFilter}
                      onChange={(e) => setScheduleDateFilter(e.target.value)}
                      className="bg-[#202020] border border-gray-700 text-white rounded-lg px-3 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => fetchSchedules(1)}
                      className="bg-[#C6EF2E] text-black text-xs font-bold px-3 py-1.5 rounded-lg border-0 cursor-pointer"
                    >
                      Filter Date
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-[#202020] text-gray-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Staff Member</th>
                        <th className="p-3">Role / Designation</th>
                        <th className="p-3">Shift Start</th>
                        <th className="p-3">Shift End</th>
                        <th className="p-3">Notes</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {schedules.length ? (
                        schedules.map((s) => (
                          <tr key={s.id} className="hover:bg-[#1f1f1f]">
                            <td className="p-3 font-semibold text-white">
                              {s.staff?.name || s.staffId}
                            </td>
                            <td className="p-3 text-gray-400">
                              {s.staff?.role || 'Staff'} {s.staff?.designation ? `(${s.staff.designation})` : ''}
                            </td>
                            <td className="p-3 font-mono text-emerald-400">
                              {new Date(s.shiftStart).toLocaleString()}
                            </td>
                            <td className="p-3 font-mono text-rose-400">
                              {new Date(s.shiftEnd).toLocaleString()}
                            </td>
                            <td className="p-3 text-gray-300 italic">{s.notes || '—'}</td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteSchedule(s.id)}
                                className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 px-2.5 py-1 rounded text-[11px] border border-rose-800 cursor-pointer transition"
                              >
                                <i className="fa-solid fa-trash-can mr-1"></i>
                                Cancel
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="p-6 text-center text-gray-500">
                            No shift schedules found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 text-xs text-gray-400">
                  <span>
                    Showing {schedules.length} of {schedulePagination.totalRecords} records (Page {schedulePagination.page} of {schedulePagination.totalPages})
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={schedulePagination.page <= 1}
                      onClick={() => fetchSchedules(schedulePagination.page - 1)}
                      className="px-3 py-1 rounded bg-[#202020] border border-gray-700 disabled:opacity-40 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={schedulePagination.page >= schedulePagination.totalPages}
                      onClick={() => fetchSchedules(schedulePagination.page + 1)}
                      className="px-3 py-1 rounded bg-[#202020] border border-gray-700 disabled:opacity-40 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
