import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function InfoRow({ label, value, mono, highlight, copyable }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value || value === "—") return;
    try {
      navigator.clipboard.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-primary/5 last:border-0 text-xs sm:text-sm">
      <span className="text-ink/60 shrink-0 font-medium">{label}</span>
      <div className="flex items-center gap-1.5 justify-end text-right min-w-0">
        <span className={`font-medium ${mono ? "font-mono tracking-wide text-[11px] sm:text-xs break-all select-text" : ""} ${highlight ? "text-accent font-bold" : "text-primary"}`}>
          {value ?? "—"}
        </span>
        {copyable && value && value !== "—" && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-ink/40 hover:text-accent transition-colors rounded cursor-pointer shrink-0"
            title={copied ? "Copied!" : `Copy ${label}`}
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}
