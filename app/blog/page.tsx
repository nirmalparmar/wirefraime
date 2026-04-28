import type { Metadata } from "next";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { BlogGrid } from "@/components/blog/blog-grid";
import { getAllPostMeta } from "@/lib/blog/posts";

export const metadata: Metadata = {
  title: "Blog — Wirefraime",
  description:
    "Essays and field notes on AI design, product craft, and how we're building Wirefraime.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog — Wirefraime",
    description:
      "Essays and field notes on AI design, product craft, and how we're building Wirefraime.",
    type: "website",
    url: "/blog",
  },
};

export default function BlogIndexPage() {
  const posts = getAllPostMeta();

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <Navbar />
      <main className="pt-24 md:pt-28">
        <BlogGrid posts={posts} />
      </main>
      <Footer />
    </div>
  );
}
