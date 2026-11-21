import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';
import AnimatedCounter from '../components/common/AnimatedCounter';

const bannerSlides = [
  '/assets/images/banner-1.jpg',
  '/assets/images/banner-2.jpg',
  '/assets/images/banner-3.jpg',
  '/assets/images/banner-4.jpg',
  '/assets/images/banner-5.jpg',
];

const testimonials = [
  {
    quote:
      '"This is by far the best padel club I\'ve ever joined. Great atmosphere, well-maintained courts, and a real sense of community. Highly recommended!"',
    name: 'James Miller',
    designation: 'Fitness Enthusiast',
    avatar: '/assets/images/young-bearded-man-portrait-outdoors-in-the-mountai-6Z46ZMB.jpg',
  },
  {
    quote:
      '"From the first visit, I felt welcomed. Booking a court is easy, and the coaching programs are top-notch. It\'s a great place to improve."',
    name: 'Elena Gomez',
    designation: 'Business Consultant',
    avatar: '/assets/images/attractive-happy-woman-in-red-dress-smiling-outdoo-UW49SNL.jpg',
  },
  {
    quote:
      '"From the first visit, I felt welcomed. Booking a court is easy, and the coaching programs are top-notch. It\'s a great place to improve."',
    name: 'Daniel Carter',
    designation: 'University Student',
    avatar: '/assets/images/the-smile-that-city-living-gave-portrait-of-a-conf-JTBTDGD.jpg',
  },
  {
    quote:
      '"A fantastic place to train, play, and socialize. The academy helped boost my skills, and the community is both diverse and inspiring."',
    name: 'Sophia Bennet',
    designation: 'Marketing Executive',
    avatar: '/assets/images/young-asian-teenager-woman-vlog-at-home-female-usi-XHTT2JT.jpg',
  },
  {
    quote:
      '"What I love most is the flexibility and the quality of the courts. Whether you\'re a beginner or a pro, there\'s something here for everyone."',
    name: 'Mark Tunner',
    designation: 'Software Developer',
    avatar: '/assets/images/close-up-of-young-man-smiling-outdoors-DELEX88.jpg',
  },
  {
    quote:
      '"This club takes padel seriously—and makes it fun too! I\'ve attended several tournaments and always walk away with great experiences."',
    name: 'Isabella Collins',
    designation: 'Creative Director',
    avatar: '/assets/images/black-carefree-woman-laughing-QY76GB7.jpg',
  },
];

const bookingGallery = [
  '/assets/images/happy-athletic-women-having-fun-while-celebrating-E2UZM9M.jpg',
  '/assets/images/happy-paddle-tennis-player-on-an-outdoor-court-loo-MX89ERL.jpg',
  '/assets/images/monitor-teaching-padel-class-QAEF7TM.jpg',
  '/assets/images/young-athletic-woman-playing-paddle-tennis-on-outd-WUP7D6S.jpg',
  '/assets/images/young-paddle-tennis-players-communicating-during-a-VTVTVU6.jpg',
];

