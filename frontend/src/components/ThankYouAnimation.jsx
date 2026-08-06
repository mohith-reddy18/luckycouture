import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const sparklePositions = [
  { x: -70, y: -40, delay: 0.3 },
  { x: 60, y: -55, delay: 0.5 },
  { x: -50, y: 30, delay: 0.7 },
  { x: 75, y: 20, delay: 0.4 },
  { x: 0, y: -70, delay: 0.6 },
];

export default function ThankYouAnimation() {
  return (
    <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
      {sparklePositions.map((s, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0, 1, 0.6] }}
          transition={{ duration: 1.6, delay: s.delay, ease: "easeOut" }}
          className="absolute text-highlight"
        >
          <Sparkles size={16} fill="currentColor" />
        </motion.span>
      ))}

      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-highlight flex items-center justify-center"
      >
        <svg viewBox="0 0 52 52" className="w-10 h-10">
          <motion.path
            fill="none"
            stroke="#443742"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14 27 L22 35 L38 17"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          />
        </svg>
      </motion.div>
    </div>
  );
}
