import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

// True sliding carousel — slides enter from the right and exit to the
// left (or reverse on manual back-navigation), with arrow controls,
// autoplay that pauses on hover, and infinite looping.
export default function Carousel({ slides, interval = 4500 }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  const goTo = useCallback((next, dir) => {
    setDirection(dir);
    setIndex(((next % slides.length) + slides.length) % slides.length);
  }, [slides.length]);

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = setInterval(() => goTo(index + 1, 1), interval);
    return () => clearInterval(timerRef.current);
  }, [index, paused, interval, goTo]);

  const variants = {
    enter: (dir) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 1 }),
    center: { x: "0%", opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 1 }),
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={slides[index].id}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url('${slides[index].image}')` }}
        />
      </AnimatePresence>

      {/* Arrow controls */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-primary/40 hover:bg-primary/70 backdrop-blur-sm text-bg flex items-center justify-center transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-primary/40 hover:bg-primary/70 backdrop-blur-sm text-bg flex items-center justify-center transition-colors"
      >
        <ChevronRight size={20} />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i, i > index ? 1 : -1)}
            aria-label={`Show ${s.label} slide`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-7 bg-highlight" : "w-1.5 bg-bg/50 hover:bg-bg/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
