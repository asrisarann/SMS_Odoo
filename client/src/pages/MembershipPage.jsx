import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';
import api from '../services/api';

const DEFAULT_PLANS = [
  {
    tier: 'JUNIOR',
    name: 'Junior Academy',
    badge: 'Under-18 Special',
    annualFee: 8000,
    renewalFee: 7200,
    courtDiscount: 15,
    shopDiscount: 11,
    cafeDiscount: 5,
    advanceBookingDays: 3,
    description: 'Specially structured for rising athletes, students, and aspiring club champions.',
    benefits: [
      '15% off court bookings during junior coaching hours',
      '11% off junior rackets, footwear, and strings',
      '5% off smoothies and fresh hydration drinks at Court-Side Bar',
      '3-Day advance slot reservation window',
      'Quarterly performance coaching assessment reports',
      'Digital Virtual Card & Turnstile QR Access',
    ],
  },
  {
    tier: 'SILVER',
    name: 'Silver Regular',
    badge: 'Most Flexible',
    annualFee: 15000,
    renewalFee: 13500,
    courtDiscount: 10,
    shopDiscount: 15,
    cafeDiscount: 10,
    advanceBookingDays: 4,
    description: 'Perfect for regular players seeking consistent game time, tournament entry, and community perks.',
    benefits: [
      '10% off all Court Bookings (Padel, Tennis, Badminton, Cricket)',
      '15% off Pro Shop equipment, strings & grips',
      '10% off Court-Side Bar & Cafeteria food & beverage orders',
      '4-Day advance court slot booking window',
      'Access to monthly club social mixer tournaments',
      'Complimentary locker room access during matches',
      'Digital Virtual Card & Turnstile QR Access',
    ],
  },
  {
    tier: 'GOLD',
    name: 'Gold All-Access',
    badge: 'Most Popular / Best Value',
    isPopular: true,
    annualFee: 25000,
    renewalFee: 22000,
    courtDiscount: 20,
    shopDiscount: 30,
    cafeDiscount: 20,
    advanceBookingDays: 7,
    description: 'The ultimate VIP club experience with maximum discounts, peak priority, and exclusive privileges.',
    benefits: [
      '20% off all Court Bookings across all sports',
      '30% off Sports Gear & Apparel at Champions Pro Shop',
      '20% off Court-Side Bar & Cafeteria tabs',
      '7-Day priority court reservation window',
      'Complimentary monthly racket re-gripping service',
      '2 Monthly guest passes for friends & family',
      'VIP member lounge & private locker privileges',
      'Digital Virtual Card & Turnstile QR Access',
    ],
  },
];

const faqs = [
  {
    q: 'How does membership renewal work, and what is the renewal discount?',
    a: 'Active members receive an exclusive renewal discount (up to ₹3,000 off annual fees) when renewing before or upon expiration. Renewing instantly extends your membership by 365 calendar days from your current expiry date without losing any remaining days.',
  },
  {
    q: 'Can I pay for my renewal or upgrade using my Club Virtual Card?',
    a: 'Yes! You can pay seamlessly from your Virtual Card wallet balance with 1-click checkout. If your balance is insufficient, you can top up instantly via UPI, Net Banking, or Credit/Debit Card on the Wallet page.',
  },
  {
    q: 'How are tier upgrade fees calculated?',
    a: 'Upgrades are prorated! You only pay the difference in annual fees between your current tier and your target tier (e.g., upgrading from Silver to Gold costs ₹10,000). Your membership expiry will automatically reset to a full 365 days from the upgrade date.',
  },
  {
    q: 'Do I get guest passes with my membership?',
    a: 'Gold All-Access members receive 2 complimentary guest passes every month to bring friends or family members to Adelux courts. Silver and Junior members can book guest slots at their tier-discounted rate.',
  },
  {
    q: 'How do the tier discounts apply at the Pro Shop and Court-Side Bar?',
    a: 'Discounts are applied automatically! When booking courts online or using your Virtual Card QR code / OTP at the Pro Shop and Bar counters, your Gold (30% shop / 20% bar), Silver (15% shop / 10% bar), or Junior (11% shop / 5% bar) discount is deducted in real-time.',
  },
];

