// Custom ornamental flourish divider — an original SVG drawn to match the
// spirit of the reference (line / curling scrollwork / center accent /
// scrollwork / line) requested for section dividers, with a transparent
// background so it drops onto any section color. Component name kept as
// "StarDivider" to avoid touching every import site across the app.

const Ornament = ({ className = "" }) => (
  <svg viewBox="0 0 40 18" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* center diamond accent */}
    <rect x="17" y="5" width="6" height="6" transform="rotate(45 20 8)" fill="currentColor" />

    {/* left scrollwork — two curls branching up and down from the diamond */}
    <path d="M15 8 C 11 8, 11 3, 6 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="5" cy="3" r="1.3" fill="currentColor" />
    <path d="M15 8 C 11 8, 11 13, 6 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="5" cy="13" r="1.3" fill="currentColor" />

    {/* right scrollwork — mirrored */}
    <path d="M25 8 C 29 8, 29 3, 34 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="35" cy="3" r="1.3" fill="currentColor" />
    <path d="M25 8 C 29 8, 29 13, 34 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="35" cy="13" r="1.3" fill="currentColor" />
  </svg>
);

export default function StarDivider({ light = false, className = "" }) {
  const color = light ? "text-highlight" : "text-accent";
  const line = light ? "bg-highlight/40" : "bg-accent/40";
  return (
    <div className={`flex items-center justify-center gap-2.5 ${className}`}>
      <span className={`h-px w-8 ${line}`} />
      <Ornament className={`w-9 h-4 shrink-0 ${color}`} />
      <span className={`h-px w-8 ${line}`} />
    </div>
  );
}
