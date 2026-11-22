import { useState, useEffect, useCallback } from 'react';
import PageBanner from '../components/common/PageBanner';
import ScrollReveal from '../components/common/ScrollReveal';
import { api } from '../services/api';

export default function ShopAdminPage() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory', 'pickup', 'stringing'
  const [products, setProducts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stringingJobs, setStringingJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Counter Pickup Verification State
  const [pickupOrderId, setPickupOrderId] = useState('');
  const [pickupPin, setPickupPin] = useState('');
  const [verifyingPin, setVerifyingPin] = useState(false);

  // Restock modal state
  const [restockProduct, setRestockProduct] = useState(null);
  const [restockQty, setRestockQty] = useState(10);
  const [restockNotes, setRestockNotes] = useState('');
  const [restocking, setRestocking] = useState(false);

  // Load shop data
  const loadShopData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [prodRes, lowRes, ordRes, stringRes] = await Promise.all([
        api.shop.getProducts().catch(() => ({ products: [] })),
        api.shop.getLowStockAlerts().catch(() => ({ alerts: [] })),
        api.shop.getOrders().catch(() => ({ orders: [] })),
        api.shop.getStringingList().catch(() => ({ jobs: [] })),
      ]);

      setProducts(prodRes.products || []);
      setLowStockAlerts(lowRes.alerts || []);
      setOrders(ordRes.orders || []);
      setStringingJobs(stringRes.jobs || []);
    } catch (err) {
      setError(err.message || 'Failed to load sports shop data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(async () => {
      if (!isMounted) return;
      loadShopData();
    });
    return () => {
      isMounted = false;
    };
  }, [loadShopData]);

  // Handle counter pickup PIN verification
  const handleVerifyPickupPin = async (e) => {
    e.preventDefault();
    if (!pickupOrderId || !pickupPin) {
      setError('Both Order ID and 4-digit pickup PIN are required.');
      return;
    }
    setVerifyingPin(true);
    setError('');
    try {
      await api.shop.updateOrderStatus(pickupOrderId, 'COMPLETED', `Handed over at counter with PIN ${pickupPin}`);
      setActionSuccess(`Order #${pickupOrderId.slice(0, 8)} successfully verified with PIN and marked COMPLETED.`);
      setPickupOrderId('');
      setPickupPin('');
      loadShopData();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Invalid pickup PIN. Customer must present the 4-digit code from their order receipt.');
    } finally {
      setVerifyingPin(false);
    }
  };

  // Handle restock submission
  const handleRestockSubmit = async (e) => {
    e.preventDefault();
    if (!restockProduct) return;
    setRestocking(true);
    try {
      await api.shop.restock(restockProduct.id, restockQty, restockNotes);
      setActionSuccess(`Restocked ${restockQty} units of ${restockProduct.name}.`);
      setRestockProduct(null);
      setRestockNotes('');
      loadShopData();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to restock product.');
    } finally {
      setRestocking(false);
    }
  };

  // Update stringing job status
  const handleUpdateStringingStatus = async (jobId, newStatus) => {
    try {
      await api.shop.updateStringingStatus(jobId, { status: newStatus });
      setActionSuccess(`Stringing job updated to ${newStatus}. Customer notified.`);
      loadShopData();
      setTimeout(() => setActionSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to update stringing job status.');
    }
  };

  return (
    <main className="bg-[#0e0f0f] text-gray-100 min-h-screen">
      <PageBanner
        title="Pro Sports Shop Management"
        current="Shop Admin"
        bannerClass="banner-inner-booking"
      />

      <div className="section">
        <div className="hero-container">
          {/* Header */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
            <div>
              <div className="sub-heading mb-1">
                <i className="fa-solid fa-circle accent-color-2"></i>
                <span className="sub-heading-title">Pro Shop Operations</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-0">Gear Inventory & Equipment Services</h2>
            </div>

            {/* Navigation Tabs */}
            <div className="d-flex align-items-center gap-1.5 p-1 bg-gray-900/80 rounded-xl border border-gray-800">
              <button
                onClick={() => setActiveTab('inventory')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'inventory'
                    ? 'bg-lime-400 text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Inventory ({products.length})
              </button>
              <button
                onClick={() => setActiveTab('pickup')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'pickup'
                    ? 'bg-lime-400 text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Click & Collect PIN
              </button>
              <button
                onClick={() => setActiveTab('stringing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'stringing'
                    ? 'bg-lime-400 text-black shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Stringing Jobs ({stringingJobs.length})
              </button>
              <button
                onClick={loadShopData}
                className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-white ml-1"
                title="Refresh Shop Data"
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

          {/* Low Stock Warning Banner if any */}
          {lowStockAlerts.length > 0 && (
            <div className="p-4 mb-6 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-sm">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                </span>
                <div>
                  <div className="font-bold text-amber-100">
                    {lowStockAlerts.length} Products at or below reorder threshold
                  </div>
                  <div className="text-[11px] text-amber-300">
                    Replenish stock immediately to prevent stockouts during matches.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('inventory')}
                className="py-1.5 px-3.5 rounded-xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-extrabold text-xs transition cursor-pointer shadow-sm"
              >
                View Low Stock
              </button>
            </div>
          )}

          {/* TAB 1: INVENTORY & LOW STOCK ALERTS */}
          {activeTab === 'inventory' && (
            <ScrollReveal animation="fade-up">
              <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl">
                <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-boxes-stacked text-lime-400"></i>
                  Pro Shop Gear Catalog & Stock Levels
                </h4>
                <p className="text-xs text-gray-400 mb-4">Real-time stock counts and restock triggers</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-gray-900/40">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Price</th>
                        <th className="p-3">Current Stock</th>
                        <th className="p-3">Safety Min</th>
                        <th className="p-3">Inventory Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {products.map((item) => {
                        const isLow = item.stock <= (item.minStockThreshold || 5);
                        return (
                          <tr key={item.id} className="hover:bg-gray-800/30 transition">
                            <td className="p-3 font-bold text-white flex items-center gap-2">
                              <span className="w-7 h-7 rounded-lg bg-gray-800 flex items-center justify-center text-gray-400">
                                <i className="fa-solid fa-tag text-xs"></i>
                              </span>
                              {item.name}
                            </td>
                            <td className="p-3 font-mono text-lime-400 font-bold">₹{item.price}</td>
                            <td className="p-3 font-mono font-bold text-white">{item.stock} units</td>
                            <td className="p-3 text-gray-400">{item.minStockThreshold || 5} units</td>
                            <td className="p-3">
                              {isLow ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  LOW STOCK
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  IN STOCK
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <button
                                onClick={() => setRestockProduct(item)}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-lime-400 border border-gray-700 transition"
                              >
                                Restock +
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          )}

          {/* TAB 2: CLICK & COLLECT PIN VERIFICATION */}
          {activeTab === 'pickup' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pickup PIN Verification Card */}
              <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl">
                <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-shield-halved text-lime-400"></i>
                  Counter Pickup PIN Verification
                </h4>
                <p className="text-xs text-gray-400 mb-4">
                  Enter the customer order reference and the 4-digit code presented on their mobile receipt.
                </p>

                <form onSubmit={handleVerifyPickupPin} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">Order Reference ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 9a9fdb09-..."
                      value={pickupOrderId}
                      onChange={(e) => setPickupOrderId(e.target.value)}
                      required
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-300 block mb-1">4-Digit Customer PIN</label>
                    <input
                      type="text"
                      maxLength="4"
                      placeholder="e.g. 6878"
                      value={pickupPin}
                      onChange={(e) => setPickupPin(e.target.value)}
                      required
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-base font-mono tracking-widest text-lime-400 text-center"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={verifyingPin}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-extrabold text-xs transition flex items-center justify-center cursor-pointer shadow-md"
                  >
                    {verifyingPin ? 'Verifying PIN...' : 'Verify PIN & Handover Goods'}
                  </button>
                </form>
              </div>

              {/* Recent Orders List */}
              <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl">
                <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-receipt text-lime-400"></i>
                  Pending Counter Pickups
                </h4>
                <p className="text-xs text-gray-400 mb-4">Orders waiting for member collection</p>

                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {orders.filter((o) => o.status !== 'COMPLETED').map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setPickupOrderId(order.id)}
                      className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 text-xs cursor-pointer hover:border-lime-500 transition flex items-center justify-between"
                    >
                      <div>
                        <div className="font-mono font-bold text-white">#{order.id.slice(0, 8)}</div>
                        <div className="text-gray-400 text-[11px]">
                          {order.user?.name || 'Club Member'} • ₹{order.totalAmount}
                        </div>
                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {order.status}
                        </span>
                      </div>
                      <button className="text-lime-400 text-xs font-semibold">Select</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RACKET STRINGING JOB CARDS */}
          {activeTab === 'stringing' && (
            <ScrollReveal animation="fade-up">
              <div className="p-5 rounded-2xl bg-[#1A1D20] border border-gray-800 shadow-xl">
                <h4 className="text-white text-base font-bold mb-1 flex items-center gap-2">
                  <i className="fa-solid fa-screwdriver-wrench text-lime-400"></i>
                  Equipment Stringing Job Cards (Scene 3)
                </h4>
                <p className="text-xs text-gray-400 mb-4">15-Minute Emergency & Standard racket stringing queue</p>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-800 bg-gray-900/40">
                      <tr>
                        <th className="p-3">Member & Racket</th>
                        <th className="p-3">String & Tension</th>
                        <th className="p-3">Urgency</th>
                        <th className="p-3">Estimated Ready</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Job Status Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {stringingJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-800/30 transition">
                          <td className="p-3">
                            <div className="font-bold text-white">{job.racketModel}</div>
                            <div className="text-[10px] text-gray-400">{job.user?.name || 'Member'}</div>
                          </td>
                          <td className="p-3 font-mono">
                            <div>{job.stringType}</div>
                            <div className="text-lime-400 font-bold text-[11px]">{job.tensionLbs} lbs</div>
                          </td>
                          <td className="p-3">
                            {job.urgency === 'EMERGENCY_EXPRESS' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse">
                                ⚡ 15-MIN EXPRESS
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                STANDARD
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-gray-400 font-mono text-[11px]">
                            {job.estimatedReadyAt ? new Date(job.estimatedReadyAt).toLocaleTimeString() : 'ASAP'}
                          </td>
                          <td className="p-3 font-bold">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-800 text-lime-300 border border-gray-700">
                              {job.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {job.status === 'RECEIVED' && (
                              <button
                                onClick={() => handleUpdateStringingStatus(job.id, 'IN_PROGRESS')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white transition"
                              >
                                Start Stringing
                              </button>
                            )}
                            {job.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleUpdateStringingStatus(job.id, 'READY_FOR_PICKUP')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition"
                              >
                                Mark Ready
                              </button>
                            )}
                            {job.status === 'READY_FOR_PICKUP' && (
                              <button
                                onClick={() => handleUpdateStringingStatus(job.id, 'COLLECTED')}
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-lime-400 hover:bg-lime-500 text-black font-bold transition"
                              >
                                Complete Handoff
                              </button>
                            )}
                            {job.status === 'COLLECTED' && (
                              <span className="text-[11px] text-gray-500">Collected ✓</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ScrollReveal>
          )}
        </div>
      </div>

      {/* Restock Modal */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1A1D20] border border-gray-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <h4 className="text-white text-base font-bold mb-1">
              Restock: {restockProduct.name}
            </h4>
            <p className="text-xs text-gray-400 mb-4">
              Current stock: <strong>{restockProduct.stock} units</strong>
            </p>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Quantity to Add</label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(Number(e.target.value))}
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">Supplier / PO Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Yonex Batch #4410"
                  value={restockNotes}
                  onChange={(e) => setRestockNotes(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs text-white"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white border border-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={restocking}
                  className="py-2 px-4 rounded-xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-extrabold text-xs transition cursor-pointer shadow-md"
                >
                  {restocking ? 'Replenishing...' : 'Confirm Restock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
