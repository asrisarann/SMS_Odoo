import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
      setTimeout(() => setSubmitted(false), 5000);
    }
  };

  return (
    <footer>
      <div className="section pb-0 bg-accent-color">
        <div className="hero-container">
          <div className="footer-content-container">
            <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 grid-spacer-2">
              {/* Column 1: Brand Info */}
              <div className="col">
                <div className="d-flex flex-column gspace-2">
                  <div className="footer-logo-container">
                    <img
                      src="/assets/images/Adelux-Logo.png"
                      alt="Adelux Logo"
                      className="img-fluid"
                      style={{ maxHeight: '46px', objectFit: 'contain' }}
                    />
                  </div>
                  <h4 className="secondary-accent">Adelux Padel Club & Academy</h4>
                  <p className="secondary-accent">
                    Experience the future of padel through modern courts, expert coaching, and an inclusive community.
                  </p>
                  <div className="footer-social-icon">
                    <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Facebook">
                      <i className="fa-brands fa-facebook"></i>
                    </a>
                    <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="Twitter">
                      <i className="fa-brands fa-twitter"></i>
                    </a>
                    <a href="https://youtube.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="YouTube">
                      <i className="fa-brands fa-youtube"></i>
                    </a>
                    <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="TikTok">
                      <i className="fa-brands fa-tiktok"></i>
                    </a>
                    <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="social-icon" aria-label="LinkedIn">
                      <i className="fa-brands fa-linkedin"></i>
                    </a>
                  </div>
                </div>
              </div>

              {/* Column 2: Quick Links */}
              <div className="col">
                <div className="d-flex flex-column gspace-2">
                  <h4 className="secondary-accent">Quick Links</h4>
                  <div className="underline-primary-accent"></div>
                  <ul className="chevron-list">
                    <li>
                      <Link to="/">Home</Link>
                    </li>
                    <li>
                      <Link to="/about">About Us</Link>
                    </li>
                    <li>
                      <Link to="/coaching">School & Academy</Link>
                    </li>
                    <li>
                      <Link to="/booking">Book a Court</Link>
                    </li>
                    <li>
                      <Link to="/event">Tournament</Link>
                    </li>
                    <li>
                      <Link to="/blog">Our Blog</Link>
                    </li>
                    <li>
                      <Link to="/contact">Contact Us</Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Column 3: Contact Info */}
              <div className="col">
                <div className="d-flex flex-column gspace-2">
                  <h4 className="secondary-accent">Contact Info</h4>
                  <div className="underline-primary-accent"></div>
                  <div className="d-flex flex-column gspace-2">
                    <div className="d-flex flex-row gspace-2 align-items-start">
                      <div>
                        <div className="contact-icon footer-icon">
                          <i className="fa-solid fa-phone-volume"></i>
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h6 className="contact-info-heading">Phone Number</h6>
                        <h5 className="secondary-accent">+1 (800) 123-4567</h5>
                      </div>
                    </div>
                    <div className="d-flex flex-row gspace-1 align-items-start">
                      <div>
                        <div className="contact-icon footer-icon">
                          <i className="fa-solid fa-envelope"></i>
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h6 className="contact-info-heading">Email Address</h6>
                        <h5 className="secondary-accent">hello@adeluxpadel.com</h5>
                      </div>
                    </div>
                    <div className="d-flex flex-row gspace-1 align-items-start">
                      <div>
                        <div className="contact-icon footer-icon">
                          <i className="fa-solid fa-map-location-dot"></i>
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h6 className="contact-info-heading">Location</h6>
                        <h5 className="secondary-accent">Adelux Padel Center, 123 Avenue Court, New York, NY</h5>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Column 4: Newsletter */}
              <div className="col">
                <div className="d-flex flex-column gspace-2">
                  <h4 className="secondary-accent">Subscribe Newsletter</h4>
                  <div className="underline-primary-accent"></div>
                  <p className="secondary-accent">
                    Get the latest updates on tournaments, promotions & padel tips.
                  </p>

                  {submitted && (
                    <div id="newsletter-success" className="alert success">
                      <span className="check-icon">
                        <i className="fa-solid fa-check"></i>
                      </span>
                      <p className="text-center mb-0">Thank you! Form submitted successfully.</p>
                    </div>
                  )}

                  <form id="newsletter-form" onSubmit={handleSubscribe} className="form">
                    <input
                      type="email"
                      id="newsletter"
                      name="newsletter"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Subscribe to Our Newsletter"
                      required
                    />
                    <button type="submit" className="btn btn-accent mt-2 w-100">
                      <span className="btn-title">Subscribe Now</span>
                      <span className="icon-circle">
                        <i className="fa-solid fa-arrow-right"></i>
                      </span>
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Copyright Bar */}
            <div className="footer-copyright-container">
              <div className="footer-legalink-container">
                <a href="#privacy" className="legalink">
                  Privacy Policy
                </a>
                <div className="divider"></div>
                <a href="#terms" className="legalink">
                  Terms & Conditions
                </a>
              </div>

              <h6 className="secondary-accent mb-0">
                © {new Date().getFullYear()} Adelux Padel Club. All rights reserved.
              </h6>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
