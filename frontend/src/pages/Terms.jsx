import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function Terms() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Terms & Conditions | Lucky Couture"
        description="Review the official terms and conditions for bespoke tailoring, ready-made boutique collections, advance payments, delivery, and services at Lucky Couture."
        canonical="/terms"
        robots="index, follow"
      />
      <SectionHeading align="left" eyebrow="Legal &amp; Compliance" title="Terms &amp; Conditions" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-7 mt-6">
        <p>
          Welcome to <strong>Lucky Couture</strong> ("we", "us", "our"). These Terms &amp; Conditions ("Terms") constitute a legally binding agreement between you ("Customer", "User", "you") and Lucky Couture, governing your access to and use of our website (<strong>https://www.luckycouture.in</strong>) and all bespoke tailoring, stitching, boutique apparel, and delivery services provided by us.
        </p>
        <p>
          By browsing our website, booking a tailoring service, submitting measurements, or purchasing boutique apparel, you acknowledge that you have read, understood, and agree to be bound by these Terms, along with our <a href="/privacy-policy" className="text-accent hover:underline font-medium">Privacy Policy</a>, <a href="/refund-policy" className="text-accent hover:underline font-medium">Refund Policy</a>, and <a href="/cancellation-policy" className="text-accent hover:underline font-medium">Cancellation Policy</a>.
        </p>

        {/* 1. Business Overview & Services */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">1. Business Overview &amp; Services Offered</h3>
          <p>
            Lucky Couture is an independent bespoke tailoring house and fashion boutique based in Guntur, Andhra Pradesh, India. Our services include:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Bespoke Custom Tailoring:</strong> Handcrafted stitching for blouses, lehengas, kurtis, frocks, dresses, and customized ethnic wear based on customer-submitted measurements and reference designs.</li>
            <li><strong>Priority Stitching:</strong> Express tailored craftsmanship with dedicated priority workshop scheduling.</li>
            <li><strong>Curated Boutique Apparel:</strong> Ready-to-wear dresses, sarees, kurtis, and nighties available through our online Shop.</li>
            <li><strong>Design Gallery Consultations:</strong> Custom pattern drafting and material procurement based on curated design templates.</li>
          </ul>
        </div>

        {/* 2. User Accounts & Measurements */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">2. User Accounts &amp; Sizing Accuracy</h3>
          <p>
            To place an order or save measurement profiles, you may create an account using your phone number or email address. You agree to provide accurate, truthful, and complete information.
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Measurement Accuracy:</strong> You are solely responsible for ensuring that all body measurements provided through our tailoring forms or profile manager are accurate.</li>
            <li><strong>Complimentary Alteration:</strong> To ensure optimal fit, we provide <strong>one free alteration</strong> within <strong>15 days of delivery</strong> for custom tailored garments.</li>
          </ul>
        </div>

        {/* 3. Pricing, Payments & Advance Structure */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">3. Pricing, Advance Payments &amp; Platform Fee</h3>
          <p>
            All prices on Lucky Couture are listed in <strong>Indian Rupees (INR / ₹)</strong>. Lucky Couture does not charge Goods and Services Tax (GST).
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>30% Advance Payment:</strong> For custom tailoring and bespoke stitching orders, a 30% advance payment of the total estimated order amount is collected at the time of booking to reserve workshop capacity, draft patterns, and procure materials.</li>
            <li><strong>70% Balance Payment:</strong> The remaining 70% balance is payable upon stitching completion, prior to courier dispatch or at the time of store pickup.</li>
            <li><strong>Ready-Made Boutique Purchases:</strong> Ready-made products purchased from our Shop are payable in full at the time of checkout via authorized online payment methods or Cash on Delivery (where applicable).</li>
            <li><strong>Platform Fee:</strong> Lucky Couture may apply a nominal customer-facing Platform Fee to support technology infrastructure, verified order management, and secure checkout. The Platform Fee is non-refundable on customer-initiated cancellations.</li>
            <li><strong>Secure Online Payments:</strong> All digital transactions are securely processed through RBI-authorized Payment Aggregators (Razorpay) adhering to PCI-DSS standards. We do not store raw card numbers, CVVs, or banking PINs.</li>
          </ul>
        </div>

        {/* 4. Shipping, Delivery & Store Pickup */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">4. Shipping, Delivery &amp; Store Pickup</h3>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Local Guntur Delivery:</strong> For addresses in Guntur city, delivery is completed within 24 hours. Local delivery is <strong>Free for orders of ₹2,999 and above</strong>; otherwise, a standard fee of ₹149 applies.</li>
            <li><strong>Outstation Shipping (Across India):</strong> Orders outside Guntur are dispatched via trusted courier partners (such as Delhivery, DTDC, Blue Dart, or India Post) with typical transit times of <strong>3 to 7 business days</strong> following completion.</li>
            <li><strong>Store Pickup:</strong> Customers may choose free store pickup at our Guntur studio (Muthyalareddy Nagar Main Road, Amaravathi Road, Guntur 522007) during business hours (Monday to Saturday, 10:00 AM – 8:00 PM IST).</li>
          </ul>
        </div>

        {/* 5. Cancellations & Refunds */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">5. Cancellations &amp; Refund Policy Summary</h3>
          <p>
            Cancellation and refund eligibility depends on the order category and production stage:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Standard Tailoring:</strong> Cancellable within <strong>24 hours of placement</strong> (before fabric cutting begins) for a <strong>50% refund</strong> of the 30% advance payment. Once 24 hours elapse or cutting/stitching commences, the advance is non-refundable.</li>
            <li><strong>Priority Stitching:</strong> Strictly non-cancellable and non-refundable once confirmed due to expedited workshop allocation.</li>
            <li><strong>Ready-Made Boutique Items:</strong> Cancellable free of charge at any time prior to courier dispatch.</li>
            <li><strong>Merchant Cancellations:</strong> If Lucky Couture cancels an order due to stock unavailability or fabric constraints, a <strong>100% full refund</strong> will be issued.</li>
            <li><strong>Refund Timeline &amp; Mode:</strong> Approved refunds are credited back to the original payment method (Bank Account / UPI / Card) within <strong>5 to 7 business days</strong>.</li>
          </ul>
          <p className="mt-2 text-xs text-ink/70">
            For exhaustive details, please refer to our dedicated <a href="/refund-policy" className="text-accent hover:underline font-medium">Refund Policy</a> and <a href="/cancellation-policy" className="text-accent hover:underline font-medium">Cancellation Policy</a>.
          </p>
        </div>

        {/* 6. Customer Design Submissions */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">6. Customer Design Submissions &amp; Gallery</h3>
          <p>
            When you upload reference designs or submit tailoring photos, you warrant that you possess the right to share the images and grant Lucky Couture permission to use them for crafting your piece and, if approved, showcasing the craftsmanship in our Design Gallery.
          </p>
        </div>

        {/* 7. Intellectual Property & Prohibited Use */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">7. Intellectual Property &amp; Prohibited Conduct</h3>
          <p>
            All content on this website—including brand logos, images, graphics, textual descriptions, and digital assets—is the intellectual property of Lucky Couture. You agree not to copy, reproduce, scrape, reverse-engineer, or misuse website content or disrupt platform security.
          </p>
        </div>

        {/* 8. Limitation of Liability */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">8. Limitation of Liability &amp; Disclaimer</h3>
          <p>
            Lucky Couture shall not be liable for any indirect, incidental, or consequential damages resulting from courier transit delays, customer-submitted measurement errors, or third-party payment gateway downtime. In all cases, our maximum aggregate liability is limited to the actual amount paid by you for the specific order in dispute.
          </p>
        </div>

        {/* 9. Governing Law & Jurisdiction */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">9. Governing Law &amp; Dispute Jurisdiction</h3>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of India. Any legal disputes, claims, or proceedings arising out of or related to these Terms or your transactions with Lucky Couture shall be subject to the exclusive jurisdiction of the competent courts in <strong>Guntur, Andhra Pradesh, India</strong>.
          </p>
        </div>

        {/* 10. Contact & Grievance Information */}
        <div className="pt-4 border-t border-primary/10 space-y-2">
          <h3 className="font-display text-base text-primary">10. Contact &amp; Grievance Redressal</h3>
          <p>
            For questions regarding these Terms, order assistance, or customer grievances, please contact our team:
          </p>
          <ul className="list-none pl-0 space-y-1.5 text-xs">
            <li>
              <strong>Operating Name:</strong> Lucky Couture (Prop. Lakshmi Designers)
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
              <strong>Technical Support Email:</strong>{" "}
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
          Last updated: August 2026. Compliant with the Information Technology Act, 2000 and Consumer Protection (E-Commerce) Rules, 2020.
        </p>
      </div>
    </div>
  );
}
