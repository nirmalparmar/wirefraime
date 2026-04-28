"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORIES, type BlogPostMeta, type Category } from "@/lib/blog/posts";
import { PostCover } from "./post-cover";

type View = "grid" | "list";
type Sort = "newest" | "oldest";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BlogGrid({ posts }: { posts: BlogPostMeta[] }) {
  const [active, setActive] = useState<Category>("All");
  const [view, setView] = useState<View>("grid");
  const [sort, setSort] = useState<Sort>("newest");

  const visible = useMemo(() => {
    const filtered =
      active === "All" ? posts : posts.filter((p) => p.category === active);
    return [...filtered].sort((a, b) =>
      sort === "newest"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date)
    );
  }, [posts, active, sort]);

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 md:px-10 md:pb-32 md:pt-16">
      {/* Big active label */}
      <h1 className="mb-12 text-[clamp(56px,9vw,128px)] font-medium leading-none tracking-[-0.04em] text-foreground md:mb-16">
        {active}
      </h1>

      {/* Filter / sort row */}
      <div className="mb-10 flex flex-wrap items-center justify-between gap-y-4 border-b border-foreground/10 pb-5 md:mb-14">
        <nav className="-mx-2 flex flex-wrap items-center gap-x-1 gap-y-2 md:gap-x-2">
          {CATEGORIES.map((cat) => {
            const isActive = cat === active;
            return (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors md:px-4 md:py-2 md:text-[15px] ${
                  isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            aria-label={`Sort by ${sort === "newest" ? "oldest" : "newest"}`}
          >
            <span>Sort</span>
            <span aria-hidden className="text-xs">
              {sort === "newest" ? "↓" : "↑"}
            </span>
          </button>

          <div className="flex items-center gap-0.5 rounded-full border border-foreground/10 p-0.5">
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`grid size-7 place-items-center rounded-full transition-colors ${
                view === "grid"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`grid size-7 place-items-center rounded-full transition-colors ${
                view === "list"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Posts */}
      {visible.length === 0 ? (
        <p className="py-20 text-center text-muted-foreground">
          No posts in <strong className="text-foreground">{active}</strong> yet.
        </p>
      ) : view === "grid" ? (
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-2 md:gap-x-8 md:gap-y-16 lg:grid-cols-3">
          {visible.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group flex flex-col gap-5"
            >
              <PostCover
                cover={post.cover}
                title={post.title}
                category={post.category}
                className="aspect-[4/3] w-full rounded-2xl transition-transform duration-500 group-hover:scale-[1.01]"
              />
              <div className="flex flex-col gap-2">
                <h2 className="text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary md:text-[24px]">
                  {post.title}
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>{post.category}</span>
                  <span className="size-1 rounded-full bg-foreground/20" />
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col">
          {visible.map((post, i) => (
            <li key={post.slug} className={i !== 0 ? "border-t border-foreground/8" : ""}>
              <Link
                href={`/blog/${post.slug}`}
                className="group grid grid-cols-[1fr_auto] items-baseline gap-6 py-6 md:grid-cols-[120px_1fr_140px] md:gap-10 md:py-8"
              >
                <time
                  dateTime={post.date}
                  className="hidden text-sm text-muted-foreground md:block"
                >
                  {formatDate(post.date)}
                </time>
                <h2 className="text-[20px] font-medium leading-snug tracking-[-0.01em] text-foreground transition-colors group-hover:text-primary md:text-[22px]">
                  {post.title}
                </h2>
                <span className="justify-self-end text-sm text-muted-foreground md:text-right">
                  {post.category}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
