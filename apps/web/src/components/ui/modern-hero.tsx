import { ReactLenis } from "lenis/react";
import { motion, useInView, useMotionTemplate, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { FiArrowRight, FiBookOpen, FiChevronRight, FiClock, FiMapPin, FiWind, FiZap } from "react-icons/fi";
import { useEffect, useRef, useState } from "react";
import { SCENARIOS, type ScenarioId } from "@sol-keeper/sim";
import { useAccessibility } from "../../store/accessibility.js";
import { SCENARIO_LABELS } from "../../dial/scenarioLabels.js";
import { CONTROLS_REFERENCE, MISSION_GUIDES, SETUP_CONTROLS_REFERENCE } from "../../dial/missionGuides.js";
import { durationLabel } from "../../dial/missionTime.js";
import "./modern-hero.css";

export interface SmoothScrollHeroProps {
  onLaunchMission?: ((scenarioId?: ScenarioId) => void) | undefined;
}

export const SmoothScrollHero = ({ onLaunchMission }: SmoothScrollHeroProps) => {
  return (
    <div className="modern-hero-root">
      {/* Faster, snappier smoothing (default Lenis duration ~1.2s) — player request: "make
       *  the homepage hero section scroll animation faster." */}
      <ReactLenis root options={{ duration: 0.7 }}>
        <Nav onLaunchMission={onLaunchMission} />
        <Hero />
        <Schedule onLaunchMission={onLaunchMission} />
      </ReactLenis>
    </div>
  );
};

const Nav = ({ onLaunchMission }: { onLaunchMission?: ((scenarioId?: ScenarioId) => void) | undefined }) => {
  return (
    <nav className="modern-hero-nav" aria-label="Main Navigation">
      <div className="modern-hero-brand">
        <span className="modern-hero-title">Sol Keeper</span>
        <span className="modern-hero-by">by</span>
        <img
          src="/images/projonmo-apollo.png"
          alt="Projonmo Apollo - From CUET"
          className="modern-hero-team-logo"
        />
      </div>
      <div className="modern-hero-nav-actions">
        <button
          type="button"
          onClick={() => {
            document.getElementById("launch-schedule")?.scrollIntoView({
              behavior: "smooth",
            });
          }}
          className="modern-hero-nav-btn"
        >
          Launch Windows <FiArrowRight />
        </button>
        {onLaunchMission && (
          <button
            type="button"
            onClick={() => {
              onLaunchMission();
            }}
            className="modern-hero-cta-btn"
          >
            Launch Outpost
          </button>
        )}
      </div>
    </nav>
  );
};

// Player request: "make the homepage hero section scroll animation faster" — shortened from
// 1500 so the whole reveal (headline fade, image un-clip, parallax) resolves over noticeably
// less scroll distance, on top of the snappier Lenis smoothing above.
const SECTION_HEIGHT = 950;

/**
 * Player report: the parallax images (and, worse, the new hero-features cards below) were
 * getting cut off before Launch Windows rather than actually pushing it lower — because the
 * old single `.modern-hero-section` gave both the sticky pin zone AND the normal-flow
 * parallax content the SAME fixed `SECTION_HEIGHT + 100vh` height with `overflow: hidden`.
 * That height is sized for the pin zone's own scroll-driven zoom animation, not for however
 * tall the parallax content (now including three feature cards) happens to be — on a shorter
 * viewport, or once feature cards were added, real content quietly got clipped away entirely
 * rather than shown. `.modern-hero-pin-zone` now carries that fixed height + overflow:hidden
 * on its own, wrapping only the sticky CenterImage/HeroHeadline (whose `position: sticky`
 * pinning behavior depends on exactly this ancestor height, unchanged from before);
 * ParallaxImages sits after it as an ordinary sibling with no forced height, so it's always
 * fully visible regardless of content length or viewport size, and Launch Windows always
 * starts exactly where the real content ends — no more magic-number guessing.
 */
const Hero = () => {
  // Player report: "after scrolling past the 1st image, a black background appears which
  // users need to scroll through." Root cause, confirmed by walking the actual scroll math:
  // the pin zone reserves SECTION_HEIGHT + 100vh of scroll so CenterImage's `position: sticky`
  // has a full 100vh of runway to release and scroll away in — but CenterImage's own opacity
  // fade used to end at a flat `SECTION_HEIGHT + 500`, a guess that has no relationship to the
  // real viewport height. On any device where 100vh is taller than 500px (most phones — a
  // typical mobile viewport is 700-900px), the image was already fully transparent well before
  // the pin zone's own reserved space ran out, leaving `.modern-hero-root`'s near-black
  // background showing through, empty, for the remainder of that scroll. Reading the real
  // viewport height here and using it for BOTH the container's reserved space and the fade's
  // own endpoint keeps them mathematically in sync on every device, instead of a guess that
  // only happened to work on whatever screen it was last tuned against.
  const vh = useViewportHeight();
  return (
    <div className="modern-hero-section">
      <div style={{ height: `${SECTION_HEIGHT + vh}px` }} className="modern-hero-pin-zone">
        <CenterImage fadeEnd={SECTION_HEIGHT + vh} />
        <HeroHeadline />
      </div>
      <ParallaxImages />
      <div className="modern-hero-gradient-overlay" />
    </div>
  );
};

/** The real, current viewport height in px, kept live across resizes/orientation changes —
 *  `window` is absent during the SSR render tests (see this file's own render.test.tsx usage),
 *  so the initial value falls back to a plausible desktop height rather than crashing there. */
function useViewportHeight(): number {
  const [vh, setVh] = useState(() => (typeof window === "undefined" ? 800 : window.innerHeight));
  useEffect(() => {
    const onResize = () => {
      setVh(window.innerHeight);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return vh;
}

/**
 * Player request: hero text that names all three real missions, for attention. Sticky-pinned
 * over the center image (same `position: sticky` trick that pins the image itself) and faded
 * out over the first 300px of scroll, so it reads clearly at rest and gets out of the way fast
 * once the player starts scrolling toward the parallax/launch-windows content below.
 */
const HeroHeadline = () => {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 300], [1, 0]);
  const y = useTransform(scrollY, [0, 300], [0, -40]);

  return (
    <motion.div className="modern-hero-headline" style={{ opacity, y }}>
      <p className="modern-hero-headline-eyebrow">Junior Astronaut Mission Trainer</p>
      <h1 className="modern-hero-headline-title">Run an outpost beyond Earth on real NASA numbers.</h1>
      <p className="modern-hero-headline-sub">
        Three real missions. One dust storm, one 354-hour night, one reactor that has to last
        three of them.
      </p>
      <div className="modern-hero-headline-missions">
        <span>Jezero Outpost</span>
        <span aria-hidden="true">·</span>
        <span>First Light</span>
        <span aria-hidden="true">·</span>
        <span>The Long Night</span>
      </div>
    </motion.div>
  );
};

const CenterImage = ({ fadeEnd }: { fadeEnd: number }) => {
  const { scrollY } = useScroll();

  const clip1 = useTransform(scrollY, [0, SECTION_HEIGHT], [25, 0]);
  const clip2 = useTransform(scrollY, [0, SECTION_HEIGHT], [75, 100]);

  const clipPath = useMotionTemplate`polygon(${clip1}% ${clip1}%, ${clip2}% ${clip1}%, ${clip2}% ${clip2}%, ${clip1}% ${clip2}%)`;

  // Fades all the way out exactly as the pin zone itself ends (fadeEnd = SECTION_HEIGHT + the
  // real viewport height, see Hero's own doc comment) instead of a flat +500px guess, so there
  // is no longer a stretch of scroll where the image has already vanished but the parallax
  // gallery hasn't appeared yet.
  const opacity = useTransform(scrollY, [SECTION_HEIGHT, fadeEnd], [1, 0]);

  // Player report (part of the same "black gap" investigation): a real, second bug found while
  // fixing the first. The zoom used to animate `background-size` directly, from a flat "170%"
  // down to "100%" of the CONTAINER's own width — but that percentage's relationship to actual
  // full coverage depends on both the container's aspect ratio AND the source photo's own
  // (1920x1280 at the time this was found, confirmed by inspecting the file directly — the
  // photo itself has since been swapped, rotated to landscape so a wide viewport's "cover"
  // crops it only lightly; the fix below doesn't depend on which photo loads here): on a wide
  // desktop viewport "cover"
  // only needs ~105% width, so 100-170% happened to look fine there, but on a narrow, tall
  // mobile viewport "cover" needs roughly 325% — so both ends of that range under-covered,
  // leaving real, visible black letterboxing above and below the image for a wide stretch of
  // the scroll (confirmed directly: comparing the computed clip-path, correctly near-full-bleed
  // at that point, against the image's own much smaller rendered band). A `transform: scale`
  // on a layer that keeps a constant `background-size: cover` fixes this for any viewport or
  // image, at any zoom level, by construction — "cover" itself already guarantees full
  // coverage; scaling up from there can only ever add more image, never a gap.
  const scale = useTransform(scrollY, [0, fadeEnd], [1.7, 1]);

  return (
    <motion.div className="modern-hero-center-img" style={{ clipPath, opacity }}>
      <motion.div
        className="modern-hero-center-img-layer"
        style={{ scale, backgroundImage: "url(/images/hero/hero-center.jpg)" }}
      />
    </motion.div>
  );
};

/**
 * Player request: "state some hero features/rules of this trainer on the homepage hero
 * section (on the left/right side with same scroll animation)." Four real, verifiable claims
 * — nothing invented for marketing effect, each traceable to an actual rule or feature this
 * codebase enforces (CLAUDE.md's own rules 1/5/6, the Reality Dial, the incident catalog's
 * real analogues) — alternating sides opposite each parallax image, sharing that image's own
 * `ParallaxImg` scroll-linked motion (see `ParallaxFeature` below) rather than a new,
 * inconsistent animation style.
 */
// Player report: a feature card sharing the images' own full ±150-250px translateY range
// could end up visually overlapping the very image it's paired beside mid-scroll, since each
// element's motion is computed independently off its own position — confirmed worse on a
// narrow mobile viewport, where the same pixel offsets are a much larger fraction of the
// screen. A small range — still a real scroll-linked fade+slide, the same technique, just a
// gentler distance — keeps every card close to its natural flow position on every viewport.
const HERO_FEATURES: readonly { title: string; body: string; start: number; end: number }[] = [
  {
    title: "Every number is real.",
    body: "Crew metabolic rate, battery chemistry, radiation limits, dust-storm duration — every constant traces back to a published NASA source, credited on the Data Sources screen.",
    start: -15,
    end: 20,
  },
  {
    title: "Real incidents, not scripted drama.",
    body: "A Mir fire, an Apollo 13 CO2 scrubber failure, an ISS depressurization — the incidents you respond to are drawn from real spaceflight history, not invented for the game.",
    start: 15,
    end: -20,
  },
  {
    title: "Three depths, one simulation.",
    body: "Cadet, Specialist, or Commander — the Reality Dial changes how the mission is explained, never the physics underneath it.",
    start: -15,
    end: 20,
  },
];

const ParallaxImages = () => {
  return (
    <div className="modern-hero-parallax-container">
      {/* Player report (twice): "a huge scroll animation gap ... between the 1st & the 2nd
       *  image." A first cut halved this pair's amplitude, which shrank the mid-scroll flash
       *  but wasn't enough — each image tracks its OWN scroll progress independently, so by
       *  the time a reader's scroll position naturally settles with the card between them
       *  centered in view, image 1 has already reached (or nearly reached) its own `end` and
       *  image 2 is still sitting near its own `start` — that combined worst case is real,
       *  visible separation at rest, not just a transient. Cut hard here (roughly a third of
       *  the original range) rather than incrementally again. */}
      <ParallaxImg
        src="/images/hero/hero-parallax-1.jpg"
        alt="Spacecraft ascending from planetary base"
        start={-50}
        end={50}
        className="modern-hero-parallax-img parallax-w-1-3"
      />
      <ParallaxFeature {...HERO_FEATURES[0]!} className="modern-hero-feature-right modern-hero-feature-first" />
      <ParallaxImg
        src="/images/hero/hero-parallax-2.jpg"
        alt="Orbital insertion and planetary horizon"
        start={50}
        end={-65}
        className="modern-hero-parallax-img parallax-w-2-3"
      />
      <ParallaxFeature {...HERO_FEATURES[1]!} className="modern-hero-feature-left" />
      <ParallaxImg
        src="/images/hero/hero-parallax-3.jpg"
        alt="Deep space communication satellite array"
        start={-200}
        end={200}
        className="modern-hero-parallax-img parallax-w-1-3-ml-auto"
      />
      {/* Right-aligned, not left — image 4 right after it sits left-of-centre (margin-left:
       *  6rem, not a full right position like image 3), so a left-aligned card here would
       *  encroach on the same territory instead of complementing it. Extra top margin: image 3
       *  is the one portrait-oriented image (taller relative to its width than the other
       *  three), and at the base gap this card's own top corner touched its bottom corner
       *  mid-scroll — a targeted bump here instead of a larger gap on every card. */}
      <ParallaxFeature {...HERO_FEATURES[2]!} className="modern-hero-feature-right modern-hero-feature-extra-top" />
      <ParallaxImg
        src="/images/hero/hero-parallax-4.jpg"
        alt="Solar outpost surface telemetry and operations"
        start={0}
        end={-500}
        className="modern-hero-parallax-img parallax-w-5-12"
      />
    </div>
  );
};

interface ParallaxImgProps {
  className?: string;
  alt: string;
  src: string;
  start: number;
  end: number;
}

const ParallaxImg = ({ className, alt, src, start, end }: ParallaxImgProps) => {
  const ref = useRef<HTMLImageElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`${start}px end`, `end ${end * -1}px`],
  });

  const opacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0.75, 1], [1, 0.85]);

  const y = useTransform(scrollYProgress, [0, 1], [start, end]);
  const transform = useMotionTemplate`translateY(${y}px) scale(${scale})`;

  return (
    <motion.img
      src={src}
      alt={alt}
      className={className}
      ref={ref}
      style={{ transform, opacity }}
    />
  );
};

