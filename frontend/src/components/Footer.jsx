import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, HelpCircle } from "lucide-react";
import logo from "../assets/logo.jpg";
import StarDivider from "./StarDivider";
import { contactInfo } from "../data/mockData";

// Lucide dropped brand/logo glyphs, so simple inline marks are used here
// for Instagram and Facebook to keep the footer dependency-free.
const InstagramMark = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);
const FacebookMark = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" {...props}>
    <path d="M13 8h2V5h-2c-1.66 0-3 1.34-3 3v2H8v3h2v6h3v-6h2.2l.8-3H13V8z" />
  </svg>
);
const WhatsAppMark = ({ size = 22, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path d="M12.01 2C6.76 2 2.5 6.24 2.5 11.47c0 1.64.43 3.17 1.19 4.5L2.5 20.5l4.66-1.16a9.9 9.9 0 0 0 4.85 1.24h.01c5.25 0 9.51-4.24 9.51-9.47C21.53 6.24 17.27 2 12.01 2Zm0 17.3h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.8.83-2.98-.2-.31a7.9 7.9 0 0 1-1.2-4.01c0-4.35 3.56-7.89 7.97-7.89 2.13 0 4.13.83 5.64 2.33a7.85 7.85 0 0 1 2.34 5.6c0 4.35-3.57 7.9-7.98 7.9Z" />
  </svg>
);

const quickLinks = [
  { to: "/", label: "Home" },
  { to: "/shop", label: "Shop" },
  { to: "/design-gallery", label: "Design Gallery" },
  { to: "/tailoring", label: "Tailoring" },
  { to: "/priority-stitching", label: "Priority Stitching" },
  { to: "/contact", label: "Contact" },
  { to: "/#faq", label: "FAQ" },
];

const legalLinks = [
  { to: "/privacy-policy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
];

const categories = [
  { to: "/shop?category=Wedding", label: "Wedding" },
  { to: "/shop?category=Sarees", label: "Sarees" },
  { to: "/shop?category=Dresses", label: "Dresses" },
  { to: "/shop?category=Nighties", label: "Nighties" },
  { to: "/shop?category=Blouses", label: "Blouses" },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-bg pt-16 pb-8 mt-auto">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 pb-12">
          <div className="lg:pr-8">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <span className="w-10 h-10 rounded-full ring-2 ring-highlight/50 overflow-hidden shrink-0">
                <img src={logo} alt="Lucky Couture logo" className="w-full h-full object-cover" />
              </span>
              <span className="font-display text-xl font-semibold">
                Lucky <span className="text-accent">Couture</span>
              </span>
            </Link>
            <p className="text-sm text-bg/70 leading-relaxed">
              Bespoke tailoring and curated fashion, hand-finished by a single
              tailor's needle — every stitch made to fit you, not the other
              way around.
            </p>
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://www.instagram.com/lucky_couture123/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-bg/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-transparent hover:bg-gradient-to-tr hover:from-[#FEDA75] hover:via-[#D62976] hover:to-[#4F5BD5] hover:text-white bg-origin-border bg-clip-border"
                aria-label="Lucky Couture on Instagram"
              >
                <InstagramMark size={22} />
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61592799955999"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-bg/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-[#1877F2] hover:bg-[#1877F2] hover:text-white bg-origin-border"
                aria-label="Lucky Couture on Facebook"
              >
                <FacebookMark size={22} />
              </a>
              <a
                href={`${contactInfo.whatsappHref}?text=${encodeURIComponent("Hello Lucky Couture! I would like to know more about your tailoring services.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full border border-bg/20 flex items-center justify-center transition-all duration-200 hover:scale-110 hover:border-[#25D366] hover:bg-[#25D366] hover:text-white bg-origin-border"
                aria-label="Message Lucky Couture on WhatsApp"
              >
                <WhatsAppMark size={22} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-bg/70 hover:text-highlight transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4">Categories</h4>
            <ul className="space-y-2.5">
              {categories.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-bg/70 hover:text-highlight transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg mb-4">Visit / Reach Us</h4>
            <ul className="space-y-3 text-sm text-bg/70">
              <li className="flex gap-2">
                <a href={contactInfo.mapsUrl} target="_blank" rel="noreferrer" className="flex gap-2 hover:text-highlight transition-colors">
                  <MapPin size={16} className="shrink-0 mt-0.5 text-accent" />
                  <span>{contactInfo.address}</span>
                </a>
              </li>
              <li className="flex gap-2 items-center">
                <Phone size={16} className="shrink-0 text-accent" />
                <a href={`tel:${contactInfo.phoneHref}`} className="hover:text-highlight">{contactInfo.phone}</a>
              </li>
              <li className="flex gap-2 items-center">
                <Mail size={16} className="shrink-0 text-accent" />
                <a href={`mailto:${contactInfo.email}`} className="hover:text-highlight">{contactInfo.email}</a>
              </li>
              <li className="flex gap-2 items-center">
                <HelpCircle size={16} className="shrink-0 text-accent" />
                <Link to="/contact" className="hover:text-highlight">Need help? Visit our Help Desk</Link>
              </li>
            </ul>
          </div>
        </div>

        <StarDivider light className="opacity-40" />

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-bg/50">
          <p>© {new Date().getFullYear()} Lucky Couture. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {legalLinks.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-highlight transition-colors">
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
