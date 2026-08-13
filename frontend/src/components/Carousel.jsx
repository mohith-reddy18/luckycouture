import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Carousel({ slides, interval = 4500 }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const [isFirstRender, setIsFirstRender] = useState(true);
  const timerRef = useRef(null);

  const goTo = useCallback((nextIdx, dir) => {
    setIsFirstRender(false);
    setDirection(dir);
    setIndex(((nextIdx % slides.length) + slides.length) % slides.length);
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

  const currentSlide = slides[index];

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-primary/20"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence initial={false} custom={direction} mode="popLayout">
        <motion.div
          key={currentSlide.id}
          custom={direction}
          variants={variants}
          initial={isFirstRender ? "center" : "enter"}
          animate="center"
          exit="exit"
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0 opacity-90"
        >
          <img
            src={currentSlide.image}
            srcSet={currentSlide.srcSet}
            sizes="(max-width: 768px) 100vw, 1200px"
            alt={currentSlide.label || "Hero Slide"}
            fetchpriority={index === 0 ? "high" : "low"}
            loading={index === 0 ? "eager" : "lazy"}
            decoding="async"
            width={1200}
            height={800}
            className="w-full h-full object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Arrow controls - minimum 44x44px touch area for WCAG accessibility */}
      <button
        onClick={prev}
        aria-label="Previous slide"
        className="absolute left-2 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-primary/40 hover:bg-primary/70 backdrop-blur-sm text-bg flex items-center justify-center transition-colors shadow-sm"
      >
        <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
      </button>
      <button
        onClick={next}
        aria-label="Next slide"
        className="absolute right-2 sm:right-4 md:left-auto md:right-6 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-primary/40 hover:bg-primary/70 backdrop-blur-sm text-bg flex items-center justify-center transition-colors shadow-sm"
      >
        <ChevronRight size={18} className="sm:w-5 sm:h-5" />
      </button>

      {/* Slide Indicators - padded touch area */}
      <div className="absolute bottom-1.5 sm:bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 sm:gap-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i, i > index ? 1 : -1)}
            aria-label={`Show ${s.label} slide`}
            className="py-1 px-0.5 sm:py-2.5 sm:px-1 flex items-center justify-center"
          >
            <span
              className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                i === index ? "w-6 sm:w-8 bg-highlight" : "w-1.5 sm:w-2 bg-bg/60 hover:bg-bg/90"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
