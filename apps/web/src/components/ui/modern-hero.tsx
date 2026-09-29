import { ReactLenis } from "lenis/react";
import { motion, useMotionTemplate, useScroll, useTransform } from "framer-motion";
import { FiArrowRight, FiBookOpen, FiMapPin } from "react-icons/fi";
import { useRef, useState } from "react";
import { SCENARIOS, type ScenarioId } from "@sol-keeper/sim";
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
  return (
    <div className="modern-hero-section">
      <div style={{ height: `calc(${SECTION_HEIGHT}px + 100vh)` }} className="modern-hero-pin-zone">
        <CenterImage />
        <HeroHeadline />
      </div>
      <ParallaxImages />
      <div className="modern-hero-gradient-overlay" />
    </div>
  );
};

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
      <h1 className="modern-hero-headline-title">Run an outpost on real NASA numbers.</h1>
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

const CenterImage = () => {
  const { scrollY } = useScroll();

  const clip1 = useTransform(scrollY, [0, SECTION_HEIGHT], [25, 0]);
  const clip2 = useTransform(scrollY, [0, SECTION_HEIGHT], [75, 100]);

  const clipPath = useMotionTemplate`polygon(${clip1}% ${clip1}%, ${clip2}% ${clip1}%, ${clip2}% ${clip2}%, ${clip1}% ${clip2}%)`;

  const backgroundSize = useTransform(scrollY, [0, SECTION_HEIGHT + 500], ["170%", "100%"]);
  const opacity = useTransform(scrollY, [SECTION_HEIGHT, SECTION_HEIGHT + 500], [1, 0]);

  return (
    <motion.div
      className="modern-hero-center-img"
      style={{
        clipPath,
        backgroundSize,
        opacity,
        backgroundImage: "url(/images/hero/hero-center.jpg)",
      }}
    />
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
      <ParallaxImg
        src="/images/hero/hero-parallax-1.jpg"
        alt="Spacecraft ascending from planetary base"
        start={-200}
        end={200}
        className="modern-hero-parallax-img parallax-w-1-3"
      />
      <ParallaxFeature {...HERO_FEATURES[0]!} className="modern-hero-feature-right modern-hero-feature-first" />
      <ParallaxImg
        src="/images/hero/hero-parallax-2.jpg"
        alt="Orbital insertion and planetary horizon"
        start={200}
        end={-250}
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
 * Three cards, one per real scenario — replaces the original five invented "launch windows"
 * (place names and durations that matched no scenario `packages/sim` actually has), which all
 * called the identical `onLaunchMission()` regardless of which card was clicked: every
 * "Select" was the same shortcut wearing a different label. Each card here now pre-selects
 * its own real scenario (`onLaunchMission(scenario.id)`) before entering Setup, so clicking a
 * different card is a genuinely different shortcut, not just different marketing copy on top
 * of the same one destination.
 */
const Schedule = ({ onLaunchMission }: ScheduleProps) => {
  return (
    <section
      id="launch-schedule"
      className="modern-hero-schedule"
      aria-label="Mission Launch Windows"
    >
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
        {onLaunchMission && (
          <button
            type="button"
            onClick={() => {
              onLaunchMission();
            }}
            className="modern-hero-cta-btn"
          >
            Start Mission Setup
          </button>
        )}
      </div>

      {SCENARIO_ORDER.map((id) => {
        const scenario = SCENARIOS[id];
        const meta = SCENARIO_LABELS[id];
        return (
          <ScheduleItem
            key={id}
            title={meta.label}
            date={`${scenario.site.name} · ${durationLabel(scenario.durationHours, scenario.body)}`}
            location={meta.hint}
            onLaunch={onLaunchMission === undefined ? undefined : () => onLaunchMission(id)}
          />
        );
      })}

      <GuideShortcut onLaunchMission={onLaunchMission} />
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
  date: string;
  location: string;
  onLaunch?: (() => void) | undefined;
}

const ScheduleItem = ({ title, date, location, onLaunch }: ScheduleItemProps) => {
  return (
    <motion.div
      initial={{ y: 32, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ ease: "easeInOut", duration: 0.55 }}
      viewport={{ once: true }}
      className="modern-hero-schedule-item"
    >
      <div>
        <h3 className="modern-hero-item-title">{title}</h3>
        <p className="modern-hero-item-date">{date}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="modern-hero-item-location">
          <FiMapPin />
          <span>{location}</span>
        </div>
        {onLaunch && (
          <div className="modern-hero-item-action">
            <button type="button" onClick={onLaunch} className="modern-hero-item-btn">
              Select
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};