interface ParallaxFeatureProps {
  title: string;
  body: string;
  start: number;
  end: number;
  className?: string;
}

/** A hero feature/rule callout, sharing `ParallaxImg`'s own scroll-linked
 *  translateY+scale+opacity motion — the same animation, a text block instead of an image. */
const ParallaxFeature = ({ title, body, start, end, className }: ParallaxFeatureProps) => {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: [`${start}px end`, `end ${end * -1}px`],
  });

  const opacity = useTransform(scrollYProgress, [0.75, 1], [1, 0]);
  const scale = useTransform(scrollYProgress, [0.75, 1], [1, 0.85]);
  const y = useTransform(scrollYProgress, [0, 1], [start, end]);
  const transform = useMotionTemplate`translateY(${y}px) scale(${scale})`;

  return (
    <motion.div ref={ref} className={`modern-hero-feature ${className ?? ""}`} style={{ transform, opacity }}>
      <p className="modern-hero-feature-title">{title}</p>
      <p className="modern-hero-feature-body">{body}</p>
    </motion.div>
  );
};

interface ScheduleProps {
  onLaunchMission?: ((scenarioId?: ScenarioId) => void) | undefined;
}

/** Real scenario order (matches ScenarioStep/ScenarioSwitch's own `SCENARIOS` iteration) —
 *  `Object.values` doesn't guarantee this, so it's spelled out once here too. */
