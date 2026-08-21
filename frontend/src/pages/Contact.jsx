import { Phone, Mail, MessageCircle, MapPin, HelpCircle, Wrench, ExternalLink } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function Contact() {
  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Contact Lucky Couture | Guntur Tailoring & Boutique"
        description="Visit Lucky Couture on Amaravathi Road, Guntur, or contact us via phone or WhatsApp for custom tailoring inquiries and order consultations."
        canonical="/contact"
        schema={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          "name": "Contact Lucky Couture",
          "description": "Visit Lucky Couture on Amaravathi Road, Guntur, or contact us via phone or WhatsApp for custom tailoring inquiries and order consultations.",
          "url": "https://www.luckycouture.in/contact",
          "mainEntity": {
            "@type": "ClothingStore",
            "name": "Lucky Couture",
            "telephone": "+91 88017 90961",
            "email": "lakshmibade32@gmail.com",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Muthyalareddy Nagar Main Road, Amaravathi Road",
              "addressLocality": "Guntur",
              "addressRegion": "Andhra Pradesh",
              "postalCode": "522007",
              "addressCountry": "IN"
            }
          },
          "breadcrumb": {
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://www.luckycouture.in/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Contact",
                "item": "https://www.luckycouture.in/contact"
              }
            ]
          }
        }}
      />
      <SectionHeading eyebrow="Help Desk" title="We'd love to hear from you" />
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="flex flex-col gap-4">
          <a href={`tel:${contactInfo.phoneHref}`} className="flex items-center gap-4 bg-white rounded-2xl shadow-card p-5 hover:shadow-soft transition-shadow">
            <span className="w-11 h-11 rounded-full bg-highlight/50 flex items-center justify-center"><Phone size={18} className="text-primary" /></span>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">Call</p>
              <p className="font-medium text-primary">{contactInfo.phone}</p>
            </div>
          </a>
          <a href={contactInfo.whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-4 bg-white rounded-2xl shadow-card p-5 hover:shadow-soft transition-shadow">
            <span className="w-11 h-11 rounded-full bg-highlight/50 flex items-center justify-center"><MessageCircle size={18} className="text-primary" /></span>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">WhatsApp</p>
              <p className="font-medium text-primary">{contactInfo.phone}</p>
            </div>
          </a>
          <a href={`mailto:${contactInfo.email}`} className="flex items-center gap-4 bg-white rounded-2xl shadow-card p-5 hover:shadow-soft transition-shadow">
            <span className="w-11 h-11 rounded-full bg-highlight/50 flex items-center justify-center"><Mail size={18} className="text-primary" /></span>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">General Inquiry Email</p>
              <p className="font-medium text-primary break-all">{contactInfo.email}</p>
            </div>
          </a>
          <div className="rounded-2xl overflow-hidden shadow-card bg-white">
            <a
              href={contactInfo.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-4 p-5 hover:bg-bg/60 transition-colors"
            >
              <span className="w-11 h-11 rounded-full bg-highlight/50 flex items-center justify-center shrink-0"><MapPin size={18} className="text-primary" /></span>
              <div>
                <p className="text-xs uppercase tracking-wide text-secondary">Visit — Open in Google Maps</p>
                <p className="font-medium text-primary text-sm">{contactInfo.address}</p>
              </div>
            </a>
            <div className="relative w-full h-64 overflow-hidden">
              <iframe
                title="Lucky Couture location on Google Maps"
                src={`https://maps.google.com/maps?q=${contactInfo.lat},${contactInfo.lng}&ll=${contactInfo.lat},${contactInfo.lng}&z=19&t=&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-[calc(100%+52px)] -mt-[52px] border-0 block"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                href={contactInfo.mapsUrl}
                target="_blank"
                rel="noreferrer"
                aria-label="Open Lucky Couture location on Google Maps"
                className="absolute inset-0 z-10 cursor-pointer"
                style={{
                  clipPath: "polygon(0 0, 100% 0, 100% 100%, 75px 100%, 75px calc(100% - 65px), 0 calc(100% - 65px))",
                }}
              />
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl shadow-card p-5">
            <span className="w-11 h-11 rounded-full bg-highlight/50 flex items-center justify-center"><HelpCircle size={18} className="text-primary" /></span>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">Customer Help Desk</p>
              <p className="font-medium text-primary text-sm">Questions about an order, sizing, or delivery? Message us any time — we usually reply within a few hours.</p>
            </div>
          </div>
        </div>

        {/* Dedicated Technical Support Section */}
        <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 flex flex-col justify-between border border-primary/5 h-fit space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="w-11 h-11 rounded-full bg-accent/15 flex items-center justify-center text-accent">
                <Wrench size={20} />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-primary">Technical Support</h3>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-accent">Website & App Issues</span>
              </div>
            </div>

            <p className="text-sm text-ink/75 leading-relaxed mt-3 mb-6">
              Having an issue with our website? Contact our technical support team for prompt assistance.
            </p>

            {/* Technical Issues Scope */}
            <div className="bg-bg/70 rounded-xl p-4 border border-primary/10 mb-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2.5">
                Contact us for website & app issues such as:
              </p>
              <ul className="space-y-2 text-xs text-ink/80">
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Website errors, glitches, or broken links</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Login, account access, or profile problems</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Pages or product details not loading properly</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Images, cart, or interactive features not working</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <span>Other website/app technical issues</span>
                </li>
              </ul>
            </div>

            {/* Direct Clickable Technical Support Email */}
            <a
              href={`mailto:${contactInfo.techSupportEmail || "support@luckycouture.in"}?subject=Lucky%20Couture%20Website%20Technical%20Support`}
              className="group flex items-center justify-between p-4 rounded-xl border border-accent/30 bg-highlight/20 hover:bg-highlight/40 hover:border-accent transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Mail size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-secondary">
                    Technical Support Email
                  </p>
                  <p className="font-semibold text-primary text-sm sm:text-base truncate group-hover:text-accent transition-colors">
                    {contactInfo.techSupportEmail || "support@luckycouture.in"}
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-accent shrink-0 ml-2">
                Open Email <ExternalLink size={13} />
              </span>
            </a>
          </div>

          <p className="text-xs text-ink/50 pt-3 border-t border-primary/10">
            For custom tailoring, sizing consultations, or order queries, please use our general phone, WhatsApp, or boutique contact options on the left.
          </p>
        </div>
      </div>
    </div>
  );
}
