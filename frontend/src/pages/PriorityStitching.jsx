import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, ShieldCheck, Star, Crown, ArrowRight, Check } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import FAQAccordion from "../components/FAQAccordion";

const features = [
  {
    icon: Zap,
    title: "Faster Delivery",
    desc: "Receive your stitched outfit in approximately 24–30 hours instead of the standard queue.",
  },
  {
    icon: Crown,
    title: "Same Premium Quality",
    desc: "Every garment gets the same attention to detail and finishing as our regular stitching service.",
  },
  {
    icon: Star,
    title: "Reserved Priority Slots",
    desc: "Priority orders are limited each day so quality never gets compromised for speed.",
  },
  {
    icon: ShieldCheck,
    title: "Subject to Availability",
    desc: "Priority bookings depend on available production capacity on a given day.",
  },
];

const steps = [
  { title: "Fill Priority Stitching Form", desc: "Tell us the garment, fabric, and measurements." },
  { title: "We Review Availability", desc: "We check today's priority capacity for your slot." },
  { title: "Receive Confirmation", desc: "You get a confirmed 24–30 hour delivery window." },
  { title: "Garment Delivered", desc: "Your outfit arrives, stitched to the same premium standard." },
];

const comparison = [
  { label: "Estimated Delivery", standard: "Flexible", priority: "24–30 Hours*" },
  { label: "Queue Position", standard: "Normal", priority: "Highest Priority" },
  { label: "Additional Charges", standard: "No", priority: "40–50%" },
  { label: "Availability", standard: "Always", priority: "Limited Slots" },
  { label: "Quality", standard: "Premium", priority: "Premium" },
];

const faqs = [
  {
    q: "Can every garment be stitched within 24 hours?",
    a: "Most single garments can be — complex embroidery or maggam work may need a little longer, which we'll confirm before approving your priority booking.",
  },
  {
    q: "How much extra does Priority Stitching cost?",
    a: "A surcharge of approximately 40–50% applies on top of the standard stitching charge. The exact amount depends on garment complexity and is confirmed before your order is approved.",
  },
  {
    q: "Can Priority orders be cancelled?",
    a: "Yes, you can cancel before we begin cutting your fabric. Once stitching has started, cancellation isn't possible.",
  },
  {
    q: "Will quality be reduced for faster delivery?",
    a: "No. Priority orders go through the same tailoring and quality-check process — we simply reserve dedicated production time for them.",
  },
  {
    q: "What if no Priority slots are available?",
    a: "You can choose the next available Priority date, or continue with Standard Stitching at our usual pace.",
  },
];

