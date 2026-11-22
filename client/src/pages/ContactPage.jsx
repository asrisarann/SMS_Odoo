import { useState } from 'react';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';
import { api } from '../services/api';

const getTodayDateStr = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ContactPage() {
  const currentUser = api.auth.getUser();

  const [form, setForm] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    sportOfInterest: 'PADEL_COURT',
    membershipOfInterest: 'GOLD',
    isTrialRequested: false,
    preferredTrialDate: getTodayDateStr(),
    preferredTrialTime: '09:00 - 10:00 AM',
    message: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');
    setSubmittedData(null);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        sportOfInterest: form.sportOfInterest,
        membershipOfInterest:
          form.membershipOfInterest === 'NONE' ? null : form.membershipOfInterest,
        message: form.message.trim() || null,
        isTrialRequested: Boolean(form.isTrialRequested),
        preferredTrialDate: form.isTrialRequested ? form.preferredTrialDate : null,
        preferredTrialTime: form.isTrialRequested ? form.preferredTrialTime : null,
      };

      const res = await api.crm.submitEnquiry(payload);
      setSubmittedData(res.enquiry || payload);
      setForm({
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
        sportOfInterest: 'PADEL_COURT',
        membershipOfInterest: 'GOLD',
        isTrialRequested: false,
        preferredTrialDate: getTodayDateStr(),
        preferredTrialTime: '09:00 - 10:00 AM',
        message: '',
      });
    } catch (err) {
      setErrorMessage(
        err.message || 'Failed to submit enquiry. Please check your contact information.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="bg-[#0e0f0f] text-gray-100 min-h-screen">
      <PageBanner
        title="Get in Touch"
        current="Contact Us"
        bannerClass="banner-inner-contact"
      />

      <div className="section">
        <div className="hero-container overflow-hidden">
          <div className="row row-cols-xl-2 row-cols-1 grid-spacer-5 grid-spacer-xl-100 align-items-start">
            {/* Left Contact Details */}
            <div className="col">
              <ScrollReveal animation="fade-right">
                <div className="d-flex flex-column gspace-5">
                  <div className="d-flex flex-column gspace-2">
                    <SubHeading title="We're Here to Help!" />
                    <h2 className="text-white">Get in Touch with Adelux Sports Club</h2>
                    <p className="text-gray-400">
                      Whether you are looking to book a trial session, explore our premium
                      memberships, or simply have questions about court reservations, our front-desk
                      concierge team is here to help.
                    </p>
                  </div>

                  <div className="d-flex flex-column gspace-3">
                    <div className="d-flex flex-row gspace-3 align-items-start bg-[#141414] border border-gray-800 p-4 rounded-2xl">
                      <div>
                        <div className="contact-icon text-[#C6EF2E]">
                          <i className="fa-solid fa-phone-volume text-xl"></i>
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h6 className="contact-info-heading text-[#C6EF2E] text-xs font-bold uppercase mb-1">Phone Number</h6>
                        <h4 className="text-white text-base font-bold mb-0">+91 98765 43210 / +1 (800) 123-4567</h4>
                      </div>
                    </div>

                    <div className="d-flex flex-row gspace-3 align-items-start bg-[#141414] border border-gray-800 p-4 rounded-2xl">
                      <div>
                        <div className="contact-icon text-[#C6EF2E]">
                          <i className="fa-solid fa-envelope text-xl"></i>
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h6 className="contact-info-heading text-[#C6EF2E] text-xs font-bold uppercase mb-1">Email Address</h6>
                        <h4 className="text-white text-base font-bold mb-0">concierge@adeluxpadel.com</h4>
                      </div>
                    </div>

                    <div className="d-flex flex-row gspace-3 align-items-start bg-[#141414] border border-gray-800 p-4 rounded-2xl">
                      <div>
                        <div className="contact-icon text-[#C6EF2E]">
                          <i className="fa-solid fa-clock text-xl"></i>
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h6 className="contact-info-heading text-[#C6EF2E] text-xs font-bold uppercase mb-1">Operating Hours</h6>
                        <h4 className="text-white text-sm font-bold mb-1">Mon - Fri: 06:00 AM - 10:00 PM</h4>
                        <h4 className="text-white text-sm font-bold mb-0">Sat - Sun: 06:00 AM - 10:00 PM</h4>
                      </div>
                    </div>

                    <div className="d-flex flex-row gspace-3 align-items-start bg-[#141414] border border-gray-800 p-4 rounded-2xl">
                      <div>
                        <div className="contact-icon text-[#C6EF2E]">
                          <i className="fa-solid fa-map-location-dot text-xl"></i>
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h6 className="contact-info-heading text-[#C6EF2E] text-xs font-bold uppercase mb-1">Location</h6>
                        <h4 className="text-white text-base font-bold mb-0">Adelux Sports & Padel Arena, 123 Palm Boulevard</h4>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            {/* Right Contact & CRM Lead Form Card */}
            <div className="col">
              <ScrollReveal animation="fade-left" delay={150}>
                <div className="bg-[#141414] text-white rounded-3xl border border-gray-800 p-6 md:p-8 shadow-2xl">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <h3 className="text-white font-black text-xl mb-0">Send an Inquiry & Trial Request</h3>
                    <span className="badge bg-lime-400/20 text-lime-400 text-xs px-2.5 py-1 rounded-full border border-lime-400/30">
                      CRM Online Pipeline
                    </span>
                  </div>
                  <p className="accent-color-8 text-xs mb-4">
                    Fill in your details below. Prospective inquiries receive an automatic email
                    acknowledgment and quotation from our staff.
                  </p>

                  {/* Success Alert */}
                  {submittedData && (
                    <div className="alert success mb-4 p-4 rounded-xl bg-lime-400/10 border border-lime-400/40 text-black">
                      <div className="flex items-start gap-3">
                        <span className="check-icon text-xl text-lime-500 mt-0.5">
                          <i className="fa-solid fa-circle-check"></i>
                        </span>
                        <div>
                          <h5 className="font-bold mb-1 text-black">Inquiry Logged Successfully!</h5>
                          <p className="mb-1 text-xs text-gray-700">
                            Thank you, <strong>{submittedData.name}</strong>. Your inquiry has been
                            received into our CRM pipeline. A confirmation email has been dispatched to{' '}
                            <strong>{submittedData.email}</strong>.
                          </p>
                          {submittedData.isTrialRequested && (
                            <div className="text-[11px] font-bold text-emerald-800 mt-1">
                              🎾 Complimentary Trial Session Requested for{' '}
                              {submittedData.sportOfInterest?.replace('_', ' ')}. Our concierge will
                              confirm your court slot.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error Alert */}
                  {errorMessage && (
                    <div className="p-3 mb-4 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs flex items-center justify-between">
                      <span>{errorMessage}</span>
                      <button onClick={() => setErrorMessage('')} className="text-rose-400">
                        &times;
                      </button>
                    </div>
                  )}

                  <form id="contact-form" onSubmit={handleSubmit} className="form">
                    {/* Name & Email */}
                    <div className="row row-cols-md-2 row-cols-1 grid-spacer-2 mb-3">
                      <div className="col">
                        <div className="d-flex flex-column gspace-1">
                          <label htmlFor="name" className="text-white text-xs font-semibold">
                            Full Name <span className="text-lime-400">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            id="name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Enter your name"
                            required
                            className="rounded-xl border border-gray-700 bg-gray-900 text-white p-2.5 text-xs"
                          />
                        </div>
                      </div>
                      <div className="col">
                        <div className="d-flex flex-column gspace-1">
                          <label htmlFor="email" className="text-white text-xs font-semibold">
                            Email Address <span className="text-lime-400">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            id="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="name@example.com"
                            required
                            className="rounded-xl border border-gray-700 bg-gray-900 text-white p-2.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Phone & Sport of Interest */}
                    <div className="row row-cols-md-2 row-cols-1 grid-spacer-2 mb-3">
                      <div className="col">
                        <div className="d-flex flex-column gspace-1">
                          <label htmlFor="phone" className="text-white text-xs font-semibold">
                            Phone Number <span className="text-lime-400">*</span>
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            id="phone"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            placeholder="+91 98765 43210"
                            required
                            className="rounded-xl border border-gray-700 bg-gray-900 text-white p-2.5 text-xs"
                          />
                        </div>
                      </div>
                      <div className="col">
                        <div className="d-flex flex-column gspace-1">
                          <label
                            htmlFor="sportOfInterest"
                            className="text-white text-xs font-semibold"
                          >
                            Sport Facility of Interest
                          </label>
                          <select
                            id="sportOfInterest"
                            value={form.sportOfInterest}
                            onChange={(e) => setForm({ ...form, sportOfInterest: e.target.value })}
                            className="rounded-xl border border-gray-700 bg-gray-900 text-white p-2.5 text-xs"
                          >
                            <option value="PADEL_COURT">Panoramic Padel Court</option>
                            <option value="TENNIS">Lawn & Hard Tennis Court</option>
                            <option value="BADMINTON">Indoor Badminton Court</option>
                            <option value="CRICKET">Cricket Pitch & Nets</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Membership Tier Preference */}
                    <div className="mb-3">
                      <div className="d-flex flex-column gspace-1">
                        <label
                          htmlFor="membershipOfInterest"
                          className="text-white text-xs font-semibold"
                        >
                          Preferred Membership Package
                        </label>
                        <select
                          id="membershipOfInterest"
                          value={form.membershipOfInterest}
                          onChange={(e) =>
                            setForm({ ...form, membershipOfInterest: e.target.value })
                          }
                          className="rounded-xl border border-gray-700 bg-gray-900 text-white p-2.5 text-xs"
                        >
                          <option value="GOLD">Gold Tier — 20% Court & Pro Shop Discount</option>
                          <option value="SILVER">Silver Tier — 10% Court & Pro Shop Discount</option>
                          <option value="JUNIOR">Junior Tier (Under 18) — 15% Discount</option>
                          <option value="NONE">General Inquiry / No Plan Yet</option>
                        </select>
                      </div>
                    </div>

                    {/* Complimentary Trial Session Checkbox */}
                    <div className="p-3 mb-3 rounded-xl border border-lime-500/30 bg-lime-400/5">
                      <label className="flex items-center gap-2.5 cursor-pointer text-xs text-white font-semibold">
                        <input
                          type="checkbox"
                          checked={form.isTrialRequested}
                          onChange={(e) =>
                            setForm({ ...form, isTrialRequested: e.target.checked })
                          }
                          className="rounded border-gray-700 text-lime-400 focus:ring-lime-400 w-4 h-4"
                        />
                        <span>
                          Request a Complimentary 1-Hour Trial Session (Free racket rental included)
                        </span>
                      </label>

                      {form.isTrialRequested && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2.5 pt-2.5 border-t border-gray-800">
                          <div>
                            <label className="text-[11px] text-gray-300 block mb-1">
                              Preferred Trial Date
                            </label>
                            <input
                              type="date"
                              min={getTodayDateStr()}
                              value={form.preferredTrialDate}
                              onChange={(e) =>
                                setForm({ ...form, preferredTrialDate: e.target.value })
                              }
                              className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2 text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-gray-300 block mb-1">
                              Preferred Time Window
                            </label>
                            <select
                              value={form.preferredTrialTime}
                              onChange={(e) =>
                                setForm({ ...form, preferredTrialTime: e.target.value })
                              }
                              className="w-full rounded-lg border border-gray-700 bg-gray-900 text-white p-2 text-xs"
                            >
                              <option value="09:00 - 10:00 AM">Morning: 09:00 - 10:00 AM</option>
                              <option value="04:00 - 05:00 PM">Afternoon: 04:00 - 05:00 PM</option>
                              <option value="07:00 - 08:00 PM">Evening: 07:00 - 08:00 PM</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Additional Message */}
                    <div className="d-flex flex-column gspace-1 mb-4">
                      <label htmlFor="message" className="text-white text-xs font-semibold">
                        Additional Message / Coaching Needs
                      </label>
                      <textarea
                        name="message"
                        id="message"
                        rows="3"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        placeholder="Tell us about your playing experience, coaching requirements, or general questions..."
                        className="rounded-xl border border-gray-700 bg-gray-900 text-white p-2.5 text-xs"
                      ></textarea>
                    </div>

                    {/* Submit Button */}
                    <div>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 px-6 rounded-2xl bg-[#C6EF2E] hover:bg-[#b0d826] disabled:opacity-40 text-black font-black text-sm transition-all shadow-xl shadow-[#C6EF2E]/20 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>{submitting ? 'Submitting to CRM...' : 'Send Inquiry to Concierge'}</span>
                        <i className="fa-solid fa-arrow-right text-xs"></i>
                      </button>
                    </div>
                  </form>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
