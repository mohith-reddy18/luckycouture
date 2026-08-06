import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function Toast() {
  const { toast } = useApp();
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="flex items-center gap-2 bg-primary text-bg px-5 py-3 rounded-full shadow-soft text-sm"
          >
            <CheckCircle2 size={16} className="text-highlight" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