export default function MembershipPage() {
  const [currentUser, setCurrentUser] = useState(api.auth.getUser());
  const [plans, setPlans] = useState(DEFAULT_PLANS);
  const [memberStatus, setMemberStatus] = useState(null);
  const [alert, setAlert] = useState(null);
  const [activeFaq, setActiveFaq] = useState(0);

  // Modals
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedUpgradeTier, setSelectedUpgradeTier] = useState('GOLD');
  const [paymentMethod, setPaymentMethod] = useState('VIRTUAL_CARD');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 7000);
  };

  // Format currency
  const formatINR = (amt) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amt || 0);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const refreshStatus = useCallback(async () => {
    const localUser = api.auth.getUser();
    if (!localUser) return;
    try {
      const statusRes = await api.membership.getStatus();
      if (statusRes?.success && statusRes.data) {
        setMemberStatus(statusRes.data);
        const updated = {
          ...localUser,
          membership: statusRes.data.user?.membership || localUser.membership,
          amount: statusRes.data.user?.amount ?? localUser.amount,
          renewalDate: statusRes.data.user?.renewalDate || localUser.renewalDate,
        };
        localStorage.setItem('user', JSON.stringify(updated));
        setCurrentUser(updated);
      }
    } catch {
      // Unauthenticated or server error
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        const plansRes = await api.membership.getPlans().catch(() => null);
        if (isMounted && plansRes?.plans && Array.isArray(plansRes.plans)) {
          setPlans(plansRes.plans);
        }
      } catch {
        // Keep default plans
      }

      const localUser = api.auth.getUser();
      if (localUser) {
        try {
          const statusRes = await api.membership.getStatus();
          if (isMounted && statusRes?.success && statusRes.data) {
            setMemberStatus(statusRes.data);
            const updated = {
              ...localUser,
              membership: statusRes.data.user?.membership || localUser.membership,
              amount: statusRes.data.user?.amount ?? localUser.amount,
              renewalDate: statusRes.data.user?.renewalDate || localUser.renewalDate,
            };
            localStorage.setItem('user', JSON.stringify(updated));
            if (isMounted) setCurrentUser(updated);
          }
        } catch {
          // Keep local user
        }
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Current user's tier details
  const currentTier = (memberStatus?.user?.membership || currentUser?.membership || 'NONE').toUpperCase();
  const currentPlan =
    plans.find((p) => p.tier === currentTier) ||
    DEFAULT_PLANS.find((p) => p.tier === currentTier) ||
    null;

  const walletBalance = Number(memberStatus?.user?.amount ?? currentUser?.amount ?? 0);
  const daysRemaining = memberStatus?.daysRemaining ?? 0;
  const renewalDate = memberStatus?.user?.renewalDate || currentUser?.renewalDate;

  // Handle Membership Renewal
  const handleRenew = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.membership.renew({ paymentMethod });
      if (res?.success) {
        showAlert('success', res.message || 'Membership renewed successfully for 1 year!');
        setShowRenewModal(false);

        // Update local state and storage
        if (currentUser) {
          const updated = {
            ...currentUser,
            amount: res.walletBalance ?? currentUser.amount,
            renewalDate: res.newRenewalDate,
          };
          localStorage.setItem('user', JSON.stringify(updated));
          setCurrentUser(updated);
        }
        await refreshStatus();
      } else {
        showAlert('error', res?.message || 'Failed to renew membership.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Error occurred while processing renewal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Membership Upgrade
  const handleUpgrade = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.membership.upgrade({
        targetTier: selectedUpgradeTier,
        paymentMethod,
      });
      if (res?.success) {
        showAlert(
          'success',
          res.message || `Congratulations! You have upgraded to ${selectedUpgradeTier} tier!`
        );
        setShowUpgradeModal(false);

        // Update local state and storage
        if (currentUser) {
          const updated = {
            ...currentUser,
            membership: res.newTier || selectedUpgradeTier,
            amount: res.walletBalance ?? currentUser.amount,
            renewalDate: res.newRenewalDate,
          };
          localStorage.setItem('user', JSON.stringify(updated));
          setCurrentUser(updated);
        }
        await refreshStatus();
      } else {
        showAlert('error', res?.message || 'Failed to upgrade membership.');
      }
    } catch (err) {
      showAlert('error', err.message || 'Error occurred while processing upgrade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate upgrade cost
  const getUpgradeCost = (targetTierCode) => {
    const targetPlan = plans.find((p) => p.tier === targetTierCode);
    if (!targetPlan) return 0;
    if (!currentPlan) return targetPlan.annualFee;
    return Math.max(0, targetPlan.annualFee - currentPlan.annualFee);
  };

  return (
    <main className="bg-[#0e0f0f] text-gray-100 min-h-screen">
      {/* Page Banner */}
      <PageBanner
        title="Club Membership & Pass"
        current="Membership"
        bannerClass="banner-inner-membership"
      />

      {/* Global Alert Notification */}
      {alert && (
        <div className="max-w-6xl mx-auto px-4 mt-6">
          <div
            className={`p-4 rounded-2xl flex items-center justify-between text-sm shadow-xl transition-all ${
              alert.type === 'success'
                ? 'bg-[#C6EF2E]/10 border border-[#C6EF2E] text-[#C6EF2E]'
                : 'bg-red-500/10 border border-red-500 text-red-400'
            }`}
          >
            <div className="flex items-center gap-3">
              <i
                className={`fa-solid ${
                  alert.type === 'success' ? 'fa-circle-check text-lg' : 'fa-triangle-exclamation text-lg'
                }`}
              ></i>
              <span className="font-medium">{alert.message}</span>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 1: LOGGED-IN MEMBER MEMBERSHIP 360 HERO PORTAL */}
      {currentUser && (
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="relative bg-gradient-to-br from-[#1a1c1d] via-[#141515] to-[#101111] border border-[#2d3032] rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
            {/* Subtle glow orb */}
            <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#C6EF2E]/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-[#262828] pb-6">
              <div>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#C6EF2E]/20 text-[#C6EF2E] border border-[#C6EF2E]/40 flex items-center gap-1.5">
                    <i className="fa-solid fa-id-card"></i> Member Portal
                  </span>

                  {/* Tier Pill */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                      currentTier === 'GOLD'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50'
                        : currentTier === 'SILVER'
                        ? 'bg-slate-300/20 text-slate-200 border border-slate-300/50'
                        : currentTier === 'JUNIOR'
                        ? 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/50'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        currentTier === 'GOLD'
                          ? 'fa-crown text-amber-300'
                          : currentTier === 'SILVER'
                          ? 'fa-shield-halved text-slate-200'
                          : 'fa-star text-emerald-300'
                      }`}
                    ></i>
                    {currentTier} TIER
                  </span>

                  {/* Expiration Status Badge */}
                  {renewalDate && (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                        daysRemaining <= 0
                          ? 'bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse'
                          : daysRemaining <= 7
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 animate-pulse'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      <i className="fa-solid fa-clock"></i>
                      {daysRemaining <= 0
                        ? 'Expired'
                        : daysRemaining === 1
                        ? 'Expires Tomorrow!'
                        : `${daysRemaining} Days Left`}
                    </span>
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  Welcome Back, <span className="text-[#C6EF2E]">{currentUser.name || 'Member'}</span>
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  Card Holder: <span className="text-gray-200 font-medium">{currentUser.phone || '9876543210'}</span> | Active Plan:{' '}
                  <span className="text-white font-semibold">{currentPlan?.name || `${currentTier} Membership`}</span>
                </p>
              </div>

              {/* Virtual Card Balance Chip */}
              <div className="flex items-center gap-4 bg-[#111213] border border-[#2b2d2e] rounded-2xl p-4 shadow-inner">
                <div className="w-12 h-12 rounded-xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] text-xl">
                  <i className="fa-solid fa-wallet"></i>
                </div>
                <div>
                  <div className="text-xs text-gray-400 font-medium">Virtual Card Balance</div>
                  <div className="text-xl md:text-2xl font-black text-white">{formatINR(walletBalance)}</div>
                </div>
                <Link
                  to="/wallet"
                  className="ml-2 px-3 py-1.5 rounded-xl bg-[#202223] hover:bg-[#C6EF2E] hover:text-black text-xs font-semibold text-gray-200 transition-all border border-gray-700 hover:border-[#C6EF2E]"
                >
                  Top Up
                </Link>
              </div>
            </div>

            {/* Active Perks & Expiry Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
              <div className="bg-[#121314] border border-[#242627] rounded-2xl p-4 text-center hover:border-[#C6EF2E]/40 transition-colors">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Court Bookings</div>
                <div className="text-2xl font-black text-[#C6EF2E]">
                  {currentPlan?.courtDiscount ?? 10}% OFF
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Real-time discount</div>
              </div>

              <div className="bg-[#121314] border border-[#242627] rounded-2xl p-4 text-center hover:border-[#C6EF2E]/40 transition-colors">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Champions Pro Shop</div>
                <div className="text-2xl font-black text-[#C6EF2E]">
                  {currentPlan?.shopDiscount ?? 15}% OFF
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Gear, apparel & strings</div>
              </div>

              <div className="bg-[#121314] border border-[#242627] rounded-2xl p-4 text-center hover:border-[#C6EF2E]/40 transition-colors">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Court-Side Bar</div>
                <div className="text-2xl font-black text-[#C6EF2E]">
                  {currentPlan?.cafeDiscount ?? 10}% OFF
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Tabs, drinks & snacks</div>
              </div>

              <div className="bg-[#121314] border border-[#242627] rounded-2xl p-4 text-center hover:border-[#C6EF2E]/40 transition-colors">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Advance Booking</div>
                <div className="text-2xl font-black text-[#C6EF2E]">
                  {currentPlan?.advanceBookingDays ?? 4} Days
                </div>
                <div className="text-[11px] text-gray-500 mt-1">Priority slot window</div>
              </div>
            </div>

            {/* Expiry Progress & Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#262828]">
              <div className="text-sm text-gray-300">
                <i className="fa-solid fa-calendar-check text-[#C6EF2E] mr-2"></i>
                Valid Until:{' '}
                <span className="font-bold text-white">
                  {renewalDate ? formatDate(renewalDate) : '365 Days From Enrollment'}
                </span>
                {daysRemaining <= 7 && (
                  <span className="ml-2 text-xs text-amber-400 font-semibold">
                    (Renewal Recommended)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Renew Button */}
                <button
                  onClick={() => setShowRenewModal(true)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-2xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-extrabold text-sm transition-all shadow-lg hover:shadow-[#C6EF2E]/20 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-arrows-rotate"></i>
                  Renew (+1 Year)
                  {currentPlan && (
                    <span className="ml-1 text-xs bg-black/20 px-2 py-0.5 rounded-md font-bold">
                      {formatINR(currentPlan.renewalFee || currentPlan.annualFee)}
                    </span>
                  )}
                </button>

                {/* Upgrade Button (Disabled if already Gold) */}
                {currentTier !== 'GOLD' && (
                  <button
                    onClick={() => {
                      setSelectedUpgradeTier(currentTier === 'JUNIOR' ? 'SILVER' : 'GOLD');
                      setShowUpgradeModal(true);
                    }}
                    className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-[#1e2022] hover:bg-[#282a2d] text-white hover:text-[#C6EF2E] font-bold text-sm transition-all border border-[#36393b] hover:border-[#C6EF2E]/50 flex items-center justify-center gap-2"
                  >
                    <i className="fa-solid fa-arrow-up-right-dots"></i>
                    Upgrade Tier
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: MEMBERSHIP PLANS COMPARISON & ENROLLMENT GRID */}
      <div className="section-wrapper py-12">
        <div className="section section-pricing">
          <div className="hero-container overflow-hidden">
            <div className="d-flex flex-column gspace-5">
              <div className="heading-section-container pricing-heading text-center">
                <SubHeading title="Official Membership Tiers" />
                <h2 className="secondary-accent text-3xl md:text-4xl font-extrabold mt-2">
                  Choose the Tier that Fits Your Athletic Goals
                </h2>
                <p className="text-gray-400 max-w-2xl mx-auto mt-2 text-sm md:text-base">
                  All memberships include seamless QR Turnstile access, unified Virtual Card billing,
                  instant booking perks, and dedicated pro discounts.
                </p>
              </div>

              <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1 g-4">
                {plans.map((plan, idx) => {
                  const isCurrent = currentTier === plan.tier;
                  const canUpgrade =
                    currentUser &&
                    !isCurrent &&
                    getUpgradeCost(plan.tier) > 0 &&
                    currentTier !== 'GOLD';

                  return (
                    <div className="col" key={plan.tier}>
                      <ScrollReveal animation="fade-up" delay={idx * 100}>
                        <div
                          className={`relative h-full flex flex-col justify-between rounded-3xl p-6 md:p-8 transition-all duration-300 ${
                            plan.isPopular || plan.tier === 'GOLD'
                              ? 'bg-gradient-to-b from-[#1b1e1b] via-[#141614] to-[#0e100e] border-2 border-[#C6EF2E] shadow-2xl shadow-[#C6EF2E]/10'
                              : 'bg-[#151617] border border-[#27292a] hover:border-gray-600'
                          }`}
                        >
                          {/* Badge for Popular or Active */}
                          {isCurrent ? (
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[#C6EF2E] text-black text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                              <i className="fa-solid fa-circle-check"></i> Your Active Tier
                            </div>
                          ) : plan.isPopular ? (
                            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-amber-400 text-black text-xs font-black uppercase tracking-wider shadow-md flex items-center gap-1.5">
                              <i className="fa-solid fa-crown"></i> Most Popular
                            </div>
                          ) : null}

                          <div>
                            {/* Header */}
                            <div className="flex items-center justify-between mb-4 mt-2">
                              <div>
                                <h3 className="text-xl md:text-2xl font-black text-white">{plan.name}</h3>
                                <span className="text-xs text-gray-400 font-medium">{plan.badge || 'Annual Pass'}</span>
                              </div>
                              <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${
                                  plan.tier === 'GOLD'
                                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                                    : plan.tier === 'SILVER'
                                    ? 'bg-slate-300/20 text-slate-200 border border-slate-300/40'
                                    : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/40'
                                }`}
                              >
                                <i
                                  className={`fa-solid ${
                                    plan.tier === 'GOLD'
                                      ? 'fa-crown'
                                      : plan.tier === 'SILVER'
                                      ? 'fa-shield-halved'
                                      : 'fa-star'
                                  }`}
                                ></i>
                              </div>
                            </div>

                            <p className="text-xs text-gray-400 leading-relaxed mb-6 min-h-[36px]">
                              {plan.description}
                            </p>

                            {/* Pricing Block */}
                            <div className="bg-[#0f1011] border border-[#222425] rounded-2xl p-4 mb-6">
                              <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black text-white">
                                  {formatINR(plan.annualFee)}
                                </span>
                                <span className="text-xs text-gray-400">/ Year</span>
                              </div>
                              <div className="mt-1 text-xs text-[#C6EF2E] flex items-center gap-1">
                                <i className="fa-solid fa-tags text-[11px]"></i>
                                Member Renewal:{' '}
                                <span className="font-bold">
                                  {formatINR(plan.renewalFee || plan.annualFee)}/yr
                                </span>
                                <span className="text-gray-400 text-[10px] ml-1">
                                  (Save {formatINR(plan.annualFee - (plan.renewalFee || plan.annualFee))})
                                </span>
                              </div>
                            </div>

                            {/* Discount Perks Quick Matrix */}
                            <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                              <div className="bg-[#18191a] rounded-xl p-2 border border-[#2b2d2e]">
                                <div className="text-[10px] text-gray-400 uppercase">Courts</div>
                                <div className="text-sm font-black text-[#C6EF2E]">
                                  {plan.courtDiscount}% OFF
                                </div>
                              </div>
                              <div className="bg-[#18191a] rounded-xl p-2 border border-[#2b2d2e]">
                                <div className="text-[10px] text-gray-400 uppercase">Pro Shop</div>
                                <div className="text-sm font-black text-[#C6EF2E]">
                                  {plan.shopDiscount}% OFF
                                </div>
                              </div>
                              <div className="bg-[#18191a] rounded-xl p-2 border border-[#2b2d2e]">
                                <div className="text-[10px] text-gray-400 uppercase">Cafe/Bar</div>
                                <div className="text-sm font-black text-[#C6EF2E]">
                                  {plan.cafeDiscount}% OFF
                                </div>
                              </div>
                            </div>

                            {/* Detailed Benefits Checklist */}
                            <div className="border-t border-[#252728] pt-4 mb-6">
                              <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3">
                                Included Privileges:
                              </div>
                              <ul className="space-y-2.5 text-xs text-gray-300">
                                {plan.benefits?.map((benefit, bIdx) => (
                                  <li key={bIdx} className="flex items-start gap-2.5">
                                    <i className="fa-solid fa-circle-check text-[#C6EF2E] text-sm mt-0.5 shrink-0"></i>
                                    <span className="leading-snug">{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Action Button */}
                          <div className="mt-4 pt-4 border-t border-[#252728]">
                            {isCurrent ? (
                              <button
                                onClick={() => setShowRenewModal(true)}
                                className="w-full py-3.5 rounded-2xl bg-[#C6EF2E]/20 border border-[#C6EF2E] text-[#C6EF2E] hover:bg-[#C6EF2E] hover:text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2"
                              >
                                <i className="fa-solid fa-arrows-rotate"></i>
                                Renew Active Plan ({formatINR(plan.renewalFee || plan.annualFee)})
                              </button>
                            ) : canUpgrade ? (
                              <button
                                onClick={() => {
                                  setSelectedUpgradeTier(plan.tier);
                                  setShowUpgradeModal(true);
                                }}
                                className="w-full py-3.5 rounded-2xl bg-[#C6EF2E] hover:bg-[#b0d826] text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#C6EF2E]/20"
                              >
                                <i className="fa-solid fa-arrow-up-right-dots"></i>
                                Upgrade for {formatINR(getUpgradeCost(plan.tier))}
                              </button>
                            ) : currentUser ? (
                              <div className="text-center py-3 text-xs text-gray-500 font-medium">
                                Tier standard rate
                              </div>
                            ) : (
                              <Link
                                to={`/login?register=true&tier=${plan.tier}`}
                                className={`w-full py-3.5 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center gap-2 ${
                                  plan.isPopular || plan.tier === 'GOLD'
                                    ? 'bg-[#C6EF2E] hover:bg-[#b0d826] text-black shadow-lg hover:shadow-[#C6EF2E]/20'
                                    : 'bg-[#1f2123] hover:bg-[#2b2e30] text-white border border-gray-700'
                                }`}
                              >
                                <span>Join Club</span>
                                <i className="fa-solid fa-arrow-right text-xs"></i>
                              </Link>
                            )}
                          </div>
                        </div>
                      </ScrollReveal>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: MEMBERSHIP PRIVILEGES SHOWCASE */}
      <div className="section py-12 border-t border-[#1c1d1e]">
        <div className="hero-container">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <SubHeading title="Exclusive Privileges" />
            <h2 className="text-3xl font-extrabold text-white mt-2">
              Engineered For Modern Athletic Lifestyles
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              From automated court turnstiles to emergency racket stringing, your membership unlocks
              unrivaled sports club facilities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#141516] border border-[#262828] rounded-3xl p-6 hover:border-[#C6EF2E]/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] text-2xl mb-5">
                <i className="fa-solid fa-qrcode"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Turnstile QR & Virtual Card</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Walk in and flash your synchronized digital member QR code at the turnstiles for instant 1-touch entry.
              </p>
            </div>

            <div className="bg-[#141516] border border-[#262828] rounded-3xl p-6 hover:border-[#C6EF2E]/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] text-2xl mb-5">
                <i className="fa-solid fa-bolt"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">15-Min Express Stringing</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Snapped a string before match point? Gold & Silver members receive priority lane stringing at our Pro Shop.
              </p>
            </div>

            <div className="bg-[#141516] border border-[#262828] rounded-3xl p-6 hover:border-[#C6EF2E]/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] text-2xl mb-5">
                <i className="fa-solid fa-utensils"></i>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Court-Side Bar Discounts</h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Rehydrate post-match with automated tier deductions on gourmet power-bowls, shakes, and recovery drinks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: FREQUENTLY ASKED QUESTIONS */}
      <div className="section py-12 border-t border-[#1c1d1e]">
        <div className="hero-container">
          <div className="row row-cols-xl-2 row-cols-1 g-4 items-start">
            <div className="col col-xl-4">
              <div className="sticky top-28">
                <SubHeading title="Get Answers" />
                <h2 className="text-3xl font-extrabold text-white mt-2">
                  Membership FAQs
                </h2>
                <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                  Have questions about your tier privileges, renewal billing, or guest passes? Everything you need to know about playing at Adelux.
                </p>
                <div className="mt-6 p-4 rounded-2xl bg-[#141516] border border-[#282a2b]">
                  <div className="text-xs text-gray-400">Need personal assistance?</div>
                  <div className="text-sm font-semibold text-white mt-1">Front Desk Helpdesk</div>
                  <div className="text-xs text-[#C6EF2E] mt-1 font-mono">+91 98765 43210</div>
                </div>
              </div>
            </div>

            <div className="col col-xl-8">
              <div className="space-y-3">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-[#141516] border border-[#242627] hover:border-[#333638] cursor-pointer rounded-2xl transition-all"
                    onClick={() => setActiveFaq(activeFaq === idx ? -1 : idx)}
                  >
                    <div className="flex justify-between items-center gap-4">
                      <h4 className="text-base md:text-lg font-bold text-white mb-0">{faq.q}</h4>
                      <i
                        className={`fa-solid fa-chevron-down text-sm transition-transform duration-300 ${
                          activeFaq === idx ? 'rotate-180 text-[#C6EF2E]' : 'text-gray-400'
                        }`}
                      ></i>
                    </div>
                    {activeFaq === idx && (
                      <p className="mt-3 text-gray-400 text-sm leading-relaxed mb-0 border-t border-[#262828] pt-3">
                        {faq.a}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RENEWAL MODAL */}
      {showRenewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-[#161718] border border-[#2b2d2e] rounded-3xl p-6 md:p-8 shadow-2xl">
            <button
              onClick={() => setShowRenewModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-[#C6EF2E]/10 border border-[#C6EF2E]/30 flex items-center justify-center text-[#C6EF2E] text-xl">
                <i className="fa-solid fa-arrows-rotate"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Renew Membership</h3>
                <p className="text-xs text-gray-400">Extend your {currentTier} tier for +365 Days</p>
              </div>
            </div>

            {/* Plan Fee Breakdown */}
            <div className="bg-[#101112] border border-[#232526] rounded-2xl p-4 my-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Tier:</span>
                <span className="font-bold text-white">{currentPlan?.name || currentTier}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Standard Annual Fee:</span>
                <span className="line-through">{formatINR(currentPlan?.annualFee || 15000)}</span>
              </div>
              <div className="flex justify-between text-[#C6EF2E] font-semibold">
                <span>Member Renewal Special:</span>
                <span>{formatINR(currentPlan?.renewalFee || currentPlan?.annualFee || 13500)}</span>
              </div>
              <div className="border-t border-[#262828] pt-2 flex justify-between font-extrabold text-white text-base">
                <span>Total Amount Due:</span>
                <span className="text-[#C6EF2E]">
                  {formatINR(currentPlan?.renewalFee || currentPlan?.annualFee || 13500)}
                </span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Select Payment Source
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VIRTUAL_CARD')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'VIRTUAL_CARD'
                      ? 'bg-[#C6EF2E]/10 border-[#C6EF2E] text-white'
                      : 'bg-[#1a1b1c] border-[#292b2c] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-wallet text-[#C6EF2E]"></i> Virtual Card
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Bal: {formatINR(walletBalance)}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI_ONLINE')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'UPI_ONLINE'
                      ? 'bg-[#C6EF2E]/10 border-[#C6EF2E] text-white'
                      : 'bg-[#1a1b1c] border-[#292b2c] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-mobile-screen-button text-[#C6EF2E]"></i> UPI / Gateway
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Instant Bank Transfer</div>
                </button>
              </div>

              {/* Insufficient balance warning if paying via virtual card */}
              {paymentMethod === 'VIRTUAL_CARD' &&
                walletBalance < (currentPlan?.renewalFee || currentPlan?.annualFee || 13500) && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                    <span>Low balance. Please top up your wallet.</span>
                    <Link to="/wallet" className="font-bold underline text-[#C6EF2E]">
                      Go to Wallet
                    </Link>
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRenewModal(false)}
                className="flex-1 py-3 rounded-2xl bg-[#202223] hover:bg-[#282a2b] text-gray-300 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenew}
                disabled={
                  isSubmitting ||
                  (paymentMethod === 'VIRTUAL_CARD' &&
                    walletBalance < (currentPlan?.renewalFee || currentPlan?.annualFee || 13500))
                }
                className="flex-1 py-3 rounded-2xl bg-[#C6EF2E] hover:bg-[#b0d826] disabled:opacity-50 text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Processing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> Confirm Renewal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#161718] border border-[#2b2d2e] rounded-3xl p-6 md:p-8 shadow-2xl">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-white transition-colors"
            >
              <i className="fa-solid fa-xmark text-lg"></i>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-300 text-xl">
                <i className="fa-solid fa-crown"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Upgrade Membership Tier</h3>
                <p className="text-xs text-gray-400">Current: {currentTier} Tier | Prorated Fee</p>
              </div>
            </div>

            {/* Target Tier Selection */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Choose Target Tier
              </label>
              <div className="grid grid-cols-2 gap-3">
                {plans
                  .filter((p) => p.tier !== currentTier && getUpgradeCost(p.tier) > 0)
                  .map((p) => (
                    <button
                      key={p.tier}
                      type="button"
                      onClick={() => setSelectedUpgradeTier(p.tier)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        selectedUpgradeTier === p.tier
                          ? 'bg-[#C6EF2E]/10 border-[#C6EF2E] text-white'
                          : 'bg-[#1a1b1c] border-[#292b2c] text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <div className="text-xs font-bold flex items-center justify-between">
                        <span>{p.name}</span>
                        {p.tier === 'GOLD' && (
                          <i className="fa-solid fa-crown text-amber-300 text-[11px]"></i>
                        )}
                      </div>
                      <div className="text-[11px] text-[#C6EF2E] font-semibold mt-1">
                        + {formatINR(getUpgradeCost(p.tier))} upgrade
                      </div>
                    </button>
                  ))}
              </div>
            </div>

            {/* Upgrade Perks Comparison Matrix */}
            <div className="bg-[#101112] border border-[#232526] rounded-2xl p-4 my-4 space-y-2 text-xs">
              <div className="text-gray-400 font-semibold mb-2 flex items-center gap-1.5">
                <i className="fa-solid fa-sparkles text-[#C6EF2E]"></i> Benefit Increase Summary:
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-[#18191a] p-2 rounded-xl">
                  <div className="text-[10px] text-gray-400">Court Discount</div>
                  <div className="font-bold text-[#C6EF2E]">
                    {currentPlan?.courtDiscount ?? 10}% &rarr;{' '}
                    {plans.find((p) => p.tier === selectedUpgradeTier)?.courtDiscount ?? 20}%
                  </div>
                </div>
                <div className="bg-[#18191a] p-2 rounded-xl">
                  <div className="text-[10px] text-gray-400">Pro Shop</div>
                  <div className="font-bold text-[#C6EF2E]">
                    {currentPlan?.shopDiscount ?? 15}% &rarr;{' '}
                    {plans.find((p) => p.tier === selectedUpgradeTier)?.shopDiscount ?? 30}%
                  </div>
                </div>
                <div className="bg-[#18191a] p-2 rounded-xl">
                  <div className="text-[10px] text-gray-400">Advance Window</div>
                  <div className="font-bold text-[#C6EF2E]">
                    {currentPlan?.advanceBookingDays ?? 4}d &rarr;{' '}
                    {plans.find((p) => p.tier === selectedUpgradeTier)?.advanceBookingDays ?? 7}d
                  </div>
                </div>
              </div>
              <div className="border-t border-[#262828] pt-2 mt-3 flex justify-between font-extrabold text-white text-sm">
                <span>Net Upgrade Fee Payable:</span>
                <span className="text-[#C6EF2E]">{formatINR(getUpgradeCost(selectedUpgradeTier))}</span>
              </div>
            </div>

            {/* Payment Source */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-300 uppercase tracking-wider mb-2">
                Payment Source
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VIRTUAL_CARD')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'VIRTUAL_CARD'
                      ? 'bg-[#C6EF2E]/10 border-[#C6EF2E] text-white'
                      : 'bg-[#1a1b1c] border-[#292b2c] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-wallet text-[#C6EF2E]"></i> Virtual Card
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Bal: {formatINR(walletBalance)}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('UPI_ONLINE')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMethod === 'UPI_ONLINE'
                      ? 'bg-[#C6EF2E]/10 border-[#C6EF2E] text-white'
                      : 'bg-[#1a1b1c] border-[#292b2c] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <i className="fa-solid fa-mobile-screen-button text-[#C6EF2E]"></i> UPI / Gateway
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">Instant Bank Transfer</div>
                </button>
              </div>

              {/* Insufficient balance warning */}
              {paymentMethod === 'VIRTUAL_CARD' &&
                walletBalance < getUpgradeCost(selectedUpgradeTier) && (
                  <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between">
                    <span>Insufficient balance to cover upgrade difference.</span>
                    <Link to="/wallet" className="font-bold underline text-[#C6EF2E]">
                      Top Up Wallet
                    </Link>
                  </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-3 rounded-2xl bg-[#202223] hover:bg-[#282a2b] text-gray-300 font-bold text-sm transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpgrade}
                disabled={
                  isSubmitting ||
                  (paymentMethod === 'VIRTUAL_CARD' &&
                    walletBalance < getUpgradeCost(selectedUpgradeTier))
                }
                className="flex-1 py-3 rounded-2xl bg-[#C6EF2E] hover:bg-[#b0d826] disabled:opacity-50 text-black font-extrabold text-sm transition-all flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Processing...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-crown"></i> Confirm Upgrade
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
