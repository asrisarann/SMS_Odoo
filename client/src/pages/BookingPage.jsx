import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import ScrollReveal from '../components/common/ScrollReveal';

export default function BookingPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '2026-11-25',
    time: '08:00 - 09:00 AM',
    court: 'Indoor Court',
    message: '',
  });

  const [timeDropdown, setTimeDropdown] = useState(false);
  const [courtDropdown, setCourtDropdown] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const timeSlots = [
    '08:00 - 09:00 AM',
    '09:00 - 10:00 AM',
    '10:00 - 11:00 AM',
    '04:00 - 05:00 PM',
    '05:00 - 06:00 PM',
    '06:00 - 07:00 PM',
    '07:00 - 08:00 PM',
    '08:00 - 09:00 PM',
  ];

  const courtTypes = ['Indoor Court', 'Outdoor Court', 'Panoramic Match Court'];

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 8000);
  };

  return (
    <main>
      {/* Banner */}
      <PageBanner title="Booking Court" current="Booking Court" bannerClass="banner-inner-booking" />

      {/* Booking Process Section */}
      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up" className="booking-process-heading">
              <div className="sub-heading">
                <i className="fa-solid fa-circle accent-color-2"></i>
                <span className="sub-heading-title">How to Book</span>
              </div>
              <h2>Reserve Your Court in Seconds Play Your Game</h2>
            </ScrollReveal>

            <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 grid-spacer-2">
              <div className="col">
                <ScrollReveal animation="fade-up" delay={50}>
                  <div className="card card-process">
                    <div className="icon">
                      <h4 className="accent-color mb-0">01</h4>
                    </div>
                    <div>
                      <h4>Select your court</h4>
                      <p>Indoor or outdoor courts available</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
              <div className="col">
                <ScrollReveal animation="fade-up" delay={150}>
                  <div className="card card-process">
                    <div className="icon">
                      <h4 className="accent-color mb-0">02</h4>
                    </div>
                    <div>
                      <h4>Pick a date & time</h4>
                      <p>Real-time availability for flexible scheduling</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
              <div className="col">
                <ScrollReveal animation="fade-up" delay={250}>
                  <div className="card card-process">
                    <div className="icon">
                      <h4 className="accent-color mb-0">03</h4>
                    </div>
                    <div>
                      <h4>Add extras</h4>
                      <p>Choose equipment rental or request a coach (optional)</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
              <div className="col">
                <ScrollReveal animation="fade-up" delay={350}>
                  <div className="card card-process">
                    <div className="icon">
                      <h4 className="accent-color mb-0">04</h4>
                    </div>
                    <div>
                      <h4>Confirm & pay</h4>
                      <p>Instant booking confirmation via email</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Form & Details Section */}
      <div className="section pt-0">
        <div className="hero-container">
          <div className="booking-form-wrapper">
            {/* Booking Form Card */}
            <div className="card card-booking-form">
              <h3 className="secondary-accent">Book Your Court Now</h3>
              <p className="accent-color-8">Fill in the form to schedule your padel session. Fast, secure, and convenient.</p>
              <div className="underline-primary-accent mb-4"></div>

              {submitted && (
                <div id="success-message" className="alert success mb-4">
                  <span className="check-icon">
                    <i className="fa-solid fa-check"></i>
                  </span>
                  <div>
                    <h5 className="font-bold mb-1 text-black">Booking Reserved Successfully!</h5>
                    <p className="mb-0 text-sm">
                      We have reserved your {formData.court} slot for {formData.date} at {formData.time}. A confirmation summary has been logged.
                    </p>
                  </div>
                </div>
              )}

              <form id="booking-form" onSubmit={handleSubmit} className="form">
                <div className="row row-cols-md-2 row-cols-1 grid-spacer-2 mb-3">
                  <div className="col">
                    <div className="d-flex flex-column gspace-1">
                      <label htmlFor="name">Full Name</label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>
                  </div>
                  <div className="col">
                    <div className="d-flex flex-column gspace-1">
                      <label htmlFor="email">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row row-cols-md-2 row-cols-1 grid-spacer-2 mb-3">
                  <div className="col">
                    <div className="d-flex flex-column gspace-1">
                      <label htmlFor="phone">Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Your Phone Number"
                        required
                      />
                    </div>
                  </div>
                  <div className="col">
                    <div className="d-flex flex-column gspace-1">
                      <label htmlFor="date">Select Date</label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="row row-cols-md-2 row-cols-1 grid-spacer-2 mb-3">
                  {/* Time Slot Dropdown */}
                  <div className="col">
                    <div className="d-flex flex-column gspace-1 position-relative">
                      <label>Select Time Slot</label>
                      <div className="dropdown-container">
                        <div
                          className="dropdown-select cursor-pointer d-flex justify-content-between align-items-center"
                          onClick={() => setTimeDropdown(!timeDropdown)}
                        >
                          <span className="selected-text has-value">{formData.time}</span>
                          <i className={`fa-solid fa-caret-down ${timeDropdown ? 'rotate' : ''}`}></i>
                        </div>
                        {timeDropdown && (
                          <div className="dropdown-list show position-absolute w-100 z-50">
                            {timeSlots.map((slot) => (
                              <div
                                key={slot}
                                className={`dropdown-option ${formData.time === slot ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData({ ...formData, time: slot });
                                  setTimeDropdown(false);
                                }}
                              >
                                {slot}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Court Type Dropdown */}
                  <div className="col">
                    <div className="d-flex flex-column gspace-1 position-relative">
                      <label>Court Type</label>
                      <div className="dropdown-container">
                        <div
                          className="dropdown-select cursor-pointer d-flex justify-content-between align-items-center"
                          onClick={() => setCourtDropdown(!courtDropdown)}
                        >
                          <span className="selected-text has-value">{formData.court}</span>
                          <i className={`fa-solid fa-caret-down ${courtDropdown ? 'rotate' : ''}`}></i>
                        </div>
                        {courtDropdown && (
                          <div className="dropdown-list show position-absolute w-100 z-50">
                            {courtTypes.map((c) => (
                              <div
                                key={c}
                                className={`dropdown-option ${formData.court === c ? 'selected' : ''}`}
                                onClick={() => {
                                  setFormData({ ...formData, court: c });
                                  setCourtDropdown(false);
                                }}
                              >
                                {c}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="d-flex flex-column gspace-1 mb-4">
                  <label htmlFor="message">Additional Notes (Optional)</label>
                  <textarea
                    name="message"
                    id="message"
                    rows="4"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Share any preferences, racket rentals, or coaching requests..."
                  ></textarea>
                </div>

                <div>
                  <button type="submit" className="btn btn-accent w-100 justify-content-center">
                    <span className="btn-title">Confirm Booking</span>
                    <span className="icon-circle">
                      <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Booking Details Aside */}
            <div className="booking-form-detail">
              <div className="d-flex flex-column gspace-2">
                <h3>Why Book with Adelux?</h3>
                <div className="underline-accent-5"></div>
                <div className="row row-cols-md-2 row-cols-1 grid-spacer-2">
                  <div className="col">
                    <ul className="check-list">
                      <li>Professional-grade courts (indoor & outdoor)</li>
                      <li>Friendly on-site certified staff</li>
                      <li>Clean, modern locker and lounge facilities</li>
                    </ul>
                  </div>
                  <div className="col">
                    <ul className="check-list">
                      <li>Flexible cancellation policy</li>
                      <li>Easy online reservation system</li>
                      <li>LED floodlighting for evening matches</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-column gspace-2 mt-4">
                <h3>Opening Hours</h3>
                <div className="underline-accent-5"></div>
                <div className="d-flex flex-column">
                  <h5 className="font-semibold text-gray-800">Monday - Friday: 08:00 AM - 10:00 PM</h5>
                  <h5 className="font-semibold text-gray-800">Saturday - Sunday: 09:00 AM - 11:00 PM</h5>
                </div>
              </div>

              <div className="d-flex flex-column gspace-2 mt-4">
                <h3>Booking Rates</h3>
                <div className="underline-accent-5"></div>
                <div className="d-flex flex-column">
                  <h5>Weekday Rates: Starting from $25/hour</h5>
                  <h5>Weekend Rates: Starting from $35/hour</h5>
                  <h5>Coaching Add-on: +$20/hour</h5>
                  <h5>Equipment Rental: +$5/session</h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact CTA Section */}
      <div className="section py-0">
        <div className="hero-container">
          <div className="card card-contact-cta">
            <div className="contact-cta-content">
              <h2 className="primary-accent">Ready to Train with the Best?</h2>
              <p className="primary-accent">
                Whether you're picking up a racquet for the first time or aiming for pro tournaments, our coaches are here to support your journey.
              </p>
              <div>
                <Link to="/contact" className="btn btn-accent bg-accent-color-6">
                  <span className="btn-title">Book a Trial Session</span>
                  <span className="icon-circle">
                    <i className="fa-solid fa-arrow-right"></i>
                  </span>
                </Link>
              </div>
            </div>

            <div className="contact-cta-image">
              <div className="image-wrapper">
                <img src="/assets/images/2AH2LFJ-1.png" alt="Contact CTA" className="img-fluid" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
