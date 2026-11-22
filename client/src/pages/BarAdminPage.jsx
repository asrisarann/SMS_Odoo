import { useState, useEffect } from 'react';
import PageBanner from '../components/common/PageBanner';
import { api } from '../services/api';

const STATUS_TABS = [
  { id: 'ALL', label: 'All Tickets', icon: 'fa-layer-group' },
  { id: 'RECEIVED', label: 'New Orders', icon: 'fa-bell', badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
  { id: 'PREPARING', label: 'In Kitchen', icon: 'fa-fire-burner', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'READY', label: 'Ready for Runner', icon: 'fa-person-running', badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse' },
  { id: 'SERVED', label: 'Served', icon: 'fa-check', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
];

export default function BarAdminPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [activeView, setActiveView] = useState('KDS'); // 'KDS' | 'MENU_MANAGER'

  const formatINR = (amt) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [ordersRes, statsRes, menuRes] = await Promise.all([
          api.cafe.getOrders({ status: activeTab === 'ALL' ? undefined : activeTab, limit: 50 }).catch(() => ({ orders: [] })),
          api.cafe.getStats().catch(() => null),
          api.cafe.getMenu().catch(() => ({ menu: [] })),
        ]);

        if (isMounted) {
          if (ordersRes?.orders) setOrders(ordersRes.orders);
          if (statsRes?.stats) setStats(statsRes.stats);
          if (menuRes?.menu) setMenuItems(menuRes.menu);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load bar & lounge operations data.');
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [activeTab]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const [ordersRes, statsRes, menuRes] = await Promise.all([
        api.cafe.getOrders({ status: activeTab === 'ALL' ? undefined : activeTab, limit: 50 }).catch(() => ({ orders: [] })),
        api.cafe.getStats().catch(() => null),
        api.cafe.getMenu().catch(() => ({ menu: [] })),
      ]);
      if (ordersRes?.orders) setOrders(ordersRes.orders);
      if (statsRes?.stats) setStats(statsRes.stats);
      if (menuRes?.menu) setMenuItems(menuRes.menu);
    } catch (err) {
      setError(err.message || 'Failed to load bar & lounge operations data.');
    } finally {
      setLoading(false);
    }
  };

  // Advance Order Status in KDS
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await api.cafe.updateOrderStatus(orderId, newStatus);
      if (res?.success) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        setActionSuccess(`Order #${res.order?.orderNumber || orderId.slice(0, 8)} status marked as ${newStatus}.`);
        setTimeout(() => setActionSuccess(''), 4000);
        // refresh stats
        api.cafe.getStats().then((s) => s?.stats && setStats(s.stats)).catch(() => {});
      }
    } catch (err) {
      setError(err.message || 'Failed to update order status.');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Toggle Menu Item Availability
  const handleToggleAvailability = async (itemId) => {
    try {
      const res = await api.cafe.toggleAvailability(itemId);
      if (res?.success) {
        setMenuItems((prev) =>
          prev.map((m) => (m.id === itemId ? { ...m, isAvailable: res.item.isAvailable } : m))
        );
        setActionSuccess(res.message);
        setTimeout(() => setActionSuccess(''), 4000);
      }
    } catch (err) {
      setError(err.message || 'Failed to toggle availability.');
      setTimeout(() => setError(''), 5000);
    }
  };

  return (
    <main className="bg-[#0e0f0f] text-gray-100 min-h-screen">
      <PageBanner
        title="Court-Side Bar & KDS Operations"
        current="Bar Admin Console"
        bannerClass="banner-inner-booking"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header & View Switcher */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C6EF2E] animate-pulse"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-[#C6EF2E]">
                Kitchen Display System (KDS) & Bar Management
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white">Hospitality Operations Center</h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-[#141516] border border-[#262829] rounded-2xl p-1 flex items-center">
              <button
                onClick={() => setActiveView('KDS')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'KDS'
                    ? 'bg-[#C6EF2E] text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-bell-concierge"></i>
                <span>Kitchen Tickets</span>
              </button>

              <button
                onClick={() => setActiveView('MENU_MANAGER')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeView === 'MENU_MANAGER'
                    ? 'bg-[#C6EF2E] text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <i className="fa-solid fa-list-check"></i>
                <span>Menu Inventory</span>
              </button>
            </div>

            <button
              onClick={handleRefresh}
              className="px-3.5 py-2.5 rounded-2xl bg-[#1c1d1e] hover:bg-[#26282a] text-xs font-bold text-gray-200 transition-all border border-gray-700 flex items-center gap-2"
            >
              <i className={`fa-solid fa-arrows-rotate text-[#C6EF2E] ${loading ? 'fa-spin' : ''}`}></i>
              <span className="hidden md:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Feedback Alerts */}
        {error && (
          <div className="p-3.5 mb-6 rounded-2xl bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
            <button onClick={() => setError('')} className="text-rose-400 hover:text-white">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {actionSuccess && (
          <div className="p-3.5 mb-6 rounded-2xl bg-[#C6EF2E]/10 text-[#C6EF2E] border border-[#C6EF2E]/30 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-circle-check"></i>
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess('')} className="text-gray-400 hover:text-white">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        )}

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 rounded-3xl bg-[#141516] border border-[#242627] shadow-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Today's Bar Revenue
              </span>
              <span className="w-8 h-8 rounded-xl bg-[#C6EF2E]/10 text-[#C6EF2E] flex items-center justify-center text-sm">
                <i className="fa-solid fa-indian-rupee-sign"></i>
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-white font-mono">
              {formatINR(stats?.todayRevenue || 0)}
            </div>
            <div className="text-[10px] text-[#C6EF2E] mt-1">
              {stats?.todayOrders || 0} tabs processed today
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#141516] border border-[#242627] shadow-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Active Kitchen Tickets
              </span>
              <span className="w-8 h-8 rounded-xl bg-amber-400/10 text-amber-300 flex items-center justify-center text-sm">
                <i className="fa-solid fa-fire-burner"></i>
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-amber-300 font-mono">
              {stats?.activeTickets || 0}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Received & preparing</div>
          </div>

          <div className="p-4 rounded-3xl bg-[#141516] border border-[#242627] shadow-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Ready for Delivery
              </span>
              <span className="w-8 h-8 rounded-xl bg-blue-400/10 text-blue-300 flex items-center justify-center text-sm">
                <i className="fa-solid fa-person-running"></i>
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-blue-300 font-mono">
              {stats?.readyForDelivery || 0}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Awaiting runner / pickup</div>
          </div>

          <div className="p-4 rounded-3xl bg-[#141516] border border-[#242627] shadow-xl">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Served Completed
              </span>
              <span className="w-8 h-8 rounded-xl bg-emerald-400/10 text-emerald-300 flex items-center justify-center text-sm">
                <i className="fa-solid fa-circle-check"></i>
              </span>
            </div>
            <div className="text-xl md:text-2xl font-black text-emerald-300 font-mono">
              {stats?.servedTickets || 0}
            </div>
            <div className="text-[10px] text-gray-400 mt-1">Delivered to courts & lounge</div>
          </div>
        </div>

        {/* VIEW 1: KITCHEN DISPLAY SYSTEM TICKETS */}
        {activeView === 'KDS' && (
          <div>
            {/* Status Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
              {STATUS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-[#C6EF2E] text-black shadow-lg shadow-[#C6EF2E]/10'
                      : 'bg-[#141516] text-gray-400 border border-[#242627] hover:border-gray-600'
                  }`}
                >
                  <i className={`fa-solid ${tab.icon}`}></i>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Ticket Cards Grid */}
            {loading ? (
              <div className="py-20 text-center text-gray-400">
                <i className="fa-solid fa-circle-notch fa-spin text-3xl text-[#C6EF2E] mb-3"></i>
                <p className="text-xs">Updating Kitchen Display Tickets...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="py-16 text-center bg-[#141516] border border-[#242627] rounded-3xl p-8">
                <div className="w-16 h-16 rounded-full bg-[#1c1d1e] flex items-center justify-center text-gray-500 text-2xl mx-auto mb-3">
                  <i className="fa-solid fa-mug-hot"></i>
                </div>
                <h4 className="text-base font-bold text-white mb-1">No Orders in this Queue</h4>
                <p className="text-xs text-gray-400">
                  {activeTab === 'ALL'
                    ? 'No orders recorded yet.'
                    : `No orders currently marked as '${activeTab}'.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {orders.map((order) => {
                  return (
                    <div
                      key={order.id}
                      className="bg-[#141516] border border-[#252728] rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-gray-600 transition-all"
                    >
                      <div>
                        {/* Ticket Top Row: Order #, Time, Status Pill */}
                        <div className="flex items-center justify-between pb-3 border-b border-[#212224] mb-3">
                          <div>
                            <span className="font-mono font-black text-sm text-[#C6EF2E]">
                              {order.orderNumber}
                            </span>
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {order.dateTime ? new Date(order.dateTime).toLocaleTimeString() : 'Just now'}
                            </div>
                          </div>

                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              order.status === 'RECEIVED'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                                : order.status === 'PREPARING'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : order.status === 'READY'
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>

                        {/* Destination Pill & Member Info */}
                        <div className="flex items-center justify-between gap-2 mb-3 bg-[#0f1011] p-2.5 rounded-xl border border-[#202122]">
                          <div>
                            <div className="text-xs font-bold text-white">
                              {order.user?.name || 'Walk-in Guest'}
                            </div>
                            <div className="text-[10px] text-gray-400">
                              {order.user?.phone || 'No Phone'}
                            </div>
                          </div>

                          <div className="text-right">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase inline-block ${
                                order.deliveryLocation === 'COURT_SIDE'
                                  ? 'bg-[#C6EF2E]/20 text-[#C6EF2E] border border-[#C6EF2E]/40'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                              }`}
                            >
                              <i
                                className={`fa-solid ${
                                  order.deliveryLocation === 'COURT_SIDE'
                                    ? 'fa-bolt'
                                    : order.deliveryLocation === 'BAR_LOUNGE'
                                    ? 'fa-chair'
                                    : 'fa-bag-shopping'
                                } mr-1`}
                              ></i>
                              {order.courtNumber || (order.tableNumber ? `Table #${order.tableNumber}` : 'Takeaway')}
                            </span>
                          </div>
                        </div>

                        {/* Itemized Order List */}
                        <div className="space-y-1.5 mb-3">
                          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            Ticket Items:
                          </div>
                          {order.items && order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs py-1 border-b border-[#1c1d1e] last:border-none"
                              >
                                <span className="font-semibold text-gray-200">
                                  <span className="text-[#C6EF2E] font-bold mr-1.5">
                                    {item.quantity}x
                                  </span>
                                  {item.name}
                                </span>
                                <span className="text-gray-400 font-mono text-[11px]">
                                  {formatINR(item.totalPrice)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs text-gray-300">
                              {order.orderItems?.join(', ') || 'Custom order items'}
                            </div>
                          )}
                        </div>

                        {/* Customer Notes */}
                        {order.notes && (
                          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 mb-3">
                            <i className="fa-solid fa-comment-dots mr-1.5"></i>
                            <strong className="font-bold">Note:</strong> {order.notes}
                          </div>
                        )}
                      </div>

                      {/* Bottom Total & KDS Advance Controls */}
                      <div className="pt-3 border-t border-[#212224] mt-2">
                        <div className="flex items-center justify-between mb-3 text-xs">
                          <span className="text-gray-400">Total Charged:</span>
                          <span className="font-black text-[#C6EF2E] text-sm">
                            {formatINR(order.totalAmount)}
                          </span>
                        </div>

                        {/* Status Transition Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                          {order.status === 'RECEIVED' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'PREPARING')}
                                className="col-span-2 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs transition-all flex items-center justify-center gap-1.5"
                              >
                                <i className="fa-solid fa-fire-burner"></i>
                                <span>Start Prep</span>
                              </button>
                            </>
                          )}

                          {order.status === 'PREPARING' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'READY')}
                                className="col-span-2 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                              >
                                <i className="fa-solid fa-person-running"></i>
                                <span>Mark Ready for Runner</span>
                              </button>
                            </>
                          )}

                          {order.status === 'READY' && (
                            <>
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'SERVED')}
                                className="col-span-2 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
                              >
                                <i className="fa-solid fa-circle-check"></i>
                                <span>Mark Served ✓</span>
                              </button>
                            </>
                          )}

                          {order.status === 'SERVED' && (
                            <div className="col-span-2 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-center text-[11px] font-bold">
                              ✓ Completed & Delivered
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: MENU INVENTORY & AVAILABILITY MANAGER */}
        {activeView === 'MENU_MANAGER' && (
          <div className="bg-[#141516] border border-[#242627] rounded-3xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#242627]">
              <div>
                <h3 className="text-xl font-black text-white">Menu Availability & Stock Control</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  1-Click toggle to switch items between 'In Stock' and 'Sold Out' in real-time.
                </p>
              </div>
              <span className="text-xs text-[#C6EF2E] font-bold">
                {menuItems.length} Active Items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    item.isAvailable
                      ? 'bg-[#111213] border-[#262829]'
                      : 'bg-[#181313] border-red-900/40 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white mb-0.5">{item.name}</h4>
                      <span className="text-[10px] text-[#C6EF2E] uppercase font-bold tracking-wider">
                        {item.category}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-white text-xs">
                      {formatINR(item.price)}
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 line-clamp-2 mb-3">
                    {item.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-[#222425]">
                    <span
                      className={`text-[11px] font-bold ${
                        item.isAvailable ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.isAvailable ? '● Available' : '○ Sold Out'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(item.id)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        item.isAvailable
                          ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500 hover:text-black border border-emerald-500/30'
                      }`}
                    >
                      {item.isAvailable ? 'Mark Sold Out' : 'Restock'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
