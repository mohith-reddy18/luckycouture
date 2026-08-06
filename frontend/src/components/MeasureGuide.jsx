const Silhouette = ({ highlightY, label }) => (
  <div className="flex flex-col items-center gap-2">
    <svg viewBox="0 0 100 160" className="w-16 h-24">
      <ellipse cx="50" cy="18" rx="14" ry="16" fill="none" stroke="#846C5B" strokeWidth="2.5" />
      <path
        d="M50 34 C 30 40, 24 60, 26 90 C 27 110, 30 130, 34 152 M50 34 C 70 40, 76 60, 74 90 C 73 110, 70 130, 66 152"
        fill="none"
        stroke="#846C5B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line x1="18" y1={highlightY} x2="82" y2={highlightY} stroke="#C1791F" strokeWidth="3" strokeDasharray="4 3" />
    </svg>
    <span className="text-[11px] font-medium text-primary text-center">{label}</span>
  </div>
);

export default function MeasureGuide() {
  return (
    <div className="bg-bg rounded-xl p-4 mb-6">
      <p className="text-xs text-ink/60 mb-3">
        Measuring at home? Use a soft measuring tape and keep it snug but not tight, standing naturally.
      </p>
      <div className="flex items-center justify-around gap-4">
        <Silhouette highlightY={42} label="Bust — fullest part, across the back" />
        <Silhouette highlightY={65} label="Waist — narrowest part above navel" />
        <Silhouette highlightY={85} label="Hip — fullest part, around seat" />
      </div>
    </div>
  );
}
