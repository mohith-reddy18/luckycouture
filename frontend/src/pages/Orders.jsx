import { Package, Scissors, ShoppingBag } from "lucide-react";
import SectionHeading from "../components/SectionHeading";
import { orders } from "../data/mockData";

const statusColor = {
  Delivered: "bg-green-100 text-green-700",
  "In Progress": "bg-highlight/60 text-primary",
  Cancelled: "bg-red-100 text-red-600",
};

export default function Orders() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SectionHeading align="left" eyebrow="Track" title="Your Orders" />
      <div className="flex flex-col gap-4">
        {orders.map((o) => (
          <div key={o.id} className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4">
            <span className="w-11 h-11 rounded-full bg-bg flex items-center justify-center shrink-0">
              {o.type === "Stitching" ? <Scissors size={18} className="text-accent" /> : <ShoppingBag size={18} className="text-accent" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-base font-medium text-primary">{o.item}</p>
                <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium ${statusColor[o.status]}`}>{o.status}</span>
              </div>
              <p className="text-xs text-ink/50 mt-1">
                {o.id} · Placed {o.date} · {o.status === "Delivered" ? "Delivered" : "ETA"} {o.eta}
              </p>
            </div>
            <p className="font-semibold text-primary shrink-0">₹{o.amount.toLocaleString("en-IN")}</p>
          </div>
        ))}
      </div>
      {orders.length === 0 && (
        <div className="text-center py-20">
          <Package size={36} className="mx-auto text-primary/30 mb-4" />
          <p className="text-ink/60">No orders yet.</p>
        </div>
      )}
    </div>
  );
}
