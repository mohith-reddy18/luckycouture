import { useState } from "react";
import { Phone, Mail, MessageCircle, MapPin, Send, HelpCircle } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import { useApp } from "../context/AppContext";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function Contact() {
  const { notify } = useApp();
  const [form, setForm] = useState({ name: "", email: "", message: "" });

  const submit = (e) => {
    e.preventDefault();
    notify("Message sent — we'll reply soon");
    setForm({ name: "", email: "", message: "" });
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
              <p className="text-xs uppercase tracking-wide text-secondary">Email</p>
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
            <div className="w-full h-64 overflow-hidden">
              <iframe
                title="Lucky Couture location on Google Maps"
                src={`https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d1914.7!2d${contactInfo.lng}!3d${contactInfo.lat}!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTbCsDE5JzE4LjciTiA4MMKwMjYnMTAuNyJF!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin`}
                className="w-full h-full border-0 block"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white rounded-2xl shadow-card p-5">
            <span className="w-11 h-11 rounded-full bg-highlight/50 flex items-center justify-center"><HelpCircle size={18} className="text-primary" /></span>
            <div>
              <p className="text-xs uppercase tracking-wide text-secondary">Help Desk</p>
              <p className="font-medium text-primary text-sm">Questions about an order, sizing, or delivery? Message us any time — we usually reply within a few hours.</p>
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-card p-6 md:p-8 h-fit">
          <h3 className="font-display text-lg font-semibold text-primary mb-5">Send a message</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-xs text-ink/60 mb-1.5">Name</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1.5">Email</label>
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm" />
            </div>
            <div>
              <label className="block text-xs text-ink/60 mb-1.5">Message</label>
              <textarea required rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-primary/15 focus:border-accent outline-none text-sm" />
            </div>
            <button type="submit" className="flex items-center justify-center gap-2 bg-highlight text-primary font-semibold py-3 rounded-full hover:bg-accent hover:text-white transition-colors">
              <Send size={15} /> Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
