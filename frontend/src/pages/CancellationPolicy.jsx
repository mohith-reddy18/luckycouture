import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function CancellationPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Cancellation Policy | Lucky Couture"
        description="Understand the official cancellation terms for standard tailoring, priority stitching, boutique shop orders, and design gallery requests at Lucky Couture."
        canonical="/cancellation-policy"
        robots="index, follow"
      />
      <SectionHeading align="left" eyebrow="Legal &amp; Compliance" title="Cancellation Policy" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-7 mt-6">
        <p>
          At <strong>Lucky Couture</strong> ("we", "us", "our"), based in Guntur, Andhra Pradesh, India, we offer bespoke custom tailoring as well as curated ready-made fashion. Because custom tailoring involves immediate labor scheduling, fabric cutting, and personalized pattern drafting, cancellation rules vary based on the service type and production status.
        </p>

        {/* 1. Standard Custom Tailoring Orders */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">1. Standard Tailoring Orders</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Cancellation within 24 Hours:</strong> You may cancel a standard tailoring booking within <strong>24 hours of order placement</strong> (provided our master tailors have not yet commenced cutting the fabric). In this case, you will receive a <strong>50% refund</strong> of the 30% advance payment paid.
            </li>
            <li>
              <strong>After 24 Hours / Post-Cutting:</strong> Once 24 hours have elapsed from order placement or our workshop has begun cutting the fabric according to your measurements, the order <strong>cannot be cancelled</strong> and the advance payment is non-refundable.
            </li>
          </ul>
        </div>

        {/* 2. Priority Stitching Orders */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">2. Priority Stitching Orders</h3>
          <p>
            Priority Stitching orders receive dedicated workshop queue prioritization, express fabric allocation, and expedited same-day/next-day production setup.
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

        {/* 3. Ready-Made Boutique Products (Shop) */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">3. Ready-Made Boutique Shop Orders</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Before Dispatch:</strong> Ready-made apparel purchased from our online Shop can be cancelled free of charge at any time prior to courier dispatch for a <strong>100% full refund</strong>.
            </li>
            <li>
              <strong>After Dispatch:</strong> Once the product has been dispatched and handed over to our courier partner with tracking generated, cancellation is no longer possible.
            </li>
          </ul>
        </div>

        {/* 4. Design Gallery Custom Orders */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">4. Design Gallery Custom Orders</h3>
          <p>
            Custom orders placed from our Design Gallery follow the standard custom tailoring cancellation terms. Cancellation requests must be submitted within <strong>24 hours of order placement</strong> and prior to pattern drafting or fabric cutting.
          </p>
        </div>

        {/* 5. Cancellations Initiated by Lucky Couture */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">5. Cancellations Initiated by Lucky Couture</h3>
          <p>
            Lucky Couture reserves the right to cancel an order under exceptional operational circumstances, including:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>Unavailability of selected fabrics, trims, or specialized embroidery materials.</li>
            <li>Unresolvable measurement ambiguities after multiple customer consultation attempts.</li>
            <li>Unforeseen studio capacity constraints or force majeure events.</li>
          </ul>
          <p className="mt-2">
            In any such instance, we will notify you immediately and issue a <strong>100% full refund</strong> of all payments received (including advance payments, delivery fees, and platform fees) within <strong>5 to 7 business days</strong>.
          </p>
        </div>

        {/* 6. How to Request a Cancellation */}
        <div className="pt-4 border-t border-primary/10 space-y-2">
          <h3 className="font-display text-base text-primary">6. How to Request a Cancellation &amp; Contact Support</h3>
          <p>
            To request a cancellation, please contact our support team immediately with your Order ID:
          </p>
          <ul className="list-none pl-0 space-y-1.5 text-xs">
            <li>
              <strong>Operating Name:</strong> Lucky Couture
            </li>
            <li>
              <strong>Operational / Studio Address:</strong> {contactInfo.address}
            </li>
            <li>
              <strong>Phone / WhatsApp Support:</strong>{" "}
              <a href={contactInfo.whatsappHref} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline font-medium">
                {contactInfo.phone}
              </a>{" "}
              <em>(Recommended for fastest response within the 24-hour window)</em>
            </li>
            <li>
              <strong>General Support Email:</strong>{" "}
              <a href={`mailto:${contactInfo.email}`} className="text-accent hover:underline font-medium">
                {contactInfo.email}
              </a>
            </li>
            <li>
              <strong>Technical Support Email:</strong>{" "}
              <a href={`mailto:${contactInfo.techSupportEmail}`} className="text-accent hover:underline font-medium">
                {contactInfo.techSupportEmail}
              </a>
            </li>
            <li>
              <strong>In-App Support:</strong> Customers may also initiate support requests directly through the <a href="/support" className="text-accent hover:underline font-medium">Help &amp; Support</a> portal.
            </li>
          </ul>
        </div>

        <p className="text-xs text-ink/50 pt-2 border-t border-primary/10">
          Last updated: August 2026. This policy operates in conjunction with our <a href="/terms" className="text-accent hover:underline font-medium">Terms &amp; Conditions</a> and <a href="/refund-policy" className="text-accent hover:underline font-medium">Refund Policy</a>.
        </p>
      </div>
    </div>
  );
}