export default function HomePage({ onOpenVideo }) {
  // Hero banner background slider state
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerSlides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  // Testimonials slider state
  const [testimonialIdx, setTestimonialIdx] = useState(0);
  const nextTestimonial = () => setTestimonialIdx((prev) => (prev + 1) % testimonials.length);
  const prevTestimonial = () => setTestimonialIdx((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  // Booking gallery slider state
  const [galleryIdx, setGalleryIdx] = useState(0);
  const nextGallery = () => setGalleryIdx((prev) => (prev + 1) % bookingGallery.length);
  const prevGallery = () => setGalleryIdx((prev) => (prev - 1 + bookingGallery.length) % bookingGallery.length);

  return (
    <main>
      {/* 1. Banner Home Section */}
      <div className="section-wrapper pb-0">
        <div className="banner-home-container" id="banner-slideshow">
          {/* Background Slideshow */}
          <div className="slideshow-container">
            {bannerSlides.map((img, idx) => (
              <div
                key={idx}
                className={`slide ${idx === currentSlide ? 'active' : 'preparing'}`}
                style={{
                  backgroundImage: `url(${img})`,
                  opacity: idx === currentSlide ? 1 : 0,
                  transform: idx === currentSlide ? 'scale(1)' : 'scale(1.08)',
                  transition: 'opacity 1.5s ease-in-out, transform 2.5s ease-out',
                }}
              />
            ))}
          </div>

          <div className="hero-container">
            <div className="banner-content-container">
              {/* Top Banner Row */}
              <div className="banner-home-top">
                <ScrollReveal animation="fade-right" duration={800} className="banner-home-title">
                  <SubHeading title="Padel Club & Community" isBanner={true} />
                  <h1 className="secondary-accent">Join the Future of Padel</h1>
                </ScrollReveal>

                <div className="banner-home-network">
                  {/* Social links */}
                  <div className="banner-home-social">
                    <div className="social-container">
                      <i className="fa-brands fa-facebook"></i>
                      <a href="https://facebook.com" target="_blank" rel="noreferrer" className="social-link-banner">
                        Facebook
                      </a>
                    </div>
                    <div className="social-container">
                      <i className="fa-brands fa-instagram"></i>
                      <a href="https://instagram.com" target="_blank" rel="noreferrer" className="social-link-banner">
                        Instagram
                      </a>
                    </div>
                    <div className="social-container">
                      <i className="fa-brands fa-x-twitter"></i>
                      <a href="https://twitter.com" target="_blank" rel="noreferrer" className="social-link-banner">
                        X Twitter
                      </a>
                    </div>
                    <div className="social-container">
                      <i className="fa-brands fa-tiktok"></i>
                      <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="social-link-banner">
                        Tiktok
                      </a>
                    </div>
                  </div>

                  {/* Floating Reviewer Card */}
                  <div className="card card-banner-reviewer">
                    <h4 className="secondary-accent">Unlock Your Full Potential</h4>
                    <div className="banner-reviewer-container d-flex flex-row">
                      <img src="/assets/images/portrait-of-attractive-young-arab-man-smiling-and-A5D3UFF.jpg" alt="Reviewer" className="banner-avatar" />
                      <img src="/assets/images/black-carefree-woman-laughing-QY76GB7.jpg" alt="Reviewer" className="banner-avatar" />
                      <img src="/assets/images/the-smile-that-city-living-gave-portrait-of-a-conf-JTBTDGD.jpg" alt="Reviewer" className="banner-avatar" />
                      <img src="/assets/images/young-asian-teenager-woman-vlog-at-home-female-usi-XHTT2JT.jpg" alt="Reviewer" className="banner-avatar" />
                    </div>
                    <span className="reviewer-card-description">
                      With expert Padel tips, gear recommendations, and pro level training.
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Banner Row */}
              <div className="banner-home-bottom">
                <ScrollReveal animation="fade-left" delay={200} className="banner-home-community-container">
                  <div className="card banner-home-community">
                    <div className="home-community-img">
                      <img
                        src="/assets/images/close-up-of-paddle-tennis-racket-and-ball-with-wom-2P8BD2Y.jpg"
                        alt="Banner Home Community"
                      />
                    </div>
                    <div className="home-community-content">
                      <div className="d-flex flex-row align-items-center gspace-1">
                        <h3 className="home-community-highlight">25+</h3>
                        <div className="banner-reviewer-container d-flex flex-row">
                          <img src="/assets/images/young-bearded-man-portrait-outdoors-in-the-mountai-6Z46ZMB.jpg" alt="Reviewer" className="banner-avatar" />
                          <img src="/assets/images/attractive-happy-woman-in-red-dress-smiling-outdoo-UW49SNL.jpg" alt="Reviewer" className="banner-avatar" />
                          <img src="/assets/images/close-up-of-young-man-smiling-outdoors-DELEX88.jpg" alt="Reviewer" className="banner-avatar" />
                          <img src="/assets/images/Gp-1.png" alt="Plus" className="banner-avatar banner-avatar-plus" />
                        </div>
                      </div>
                      <div className="d-flex flex-column">
                        <h5 className="secondary-accent mb-0">Padel Enthusiasts. One Club</h5>
                        <p className="secondary-accent mb-0">
                          Enjoy World-Class Facilities and a Thriving Community.
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal animation="fade-right" delay={300} className="banner-home-cta-container">
                  <div className="banner-home-cta">
                    <h3 className="secondary-accent">Active Members and Unlock Premium Padel Facilities</h3>
                    <p className="secondary-accent">
                      Experience professional training, top-notch facilities, and a vibrant community at Adelux your premier padel destination.
                    </p>
                    <div className="d-flex flex-row align-items-center gspace-2 gspace-xl-4">
                      <div>
                        <Link to="/booking" className="btn btn-accent">
                          <span className="btn-title">Book a Court</span>
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                      <button
                        type="button"
                        className="request-loader cursor-pointer border-0"
                        onClick={() => onOpenVideo('https://www.youtube.com/embed/VhBl3dHT5SY')}
                        aria-label="Play promotional video"
                      >
                        <i className="fa-solid fa-play"></i>
                      </button>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. About Section */}
      <div className="section">
        <div className="hero-container">
          <div className="about-wrapper">
            <div className="about-image-container">
              <ScrollReveal animation="fade-left">
                <div className="image-container about-img position-relative">
                  <img
                    src="/assets/images/multiracial-group-of-athletes-playing-paddle-tenni-SNHZS26.jpg"
                    alt="About Us"
                  />
                  <div className="card card-about-detail">
                    <h4>Adelux is a premier padel destination where passion, performance, and people come together.</h4>
                    <Link to="/about" className="link-wrapper d-flex align-items-center gap-2">
                      <span>Learn More</span>
                      <i className="fa-solid fa-chevron-circle-right"></i>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            <div className="about-content-description">
              <ScrollReveal animation="fade-right">
                <div className="d-flex flex-column gspace-2">
                  <SubHeading title="About Us" />
                  <h2>More Than Just a Padel Club, It's a Community.</h2>
                </div>
              </ScrollReveal>

              <div className="d-flex flex-column gspace-2 mt-4">
                <ScrollReveal animation="fade-up" delay={150}>
                  <div className="about-description-container">
                    <div>
                      <p>
                        At Adelux, we go beyond the game. Established with a vision to grow the padel sport, we offer world-class padel courts, certified coaches, and a welcoming community that supports every player's journey.
                      </p>
                      <p>
                        From personal training programs to tournaments and social events, Adelux is built for those who want to improve their skills, stay active, and be part of something bigger. Whether you're joining for fun, fitness, or professional growth — Adelux has something for everyone.
                      </p>
                    </div>

                    <div className="d-flex flex-column justify-content-center mt-4">
                      <div className="row row-cols-md-3 row-cols-1 grid-spacer-4">
                        <div className="col">
                          <div className="about-highlight-box">
                            <AnimatedCounter target={2022} className="about-highlight-text font-bold" />
                            <h5>Padel Found In</h5>
                          </div>
                        </div>
                        <div className="col">
                          <div className="about-highlight-box">
                            <AnimatedCounter target={100} suffix="+" className="about-highlight-text font-bold" />
                            <h5>Matches Host</h5>
                          </div>
                        </div>
                        <div className="col">
                          <div className="about-highlight-box">
                            <AnimatedCounter target={25} suffix="+" className="about-highlight-text font-bold" />
                            <h5>Active Members</h5>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Why Choose Us Section */}
      <div className="section-wrapper py-0">
        <div className="section section-chooseus">
          <div className="hero-container">
            <div className="d-flex flex-column flex-xl-row align-items-center gspace-100">
              <ScrollReveal animation="fade-left" className="chooseus-title-container">
                <div className="d-flex flex-column gspace-2">
                  <SubHeading title="Why Choose Us" />
                  <h2>Why Padel Players Choose Adelux.</h2>
                  <p className="mb-0">
                    Discover what makes Adelux the top destination for padel enthusiasts of all levels.
                  </p>
                </div>
                <div className="image-container whychoose-img mt-4">
                  <img
                    src="/assets/images/multiracial-group-of-athletes-going-for-an-outdoor-ZAZBUZY-1024x683.jpg"
                    alt="Why Choose Us"
                    className="chooseus-img"
                  />
                  <div className="whychooseus-avatar-container">
                    <div className="d-flex flex-row align-items-center">
                      <img src="/assets/images/young-bearded-man-portrait-outdoors-in-the-mountai-6Z46ZMB.jpg" alt="Reviewer" className="banner-avatar" />
                      <img src="/assets/images/attractive-happy-woman-in-red-dress-smiling-outdoo-UW49SNL.jpg" alt="Reviewer" className="banner-avatar" />
                      <img src="/assets/images/close-up-of-young-man-smiling-outdoors-DELEX88.jpg" alt="Reviewer" className="banner-avatar" />
                    </div>
                    <div className="d-flex flex-column">
                      <div className="d-flex flex-row align-items-center gspace-1">
                        <h5 className="accent-color-2">25+</h5>
                        <h6 className="secondary-accent">Membership</h6>
                      </div>
                      <span className="chooseus-img-description">Enjoy our Facility</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* 4 Feature Cards */}
              <div className="chooseus-card-container">
                <div className="row row-cols-md-2 row-cols-1 grid-spacer-2">
                  <div className="col">
                    <ScrollReveal animation="fade-right" delay={50}>
                      <div className="card card-chooseus">
                        <div className="chooseus-icon">
                          <img src="/assets/images/Icon-1.png" alt="Professional-Grade Padel Courts" className="img-fluid" />
                        </div>
                        <h4>Professional-Grade Padel Courts</h4>
                        <Link to="/service" className="chooseus-btn">
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                    </ScrollReveal>
                  </div>
                  <div className="col">
                    <ScrollReveal animation="fade-right" delay={150}>
                      <div className="card card-chooseus bg-accent-color">
                        <div className="chooseus-icon">
                          <img src="/assets/images/Icon-2.png" alt="Certified Coaches & Training" className="img-fluid" />
                        </div>
                        <h4 className="secondary-accent">Certified Coaches & Training</h4>
                        <Link to="/coaching" className="chooseus-btn">
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                    </ScrollReveal>
                  </div>
                  <div className="col">
                    <ScrollReveal animation="fade-right" delay={250}>
                      <div className="card card-chooseus">
                        <div className="chooseus-icon">
                          <img src="/assets/images/Icon-3.png" alt="Tournaments & Competitive Events" className="img-fluid" />
                        </div>
                        <h4>Tournaments & Competitive Events</h4>
                        <Link to="/event" className="chooseus-btn">
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                    </ScrollReveal>
                  </div>
                  <div className="col">
                    <ScrollReveal animation="fade-right" delay={350}>
                      <div className="card card-chooseus">
                        <div className="chooseus-icon">
                          <img src="/assets/images/Icon-4.png" alt="Modern Club Facilities" className="img-fluid" />
                        </div>
                        <h4>Modern Club Facilities</h4>
                        <Link to="/community" className="chooseus-btn">
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                    </ScrollReveal>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Service Section */}
      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up" className="service-title-container">
              <div className="row row-cols-md-2 row-cols-1 grid-spacer-2 align-items-center">
                <div className="col">
                  <div className="d-flex flex-column gspace-2 text-md-start text-center">
                    <SubHeading title="Our Service" />
                    <h2>Explore Our Padel Services</h2>
                  </div>
                </div>
                <div className="col">
                  <div className="d-flex flex-column h-100 align-items-center align-items-md-end justify-content-center">
                    <Link to="/service" className="btn btn-accent">
                      <span className="btn-title">View All Service</span>
                      <span className="icon-circle">
                        <i className="fa-solid fa-arrow-right"></i>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <div className="row row-cols-xl-4 row-cols-md-2 row-cols-1 grid-spacer-2 w-100">
              <div className="col">
                <ScrollReveal animation="fade-up" delay={50}>
                  <div className="card card-service">
                    <div className="image-container">
                      <div className="service-icon-container">
                        <div className="service-icon">
                          <img src="/assets/images/Icon-5.png" alt="Court Rental" className="img-fluid" />
                        </div>
                      </div>
                      <img src="/assets/images/happy-sportswomen-giving-high-five-after-playing-p-D8ZSZV5.jpg" alt="Service" className="service-img" />
                      <div className="service-detail-container">
                        <div className="service-detail">
                          <h4 className="secondary-accent">Padel Court Rental</h4>
                          <div>
                            <Link to="/booking" className="service-btn">
                              <span className="icon-circle">
                                <i className="fa-solid fa-arrow-right"></i>
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={150}>
                  <div className="card card-service">
                    <div className="image-container">
                      <div className="service-icon-container">
                        <div className="service-icon">
                          <img src="/assets/images/Icon-6.png" alt="Academy & Coaching" className="img-fluid" />
                        </div>
                      </div>
                      <img src="/assets/images/young-athletic-woman-playing-padel-doubles-on-outd-SKA9CG9.jpg" alt="Service" className="service-img" />
                      <div className="service-detail-container">
                        <div className="service-detail">
                          <h4 className="secondary-accent">Padel Academy & Coaching</h4>
                          <div>
                            <Link to="/coaching" className="service-btn">
                              <span className="icon-circle">
                                <i className="fa-solid fa-arrow-right"></i>
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={250}>
                  <div className="card card-service">
                    <div className="image-container">
                      <div className="service-icon-container">
                        <div className="service-icon">
                          <img src="/assets/images/Icon-7.png" alt="Tournaments" className="img-fluid" />
                        </div>
                      </div>
                      <img src="/assets/images/young-athletic-woman-hitting-the-ball-while-playin-J9XJQ27.jpg" alt="Service" className="service-img" />
                      <div className="service-detail-container">
                        <div className="service-detail">
                          <h4 className="secondary-accent">Padel Tournaments</h4>
                          <div>
                            <Link to="/event" className="service-btn">
                              <span className="icon-circle">
                                <i className="fa-solid fa-arrow-right"></i>
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={350}>
                  <div className="card card-service">
                    <div className="image-container">
                      <div className="service-icon-container">
                        <div className="service-icon">
                          <img src="/assets/images/Icon-8.png" alt="Membership" className="img-fluid" />
                        </div>
                      </div>
                      <img src="/assets/images/paddle-tennis-player-making-an-effort-to-while-hit-QPJDK5U.jpg" alt="Service" className="service-img" />
                      <div className="service-detail-container">
                        <div className="service-detail">
                          <h4 className="secondary-accent">Padel Club Membership</h4>
                          <div>
                            <Link to="/membership" className="service-btn">
                              <span className="icon-circle">
                                <i className="fa-solid fa-arrow-right"></i>
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Padel Booking Highlight Section */}
      <div className="section pt-0">
        <div className="hero-container">
          <div className="booking-content-wrapper">
            <ScrollReveal animation="fade-left" className="booking-highlight-container">
              {/* Tags */}
              <div className="booking-tag-container">
                <span className="booking-tag">Indoor & Outdoor</span>
                <span className="booking-tag">Real-Time Slot</span>
                <span className="booking-tag bg-accent-color secondary-accent">No Membership</span>
                <span className="booking-tag">Flexible Hours</span>
                <span className="booking-tag">Instant Access</span>
                <span className="booking-tag">Easy Booking</span>
                <span className="booking-tag">Night Play</span>
              </div>

              {/* Action photo gallery carousel */}
              <div className="overflow-hidden position-relative rounded-2xl">
                <div className="image-container">
                  <img
                    src={bookingGallery[galleryIdx]}
                    alt="Padel Court Booking"
                    className="img-fluid w-100 object-cover"
                    style={{ height: '420px', borderRadius: '20px', transition: 'all 0.5s ease' }}
                  />
                </div>
                {/* Carousel Controls */}
                <div className="position-absolute bottom-4 right-4 d-flex gap-2 z-10">
                  <button
                    onClick={prevGallery}
                    className="btn btn-accent p-2 w-10 h-10 d-flex align-items-center justify-content-center cursor-pointer border-0"
                    aria-label="Previous image"
                  >
                    <i className="fa-solid fa-arrow-left text-xs"></i>
                  </button>
                  <button
                    onClick={nextGallery}
                    className="btn btn-accent p-2 w-10 h-10 d-flex align-items-center justify-content-center cursor-pointer border-0"
                    aria-label="Next image"
                  >
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </button>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-right" className="booking-content-container">
              <div className="d-flex flex-column justify-content-center justify-content-md-start text-center text-md-start gspace-2">
                <SubHeading title="Booking Court" />
                <h2>Book Your Padel Court Instantly.</h2>
              </div>
              <div className="d-flex flex-column flex-md-row align-items-center gspace-5 mt-4">
                <div className="card card-booking-cta">
                  <div className="booking-cta-icon mb-3">
                    <i className="fa-solid fa-address-book text-3xl text-[#C6EF2E]"></i>
                  </div>
                  <h4 className="secondary-accent">Ready to Play? Reserve Your Padel Court Today</h4>
                  <div className="mt-3">
                    <Link to="/booking" className="btn btn-accent">
                      <span className="btn-title">Book a Court</span>
                      <span className="icon-circle">
                        <i className="fa-solid fa-arrow-right"></i>
                      </span>
                    </Link>
                  </div>
                </div>

                <div className="booking-benefit-container">
                  <h3 className="text-center text-md-start">The Benefits</h3>
                  <div className="underline-accent-5"></div>
                  <ul className="check-list mt-3">
                    <li>Hourly court rental with real-time availability</li>
                    <li>Indoor & outdoor courts with pro-level surface</li>
                    <li>Lights for night play included</li>
                    <li>No membership required for booking</li>
                    <li>Mobile-friendly reservation system</li>
                  </ul>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* 6. Academy Section */}
      <div className="section-wrapper py-0">
        <div className="section section-academy">
          <div className="hero-container">
            <div className="d-flex flex-column gspace-5">
              <ScrollReveal animation="fade-up" className="academy-title-container">
                <div className="academy-heading-container">
                  <SubHeading title="School & Academy" />
                  <h2 className="secondary-accent">Build Your Skills with Our Padel Academy</h2>
                </div>
                <div className="academy-title-image">
                  <div className="image-container overflow-visible">
                    <img src="/assets/images/K2MEUKX.png" alt="Academy Rackets" className="img-fluid" />
                  </div>
                </div>
                <div className="academy-title-cta">
                  <p className="secondary-accent">
                    From beginners to future pros — our structured training programs are designed for every age and skill level. Join certified coaches and elevate your game.
                  </p>
                  <div>
                    <Link to="/coaching" className="btn btn-accent">
                      <span className="btn-title">Explore our Programs</span>
                      <span className="icon-circle">
                        <i className="fa-solid fa-arrow-right"></i>
                      </span>
                    </Link>
                  </div>
                </div>
              </ScrollReveal>

              {/* Academy Counters */}
              <div className="academy-counter-container">
                <div className="row row-cols-xl-3 row-cols-1 grid-spacer-2">
                  <div className="col">
                    <ScrollReveal animation="fade-up" delay={50}>
                      <div className="d-flex flex-column gspace-1">
                        <div className="d-flex flex-column flex-md-row gspace-1 gspace-md-2 align-items-center text-center text-md-start">
                          <AnimatedCounter target={150} suffix="+" className="academy-stat font-bold text-5xl text-[#C6EF2E]" />
                          <h5 className="secondary-accent">Students Trained to Competitive Level</h5>
                        </div>
                        <p className="academy-stat-description text-white/70">
                          Our academy has successfully trained over 150 players who now compete in regional and national tournaments.
                        </p>
                      </div>
                    </ScrollReveal>
                  </div>
                  <div className="col">
                    <ScrollReveal animation="fade-up" delay={150}>
                      <div className="d-flex flex-column gspace-1">
                        <div className="d-flex flex-column flex-md-row gspace-1 gspace-md-2 align-items-center text-center text-md-start">
                          <AnimatedCounter target={30} suffix="+" className="academy-stat font-bold text-5xl text-[#C6EF2E]" />
                          <h5 className="secondary-accent">National Certifications & Recognitions</h5>
                        </div>
                        <p className="academy-stat-description text-white/70">
                          Adelux Academy is officially recognized by 3 national-level padel and sports development organizations.
                        </p>
                      </div>
                    </ScrollReveal>
                  </div>
                  <div className="col">
                    <ScrollReveal animation="fade-up" delay={250}>
                      <div className="d-flex flex-column gspace-1">
                        <div className="d-flex flex-column flex-md-row gspace-1 gspace-md-2 align-items-center text-center text-md-start">
                          <AnimatedCounter target={85} suffix="+" className="academy-stat font-bold text-5xl text-[#C6EF2E]" />
                          <h5 className="secondary-accent">Championship Won by Our Coaches</h5>
                        </div>
                        <p className="academy-stat-description text-white/70">
                          Our coaching team has collectively earned prestigious championship titles as a testament to their expertise.
                        </p>
                      </div>
                    </ScrollReveal>
                  </div>
                </div>
              </div>

              {/* Academy Video Section */}
              <ScrollReveal animation="zoom-in" className="academy-video-section">
                <div className="academy-video-container">
                  <div className="academy-video-wrapper">
                    <iframe
                      src="https://www.youtube.com/embed/sh5uMmHmvos?autoplay=0&mute=1&loop=1&playlist=sh5uMmHmvos&controls=1&modestbranding=1&rel=0&showinfo=0"
                      title="Academy Introduction Video"
                      allow="autoplay; encrypted-media"
                      allowFullScreen
                    ></iframe>
                    <div className="video-overlay"></div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Features List */}
              <ScrollReveal animation="fade-up" className="row row-cols-md-2 row-cols-1 grid-spacer-md-100 grid-spacer-2">
                <div className="col">
                  <ul className="circle-check-list">
                    <li>Beginner & Intermediate Classes</li>
                    <li>Kids & Teens Training Program</li>
                    <li>Private Coaching Sessions</li>
                  </ul>
                </div>
                <div className="col">
                  <ul className="circle-check-list">
                    <li>Group Technique Workshops</li>
                    <li>Fitness & Game Strategy</li>
                    <li>Certified Professional Coaches</li>
                  </ul>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Tournament Section */}
      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up" className="heading-section-container">
              <SubHeading title="Upcoming Tournament" />
              <h2>Join Our Exciting Upcoming Padel Events</h2>
            </ScrollReveal>

            <div className="tournament-grid">
              {/* Main Event */}
              <ScrollReveal animation="fade-left" className="tournament-main-envent">
                <div className="card card-tournament main-event">
                  <div className="tournament-tag-container">
                    <span className="tournament-tag">Open For All</span>
                    <span className="tournament-tag">Competitive</span>
                    <span className="tournament-tag">Beginner Friendly</span>
                    <span className="tournament-tag">Monthly Series</span>
                    <span className="tournament-tag">Free Registration</span>
                  </div>
                  <div className="card-tournament-content">
                    <h4>Adelux Open 2025</h4>
                    <p className="secondary-accent">
                      Compete in the largest padel showdown of the season with players across the country.
                    </p>
                    <div className="d-flex flex-row justify-content-between align-items-end gspace-2">
                      <div className="d-flex flex-column gspace-1">
                        <div className="d-flex flex-row align-items-center gspace-1">
                          <i className="fa-solid fa-calendar accent-color-2"></i>
                          <span className="tournament-schedule">July 15-17, 2025</span>
                        </div>
                        <div className="d-flex flex-row align-items-center gspace-1">
                          <i className="fa-solid fa-list accent-color-2"></i>
                          <span className="tournament-schedule">Men's & Women's Singles</span>
                        </div>
                        <div className="d-flex flex-row align-items-center gspace-1">
                          <i className="fa-solid fa-trophy accent-color-2"></i>
                          <span className="tournament-schedule">$10,000 Prize Pool</span>
                        </div>
                      </div>

                      <div>
                        <Link to="/event" className="tournament-btn">
                          <span className="icon-circle">
                            <i className="fa-solid fa-arrow-right"></i>
                          </span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>

              {/* Tournament Side Cards */}
              <ScrollReveal animation="fade-right" className="tournament-event-list">
                <div className="card card-tournament tournament-cta">
                  <div className="tournament-cta-title">
                    <h3 className="secondary-accent">Ready to Serve Your Best Game?</h3>
                    <p className="secondary-accent">
                      Register now or explore all upcoming events. Whether you're a beginner or a seasoned athlete, Adelux welcomes your competitive spirit.
                    </p>
                    <div>
                      <Link to="/booking" className="btn btn-accent">
                        <span className="btn-title">Sign Up Now</span>
                        <span className="icon-circle">
                          <i className="fa-solid fa-arrow-right"></i>
                        </span>
                      </Link>
                    </div>
                  </div>
                  <div className="image-container">
                    <img
                      src="/assets/images/european-man-holding-padel-racquet-in-hand-and-rea-MWHPVEP.jpg"
                      alt="Tournament CTA"
                      className="tournament-cta-image"
                    />
                  </div>
                </div>

                <div className="other-tournament-container">
                  <div className="card card-tournament junior-padel-championship">
                    <div className="tournament-tag-container">
                      <span className="tournament-tag">Open for All</span>
                      <span className="tournament-tag">Competitive</span>
                      <span className="tournament-tag">Beginner Friendly</span>
                    </div>
                    <div className="card-tournament-content">
                      <div className="d-flex flex-row justify-content-between align-items-center gspace-2">
                        <h4>Junior Padel Community</h4>
                        <div>
                          <Link to="/event" className="tournament-btn">
                            <span className="icon-circle">
                              <i className="fa-solid fa-arrow-right"></i>
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="card card-tournament comunity-padel-night">
                    <div className="tournament-tag-container">
                      <span className="tournament-tag">Open for All</span>
                      <span className="tournament-tag">Competitive</span>
                      <span className="tournament-tag">Beginner Friendly</span>
                    </div>
                    <div className="highlight-image">
                      <img src="/assets/images/2AH2LFJ-1.png" alt="Highlight" className="img-fluid" />
                    </div>
                    <div className="card-tournament-content">
                      <div className="d-flex flex-row justify-content-between align-items-center gspace-2">
                        <h4>Community Padel Night</h4>
                        <div>
                          <Link to="/event" className="tournament-btn">
                            <span className="icon-circle">
                              <i className="fa-solid fa-arrow-right"></i>
                            </span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Community Section */}
      <div className="section-wrapper py-0">
        <div className="section section-community">
          <div className="hero-container">
            <div className="community-grid">
              <ScrollReveal animation="fade-left" className="image-container position-relative">
                <div className="community-cta">
                  <h4 className="accent-color">Be Part of Something Bigger Than the Game</h4>
                  <div className="d-flex flex-row align-items-center gspace-1 mt-2">
                    <Link to="/community" className="primary-accent font-semibold">
                      Join The Community
                    </Link>
                    <i className="fa-solid fa-circle-chevron-right"></i>
                  </div>
                </div>
                <img src="/assets/images/AD9QPHP.jpg" alt="Community" className="community-images" />
              </ScrollReveal>

              <ScrollReveal animation="fade-right" className="d-flex flex-column gspace-5">
                <div className="d-flex flex-column gspace-2">
                  <SubHeading title="Adelux Padel Community" />
                  <h2>Grow With a Passionate Padel Community</h2>
                </div>
                <div className="d-flex flex-column gspace-2 w-100">
                  <div className="d-flex flex-column flex-md-row gspace-2 gspace-md-5 align-items-center align-items-md-start text-center text-md-start">
                    <div>
                      <div className="community-icon">
                        <img src="/assets/images/Icon-11.png" alt="Weekly Meetups" className="img-fluid" />
                      </div>
                    </div>
                    <div className="d-flex flex-column">
                      <h4>Weekly Meetups</h4>
                      <p>Casual games and friendly matches every weekend to build lasting bonds on the court.</p>
                    </div>
                  </div>

                  <div className="d-flex flex-column flex-md-row gspace-2 gspace-md-5 align-items-center align-items-md-start text-center text-md-start">
                    <div>
                      <div className="community-icon">
                        <img src="/assets/images/Icon-9.png" alt="Skill-Level Groups" className="img-fluid" />
                      </div>
                    </div>
                    <div className="d-flex flex-column">
                      <h4>Skill-Level Based Groups</h4>
                      <p>Connect with players at your level — beginner, intermediate, or advanced.</p>
                    </div>
                  </div>

                  <div className="d-flex flex-column flex-md-row gspace-2 gspace-md-5 align-items-center align-items-md-start text-center text-md-start">
                    <div>
                      <div className="community-icon">
                        <img src="/assets/images/Icon-10.png" alt="Member Only Events" className="img-fluid" />
                      </div>
                    </div>
                    <div className="d-flex flex-column">
                      <h4>Member Only Events</h4>
                      <p>Exclusive workshops, networking nights, and closed tournaments for members.</p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>

      {/* 9. Testimonial Section */}
      <div className="section testimonial-banner">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up" className="heading-section-container">
              <SubHeading title="Testimonials" />
              <h2>What Our Members Say</h2>
            </ScrollReveal>

            <ScrollReveal animation="zoom-in" className="testimonial-content-container">
              {/* Left Side decorative avatars */}
              <div className="testimonial-side testimonial-side--left">
                <img
                  src="/assets/images/young-bearded-man-portrait-outdoors-in-the-mountai-6Z46ZMB.jpg"
                  alt="Avatar"
                  className="testimonial-avatar testimonial-avatar--lg align-self-end"
                />
                <img
                  src="/assets/images/attractive-happy-woman-in-red-dress-smiling-outdoo-UW49SNL.jpg"
                  alt="Avatar"
                  className="testimonial-avatar testimonial-avatar--sm align-self-center"
                />
                <img
                  src="/assets/images/the-smile-that-city-living-gave-portrait-of-a-conf-JTBTDGD.jpg"
                  alt="Avatar"
                  className="testimonial-avatar testimonial-avatar--md align-self-end"
                />
              </div>

              {/* Main Testimonial Card */}
              <div className="card card-testimonial position-relative">
                <div className="testimonial-btn-container">
                  <button className="testimonial-btn cursor-pointer" onClick={prevTestimonial} aria-label="Previous testimonial">
                    <i className="fa-solid fa-circle-arrow-left"></i>
                  </button>
                  <button className="testimonial-btn cursor-pointer" onClick={nextTestimonial} aria-label="Next testimonial">
                    <i className="fa-solid fa-circle-arrow-right"></i>
                  </button>
                </div>

                <div className="testimonial-slider">
                  <div className="testimonial-slide active text-center">
                    <p className="testimonial-quote">{testimonials[testimonialIdx].quote}</p>
                    <img
                      src={testimonials[testimonialIdx].avatar}
                      alt={testimonials[testimonialIdx].name}
                      className="testimonial-avatar mx-auto mb-3"
                    />
                    <div className="d-flex flex-column align-items-center">
                      <span className="testimonial-name font-bold text-lg">{testimonials[testimonialIdx].name}</span>
                      <span className="testimonial-designation text-sm text-[#5F5F5F]">{testimonials[testimonialIdx].designation}</span>
                    </div>
                  </div>
                </div>

                {/* Dot Navigation */}
                <div className="testimonial-nav-container mt-4 d-flex justify-content-center gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      className={`testimonial-nav-btn cursor-pointer border-0 ${i === testimonialIdx ? 'active' : ''}`}
                      onClick={() => setTestimonialIdx(i)}
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Right Side decorative avatars */}
              <div className="testimonial-side testimonial-side--right">
                <img
                  src="/assets/images/young-asian-teenager-woman-vlog-at-home-female-usi-XHTT2JT.jpg"
                  alt="Avatar"
                  className="testimonial-avatar testimonial-avatar--md align-self-start"
                />
                <img
                  src="/assets/images/close-up-of-young-man-smiling-outdoors-DELEX88.jpg"
                  alt="Avatar"
                  className="testimonial-avatar testimonial-avatar--lg align-self-center"
                />
                <img
                  src="/assets/images/black-carefree-woman-laughing-QY76GB7.jpg"
                  alt="Avatar"
                  className="testimonial-avatar testimonial-avatar--sm align-self-start"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      {/* 10. Membership CTA Section */}
      <div className="section py-0">
        <div className="hero-container">
          <div className="row row-cols-xl-2 row-cols-1 grid-spacer-2">
            <div className="col col-xl-5">
              <ScrollReveal animation="fade-left" className="card card-membership-cta cta-content h-100">
                <h3>Become an Adelux Member Today</h3>
                <ul className="check-list alternative-list mt-3">
                  <li>Priority Court Booking</li>
                  <li>Free Access to Weekly Meetups</li>
                  <li>Member-Only Tournament Slots</li>
                  <li>Discounted Coaching Sessions</li>
                </ul>
                <div className="align-self-center align-self-md-start mt-4">
                  <Link to="/membership" className="btn btn-accent bg-accent-color-6">
                    <span className="btn-title">Sign Up Now</span>
                    <span className="icon-circle">
                      <i className="fa-solid fa-arrow-right"></i>
                    </span>
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            <div className="col col-xl-7">
              <ScrollReveal animation="fade-right" className="card card-membership-cta cta-benefit">
                <p className="membership-cta-description">
                  Unlock exclusive benefits, member-only events, discounted court bookings, and priority access to tournaments. Whether you're a casual player or a future champion.
                </p>
                <div className="position-relative overflow-hidden rounded-2xl">
                  <div className="cta-tag-container">
                    <span className="cta-tag">Player Feedback</span>
                    <span className="cta-tag">Reel Stories</span>
                    <span className="cta-tag">Member Voices</span>
                  </div>
                  <img
                    src="/assets/images/man-playing-padel-9KR4F3U-e1750063137155.jpg"
                    alt="Call to Action"
                    className="cta-benefit-img w-100 object-cover"
                    style={{ height: '280px' }}
                  />
                  <div className="cta-benefit-title">
                    <h4 className="secondary-accent">25+ Active Members | 7-Day Access | All Skill Levels Welcome</h4>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </div>

      {/* 11. Blog Section */}
      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up" className="blog-title-container">
              <div className="row row-cols-md-2 row-cols-1 grid-spacer-2 align-items-center">
                <div className="col">
                  <div className="d-flex flex-column gspace-2 text-md-start text-center">
                    <SubHeading title="Blog & Tips" />
                    <h2>Latest Blog & Padel Tips</h2>
                  </div>
                </div>
                <div className="col">
                  <div className="d-flex flex-column h-100 align-items-center justify-content-center align-items-md-end">
                    <Link to="/blog" className="btn btn-accent">
                      <span className="btn-title">Read More</span>
                      <span className="icon-circle">
                        <i className="fa-solid fa-arrow-right"></i>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1 grid-spacer-2">
              <div className="col">
                <ScrollReveal animation="fade-up" delay={50}>
                  <div className="card card-blog">
                    <Link to="/blog">
                      <div className="image-container blog-image">
                        <img
                          src="/assets/images/tailored-indoor-padel-coaching-for-skill-enhanceme-JV5Z29N.jpg"
                          alt="Blog Post"
                        />
                        <div className="blog-content">
                          <div className="d-flex flex-row align-items-center justify-content-start gspace-2 mb-2">
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-calendar text-[#C6EF2E]"></i>
                              <span>16 Jun 2025</span>
                            </div>
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-folder text-[#C6EF2E]"></i>
                              <span>Padel Lifestyle</span>
                            </div>
                          </div>
                          <h4 className="secondary-accent">Why Joining a Padel Community Matters</h4>
                        </div>
                      </div>
                    </Link>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={150}>
                  <div className="card card-blog">
                    <Link to="/blog">
                      <div className="image-container blog-image">
                        <img
                          src="/assets/images/portrait-of-attractive-woman-padel-tennis-player-i-NJU5BZU.jpg"
                          alt="Blog Post"
                        />
                        <div className="blog-content">
                          <div className="d-flex flex-row align-items-center justify-content-start gspace-2 mb-2">
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-calendar text-[#C6EF2E]"></i>
                              <span>16 Jun 2025</span>
                            </div>
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-folder text-[#C6EF2E]"></i>
                              <span>Events & News</span>
                            </div>
                          </div>
                          <h4 className="secondary-accent">Booking Courts Online: Quick & Easy Guide</h4>
                        </div>
                      </div>
                    </Link>
                  </div>
                </ScrollReveal>
              </div>

              <div className="col">
                <ScrollReveal animation="fade-up" delay={250}>
                  <div className="card card-blog">
                    <Link to="/blog">
                      <div className="image-container blog-image">
                        <img
                          src="/assets/images/paddle-tennis-player-making-an-effort-to-while-hit-QPJDK5U.jpg"
                          alt="Blog Post"
                        />
                        <div className="blog-content">
                          <div className="d-flex flex-row align-items-center justify-content-start gspace-2 mb-2">
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-calendar text-[#C6EF2E]"></i>
                              <span>16 Jun 2025</span>
                            </div>
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-folder text-[#C6EF2E]"></i>
                              <span>Events & News</span>
                            </div>
                          </div>
                          <h4 className="secondary-accent">Recap: Adelux Spring Tournament 2025</h4>
                        </div>
                      </div>
                    </Link>
                  </div>
                </ScrollReveal>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
