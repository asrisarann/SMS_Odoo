import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageBanner from '../components/common/PageBanner';
import SubHeading from '../components/common/SubHeading';
import ScrollReveal from '../components/common/ScrollReveal';

const blogPosts = [
  {
    id: 1,
    title: 'Why Joining a Padel Community Matters for Your Game',
    date: '16 Jun 2025',
    category: 'Padel Lifestyle',
    image: '/assets/images/tailored-indoor-padel-coaching-for-skill-enhanceme-JV5Z29N.jpg',
    excerpt: 'Playing with diverse partners accelerates match tactical IQ, mental toughness, and opens doors to lasting friendships.',
  },
  {
    id: 2,
    title: 'Booking Courts Online: Quick & Easy Beginner Guide',
    date: '12 Jun 2025',
    category: 'Events & News',
    image: '/assets/images/portrait-of-attractive-woman-padel-tennis-player-i-NJU5BZU.jpg',
    excerpt: 'Learn how to pick peak versus off-peak hours, select between indoor panoramic vs outdoor glass courts, and invite friends.',
  },
  {
    id: 3,
    title: 'Recap: Adelux Spring Tournament 2025 Champions',
    date: '05 Jun 2025',
    category: 'Tournaments',
    image: '/assets/images/paddle-tennis-player-making-an-effort-to-while-hit-QPJDK5U.jpg',
    excerpt: 'Over 64 doubles pairs battled it out over three intense days in our most competitive annual championship to date.',
  },
  {
    id: 4,
    title: 'The Ultimate Guide to Choosing Your First Padel Racket',
    date: '28 May 2025',
    category: 'Gear & Tips',
    image: '/assets/images/close-up-of-paddle-tennis-racket-and-ball-with-wom-2P8BD2Y.jpg',
    excerpt: 'Round vs Teardrop vs Diamond shapes: which balance point and EVA rubber density matches your style of play?',
  },
  {
    id: 5,
    title: 'Mastering the Bandeja: How to Turn Defense into Attack',
    date: '20 May 2025',
    category: 'Coaching',
    image: '/assets/images/young-athletic-woman-hitting-the-ball-while-playin-J9XJQ27.jpg',
    excerpt: 'Key technical cues for hitting a crisp, controlled bandeja that prevents opponents from rushing the net.',
  },
  {
    id: 6,
    title: '5 Warm-up Routines to Prevent Rotator Cuff and Elbow Strain',
    date: '14 May 2025',
    category: 'Fitness',
    image: '/assets/images/sportsman-resting-from-playing-padel-AWX94Q7.jpg',
    excerpt: 'Dynamic mobility exercises specifically designed for the high-repetition rotational demands of racket sports.',
  },
];

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const categories = ['All', 'Padel Lifestyle', 'Events & News', 'Tournaments', 'Gear & Tips', 'Coaching'];

  const filteredPosts =
    selectedCategory === 'All'
      ? blogPosts
      : blogPosts.filter((p) => p.category === selectedCategory);

  return (
    <main>
      <PageBanner title="Our Blog & Tips" current="Blog" bannerClass="banner-inner-blog" />

      <div className="section">
        <div className="hero-container">
          <div className="d-flex flex-column gspace-5">
            <ScrollReveal animation="fade-up">
              <div className="d-flex flex-column gspace-2 text-center max-w-2xl mx-auto">
                <SubHeading title="Insights & Articles" className="justify-content-center" />
                <h2>Latest Padel News & Expert Tips</h2>
                <p className="text-gray-600">
                  Explore pro advice, technique breakdowns, gear reviews, and tournament highlights from the Adelux coaching team.
                </p>

                {/* Filter Pills */}
                <div className="d-flex flex-wrap justify-content-center gap-2 mt-3">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`cursor-pointer px-4 py-2 rounded-full font-semibold text-sm transition-all border-0 ${
                        selectedCategory === cat
                          ? 'bg-black text-[#C6EF2E]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            <div className="row row-cols-xl-3 row-cols-md-2 row-cols-1 grid-spacer-3">
              {filteredPosts.map((post, idx) => (
                <div key={post.id} className="col">
                  <ScrollReveal animation="fade-up" delay={idx * 80}>
                    <div className="card card-blog h-100 d-flex flex-column">
                      <div className="image-container blog-image">
                        <img src={post.image} alt={post.title} className="w-100 object-cover" style={{ height: '220px' }} />
                        <div className="blog-content">
                          <div className="d-flex flex-row align-items-center justify-content-start gspace-2 mb-2">
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-calendar text-[#C6EF2E]"></i>
                              <span>{post.date}</span>
                            </div>
                            <div className="meta-data d-flex align-items-center gap-1">
                              <i className="fa-solid fa-folder text-[#C6EF2E]"></i>
                              <span>{post.category}</span>
                            </div>
                          </div>
                          <h4 className="secondary-accent text-xl leading-snug">{post.title}</h4>
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 flex-grow-1 d-flex flex-column justify-content-between rounded-b-2xl">
                        <p className="text-gray-600 text-sm mb-4">{post.excerpt}</p>
                        <Link
                          to="/blog"
                          className="font-semibold text-black hover:text-[#C6EF2E] transition-colors d-flex align-items-center gap-2 text-sm"
                        >
                          <span>Read Full Article</span>
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
