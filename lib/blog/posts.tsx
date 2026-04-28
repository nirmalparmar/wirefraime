import type { ReactElement } from "react";

export const CATEGORIES = [
  "All",
  "Design",
  "Engineering",
  "Product",
  "Research",
] as const;

export type Category = (typeof CATEGORIES)[number];
export type PostCategory = Exclude<Category, "All">;

export type CoverVariant =
  | "aurora"
  | "iris"
  | "sunset"
  | "ocean"
  | "flux"
  | "pastel";

export type PostCover = {
  variant: CoverVariant;
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readTime: string;
  keywords: string[];
  category: PostCategory;
  cover: PostCover;
  author: { name: string; role?: string };
  content: () => ReactElement;
};

export const POSTS: BlogPost[] = [
  {
    slug: "designing-with-claude",
    title: "Designing with Claude: using AI as a design co-pilot",
    description:
      "Claude doesn't draw pixels — it reasons about structure, hierarchy, and systems. Here's how that reshapes the way we design product UI.",
    date: "2026-04-22",
    readTime: "7 min read",
    keywords: [
      "Claude",
      "AI design tool",
      "design co-pilot",
      "UI generation",
      "design systems",
      "Anthropic",
      "Wirefraime",
    ],
    category: "Design",
    cover: { variant: "aurora" },
    author: { name: "Wirefraime Team" },
    content: () => (
      <>
        <p>
          The loudest story about AI in design has been about images — models
          that conjure pretty pictures from a sentence. But if you've tried to
          ship a real product with one, you've noticed the same thing everyone
          else has. A beautiful frame is not a usable screen. A mood board is
          not a design system. Pixels are easy; <strong>coherence</strong> is
          the hard part.
        </p>

        <p>
          That's where Claude is quietly doing something different. It isn't
          trying to paint your interface. It's trying to reason about it —
          about what a screen is for, what lives next to what, and why.
        </p>

        <h2>Reasoning, not rendering</h2>

        <p>
          An image model treats a UI like a photograph. Claude treats it like a
          document. That sounds like a small distinction until you watch what
          happens when you ask both to design a dashboard.
        </p>

        <p>
          The image model gives you something gorgeous and unusable — charts
          with invented labels, buttons that don't align to any grid, copy
          that's decorative rather than functional. Claude gives you structured
          HTML: a header region, a nav, a content grid, semantic headings,
          accessible labels, real spacing tokens. It's less visually dense on
          the first pass, but it's the right kind of thing. You can iterate on
          it. You can ship it.
        </p>

        <blockquote>
          The interesting shift isn't that AI can now draw interfaces. It's
          that AI can now think about them.
        </blockquote>

        <h2>Claude's design vocabulary</h2>

        <p>
          Spend an afternoon prompting Claude about UI and patterns start to
          emerge. It naturally thinks in the vocabulary good designers already
          use — tokens, hierarchy, density, rhythm.
        </p>

        <ul>
          <li>
            <strong>Tokens over hex codes.</strong> Ask it for a brand color
            and you get a palette with intent: primary, surface, muted,
            destructive. Each named, each reusable, each tied to a role.
          </li>
          <li>
            <strong>Hierarchy over decoration.</strong> It sizes type by
            purpose — a page title is not just bigger, it's structurally
            different from a section title. Contrast is earned, not sprinkled.
          </li>
          <li>
            <strong>Systems over screens.</strong> Ask for one screen and
            you'll often get a button, a card, a form field that could be
            lifted and reused. It wants to generalize.
          </li>
          <li>
            <strong>Edge cases by default.</strong> Empty states, loading
            states, error states — the places where real products live or die.
            Claude asks about them without being prompted.
          </li>
        </ul>

        <h2>A workflow that actually works</h2>

        <p>
          The most productive way we've found to design with Claude is to stop
          asking it for finished screens and start asking it for the things
          underneath them.
        </p>

        <p>
          Begin with the <strong>system</strong>. Describe the product in a
          paragraph and ask Claude for a design language — a typography scale,
          a color set, spacing tokens, a handful of core components. Pin those.
          Treat them as the constraint, not the output.
        </p>

        <p>
          Then ask for <strong>flows</strong>, not screens. "Walk me through
          onboarding for a first-time user" gets you something more coherent
          than "design an onboarding screen," because Claude has to sequence
          decisions. It will tell you what the second screen depends on from
          the first.
        </p>

        <p>
          Finally, ask for <strong>refinement</strong>. This is where Claude is
          at its best — reviewing what's there and suggesting what's missing.
          "What's weak about this?" is a better prompt than "make this
          beautiful."
        </p>

        <h2>Where Claude shines</h2>

        <p>
          A few things Claude does almost suspiciously well once you learn to
          ask for them.
        </p>

        <ul>
          <li>
            <strong>Micro-copy.</strong> Error messages that sound like a
            human. Empty-state prompts that aren't cringe. Button labels that
            match the action, not the convention.
          </li>
          <li>
            <strong>Consistency.</strong> Across twelve screens it will hold a
            design system in its head better than most junior designers. The
            card that appears on screen three looks like the card on screen
            nine.
          </li>
          <li>
            <strong>Information density.</strong> It's strangely good at the
            dashboards and admin views that nobody wants to design — the stuff
            where layout is mostly a question of priority.
          </li>
        </ul>

        <h2>Where Claude still needs you</h2>

        <p>
          It is not a designer. It will not tell you that your product concept
          is wrong. It will not tell you that the flow you've described is six
          steps and should be three. It will not push back when you ask for
          something decorative and useless. The taste, the <em>no</em>, the
          structural critique — that's still the job.
        </p>

        <p>
          It's also weaker on anything that requires a feel for motion,
          delight, or brand voice beyond what you've explicitly told it. A
          great landing page still needs a human to decide what the hero line
          should actually say. Claude will draft ten options; choosing is on
          you.
        </p>

        <h2>How we use Claude at Wirefraime</h2>

        <p>
          Wirefraime's generator is powered by a pipeline of models, and
          Claude does a specific job in it: it's the one we trust to hold the
          design system steady across a dozen generated screens. When you
          describe your app, Claude first builds the tokens and component
          primitives. Every screen that comes after — generated by the fastest
          model we can — inherits that system. The result feels coherent
          because Claude decided the rules before the pixels existed.
        </p>

        <p>
          That's the shift worth paying attention to. AI is not going to draw
          your next product. But it is going to reason about it alongside you,
          at a speed and consistency that changes what a small team can ship.
          The designer's job is not disappearing. It's moving up a level — to
          taste, to judgment, to the decisions only a human should make.
        </p>
      </>
    ),
  },
];

export type BlogPostMeta = Omit<BlogPost, "content">;

export function getPostBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getAllPostMeta(): BlogPostMeta[] {
  return getAllPosts().map(({ content: _content, ...meta }) => meta);
}
