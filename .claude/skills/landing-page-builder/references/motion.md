# Motion Primitives

Motion on a landing page exists to guide attention and add life, not to perform.
The best pages achieve all their polish with **IntersectionObserver + CSS** — no
animation library, zero extra JS shipped. Reach for framer-motion only when you
genuinely need spring physics or `AnimatePresence`. Everything below works in plain
HTML; React equivalents are noted.

**Two rules that apply to everything here:**
1. **Honor `prefers-reduced-motion`.** Jump to the final state; never trap a user in
   motion they asked to avoid. Every pattern below shows how.
2. **Fire reveals once, then disconnect** the observer. Re-animating on every scroll
   is distracting and costs performance.

## Signature easing curves

Never ship the browser defaults (`ease`, `linear`) on a designed page. These three
curves recur across excellent work and read as "someone tuned this":

```css
--ease-pop:    cubic-bezier(.16, 1, .3, 1);    /* elastic pop — reveals, entrances */
--ease-out:    cubic-bezier(.22, 1, .36, 1);   /* confident ease-out — cards, bars  */
--ease-spring: cubic-bezier(.2, .7, .2, 1);    /* springy, organic — FAQ, hovers     */
```
In framer-motion, `--ease-out` is the array `[0.22, 1, 0.36, 1]`.

## The Reveal primitive (use everywhere)

Scroll-triggered fade-up. This is the workhorse — most of a page's perceived polish
comes from sections gently rising in as you scroll.

**Vanilla HTML/JS:**
```html
<style>
  .reveal { opacity: 0; transform: translateY(24px);
            transition: opacity .8s var(--ease-pop), transform .8s var(--ease-pop); }
  .reveal.in { opacity: 1; transform: none; }
  @media (prefers-reduced-motion: reduce) {
    .reveal { opacity: 1; transform: none; transition: none; }
  }
</style>
<script>
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));
</script>
```
The tuned constants matter: `threshold: 0.12` and `rootMargin: '...-8%'` fire the
reveal *just before* the element is fully in view, so it's already settling as the
user arrives. `translateY(24px)` and `.8s` are subtle — resist bigger values.

**React** (a reusable component — bundle this):
```tsx
function Reveal({ children, delay = 0, as: Tag = "div", className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return (
    <Tag ref={ref} className={`${shown ? "in" : ""} reveal ${className}`}
         style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}
```

## Staggering

Reveal a group of items in sequence (cards in a grid, list items). Use an index
custom property so the delay scales automatically:

```html
<div class="reveal" style="--i:0">…</div>
<div class="reveal" style="--i:1">…</div>
<div class="reveal" style="--i:2">…</div>
<style>.reveal { transition-delay: calc(var(--i) * 80ms); }</style>
```
80–120ms per step is the sweet spot. Faster feels frantic; slower feels sluggish.

In framer-motion: a parent with `variants={{ show: { transition: { staggerChildren: 0.1 } } }}`
and children using a shared `fadeUp` variant.

## Count-up numbers (stats section)

Numbers that climb to their target when scrolled into view. Ease-out over ~1.4s.

```html
<span class="count" data-to="2400000" data-suffix="+"></span>
<script>
  const fmt = n => n.toLocaleString();
  const run = (el) => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = fmt(+el.dataset.to) + (el.dataset.suffix || ""); return;
    }
    const to = +el.dataset.to, suffix = el.dataset.suffix || "", dur = 1400;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);          // ease-out cubic
      el.textContent = fmt(Math.round(to * eased)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((es) => es.forEach(e => {
    if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }), { threshold: 0.4 });
  document.querySelectorAll(".count").forEach(el => io.observe(el));
</script>
```
Tip: starting the count at ~50% of the target (rather than 0) makes the climb more
visible for large numbers. For decimals/percentages, parse and format accordingly.

## Infinite marquee (logo strip, value words)

