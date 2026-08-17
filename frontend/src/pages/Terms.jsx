import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Terms & Conditions | Lucky Couture"
        description="Review the terms and conditions for ordering bespoke tailoring and boutique fashion pieces from Lucky Couture."
        canonical="/terms"
      />
      <SectionHeading align="left" eyebrow="Legal" title="Terms &amp; Conditions" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-6">
        <p>
          These terms govern your use of the Lucky Couture website and the
          tailoring and shopping services offered through it. By placing an
          order or booking a tailoring appointment, you agree to the terms
          below.
        </p>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Tailoring bookings</h3>
          <p>
            We accept a limited number of stitching orders each day to
            protect quality and turnaround time. The expected delivery date
            shown after you submit a booking is based on that day's
            availability and is confirmed by our team over phone or
            WhatsApp. Priority Stitching carries an additional surcharge,
            disclosed before your order is approved, and is subject to
            available capacity.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Measurements</h3>
          <p>
            You are responsible for the accuracy of measurements submitted
            through the tailoring form. We offer one free alteration within
            15 days of delivery if the fit needs adjusting.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Orders &amp; payments</h3>
          <p>
            Prices listed on the Shop are in Indian Rupees and inclusive of
            applicable taxes unless stated otherwise. Orders are confirmed
            once payment is received or, for cash-on-delivery orders, once
            the order is placed. We reserve the right to cancel an order if
            a product is no longer in stock, in which case any payment made
            will be refunded in full.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Cancellations</h3>
          <p>
            Tailoring orders can be cancelled free of charge before cutting
            begins on your fabric. Once stitching has started, the order
            can no longer be cancelled. Ready-made product orders can be
            cancelled any time before they are shipped.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Customer design submissions</h3>
          <p>
            If you submit a design to our gallery, you confirm you have the
            right to share the images and grant Lucky Couture permission to
            display it publicly once approved. We may decline to publish a
            submission at our discretion.
          </p>
        </div>

        <p>
          Questions about these terms can be sent to{" "}
          <a href={`mailto:${contactInfo.email}`} className="text-accent hover:underline">
            {contactInfo.email}
          </a>
          .
        </p>

        <p className="text-xs text-ink/50 pt-4 border-t border-primary/10">Last updated: July 2026.</p>
      </div>
    </div>
  );
}
