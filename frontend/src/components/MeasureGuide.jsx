import { useState } from "react";

const guides = [
  { id: "Shoulder", label: "Shoulder Width", desc: "Across back from left shoulder tip to right shoulder tip" },
  { id: "Chest/Bust", label: "Chest / Bust", desc: "Around the fullest part of your bust/chest" },
  { id: "Waist", label: "Waistline", desc: "Around the narrowest natural waistline above navel" },
  { id: "Hip", label: "Hip Circumference", desc: "Around the fullest part of your hips" },
  { id: "Armhole", label: "Armhole / Arm Round", desc: "Around highest point of arm under armpit" },
  { id: "Sleeves Round", label: "Sleeves Round", desc: "Around bicep/arm where sleeve edge ends" },
  { id: "Front Neck Deep", label: "Front Neck Deep", desc: "From shoulder-neck point straight down to front neck depth" },
  { id: "Back Neck Deep", label: "Back Neck Deep", desc: "From shoulder-neck point straight down to back neck depth" },
  { id: "Sleeve", label: "Sleeve Length", desc: "From shoulder seam down arm to desired cuff length" },
  { id: "Length", label: "Garment Length", desc: "From shoulder seam down to your desired hemline" },
];

export default function MeasureGuide() {
  return (
    <div className="bg-bg border border-primary/10 rounded-2xl p-3.5 sm:p-5 mb-6">
      <div className="mb-3">
        <h4 className="text-xs uppercase tracking-wider font-semibold text-secondary">Technical Measurement Diagrams &amp; Guide</h4>
        <p className="text-xs text-ink/65 mt-0.5">
          Follow the 2 visual engineering guides below using a soft measuring tape.
        </p>
      </div>

      {/* Side-by-Side 2 Technical Vector Diagrams */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
        {/* Diagram 1: Torso, Shoulders & Necklines */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-primary/10 shadow-inner overflow-hidden flex flex-col items-center">
          <span className="text-[11px] font-semibold text-primary mb-1 text-center">
            Diagram 1: Torso, Shoulders &amp; Neck Depth
          </span>
          <svg viewBox="0 0 340 280" className="w-full h-auto max-h-[230px] shrink-0 select-none">
            <defs>
              <marker id="arrow-start1" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 10 0 L 0 5 L 10 10 Z" fill="#C1791F" />
              </marker>
              <marker id="arrow-end1" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 Z" fill="#C1791F" />
              </marker>
            </defs>

            {/* Torso & Necklines */}
            <g stroke="#846C5B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              {/* Front Neckline (U-shape) */}
              <path d="M 130 35 C 145 75, 175 75, 190 35" strokeWidth="2.5" stroke="#C1791F" />
              {/* Back Neckline (Dashed V/U-shape) */}
              <path d="M 130 35 C 145 95, 175 95, 190 35" strokeWidth="1.8" strokeDasharray="4 3" opacity="0.75" />

              {/* Shoulders & Sleeves */}
              <path d="M 130 35 L 75 55 L 45 145 L 68 152 L 95 105" />
              <path d="M 190 35 L 245 55 L 275 145 L 252 152 L 225 105" />

              {/* Side Body & Hem */}
              <path d="M 95 105 C 105 130, 112 150, 110 170 C 108 195, 92 230, 88 255" />
              <path d="M 225 105 C 215 130, 208 150, 210 170 C 212 195, 228 230, 232 255" />
              <path d="M 88 255 C 130 262, 190 262, 232 255" strokeWidth="2" />
            </g>

            {/* Dimension Lines */}
            <g stroke="#C1791F" strokeWidth="1.8" markerStart="url(#arrow-start1)" markerEnd="url(#arrow-end1)">
              {/* 1. Shoulder Width */}
              <line x1="80" y1="40" x2="240" y2="40" />
              {/* 2. Front Neck Deep */}
              <line x1="160" y1="35" x2="160" y2="72" />
              {/* 3. Back Neck Deep */}
              <line x1="178" y1="35" x2="178" y2="92" />
              {/* 4. Chest / Bust */}
              <line x1="100" y1="108" x2="220" y2="108" />
              {/* 5. Waist */}
              <line x1="114" y1="165" x2="206" y2="165" />
              {/* 6. Hip */}
              <line x1="94" y1="220" x2="226" y2="220" />
            </g>

            {/* Labels & Callout Pills */}
            <g textAnchor="middle" className="text-[9px] font-sans font-semibold">
              {/* Shoulder */}
              <rect x="130" y="24" width="60" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="160" y="35" fill="#443742">Shoulder</text>

              {/* Front Neck Deep */}
              <rect x="72" y="58" width="80" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="112" y="69" fill="#443742">Front Neck Deep</text>

              {/* Back Neck Deep */}
              <rect x="188" y="78" width="78" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="227" y="89" fill="#443742">Back Neck Deep</text>

              {/* Chest/Bust */}
              <rect x="125" y="100" width="70" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="160" y="111" fill="#443742">Chest/Bust</text>

              {/* Waist */}
              <rect x="135" y="157" width="50" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="160" y="168" fill="#443742">Waist</text>

              {/* Hip */}
              <rect x="138" y="212" width="44" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="160" y="223" fill="#443742">Hip</text>
            </g>
          </svg>
        </div>

        {/* Diagram 2: Armhole, Arm Round, Sleeves & Garment Length */}
        <div className="bg-white rounded-xl p-2.5 sm:p-3 border border-primary/10 shadow-inner overflow-hidden flex flex-col items-center">
          <span className="text-[11px] font-semibold text-primary mb-1 text-center">
            Diagram 2: Armhole, Sleeves &amp; Garment Length
          </span>
          <svg viewBox="0 0 340 280" className="w-full h-auto max-h-[230px] shrink-0 select-none">
            <defs>
              <marker id="arrow-start2" viewBox="0 0 10 10" refX="2" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 10 0 L 0 5 L 10 10 Z" fill="#C1791F" />
              </marker>
              <marker id="arrow-end2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto">
                <path d="M 0 0 L 10 5 L 0 10 Z" fill="#C1791F" />
              </marker>
            </defs>

            {/* Torso & Arms */}
            <g stroke="#846C5B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <path d="M 130 35 C 145 45, 175 45, 190 35" strokeWidth="2.5" />
              <path d="M 130 35 L 75 55 L 45 155 L 68 162 L 95 105" />
              <path d="M 190 35 L 245 55 L 275 155 L 252 162 L 225 105" />
              <path d="M 95 105 C 105 130, 112 150, 110 170 C 108 195, 92 230, 88 255" />
              <path d="M 225 105 C 215 130, 208 150, 210 170 C 212 195, 228 230, 232 255" />
              <path d="M 88 255 C 130 262, 190 262, 232 255" strokeWidth="2" />

              {/* Armhole Loop Highlight */}
              <ellipse cx="98" cy="80" rx="14" ry="24" stroke="#C1791F" strokeWidth="2.2" strokeDasharray="3 2" fill="rgba(193,121,31,0.08)" />
            </g>

            {/* Extension Guidelines */}
            <g stroke="#846C5B" strokeWidth="1" strokeDasharray="3 3" opacity="0.35">
              <line x1="190" y1="25" x2="295" y2="25" />
              <line x1="232" y1="255" x2="295" y2="255" />
            </g>

            {/* Dimension Lines */}
            <g stroke="#C1791F" strokeWidth="1.8" markerStart="url(#arrow-start2)" markerEnd="url(#arrow-end2)">
              {/* 1. Sleeve Length */}
              <line x1="70" y1="62" x2="44" y2="150" />
              {/* 2. Sleeves Round Ring */}
              <line x1="44" y1="158" x2="68" y2="165" />
              {/* 3. Garment Length */}
              <line x1="290" y1="30" x2="290" y2="250" />
            </g>

            {/* Labels & Callout Pills */}
            <g textAnchor="middle" className="text-[9px] font-sans font-semibold">
              {/* Armhole / Arm Round */}
              <rect x="75" y="70" width="105" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="127" y="81" fill="#443742">Armhole / Arm Round</text>

              {/* Sleeve Length */}
              <rect x="5" y="98" width="54" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="32" y="109" fill="#443742">Sleeve</text>

              {/* Sleeves Round */}
              <rect x="5" y="166" width="75" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="42" y="177" fill="#443742">Sleeves Round</text>

              {/* Length */}
              <rect x="270" y="132" width="52" height="16" rx="8" fill="#F8F6F2" stroke="#C1791F" strokeWidth="1.2" />
              <text x="296" y="143" fill="#443742">Length</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Unambiguous Customer Guide Quick Reference Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {guides.map((g) => (
          <div key={g.id} className="bg-white p-2 sm:p-2.5 rounded-xl border border-primary/10 text-left">
            <span className="text-[11px] font-semibold text-primary block leading-tight">{g.label}</span>
            <span className="text-[10px] text-ink/60 leading-tight block mt-0.5">{g.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
