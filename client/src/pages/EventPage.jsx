import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';

const events = [
  {
    title: 'Adelux Open 2025',
    date: 'July 15-17, 2025',
    category: "Men's & Women's Singles",
    prize: '$10,000 Prize Pool',
    tags: ['Open For All', 'Competitive', 'Prize Money'],
    image: '/assets/images/happy-paddle-tennis-player-on-an-outdoor-court-loo-MX89ERL.jpg',
    desc: 'The season premier tournament featuring top ranked regional players and international contenders.',
  },
  {
    title: 'Junior Padel Championship',
    date: 'August 02-04, 2025',
    category: 'Under 18 Youth Doubles',
    prize: 'Trophies & Gear Sponsorship',
    tags: ['Youth', 'Competitive', 'Beginner Friendly'],
    image: '/assets/images/sportsman-resting-from-playing-padel-AWX94Q7.jpg',
    desc: 'Empowering young padel prodigies with certified refereeing, parent viewing lounge, and scout presence.',
  },
  {
    title: 'Community Padel Night',
    date: 'Every Friday Night (8 PM)',
    category: 'Social Mixers & Round-Robin',
    prize: 'Club Badges & Lounge Refreshments',
    tags: ['Social', 'All Levels', 'Weekly'],
    image: '/assets/images/multiracial-group-of-athletes-going-for-an-outdoor-ZAZBUZY-1024x683.jpg',
    desc: 'Our weekly social event where players meet new partners, rotate matches, and enjoy food and music.',
  },
  {
    title: 'Weekend Doubles Clash',
    date: 'September 20-22, 2025',
    category: 'Co-Ed & Mixed Doubles',
    prize: '$3,500 Cash + Racket Sets',
    tags: ['Doubles', 'Weekend', 'Competitive'],
    image: '/assets/images/young-athletic-woman-playing-padel-doubles-on-outd-SKA9CG9.jpg',
    desc: 'Fast-paced weekend tournament with bracket advancement, instant video replays, and crowd seating.',
  },
];

export default function EventPage() {
  return (
    <main>
      <PageBanner title="Tournaments & Events" current="Events" bannerClass="banner-inner-event" />

      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up">
              <div className="d-flex flex-column gspace-2 text-center max-w-2xl mx-auto">
                <SubHeading title="Upcoming Tournaments" className="justify-content-center" />
                <h2>Join Our Exciting Padel Events</h2>
                <p className="text-gray-600">
                  Whether you want to test your competitive limits or play fun social mixers, Adelux hosts regular tournaments for every skill category.
                </p>
              </div>
            </ScrollReveal>

            <div className="row row-cols-xl-2 row-cols-1 grid-spacer-4">
              {events.map((evt, idx) => (
                <div key={idx} className="col">
                  <ScrollReveal animation="fade-up" delay={idx * 120}>
                    <div className="card overflow-hidden shadow-sm border border-gray-100 rounded-3xl h-100 d-flex flex-column">
                      <div className="position-relative">
                        <img src={evt.image} alt={evt.title} className="w-100 object-cover" style={{ height: '240px' }} />
                        <div className="position-absolute top-4 left-4 d-flex gap-2 flex-wrap">
                          {evt.tags.map((tag, tIdx) => (
                            <span key={tIdx} className="bg-black/80 text-[#C6EF2E] text-xs font-semibold px-3 py-1 rounded-full backdrop-blur-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="p-4 d-flex flex-column justify-content-between flex-grow-1 bg-white">
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-2">{evt.title}</h3>
                          <p className="text-gray-600 mb-4">{evt.desc}</p>
                          <div className="d-flex flex-column gap-2 mb-4 text-sm text-gray-700">
                            <div className="d-flex align-items-center gap-2">
                              <i className="fa-solid fa-calendar text-[#C6EF2E]"></i>
                              <span className="font-semibold">{evt.date}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <i className="fa-solid fa-layer-group text-[#C6EF2E]"></i>
                              <span>{evt.category}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <i className="fa-solid fa-trophy text-[#C6EF2E]"></i>
                              <span className="font-semibold text-black">{evt.prize}</span>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex justify-content-between align-items-center pt-3 border-t border-gray-100">
                          <Link to="/booking" className="btn btn-accent">
                            <span className="btn-title">Register Now</span>
                            <span className="icon-circle">
                              <i className="fa-solid fa-arrow-right"></i>
                            </span>
                          </Link>
                        </div>
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
