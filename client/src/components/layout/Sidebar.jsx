import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Sidebar({ isOpen, onClose }) {
  const [bookingOpen, setBookingOpen] = useState(false);
  const [pagesOpen, setPagesOpen] = useState(false);

  return (
    <aside>
      <div>
        {/* Overlay */}
        <div
          className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
          onClick={onClose}
        ></div>

        {/* Sidebar Panel */}
        <div className={`sidebar ${isOpen ? 'active' : ''}`}>
          <div className="sidebar-header">
            <div className="logo">
              <Link to="/" onClick={onClose}>
                <img
                  src="/assets/images/Adelux-Black-Logo.png"
                  className="logo"
                  alt="Adelux Logo"
                  style={{ maxHeight: '42px', objectFit: 'contain' }}
                />
              </Link>
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Close sidebar">
              <span>X</span>
            </button>
          </div>

          <ul className="menu">
            <li>
              <Link to="/" onClick={onClose}>
                Home
              </Link>
            </li>
            <li>
              <Link to="/about" onClick={onClose}>
                About Us
              </Link>
            </li>

            {/* Booking Court Dropdown */}
            <li className="sidebar-dropdown">
              <div
                className="dropdown-header d-flex justify-content-between align-items-center cursor-pointer"
                onClick={() => setBookingOpen(!bookingOpen)}
              >
                <span>Booking Court</span>
                <button
                  type="button"
                  className="sidebar-dropdown-btn bg-transparent border-0"
                  aria-label="Toggle booking menu"
                >
                  <i
                    className={`fa-solid fa-angle-down transition-transform duration-200 ${
                      bookingOpen ? 'rotate-180' : ''
                    }`}
                  ></i>
                </button>
              </div>
              {bookingOpen && (
                <ul className="sidebar-dropdown-menu ps-4 pt-2">
                  <li className="py-1">
                    <Link to="/booking" onClick={onClose}>
                      Booking Court
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link to="/event" onClick={onClose}>
                      Event
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link to="/membership" onClick={onClose}>
                      Membership
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            {/* Pages Dropdown */}
            <li className="sidebar-dropdown">
              <div
                className="dropdown-header d-flex justify-content-between align-items-center cursor-pointer"
                onClick={() => setPagesOpen(!pagesOpen)}
              >
                <span>Pages</span>
                <button
                  type="button"
                  className="sidebar-dropdown-btn bg-transparent border-0"
                  aria-label="Toggle pages menu"
                >
                  <i
                    className={`fa-solid fa-angle-down transition-transform duration-200 ${
                      pagesOpen ? 'rotate-180' : ''
                    }`}
                  ></i>
                </button>
              </div>
              {pagesOpen && (
                <ul className="sidebar-dropdown-menu ps-4 pt-2">
                  <li className="py-1">
                    <Link to="/service" onClick={onClose}>
                      Our Services
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link to="/coaching" onClick={onClose}>
                      Coaching
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link to="/community" onClick={onClose}>
                      Community
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link to="/faq" onClick={onClose}>
                      FAQ
                    </Link>
                  </li>
                  <li className="py-1">
                    <Link to="/blog" onClick={onClose}>
                      Blog
                    </Link>
                  </li>
                </ul>
              )}
            </li>

            <li className="below-dropdown">
              <Link to="/contact" onClick={onClose}>
                Contact Us
              </Link>
            </li>
          </ul>

          <div className="p-3 mt-4">
            <Link
              to="/booking"
              onClick={onClose}
              className="btn btn-accent w-100 justify-content-center text-center"
            >
              <span className="btn-title">Book a Court</span>
              <span className="icon-circle">
                <i className="fa-solid fa-arrow-right"></i>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
