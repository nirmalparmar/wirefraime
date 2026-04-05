import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — Wirefraime",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <div className="mx-auto max-w-2xl px-5 py-24 md:py-32">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span>←</span> Back to home
        </Link>

        <h1 className="mb-2 font-serif text-4xl tracking-tight">Privacy Policy</h1>
        <p className="mb-10 text-sm text-muted-foreground">Last updated: April 5, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Information we collect</h2>
            <p>
              We collect information you provide when creating an account, such as your name and email address.
              We also collect content you create while using the service, including project data and design assets.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">How we use your information</h2>
            <ul className="list-inside list-disc space-y-1">
              <li>To provide, maintain, and improve the service</li>
              <li>To process transactions and manage your subscription</li>
              <li>To communicate with you about your account</li>
              <li>To enforce our terms and protect against misuse</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">AI-generated content</h2>
            <p>
              Your inputs are processed by third-party AI providers to generate designs. We do not use your
              content to train AI models. Generated content is stored in your account and not shared with other users.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Third-party services</h2>
            <p>
              We use third-party services for authentication, payment processing, and cloud storage.
              These providers have their own privacy policies governing the use of your information.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Data retention &amp; deletion</h2>
            <p>
              You can delete your projects at any time. If you delete your account, all associated data
              will be removed. We may retain anonymized, aggregated data for analytics purposes.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Cookies</h2>
            <p>
              We use essential cookies required for the service to function, such as authentication.
              We do not use third-party advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Changes to this policy</h2>
            <p>
              We may update this policy from time to time. We will notify you of significant changes
              by posting a notice on the service.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-foreground">Contact</h2>
            <p>
              If you have questions about this policy, contact us at{" "}
              <a href="mailto:support@wirefraime.com" className="text-primary underline underline-offset-2">
                support@wirefraime.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