const SCENARIO_ORDER: readonly ScenarioId[] = ["jezero-outpost", "first-light", "the-long-night"];

/**
 * Player-attached reference screenshot's own card layout: a thumbnail photo, plus a two-line
 * stat badge stack (body+duration, then an optional hazard/power-mode line) instead of the
 * single `hint` string a plain-text row used to show. Same real facts as
 * `SCENARIO_LABELS[id].hint` — a body, a duration, and (for two of the three) a hazard/power
 * descriptor — just split into the two separate lines the reference's card design needs,
 * rather than parsed back out of that one free-text string. `thumb` reuses the same
 * already-licensed Mars/Moon photography the station console backgrounds use
 * (styles.css's `station-bg-mars.jpg`/`station-bg-moon.jpg`), cropped to a card-sized still —
 * not new, unsourced imagery.
 */
const SCENARIO_CARD_META: Record<
  ScenarioId,
  { thumb: string; bodyLine: string; hazardLine?: string; hazardIcon?: typeof FiWind }
> = {
  "jezero-outpost": {
    thumb: "/images/hero/card-jezero-outpost.jpg",
    bodyLine: "Mars · 30 Sols",
    hazardLine: "Dust Storm",
    hazardIcon: FiWind,
  },
  "first-light": {
    thumb: "/images/hero/card-first-light.jpg",
    bodyLine: "Moon · One 354 H Night",
  },
  "the-long-night": {
    thumb: "/images/hero/card-long-night.jpg",
    bodyLine: "Moon · 3 Lunar Nights",
    hazardLine: "Reactor-Powered",
    hazardIcon: FiZap,
  },
};

