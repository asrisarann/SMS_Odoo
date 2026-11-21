import { useState, useEffect, useRef } from 'react';

export default function ScrollReveal({
  children,
  animation = 'fade-up', // 'fade-up', 'fade-down', 'fade-left', 'fade-right', 'zoom-in'
  delay = 0,
  duration = 750,
  className = '',
  threshold = 0.12,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const currentElem = elementRef.current;
    if (currentElem) {
      observer.observe(currentElem);
    }

    return () => {
      if (currentElem) {
        observer.unobserve(currentElem);
      }
    };
  }, [threshold]);

  const getInitialStyle = () => {
    switch (animation) {
      case 'fade-up':
        return {
          opacity: 0,
          transform: 'translateY(36px)',
        };
      case 'fade-down':
        return {
          opacity: 0,
          transform: 'translateY(-36px)',
        };
      case 'fade-left':
        return {
          opacity: 0,
          transform: 'translateX(36px)',
        };
      case 'fade-right':
        return {
          opacity: 0,
          transform: 'translateX(-36px)',
        };
      case 'zoom-in':
        return {
          opacity: 0,
          transform: 'scale(0.92)',
        };
      default:
        return {
          opacity: 0,
          transform: 'translateY(30px)',
        };
    }
  };

  const getVisibleStyle = () => {
    switch (animation) {
      case 'zoom-in':
        return {
          opacity: 1,
          transform: 'scale(1)',
        };
      default:
        return {
          opacity: 1,
          transform: 'translate(0, 0)',
        };
    }
  };

  const currentTransform = isVisible ? getVisibleStyle() : getInitialStyle();

  return (
    <div
      ref={elementRef}
      className={`scroll-reveal ${className}`}
      style={{
        ...currentTransform,
        transition: `opacity ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </div>
  );
}
