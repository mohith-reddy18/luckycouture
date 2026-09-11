import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import StarDivider from "./StarDivider";

/**
 * Premium empty state component for Lucky Couture pages (Shop, Design Gallery, etc.)
 * Used when the catalog/gallery itself genuinely has 0 items.
 */
export default function OpeningSoonEmptyState({
  title = "Opening Soon",
  subtitle = "Our collection is being carefully prepared. Beautiful pieces are coming soon.",
  eyebrow = "Lucky Couture Collection",
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full text-center py-16 sm:py-20 md:py-24 px-6 sm:px-10 bg-white rounded-3xl border border-primary/10 shadow-card flex flex-col items-center justify-center my-4"
    >
      <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent mb-4 shadow-2xs">
        <Sparkles size={22} />
      </div>
      {eyebrow && (
        <span className="font-body text-xs tracking-[0.3em] uppercase text-secondary font-medium mb-2">
          {eyebrow}
        </span>
      )}
      <h3 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold text-primary mb-3">
        {title}
      </h3>
      <StarDivider className="mb-4" />
      <p className="max-w-md font-body text-xs sm:text-sm md:text-base text-ink/70 leading-relaxed mx-auto">
        {subtitle}
      </p>
    </motion.div>
  );
}
