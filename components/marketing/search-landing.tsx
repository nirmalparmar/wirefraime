import Image from "next/image";
import Link from "next/link";

type Benefit = {
  title: string;
  description: string;
};

type Question = {
  question: string;
  answer: string;
};

export type SearchLandingProps = {
  eyebrow: string;
  title: string;
  intro: string;
  definitionTitle: string;
  definition: string;
  benefits: Benefit[];
  steps: Benefit[];
  questions: Question[];
  related: { href: string; label: string }[];
};

export function SearchLanding({
  eyebrow,
  title,
  intro,
  definitionTitle,
  definition,
  benefits,
  steps,
  questions,
  related,
}: SearchLandingProps) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: questions.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <div className="min-h-screen bg-white font-sans text-[#0b0d12]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="border-b border-black/[0.07]">
        <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5 md:px-8">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl italic">
            <Image src="/logo.svg" alt="" width={24} height={24} />
            WireFraime
          </Link>
          <div className="flex items-center gap-5 text-sm">
            <Link href="/#pricing" className="hidden text-[#596173] hover:text-black sm:inline">
              Pricing
            </Link>
            <Link href="/blog" className="hidden text-[#596173] hover:text-black sm:inline">
              Blog
            </Link>
            <Link href="/sign-up" className="rounded-full bg-[#0b0d12] px-5 py-2.5 font-medium text-white">
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="relative overflow-hidden px-5 pb-16 pt-20 md:px-8 md:pb-24 md:pt-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,#dfeaff_0%,#f4f7ff_52%,#ffffff_82%)]" />
          <div className="mx-auto max-w-[980px] text-center">
            <p className="mb-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#315fb7]">{eyebrow}</p>
            <h1 className="text-balance text-[clamp(42px,7vw,78px)] font-semibold leading-[1.02] tracking-[-0.04em]">
              {title}
            </h1>
            <p className="mx-auto mt-7 max-w-[720px] text-pretty text-[17px] leading-8 text-[#596173] md:text-lg">
              {intro}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/sign-up" className="rounded-full bg-[#0b0d12] px-7 py-3.5 text-sm font-medium text-white shadow-[0_14px_30px_-14px_rgba(0,0,0,.65)]">
                Design your product
              </Link>
              <Link href="/#product-preview" className="rounded-full border border-black/15 bg-white/70 px-7 py-3.5 text-sm font-medium text-[#303746] backdrop-blur-sm">
                See a real output
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#7b8290]">Plans start at $12/month billed annually · Cancel any time</p>
          </div>

          <div className="mx-auto mt-14 max-w-[1180px] overflow-hidden rounded-[22px] border border-black/10 bg-[#111214] shadow-[0_36px_90px_-40px_rgba(14,24,48,.55)]">
            <Image
              src="/example.png"
              alt="Wirefraime AI design workspace with a connected five-screen mobile app flow"
              width={3024}
              height={1964}
              priority
              sizes="(max-width: 768px) 100vw, 1180px"
              className="h-auto w-full"
            />
          </div>
        </section>

        <section className="border-y border-black/[0.07] bg-[#f8f9fb] px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto grid max-w-[1080px] gap-8 md:grid-cols-[0.8fr_1.2fr] md:gap-20">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#737b8d]">The short answer</p>
            <div>
              <h2 className="font-serif text-[clamp(30px,4vw,48px)] leading-[1.08] tracking-[-0.02em]">{definitionTitle}</h2>
              <p className="mt-6 text-[16px] leading-8 text-[#596173]">{definition}</p>
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[1080px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#737b8d]">Why teams use it</p>
            <h2 className="mt-3 max-w-[760px] font-serif text-[clamp(32px,4.5vw,52px)] leading-[1.08] tracking-[-0.02em]">
              Move from a loose idea to a design your team can discuss.
            </h2>
            <div className="mt-12 grid gap-px overflow-hidden rounded-[20px] border border-black/[0.08] bg-black/[0.08] md:grid-cols-2">
              {benefits.map((benefit, index) => (
                <article key={benefit.title} className="bg-white p-7 md:p-9">
                  <span className="text-xs font-semibold text-[#315fb7]">0{index + 1}</span>
                  <h3 className="mt-4 text-xl font-semibold tracking-[-0.02em]">{benefit.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#646c7d]">{benefit.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#111318] px-5 py-20 text-white md:px-8 md:py-28">
          <div className="mx-auto max-w-[1080px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/50">How it works</p>
            <h2 className="mt-3 max-w-[700px] font-serif text-[clamp(32px,4.5vw,52px)] leading-[1.08] tracking-[-0.02em]">
              A complete product flow in three decisions.
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {steps.map((step, index) => (
                <article key={step.title}>
                  <span className="font-serif text-5xl italic text-[#7fa4ed]">0{index + 1}</span>
                  <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/60">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 md:px-8 md:py-28">
          <div className="mx-auto max-w-[820px]">
            <p className="text-center text-[12px] font-semibold uppercase tracking-[0.14em] text-[#737b8d]">Questions</p>
            <h2 className="mt-3 text-center font-serif text-[clamp(32px,4.5vw,50px)] leading-[1.08]">Before you start</h2>
            <div className="mt-12 divide-y divide-black/10 border-y border-black/10">
              {questions.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="cursor-pointer list-none pr-8 text-base font-semibold marker:hidden">{item.question}</summary>
                  <p className="mt-3 max-w-[720px] text-sm leading-7 text-[#646c7d]">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 md:px-8 md:pb-32">
          <div className="mx-auto max-w-[1080px] rounded-[28px] bg-[radial-gradient(circle_at_50%_120%,#4777d7_0%,#1d3e82_35%,#111318_72%)] px-6 py-16 text-center text-white md:px-12 md:py-20">
            <h2 className="font-serif text-[clamp(34px,5vw,56px)] leading-[1.04]">Make the product clear before you build it.</h2>
            <p className="mx-auto mt-5 max-w-[560px] text-sm leading-7 text-white/65">Start with a prompt, review the full flow, refine the details, and export when the design is ready.</p>
            <Link href="/sign-up" className="mt-8 inline-flex rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-[#111318]">
              Get started with Wirefraime
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/[0.07] px-5 py-10 md:px-8">
        <div className="mx-auto flex max-w-[1080px] flex-col gap-6 text-sm text-[#737b8d] md:flex-row md:items-center md:justify-between">
          <Link href="/" className="font-serif text-xl italic text-[#0b0d12]">WireFraime</Link>
          <div className="flex flex-wrap gap-5">
            {related.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}
            <Link href="/blog">Blog</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
          <span>© 2026 WireFraime</span>
        </div>
      </footer>
    </div>
  );
}
