import SectionHeading from "../components/SectionHeading";
import SEO from "../components/SEO";
import { contactInfo } from "../data/mockData";

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <SEO
        title="Privacy Policy | Lucky Couture"
        description="Read the privacy policy of Lucky Couture regarding customer measurements, order handling, and data security."
        canonical="/privacy-policy"
      />
      <SectionHeading align="left" eyebrow="Legal" title="Privacy Policy" />
      <div className="prose prose-sm max-w-none text-ink/75 leading-relaxed space-y-6">
        <p>
          Lucky Couture ("we", "us") respects your privacy. This policy explains
          what information we collect when you use our website, how we use it,
          and the choices you have.
        </p>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Information we collect</h3>
          <p>
            When you create an account, book a tailoring appointment, or place
            an order, we collect details such as your name, phone number,
            email address, delivery address, and the measurements you provide
            for stitching. If you contact us, we keep a record of that
            conversation to help resolve your query.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">How we use it</h3>
          <p>
            We use your information to process orders and tailoring bookings,
            calculate delivery dates, respond to enquiries, and let you save
            measurement profiles and favourites for future visits. We do not
            sell your personal information to third parties.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Measurements &amp; reference images</h3>
          <p>
            Measurements and any reference images you upload for a tailoring
            order are used solely to fulfil that order and, if you choose to
            save a measurement profile, to speed up future bookings. You can
            delete a saved profile at any time from your account.
          </p>
        </div>

        <div>
          <h3 className="font-display text-lg text-primary mb-2">Your choices &amp; Support</h3>
          <p>
            You can update your profile information, remove saved addresses
            or measurement profiles, and request deletion of your account by
            contacting us at{" "}
            <a href={`mailto:${contactInfo.email}`} className="text-accent hover:underline font-medium">
              {contactInfo.email}
            </a>
            .
          </p>
          <p className="mt-2">
            For technical assistance, account issues, or data inquiries, reach out to our Technical Support team at{" "}
            <a href={`mailto:${contactInfo.techSupportEmail}`} className="text-accent hover:underline font-medium">
              {contactInfo.techSupportEmail}
            </a>
            .
          </p>
        </div>

        <p className="text-xs text-ink/50 pt-4 border-t border-primary/10">
          Last updated: July 2026. If we make material changes to this policy, we'll update this page.
        </p>
      </div>
    </div>
  );
}
