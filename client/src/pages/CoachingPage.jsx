import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';

const coachingPrograms = [
  {
    title: 'Beginner Foundations',
    level: 'Entry Level',
    duration: '4 Weeks (2 sessions/wk)',
    desc: 'Master the grip, court positioning, forehand/backhand slice, and wall rebound basics.',
    icon: 'fa-solid fa-seedling',
  },
  {
    title: 'Intermediate Tactics & Bandeja',
    level: 'Club Level',
    duration: '6 Weeks (2 sessions/wk)',
    desc: 'Perfect your overhead bandeja, vibora strokes, offensive net play, and transition transitions.',
    icon: 'fa-solid fa-bolt',
  },
  {
    title: 'Elite Tournament Bootcamp',
    level: 'Advanced / Competitive',
    duration: '8 Weeks Intensive',
    desc: 'High-tempo match simulations, mental agility, pressure shot selection, and physical conditioning.',
    icon: 'fa-solid fa-medal',
  },
  {
    title: 'Kids & Teens Academy',
    level: 'Ages 6-17',
    duration: 'Seasonal Semester',
    desc: 'Fun, structured athletic development instilling sportsmanship, coordination, and padel mastery.',
    icon: 'fa-solid fa-users',
  },
];

export default function CoachingPage() {
  return (
    <main>
      <PageBanner title="Padel Coaching & Academy" current="Coaching" bannerClass="banner-inner-coaching" />

      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up">
              <div className="text-center max-w-2xl mx-auto">
                <SubHeading title="Certified Training" className="justify-content-center" />
                <h2 className="mt-3">Elevate Every Aspect of Your Game</h2>
                <p className="text-gray-600 mt-2">
                  Our internationally certified coaching staff brings professional tournament experience and tailored biomechanics to every session.
                </p>
              </div>
            </ScrollReveal>

            <div className="row row-cols-xl-2 row-cols-1 grid-spacer-3">
              {coachingPrograms.map((prog, idx) => (
                <div key={idx} className="col">
                  <ScrollReveal animation="fade-up" delay={idx * 120}>
                    <div className="card p-5 bg-gray-50 border border-gray-200 rounded-3xl h-100 d-flex flex-column justify-content-between hover:border-[#C6EF2E] transition-all">
                      <div>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <span className="bg-[#C6EF2E] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                            {prog.level}
                          </span>
                          <span className="text-gray-500 text-sm font-semibold">{prog.duration}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{prog.title}</h3>
                        <p className="text-gray-600 leading-relaxed">{prog.desc}</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-200 d-flex justify-content-between align-items-center">
                        <span className="font-semibold text-black">Starting from $40/session</span>
                        <Link to="/booking" className="btn btn-accent">
                          <span className="btn-title">Enroll Now</span>
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                    </div>
                  </ScrollReveal>
                </div>
              ))}
            </div>

            {/* Video Feature */}
            <div className="section-wrapper py-0 mt-5">
              <ScrollReveal animation="fade-up">
                <div className="section section-academy text-white rounded-3xl p-5">
                  <div className="row row-cols-xl-2 row-cols-1 align-items-center grid-spacer-4">
                    <div className="col">
                      <SubHeading title="Academy Video" />
                      <h2 className="secondary-accent mt-3">Watch Our Coaching In Action</h2>
                      <p className="text-white/70 mt-2">
                        See how our coaches analyze player stroke mechanics, wall rebounds, and game strategy using video technology.
                      </p>
                      <div className="mt-4">
                        <Link to="/contact" className="btn btn-accent bg-accent-color-6">
                          <span className="btn-title">Schedule Evaluation</span>
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                    </div>
                    <div className="col">
                      <div className="rounded-2xl overflow-hidden shadow-2xl">
                        <iframe
                          src="https://www.youtube.com/embed/sh5uMmHmvos?autoplay=0&controls=1"
                          title="Coaching overview"
                          className="w-100"
                          style={{ height: '300px' }}
                          allowFullScreen
                        ></iframe>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
