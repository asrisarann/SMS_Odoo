import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import ScrollReveal from '../components/common/ScrollReveal';
import { api } from '../services/api';

const SPORTS_CONFIG = [
  {
    id: 'PADEL_COURT',
    name: 'Panoramic Padel Court',
    icon: 'fa-table-tennis-paddle-ball',
    description: 'Enclosed panoramic glass courts with LED floodlights',
    basePrice: 100,
    maxPlayers: 4,
  },
  {
    id: 'TENNIS',
    name: 'Lawn & Hard Tennis Court',
    icon: 'fa-baseball',
    description: 'Championship-grade acrylic and synthetic turf courts',
    basePrice: 80,
    maxPlayers: 4,
  },
  {
    id: 'BADMINTON',
    name: 'Indoor Badminton Court',
    icon: 'fa-trophy',
    description: 'Wooden sprung floors with professional anti-glare lighting',
    basePrice: 60,
    maxPlayers: 4,
  },
  {
    id: 'CRICKET',
    name: 'Cricket Pitch & Practice Nets',
    icon: 'fa-baseball-bat-ball',
    description: 'Full-length turf wickets and automated bowling machines',
    basePrice: 100,
    maxPlayers: 11,
  },
];

const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function BookingPage() {
  const currentUser = api.auth.getUser();

  // Booking form state
  const [selectedSport, setSelectedSport] = useState('PADEL_COURT');
  const [selectedDate, setSelectedDate] = useState(getTodayDateStr());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [playerCount, setPlayerCount] = useState(2);
  const [guestNotes, setGuestNotes] = useState('');
  const [guestName, setGuestName] = useState(currentUser?.name || '');
  const [guestEmail, setGuestEmail] = useState(currentUser?.email || '');
  const [guestPhone, setGuestPhone] = useState(currentUser?.phone || '');

  // Slots availability state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState('');

  // Hold & booking confirmation state
  const [activeHold, setActiveHold] = useState(null);
  const [holdTimer, setHoldTimer] = useState(0);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingMyBookings, setLoadingMyBookings] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  // Current sport object
  const currentSportConfig =
    SPORTS_CONFIG.find((s) => s.id === selectedSport) || SPORTS_CONFIG[0];

  // Helper for alert notifications
  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 7000);
  };

  // Fetch live slots for selected sport & date
  const fetchSlots = useCallback(async (sport, date) => {
    setLoadingSlots(true);
    setSlotError('');
    setSelectedSlot(null);
    try {
      const res = await api.sports.getSlots({ sport, date });
      setSlots(res.slots || []);
    } catch (err) {
      setSlotError(err.message || 'Unable to retrieve court slots for the selected date.');
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  // Fetch user's existing bookings if logged in
  const fetchMyBookings = useCallback(async () => {
    if (!currentUser) return;
    setLoadingMyBookings(true);
    try {
      const res = await api.bookings.getMyBookings();
      setMyBookings(res.bookings || []);
    } catch {
      // User might be guest or token expired
    } finally {
      setLoadingMyBookings(false);
    }
  }, [currentUser]);

  // Load slots when sport or date changes
  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(async () => {
      if (!isMounted) return;
      setLoadingSlots(true);
      setSlotError('');
      setSelectedSlot(null);
      try {
        const res = await api.sports.getSlots({ sport: selectedSport, date: selectedDate });
        if (isMounted) {
          setSlots(res.slots || []);
        }
      } catch (err) {
        if (isMounted) {
          setSlotError(err.message || 'Unable to retrieve court slots for the selected date.');
          setSlots([]);
        }
      } finally {
        if (isMounted) {
          setLoadingSlots(false);
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedSport, selectedDate]);

  // Load user bookings on mount
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    Promise.resolve().then(async () => {
      if (!isMounted) return;
      setLoadingMyBookings(true);
      try {
        const res = await api.bookings.getMyBookings();
        if (isMounted) setMyBookings(res.bookings || []);
      } catch {
        // Guest or token error
      } finally {
        if (isMounted) setLoadingMyBookings(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  // Countdown timer for active hold
  useEffect(() => {
    if (!activeHold) return;

    const expiresAt = new Date(activeHold.expiresAt).getTime();
    const updateCountdown = () => {
      const remainingSeconds = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setHoldTimer(remainingSeconds);

      if (remainingSeconds <= 0) {
        setActiveHold(null);
        showAlert('error', 'Your 3-minute court hold has expired. Please select a slot again.');
        fetchSlots(selectedSport, selectedDate);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeHold, selectedSport, selectedDate, fetchSlots]);

  // Pricing calculations
  const calculatePricing = () => {
    const basePrice = selectedSlot ? selectedSlot.basePrice : currentSportConfig.basePrice;
    let discountPct = 0;
    const tier = (currentUser?.membership || currentUser?.role || '').toUpperCase();

    if (tier.includes('GOLD')) discountPct = 20;
    else if (tier.includes('SILVER')) discountPct = 10;
    else if (tier.includes('JUNIOR')) discountPct = 15;

    const discountAmount = Math.round((basePrice * discountPct) / 100);
    const finalPrice = Math.max(0, basePrice - discountAmount);

    return { basePrice, discountPct, discountAmount, finalPrice };
  };

  const { basePrice, discountPct, discountAmount, finalPrice } = calculatePricing();

  // Step 1: Create a 3-minute Hold (Authenticated)
  const handleCreateHold = async (e) => {
    e.preventDefault();
    if (!selectedSlot) {
      showAlert('error', 'Please select an available court slot before proceeding.');
      return;
    }

    // Guest booking via CRM Enquiry
    if (!currentUser) {
      setActionLoading(true);
      try {
        await api.crm.submitEnquiry({
          name: guestName,
          email: guestEmail,
          phone: guestPhone,
          sportOfInterest: selectedSport,
          message: `Guest reservation request for ${currentSportConfig.name} on ${selectedDate} at ${selectedSlot.startTime} for ${playerCount} player(s). Notes: ${guestNotes || 'None'}`,
          trialSessionRequested: false,
        });

        showAlert(
          'success',
          `Reservation request received for ${currentSportConfig.name} at ${selectedSlot.startTime}! Front desk will confirm your booking shortly.`
        );
        setSelectedSlot(null);
        setGuestNotes('');
      } catch (err) {
        showAlert('error', err.message || 'Failed to submit reservation request.');
      } finally {
        setActionLoading(false);
      }
      return;
    }

    // Authenticated member hold
    setActionLoading(true);
    try {
      const res = await api.bookings.createHold({
        sport: selectedSport,
        date: selectedDate,
        startTime: selectedSlot.startTime,
        playerCount,
        durationMinutes: 60,
      });

      setActiveHold(res.hold);
      showAlert(
        'success',
        `Court slot ${selectedSlot.startTime} held for 3 minutes! Please confirm payment below.`
      );
    } catch (err) {
      showAlert(
        'error',
        err.message || 'Unable to hold slot. The court may have been reserved by another member.'
      );
      fetchSlots(selectedSport, selectedDate);
    } finally {
      setActionLoading(false);
    }
  };

  // Step 2: Confirm Active Hold & Deduct from Wallet
  const handleConfirmHold = async () => {
    if (!activeHold) return;
    setActionLoading(true);
    try {
      const res = await api.bookings.confirmHold({ holdId: activeHold.id });
      setConfirmedBooking(res.booking || res);
      setActiveHold(null);
      showAlert(
        'success',
        `Court booking confirmed! Payment of ₹${activeHold.finalPrice} deducted from your club balance.`
      );
      fetchSlots(selectedSport, selectedDate);
      fetchMyBookings();
    } catch (err) {
      showAlert('error', err.message || 'Failed to confirm booking. Please verify your balance.');
    } finally {
      setActionLoading(false);
    }
  };

  // Release hold manually
  const handleReleaseHold = async () => {
    if (!activeHold) return;
    setActionLoading(true);
    try {
      await api.bookings.releaseHold(activeHold.id);
      setActiveHold(null);
      showAlert('info', 'Court hold released.');
      fetchSlots(selectedSport, selectedDate);
    } catch (err) {
      showAlert('error', err.message || 'Failed to release hold.');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel an existing confirmed booking (50% refund)
  const handleCancelBooking = async (bookingId) => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel this booking? Per Adelux club policy, cancellations made at least 1 hour prior receive a 50% refund to your wallet.'
    );
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const res = await api.bookings.cancelBooking(bookingId, 'Member requested cancellation');
      showAlert(
        'success',
        res.message || 'Booking cancelled successfully. 50% refund credited to your wallet.'
      );
      fetchMyBookings();
      fetchSlots(selectedSport, selectedDate);
    } catch (err) {
      showAlert('error', err.message || 'Failed to cancel booking.');
    } finally {
      setActionLoading(false);
    }
  };

  // Format seconds into MM:SS
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <main className="bg-[#0e0f0f] text-gray-100 min-h-screen">
      {/* Banner */}
      <PageBanner
        title="Booking Court"
        current="Booking Court"
        bannerClass="banner-inner-booking"
      />

      {/* Booking Process Steps */}
      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up" className="booking-process-heading">
              <div className="sub-heading">
                <i className="fa-solid fa-circle text-[#C6EF2E]"></i>
                <span className="sub-heading-title text-[#C6EF2E]">How to Book</span>
              </div>
              <h2 className="text-white">Reserve Your Court in Seconds Play Your Game</h2>
            </ScrollReveal>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <ScrollReveal animation="fade-up" delay={50}>
                <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6 hover:border-[#C6EF2E]/40 transition shadow-xl flex items-start gap-4 h-full">
                  <div className="w-12 h-12 rounded-xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] font-black text-xl font-mono shrink-0">
                    01
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base mb-1">Select Sport & Court</h4>
                    <p className="text-gray-400 text-xs leading-relaxed mb-0">Padel, Tennis, Badminton, or Cricket</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal animation="fade-up" delay={150}>
                <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6 hover:border-[#C6EF2E]/40 transition shadow-xl flex items-start gap-4 h-full">
                  <div className="w-12 h-12 rounded-xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] font-black text-xl font-mono shrink-0">
                    02
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base mb-1">Pick Live 1-Hr Slot</h4>
                    <p className="text-gray-400 text-xs leading-relaxed mb-0">Real-time slot availability every 30 mins</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal animation="fade-up" delay={250}>
                <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6 hover:border-[#C6EF2E]/40 transition shadow-xl flex items-start gap-4 h-full">
                  <div className="w-12 h-12 rounded-xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] font-black text-xl font-mono shrink-0">
                    03
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base mb-1">Member Benefits</h4>
                    <p className="text-gray-400 text-xs leading-relaxed mb-0">Automatic 10%-20% tier discounts applied</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal animation="fade-up" delay={350}>
                <div className="bg-[#141414] border border-gray-800 rounded-2xl p-6 hover:border-[#C6EF2E]/40 transition shadow-xl flex items-start gap-4 h-full">
                  <div className="w-12 h-12 rounded-xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] font-black text-xl font-mono shrink-0">
                    04
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-base mb-1">Instant Confirmation</h4>
                    <p className="text-gray-400 text-xs leading-relaxed mb-0">Paid seamlessly from your club wallet</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form & Details Section */}
      <div className="section pt-0">
        <div className="hero-container">
          {/* Notification Alert Banner */}
          {alert && (
            <div
              className={`p-4 rounded-2xl mb-6 text-sm font-semibold flex items-center justify-between shadow-xl transition-all ${
                alert.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/40'
                  : alert.type === 'info'
                  ? 'bg-blue-500/10 text-blue-300 border border-blue-500/40'
                  : 'bg-rose-500/10 text-rose-300 border border-rose-500/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <i
                  className={`fa-solid ${
                    alert.type === 'success'
                      ? 'fa-circle-check text-emerald-400 text-lg'
                      : alert.type === 'info'
                      ? 'fa-circle-info text-blue-400 text-lg'
                      : 'fa-circle-exclamation text-rose-400 text-lg'
                  }`}
                ></i>
                <span>{alert.message}</span>
              </div>
              <button
                onClick={() => setAlert(null)}
                className="text-gray-400 hover:text-white p-1 text-base cursor-pointer"
              >
                &times;
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: Main Booking Card */}
            <div className="lg:col-span-7 xl:col-span-8 bg-[#141414] border border-gray-800 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-2">
                <div>
                  <h3 className="text-2xl font-black text-white mb-1">Book Your Court Now</h3>
                  <p className="text-xs text-gray-400 mb-0">
                    Sessions last 60 minutes with 30-minute interval starts. Concurrency protected.
                  </p>
                </div>
                {currentUser ? (
                  <span className="badge bg-[#C6EF2E]/15 text-[#C6EF2E] text-xs font-bold px-3 py-1.5 rounded-full border border-[#C6EF2E]/40 flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                    <i className="fa-solid fa-user-check"></i>
                    {currentUser.membership || currentUser.role || 'Member'}
                  </span>
                ) : (
                  <Link
                    to="/login"
                    className="text-xs font-bold text-[#C6EF2E] hover:underline flex items-center gap-1 shrink-0 self-start sm:self-auto"
                  >
                    <i className="fa-solid fa-right-to-bracket"></i>
                    Log in for Member Discounts
                  </Link>
                )}
              </div>
              <div className="w-16 h-1 bg-[#C6EF2E] rounded-full"></div>

              {/* Confirmed Booking Success Card */}
              {confirmedBooking && (
                <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 text-white shadow-lg">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl text-emerald-400 mt-0.5 shrink-0">
                      <i className="fa-solid fa-circle-check"></i>
                    </span>
                    <div className="flex-1 space-y-3">
                      <div>
                        <h4 className="font-black text-white text-base mb-1">
                          Court Reserved Successfully!
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed mb-0">
                          Your 1-hour session on <strong className="text-white">{currentSportConfig.name}</strong> has been
                          confirmed for <strong className="text-white">{confirmedBooking.date || selectedDate}</strong> from{' '}
                          <strong className="text-[#C6EF2E]">
                            {confirmedBooking.slot
                              ? new Date(confirmedBooking.slot).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : selectedSlot?.startTime}
                          </strong>
                          .
                        </p>
                      </div>
                      <div className="text-xs text-gray-300 space-y-1.5 bg-gray-900/90 p-3.5 rounded-xl border border-gray-800">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Booking Ref:</span>
                          <span className="font-mono text-[#C6EF2E] font-bold">{confirmedBooking.id || 'CONFIRMED'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Players:</span>
                          <span className="font-bold text-white">{confirmedBooking.playerCount || playerCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Session Duration:</span>
                          <span className="font-bold text-white">60 Minutes (1 Hour)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Payment Method:</span>
                          <span className="font-bold text-[#C6EF2E]">Club Member Wallet</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfirmedBooking(null)}
                        className="py-2 px-4 rounded-xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-extrabold text-xs transition cursor-pointer"
                      >
                        Book Another Court
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Active 3-Minute Hold Countdown Banner */}
              {activeHold && (
                <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <i className="fa-solid fa-hourglass-half text-amber-400 animate-pulse text-base"></i>
                      <span className="font-black text-amber-300 text-sm">
                        Court Slot Temporarily Held!
                      </span>
                    </div>
                    <span className="text-xs font-mono font-black bg-amber-400 text-black px-2.5 py-1 rounded-full shadow-md">
                      {formatTimer(holdTimer)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mb-0">
                    This slot is reserved exclusively for you for 3 minutes. Confirm now to finalize
                    payment from your wallet.
                  </p>
                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleConfirmHold}
                      disabled={actionLoading}
                      className="py-3 px-5 rounded-xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-black text-xs transition flex-1 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#C6EF2E]/20"
                    >
                      {actionLoading ? (
                        <span>Processing...</span>
                      ) : (
                        <span>
                          <i className="fa-solid fa-check mr-1.5"></i>
                          Confirm & Pay ₹{activeHold.finalPrice}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleReleaseHold}
                      disabled={actionLoading}
                      className="px-4 py-3 text-xs font-bold rounded-xl border border-gray-700 bg-gray-900 text-gray-300 hover:text-white hover:border-gray-600 transition cursor-pointer"
                    >
                      Release
                    </button>
                  </div>
                </div>
              )}

              {/* Main Booking Form */}
              <form onSubmit={handleCreateHold} className="flex flex-col gap-6">
                {/* 1. Sport Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                    1. Select Sport Facility
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    {SPORTS_CONFIG.map((sport) => {
                      const isSelected = selectedSport === sport.id;
                      return (
                        <button
                          key={sport.id}
                          type="button"
                          onClick={() => setSelectedSport(sport.id)}
                          className={`p-4 rounded-2xl text-left transition-all duration-200 flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'border-2 border-[#C6EF2E] bg-[#1a2312] shadow-lg shadow-[#C6EF2E]/20 ring-1 ring-[#C6EF2E]'
                              : 'border border-gray-800 bg-gray-900/80 hover:border-gray-700 hover:bg-gray-850'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <i
                              className={`fa-solid ${sport.icon} ${
                                isSelected ? 'text-[#C6EF2E]' : 'text-gray-400'
                              } text-2xl`}
                            ></i>
                            <span className={`text-xs font-mono font-bold ${isSelected ? 'text-[#C6EF2E]' : 'text-gray-400'}`}>
                              ₹{sport.basePrice}/hr
                            </span>
                          </div>
                          <div>
                            <div className="font-black text-sm text-white leading-tight">
                              {sport.name}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-1">
                              Up to {sport.maxPlayers} players
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Date & Player Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                      2. Select Date
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      min={getTodayDateStr()}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-[#C6EF2E] transition shadow-inner"
                    />
                  </div>
                  <div>
                    <label htmlFor="playerCount" className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                      3. Number of Players
                    </label>
                    <input
                      type="number"
                      id="playerCount"
                      min="1"
                      max={currentSportConfig.maxPlayers}
                      value={playerCount}
                      onChange={(e) => setPlayerCount(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm text-white [color-scheme:dark] focus:outline-none focus:border-[#C6EF2E] transition shadow-inner font-mono"
                      required
                    />
                  </div>
                </div>

                {/* 3. Live 1-Hour Time Slot Selector */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-0">
                      4. Pick 1-Hour Session Slot
                    </label>
                    <span className="text-xs font-bold font-mono text-[#C6EF2E] bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 px-3 py-1 rounded-full">
                      {loadingSlots ? (
                        <span className="flex items-center gap-1.5">
                          <i className="fa-solid fa-spinner fa-spin"></i> Checking live slots...
                        </span>
                      ) : (
                        `${slots.filter((s) => s.status === 'AVAILABLE').length} slots available`
                      )}
                    </span>
                  </div>

                  {slotError && (
                    <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/30 mb-3 flex items-center gap-2">
                      <i className="fa-solid fa-triangle-exclamation"></i>
                      <span>{slotError}</span>
                    </div>
                  )}

                  {loadingSlots ? (
                    <div className="p-10 text-center text-gray-400 text-xs bg-gray-900/40 rounded-2xl border border-gray-800">
                      <i className="fa-solid fa-circle-notch fa-spin text-3xl mb-3 text-[#C6EF2E]"></i>
                      <div>Refreshing slot availability for {selectedDate}...</div>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 text-xs bg-gray-900/40 rounded-2xl border border-dashed border-gray-800">
                      No slots open for the selected date. Please choose another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-3 border border-gray-800 rounded-2xl bg-[#0e0f0f]">
                      {slots.map((slot) => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const isAvailable = slot.status === 'AVAILABLE';

                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!isAvailable}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-xl text-left transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'border-2 border-[#C6EF2E] bg-[#C6EF2E] text-black font-extrabold shadow-lg shadow-[#C6EF2E]/25 transform scale-[1.02] cursor-pointer'
                                : isAvailable
                                ? 'border border-gray-800 bg-gray-900/90 hover:border-[#C6EF2E]/60 text-gray-200 cursor-pointer group shadow-sm'
                                : 'border border-gray-900 bg-gray-950 text-gray-600 cursor-not-allowed opacity-40'
                            }`}
                          >
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className={`font-bold ${isSelected ? 'text-black' : 'text-white group-hover:text-[#C6EF2E]'}`}>
                                {slot.startTime}
                              </span>
                              <span className={`text-[10px] font-sans ${isSelected ? 'text-black font-black' : isAvailable ? 'text-[#C6EF2E] font-semibold' : 'text-gray-600'}`}>
                                {isAvailable
                                  ? `${slot.availableCapacity} left`
                                  : slot.status === 'PAST'
                                  ? 'Past'
                                  : 'Full'}
                              </span>
                            </div>
                            <div className={`text-[10px] mt-1 truncate ${isSelected ? 'text-black/80 font-bold' : 'text-gray-400'}`}>
                              {slot.isSocialPlay ? '🎉 Social Play' : '60 Min Session'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Pricing & Entitlement Breakdown */}
                {selectedSlot && (
                  <div className="p-4 rounded-2xl bg-gray-900/90 border border-gray-800 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between text-gray-400">
                      <span>Standard Rate (60 mins):</span>
                      <span className="font-mono text-white text-sm font-semibold">₹{basePrice}</span>
                    </div>

                    {discountPct > 0 && (
                      <div className="flex items-center justify-between text-[#C6EF2E] font-semibold">
                        <span>
                          Member Discount ({discountPct}% {currentUser?.membership || ''}):
                        </span>
                        <span className="font-mono text-sm font-bold">-₹{discountAmount}</span>
                      </div>
                    )}

                    <div className="border-t border-gray-800 pt-2 flex items-center justify-between text-base font-black text-white">
                      <span>Total Payable:</span>
                      <span className="font-mono text-[#C6EF2E] text-xl font-black">₹{finalPrice}</span>
                    </div>

                    {selectedSlot.isSocialPlay && (
                      <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/30 flex items-center gap-2">
                        <i className="fa-solid fa-beer-mug-empty text-amber-400"></i>
                        <span>
                          <strong className="text-white">Friday Night Social Play:</strong> Shared court atmosphere with
                          refreshments & rotational matches.
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Guest Information (if not logged in) */}
                {!currentUser && (
                  <div className="p-5 rounded-2xl border border-gray-800 bg-gray-900/80 flex flex-col gap-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-white uppercase tracking-wider">
                        Guest Contact Details
                      </span>
                      <span className="text-[10px] text-gray-400">For reservation confirmation</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Your Full Name"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C6EF2E]"
                      />
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C6EF2E]"
                      />
                    </div>
                    <input
                      type="tel"
                      placeholder="Phone Number (e.g. +91 98765 43210)"
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(e.target.value)}
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C6EF2E]"
                    />
                    <textarea
                      rows="2"
                      placeholder="Special preferences, racket rental requests, or notes (optional)"
                      value={guestNotes}
                      onChange={(e) => setGuestNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#141414] border border-gray-800 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#C6EF2E]"
                    ></textarea>
                  </div>
                )}

                {/* Submit Action Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading || !selectedSlot}
                    className={`w-full py-4 px-6 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      selectedSlot
                        ? 'bg-[#C6EF2E] hover:bg-[#b0d826] text-black shadow-xl shadow-[#C6EF2E]/25'
                        : 'bg-gray-800/90 text-gray-400 border border-gray-700 cursor-not-allowed opacity-80'
                    }`}
                  >
                    <span>
                      {actionLoading
                        ? 'Processing...'
                        : !selectedSlot
                        ? 'Pick a 1-Hour Session Slot Above to Reserve'
                        : currentUser
                        ? `Hold & Reserve Court (₹${finalPrice})`
                        : 'Submit Reservation Request'}
                    </span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </button>
                </div>
              </form>
            </div>

            {/* Right: Booking Details & My Bookings Aside */}
            <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
              {/* Member Active Bookings Section */}
              {currentUser && (
                <div className="bg-[#141414] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-base font-bold text-white mb-0 flex items-center gap-2">
                      <i className="fa-solid fa-calendar-check text-[#C6EF2E]"></i>
                      My Upcoming Bookings
                    </h4>
                    <button
                      onClick={fetchMyBookings}
                      className="text-xs text-gray-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <i
                        className={`fa-solid fa-rotate-right ${
                          loadingMyBookings ? 'fa-spin' : ''
                        }`}
                      ></i>
                      Refresh
                    </button>
                  </div>
                  <div className="w-12 h-0.5 bg-[#C6EF2E] rounded-full"></div>

                  {loadingMyBookings ? (
                    <div className="text-center text-xs text-gray-400 py-4">
                      Loading your bookings...
                    </div>
                  ) : myBookings.length === 0 ? (
                    <div className="text-xs text-gray-400 py-3 text-center bg-gray-900/60 rounded-xl border border-gray-800">
                      No active court bookings found. Reserve your first session today!
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
                      {myBookings.map((b) => (
                        <div
                          key={b.id}
                          className="p-3.5 rounded-xl border border-gray-800 bg-gray-900 text-xs flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="font-bold text-white">
                              {b.whichCourt} ({b.playerCount}p)
                            </div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                              {b.date || (b.slot ? new Date(b.slot).toLocaleDateString() : '')} •{' '}
                              {b.slot
                                ? new Date(b.slot).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </div>
                            <span
                              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1.5 uppercase ${
                                b.status === 'CONFIRMED'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : b.status === 'HELD'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-gray-800 text-gray-400'
                              }`}
                            >
                              {b.status}
                            </span>
                          </div>
                          {b.status === 'CONFIRMED' && (
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              disabled={actionLoading}
                              className="text-[11px] text-rose-400 hover:text-rose-300 font-bold px-2.5 py-1 rounded-lg border border-rose-500/30 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                            >
                              Cancel (50%)
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Opening Hours */}
              <div className="bg-[#141414] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-clock text-[#C6EF2E]"></i>
                    Opening Hours
                  </h4>
                  <div className="w-12 h-0.5 bg-[#C6EF2E] rounded-full"></div>
                </div>
                <div className="flex flex-col gap-2 text-xs text-gray-300">
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span className="text-gray-400">Monday - Friday:</span>
                    <span className="font-semibold text-white font-mono">06:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-gray-400">Saturday - Sunday:</span>
                    <span className="font-semibold text-white font-mono">06:00 AM - 10:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Booking Rates & Entitlements */}
              <div className="bg-[#141414] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-tags text-[#C6EF2E]"></i>
                    Booking Rates & Member Perks
                  </h4>
                  <div className="w-12 h-0.5 bg-[#C6EF2E] rounded-full"></div>
                </div>
                <div className="flex flex-col gap-2 text-xs text-gray-400">
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span>Padel & Cricket:</span>
                    <span className="font-mono font-bold text-white">₹100/hour</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800">
                    <span>Tennis & Badminton:</span>
                    <span className="font-mono font-bold text-white">₹80 & ₹60/hour</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800 text-emerald-400 font-semibold">
                    <span>Gold Members:</span>
                    <span>20% Off All Courts</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-gray-800 text-slate-300 font-semibold">
                    <span>Silver & Junior:</span>
                    <span>10% & 15% Off</span>
                  </div>
                  <p className="text-[11px] text-amber-300 pt-1 mb-0 leading-relaxed">
                    <strong className="text-white">Friday Social Play:</strong> Rotational matches with free refreshments.
                  </p>
                </div>
              </div>

              {/* Why Book with Adelux */}
              <div className="bg-[#141414] border border-gray-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
                <div>
                  <h4 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                    <i className="fa-solid fa-star text-[#C6EF2E]"></i>
                    Why Book with Adelux?
                  </h4>
                  <div className="w-12 h-0.5 bg-[#C6EF2E] rounded-full"></div>
                </div>
                <ul className="flex flex-col gap-3 text-xs text-gray-300 p-0 m-0">
                  <li className="flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-check text-[#C6EF2E] text-sm shrink-0"></i>
                    <span>Professional-grade panoramic glass courts</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-check text-[#C6EF2E] text-sm shrink-0"></i>
                    <span>Friendly certified coaches on-site</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-check text-[#C6EF2E] text-sm shrink-0"></i>
                    <span>Clean locker and lounge facilities</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-check text-[#C6EF2E] text-sm shrink-0"></i>
                    <span>Flexible cancellation policy (50% refund)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-check text-[#C6EF2E] text-sm shrink-0"></i>
                    <span>Cardless virtual wallet payment system</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <i className="fa-solid fa-circle-check text-[#C6EF2E] text-sm shrink-0"></i>
                    <span>LED floodlighting for evening play</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact CTA Section */}
      <div className="section py-0 pb-16">
        <div className="hero-container">
          <div className="bg-[#141414] border border-gray-800 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-4 max-w-xl">
              <h2 className="text-2xl md:text-3xl font-black text-white">Ready to Train with the Best?</h2>
              <p className="text-gray-400 text-sm leading-relaxed mb-0">
                Whether you're picking up a racquet for the first time or aiming for pro
                tournaments, our coaches are here to support your journey.
              </p>
              <div>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-black text-sm transition shadow-lg shadow-[#C6EF2E]/20"
                >
                  <span>Book a Trial Session</span>
                  <i className="fa-solid fa-arrow-right text-xs"></i>
                </Link>
              </div>
            </div>

            <div className="shrink-0 max-w-xs">
              <img
                src="/assets/images/2AH2LFJ-1.png"
                alt="Contact CTA"
                className="rounded-2xl max-h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
