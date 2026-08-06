import { motion } from "framer-motion";
import StarDivider from "./StarDivider";

export default function SectionHeading({ eyebrow, title, subtitle, align = "center", light = false }) {
  const alignClass = align === "left" ? "items-start text-left" : "items-center text-center";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`flex flex-col gap-3 mb-10 md:mb-14 ${alignClass}`}
    >
      {eyebrow && (
        <span className={`font-body text-xs tracking-[0.35em] uppercase ${light ? "text-highlight" : "text-secondary"}`}>
          {eyebrow}
        </span>
      )}
      <h2 className={`font-display text-3xl sm:text-4xl md:text-5xl font-semibold ${light ? "text-bg" : "text-primary"}`}>
        {title}
      </h2>
      <StarDivider light={light} className={align === "left" ? "!justify-start" : ""} />
      {subtitle && (
        <p className={`max-w-xl font-body text-sm sm:text-base leading-relaxed ${light ? "text-bg/80" : "text-ink/70"} ${align === "left" ? "" : "mx-auto"}`}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
