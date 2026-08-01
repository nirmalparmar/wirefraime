import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms governing the use of Wirefraime.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground md:px-8 md:py-24">
      <article className="mx-auto max-w-[720px]">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">← Back to Wirefraime</Link>
        <h1 className="mt-10 font-serif text-4xl tracking-tight md:text-5xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: July 12, 2026</p>

        <div className="mt-12 space-y-9 text-[15px] leading-7 text-muted-foreground">
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Using Wirefraime</h2>
            <p>You must provide accurate account information and use the service only for lawful purposes. You are responsible for activity performed through your account and for keeping your login credentials secure.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Subscriptions and billing</h2>
            <p>Paid plans renew according to the billing period shown at checkout until cancelled. You can manage or cancel a subscription through the billing portal. Access to paid features may end when the current paid period expires.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Your content and generated output</h2>
            <p>You retain responsibility for prompts, uploaded material, and how you use generated output. You must have the necessary rights to material you submit. AI-generated results may contain errors and should be reviewed before production use.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Service availability</h2>
            <p>We may update, suspend, or discontinue parts of the service. We work to keep Wirefraime available, but do not guarantee uninterrupted or error-free operation.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Acceptable use</h2>
            <p>Do not attempt to disrupt the service, bypass usage limits, access another user&apos;s data, distribute malware, or use Wirefraime to create unlawful or infringing material.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Limitation of liability</h2>
            <p>To the extent permitted by law, Wirefraime is provided as is and without warranties. Wirefraime is not liable for indirect, incidental, or consequential losses arising from use of the service.</p>
          </section>
          <section>
            <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
            <p>Questions about these terms can be sent to <a className="text-foreground underline underline-offset-4" href="mailto:support@wirefraime.com">support@wirefraime.com</a>.</p>
          </section>
        </div>
      </article>
    </main>
  );
}
