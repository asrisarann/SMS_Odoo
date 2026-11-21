import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar({ onOpenSidebar }) {
  const [bookingDropdownOpen, setBookingDropdownOpen] = useState(false);
  const [pagesDropdownOpen, setPagesDropdownOpen] = useState(false);
  const location = useLocation();

  const closeDropdowns = () => {
    setBookingDropdownOpen(false);
    setPagesDropdownOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <header>
      <div className="navbar-container">
        <div className="hero-container">
          <nav className="navbar navbar-expand-xl">
            <div className="navbar-nav-container">
              {/* Logo Container */}
              <div className="logo-container">
                <Link className="navbar-brand fw-bold" to="/" onClick={closeDropdowns}>
                  <img
                    src="/assets/images/Adelux-Logo.png"
                    alt="Adelux Logo"
                    className="img-fluid"
                    style={{ maxHeight: '48px', objectFit: 'contain' }}
                  />
                </Link>
              </div>

              {/* Nav Link Container */}
              <div className="nav-link-container">
                <div className="collapse navbar-collapse d-flex justify-content-center" id="navbarNav">
                  <ul className="navbar-nav mx-auto d-flex flex-row align-items-center gap-2">
                    <li className="nav-item">
                      <Link className={`nav-link ${isActive('/') ? 'active' : ''}`} to="/" onClick={closeDropdowns}>
                        Home
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link className={`nav-link ${isActive('/about') ? 'active' : ''}`} to="/about" onClick={closeDropdowns}>
                        About Us
                      </Link>
                    </li>

                    {/* Booking Court Dropdown */}
                    <li
                      className="nav-item dropdown position-relative"
                      onMouseEnter={() => setBookingDropdownOpen(true)}
                      onMouseLeave={() => setBookingDropdownOpen(false)}
                    >
                      <button
                        className={`nav-link dropdown-toggle bg-transparent border-0 cursor-pointer d-flex align-items-center gap-1 ${
                          isActive('/booking') || isActive('/event') || isActive('/membership') ? 'active' : ''
                        }`}
                        onClick={() => setBookingDropdownOpen(!bookingDropdownOpen)}
                      >
                        Booking Court <i className="fa-solid fa-chevron-down text-xs"></i>
                      </button>
                      {bookingDropdownOpen && (
                        <ul className="dropdown-menu show position-absolute" style={{ top: '100%', left: 0, minWidth: '180px' }}>
                          <li>
                            <Link className="dropdown-item" to="/booking" onClick={closeDropdowns}>
                              Booking Court
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="/event" onClick={closeDropdowns}>
                              Events
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="/membership" onClick={closeDropdowns}>
                              Membership
                            </Link>
                          </li>
                        </ul>
                      )}
                    </li>

                    {/* Pages Dropdown */}
                    <li
                      className="nav-item dropdown position-relative"
                      onMouseEnter={() => setPagesDropdownOpen(true)}
                      onMouseLeave={() => setPagesDropdownOpen(false)}
                    >
                      <button
                        className={`nav-link dropdown-toggle bg-transparent border-0 cursor-pointer d-flex align-items-center gap-1 ${
                          isActive('/service') || isActive('/coaching') || isActive('/community') || isActive('/faq') || isActive('/blog')
                            ? 'active'
                            : ''
                        }`}
                        onClick={() => setPagesDropdownOpen(!pagesDropdownOpen)}
                      >
                        Pages <i className="fa-solid fa-chevron-down text-xs"></i>
                      </button>
                      {pagesDropdownOpen && (
                        <ul className="dropdown-menu show position-absolute" style={{ top: '100%', left: 0, minWidth: '180px' }}>
                          <li>
                            <Link className="dropdown-item" to="/service" onClick={closeDropdowns}>
                              Our Services
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="/coaching" onClick={closeDropdowns}>
                              Coaching
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="/community" onClick={closeDropdowns}>
                              Community
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="/faq" onClick={closeDropdowns}>
                              FAQ
                            </Link>
                          </li>
                          <li>
                            <Link className="dropdown-item" to="/blog" onClick={closeDropdowns}>
                              Blog
                            </Link>
                          </li>
                        </ul>
                      )}
                    </li>

                    <li className="nav-item">
                      <Link className={`nav-link ${isActive('/contact') ? 'active' : ''}`} to="/contact" onClick={closeDropdowns}>
                        Contact Us
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Hamburger Button for Mobile */}
              <button
                className="nav-btn"
                type="button"
                onClick={onOpenSidebar}
                aria-label="Open mobile menu"
              >
                <i className="fa-solid fa-bars-staggered"></i>
              </button>

              {/* Navbar CTA Container */}
              <div className="navbar-cta-container">
                <div>
                  <Link to="/membership" className="btn btn-accent" onClick={closeDropdowns}>
                    <span className="btn-title">Join The Club</span>
                    <span className="icon-circle">
                      <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
