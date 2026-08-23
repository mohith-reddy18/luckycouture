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
        <div className="fixed bottom-18 sm:bottom-22 right-4 sm:right-6 z-40">
          <motion.button
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent text-white border-2 border-white shadow-soft flex items-center justify-center hover:bg-primary hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
            aria-label="Scroll to top"
          >
            <ArrowUp size={16} className="stroke-[2.5]" />
          </motion.button>
        </div>
      )}
    </AnimatePresence>
  );
}
