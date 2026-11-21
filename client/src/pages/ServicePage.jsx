import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';

const services = [
  {
    icon: '/assets/images/Icon-5.png',
    image: '/assets/images/happy-sportswomen-giving-high-five-after-playing-p-D8ZSZV5.jpg',
    title: 'Padel Court Rental',
    desc: 'Hourly court booking on professional-grade indoor and outdoor courts equipped with LED lighting.',
    link: '/booking',
  },
  {
    icon: '/assets/images/Icon-6.png',
    image: '/assets/images/young-athletic-woman-playing-padel-doubles-on-outd-SKA9CG9.jpg',
    title: 'Padel Academy & Coaching',
    desc: 'Certified coaches offering group training, 1-on-1 private lessons, and youth development clinics.',
    link: '/coaching',
  },
  {
    icon: '/assets/images/Icon-7.png',
    image: '/assets/images/young-athletic-woman-hitting-the-ball-while-playin-J9XJQ27.jpg',
    title: 'Padel Tournaments',
    desc: 'Competitive matches, seasonal cup series, and community round-robin showdowns with prize pools.',
    link: '/event',
  },
  {
    icon: '/assets/images/Icon-8.png',
    image: '/assets/images/paddle-tennis-player-making-an-effort-to-while-hit-QPJDK5U.jpg',
    title: 'Padel Club Membership',
    desc: 'Exclusive member privileges including priority booking, lounge access, and shop discounts.',
    link: '/membership',
  },
  {
    icon: '/assets/images/Icon-1.png',
    image: '/assets/images/paddle-tennis-racket-and-ball-3SXRR2Z.jpg',
    title: 'Equipment Rental & Pro Shop',
    desc: 'Premium rackets, certified balls, and grip accessories available on-site for all skill levels.',
    link: '/booking',
  },
  {
    icon: '/assets/images/Icon-4.png',
    image: '/assets/images/sportsman-resting-from-playing-padel-AWX94Q7.jpg',
    title: 'Club Lounge & Social Events',
    desc: 'Modern air-conditioned lounge, refreshment bar, and weekend social mixers for networking.',
    link: '/community',
  },
];

export default function ServicePage() {
  return (
    <main>
      <PageBanner title="Our Services" current="Services" bannerClass="banner-inner-service" />

      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up">
              <div className="text-center max-w-2xl mx-auto">
                <SubHeading title="What We Offer" className="justify-content-center" />
                <h2 className="mt-3">Comprehensive Padel Experiences</h2>
                <p className="text-gray-600 mt-2">
                  From beginner-friendly court rentals to championship tournaments, Adelux provides everything you need to enjoy and excel at padel.
                </p>
              </div>
            </ScrollReveal>

            <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1 grid-spacer-3 w-100">
              {services.map((item, idx) => (
                <div key={idx} className="col">
                  <ScrollReveal animation="fade-up" delay={idx * 100}>
                    <div className="card card-service h-100">
                      <div className="image-container position-relative">
                        <div className="service-icon-container">
                          <div className="service-icon">
                            <img src={item.icon} alt={item.title} className="img-fluid" />
                          </div>
                        </div>
                        <img src={item.image} alt={item.title} className="service-img w-100 object-cover" style={{ height: '260px' }} />
                        <div className="service-detail-container">
                          <div className="service-detail">
                            <h4 className="secondary-accent">{item.title}</h4>
                            <div>
                              <Link to={item.link} className="service-btn" aria-label={`View ${item.title}`}>
                                <span className="icon-circle">
                                  <i className="fa-solid fa-arrow-right"></i>
                                </span>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 flex-grow-1 d-flex flex-column justify-content-between rounded-b-2xl">
                        <p className="text-gray-600 mb-4">{item.desc}</p>
                        <Link to={item.link} className="font-semibold text-black hover:text-[#C6EF2E] transition-colors d-flex align-items-center gap-2">
                          <span>Get Started</span>
                          <i className="fa-solid fa-arrow-right text-xs"></i>
                        </Link>
                      </div>
                    </div>
                  </ScrollReveal>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
