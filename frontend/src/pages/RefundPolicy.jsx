import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function RefundPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Refund Policy | Lucky Couture"
        description="Review the official refund policy for custom tailoring, ready-made boutique fashion, advance payments, and fee treatments at Lucky Couture."
        canonical="/refund-policy"
        robots="index, follow"
      />
      <SectionHeading align="left" eyebrow="Legal &amp; Compliance" title="Refund Policy" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-6">
        <p>
          At Lucky Couture, we take immense pride in crafting bespoke, handcrafted women's garments and delivering premium boutique fashion. This Refund Policy outlines the terms and conditions governing refunds across our custom tailoring services, ready-made collections, advance payments, and platform charges.
        </p>

        {/* 1. Payment Structure: 30% Advance & 70% Final */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">1. Payment Structure &amp; Advance Payments</h3>
          <p>
            Lucky Couture operates on a split-payment model for custom stitching and bespoke tailoring orders:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>30% Advance Payment:</strong> Collected at the time of order placement to reserve workshop capacity, initiate pattern design, and procure bespoke materials/trims.
            </li>
            <li>
              <strong>70% Balance Payment:</strong> Payable upon stitching completion, prior to final dispatch or during store pickup.
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink/70">
            <em>Note:</em> Where applicable, refund calculations are strictly based on the amount actually paid by the customer at the time of cancellation, not the total estimated value of the full order.
          </p>
        </div>

        {/* 2. Custom Tailoring & Design Gallery Refunds */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">2. Custom Tailoring &amp; Design Gallery Orders</h3>
          <p>
            Because each bespoke piece is individually cut, tailored, and hand-finished according to custom measurements and specifications:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Standard Tailoring Orders:</strong> If a cancellation request is submitted within <strong>24 hours of ordering</strong> (and before cutting has commenced on your fabric), you are eligible for a <strong>50% refund</strong> of the 30% advance payment paid. Once 24 hours have elapsed or cutting/stitching has started, the advance payment is non-refundable.
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
              <strong>Pre-Dispatch Cancellation:</strong> Ready-made product orders from our boutique shop can be cancelled prior to dispatch with a full refund of the product purchase price.
            </li>
            <li>
              <strong>Out-of-Stock Cancellations by Lucky Couture:</strong> If an ordered product is unavailable or fails pre-dispatch quality checks, we will notify you immediately and issue a <strong>100% full refund</strong> (including any delivery and platform charges).
            </li>
          </ul>
        </div>

        {/* 4. Platform Fee Treatment */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">4. Platform Fee</h3>
          <p>
            Lucky Couture may apply a nominal customer-facing Platform Fee to support technology infrastructure, secure digital checkout, and verified order management.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Customer-Initiated Cancellations:</strong> The Platform Fee is strictly non-refundable for customer-requested cancellations.
            </li>
            <li>
              <strong>Merchant-Initiated Cancellations:</strong> If Lucky Couture cancels an order due to operational constraints or stock unavailability, the Platform Fee is refunded in full (100%).
            </li>
          </ul>
        </div>

        {/* 5. Delivery & Shipping Charges */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">5. Delivery Charges</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Standard Orders:</strong> Delivery charges are 50% refundable if the order is cancelled within 24 hours and before dispatch. Once an order is handed over to our courier partner, delivery charges are non-refundable.
            </li>
            <li>
              <strong>Priority Orders:</strong> Delivery fees for priority stitching orders are non-refundable once booked.
            </li>
            <li>
              <strong>Store Pickup:</strong> No delivery charges apply to store pickup orders.
            </li>
          </ul>
        </div>

        {/* 6. Free Alterations Support */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">6. Alterations Policy</h3>
          <p>
            Custom tailored garments are non-returnable once stitched. However, to guarantee complete satisfaction, we provide <strong>one complimentary alteration</strong> within <strong>15 days of delivery</strong> if the fit requires adjustment.
          </p>
        </div>

        {/* 7. Failed & Duplicate Transactions */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">7. Failed or Duplicate Transactions</h3>
          <p>
            If your account was debited for a transaction that failed to generate an order confirmation, or if duplicate debits occurred due to a network glitch, the debited amount will be refunded automatically to your source account within <strong>5 to 7 business days</strong>.
          </p>
        </div>

        {/* 8. Refund Processing Timeline */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">8. Refund Processing Timeline</h3>
          <p>
            Approved refunds are initiated within 2 business days of request validation and processed back to the original payment source (credit/debit card, UPI, net banking, or wallet) via our banking and payment gateway partners. The funds typically reflect in your account within <strong>5 to 7 business days</strong>, subject to your bank's processing cycles.
          </p>
        </div>

        {/* 9. Contact & Support */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">9. Contact &amp; Support</h3>
          <p>
            To request a cancellation, verify refund status, or discuss any order queries, please reach out to our team:
          </p>
          <ul className="list-none pl-0 space-y-1.5 mt-2 text-xs">
            <li>
              <strong>General Support:</strong>{" "}
              <a href={`mailto:${contactInfo.email}`} className="text-accent hover:underline font-medium">
                {contactInfo.email}
              </a>
            </li>
            <li>
              <strong>Technical Support:</strong>{" "}
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
            <li>
              <strong>Studio Address:</strong> {contactInfo.address}
            </li>
          </ul>
        </div>

        <p className="text-xs text-ink/50 pt-4 border-t border-primary/10">
          Last updated: August 2026. This policy is compliant with applicable Indian consumer protection and digital payment regulations.
        </p>
      </div>
    </div>
  );
}
