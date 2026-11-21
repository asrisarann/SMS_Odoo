import { useState, useEffect } from 'react';

export default function ScrollProgress() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-[99999] pointer-events-none"
      style={{
        width: `${scrollProgress}%`,
        background: 'linear-gradient(90deg, #C6EF2E 0%, #EAFF9D 100%)',
        boxShadow: '0 0 10px rgba(198, 239, 46, 0.8)',
        transition: 'width 80ms ease-out',
      }}
    />
  );
}
