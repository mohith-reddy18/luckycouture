import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none max-w-[90vw]">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex items-center gap-2.5 bg-[#1A1218] text-white px-5 py-3 rounded-full border border-accent/60 shadow-[0_14px_36px_rgba(0,0,0,0.5)] text-sm font-medium tracking-wide"
          >
            <CheckCircle2 size={18} className="text-highlight shrink-0" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

