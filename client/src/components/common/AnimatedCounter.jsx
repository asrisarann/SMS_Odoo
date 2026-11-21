import { useState, useEffect, useRef } from 'react';

export default function AnimatedCounter({ target, suffix = '', duration = 1800, className = '' }) {
  const numTarget = parseInt(String(target).replace(/[^0-9]/g, ''), 10) || 0;
  const isYear = numTarget > 1900 && numTarget < 2100;
  const startValue = isYear ? numTarget - 40 : 0;

  const [count, setCount] = useState(startValue);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.2 }
    );

    const current = elementRef.current;
    if (current) observer.observe(current);

    return () => {
      if (current) observer.unobserve(current);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!hasStarted) return;

    const totalSteps = 40;
    const increment = Math.max(1, Math.ceil((numTarget - startValue) / totalSteps));
    const stepTime = Math.floor(duration / totalSteps);

    const timer = setInterval(() => {
      setCount((prev) => {
        const next = prev + increment;
        if (next >= numTarget) {
          clearInterval(timer);
          return numTarget;
        }
        return next;
      });
    }, stepTime);

    return () => clearInterval(timer);
  }, [hasStarted, numTarget, startValue, duration]);

  return (
    <span ref={elementRef} className={className}>
      {count}
      {suffix}
    </span>
  );
}
