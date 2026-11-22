import { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';

export default function CrmLeadsTab({ showAlert }) {
  const [enquiries, setEnquiries] = useState([]);
  const [overview, setOverview] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [sportFilter, setSportFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Lead Modal / Action State
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [activeActionTab, setActiveActionTab] = useState('status'); // 'status', 'quote', 'trial', 'convert'
  const [actionLoading, setActionLoading] = useState(false);

  // Action Form States
  const [statusUpdate, setStatusUpdate] = useState({ status: 'CONTACTED', notes: '' });
  const [quoteForm, setQuoteForm] = useState({ quoteAmount: 2500, discountOffered: 15, validUntilDays: 7, notes: '' });
  const [trialForm, setTrialForm] = useState({ trialDate: new Date().toISOString().split('T')[0], trialTime: '10:00 AM', court: 'Panoramic Match Court 1', notes: '' });
  const [convertForm, setConvertForm] = useState({ membershipTier: 'GOLD', initialWalletCredit: 500, password: '' });

  // Load CRM leads and pipeline metrics
  const loadCrmData = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [leadsRes, overviewRes] = await Promise.all([
        api.crm.getEnquiries({
          page,
          limit: 10,
          status: statusFilter || undefined,
          sport: sportFilter || undefined,
          search: searchTerm || undefined,
        }),
        api.crm.getOverview().catch(() => null),
      ]);

      setEnquiries(leadsRes.enquiries || []);
      setPagination(leadsRes.pagination || { page: 1, limit: 10, totalRecords: 0, totalPages: 1 });
      if (overviewRes) setOverview(overviewRes);
    } catch (err) {
      if (showAlert) showAlert('error', err.message || 'Failed to load CRM leads');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, sportFilter, searchTerm, showAlert]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(async () => {
      if (!isMounted) return;
      loadCrmData(1);
    });
    return () => {
      isMounted = false;
    };
  }, [loadCrmData]);

  // Open modal for a lead
  const handleOpenLead = (enquiry) => {
    setSelectedEnquiry(enquiry);
    setStatusUpdate({ status: enquiry.status || 'CONTACTED', notes: '' });
    setActiveActionTab('status');
  };

  // 1. Update Status & Add Follow-up Note
  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setActionLoading(true);
    try {
      const res = await api.crm.updateStatus(selectedEnquiry.id, statusUpdate);
      if (showAlert) showAlert('success', res.message || 'Lead status updated.');
      setSelectedEnquiry(null);
      loadCrmData(pagination.page);
    } catch (err) {
      if (showAlert) showAlert('error', err.message || 'Failed to update lead status');
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Send Quotation Email
  const handleSendQuote = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setActionLoading(true);
    try {
      const res = await api.crm.sendQuote(selectedEnquiry.id, {
        quoteAmount: Number(quoteForm.quoteAmount),
        discountOffered: Number(quoteForm.discountOffered),
        validUntilDays: Number(quoteForm.validUntilDays),
        notes: quoteForm.notes,
      });
      if (showAlert) showAlert('success', res.message || 'Quotation dispatched to lead.');
      setSelectedEnquiry(null);
      loadCrmData(pagination.page);
    } catch (err) {
      if (showAlert) showAlert('error', err.message || 'Failed to dispatch quotation');
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Book Complimentary Trial Session
  const handleBookTrial = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setActionLoading(true);
    try {
      const res = await api.crm.bookTrial(selectedEnquiry.id, trialForm);
      if (showAlert) showAlert('success', res.message || 'Trial session confirmed.');
      setSelectedEnquiry(null);
      loadCrmData(pagination.page);
    } catch (err) {
      if (showAlert) showAlert('error', err.message || 'Failed to book trial session');
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Convert Lead to Member
  const handleConvertLead = async (e) => {
    e.preventDefault();
    if (!selectedEnquiry) return;
    setActionLoading(true);
    try {
      const res = await api.crm.convertLead(selectedEnquiry.id, {
        membershipTier: convertForm.membershipTier,
        initialWalletCredit: Number(convertForm.initialWalletCredit),
        password: convertForm.password || undefined,
      });
      if (showAlert) {
        showAlert('success', res.message || `Lead converted to member (${convertForm.membershipTier})!`);
      }
      setSelectedEnquiry(null);
      loadCrmData(pagination.page);
    } catch (err) {
      if (showAlert) showAlert('error', err.message || 'Failed to convert lead to member');
    } finally {
      setActionLoading(false);
    }
  };

  const counts = overview?.pipelineCounts || {};

  return (
    <div className="space-y-6">
      {/* Header and Pipeline Stats */}
      <div className="bg-[#161616] p-5 rounded-2xl border border-gray-800 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
              <i className="fa-solid fa-funnel-dollar text-lime-400"></i>
              Online Inquiries & CRM Leads Pipeline (Scene 5)
            </h4>
            <p className="text-xs text-gray-400 mb-0">
              Manage prospective club inquiries, dispatch quotes, schedule trials, and convert leads.
            </p>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full font-mono font-semibold border border-emerald-400/20">
            Conversion Rate: {overview?.conversionRate || '0%'}
          </span>
        </div>

        {/* Pipeline Stage KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs pt-2 border-t border-gray-800/80">
          <div
            onClick={() => setStatusFilter(statusFilter === 'NEW' ? '' : 'NEW')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              statusFilter === 'NEW' ? 'border-lime-400 bg-lime-400/10' : 'border-gray-800 bg-[#111111] hover:border-gray-700'
            }`}
          >
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">New Leads</span>
            <span className="text-xl font-bold font-mono text-lime-400 block mt-0.5">{counts.NEW || 0}</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'CONTACTED' ? '' : 'CONTACTED')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              statusFilter === 'CONTACTED' ? 'border-blue-400 bg-blue-400/10' : 'border-gray-800 bg-[#111111] hover:border-gray-700'
            }`}
          >
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Contacted</span>
            <span className="text-xl font-bold font-mono text-blue-400 block mt-0.5">{counts.CONTACTED || 0}</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'QUOTE_SENT' ? '' : 'QUOTE_SENT')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              statusFilter === 'QUOTE_SENT' ? 'border-purple-400 bg-purple-400/10' : 'border-gray-800 bg-[#111111] hover:border-gray-700'
            }`}
          >
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Quotes Sent</span>
            <span className="text-xl font-bold font-mono text-purple-400 block mt-0.5">{counts.QUOTE_SENT || 0}</span>
          </div>

          <div
            onClick={() => setStatusFilter(statusFilter === 'CONVERTED' ? '' : 'CONVERTED')}
            className={`p-3 rounded-xl border cursor-pointer transition ${
              statusFilter === 'CONVERTED' ? 'border-emerald-400 bg-emerald-400/10' : 'border-gray-800 bg-[#111111] hover:border-gray-700'
            }`}
          >
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Converted</span>
            <span className="text-xl font-bold font-mono text-emerald-400 block mt-0.5">{counts.CONVERTED || 0}</span>
          </div>

          <div className="p-3 rounded-xl border border-gray-800 bg-[#111111]">
            <span className="text-gray-400 text-[10px] uppercase tracking-wider block">Trial Requests</span>
            <span className="text-xl font-bold font-mono text-amber-400 block mt-0.5">{overview?.totalTrialsRequested || 0}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161616] p-4 rounded-2xl border border-gray-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111111] border border-gray-700 rounded-xl px-3 py-2 text-white text-xs"
          >
            <option value="">All Pipeline Stages</option>
            <option value="NEW">New Leads</option>
            <option value="CONTACTED">Contacted</option>
            <option value="QUOTE_SENT">Quote Sent</option>
            <option value="CONVERTED">Converted to Member</option>
            <option value="CLOSED_LOST">Closed / Lost</option>
          </select>

          {/* Sport Filter */}
          <select
            value={sportFilter}
            onChange={(e) => setSportFilter(e.target.value)}
            className="bg-[#111111] border border-gray-700 rounded-xl px-3 py-2 text-white text-xs"
          >
            <option value="">All Sports</option>
            <option value="PADEL_COURT">Panoramic Padel</option>
            <option value="TENNIS">Tennis</option>
            <option value="BADMINTON">Badminton</option>
            <option value="CRICKET">Cricket</option>
          </select>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#111111] border border-gray-700 rounded-xl px-3 py-2 text-white text-xs flex-1 min-w-[200px]"
          />
        </div>

        <button
          type="button"
          onClick={() => loadCrmData(1)}
          className="px-3 py-2 rounded-xl font-bold text-xs bg-gray-800 hover:bg-gray-700 text-lime-400 border border-gray-700 flex items-center gap-1.5"
        >
          <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`}></i>
          Refresh Leads
        </button>
      </div>

      {/* Leads Table */}
      <div className="bg-[#161616] rounded-2xl border border-gray-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-gray-900/50">
              <tr>
                <th className="p-3.5">Lead Contact</th>
                <th className="p-3.5">Facility & Plan</th>
                <th className="p-3.5">Trial Request</th>
                <th className="p-3.5">Pipeline Stage</th>
                <th className="p-3.5">Inquiry Date</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {enquiries.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-800/30 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-lime-400/10 text-lime-400 flex items-center justify-center font-bold text-[10px]">
                        {lead.name?.[0] || 'L'}
                      </span>
                      {lead.name}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{lead.email}</div>
                    <div className="text-[10px] text-gray-500 font-mono">{lead.phone}</div>
                  </td>
                  <td className="p-3.5">
                    <div className="text-gray-200 font-semibold">{lead.sportOfInterest?.replace('_', ' ') || 'Any Facility'}</div>
                    <div className="text-[10px] text-lime-400">{lead.membershipOfInterest || 'General Inquiry'}</div>
                  </td>
                  <td className="p-3.5">
                    {lead.isTrialRequested ? (
                      <div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          🎾 Trial Requested
                        </span>
                        {lead.preferredTrialDate && (
                          <div className="text-[10px] text-gray-400 mt-1 font-mono">
                            {new Date(lead.preferredTrialDate).toLocaleDateString()} ({lead.preferredTrialTime || 'Morning'})
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-500 text-[11px]">No trial requested</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      lead.status === 'NEW'
                        ? 'bg-lime-500/20 text-lime-300 border-lime-500/30'
                        : lead.status === 'CONTACTED'
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                        : lead.status === 'QUOTE_SENT'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : lead.status === 'CONVERTED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-gray-700/50 text-gray-400 border-gray-600'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-gray-400 font-mono text-[11px]">
                    {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenLead(lead)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-lime-400 border border-gray-700 transition"
                    >
                      Manage Lead &rarr;
                    </button>
                  </td>
                </tr>
              ))}
              {enquiries.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500 text-xs">
                    No CRM inquiries found matching the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-3 border-t border-gray-800 text-xs text-gray-400">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalRecords} total inquiries)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => loadCrmData(pagination.page - 1)}
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => loadCrmData(pagination.page + 1)}
              className="px-3 py-1 rounded bg-gray-800 border border-gray-700 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Lead Management Action Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1A1D20] border border-gray-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-white text-lg font-bold mb-0.5">
                  Lead: {selectedEnquiry.name}
                </h4>
                <div className="text-xs text-gray-400">
                  {selectedEnquiry.email} • {selectedEnquiry.phone}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEnquiry(null)}
                className="text-gray-400 hover:text-white text-xl bg-transparent border-0 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Lead Message Quote */}
            {selectedEnquiry.message && (
              <div className="p-3 rounded-xl bg-gray-900/80 border border-gray-800 text-xs text-gray-300">
                <strong className="text-lime-400">Visitor Message:</strong> &ldquo;{selectedEnquiry.message}&rdquo;
              </div>
            )}

            {/* Action Navigation Tabs */}
            <div className="flex border-b border-gray-800 text-xs gap-4">
              <button
                type="button"
                onClick={() => setActiveActionTab('status')}
                className={`pb-2 font-bold transition ${
                  activeActionTab === 'status' ? 'text-lime-400 border-b-2 border-lime-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Update Stage
              </button>
              <button
                type="button"
                onClick={() => setActiveActionTab('quote')}
                className={`pb-2 font-bold transition ${
                  activeActionTab === 'quote' ? 'text-lime-400 border-b-2 border-lime-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Send Quote
              </button>
              <button
                type="button"
                onClick={() => setActiveActionTab('trial')}
                className={`pb-2 font-bold transition ${
                  activeActionTab === 'trial' ? 'text-lime-400 border-b-2 border-lime-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Book Trial
              </button>
              <button
                type="button"
                onClick={() => setActiveActionTab('convert')}
                className={`pb-2 font-bold transition ${
                  activeActionTab === 'convert' ? 'text-lime-400 border-b-2 border-lime-400' : 'text-gray-400 hover:text-white'
                }`}
              >
                Convert to Member
              </button>
            </div>

            {/* TAB 1: UPDATE STATUS & NOTES */}
            {activeActionTab === 'status' && (
              <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Pipeline Stage</label>
                  <select
                    value={statusUpdate.status}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, status: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="NEW">NEW (Awaiting Initial Contact)</option>
                    <option value="CONTACTED">CONTACTED (Follow-up In Progress)</option>
                    <option value="QUOTE_SENT">QUOTE_SENT (Offer Dispatched)</option>
                    <option value="CONVERTED">CONVERTED (Registered Member)</option>
                    <option value="CLOSED_LOST">CLOSED_LOST (Not Interested)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Staff Follow-Up Note</label>
                  <textarea
                    rows="3"
                    placeholder="Enter call notes or next action steps..."
                    value={statusUpdate.notes}
                    onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(null)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white border border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-accent text-xs py-2 px-4"
                  >
                    {actionLoading ? 'Saving...' : 'Save Stage & Notes'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: SEND QUOTATION */}
            {activeActionTab === 'quote' && (
              <form onSubmit={handleSendQuote} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-300 font-semibold block mb-1">Quote Amount (₹)</label>
                    <input
                      type="number"
                      value={quoteForm.quoteAmount}
                      onChange={(e) => setQuoteForm({ ...quoteForm, quoteAmount: e.target.value })}
                      required
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-semibold block mb-1">Discount Offered (%)</label>
                    <input
                      type="number"
                      value={quoteForm.discountOffered}
                      onChange={(e) => setQuoteForm({ ...quoteForm, discountOffered: e.target.value })}
                      required
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    value={quoteForm.validUntilDays}
                    onChange={(e) => setQuoteForm({ ...quoteForm, validUntilDays: e.target.value })}
                    required
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Custom Notes in Quote Email</label>
                  <textarea
                    rows="2"
                    placeholder="Special package inclusions, complimentary court hours..."
                    value={quoteForm.notes}
                    onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(null)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white border border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-accent text-xs py-2 px-4"
                  >
                    {actionLoading ? 'Dispatching...' : 'Email Quotation'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: BOOK TRIAL SESSION */}
            {activeActionTab === 'trial' && (
              <form onSubmit={handleBookTrial} className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Court / Facility</label>
                  <input
                    type="text"
                    value={trialForm.court}
                    onChange={(e) => setTrialForm({ ...trialForm, court: e.target.value })}
                    required
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-300 font-semibold block mb-1">Trial Date</label>
                    <input
                      type="date"
                      value={trialForm.trialDate}
                      onChange={(e) => setTrialForm({ ...trialForm, trialDate: e.target.value })}
                      required
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-gray-300 font-semibold block mb-1">Time Slot</label>
                    <input
                      type="text"
                      placeholder="e.g. 10:00 AM"
                      value={trialForm.trialTime}
                      onChange={(e) => setTrialForm({ ...trialForm, trialTime: e.target.value })}
                      required
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(null)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white border border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-accent text-xs py-2 px-4"
                  >
                    {actionLoading ? 'Scheduling...' : 'Confirm Trial Session'}
                  </button>
                </div>
              </form>
            )}

            {/* TAB 4: CONVERT LEAD TO MEMBER */}
            {activeActionTab === 'convert' && (
              <form onSubmit={handleConvertLead} className="space-y-3 text-xs">
                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Membership Plan</label>
                  <select
                    value={convertForm.membershipTier}
                    onChange={(e) => setConvertForm({ ...convertForm, membershipTier: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  >
                    <option value="GOLD">Gold Tier (20% Off Courts & Services)</option>
                    <option value="SILVER">Silver Tier (10% Off Courts & Services)</option>
                    <option value="JUNIOR">Junior Tier (15% Off Courts & Services)</option>
                  </select>
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Initial Wallet Credit (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={convertForm.initialWalletCredit}
                    onChange={(e) => setConvertForm({ ...convertForm, initialWalletCredit: e.target.value })}
                    required
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-gray-300 font-semibold block mb-1">Initial Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to auto-generate"
                    value={convertForm.password}
                    onChange={(e) => setConvertForm({ ...convertForm, password: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEnquiry(null)}
                    className="px-4 py-2 rounded-xl text-gray-400 hover:text-white border border-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="btn btn-accent text-xs py-2 px-4"
                  >
                    {actionLoading ? 'Converting...' : 'Convert to Registered Member'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
