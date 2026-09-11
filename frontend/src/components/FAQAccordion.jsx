import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function FAQAccordion({ items, light = false }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className={`max-w-2xl mx-auto divide-y ${light ? "divide-bg/15 border-t border-b border-bg/15" : "divide-primary/10 border-t border-b border-primary/10"}`}>
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              onClick={() => setOpenIndex(isOpen ? -1 : i)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left cursor-pointer"
              aria-expanded={isOpen}
            >
              <span className={`font-body text-sm md:text-base font-medium ${light ? "text-bg" : "text-primary"}`}>{item.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.25 }}
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${light ? "bg-bg/10 text-highlight" : "bg-bg text-secondary"}`}
              >
                <ChevronDown size={16} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <p className={`pb-5 text-sm leading-relaxed pr-10 ${light ? "text-bg/80" : "text-ink/65"}`}>{item.a}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
