import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, HelpCircle, Wrench, Send, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import { useApp } from "../context/AppContext";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";
import api from "../utils/api";

export default function Contact() {
  const { notify } = useApp();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }
    if (!form.message.trim() || form.message.trim().length < 5) {
      setErrorMsg("Please describe the issue in detail (at least 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/api/contact", {
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });

      setSuccessMsg("Thank you! Your technical support request has been submitted. Our team will review it and reply soon.");
      notify("Support request sent successfully.");
      setForm({ name: "", email: "", message: "" });
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "We couldn't send your request right now. Please try again or contact us by Phone or WhatsApp.";
      setErrorMsg(msg);
      notify(msg);
    } finally {
      setSubmitting(false);
    }
  };

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
        {/* Left Column: General Boutique Contacts */}
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

        {/* Right Column: Interactive Technical Support Form (3 Fields) */}
        <div className="bg-white rounded-2xl shadow-card p-6 md:p-8 flex flex-col justify-between border border-primary/5 h-fit">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent shrink-0">
                <Wrench size={19} />
              </span>
              <div>
                <h3 className="font-display text-xl font-semibold text-primary">Technical Support</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-accent">Website & App Issues</span>
              </div>
            </div>

            <p className="text-sm text-ink/75 leading-relaxed mt-2 mb-5">
              Having an issue with our website? Contact our technical support team for prompt assistance.
            </p>

            {successMsg && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs leading-relaxed">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2.5 p-3.5 mb-5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs leading-relaxed">
                <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Name <span className="text-accent">*</span>
                </label>
                <input
                  required
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Email <span className="text-accent">*</span>
                </label>
                <input
                  required
                  type="email"
                  placeholder="your.email@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm transition-colors"
                />
                <p className="text-[11px] text-ink/65 mt-1.5 leading-snug">
                  Don&apos;t have an email? Please contact us by{" "}
                  <a
                    href={`tel:${contactInfo.phoneHref}`}
                    className="font-semibold text-accent hover:underline inline-flex items-center gap-0.5"
                  >
                    Phone ({contactInfo.phone})
                  </a>{" "}
                  or{" "}
                  <a
                    href={contactInfo.whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-accent hover:underline inline-flex items-center gap-0.5"
                  >
                    WhatsApp
                  </a>
                  .
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-primary mb-1">
                  Message <span className="text-accent">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe the issue you are facing..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-primary" />
                    <span>Sending Message...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Send Message</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
