import type { ReactNode } from "react";

export function ArticleProse({ children }: { children: ReactNode }) {
  return (
    <div
      className="
        [&_p]:mt-6 [&_p]:text-[17px] [&_p]:leading-[1.78] [&_p]:text-foreground/80
        [&_p:first-child]:mt-0
        [&_h2]:mt-16 [&_h2]:mb-0 [&_h2]:font-serif [&_h2]:text-[30px] [&_h2]:leading-[1.15] [&_h2]:tracking-tight [&_h2]:text-foreground
        [&_h3]:mt-12 [&_h3]:mb-0 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground
        [&_ul]:mt-6 [&_ul]:space-y-3 [&_ul]:pl-0
        [&_li]:relative [&_li]:pl-6 [&_li]:text-[17px] [&_li]:leading-[1.7] [&_li]:text-foreground/80
        [&_li:before]:content-[''] [&_li:before]:absolute [&_li:before]:left-1 [&_li:before]:top-[0.75em] [&_li:before]:size-1 [&_li:before]:rounded-full [&_li:before]:bg-foreground/40
        [&_strong]:font-semibold [&_strong]:text-foreground
        [&_em]:italic [&_em]:text-foreground
        [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_a]:decoration-primary/40 hover:[&_a]:decoration-primary
        [&_blockquote]:my-12 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-6 [&_blockquote]:font-serif [&_blockquote]:text-[26px] [&_blockquote]:italic [&_blockquote]:leading-[1.3] [&_blockquote]:text-foreground/90
        [&_code]:rounded [&_code]:bg-foreground/6 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.88em] [&_code]:text-foreground
      "
    >
      {children}
    </div>
  );
}
