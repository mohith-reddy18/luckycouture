import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Scissors, ShoppingBag, Crown, Palette, ArrowRight } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import Counter from "../components/Counter";
import FAQAccordion from "../components/FAQAccordion";
import Carousel from "../components/Carousel";
import SEO from "../components/SEO";
import TrustStats from "../components/TrustStats";
import { bestWork, faqs, heroSlides } from "../data/mockData";

const offerings = [
  {
    icon: Scissors,
    title: "Custom Tailoring",
    desc: "Bring your own fabric or choose ours — every garment cut and stitched to your exact measurements.",
    cta: "Book Tailoring Now",
    to: "/tailoring",
    image: "https://picsum.photos/seed/offertailor/700/900",
  },
  {
    icon: ShoppingBag,
    title: "Curated Shopping",
    desc: "Ready-to-wear sarees, dresses and boutique collections. Buy as-is or have any piece professionally tailored to your perfect fit.",
    cta: "Shop The Edit",
    to: "/shop",
    image: "https://picsum.photos/seed/offershop/700/900",
  },
  {
    icon: Crown,
    title: "Priority Stitching",
    desc: "Need it sooner? Choose Priority Stitching and receive your custom outfit in approximately 24–30 hours (subject to availability).",
    cta: "Book Priority",
    to: "/priority-stitching",
    image: "https://picsum.photos/seed/offerpriority/700/900",
  },
  {
    icon: Palette,
    title: "Design Gallery",
    desc: "Browse past work by category and book a similar design, custom-fit to your measurements.",
    cta: "Browse Designs",
    to: "/design-gallery",
    image: "https://picsum.photos/seed/offerdesign/700/900",
  },
];

