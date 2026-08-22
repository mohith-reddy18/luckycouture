import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function CancellationPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Cancellation Policy | Lucky Couture"
        description="Understand the cancellation terms for standard tailoring, priority stitching, boutique shop orders, and design gallery requests at Lucky Couture."
        canonical="/cancellation-policy"
        robots="index, follow"
      />
      <SectionHeading align="left" eyebrow="Legal &amp; Compliance" title="Cancellation Policy" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-6">
        <p>
          Lucky Couture delivers individualized bespoke tailoring and curated boutique apparel. Because our custom stitching services involve immediate labor scheduling, fabric cutting, and personalized design work, cancellation eligibility depends on the type of order and its current production status.
        </p>

        {/* 1. Standard Custom Tailoring Orders */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">1. Standard Tailoring Orders</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Cancellation within 24 Hours:</strong> You may request to cancel a standard tailoring booking within <strong>24 hours of placement</strong> (provided fabric cutting has not begun). In this window, you will receive a <strong>50% refund</strong> of the 30% advance payment paid.
            </li>
            <li>
              <strong>After 24 Hours / Post-Cutting:</strong> Once 24 hours have elapsed or our master tailors have begun cutting the fabric according to your measurements, the order <strong>cannot be cancelled</strong> and the advance payment is non-refundable.
            </li>
          </ul>
        </div>

        {/* 2. Priority Stitching Orders */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">2. Priority Stitching Orders</h3>
          <p>
            Priority Stitching orders receive dedicated queue prioritization, immediate workshop slot reservation, and same-day/expedited production setup.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Strict Non-Cancellable Policy:</strong> Priority stitching bookings <strong>cannot be cancelled</strong> at any cost once submitted and confirmed.
            </li>
            <li>
              All priority surcharges, advance payments, and associated booking fees are non-refundable.
            </li>
          </ul>
        </div>

        {/* 3. Ready-Made Boutique Products */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">3. Ready-Made Boutique Shop Orders</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Before Dispatch:</strong> Ready-made fashion items ordered from our Shop can be cancelled free of charge at any time prior to handover to our courier partner.
            </li>
            <li>
              <strong>After Dispatch:</strong> Once the product has been dispatched and tracking information is issued, cancellation is no longer possible.
            </li>
          </ul>
        </div>

        {/* 4. Design Gallery Custom Orders */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">4. Design Gallery Custom Requests</h3>
          <p>
            Custom orders placed from our Design Gallery follow the standard tailoring cancellation rules. Cancellation requests must be made within 24 hours of order placement and prior to pattern drafting/fabric cutting.
          </p>
        </div>

        {/* 5. Cancellation by Lucky Couture */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">5. Cancellations Initiated by Lucky Couture</h3>
          <p>
            We reserve the right to cancel an order under exceptional circumstances, including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Unavailability of selected fabric or specialized embroidery materials.</li>
            <li>Unresolvable measurement ambiguities after repeated customer contact attempts.</li>
            <li>Unexpected studio capacity constraints.</li>
          </ul>
          <p className="mt-2">
            In any such instance, we will notify you promptly and provide a <strong>100% full refund</strong> of all payments received (including advance payments, delivery fees, and platform fees).
          </p>
        </div>

        {/* 6. How to Request a Cancellation */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">6. How to Request a Cancellation</h3>
          <p>
            To cancel an eligible order, please contact our support team immediately with your Order ID:
          </p>
          <ul className="list-none pl-0 space-y-1 mt-2 text-xs">
            <li>
              <strong>WhatsApp / Phone:</strong>{" "}
              <a href={contactInfo.whatsappHref} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                {contactInfo.phone}
              </a>
            </li>
            <li>
              <strong>Email:</strong>{" "}
              <a href={`mailto:${contactInfo.email}`} className="text-accent hover:underline">
                {contactInfo.email}
              </a>
            </li>
            <li>
              <strong>Studio Address:</strong> {contactInfo.address}
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink/70">
            For fastest response on time-sensitive cancellations within the 24-hour window, we recommend contacting us directly via WhatsApp or phone.
          </p>
        </div>

        <p className="text-xs text-ink/50 pt-4 border-t border-primary/10">
          Last updated: August 2026. This policy operates in conjunction with our <a href="/terms" className="text-accent hover:underline">Terms &amp; Conditions</a> and <a href="/refund-policy" className="text-accent hover:underline">Refund Policy</a>.
        </p>
      </div>
    </div>
  );
}
