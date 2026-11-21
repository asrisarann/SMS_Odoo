import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';
import AnimatedCounter from '../components/common/AnimatedCounter';

const partners = [
  '/assets/images/Client-1.png',
  '/assets/images/Client-2.png',
  '/assets/images/Client-3.png',
  '/assets/images/Client-4.png',
  '/assets/images/Client-6.png',
  '/assets/images/Client-7.png',
  '/assets/images/Client-8.png',
];

export default function AboutPage() {
  return (
    <main>
      {/* Banner */}
      <PageBanner title="About Us" current="About Us" bannerClass="banner-inner-about" />

      {/* Welcome Section */}
      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5 overflow-hidden">
            <ScrollReveal animation="fade-up">
              <div className="welcome-about-wrapper">
                <div className="d-flex flex-column gspace-2 text-center text-md-start align-items-center align-items-md-start">
                  <SubHeading title="Welcome to Adelux" />
                  <h2>Where Passion Meets the Court</h2>
                </div>
                <div className="d-flex flex-column justify-content-end h-100">
                  <h4 className="text-center text-md-start font-normal text-gray-700 leading-relaxed">
                    At Adelux Padel Club & Academy, we're more than just a sports facility — we're a thriving community of padel lovers, beginners, and professionals dedicated to the fast-growing sport of padel. Founded with a mission to bring people together through world-class courts, elite training, and community-driven experiences, Adelux is your go-to destination for padel excellence.
                  </h4>
                </div>
              </div>
            </ScrollReveal>

            {/* 4 Mission Cards */}
            <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 grid-spacer-2 align-items-end">
              <div className="col">
                <ScrollReveal animation="fade-up" delay={50}>
                  <div className="card card-about-misson card-about-mission--courth">
                    <div className="image-container">
                      <img src="/assets/images/portrait-of-attractive-woman-padel-tennis-player-i-NJU5BZU.jpg" alt="Courts" className="object-cover rounded-xl" />
                    </div>
                    <div className="card-content">
                      <h4>State of the art Padel Courts</h4>
                      <p>Professional-grade courts available for booking, training, or fun matches.</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={150}>
                  <div className="card card-about-misson card-about-mission--academy">
                    <div className="image-container">
                      <img src="/assets/images/monitor-teaching-padel-class-RQUY73T.jpg" alt="Academy" className="object-cover rounded-xl" />
                    </div>
                    <div className="card-content">
                      <h4>Top tier Academy Programs</h4>
                      <p>Classes and coaching sessions for all levels, from kids to adults.</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={250}>
                  <div className="card card-about-misson card-about-mission--tournament">
                    <div className="image-container">
                      <img src="/assets/images/black-athletic-woman-playing-padel-doubles-on-outd-8U5QAM8.jpg" alt="Tournament" className="object-cover rounded-xl" />
                    </div>
                    <div className="card-content">
                      <h4>Community & Tournaments</h4>
                      <p>Regular events, leagues, and meetups to keep the competitive spirit alive.</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={350}>
                  <div className="card card-about-misson card-about-mission--membership">
                    <div className="image-container">
                      <img src="/assets/images/multiracial-group-of-happy-friends-leaving-the-cou-CNDKVTB.jpg" alt="Membership" className="object-cover rounded-xl" />
                    </div>
                    <div className="card-content">
                      <h4 className="secondary-accent">
                        Club
                        <br />
                        Membership
                      </h4>
                      <p className="secondary-accent">Exclusive access, premium perks, and a place to belong.</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>

            {/* Partners Logo Showcase */}
            <ScrollReveal animation="zoom-in" delay={150}>
              <div className="partnership-container py-4 mt-5">
                <h5 className="text-center text-gray-500 uppercase tracking-widest mb-4">Official Partners & Sponsors</h5>
                <div className="d-flex flex-wrap justify-content-center align-items-center gap-5">
                  {partners.map((partner, index) => (
                    <img
                      key={index}
                      src={partner}
                      alt={`Partner ${index + 1}`}
                      className="partner-img opacity-60 hover:opacity-100 transition-opacity"
                      style={{ maxHeight: '45px', objectFit: 'contain' }}
                    />
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* Numbers / Stats Section */}
      <div className="section-wrapper py-0">
        <div className="section section-academy text-white">
          <div className="hero-container">
            <ScrollReveal animation="fade-up">
              <div className="row row-cols-xl-3 row-cols-1 grid-spacer-4 text-center">
                <div className="col">
                  <AnimatedCounter target={2022} className="text-[#C6EF2E] font-bold text-6xl d-block" />
                  <h4 className="secondary-accent mt-2">Established With Passion</h4>
                  <p className="text-white/70">From our inaugural indoor court to an internationally certified sports center.</p>
                </div>
                <div className="col">
                  <AnimatedCounter target={100} suffix="+" className="text-[#C6EF2E] font-bold text-6xl d-block" />
                  <h4 className="secondary-accent mt-2">Matches & Tournaments</h4>
                  <p className="text-white/70">Hosting regional tournaments, weekend showdowns, and friendly club leagues.</p>
                </div>
                <div className="col">
                  <AnimatedCounter target={2500} suffix="+" className="text-[#C6EF2E] font-bold text-6xl d-block" />
                  <h4 className="secondary-accent mt-2">Active Members</h4>
                  <p className="text-white/70">A vibrant network of passionate padel players playing and growing together.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="section">
        <div className="hero-container text-center">
          <ScrollReveal animation="fade-up">
            <SubHeading title="Join The Revolution" />
            <h2 className="mt-3">Ready to Play at Adelux?</h2>
            <p className="max-w-xl mx-auto text-lg text-gray-600 mt-2">
              Experience our world-class padel courts, meet fellow players, and enjoy our state-of-the-art facilities today.
            </p>
            <div className="mt-4 d-flex justify-content-center gap-3">
              <Link to="/booking" className="btn btn-accent">
                <span className="btn-title">Book a Court</span>
                <span className="icon-circle">
                  <i className="fa-solid fa-arrow-right"></i>
                </span>
              </Link>
              <Link to="/contact" className="btn btn-accent bg-accent-color-6">
                <span className="btn-title">Contact Us</span>
                <span className="icon-circle">
                  <i className="fa-solid fa-arrow-right"></i>
                </span>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </main>
  );
}