export default function Home() {
  return (
    <div>
      <SEO
        title="Lucky Couture | Bespoke Tailoring & Fashion"
        description="Lucky Couture is a bespoke tailoring studio and women's fashion boutique in Guntur, Andhra Pradesh. Hand-finished bridal lehengas, maggam work blouses, designer sarees, and custom stitching."
        canonical="/"
      />
      {/* 1. Hero — compact banner on mobile, full hero on desktop */}
      <section className="relative h-[290px] min-[360px]:h-[310px] min-[390px]:h-[330px] min-[412px]:h-[345px] sm:h-[460px] md:h-[88vh] flex items-center overflow-hidden pt-4 pb-6 sm:py-16">
        <Carousel slides={heroSlides} />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/55 to-primary/25" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 md:px-8 w-full text-center flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-lg min-[360px]:text-xl min-[390px]:text-2xl sm:text-5xl md:text-7xl font-semibold text-bg leading-tight"
          >
            Clothes made for you, not the rack.
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mt-1.5 sm:mt-4 max-w-xl text-bg/90 leading-snug tracking-tight font-medium"
          >
            <p className="whitespace-nowrap sm:whitespace-normal text-[10px] min-[360px]:text-[11px] min-[390px]:text-xs sm:text-base md:text-lg">
              Measured and stitched for you, delivered on time.
            </p>
            <p className="text-[9px] min-[360px]:text-[10px] min-[390px]:text-xs sm:text-sm text-bg/80 mt-0.5 sm:mt-1.5 font-normal">
              Custom stitching and women's fashion, all in one place.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.18 }}
            className="mt-2.5 sm:mt-7 mb-2.5 sm:mb-0 flex flex-wrap items-center justify-center gap-2 sm:gap-4"
          >
            <Link
              to="/tailoring"
              className="group inline-flex items-center gap-1.5 bg-highlight text-primary font-semibold px-3.5 min-[360px]:px-4 py-1.5 min-[360px]:py-2 sm:px-7 sm:py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors text-[10px] min-[360px]:text-[11px] sm:text-base shadow-sm"
            >
              Book Tailoring
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform sm:w-4 sm:h-4" />
            </Link>
            <Link
              to="/priority-stitching"
              className="inline-flex items-center gap-1.5 border border-bg/40 text-bg px-3.5 min-[360px]:px-4 py-1.5 min-[360px]:py-2 sm:px-7 sm:py-3.5 rounded-full hover:bg-bg/10 transition-colors text-[10px] min-[360px]:text-[11px] sm:text-base"
            >
              Priority Stitching
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Trust & Experience Statistics */}
      <TrustStats />

      {/* 2. About — centered, no image */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <SectionHeading
            eyebrow="About Us"
            title="A tailor's needle, a boutique's eye."
            subtitle="Lucky Couture began as a single sewing machine on Amaravathi Road. Today it's a small studio where every garment — stitched fresh or picked off the shelf — passes through the same hands that started it all, so fit and finish never get compromised for speed."
          />
          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-md mx-auto items-center justify-center">
            <Counter to={15} suffix="+" label="Years" />
            <Counter to={4200} suffix="+" label="Garments" />
            <Counter to={4} label="Daily Slots" />
          </div>
        </div>
      </section>

      {/* 3. What We Offer */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeading eyebrow="What We Offer" title="Everything you need, beautifully stitched" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7">
            {offerings.map((o, i) => (
              <motion.div
                key={o.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }}
                viewport={{ once: true, margin: "-60px" }}
                whileHover={{ scale: 1.06, transition: { duration: 0.28, ease: "easeOut" } }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="relative rounded-2xl overflow-hidden shadow-card cursor-pointer h-80 group"
              >
                <Link to={o.to} className="flex flex-col h-full">
                  <img
                    src={o.image}
                    alt={o.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/55 to-primary/20" />
                  <div className="relative z-10 flex flex-col h-full p-6">
                    <span className="w-11 h-11 rounded-full bg-highlight/90 flex items-center justify-center text-center shrink-0 leading-none mb-4">
                      <o.icon size={18} className="text-primary shrink-0" />
                    </span>
                    <h3 className="font-display text-lg font-semibold text-bg mb-2">{o.title}</h3>
                    <p className="text-xs text-bg/75 leading-relaxed flex-1">{o.desc}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-highlight">
                      {o.cta} <ArrowRight size={14} />
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Our Best Work — simple: heading on card, indented photo below */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeading light eyebrow="Our Best Work" title="Recently off the table" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7">
            {bestWork.map((w, i) => (
              <motion.div
                key={w.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: (i % 3) * 0.1 } }}
                viewport={{ once: true, margin: "-60px" }}
                whileHover={{ scale: 1.05, transition: { duration: 0.28, ease: "easeOut" } }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="bg-bg rounded-2xl p-4 md:p-5 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.35)] hover:shadow-[0_14px_34px_-8px_rgba(206,160,126,0.65)] transition-shadow duration-300"
              >
                <p className="text-secondary text-[11px] uppercase tracking-widest mb-1">{w.subtitle}</p>
                <h3 className="font-display text-lg md:text-xl text-primary font-semibold mb-4">{w.title}</h3>
                <div className="rounded-xl overflow-hidden aspect-[4/5]">
                  <img
                    src={w.image}
                    alt={w.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FAQ */}
      <section id="faq" className="py-20 md:py-28 scroll-mt-24">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
          <FAQAccordion items={faqs} />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="relative rounded-3xl bg-primary overflow-hidden px-8 py-14 md:py-20 text-center">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_80%,white,transparent_35%)]" />
            <h2 className="relative font-display text-3xl md:text-4xl font-semibold text-bg mb-4">
              Ready for a fit that's actually yours?
            </h2>
            <p className="relative text-bg/70 max-w-md mx-auto mb-8">
              Slots fill up fast — we only take four stitching orders a day to keep every piece precise.
            </p>
            <Link
              to="/tailoring"
              className="relative inline-flex items-center gap-2 bg-highlight text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors"
            >
              Book Your Slot <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
