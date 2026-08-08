import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const sparklePositions = [
  { x: -70, y: -40, delay: 0.05 },
  { x: 60, y: -55, delay: 0.2 },
  { x: -50, y: 30, delay: 0.35 },
  { x: 75, y: 20, delay: 0.15 },
  { x: 0, y: -70, delay: 0.25 },
];

export default function ThankYouAnimation() {
  return (
    <div className="relative w-36 h-36 sm:w-40 sm:h-40 mx-auto mb-3 flex items-center justify-center">
      {sparklePositions.map((s, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0, 1.2, 0.5] }}
          transition={{ duration: 1.8, delay: s.delay, ease: "easeOut" }}
          className="absolute text-accent"
        >
          <Sparkles size={18} fill="currentColor" />
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16, delay: 0, duration: 0.5 }}
        className="w-22 h-22 sm:w-24 sm:h-24 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/30 p-4"
      >
        <svg viewBox="0 0 52 52" className="w-12 h-12 sm:w-13 sm:h-13">
          <motion.path
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 27 L22 35 L38 17"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}