/**
 * Three cards, one per real scenario — replaces the original five invented "launch windows"
 * (place names and durations that matched no scenario `packages/sim` actually has), which all
 * called the identical `onLaunchMission()` regardless of which card was clicked: every
 * "Select" was the same shortcut wearing a different label. Each card here now pre-selects
 * its own real scenario (`onLaunchMission(scenario.id)`) before entering Setup, so clicking a
 * different card is a genuinely different shortcut, not just different marketing copy on top
 * of the same one destination.
 */
/**
 * Player request: give Launch Windows the same full-bleed, astronaut-on-the-surface backdrop
 * as the reference composition — a looping video behind the card list instead of the flat
 * colour it had before. Three real constraints shaped this, not just dropping in a `<video>`:
 *   - Lazy, once: `useInView(..., { once: true })` means the ~7MB clip only starts
 *     downloading once a reader actually scrolls near this section, never on first paint of
 *     the homepage, and never re-triggers once it has.
 *   - Reduced motion / low-power mode (CLAUDE.md rule 6). A looping background is exactly the
 *     kind of motion `prefers-reduced-motion` and the player's own low-power toggle
 *     (store/accessibility.ts) exist to suppress — both skip mounting the `<video>` entirely
 *     and leave its real first-frame extract (launch-windows-poster.jpg) showing as a static
 *     image instead, not a placeholder.
 *   - The PWA precache's 2MB-per-file limit (vite.config.ts's own `globPatterns`) only matches
 *     image/script/style extensions, never `.mp4` — this clip is never precached, so it's
 *     outside the offline-after-first-load guarantee. Fine for a decorative backdrop; the
 *     poster image (a `.jpg`, so it IS precached) is what keeps the section looking right
 *     offline or on a blocked connection.
 */
const ScheduleVideoBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "200px" });
  const lowPowerMode = useAccessibility((s) => s.lowPowerMode);
  const prefersReducedMotion = useReducedMotion();
  const canPlayVideo = inView && !lowPowerMode && !prefersReducedMotion;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (canPlayVideo) {
      video.play().catch(() => {
        // Autoplay can be blocked by the browser (data-saver mode, strict permissions) — the
        // poster frame underneath still shows either way, so there's no blank/broken state.
      });
    } else {
      video.pause();
    }
  }, [canPlayVideo]);

  return (
    <div ref={containerRef} className="modern-hero-schedule-bg" aria-hidden="true">
      <img src="/images/hero/launch-windows-poster.jpg" alt="" className="modern-hero-schedule-poster" />
      {canPlayVideo && (
        <video
          ref={videoRef}
          className="modern-hero-schedule-video"
          src="/videos/launch-windows-astronaut.mp4"
          muted
          loop
          playsInline
          preload="auto"
        />
      )}
      <div className="modern-hero-schedule-bg-gradient" />
    </div>
  );
};

const Schedule = ({ onLaunchMission }: ScheduleProps) => {
  return (
    <section
      id="launch-schedule"
      className="modern-hero-schedule"
      aria-label="Mission Launch Windows"
    >
      <ScheduleVideoBackground />
      {/* Player request: the video fills this section corner to corner — unlike the rest of
       *  the page, the card list itself no longer spans the section's full width. This inner
       *  wrapper holds the real max-width + right alignment, so the video (sized to the
       *  section itself, not this wrapper) shows fully down the left side behind it. */}
      <div className="modern-hero-schedule-content">
        {/* Player request: remove the generic "Start Mission Setup" button that used to sit
         *  here — each card below already has its own real, scenario-specific launch action
         *  (`onLaunch`), and Nav's own "Launch Outpost" button (top of the page) already covers
         *  the generic, no-scenario-preselected entry point, so this wasn't the only way in. */}
        <div className="modern-hero-schedule-head">
          <div>
            <motion.h2
              initial={{ y: 36, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              transition={{ ease: "easeInOut", duration: 0.6 }}
              className="modern-hero-schedule-title"
            >
              Launch Windows
            </motion.h2>
            <p className="modern-hero-schedule-subtitle">
              Sol Keeper's three real training missions — pick one to jump straight into Setup
              with it already selected.
            </p>
          </div>
        </div>

        {SCENARIO_ORDER.map((id, index) => {
          const scenario = SCENARIOS[id];
          const meta = SCENARIO_LABELS[id];
          const cardMeta = SCENARIO_CARD_META[id];
          return (
            <ScheduleItem
              key={id}
              title={meta.label}
              siteLine={`${scenario.site.name} · ${durationLabel(scenario.durationHours, scenario.body)}`}
              thumb={cardMeta.thumb}
              bodyLine={cardMeta.bodyLine}
              hazardLine={cardMeta.hazardLine}
              hazardIcon={cardMeta.hazardIcon}
              featured={index === 0}
              onLaunch={onLaunchMission === undefined ? undefined : () => onLaunchMission(id)}
            />
          );
        })}

        <GuideShortcut onLaunchMission={onLaunchMission} />
      </div>
    </section>
  );
};

/**
 * The 4th shortcut, player-requested: a dropdown to pick which mission's guide to read, right
 * here on the launch page — no need to run Setup first. The same guide content
 * (dial/missionGuides.ts) also appears on the Briefing screen once a mission is actually
 * launched; this is the browse-before-you-commit path into the identical text.
 */
const GuideShortcut = ({ onLaunchMission }: ScheduleProps) => {
  const [selected, setSelected] = useState<ScenarioId>("jezero-outpost");
  const [open, setOpen] = useState(false);
  const guide = MISSION_GUIDES[selected];

  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ ease: "easeInOut", duration: 0.55 }}
      viewport={{ once: true }}
      className="modern-hero-schedule-item modern-hero-guide-item"
    >
      <div className="modern-hero-guide-head">
        <div>
          <h3 className="modern-hero-item-title">
            <FiBookOpen aria-hidden="true" /> Mission Guides
          </h3>
          <p className="modern-hero-item-date">Real hazard timing and strategy, per mission.</p>
        </div>
        <label className="modern-hero-guide-select-label">
          <span className="sr-only">Choose a mission guide</span>
          <select
            className="modern-hero-guide-select"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value as ScenarioId);
              setOpen(true);
            }}
          >
            {SCENARIO_ORDER.map((id) => (
              <option key={id} value={id}>
                {SCENARIO_LABELS[id].label}
              </option>
            ))}
          </select>
        </label>
        <div className="modern-hero-item-action">
          <button
            type="button"
            className="modern-hero-item-btn"
            aria-expanded={open}
            onClick={() => {
              setOpen((o) => !o);
            }}
          >
            {open ? "Hide guide" : "Read guide"}
          </button>
        </div>
      </div>

      {open && (
        <div className="modern-hero-guide-body">
          <p className="modern-hero-guide-tagline">{guide.tagline}</p>
          {guide.paragraphs.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}

          <h4 className="modern-hero-guide-subhead">How to run this mission, step by step</h4>
          <ol className="modern-hero-guide-steps">
            {guide.steps.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>

          <h4 className="modern-hero-guide-subhead">What can fail this mission</h4>
          <ul className="modern-hero-guide-failures">
            {guide.failureModes.map((mode, i) => (
              <li key={i}>{mode}</li>
            ))}
          </ul>

          <h4 className="modern-hero-guide-subhead">What to toggle for what, during the mission</h4>
          <dl className="modern-hero-guide-controls">
            {CONTROLS_REFERENCE.map((control) => (
              <div key={control.name} className="modern-hero-guide-control-row">
                <dt>
                  {control.name}
                  <span className="modern-hero-guide-control-where">{control.where}</span>
                </dt>
                <dd>{control.effect}</dd>
              </div>
            ))}
          </dl>

          <h4 className="modern-hero-guide-subhead">What to set before you launch (Setup)</h4>
          <dl className="modern-hero-guide-controls">
            {SETUP_CONTROLS_REFERENCE.map((control) => (
              <div key={control.name} className="modern-hero-guide-control-row">
                <dt>{control.name}</dt>
                <dd>{control.effect}</dd>
              </div>
            ))}
          </dl>

          {onLaunchMission && (
            <button
              type="button"
              className="modern-hero-cta-btn"
              onClick={() => {
                onLaunchMission(selected);
              }}
            >
              Launch {guide.title}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
};

interface ScheduleItemProps {
  title: string;
  /** Real site name + duration ("Jezero Crater · 30 Sols") — shown with the pin icon, under
   *  the title, same as the reference card's own site line. */
  siteLine: string;
  thumb: string;
  bodyLine: string;
  hazardLine?: string | undefined;
  hazardIcon?: typeof FiWind | undefined;
  /** The reference's own glowing-border treatment on its first card — reused here for
   *  whichever scenario is first in `SCENARIO_ORDER`, not a per-scenario "recommended" claim. */
  featured?: boolean | undefined;
  onLaunch?: (() => void) | undefined;
}

/**
 * Whole-card click target, not a small nested "Select" button inside a non-interactive row —
 * a real `<button>` (via `motion.button`) when `onLaunch` exists, matching the reference's
 * full-row tap affordance (chevron, no visible button chrome) while staying more accessible
 * than the old small nested-button version (bigger target, one focusable element instead of
 * an inert wrapper plus a button). Falls back to a plain `motion.div` wrapper when there's no
 * `onLaunch` at all (`onLaunchMission` itself undefined) — the card then shows no chevron.
 */
const ScheduleItem = ({ title, siteLine, thumb, bodyLine, hazardLine, hazardIcon, featured, onLaunch }: ScheduleItemProps) => {
  const HazardIcon = hazardIcon;
  const className = `modern-hero-schedule-item ${featured ? "modern-hero-schedule-item-featured" : ""}`;
  const content = (
    <>
      <img src={thumb} alt="" className="modern-hero-item-thumb" />
      <div className="modern-hero-item-main">
        <h3 className="modern-hero-item-title">{title}</h3>
        <p className="modern-hero-item-site">
          <FiMapPin aria-hidden="true" />
          <span>{siteLine}</span>
        </p>
      </div>
      <div className="modern-hero-item-stats">
        <span className="modern-hero-item-stat">
          <FiClock aria-hidden="true" />
          {bodyLine}
        </span>
        {hazardLine && HazardIcon && (
          <span className="modern-hero-item-stat">
            <HazardIcon aria-hidden="true" />
            {hazardLine}
          </span>
        )}
      </div>
      {onLaunch && <FiChevronRight aria-hidden="true" className="modern-hero-item-chevron" />}
    </>
  );

  if (onLaunch) {
    return (
      <motion.button
        type="button"
        onClick={onLaunch}
        initial={{ y: 32, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ ease: "easeInOut", duration: 0.55 }}
        viewport={{ once: true }}
        className={className}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ ease: "easeInOut", duration: 0.55 }}
      viewport={{ once: true }}
      className={className}
    >
      {content}
    </motion.div>
  );
};
