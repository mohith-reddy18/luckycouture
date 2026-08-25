import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { contactInfo } from "../data/mockData";

const MESSAGE = "Hello Lucky Couture! I would like to know more about your tailoring services.";

// Official WhatsApp mark (Lucide dropped brand glyphs), kept isolated here.
const WhatsAppMark = (props) => (
  <svg viewBox="0 0 32 32" fill="currentColor" {...props}>
    <path d="M16.01 3C9.38 3 4 8.35 4 14.94c0 2.18.59 4.22 1.63 5.98L4 29l8.29-2.16a12.9 12.9 0 0 0 3.72.55h.01c6.63 0 12-5.35 12-11.94C28.02 8.35 22.65 3 16.01 3Zm0 21.8h-.01a10.85 10.85 0 0 1-5.53-1.5l-.4-.24-4.92 1.28 1.32-4.78-.26-.49a9.85 9.85 0 0 1-1.5-5.13C4.72 8.97 9.83 3.9 16 3.9c2.85 0 5.53 1.1 7.55 3.1a10.7 10.7 0 0 1 3.13 7.6c0 6.09-5.11 11.2-10.68 11.2Zm5.86-8.39c-.32-.16-1.9-.94-2.2-1.04-.29-.11-.51-.16-.72.16-.21.32-.83 1.04-1.02 1.25-.19.21-.38.24-.7.08-.32-.16-1.34-.49-2.55-1.57-.94-.84-1.58-1.87-1.76-2.19-.19-.32-.02-.49.14-.65.14-.14.32-.38.48-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.72-1.73-.98-2.37-.26-.62-.53-.54-.72-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.12 1.1-1.12 2.67 0 1.57 1.15 3.09 1.31 3.3.16.21 2.26 3.44 5.47 4.83.76.33 1.36.53 1.82.67.77.24 1.46.21 2.01.13.61-.09 1.9-.78 2.17-1.53.27-.75.27-1.4.19-1.53-.08-.14-.29-.21-.61-.37Z" />
  </svg>
);

export default function WhatsAppButton() {
  const { pathname } = useLocation();
  const isAdmin = pathname.startsWith("/admin");
  const isSupportChat = pathname.startsWith("/support/") && pathname !== "/support";

  // Hide on Admin pages where dedicated admin workspace is active
  if (isAdmin) return null;

  const href = `${contactInfo.whatsappHref}?text=${encodeURIComponent(MESSAGE)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat with Lucky Couture on WhatsApp"
      className={`fixed z-40 w-11 h-11 sm:w-[52px] sm:h-[52px] flex items-center justify-center transition-all ${
        isSupportChat
          ? "bottom-24 right-4 sm:bottom-28 sm:right-6 lg:bottom-6 lg:right-6"
          : "bottom-5 right-4 sm:bottom-6 sm:right-6"
      }`}
    >
      <motion.span
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.2 }}
        className="relative w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-full bg-[#25D366] text-white shadow-soft flex items-center justify-center"
      >
        <WhatsAppMark className="w-5 h-5 sm:w-6 sm:h-6" />
      </motion.span>
    </a>
  );
}
