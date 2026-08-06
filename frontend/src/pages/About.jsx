import { motion } from "framer-motion";
import SectionHeading from "../components/SectionHeading";
import Counter from "../components/Counter";

const values = [
  { title: "Precision Fit", desc: "Every measurement checked twice before the first cut is made." },
  { title: "Honest Timelines", desc: "We commit to four stitching orders a day, so delivery dates hold." },
  { title: "Fair Pricing", desc: "Transparent costs for material, labor, and craft — no surprise markups." },
];

export default function About() {
  return (
    <div>
      <section className="relative h-[50vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/aboutstudio/1800/900')" }} />
        <div className="absolute inset-0 bg-primary/75" />
        <div className="relative z-10 max-w-4xl mx-auto px-5 text-center">
          <h1 className="font-display text-4xl md:text-6xl font-semibold text-bg mb-4">Our Story</h1>
          <p className="text-bg/80 max-w-xl mx-auto">
            From a single sewing machine on Amaravathi Road to a boutique studio trusted across Guntur.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 max-w-5xl mx-auto px-5 md:px-8">
        <SectionHeading align="left" eyebrow="Who We Are" title="Stitched with intention, since day one" />
        <p className="text-ink/70 leading-relaxed max-w-2xl mb-10">
          Lucky Couture started as a family tailoring table and grew into a small
          studio that now blends custom stitching with a curated ready-to-wear
          shop. We still believe the best clothing starts with a conversation
          about how you actually want to feel wearing it — then a needle,
          thread, and a lot of patience.
        </p>
        <div className="grid grid-cols-3 gap-6 max-w-md mb-16">
          <Counter to={15} suffix="+" label="Years" />
          <Counter to={4200} suffix="+" label="Garments" />
          <Counter to={980} suffix="+" label="Happy Clients" />
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {values.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.04, transition: { duration: 0.28, ease: "easeOut" } }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-card hover:shadow-soft p-6 cursor-default transition-shadow duration-300"
            >
              <h3 className="font-display text-lg font-semibold text-primary mb-2">{v.title}</h3>
              <p className="text-sm text-ink/65 leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
