import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ArticleProse } from "@/components/blog/article-prose";
import { PostCover } from "@/components/blog/post-cover";
import { getAllPosts, getPostBySlug } from "@/lib/blog/posts";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post not found — Wirefraime" };

  const url = `/blog/${post.slug}`;
  return {
    title: `${post.title} — Wirefraime`,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author.name }],
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      url,
      publishedTime: post.date,
      authors: [post.author.name],
      tags: post.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function BlogPostPage(
  { params }: { params: Promise<Params> }
) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const Content = post.content;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: post.author.name },
    publisher: {
      "@type": "Organization",
      name: "Wirefraime",
      logo: { "@type": "ImageObject", url: "/logo.svg" },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `/blog/${post.slug}`,
    },
    keywords: post.keywords.join(", "),
  };

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navbar />

      <main className="pb-20 pt-28 md:pb-28 md:pt-32">
        <div className="mx-auto max-w-[1100px] px-5 md:px-10">
          <Link
            href="/blog"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <span aria-hidden>←</span> All posts
          </Link>
        </div>

        <article>
          <div className="mx-auto max-w-[1100px] px-5 md:px-10">
            <PostCover
              cover={post.cover}
              title={post.title}
              className="aspect-[16/7] w-full rounded-2xl"
            />
          </div>

          <header className="mx-auto mt-12 max-w-[680px] px-5 md:mt-16 md:px-6">
            <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span>{post.category}</span>
              <span className="size-1 rounded-full bg-foreground/20" />
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span className="size-1 rounded-full bg-foreground/20" />
              <span>{post.readTime}</span>
            </div>

            <h1 className="text-[clamp(36px,4.5vw,56px)] font-medium leading-[1.08] tracking-[-0.02em] text-foreground">
              {post.title}
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              {post.description}
            </p>

            <div className="mt-8 flex items-center gap-3 border-t border-foreground/8 pt-6 text-sm">
              <div className="grid size-9 place-items-center rounded-full bg-primary/10 font-serif text-base text-primary">
                {post.author.name.charAt(0)}
              </div>
              <div>
                <div className="font-medium text-foreground">
                  {post.author.name}
                </div>
                {post.author.role && (
                  <div className="text-xs text-muted-foreground">
                    {post.author.role}
                  </div>
                )}
              </div>
            </div>
          </header>

          <div className="mx-auto mt-12 max-w-[680px] px-5 md:mt-16 md:px-6">
            <ArticleProse>
              <Content />
            </ArticleProse>
          </div>
        </article>

        <div className="mx-auto mt-20 max-w-[680px] px-5 md:px-6">
          <div className="border-t border-foreground/8 pt-10">
            <div className="liquid-glass-adaptive rounded-2xl p-8 text-center md:p-10">
              <h3 className="font-serif text-2xl leading-tight tracking-tight text-foreground md:text-3xl">
                Design your whole app with AI.
              </h3>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
                Describe your product. Wirefraime generates every screen, every
                flow, every edge case.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start building
                <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
