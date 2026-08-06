import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center pointer-events-none">
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="pointer-events-auto w-10 h-10 rounded-full glass border border-primary/10 text-primary/55 shadow-sm flex items-center justify-center hover:text-primary hover:border-primary/20 hover:shadow-soft transition-all"
            aria-label="Scroll to top"
          >
            <ArrowUp size={16} />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