Pure CSS, seamless. The trick: render the track contents **twice** and translate by
exactly `-50%` so the second copy lands where the first began — no visible jump.
Fade the edges with a mask.

```html
<div class="marquee">
  <div class="track">
    <!-- set 1 --> <span>Logo</span><span>Logo</span>…
    <!-- set 2 (identical) --> <span>Logo</span><span>Logo</span>…
  </div>
</div>
<style>
  .marquee { overflow: hidden;
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
            mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent); }
  .track { display: flex; gap: 3rem; width: max-content; animation: marquee 32s linear infinite; }
  .marquee:hover .track { animation-play-state: paused; }
  @keyframes marquee { to { transform: translateX(-50%); } }
  @media (prefers-reduced-motion: reduce) { .track { animation: none; } }
</style>
```
If you render the set **3×** instead, translate by `-33.333%`. Match a trailing gap
to the inner gap so spacing is even across the seam. 25–35s is a calm speed.

## Typewriter headline

Types a phrase, pauses, deletes, cycles to the next. Mechanical personality.

```html
<h1>I help with <span id="tw"></span><span class="caret">|</span></h1>
<style>
  .caret { animation: blink 1s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .caret { animation: none; } }
</style>
<script>
  const PHRASES = ["the work that matters.", "judgment, not jargon.", "the next big idea."];
  const el = document.getElementById("tw");
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    el.textContent = PHRASES[0];
  } else {
    let pi = 0, ci = 0, deleting = false;
    const tick = () => {
      const word = PHRASES[pi];
      ci += deleting ? -1 : 1;
      el.textContent = word.slice(0, ci);
      if (!deleting && ci === word.length) { deleting = true; return setTimeout(tick, 1600); }
      if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % PHRASES.length; }
      setTimeout(tick, deleting ? 38 : 78);            // 78ms type / 38ms delete
    };
    tick();
  }
</script>
```

## Parallax (subtle)

One throttled scroll listener sets a `0→1` progress variable; layers read it. Keep
the travel small (`-18px` to `-30px`) — landing-page parallax should be felt, not
seen. Disable under reduced-motion.

```js
let raf = false;
addEventListener("scroll", () => {
  if (raf) return; raf = true;
  requestAnimationFrame(() => {
    const hero = document.querySelector(".hero");
    const p = Math.min(Math.max(scrollY / innerHeight, 0), 1);
    hero.style.setProperty("--py", p);
    raf = false;
  });
}, { passive: true });
/* CSS: .layer-back { transform: translateY(calc(var(--py) * -18px)); } */
```

## Hover micro-interactions

Small, fast, satisfying:
- **Card lift:** `transform: translateY(-4px)` + a deeper shadow on hover, `.25s var(--ease-out)`.
- **CTA arrow nudge:** an inline arrow that does `transform: translateX(4px)` on button hover.
- **Button press:** `transform: scale(.98)` on `:active`.
- **Primary CTA halo:** a soft pulsing glow, but start it ~1.2s after load (not on
  mount) so it draws the eye *after* the page settles.

## The `data-anim` level system (optional, nice for control)

Gate animation richness behind a root attribute so the whole page can be tuned or
disabled centrally, and map reduced-motion to "off":
```html
<html data-anim="rich">  <!-- off | subtle | rich -->
<style>
  html[data-anim="off"] .reveal { opacity: 1; transform: none; transition: none; }
</style>
<script>
  if (matchMedia("(prefers-reduced-motion: reduce)").matches)
    document.documentElement.dataset.anim = "off";
</script>
```

## When to actually use framer-motion (React)

Plain CSS covers reveals, staggers, marquees, count-ups, hovers. Reach for
framer-motion only for: spring physics on drag/hover, layout animations,
`AnimatePresence` (exit animations), or orchestrated sequences. Example spring lift:
```tsx
<motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}/>
```
If you add it, gate ambient/infinite animations behind a reduced-motion check too.