export default function PriorityStitching() {
  const navigate = useNavigate();
  const howItWorksRef = useRef(null);

  const scrollToHowItWorks = () => {
    howItWorksRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const goToBooking = () => {
    navigate("/tailoring", { state: { priority: true } });
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-[70vh] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('https://picsum.photos/seed/priorityhero/1800/1100')" }}
        />
        <div className="absolute inset-0 bg-primary/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/40 to-primary/10" />

        <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-8 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 text-highlight text-xs tracking-[0.35em] uppercase mb-5"
          >
            <Crown size={14} /> Premium Service
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl md:text-6xl font-semibold text-bg leading-[1.1]"
          >
            Priority Stitching
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-5 text-bg/85 text-base md:text-lg leading-relaxed"
          >
            Need your outfit sooner? Skip the standard queue and receive your
            garment in approximately 24–30 hours with our Priority Stitching Service.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <button
              onClick={goToBooking}
              className="group inline-flex items-center gap-2 bg-highlight text-primary font-semibold px-7 py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors"
            >
              Book Priority Stitching
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={scrollToHowItWorks}
              className="inline-flex items-center gap-2 border border-bg/40 text-bg px-7 py-3.5 rounded-full hover:bg-bg/10 transition-colors"
            >
              How It Works
            </button>
          </motion.div>
        </div>
      </section>

      {/* Why choose */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeading eyebrow="Why Priority Stitching" title="Built for when you can't wait" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-7">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0, transition: { duration: 0.5, delay: i * 0.08 } }}
                viewport={{ once: true, margin: "-60px" }}
                whileHover={{ scale: 1.05, transition: { duration: 0.28, ease: "easeOut" } }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="bg-white rounded-2xl p-7 shadow-card hover:shadow-soft transition-shadow"
              >
                <span className="w-12 h-12 rounded-full bg-highlight/60 flex items-center justify-center mb-5">
                  <f.icon size={20} className="text-primary" />
                </span>
                <h3 className="font-display text-lg font-semibold text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-ink/65 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={howItWorksRef} className="py-20 md:py-28 bg-white scroll-mt-24">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <SectionHeading eyebrow="Process" title="How it works" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative text-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary text-highlight flex items-center justify-center font-display text-lg font-semibold mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-display text-base font-semibold text-primary mb-1.5">{s.title}</h3>
                <p className="text-xs text-ink/60 leading-relaxed">{s.desc}</p>
                {i < steps.length - 1 && (
                  <span className="hidden lg:block absolute top-6 left-[calc(50%+30px)] w-[calc(100%-60px)] h-px bg-accent/30" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 md:py-28">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-3xl shadow-soft p-8 md:p-10 text-center border border-accent/15"
          >
            <span className="inline-flex items-center gap-1.5 bg-highlight text-primary text-xs font-semibold uppercase tracking-wider px-4 py-1.5 rounded-full mb-5">
              Approx. 40–50% Extra
            </span>
            <h3 className="font-display text-2xl font-semibold text-primary mb-3">Priority Service Charge</h3>
            <p className="text-sm text-ink/65 leading-relaxed mb-6">
              Priority stitching includes an additional premium service fee. The
              exact surcharge is determined based on workload and garment
              complexity.
            </p>
            <p className="text-xs text-secondary">Final pricing is confirmed before order approval.</p>
          </motion.div>
        </div>
      </section>

      {/* Availability */}
      <section className="py-20 md:py-28 bg-primary">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <SectionHeading
            light
            eyebrow="Availability"
            title="Reserved for a limited number of orders each day"
            subtitle="Priority Stitching is available only when production slots are open. If today's slots are full, you can choose the next available Priority date or continue with Standard Stitching."
          />
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <SectionHeading eyebrow="Compare" title="Standard vs Priority" />
          <div className="bg-white rounded-2xl shadow-card overflow-hidden">
            <div className="grid grid-cols-3 bg-bg text-xs sm:text-sm font-semibold text-primary">
              <div className="p-3.5 sm:p-4">&nbsp;</div>
              <div className="p-3.5 sm:p-4 text-center">Standard</div>
              <div className="p-3.5 sm:p-4 text-center bg-highlight/40">Priority</div>
            </div>
            {comparison.map((row, i) => (
              <div
                key={row.label}
                className={`grid grid-cols-3 text-xs sm:text-sm ${i % 2 === 0 ? "bg-white" : "bg-bg/50"}`}
              >
                <div className="p-3.5 sm:p-4 font-medium text-primary">{row.label}</div>
                <div className="p-3.5 sm:p-4 text-center text-ink/65">{row.standard}</div>
                <div className="p-3.5 sm:p-4 text-center text-primary font-medium bg-highlight/10 flex items-center justify-center gap-1">
                  {row.priority}
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink/45 mt-3">*Delivery depends on garment complexity and slot availability.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-28 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <SectionHeading eyebrow="FAQ" title="Priority Stitching questions" />
          <FAQAccordion items={faqs} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="relative rounded-3xl bg-primary overflow-hidden px-8 py-14 md:py-20 text-center">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_20%_20%,white,transparent_35%),radial-gradient(circle_at_80%_80%,white,transparent_35%)]" />
            <span className="relative inline-flex items-center gap-1.5 text-highlight text-xs tracking-[0.3em] uppercase mb-4">
              <Check size={14} /> Slots update daily
            </span>
            <h2 className="relative font-display text-3xl md:text-4xl font-semibold text-bg mb-4">
              Ready to skip the queue?
            </h2>
            <p className="relative text-bg/70 max-w-md mx-auto mb-8">
              Reserve one of today's Priority Stitching slots before they fill up.
            </p>
            <button
              onClick={goToBooking}
              className="relative inline-flex items-center gap-2 bg-highlight text-primary font-semibold px-8 py-3.5 rounded-full hover:bg-accent hover:text-white transition-colors"
            >
              Book Priority Stitching <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
