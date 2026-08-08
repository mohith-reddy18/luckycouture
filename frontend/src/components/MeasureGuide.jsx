import { useState } from "react";

const guides = [
  { id: "Shoulder", label: "Shoulder Width", desc: "Across back from left shoulder tip to right shoulder tip" },
  { id: "Chest/Bust", label: "Chest / Bust", desc: "Around the fullest part of your bust/chest" },
  { id: "Waist", label: "Waistline", desc: "Around the narrowest natural waistline above navel" },
  { id: "Hip", label: "Hip Circumference", desc: "Around the fullest part of your hips" },
  { id: "Sleeve", label: "Sleeve Length", desc: "From shoulder seam down arm to wrist/cuff" },
  { id: "Length", label: "Garment Length", desc: "From top shoulder seam down to your desired hemline" },
];

export default function MeasureGuide() {
  return (
    <div className="bg-bg border border-primary/10 rounded-2xl p-3.5 sm:p-5 mb-6">
      <div className="mb-3">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-secondary">Technical Measurement Diagram</h4>
        <p className="text-xs text-ink/65 mt-0.5">
          Follow the engineering dimension lines below using a soft measuring tape.
        </p>
      </div>

      {/* Headless Garment Technical Dimension Vector Diagram */}
      <div className="bg-white rounded-xl p-2.5 sm:p-4 border border-primary/10 mb-3.5 shadow-inner overflow-hidden">
        <svg viewBox="0 0 340 290" className="w-full h-auto max-h-[260px] mx-auto shrink-0 select-none">
          <defs>
            <marker id="arrow-start" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 10 0 L 0 5 L 10 10 Z" fill="#C1791F" />
            </marker>
            <marker id="arrow-end" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 Z" fill="#C1791F" />
            </marker>
          </defs>

          {/* Headless Torso & Garment Technical Outline (No head) */}
          <g stroke="#846C5B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Neckline */}
            <path d="M 130 35 C 145 45, 175 45, 190 35" strokeWidth="2.5" />

            {/* Left Shoulder & Arm */}
            <path d="M 130 35 L 75 55 L 45 155 L 68 162 L 95 105" />

            {/* Right Shoulder & Arm */}
            <path d="M 190 35 L 245 55 L 275 155 L 252 162 L 225 105" />

            {/* Torso Body Outline */}
            <path d="M 95 105 C 105 130, 112 150, 110 170 C 108 195, 92 230, 88 260" />
            <path d="M 225 105 C 215 130, 208 150, 210 170 C 212 195, 228 230, 232 260" />

            {/* Bottom Hemline */}
            <path d="M 88 260 C 130 267, 190 267, 232 260" strokeWidth="2" />
          </g>

          {/* Dimension Extension Guidelines (Dashed Light Lines) */}
          <g stroke="#846C5B" strokeWidth="1" strokeDasharray="3 3" opacity="0.35">
            <line x1="190" y1="25" x2="295" y2="25" />
            <line x1="232" y1="260" x2="295" y2="260" />
          </g>

          {/* Professional Engineering Dimension Lines with Arrowheads */}
          <g stroke="#C1791F" strokeWidth="2" markerStart="url(#arrow-start)" markerEnd="url(#arrow-end)">
            {/* 1. Shoulder Width */}
            <line x1="80" y1="42" x2="240" y2="42" />

            {/* 2. Chest / Bust */}
            <line x1="100" y1="105" x2="220" y2="105" />

            {/* 3. Waist */}
            <line x1="114" y1="165" x2="206" y2="165" />

            {/* 4. Hip */}
            <line x1="94" y1="222" x2="226" y2="222" />

            {/* 5. Sleeve Length */}
            <line x1="70" y1="62" x2="44" y2="150" />

            {/* 6. Garment Length */}
            <line x1="290" y1="30" x2="290" y2="255" />
          </g>

          {/* Technical Dimension Labels & Callout Pills */}
          <g textAnchor="middle" className="text-[10px] font-sans font-semibold">
            {/* Shoulder */}
            <rect x="130" y="32" width="60" height="18" rx="9" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.5" />
            <text x="160" y="44" fill="#443742">Shoulder</text>

            {/* Chest/Bust */}
            <rect x="125" y="96" width="70" height="18" rx="9" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.5" />
            <text x="160" y="108" fill="#443742">Chest/Bust</text>

            {/* Waist */}
            <rect x="135" y="156" width="50" height="18" rx="9" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.5" />
            <text x="160" y="168" fill="#443742">Waist</text>

            {/* Hip */}
            <rect x="138" y="213" width="44" height="18" rx="9" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.5" />
            <text x="160" y="225" fill="#443742">Hip</text>

            {/* Sleeve */}
            <rect x="5" y="98" width="50" height="18" rx="9" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.5" />
            <text x="30" y="110" fill="#443742">Sleeve</text>

            {/* Length */}
            <rect x="270" y="135" width="52" height="18" rx="9" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.5" />
            <text x="296" y="147" fill="#443742">Length</text>
          </g>
        </svg>
      </div>

      {/* Unambiguous Customer Guide Quick Reference Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {guides.map((g) => (
          <div key={g.id} className="bg-white p-2.5 rounded-xl border border-primary/10 text-left">
            <span className="text-[11px] font-semibold text-primary block leading-tight">{g.label}</span>
            <span className="text-[10px] text-ink/60 leading-tight block mt-0.5">{g.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}


