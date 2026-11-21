import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';

const allFaqs = [
  {
    category: 'Court Bookings',
    items: [
      {
        q: 'Do I need a membership to book a court at Adelux?',
        a: 'No! All of our indoor and outdoor padel courts are open to the general public for hourly booking. Members enjoy priority booking windows and discounted rates.',
      },
      {
        q: 'What is the cancellation and refund policy?',
        a: 'You can cancel or reschedule any booking up to 2 hours before your scheduled start time for a 100% credit refund to your account.',
      },
      {
        q: 'Are rackets and balls provided?',
        a: 'Yes, premium Wilson and Bullpadel rackets can be rented at the front reception for $5 per session. Tournament-grade balls can be purchased on-site.',
      },
    ],
  },
  {
    category: 'Membership & Pricing',
    items: [
      {
        q: 'What are the benefits of the Elite Membership?',
        a: 'Elite members enjoy unlimited court reservations, 4 monthly group clinics, 15% discount on pro-shop gear, free racket rental, and VIP lounge access.',
      },
      {
        q: 'Can I bring guests to my court session?',
        a: 'Yes! You can invite up to 3 guests to join you on your booked court at no extra charge.',
      },
    ],
  },
  {
    category: 'Academy & Coaching',
    items: [
      {
        q: 'What should a complete beginner expect in their first class?',
        a: 'Our coaches provide loaner rackets, explain court geometry, and teach essential fundamentals: forehand slice, backhand control, and ball bounce mechanics.',
      },
      {
        q: 'Are private lessons available for doubles pairs?',
        a: 'Yes, we offer tailored 2-on-1 tactical coaching for doubles partners preparing for club leagues or tournaments.',
      },
    ],
  },
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({ 'Court Bookings-0': true });

  const toggleItem = (key) => {
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <main>
      <PageBanner title="Frequently Asked Questions" current="FAQ" bannerClass="banner-inner-faq" />

      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up">
              <div className="text-center max-w-2xl mx-auto">
                <SubHeading title="Got Questions?" className="justify-content-center" />
                <h2 className="mt-3">Everything You Need to Know</h2>
                <p className="text-gray-600 mt-2">
                  Find answers to common questions about court reservations, memberships, coaching programs, and club amenities.
                </p>
              </div>
            </ScrollReveal>

            <div className="d-flex flex-column gap-5 max-w-4xl mx-auto w-100">
              {allFaqs.map((sec, sIdx) => (
                <ScrollReveal key={sIdx} animation="fade-up" delay={sIdx * 100}>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 pb-2 border-b-2 border-[#C6EF2E]">
                      {sec.category}
                    </h3>
                    <div className="d-flex flex-column gap-3">
                      {sec.items.map((item, iIdx) => {
                        const key = `${sec.category}-${iIdx}`;
                        const isOpen = !!openItems[key];
                        return (
                          <div
                            key={iIdx}
                            className="card p-4 bg-gray-50 border border-gray-200 cursor-pointer rounded-2xl transition-all hover:border-[#C6EF2E]"
                            onClick={() => toggleItem(key)}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <h4 className="text-xl font-bold text-gray-900 mb-0">{item.q}</h4>
                              <i
                                className={`fa-solid fa-chevron-down text-sm transition-transform duration-300 ${
                                  isOpen ? 'rotate-180 text-[#C6EF2E]' : 'text-gray-400'
                                }`}
                              ></i>
                            </div>
                            {isOpen && <p className="mt-3 text-gray-600 mb-0 leading-relaxed">{item.a}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Need More Help Box */}
            <ScrollReveal animation="zoom-in" delay={150}>
              <div className="text-center p-5 bg-black text-white rounded-3xl max-w-3xl mx-auto w-100">
                <h3 className="text-white font-bold mb-2">Still Have Questions?</h3>
                <p className="text-white/70 mb-4">Our friendly support desk is available 7 days a week to help you get on court.</p>
                <Link to="/contact" className="btn btn-accent">
                  <span className="btn-title">Contact Support</span>
                  <span className="icon-circle">
                    <i className="fa-solid fa-arrow-right"></i>
                  </span>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </main>
  );
}
