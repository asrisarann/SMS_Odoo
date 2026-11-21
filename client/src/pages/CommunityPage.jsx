import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';

const communityFeatures = [
  {
    icon: '/assets/images/Icon-11.png',
    title: 'Weekly Weekend Meetups',
    desc: 'Casual matches, rotating doubles partners, and open court play every Saturday & Sunday morning.',
  },
  {
    icon: '/assets/images/Icon-9.png',
    title: 'Skill-Level Group Channels',
    desc: 'Matchmaking WhatsApp & mobile chat groups divided by rating (Beginner, Intermediate, Pro).',
  },
  {
    icon: '/assets/images/Icon-10.png',
    title: 'Member-Exclusive Social Nights',
    desc: 'BBQ evenings, exhibition matches from top national coaches, and live screenings of premier padel tours.',
  },
];

export default function CommunityPage() {
  return (
    <main>
      <PageBanner title="Adelux Community" current="Community" bannerClass="banner-inner-community" />

      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up">
              <div className="text-center max-w-2xl mx-auto">
                <SubHeading title="Our Community" className="justify-content-center" />
                <h2 className="mt-3">A Club Built on Connection & Sport</h2>
                <p className="text-gray-600 mt-2">
                  At Adelux, matches don't end at game point. Join a warm, diverse community of players who share a true love for the game.
                </p>
              </div>
            </ScrollReveal>

            <div className="row row-cols-xl-3 row-cols-1 grid-spacer-3">
              {communityFeatures.map((feat, idx) => (
                <div key={idx} className="col">
                  <ScrollReveal animation="fade-up" delay={idx * 120}>
                    <div className="card p-5 bg-gray-50 border border-gray-100 rounded-3xl text-center h-100 d-flex flex-column align-items-center">
                      <div className="community-icon mb-4">
                        <img src={feat.icon} alt={feat.title} className="img-fluid" style={{ maxHeight: '64px' }} />
                      </div>
                      <h3 className="text-2xl font-bold mb-2 text-gray-900">{feat.title}</h3>
                      <p className="text-gray-600">{feat.desc}</p>
                    </div>
                  </ScrollReveal>
                </div>
              ))}
            </div>

            {/* Community Spotlight */}
            <ScrollReveal animation="zoom-in" delay={100}>
              <div className="card card-contact-cta mt-5">
                <div className="contact-cta-content">
                  <h2 className="primary-accent">Ready to Join the Family?</h2>
                  <p className="primary-accent">
                    Whether you're looking for weekly playing partners, friendly competition, or simply a fun way to stay active, Adelux welcomes you.
                  </p>
                  <div>
                    <Link to="/contact" className="btn btn-accent bg-accent-color-6">
                      <span className="btn-title">Connect with Our Community</span>
                      <span className="icon-circle">
                        <i className="fa-solid fa-arrow-right"></i>
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="contact-cta-image">
                  <div className="image-wrapper">
                    <img src="/assets/images/AD9QPHP.jpg" alt="Community members" className="img-fluid rounded-2xl" />
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>
    </main>
  );
}
