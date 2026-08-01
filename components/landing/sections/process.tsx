import { HOW_STEPS } from "@/components/landing/home-data";
import { Em, Eyebrow, SectionHeading } from "./section-heading";

/** Soft-tinted numeral chips echoing the hero accent trio (amber/lime/violet). */
const STEP_TONE = [
  "bg-[#fdf1d6] text-[#8a5b00]",
  "bg-[#eef7d4] text-[#4f6a12]",
  "bg-[#efe8ff] text-[#5b3fb0]",
];

export function ProcessSection() {
  return (
    <section className="px-6 py-20 md:px-10 md:py-28" id="how-it-works">
      <div className="mx-auto max-w-[1080px]">
        <SectionHeading
          eyebrow={<Eyebrow tone="lime">How it works</Eyebrow>}
          title={
            <>
              Three steps to a <Em>full UI flow</Em>
            </>
          }
        />
        <div className="mt-14 grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-12">
          {HOW_STEPS.map((s, i) => (
            <div className={`flex flex-col items-center gap-3 text-center fade-up d${i + 1}`} key={s.n}>
              <p className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold ${STEP_TONE[i]}`}>
                {i + 1}
              </p>
              <p className="text-[17px] font-semibold tracking-[-0.01em] text-foreground">{s.title}</p>
              <p className="max-w-[280px] text-[14px] leading-[1.6] text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
