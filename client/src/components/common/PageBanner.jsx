import { Link } from 'react-router-dom';

export default function PageBanner({ title, current, bannerClass = 'banner-inner-about' }) {
  return (
    <div className="section-wrapper pb-0">
      <div className={`section-banner-inner ${bannerClass}`}>
        <div className="hero-container">
          <div className="d-flex flex-column gspace-2 text-center justify-content-center">
            <h1 className="secondary-accent">{title}</h1>
            <nav className="breadcrumb justify-content-center d-flex align-items-center gap-2">
              <Link to="/" className="breadcrumb-item text-white hover:text-[#C6EF2E] transition-colors">
                Home
              </Link>
              <span className="breadcrumb-icon text-white/60">/</span>
              <span className="breadcrumb-item recent text-[#C6EF2E] font-semibold">
                {current || title}
              </span>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
