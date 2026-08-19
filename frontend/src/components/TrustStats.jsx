import { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, PackageCheck, Star, ShieldCheck } from "lucide-react";
import SectionHeading from "./SectionHeading";
import api from "../utils/api";

function StatCounter({ value, decimals = 0, suffix = "", duration = 1.4 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-30px" });
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    if (!inView || value === undefined || value === null) return;
    const num = Number(value);
    if (isNaN(num) || num === 0) {
      setDisplayVal(0);
      return;
    }

    let start = null;
    let raf;
    const step = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = eased * num;
      setDisplayVal(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
      if (progress < 1) {
        raf = requestAnimationFrame(step);
      } else {
        setDisplayVal(decimals > 0 ? parseFloat(num.toFixed(decimals)) : num);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, decimals, duration]);

  return (
    <span ref={ref} className="font-display text-2xl min-[400px]:text-3xl sm:text-4xl font-bold text-primary tracking-tight">
      {decimals > 0 ? displayVal.toFixed(decimals) : displayVal}
      {suffix}
    </span>
  );
}

export default function TrustStats({ className = "" }) {
  const [stats, setStats] = useState({
    customersServed: 0,
    completedOrders: 0,
    overallRating: 5.0,
    customerSatisfaction: 100,
    totalReviews: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const res = await api.get("/api/stats");
        if (mounted && res?.data) {
          setStats(res.data);
        }
      } catch (err) {
        // Keep initial fallback values silently if server is unavailable
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchStats();
    return () => {
      mounted = false;
    };
  }, []);

  const items = [
    {
      icon: Users,
      label: "Customers Served",
      value: stats.customersServed,
      suffix: stats.customersServed > 0 ? "+" : "",
      decimals: 0,
      detail: "Customers who chose Lucky Couture",
    },
    {
      icon: PackageCheck,
      label: "Completed Orders",
      value: stats.completedOrders,
      suffix: stats.completedOrders > 0 ? "+" : "",
      decimals: 0,
      detail: "Delivered garments & outfits",
    },
    {
      icon: Star,
      label: "Overall Rating",
      value: stats.overallRating || 5.0,
      suffix: " / 5",
      decimals: 1,
      detail: stats.totalReviews > 0 ? `From ${stats.totalReviews} verified review${stats.totalReviews > 1 ? "s" : ""}` : "Verified client feedback",
    },
    {
      icon: ShieldCheck,
      label: "Customer Satisfaction",
      value: stats.customerSatisfaction || 100,
      suffix: "%",
      decimals: 0,
      detail: "4 & 5-star verified ratings",
    },
  ];

  return (
    <section className={`py-16 md:py-24 bg-bg border-y border-primary/10 relative overflow-hidden ${className}`}>
      {/* Subtle backdrop pattern */}
      <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#443742_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        <SectionHeading
          title="Trusted by Our Customers"
          subtitle="Quality tailoring, trusted service, and customer satisfaction."
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: index * 0.08, ease: "easeOut" }}
                className="bg-white/90 backdrop-blur-xs rounded-2xl p-3.5 min-[400px]:p-4 sm:p-5 border border-primary/10 shadow-xs hover:border-primary/20 hover:shadow-card transition-all duration-200 flex flex-col items-center text-center justify-between"
              >
                <div className="w-8 h-8 min-[400px]:w-9 min-[400px]:h-9 rounded-xl bg-highlight/30 text-accent flex items-center justify-center mb-2 sm:mb-3 shrink-0">
                  <Icon size={18} className="text-accent" />
                </div>

                <div className="my-0.5 sm:my-1">
                  <StatCounter value={item.value} decimals={item.decimals} suffix={item.suffix} />
                </div>

                <p className="text-[10px] min-[400px]:text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-secondary mt-1 line-clamp-1">
                  {item.label}
                </p>
                <p className="text-[9px] min-[400px]:text-[10px] text-ink/50 mt-0.5 hidden min-[400px]:block">
                  {item.detail}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
