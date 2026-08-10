import { motion } from "framer-motion";
import { Package, ArrowLeft } from "lucide-react";

export default function AdminSectionPlaceholder({ title, description, icon: Icon = Package, onBackToDashboard }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-8 shadow-card border border-primary/5 min-h-[400px] flex flex-col items-center justify-center text-center"
    >
      <span className="w-16 h-16 rounded-2xl bg-highlight/30 text-accent flex items-center justify-center mb-4 shadow-sm">
        <Icon size={28} />
      </span>
      <h2 className="font-display text-2xl font-semibold text-primary mb-2">
        {title} Management
      </h2>
      <p className="text-xs sm:text-sm text-ink/60 max-w-md mb-6 leading-relaxed">
        {description || `Manage ${title.toLowerCase()} data, statuses, filtering, and export capabilities for Lucky Couture.`}
      </p>

      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg text-primary text-xs font-semibold hover:bg-primary hover:text-white transition-colors border border-primary/15"
        >
          <ArrowLeft size={14} /> Return to Dashboard Overview
        </button>
      )}
    </motion.div>
  );
}
