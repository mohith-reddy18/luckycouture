import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className="fixed bottom-5 sm:bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none w-auto max-w-[calc(100vw-1.5rem)] sm:max-w-lg px-2 flex justify-center">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex items-center gap-2 sm:gap-2.5 bg-[#1A1218] text-white px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full border border-accent/60 shadow-[0_14px_36px_rgba(0,0,0,0.5)] text-xs sm:text-sm font-medium tracking-normal sm:tracking-wide text-left sm:text-center leading-snug"
          >
            <CheckCircle2 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-highlight shrink-0" />
            <span className="break-words sm:break-normal">{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

