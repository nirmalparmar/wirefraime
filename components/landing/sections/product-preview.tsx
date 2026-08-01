import Image from "next/image";

export function ProductPreviewSection() {
  return (
    <section id="product-preview" className="relative z-[2] px-6 pb-20 md:px-10 md:pb-28">
      <div className="mx-auto max-w-[1080px]">
        <div className="mb-8 text-center">
          <h2 className="fade-up text-[clamp(26px,3vw,36px)] font-semibold leading-[1.15] tracking-[-0.025em] text-foreground">
            One prompt becomes a{" "}
            <span className="font-serif italic">connected product flow</span>
          </h2>
        </div>

        {/* The real product — soft frame, no caption noise */}
        {/* No fade-up here: this is the LCP element and should paint immediately */}
        <div className="overflow-hidden rounded-[24px] border border-border bg-[#111214] shadow-[0_24px_60px_-32px_rgba(24,28,40,0.3)]">
          <Image
            src="/example.png"
            alt="Wirefraime workspace showing an AI-designed five-screen mobile app flow"
            width={3024}
            height={1964}
            priority
            sizes="(max-width: 768px) 100vw, 1080px"
            className="h-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
