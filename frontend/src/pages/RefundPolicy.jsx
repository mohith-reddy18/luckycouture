import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function RefundPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Refund Policy | Lucky Couture"
        description="Official refund policy for custom tailoring, ready-made boutique collections, advance payments, failed transactions, and fee treatments at Lucky Couture."
        canonical="/refund-policy"
        robots="index, follow"
      />
      <SectionHeading align="left" eyebrow="Legal &amp; Compliance" title="Refund Policy" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-7 mt-6">
        <p>
          At <strong>Lucky Couture</strong> ("we", "us", "our"), operating from Guntur, Andhra Pradesh, India, we are committed to delivering exceptional handcrafted tailoring and premium boutique fashion. This Refund Policy outlines the terms, conditions, timelines, and procedures governing refunds for products, bespoke stitching orders, advance payments, and platform charges across our website (<strong>https://www.luckycouture.in</strong>).
        </p>

        {/* 1. Payment Structure: 30% Advance & 70% Final */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">1. Payment Structure &amp; Advance Payment Model</h3>
          <p>
            Lucky Couture operates on a transparent split-payment structure for custom tailoring and bespoke stitching orders:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>30% Advance Payment:</strong> Collected at the time of order placement to reserve workshop capacity, draft personalized patterns, and procure custom fabrics, linings, and embroidery materials.
            </li>
            <li>
              <strong>70% Balance Payment:</strong> Payable upon stitching completion, prior to courier dispatch or during store pickup.
            </li>
            <li>
              <strong>Ready-Made Boutique Items:</strong> Paid 100% in full at checkout.
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink/70 bg-bg/60 p-3 rounded-xl border border-primary/10">
            <strong>Important Refund Calculation Rule:</strong> Where refunds are applicable, they are strictly calculated based on the <em>amount actually paid</em> by the customer at the time of cancellation, not the total estimated value of the full order. If only the 30% advance was paid, any refund is computed on that 30% advance amount.
          </p>
        </div>

        {/* 2. Custom Tailoring & Design Gallery Refunds */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">2. Custom Tailoring &amp; Design Gallery Orders</h3>
          <p>
            Because each bespoke garment is individually cut, tailored, and hand-finished according to custom measurements and specifications:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Standard Tailoring Orders:</strong> If a cancellation request is submitted within <strong>24 hours of order placement</strong> (and provided master tailors have not yet commenced cutting the fabric), you are eligible for a <strong>50% refund</strong> of the 30% advance payment paid. Once 24 hours have elapsed or cutting/stitching has started, the advance payment is non-refundable.
            </li>
            <li>
              <strong>Priority Stitching Orders:</strong> Due to immediate fabric allocation, express production scheduling, and dedicated tailor reservation, <strong>no refunds are provided at any cost</strong> once a Priority order is confirmed.
            </li>
            <li>
              <strong>Design Gallery Custom Orders:</strong> Bespoke garments booked through the Design Gallery follow standard tailoring refund conditions based on production status.
            </li>
          </ul>
        </div>

        {/* 3. Ready-Made Boutique Products */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">3. Ready-Made Boutique Products (Shop)</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Pre-Dispatch Cancellation:</strong> Ready-made product orders from our online Shop can be cancelled prior to courier dispatch for a <strong>100% full refund</strong> of the product purchase price.
            </li>
            <li>
              <strong>Post-Dispatch:</strong> Once a ready-made product has been dispatched and handed over to our courier partner, it cannot be cancelled or refunded unless received in a damaged or defective condition.
            </li>
            <li>
              <strong>Out-of-Stock Cancellations by Lucky Couture:</strong> If an ordered product is unavailable or fails our rigorous pre-dispatch quality checks, we will notify you immediately and issue a <strong>100% full refund</strong> (including any delivery and platform charges).
            </li>
          </ul>
        </div>

        {/* 4. Platform Fee Treatment */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">4. Platform Fee Treatment</h3>
          <p>
            Lucky Couture may apply a nominal customer-facing Platform Fee to support technology infrastructure, verified order management, and secure checkout:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Customer-Initiated Cancellations:</strong> The Platform Fee is strictly non-refundable for customer-requested cancellations.</li>
            <li><strong>Merchant-Initiated Cancellations:</strong> If Lucky Couture cancels an order due to operational constraints or stock unavailability, the Platform Fee is refunded in full (100%).</li>
          </ul>
        </div>

        {/* 5. Delivery & Shipping Charges */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">5. Delivery Charges Treatment</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Standard Orders:</strong> Delivery charges are 50% refundable if the order is cancelled within 24 hours of placement and prior to dispatch. Once an order is handed over to our courier partner, delivery charges are non-refundable.</li>
            <li><strong>Priority Orders:</strong> Delivery fees for priority stitching orders are non-refundable once booked.</li>
            <li><strong>Store Pickup:</strong> No delivery charges apply to store pickup orders.</li>
          </ul>
        </div>

        {/* 6. Complimentary Alterations Guarantee */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">6. Alterations Policy (Custom Stitching)</h3>
          <p>
            Custom tailored garments are non-returnable once stitched. However, to guarantee complete satisfaction with our craftsmanship, we provide <strong>one complimentary alteration</strong> within <strong>15 days of delivery</strong> if the fit requires adjustment.
          </p>
        </div>

        {/* 7. Failed & Duplicate Transactions */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">7. Failed or Duplicate Transactions</h3>
          <p>
            If your bank account or card was debited for a transaction that failed to generate an order confirmation, or if duplicate debits occurred due to a network glitch during checkout, the debited amount will be refunded automatically to your source account within <strong>5 to 7 business days</strong>.
          </p>
        </div>

        {/* 8. Mode of Refund & Processing Timeline (Razorpay Standard) */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">8. Mode of Refund &amp; Processing Timelines</h3>
          <p>
            All refunds are governed by the following standardized procedures:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Mode of Refund:</strong> Approved refunds are credited directly back to the <strong>original payment method / source account</strong> (Credit/Debit Card, Net Banking, UPI, or Digital Wallet) through our payment aggregator, Razorpay. We do not issue cash refunds for online payments.
            </li>
            <li>
              <strong>Refund Processing Timeline:</strong> Refunds are initiated by Lucky Couture within <strong>2 business days</strong> of cancellation approval. The refund amount will reflect in your source account/bank statement within <strong>5 to 7 business days</strong>, depending on your card issuer or banking partner's settlement cycle.
            </li>
          </ul>
        </div>

        {/* 9. Contact & Grievance Information */}
        <div className="pt-4 border-t border-primary/10 space-y-2">
          <h3 className="font-display text-base text-primary">9. How to Request a Refund / Contact Support</h3>
          <p>
            To request a cancellation or verify the status of a pending refund, please contact our support team with your Order ID:
          </p>
          <ul className="list-none pl-0 space-y-1.5 text-xs">
            <li>
              <strong>Operating Name:</strong> Lucky Couture
            </li>
            <li>
              <strong>Operational / Studio Address:</strong> {contactInfo.address}
            </li>
            <li>
              <strong>General Support Email:</strong>{" "}
              <a href={`mailto:${contactInfo.email}`} className="text-accent hover:underline font-medium">
                {contactInfo.email}
              </a>
            </li>
            <li>
              <strong>Technical &amp; Payment Support Email:</strong>{" "}
              <a href={`mailto:${contactInfo.techSupportEmail}`} className="text-accent hover:underline font-medium">
                {contactInfo.techSupportEmail}
              </a>
            </li>
            <li>
              <strong>Phone / WhatsApp:</strong>{" "}
              <a href={`tel:${contactInfo.phoneHref}`} className="text-accent hover:underline font-medium">
                {contactInfo.phone}
              </a>
            </li>
          </ul>
        </div>

        <p className="text-xs text-ink/50 pt-2 border-t border-primary/10">
          Last updated: August 2026. This Refund Policy is compliant with the Consumer Protection (E-Commerce) Rules, 2020 and Payment Aggregator compliance guidelines.
        </p>
      </div>
    </div>
  );
}
