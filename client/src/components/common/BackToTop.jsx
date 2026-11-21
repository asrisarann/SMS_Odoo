import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      if (window.scrollY > 350) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener('scroll', checkScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!show) return null;

  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#C6EF2E] text-black shadow-lg hover:shadow-[0_0_20px_rgba(198,239,46,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 d-flex align-items-center justify-content-center cursor-pointer border-0"
      aria-label="Scroll back to top"
      style={{
        animation: 'fadeInUpShort 0.3s ease-out forwards',
      }}
    >
      <i className="fa-solid fa-arrow-up text-lg font-bold"></i>
    </button>
  );
}
