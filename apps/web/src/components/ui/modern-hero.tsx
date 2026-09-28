import { ReactLenis } from "lenis/react";
import { motion, useMotionTemplate, useScroll, useTransform } from "framer-motion";
import { FiArrowRight, FiMapPin } from "react-icons/fi";
import { useRef } from "react";
import { SCENARIOS, type ScenarioId } from "@sol-keeper/sim";
import { SCENARIO_LABELS } from "../../dial/scenarioLabels.js";
import { durationLabel } from "../../dial/missionTime.js";
import "./modern-hero.css";

export interface SmoothScrollHeroProps {
  onLaunchMission?: ((scenarioId?: ScenarioId) => void) | undefined;
}

export const SmoothScrollHero = ({ onLaunchMission }: SmoothScrollHeroProps) => {
  return (
    <div className="modern-hero-root">
      <ReactLenis root>
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

const SECTION_HEIGHT = 1500;

const Hero = () => {
  return (
    <div style={{ height: `calc(${SECTION_HEIGHT}px + 100vh)` }} className="modern-hero-section">
      <CenterImage />
      <ParallaxImages />
      <div className="modern-hero-gradient-overlay" />
    </div>
  );
};

const CenterImage = () => {
  const { scrollY } = useScroll();

  const clip1 = useTransform(scrollY, [0, 1500], [25, 0]);
  const clip2 = useTransform(scrollY, [0, 1500], [75, 100]);

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
      <ParallaxImg
        src="/images/hero/hero-parallax-2.jpg"
        alt="Orbital insertion and planetary horizon"
        start={200}
        end={-250}
        className="modern-hero-parallax-img parallax-w-2-3"
      />
      <ParallaxImg
        src="/images/hero/hero-parallax-3.jpg"
        alt="Deep space communication satellite array"
        start={-200}
        end={200}
        className="modern-hero-parallax-img parallax-w-1-3-ml-auto"
      />
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
    </section>
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
