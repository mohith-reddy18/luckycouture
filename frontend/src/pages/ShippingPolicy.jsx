import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function ShippingPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Shipping & Delivery Policy | Lucky Couture"
        description="Learn about shipping options, delivery charges, local Guntur 24-hour delivery, pan-India courier transit times, and store pickup at Lucky Couture."
        canonical="/shipping-policy"
        robots="index, follow"
      />
      <SectionHeading align="left" eyebrow="Legal &amp; Compliance" title="Shipping &amp; Delivery Policy" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-7 mt-6">
        <p>
          At <strong>Lucky Couture</strong> ("we", "us", "our"), based in Guntur, Andhra Pradesh, India, we are committed to delivering your custom tailored creations and boutique apparel safely and promptly. This Shipping &amp; Delivery Policy details our fulfillment timelines, delivery partners, shipping fees, tracking procedures, and store pickup options.
        </p>

        {/* 1. Service Coverage */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">1. Delivery Coverage &amp; Service Areas</h3>
          <p>
            Lucky Couture ships products and custom tailored orders across <strong>all serviceable PIN codes in India</strong>. Currently, we operate strictly within the domestic territory of India and do not offer direct international shipping.
          </p>
        </div>

        {/* 2. Order Processing & Craftsmanship Timelines */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">2. Processing &amp; Production Timelines</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Ready-Made Boutique Apparel (Shop):</strong> Orders are processed and dispatched within <strong>1 to 2 business days</strong> of payment confirmation.
            </li>
            <li>
              <strong>Standard Custom Tailoring:</strong> Custom stitching orders require <strong>5 to 10 business days</strong> for precision pattern drafting, fabric cutting, stitching, hand embroidery (if applicable), and quality checks prior to dispatch.
            </li>
            <li>
              <strong>Priority Stitching Orders:</strong> Handcrafted under an express timeline, typically completed within <strong>2 to 4 business days</strong> as confirmed by our team.
            </li>
          </ul>
        </div>

        {/* 3. Delivery Modes & Transit Timelines */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">3. Delivery Options &amp; Transit Timelines</h3>
          <div className="space-y-3 mt-2">
            <div className="p-4 bg-white rounded-2xl border border-primary/10 shadow-xs">
              <h4 className="font-semibold text-primary text-sm mb-1">A. Local Guntur City Delivery (24-Hour Cutoff)</h4>
              <p className="text-xs text-ink/70 leading-relaxed">
                For delivery addresses within Guntur city limits, orders placed before 11:00 AM are delivered same-day by 8:00 PM; orders placed after 11:00 AM are delivered the next day by 8:00 PM.
              </p>
              <p className="text-xs text-primary font-medium mt-1.5">
                • <strong>Shipping Fee:</strong> <strong>FREE</strong> on orders of <strong>₹2,999 and above</strong>; otherwise ₹149.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-primary/10 shadow-xs">
              <h4 className="font-semibold text-primary text-sm mb-1">B. Outstation Pan-India Shipping (Courier Partners)</h4>
              <p className="text-xs text-ink/70 leading-relaxed">
                For addresses outside Guntur across Andhra Pradesh, Telangana, and all other Indian states, orders are dispatched via trusted courier partners (such as Delhivery, DTDC, Blue Dart, or India Post).
              </p>
              <p className="text-xs text-primary font-medium mt-1.5">
                • <strong>Estimated Transit Time:</strong> <strong>3 to 7 business days</strong> depending on destination PIN code.
              </p>
            </div>

            <div className="p-4 bg-white rounded-2xl border border-primary/10 shadow-xs">
              <h4 className="font-semibold text-primary text-sm mb-1">C. In-Store Pickup (Guntur Studio)</h4>
              <p className="text-xs text-ink/70 leading-relaxed">
                Customers may select Free In-Store Pickup at checkout. You will be notified when your garment is ready for collection at our studio.
              </p>
              <p className="text-xs text-primary font-medium mt-1.5">
                • <strong>Fee:</strong> <strong>₹0 (Always Free)</strong>
              </p>
            </div>
          </div>
        </div>

        {/* 4. Tracking & Dispatch Notifications */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">4. Order Tracking &amp; Notifications</h3>
          <p>
            Once your order is dispatched, you will receive an automated notification via SMS, WhatsApp, or email containing your courier partner details and tracking number. You can also view live order progress anytime through our <a href="/orders" className="text-accent hover:underline font-medium">Orders</a> dashboard.
          </p>
        </div>

        {/* 5. Non-Delivery & Damaged Shipments */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">5. Delivery Attempts &amp; Damaged Shipments</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li>
              <strong>Delivery Attempts:</strong> Our courier partners typically make up to 3 delivery attempts. Please ensure someone is available at the provided shipping address and contact phone number.
            </li>
            <li>
              <strong>Damaged Packages:</strong> If you receive a package that is visibly damaged, tampered with, or open, please do not accept it from the courier executive and contact our support team immediately.
            </li>
          </ul>
        </div>

        {/* 6. Contact Information */}
        <div className="pt-4 border-t border-primary/10 space-y-2">
          <h3 className="font-display text-base text-primary">6. Shipping Inquiries &amp; Support</h3>
          <p>
            For delivery status updates or address modification requests prior to dispatch, contact us:
          </p>
          <ul className="list-none pl-0 space-y-1.5 text-xs">
            <li>
              <strong>Operating Name:</strong> Lucky Couture
            </li>
            <li>
              <strong>Studio &amp; Pickup Address:</strong> {contactInfo.address}
            </li>
            <li>
              <strong>Phone / WhatsApp:</strong>{" "}
              <a href={`tel:${contactInfo.phoneHref}`} className="text-accent hover:underline font-medium">
                {contactInfo.phone}
              </a>
            </li>
            <li>
              <strong>Support Email:</strong>{" "}
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
          </ul>
        </div>

        <p className="text-xs text-ink/50 pt-2 border-t border-primary/10">
          Last updated: August 2026. This Shipping &amp; Delivery Policy operates in conjunction with our <a href="/terms" className="text-accent hover:underline font-medium">Terms &amp; Conditions</a>.
        </p>
      </div>
    </div>
  );
}
