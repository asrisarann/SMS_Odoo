import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function LeaveManagementTab({ showAlert }) {
  const [leaves, setLeaves] = useState([]);
  const [statusSummary, setStatusSummary] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 });
  const [coverageData, setCoverageData] = useState(null);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);

  // View & Filters
  const [activeSubTab, setActiveSubTab] = useState('requests'); // 'requests' | 'coverage' | 'balances'
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Submit Leave Request Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [newLeave, setNewLeave] = useState({
    staffId: '',
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: '',
    coverStaffId: '',
  });
  const [staffBalancePreview, setStaffBalancePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Review / Decision Modal (Approve / Reject / Cancel)
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewMode, setReviewMode] = useState('approve'); // 'approve' | 'reject' | 'cancel'
  const [reviewNotes, setReviewNotes] = useState('');
  const [assignedCoverStaffId, setAssignedCoverStaffId] = useState('');
  const [processingReview, setProcessingReview] = useState(false);

  // Staff Quota Balance Drawer/Modal
  const [viewingBalance, setViewingBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Helper: Load all leaves, coverage, and staff directory
  const loadData = useCallback(async (isMounted = true) => {
    try {
      const [leavesRes, coverageRes, staffRes] = await Promise.all([
        api.leaves.getAll({ limit: 100 }).catch(() => ({ success: false })),
        api.leaves.getCoverage().catch(() => ({ success: false })),
        api.leaves.getStaffList().catch(() => ({ success: false })),
      ]);

      if (isMounted) {
        if (leavesRes?.success) {
          setLeaves(leavesRes.leaves || []);
          if (leavesRes.statusSummary) {
            setStatusSummary(leavesRes.statusSummary);
          }
        }
        if (coverageRes?.success) {
          setCoverageData(coverageRes);
        }
        if (staffRes?.success && Array.isArray(staffRes.data)) {
          setStaffList(staffRes.data);
        }
        setLoading(false);
      }
    } catch (err) {
      if (isMounted) {
        showAlert('error', err.message || 'Failed to load staff leave data');
        setLoading(false);
      }
    }
  }, [showAlert]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      loadData(isMounted);
    });
    return () => {
      isMounted = false;
    };
  }, [loadData]);

  // Fetch balance preview when staff is selected in submit modal
  const handleStaffSelectInModal = async (staffId) => {
    setNewLeave((prev) => ({ ...prev, staffId }));
    if (!staffId) {
      setStaffBalancePreview(null);
      return;
    }
    try {
      const res = await api.leaves.getBalance(staffId);
      if (res.success && res.summary) {
        setStaffBalancePreview(res.summary);
      } else {
        setStaffBalancePreview(null);
      }
    } catch {
      setStaffBalancePreview(null);
    }
  };

  // Submit new leave request
  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    if (!newLeave.staffId) {
      showAlert('error', 'Please select a staff member.');
      return;
    }
    if (!newLeave.startDate || !newLeave.endDate) {
      showAlert('error', 'Please select start and end dates.');
      return;
    }
    if (new Date(newLeave.endDate) < new Date(newLeave.startDate)) {
      showAlert('error', 'End date cannot be earlier than start date.');
      return;
    }
    if (!newLeave.reason.trim()) {
      showAlert('error', 'Please provide a reason for the leave request.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.leaves.submit({
        staffId: newLeave.staffId,
        leaveType: newLeave.leaveType,
        startDate: newLeave.startDate,
        endDate: newLeave.endDate,
        reason: newLeave.reason.trim(),
        coverStaffId: newLeave.coverStaffId || undefined,
      });

      if (res.success) {
        showAlert('success', res.message || 'Leave request submitted successfully.');
        setShowSubmitModal(false);
        setNewLeave({
          staffId: '',
          leaveType: 'CASUAL',
          startDate: '',
          endDate: '',
          reason: '',
          coverStaffId: '',
        });
        setStaffBalancePreview(null);
        await loadData(true);
      } else {
        showAlert('error', res.message || 'Failed to submit leave request.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Review action (Approve, Reject, or Cancel)
  const handleProcessReview = async () => {
    if (!reviewingLeave) return;
    setProcessingReview(true);

    try {
      if (reviewMode === 'approve') {
        const res = await api.leaves.approve(reviewingLeave.id, {
          reviewNotes: reviewNotes.trim() || 'Approved by HR',
          coverStaffId: assignedCoverStaffId || reviewingLeave.coverStaffId || undefined,
        });
        if (res.success) {
          showAlert('success', `Leave for ${reviewingLeave.staff?.name || 'staff'} approved successfully.`);
        }
      } else if (reviewMode === 'reject') {
        if (!reviewNotes.trim()) {
          showAlert('error', 'A specific rejection reason is mandatory.');
          setProcessingReview(false);
          return;
        }
        const res = await api.leaves.reject(reviewingLeave.id, {
          rejectionReason: reviewNotes.trim(),
        });
        if (res.success) {
          showAlert('success', `Leave for ${reviewingLeave.staff?.name || 'staff'} rejected.`);
        }
      } else if (reviewMode === 'cancel') {
        const res = await api.leaves.cancel(reviewingLeave.id, reviewNotes.trim() || 'Cancelled by supervisor');
        if (res.success) {
          showAlert('success', `Leave request cancelled.`);
        }
      }

      setReviewingLeave(null);
      setReviewNotes('');
      setAssignedCoverStaffId('');
      await loadData(true);
    } catch (err) {
      showAlert('error', err.message || 'Failed to process review action.');
    } finally {
      setProcessingReview(false);
    }
  };

  // Open Full Balance Details for a staff member
  const handleViewStaffBalance = async (staffId) => {
    setLoadingBalance(true);
    try {
      const res = await api.leaves.getBalance(staffId);
      if (res.success) {
        setViewingBalance(res);
      } else {
        showAlert('error', res.message || 'Failed to load staff balance.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Failed to load staff leave balance.');
    } finally {
      setLoadingBalance(false);
    }
  };

  // Filter leaves
  const filteredLeaves = leaves.filter((leave) => {
    const matchesStatus = filterStatus === 'ALL' || leave.status === filterStatus;
    const matchesType = filterType === 'ALL' || leave.leaveType === filterType;
    const matchesSearch =
      !searchQuery.trim() ||
      leave.staff?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.staff?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      leave.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  // Calculate duration in days for preview in submission modal
  const getRequestedDays = () => {
    if (!newLeave.startDate || !newLeave.endDate) return 0;
    const s = new Date(newLeave.startDate);
    const e = new Date(newLeave.endDate);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    return Math.max(1, Math.round((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000)) + 1);
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------- */}
      {/* HEADER: TITLE & TOP ACTIONS                                   */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141414] p-5 rounded-2xl border border-gray-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C6EF2E] animate-pulse"></span>
            <span className="text-xs uppercase tracking-wider text-[#C6EF2E] font-semibold">HR & Front Desk Operations</span>
          </div>
          <h3 className="text-2xl font-bold text-white">Staff Leave Management & HR Approvals</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Shift coverage gap analysis, leave quotas, and supervisor approval workflow
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadData(true)}
            className="px-4 py-2 bg-[#202020] hover:bg-[#282828] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition border border-gray-700 cursor-pointer flex items-center gap-2"
          >
            <i className="fa-solid fa-rotate-right"></i>
            Refresh Data
          </button>
          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="px-5 py-2.5 bg-[#C6EF2E] hover:bg-[#b0d825] text-black font-bold rounded-xl text-xs transition shadow-lg shadow-[#C6EF2E]/10 cursor-pointer flex items-center gap-2"
          >
            <i className="fa-solid fa-calendar-plus"></i>
            New Leave Request
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* KPI OVERVIEW CARDS                                            */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Pending Approvals */}
        <div
          onClick={() => {
            setActiveSubTab('requests');
            setFilterStatus('PENDING');
          }}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterStatus === 'PENDING' && activeSubTab === 'requests'
              ? 'bg-amber-950/20 border-amber-500/50 shadow-lg'
              : 'bg-[#181818] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-400 font-semibold uppercase tracking-wider">Pending HR Review</span>
            <span className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-hourglass-half"></i>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">{statusSummary.PENDING || 0}</div>
          <p className="text-[11px] text-gray-400 mt-1">Awaiting supervisor approval</p>
        </div>

        {/* Approved Leaves */}
        <div
          onClick={() => {
            setActiveSubTab('requests');
            setFilterStatus('APPROVED');
          }}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterStatus === 'APPROVED' && activeSubTab === 'requests'
              ? 'bg-emerald-950/20 border-emerald-500/50 shadow-lg'
              : 'bg-[#181818] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">Approved Leaves</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-circle-check"></i>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">{statusSummary.APPROVED || 0}</div>
          <p className="text-[11px] text-gray-400 mt-1">Quota deducted & confirmed</p>
        </div>

        {/* Coverage Gaps Alert */}
        <div
          onClick={() => setActiveSubTab('coverage')}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            activeSubTab === 'coverage'
              ? 'bg-rose-950/20 border-rose-500/50 shadow-lg'
              : coverageData?.uncoveredShiftsCount > 0
              ? 'bg-rose-950/10 border-rose-800/40 hover:border-rose-700'
              : 'bg-[#181818] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-rose-400 font-semibold uppercase tracking-wider">Uncovered Shifts</span>
            <span className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-triangle-exclamation"></i>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            {coverageData?.uncoveredShiftsCount || 0}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {coverageData?.totalShiftsRequiringCoverage || 0} shifts affected in 7 days
          </p>
        </div>

        {/* Rejected & Cancelled */}
        <div
          onClick={() => {
            setActiveSubTab('requests');
            setFilterStatus('REJECTED');
          }}
          className={`p-4 rounded-xl border cursor-pointer transition ${
            filterStatus === 'REJECTED' && activeSubTab === 'requests'
              ? 'bg-gray-800 border-gray-600 shadow-lg'
              : 'bg-[#181818] border-gray-800 hover:border-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Rejected / Cancelled</span>
            <span className="w-7 h-7 rounded-lg bg-gray-700/30 text-gray-400 flex items-center justify-center text-xs">
              <i className="fa-solid fa-ban"></i>
            </span>
          </div>
          <div className="text-3xl font-extrabold text-white mt-2 font-mono">
            {(statusSummary.REJECTED || 0) + (statusSummary.CANCELLED || 0)}
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Inactive / rejected records</p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SHIFT COVERAGE GAP BANNER (If uncovered shifts exist)         */}
      {/* ------------------------------------------------------------- */}
      {coverageData?.uncoveredShiftsCount > 0 && (
        <div className="bg-rose-950/20 border border-rose-800/50 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-base">
              <i className="fa-solid fa-shield-virus"></i>
            </span>
            <div>
              <h4 className="text-sm font-bold text-white">
                Urgent Shift Coverage Warning: {coverageData.uncoveredShiftsCount} Unassigned Shift(s) Detected
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Staff members with approved leaves have upcoming scheduled shifts without designated relief cover.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('coverage')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Review Shift Coverage
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-NAVIGATION TABS                                           */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('requests')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'requests'
                ? 'bg-[#C6EF2E] text-black shadow-md'
                : 'text-gray-400 hover:text-white bg-[#181818]'
            }`}
          >
            <i className="fa-solid fa-list-check"></i>
            Leave Requests Directory ({leaves.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('coverage')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'coverage'
                ? 'bg-[#C6EF2E] text-black shadow-md'
                : 'text-gray-400 hover:text-white bg-[#181818]'
            }`}
          >
            <i className="fa-solid fa-users-viewfinder"></i>
            Shift Coverage Gap Analysis
            {coverageData?.uncoveredShiftsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                {coverageData.uncoveredShiftsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('balances')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeSubTab === 'balances'
                ? 'bg-[#C6EF2E] text-black shadow-md'
                : 'text-gray-400 hover:text-white bg-[#181818]'
            }`}
          >
            <i className="fa-solid fa-scale-balanced"></i>
            Staff Quotas & Balances ({staffList.length})
          </button>
        </div>

        {/* Search & Status Quick Filter (for requests view) */}
        {activeSubTab === 'requests' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-500 text-xs"></i>
              <input
                type="text"
                placeholder="Search staff, email, reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#181818] border border-gray-800 text-white rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#C6EF2E] w-48 sm:w-64"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-[#181818] border border-gray-800 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#C6EF2E]"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Only</option>
              <option value="APPROVED">Approved Only</option>
              <option value="REJECTED">Rejected Only</option>
              <option value="CANCELLED">Cancelled Only</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-[#181818] border border-gray-800 text-white rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[#C6EF2E]"
            >
              <option value="ALL">All Types</option>
              <option value="ANNUAL">Annual</option>
              <option value="SICK">Sick</option>
              <option value="CASUAL">Casual</option>
              <option value="EMERGENCY">Emergency</option>
            </select>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 1: LEAVE REQUESTS DIRECTORY                          */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'requests' && (
        <div className="bg-[#141414] rounded-2xl border border-gray-800 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#C6EF2E] mb-3"></i>
              <p className="text-sm">Loading staff leave requests...</p>
            </div>
          ) : filteredLeaves.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <i className="fa-regular fa-calendar-xmark text-3xl mb-3"></i>
              <p className="text-sm font-semibold text-gray-400">No leave requests match your filters</p>
              <p className="text-xs text-gray-600 mt-1">Try resetting the status filter or submit a new leave request.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1c1c1c] text-gray-400 border-b border-gray-800 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-3">Leave Type</th>
                    <th className="py-3 px-3">Date Range</th>
                    <th className="py-3 px-3 text-center">Days</th>
                    <th className="py-3 px-3">Covering Staff</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Supervisor Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-gray-300">
                  {filteredLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-[#1a1a1a] transition">
                      {/* Staff Member */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#202020] border border-gray-700 flex items-center justify-center font-bold text-xs text-[#C6EF2E]">
                            {l.staff?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              {l.staff?.name || 'Unknown Staff'}
                              <button
                                type="button"
                                title="View Quota Balance"
                                onClick={() => handleViewStaffBalance(l.staffId)}
                                className="text-gray-500 hover:text-[#C6EF2E] transition text-[11px] p-0.5 cursor-pointer"
                              >
                                <i className="fa-solid fa-chart-pie"></i>
                              </button>
                            </div>
                            <div className="text-[11px] text-gray-400">{l.staff?.designation || l.staff?.role}</div>
                          </div>
                        </div>
                      </td>

                      {/* Leave Type */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] tracking-wider uppercase ${
                            l.leaveType === 'ANNUAL'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : l.leaveType === 'SICK'
                              ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                              : l.leaveType === 'EMERGENCY'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {l.leaveType}
                        </span>
                      </td>

                      {/* Date Range */}
                      <td className="py-3 px-3">
                        <div className="font-mono text-white text-[11px]">
                          {new Date(l.startDate).toISOString().split('T')[0]}
                        </div>
                        <div className="font-mono text-gray-500 text-[10px]">
                          to {new Date(l.endDate).toISOString().split('T')[0]}
                        </div>
                      </td>

                      {/* Days Count */}
                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-white bg-[#222] px-2 py-0.5 rounded border border-gray-700">
                          {l.daysCount} d
                        </span>
                      </td>

                      {/* Covering Staff */}
                      <td className="py-3 px-3">
                        {l.coverStaff ? (
                          <div className="flex items-center gap-1.5 text-emerald-400">
                            <i className="fa-solid fa-user-shield text-[10px]"></i>
                            <span>{l.coverStaff.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">None Assigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase flex items-center gap-1.5 w-max ${
                            l.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : l.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                              : l.status === 'REJECTED'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                              : 'bg-gray-700/30 text-gray-400 border border-gray-700'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              l.status === 'APPROVED'
                                ? 'bg-emerald-400'
                                : l.status === 'PENDING'
                                ? 'bg-amber-400'
                                : l.status === 'REJECTED'
                                ? 'bg-rose-400'
                                : 'bg-gray-400'
                            }`}
                          ></span>
                          {l.status}
                        </span>
                      </td>

                      {/* Reason & Review Notes */}
                      <td className="py-3 px-3 max-w-xs truncate">
                        <div className="text-gray-300 truncate" title={l.reason}>
                          <span className="text-gray-500">Reason:</span> {l.reason}
                        </div>
                        {l.reviewNotes && (
                          <div className="text-gray-400 text-[10px] truncate" title={l.reviewNotes}>
                            <span className="text-[#C6EF2E]">HR:</span> {l.reviewNotes}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {l.status === 'PENDING' ? (
                            <>
                              <button
                                type="button"
                                title="Approve Leave"
                                onClick={() => {
                                  setReviewingLeave(l);
                                  setReviewMode('approve');
                                  setReviewNotes('');
                                  setAssignedCoverStaffId(l.coverStaffId || '');
                                }}
                                className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                <i className="fa-solid fa-check"></i>
                                Approve
                              </button>
                              <button
                                type="button"
                                title="Reject Leave"
                                onClick={() => {
                                  setReviewingLeave(l);
                                  setReviewMode('reject');
                                  setReviewNotes('');
                                }}
                                className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                              >
                                <i className="fa-solid fa-xmark"></i>
                                Reject
                              </button>
                            </>
                          ) : l.status === 'APPROVED' ? (
                            <button
                              type="button"
                              title="Cancel Approved Leave"
                              onClick={() => {
                                setReviewingLeave(l);
                                setReviewMode('cancel');
                                setReviewNotes('');
                              }}
                              className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg text-[11px] transition cursor-pointer"
                            >
                              Cancel
                            </button>
                          ) : (
                            <span className="text-gray-600 text-[11px] italic">Archived</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 2: SHIFT COVERAGE GAP ANALYSIS                       */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'coverage' && (
        <div className="space-y-4">
          <div className="bg-[#141414] p-5 rounded-2xl border border-gray-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <i className="fa-solid fa-calendar-week text-[#C6EF2E]"></i>
                  7-Day Shift Coverage Gap Assessment
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Scheduled shifts falling within approved staff leave periods
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/30">
                  Covered: {coverageData?.coveredShiftsCount || 0}
                </span>
                <span className="text-xs font-semibold px-3 py-1 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/30">
                  Uncovered Gaps: {coverageData?.uncoveredShiftsCount || 0}
                </span>
              </div>
            </div>

            {coverageData?.shifts && coverageData.shifts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#1c1c1c] text-gray-400 border-b border-gray-800 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Staff on Leave</th>
                      <th className="py-3 px-3">Role / Dept</th>
                      <th className="py-3 px-3">Shift Date & Time</th>
                      <th className="py-3 px-3">Leave Type</th>
                      <th className="py-3 px-3">Coverage Status</th>
                      <th className="py-3 px-3">Designated Cover Staff</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {coverageData.shifts.map((shift) => (
                      <tr key={shift.scheduleId} className="hover:bg-[#1a1a1a] transition">
                        <td className="py-3 px-4 font-bold text-white">{shift.staff?.name}</td>
                        <td className="py-3 px-3 text-gray-400">{shift.staff?.role}</td>
                        <td className="py-3 px-3 font-mono text-[11px] text-white">
                          <div>{new Date(shift.shiftStart).toLocaleDateString()}</div>
                          <div className="text-gray-500 text-[10px]">
                            {new Date(shift.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                            {new Date(shift.shiftEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-mono text-[10px]">
                            {shift.leaveType || 'LEAVE'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {shift.isCovered ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1 w-max">
                              <i className="fa-solid fa-check"></i> Covered
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold flex items-center gap-1 w-max">
                              <i className="fa-solid fa-triangle-exclamation"></i> Uncovered
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {shift.coverStaff ? (
                            <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                              <i className="fa-solid fa-user-check text-xs"></i>
                              {shift.coverStaff.name}
                            </div>
                          ) : (
                            <span className="text-rose-400 text-[11px] italic font-semibold">Immediate Cover Needed</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveSubTab('requests');
                              setFilterStatus('APPROVED');
                            }}
                            className="px-3 py-1 bg-[#202020] hover:bg-[#282828] text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition border border-gray-700 cursor-pointer"
                          >
                            View Leave
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <i className="fa-solid fa-shield-halved text-2xl text-emerald-400 mb-2"></i>
                <p className="text-sm font-semibold text-white">All Clear — No Upcoming Shift Coverage Gaps</p>
                <p className="text-xs text-gray-400 mt-1">
                  All active shifts for the next 7 days have adequate staffing or designated relief personnel.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* SUB-VIEW 3: STAFF QUOTAS & BALANCES DIRECTORY                 */}
      {/* ------------------------------------------------------------- */}
      {activeSubTab === 'balances' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((st) => (
            <div
              key={st.id}
              className="bg-[#141414] p-5 rounded-2xl border border-gray-800 hover:border-gray-700 transition space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#202020] border border-gray-700 flex items-center justify-center font-bold text-base text-[#C6EF2E]">
                    {st.name?.charAt(0) || 'S'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{st.name}</h4>
                    <p className="text-xs text-gray-400">{st.designation || st.role}</p>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">{st.email}</p>
                  </div>
                </div>
              </div>

              {/* Quota Indicators */}
              <div className="grid grid-cols-2 gap-3 bg-[#181818] p-3 rounded-xl border border-gray-800/80">
                <div>
                  <div className="text-[10px] text-sky-400 uppercase font-semibold">Annual Quota</div>
                  <div className="text-lg font-bold text-white font-mono">{st.annualLeaveQuota || 14} days</div>
                </div>
                <div>
                  <div className="text-[10px] text-purple-400 uppercase font-semibold">Sick Quota</div>
                  <div className="text-lg font-bold text-white font-mono">{st.sickLeaveQuota || 7} days</div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => handleViewStaffBalance(st.id)}
                  className="w-full py-2 bg-[#202020] hover:bg-[#282828] text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition border border-gray-700 cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-chart-simple text-[#C6EF2E]"></i>
                  Detailed Leave Ledger & History
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: NEW LEAVE REQUEST SUBMISSION                         */}
      {/* ------------------------------------------------------------- */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-800 w-full max-w-xl rounded-2xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#C6EF2E]/10 text-[#C6EF2E] flex items-center justify-center text-sm font-bold">
                  <i className="fa-solid fa-calendar-plus"></i>
                </div>
                <h3 className="text-lg font-bold text-white">Submit Staff Leave Request</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-white transition cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            <form onSubmit={handleSubmitLeave} className="space-y-4 text-xs">
              {/* Staff Member Selector */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Staff Member *</label>
                <select
                  required
                  value={newLeave.staffId}
                  onChange={(e) => handleStaffSelectInModal(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
                >
                  <option value="">Select staff member...</option>
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} — ({st.designation || st.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time Quota Balance Preview */}
              {staffBalancePreview && (
                <div className="bg-[#181818] p-3 rounded-xl border border-gray-800 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Annual Balance</span>
                    <p className="text-sm font-bold text-sky-400 font-mono mt-0.5">
                      {staffBalancePreview.annual?.remaining} / {staffBalancePreview.annual?.quota} d
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Sick Balance</span>
                    <p className="text-sm font-bold text-purple-400 font-mono mt-0.5">
                      {staffBalancePreview.sick?.remaining} / {staffBalancePreview.sick?.quota} d
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">Total Pending</span>
                    <p className="text-sm font-bold text-amber-400 font-mono mt-0.5">
                      {staffBalancePreview.total?.pending} d
                    </p>
                  </div>
                </div>
              )}

              {/* Leave Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Leave Type *</label>
                  <select
                    value={newLeave.leaveType}
                    onChange={(e) => setNewLeave({ ...newLeave, leaveType: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
                  >
                    <option value="CASUAL">Casual Leave</option>
                    <option value="ANNUAL">Annual Leave</option>
                    <option value="SICK">Sick Leave</option>
                    <option value="EMERGENCY">Emergency Leave</option>
                  </select>
                </div>

                {/* Duration calculated */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Requested Duration</label>
                  <div className="bg-[#1c1c1c] border border-gray-800 text-[#C6EF2E] rounded-xl px-3 py-2 font-mono font-bold text-xs flex items-center justify-between">
                    <span>{getRequestedDays()} Day(s)</span>
                    <i className="fa-regular fa-clock text-gray-500"></i>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newLeave.startDate}
                    onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newLeave.endDate}
                    onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })}
                    className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
                  />
                </div>
              </div>

              {/* Proposed Covering Staff */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">
                  Proposed Covering Staff <span className="text-gray-500">(Optional but recommended)</span>
                </label>
                <select
                  value={newLeave.coverStaffId}
                  onChange={(e) => setNewLeave({ ...newLeave, coverStaffId: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
                >
                  <option value="">No cover proposed / not required</option>
                  {staffList
                    .filter((st) => st.id !== newLeave.staffId)
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.designation || st.role})
                      </option>
                    ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Reason for Leave *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="State the clear reason for the leave request..."
                  value={newLeave.reason}
                  onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                  className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#C6EF2E] hover:bg-[#b0d825] text-black font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: HR DECISION MODAL (Approve, Reject, or Cancel)       */}
      {/* ------------------------------------------------------------- */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {reviewMode === 'approve' && (
                  <span className="text-emerald-400">
                    <i className="fa-solid fa-circle-check"></i> Approve Leave Request
                  </span>
                )}
                {reviewMode === 'reject' && (
                  <span className="text-rose-400">
                    <i className="fa-solid fa-circle-xmark"></i> Reject Leave Request
                  </span>
                )}
                {reviewMode === 'cancel' && (
                  <span className="text-gray-400">
                    <i className="fa-solid fa-ban"></i> Cancel Approved Leave
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Applicant Summary */}
            <div className="bg-[#1c1c1c] p-3.5 rounded-xl border border-gray-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400">Staff Member:</span>
                <span className="font-bold text-white">{reviewingLeave.staff?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Leave Type & Duration:</span>
                <span className="font-bold text-[#C6EF2E]">
                  {reviewingLeave.leaveType} ({reviewingLeave.daysCount} days)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Dates:</span>
                <span className="font-mono text-gray-300">
                  {new Date(reviewingLeave.startDate).toISOString().split('T')[0]} to{' '}
                  {new Date(reviewingLeave.endDate).toISOString().split('T')[0]}
                </span>
              </div>
              <div className="pt-1 text-gray-300 border-t border-gray-800">
                <span className="text-gray-500">Reason:</span> {reviewingLeave.reason}
              </div>
            </div>

            {/* Assign/Confirm Covering Staff (on Approval) */}
            {reviewMode === 'approve' && (
              <div className="text-xs">
                <label className="block text-gray-300 font-semibold mb-1">
                  Designate Shift Cover Staff <span className="text-gray-500">(Optional)</span>
                </label>
                <select
                  value={assignedCoverStaffId}
                  onChange={(e) => setAssignedCoverStaffId(e.target.value)}
                  className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
                >
                  <option value="">No cover assigned</option>
                  {staffList
                    .filter((st) => st.id !== reviewingLeave.staffId)
                    .map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({st.designation || st.role})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Review Notes / Rejection Reason */}
            <div className="text-xs">
              <label className="block text-gray-300 font-semibold mb-1">
                {reviewMode === 'reject' ? 'Rejection Reason * (Mandatory)' : 'Supervisor Remarks / Notes (Optional)'}
              </label>
              <textarea
                rows={3}
                required={reviewMode === 'reject'}
                placeholder={
                  reviewMode === 'reject'
                    ? 'State the reason for rejecting this leave request...'
                    : 'Add any supervisor review notes or handover instructions...'
                }
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-[#1c1c1c] border border-gray-700 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#C6EF2E]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-800 text-xs">
              <button
                type="button"
                onClick={() => setReviewingLeave(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                disabled={processingReview}
                onClick={handleProcessReview}
                className={`px-5 py-2 font-bold rounded-xl transition cursor-pointer flex items-center gap-2 disabled:opacity-50 ${
                  reviewMode === 'approve'
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-black'
                    : reviewMode === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {processingReview && <i className="fa-solid fa-circle-notch fa-spin"></i>}
                {reviewMode === 'approve' && 'Confirm Approval'}
                {reviewMode === 'reject' && 'Confirm Rejection'}
                {reviewMode === 'cancel' && 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: STAFF QUOTA BALANCE & HISTORICAL LEDGER              */}
      {/* ------------------------------------------------------------- */}
      {(viewingBalance || loadingBalance) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141414] border border-gray-800 w-full max-w-2xl rounded-2xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#202020] border border-gray-700 flex items-center justify-center font-bold text-base text-[#C6EF2E]">
                  {viewingBalance?.staff?.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{viewingBalance?.staff?.name || 'Staff Member'}</h3>
                  <p className="text-xs text-gray-400">
                    {viewingBalance?.staff?.designation || viewingBalance?.staff?.role} • Year {viewingBalance?.year || 2026}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingBalance(null)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <i className="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>

            {loadingBalance ? (
              <div className="py-12 text-center text-gray-400">
                <i className="fa-solid fa-circle-notch fa-spin text-2xl text-[#C6EF2E] mb-2"></i>
                <p className="text-xs">Loading ledger balance...</p>
              </div>
            ) : viewingBalance ? (
              <div className="space-y-4 text-xs">
                {/* 3-Column Quota Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#1c1c1c] p-3.5 rounded-xl border border-sky-500/20">
                    <span className="text-[10px] text-sky-400 uppercase font-semibold">Annual Leave Quota</span>
                    <div className="text-2xl font-bold text-white mt-1 font-mono">
                      {viewingBalance.summary?.annual?.remaining} d
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Used: {viewingBalance.summary?.annual?.approved}d | Quota: {viewingBalance.summary?.annual?.quota}d
                    </div>
                  </div>

                  <div className="bg-[#1c1c1c] p-3.5 rounded-xl border border-purple-500/20">
                    <span className="text-[10px] text-purple-400 uppercase font-semibold">Sick Leave Quota</span>
                    <div className="text-2xl font-bold text-white mt-1 font-mono">
                      {viewingBalance.summary?.sick?.remaining} d
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                      Used: {viewingBalance.summary?.sick?.approved}d | Quota: {viewingBalance.summary?.sick?.quota}d
                    </div>
                  </div>

                  <div className="bg-[#1c1c1c] p-3.5 rounded-xl border border-[#C6EF2E]/20">
                    <span className="text-[10px] text-[#C6EF2E] uppercase font-semibold">Pending Requests</span>
                    <div className="text-2xl font-bold text-white mt-1 font-mono">
                      {viewingBalance.summary?.total?.pending} d
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">Awaiting HR decision</div>
                  </div>
                </div>

                {/* Leave History Table */}
                <div>
                  <h4 className="font-bold text-white text-xs mb-2">Past Leave History ({viewingBalance.leaveHistory?.length || 0})</h4>
                  {viewingBalance.leaveHistory && viewingBalance.leaveHistory.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-800 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-[#1c1c1c] text-gray-400 text-[10px] uppercase font-semibold">
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Dates</th>
                            <th className="py-2.5 px-3 text-center">Days</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800 text-gray-300">
                          {viewingBalance.leaveHistory.map((h) => (
                            <tr key={h.id} className="hover:bg-[#1a1a1a]">
                              <td className="py-2.5 px-3 font-semibold text-white">{h.leaveType}</td>
                              <td className="py-2.5 px-3 font-mono text-[11px]">
                                {new Date(h.startDate).toISOString().split('T')[0]} to{' '}
                                {new Date(h.endDate).toISOString().split('T')[0]}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">{h.daysCount} d</td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    h.status === 'APPROVED'
                                      ? 'text-emerald-400 bg-emerald-500/10'
                                      : h.status === 'PENDING'
                                      ? 'text-amber-400 bg-amber-500/10'
                                      : 'text-rose-400 bg-rose-500/10'
                                  }`}
                                >
                                  {h.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-gray-400 max-w-xs truncate">{h.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs italic">No leave history recorded for this year.</p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setViewingBalance(null)}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Close Ledger
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
