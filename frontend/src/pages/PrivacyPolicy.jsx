import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Privacy Policy | Lucky Couture"
        description="Read the official privacy policy of Lucky Couture regarding customer data protection, measurement storage, Razorpay payment processing, and security."
        canonical="/privacy-policy"
        robots="index, follow"
      />
      <SectionHeading align="left" eyebrow="Legal &amp; Compliance" title="Privacy Policy" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-7 mt-6">
        <p>
          At <strong>Lucky Couture</strong> ("we", "us", "our"), accessible via <strong>https://www.luckycouture.in</strong>, protecting the privacy and security of our customers' personal data is paramount. This Privacy Policy details the types of personal data we collect, how we process and protect it, your privacy rights, and our compliance with applicable Indian data protection and e-commerce regulations.
        </p>

        {/* 1. Information We Collect */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">1. Personal Information We Collect</h3>
          <p>
            When you register, place an order, book a tailoring session, or contact our support team, we may collect the following categories of information:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Contact &amp; Identity Details:</strong> Full name, mobile phone number, email address, and delivery/billing address (including PIN code, city, and state).</li>
            <li><strong>Bespoke Tailoring Data:</strong> Garment sizing specifications, individual body measurements (e.g. bust, waist, hips, shoulder, armhole, length), and optional custom style preferences.</li>
            <li><strong>Reference Designs &amp; Media:</strong> Reference images, embroidery patterns, or garment photos uploaded by you for tailoring consultations.</li>
            <li><strong>Transaction &amp; Order History:</strong> Order identifiers, purchased products/services, 30% advance and 70% balance transaction reference numbers, delivery choices, and payment status.</li>
            <li><strong>Technical &amp; Diagnostic Information:</strong> IP address, device type, browser specifications, and usage data captured to troubleshoot technical errors and optimize platform performance.</li>
          </ul>
        </div>

        {/* 2. Payment Gateway & Security */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">2. Secure Payment Processing (Razorpay Compliance)</h3>
          <p>
            Lucky Couture is committed to the highest standards of financial security:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Payment Aggregator:</strong> All online payments (Credit Cards, Debit Cards, Net Banking, UPI, and Digital Wallets) are processed securely through our RBI-authorized Payment Aggregator, <strong>Razorpay</strong>, in compliance with Payment Card Industry Data Security Standards (PCI-DSS).</li>
            <li><strong>No Storage of Sensitive Cardholder Data:</strong> Lucky Couture does <strong>NOT</strong> collect, store, or process raw credit/debit card numbers, CVVs, card expiry dates, net banking passwords, or UPI PINs on our servers. All financial credentials are encrypted and handled directly by the payment gateway.</li>
          </ul>
        </div>

        {/* 3. How We Use Your Information */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">3. Purpose &amp; Use of Collected Information</h3>
          <p>
            We process your personal information strictly for legitimate operational purposes, including:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>Processing, crafting, cutting, and hand-finishing your bespoke tailoring orders.</li>
            <li>Fulfilling ready-made boutique fashion orders and coordinating courier delivery or store pickups.</li>
            <li>Sending order confirmations, production milestone updates, delivery dispatches, and invoices via SMS, WhatsApp, or email.</li>
            <li>Offering customer support, responding to inquiries, and handling alteration or refund requests.</li>
            <li>Saving measurement profiles and addresses in your secure user account for convenient future bookings.</li>
            <li>Detecting and preventing unauthorized access, fraudulent transactions, or platform abuse.</li>
          </ul>
        </div>

        {/* 4. Data Sharing & Third-Party Disclosure */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">4. Sharing &amp; Disclosure of Information</h3>
          <p>
            We do <strong>NOT</strong> sell, rent, or trade your personal information to third parties for marketing purposes. We share data only with trusted service providers essential for completing your orders:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 mt-2">
            <li><strong>Payment Aggregators (Razorpay):</strong> To securely authorize and settle digital transactions, 30% advance payments, and customer refunds.</li>
            <li><strong>Logistics &amp; Courier Partners:</strong> Name, delivery address, and contact phone number are shared with courier services (e.g. Delhivery, DTDC, Blue Dart, India Post) solely to deliver your orders.</li>
            <li><strong>Communication Gateways:</strong> To transmit automated transactional updates and order alerts via WhatsApp/SMS.</li>
            <li><strong>Legal &amp; Regulatory Compliance:</strong> When required by applicable law, court summons, or governmental authorities to protect our legal rights or prevent financial fraud.</li>
          </ul>
        </div>

        {/* 5. Cookies & Local Storage */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">5. Cookies &amp; Local Storage</h3>
          <p>
            Our website uses session cookies and local storage to remember your shopping cart items, saved measurement profiles, and secure authentication status across visits. You can configure your browser to reject cookies, though certain shopping features (such as cart persistence) may function sub-optimally.
          </p>
        </div>

        {/* 6. Data Security & Retention */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">6. Data Security &amp; Retention</h3>
          <p>
            We implement industry-standard administrative, technical, and physical safeguards—including SSL (Secure Socket Layer) 256-bit encryption (HTTPS), authenticated server access, and database protection—to guard your personal data against unauthorized disclosure or loss.
          </p>
          <p className="mt-2">
            We retain your order and sizing records only for as long as necessary to satisfy tailoring fulfillment, alteration guarantees, tax compliance, and dispute resolution.
          </p>
        </div>

        {/* 7. Your Privacy Rights & Choices */}
        <div>
          <h3 className="font-display text-lg text-primary mb-2">7. Your Rights &amp; Choices</h3>
          <p>
            You have full control over your personal information:
          </p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>Account Profile:</strong> You can review, edit, or remove your contact details, saved addresses, and measurement profiles at any time by visiting your <a href="/profile" className="text-accent hover:underline font-medium">Profile</a>.</li>
            <li><strong>Account Deletion:</strong> You may request permanent deletion of your account and associated personal data by contacting our Grievance Officer.</li>
          </ul>
        </div>

        {/* 8. Grievance Redressal & Contact Officer */}
        <div className="pt-4 border-t border-primary/10 space-y-2">
          <h3 className="font-display text-base text-primary">8. Grievance Redressal &amp; Privacy Contact</h3>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your personal data, please contact our designated Grievance Officer:
          </p>
          <ul className="list-none pl-0 space-y-1.5 text-xs">
            <li>
              <strong>Operating Name:</strong> Lucky Couture
            </li>
            <li>
              <strong>Registered / Studio Address:</strong> {contactInfo.address}
            </li>
            <li>
              <strong>Grievance &amp; General Email:</strong>{" "}
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
          Last updated: August 2026. This Privacy Policy is published in accordance with the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 and Digital Personal Data Protection guidelines.
        </p>
      </div>
    </div>
  );
}
