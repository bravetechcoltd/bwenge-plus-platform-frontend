"use client"

import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Check,
  GraduationCap,
  Handshake,
  Infinity as InfinityIcon,
  Laptop,
  Layers,
  Lightbulb,
  Monitor,
  Network,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Users2,
} from "lucide-react"

/**
 * ============================================================================
 * BWENGE+ information sections (HP-002)
 * ============================================================================
 *
 * About BWENGE+, Who We Are, Our Vision, Our Mission and Our Core Values, built
 * to the "BWENGE+ Educational Platform Overview" reference in /public.
 *
 * ── What the reference actually dictates ──────────────────────────────────
 *
 * Density, not decoration. Every section in it is a two-column editorial
 * block — prose on one side, a diagram or a grid on the other — with a small
 * uppercase eyebrow above a large heading, and the explanatory weight carried
 * by compact icon chips rather than by big cards. Nothing in it is full-bleed,
 * nothing is taller than it needs to be, and the only saturated colour on the
 * page is the central ecosystem disc. That is what is reproduced here.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 *
 * The brand purple (#5B4E96) and its lighter companion (#8F7BC9) are declared
 * once, on the wrapper, and referenced through `var()` below. They are scoped
 * to these sections rather than written into the global theme, because the rest
 * of the application already has a palette and this must not repaint it.
 *
 * The icon chips carry a per-item tint, exactly as the reference does — purple,
 * green, blue, amber — instead of six identical purple circles. That is what
 * keeps a six-item grid readable, and it is also why the tints live on the data
 * rather than in the markup: a value's colour belongs to the value.
 *
 * ── Illustrations ─────────────────────────────────────────────────────────
 *
 * The reference places photographs beside each diagram. There are none in this
 * project and none are invented: stock photographs of people presented as a
 * platform's community are a claim about who uses it. The diagrams are built
 * from layout and borders instead, so they cost nothing to load, stay sharp at
 * any size, and reflow on a narrow screen — which a photograph of a diagram
 * cannot do.
 *
 * ── Content ───────────────────────────────────────────────────────────────
 *
 * The organisation's own copy, shortened for the compact composition but never
 * altered in meaning. No statistics, partners, institutions, achievements or
 * endorsements are invented anywhere in this file.
 *
 * Anchors (#about, #who-we-are, #our-vision, #our-mission, #core-values) are
 * what the navigation dropdown targets; `scroll-mt-20` keeps the fixed header
 * from covering a heading that has just been jumped to.
 */

/* ── brand tokens, scoped to these sections ───────────────────────────── */

const BRAND = {
  "--bw-primary": "#5B4E96",
  "--bw-secondary": "#8F7BC9",
} as React.CSSProperties

/** The soft chip tints the reference uses, kept off the markup. */
const TINT = {
  purple: { bg: "rgba(91,78,150,0.10)", fg: "#5B4E96" },
  violet: { bg: "rgba(143,123,201,0.14)", fg: "#6F5DB3" },
  green: { bg: "rgba(16,163,110,0.10)", fg: "#0E8F60" },
  blue: { bg: "rgba(37,99,235,0.10)", fg: "#2563EB" },
  cyan: { bg: "rgba(8,145,178,0.10)", fg: "#0891B2" },
  amber: { bg: "rgba(217,119,6,0.12)", fg: "#B45309" },
} as const

type TintName = keyof typeof TINT

function Chip({
  icon: Icon,
  tint = "purple",
  size = "md",
}: {
  icon: any
  tint?: TintName
  size?: "sm" | "md" | "lg"
}) {
  const box = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10"
  const glyph = size === "sm" ? "h-4 w-4" : size === "lg" ? "h-5 w-5" : "h-[18px] w-[18px]"
  return (
    <span
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-full`}
      style={{ backgroundColor: TINT[tint].bg, color: TINT[tint].fg }}
    >
      <Icon className={glyph} strokeWidth={1.9} />
    </span>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em]"
      style={{ color: "var(--bw-secondary)" }}
    >
      {children}
    </p>
  )
}

function Section({
  id,
  tinted = false,
  className = "",
  children,
}: {
  id?: string
  tinted?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 py-10 sm:py-14 ${tinted ? "bg-muted/40" : "bg-background"} ${className}`}
      style={BRAND}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   1. About BWENGE+
   ══════════════════════════════════════════════════════════════════════════ */

const ABOUT_INDICATORS: { icon: any; label: string; tint: TintName }[] = [
  { icon: Users2, label: "Collaborative Learning", tint: "purple" },
  { icon: ShieldCheck, label: "Standardized Content", tint: "green" },
  { icon: Network, label: "Industry Connection", tint: "blue" },
  { icon: Handshake, label: "Inclusive Access", tint: "cyan" },
]

/** The four satellites on the ring, clockwise from the top left. */
const ORBIT: { icon: any; label: string; tint: TintName }[] = [
  { icon: Building2, label: "Universities", tint: "blue" },
  { icon: GraduationCap, label: "Educators", tint: "green" },
  { icon: Target, label: "Industry", tint: "amber" },
  { icon: Users, label: "Learners", tint: "violet" },
]

/**
 * The ecosystem ring.
 *
 * A CSS grid rather than an SVG diagram: the four satellites sit at the corners
 * of a three-by-three grid with the disc in the middle, so the whole thing
 * reflows to a two-column card list on a phone instead of becoming an
 * unreadable miniature. The dashed ring is one bordered circle behind them, and
 * is hidden on small screens where it no longer connects anything.
 */
function BwengeEcosystem() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* the ring */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-6 hidden rounded-full border border-dashed sm:block"
        style={{ borderColor: "rgba(91,78,150,0.25)" }}
      />

      <div className="relative grid grid-cols-2 items-center gap-3 sm:grid-cols-3 sm:gap-2">
        {ORBIT.slice(0, 2).map((node) => (
          <OrbitNode key={node.label} {...node} />
        ))}

        {/* the disc sits between the two rows on desktop, and after them on mobile */}
        <div className="order-first col-span-2 row-span-1 flex justify-center sm:order-none sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:row-end-3">
          <div
            className="flex h-32 w-32 flex-col items-center justify-center rounded-full text-center text-white shadow-md sm:h-36 sm:w-36"
            style={{
              background: "var(--bw-primary)",
            }}
          >
            <GraduationCap className="mb-1 h-6 w-6" strokeWidth={1.8} />
            <span className="text-sm font-bold leading-none">BWENGE+</span>
            <span className="mt-1 text-[10px] leading-tight opacity-80">
              Knowledge
              <br />
              Connects Us
            </span>
          </div>
        </div>

        {ORBIT.slice(2).map((node) => (
          <OrbitNode key={node.label} {...node} />
        ))}
      </div>
    </div>
  )
}

function OrbitNode({ icon, label, tint }: { icon: any; label: string; tint: TintName }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-sm"
        style={{ color: TINT[tint].fg }}
      >
        {(() => {
          const Icon = icon
          return <Icon className="h-5 w-5" strokeWidth={1.9} />
        })()}
      </span>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </div>
  )
}

function AboutBwengeSection() {
  return (
    <Section id="about">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
        <div>
          <Eyebrow>About BWENGE+</Eyebrow>

          {/* The reference sets the brand word in colour and the rest in ink. */}
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            About <span style={{ color: "var(--bw-primary)" }}>BWENGE+</span>
          </h2>

          <p className="mt-3 max-w-xl text-base font-medium leading-relaxed text-foreground">
            An inclusive digital learning ecosystem connecting universities, companies,
            educators, industry experts, and learners across Rwanda.
          </p>

          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            BWENGE+ is an inclusive digital MOOC and SPOC platform designed to promote
            educational content standardization and collaboration across Rwanda, through a
            shared digital learning environment where knowledge can be developed, delivered,
            and shared.
          </p>

          <a
            href="#who-we-are"
            className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--bw-primary)" }}
          >
            Learn More
            <ArrowRight className="h-4 w-4" />
          </a>

          {/*
            Icon chips, not cards. Four small statements of what the platform is
            for do not each need a bordered container, and giving them one would
            make this column as tall as the diagram beside it.
          */}
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
            {ABOUT_INDICATORS.map((item) => (
              <div key={item.label} className="flex flex-col items-start gap-2">
                <Chip icon={item.icon} tint={item.tint} />
                <span className="text-xs font-semibold leading-snug text-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <BwengeEcosystem />
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   2. Who We Are
   ══════════════════════════════════════════════════════════════════════════ */

const COMMUNITY_POINTS = [
  "Universities collaborate in developing, standardizing, and sharing quality educational content.",
  "Educators and industry professionals work together to create courses aligned with national standards and industry needs.",
  "Learners have inclusive access to relevant knowledge, skills, and learning opportunities.",
  "Universities and companies collaborate to strengthen teaching, learning, and skills development.",
  "Education and knowledge sharing contribute to Rwanda's vision of a knowledge-based economy.",
]

const COMMUNITY_MEMBERS: {
  icon: any
  title: string
  body: string
  tint: TintName
}[] = [
  {
    icon: Building2,
    title: "Universities",
    body: "Developing, standardizing, and sharing quality content.",
    tint: "blue",
  },
  {
    icon: GraduationCap,
    title: "Educators",
    body: "Creating meaningful learning experiences.",
    tint: "green",
  },
  {
    icon: Award,
    title: "Industry Professionals",
    body: "Connecting education with real-world skills.",
    tint: "amber",
  },
  {
    icon: Target,
    title: "Companies",
    body: "Strengthening teaching, learning, and skills development.",
    tint: "cyan",
  },
  {
    icon: Users,
    title: "Learners",
    body: "Accessing relevant knowledge and opportunities.",
    tint: "violet",
  },
]

const PROCESS = ["Connect", "Collaborate", "Learn", "Share", "Grow"]

function MemberCard({ icon: Icon, title, body, tint }: (typeof COMMUNITY_MEMBERS)[number]) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-[color:var(--bw-secondary)]">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
        style={{ backgroundColor: TINT[tint].bg, color: TINT[tint].fg }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <h3 className="text-[13px] font-bold leading-tight text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

/**
 * The five members around the disc.
 *
 * Universities sits above, Industry and Educators flank the disc, Companies and
 * Learners sit below — the reference's arrangement. Below `lg` the disc moves
 * out of the middle and the cards become a plain list, because five cards and a
 * disc cannot share a phone's width without all six becoming illegible.
 */
function CommunityDiagram() {
  const [universities, educators, industry, companies, learners] = COMMUNITY_MEMBERS

  return (
    <div className="w-full">
      <div className="mx-auto max-w-xl lg:max-w-none">
        <div className="mb-3 lg:mx-auto lg:max-w-sm">
          <MemberCard {...universities} />
        </div>

        <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <MemberCard {...industry} />

          <div
            className="mx-auto my-1 flex h-28 w-28 flex-col items-center justify-center rounded-full text-white shadow-md lg:my-0"
            style={{ background: "var(--bw-primary)" }}
          >
            <GraduationCap className="mb-1 h-5 w-5" strokeWidth={1.8} />
            <span className="text-[13px] font-bold">BWENGE+</span>
          </div>

          <MemberCard {...educators} />
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <MemberCard {...companies} />
          <MemberCard {...learners} />
        </div>
      </div>

      {/* Connect → Collaborate → Learn → Share → Grow */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5">
        {PROCESS.map((step, index) => (
          <span key={step} className="flex items-center gap-2">
            <span className="text-[13px] font-semibold" style={{ color: "var(--bw-primary)" }}>
              {step}
            </span>
            {index < PROCESS.length - 1 && (
              <ArrowRight aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function WhoWeAreSection() {
  return (
    <Section id="who-we-are" tinted>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <Eyebrow>Our Community</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Who We Are
          </h2>
          <p className="mt-3 text-base leading-relaxed text-foreground">
            We are a collaborative digital learning community committed to making quality
            education, knowledge sharing, and professional development more accessible.
          </p>

          <p className="mt-5 text-sm font-semibold text-foreground">
            We work together towards a future where:
          </p>
          <ul className="mt-3 space-y-2.5">
            {COMMUNITY_POINTS.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--bw-primary)" }}
                >
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                </span>
                <span className="text-[13px] leading-snug text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <CommunityDiagram />
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   3 + 4. Vision and Mission, side by side
   ══════════════════════════════════════════════════════════════════════════ */

const VISION_FLOW: { icon: any; label: string; tint: TintName }[] = [
  { icon: GraduationCap, label: "Education", tint: "purple" },
  { icon: Users2, label: "Collaboration", tint: "violet" },
  { icon: BookOpen, label: "Knowledge", tint: "blue" },
  { icon: Sparkles, label: "Skills", tint: "green" },
  { icon: Target, label: "Impact", tint: "amber" },
]

const MISSION_ITEMS: { icon: any; title: string; body: string; tint: TintName }[] = [
  {
    icon: Network,
    title: "Connect",
    body: "Universities, companies, educators, experts, and learners.",
    tint: "purple",
  },
  {
    icon: ShieldCheck,
    title: "Standardize",
    body: "Quality content aligned with relevant standards.",
    tint: "green",
  },
  {
    icon: Share2,
    title: "Collaborate",
    body: "Shared course development and teaching.",
    tint: "violet",
  },
  {
    icon: Monitor,
    title: "Learn",
    body: "Accessible digital learning opportunities.",
    tint: "blue",
  },
  {
    icon: TrendingUp,
    title: "Impact",
    body: "Skills development and Rwanda's knowledge economy.",
    tint: "amber",
  },
]

function VisionSection() {
  return (
    <div id="our-vision" className="scroll-mt-20">
      <Eyebrow>Our Vision</Eyebrow>
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Our Vision
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
        To transform education through standardized educational content, collaborative
        learning, and accessible digital knowledge, contributing to an inclusive and
        knowledge-based economy in Rwanda.
      </p>

      {/*
        Education → Collaboration → Knowledge → Skills → Impact.
        The arrows are decorative and marked aria-hidden; the five labels read as
        a list to a screen reader, which is what they are.
      */}
      <ol className="mt-6 flex flex-wrap items-start gap-x-1 gap-y-4">
        {VISION_FLOW.map((node, index) => (
          <li key={node.label} className="flex items-start gap-1">
            <div className="flex w-[72px] flex-col items-center gap-1.5 text-center">
              <Chip icon={node.icon} tint={node.tint} size="lg" />
              <span className="text-[11px] font-semibold leading-tight text-foreground">
                {node.label}
              </span>
            </div>
            {index < VISION_FLOW.length - 1 && (
              <ArrowRight aria-hidden className="mt-4 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function MissionItem({ icon: Icon, title, body, tint }: (typeof MISSION_ITEMS)[number]) {
  return (
    <li className="flex h-full flex-col items-center rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-[color:var(--bw-secondary)]">
      <Chip icon={Icon} tint={tint} />
      <h3 className="mt-2 text-[13px] font-bold text-foreground">{title}</h3>
      <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{body}</p>
    </li>
  )
}

function MissionSection() {
  return (
    <div id="our-mission" className="scroll-mt-20">
      <Eyebrow>Our Mission</Eyebrow>
      <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Our Mission
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        To connect universities, companies, educators, industry experts, and learners through
        an inclusive digital MOOC and SPOC platform that promotes standardized educational
        content, collaborative course development, and shared teaching and learning.
      </p>

      <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {MISSION_ITEMS.map((item) => (
          <MissionItem key={item.title} {...item} />
        ))}
      </ul>
    </div>
  )
}

/**
 * The reference pairs these two across one band, divided by a hairline. They
 * are one thought — where the platform is going and how it gets there — and
 * separating them into two full-width sections would double the height for no
 * added meaning.
 */
function VisionAndMission() {
  return (
    <Section>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
        <VisionSection />
        <div className="lg:border-l lg:border-border lg:pl-12">
          <MissionSection />
        </div>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   5. Core Values
   ══════════════════════════════════════════════════════════════════════════ */

const CORE_VALUES: {
  number: string
  icon: any
  title: string
  body: string
  tint: TintName
}[] = [
  {
    number: "01",
    icon: Handshake,
    title: "Collaboration",
    body: "Meaningful progress comes through working together. We promote collaboration among universities, companies, educators, and learners to develop and share knowledge.",
    tint: "purple",
  },
  {
    number: "02",
    icon: Users2,
    title: "Inclusivity and Accessibility",
    body: "Everyone deserves an opportunity to learn. We promote accessible and inclusive digital education for learners and educators from different backgrounds and institutions.",
    tint: "blue",
  },
  {
    number: "03",
    icon: ShieldCheck,
    title: "Quality and Standards",
    body: "We are committed to promoting quality learning content aligned with relevant national education standards, professional requirements, and industry needs.",
    tint: "green",
  },
  {
    number: "04",
    icon: Lightbulb,
    title: "Innovation",
    body: "We embrace digital technologies and innovative teaching methods to improve learning experiences and expand access to knowledge.",
    tint: "amber",
  },
  {
    number: "05",
    icon: InfinityIcon,
    title: "Never Stop Learning",
    body: "We encourage continuous learning, self-development, knowledge sharing, and lifelong learning. We believe that everyone has something valuable to learn and teach.",
    tint: "cyan",
  },
  {
    number: "06",
    icon: TrendingUp,
    title: "National Development and Impact",
    body: "We align our efforts with Rwanda's knowledge-economy ambitions by supporting skills development, education-industry collaboration, and access to relevant knowledge.",
    tint: "violet",
  },
]

function CoreValueItem({ number, icon, title, body, tint }: (typeof CORE_VALUES)[number]) {
  return (
    <div className="flex h-full gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-[color:var(--bw-secondary)]">
      <Chip icon={icon} tint={tint} />
      <div className="min-w-0">
        {/*
          The number is part of the official content, so it is printed rather
          than implied by grid position — a card that reflows on a narrow screen
          keeps the number it was given.
        */}
        <p className="text-xs font-bold" style={{ color: "var(--bw-secondary)" }}>
          {number}
        </p>
        <h3 className="mt-0.5 text-[13px] font-bold leading-tight text-foreground">{title}</h3>
        <p className="mt-1 text-[11.5px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

function CoreValuesSection() {
  return (
    <Section id="core-values" tinted>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.6fr)_minmax(0,2fr)] lg:gap-10">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Eyebrow>Our Core Values</Eyebrow>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Our Core Values
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            The principles that guide how we learn, teach, collaborate, and grow together.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CORE_VALUES.map((value) => (
            <CoreValueItem key={value.number} {...value} />
          ))}
        </div>
      </div>
    </Section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   the set
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * About BWENGE+ → Who We Are → Vision + Mission → Core Values.
 *
 * One component so that order cannot be half-changed by reordering JSX on the
 * page, and one wrapper so the brand tokens are declared once.
 */
export default function AboutSections() {
  return (
    <div style={BRAND} className="border-t border-border">
      <AboutBwengeSection />
      <WhoWeAreSection />
      <VisionAndMission />
      <CoreValuesSection />
    </div>
  )
}

/**
 * The dropdown's contents, kept beside the sections they point at so a renamed
 * section cannot leave the menu pointing at the old name.
 */
export const ABOUT_NAV_ITEMS = [
  {
    label: "About BWENGE+",
    href: "#about",
    description: "Learn about the platform and what we are building.",
    icon: Layers,
  },
  {
    label: "Who We Are",
    href: "#who-we-are",
    description: "The community behind BWENGE+.",
    icon: Users2,
  },
  {
    label: "Our Vision",
    href: "#our-vision",
    description: "Our long-term direction for education and knowledge sharing.",
    icon: Target,
  },
  {
    label: "Our Mission",
    href: "#our-mission",
    description: "How BWENGE+ connects people and institutions.",
    icon: Network,
  },
  {
    label: "Our Core Values",
    href: "#core-values",
    description: "The principles that guide our work.",
    icon: ShieldCheck,
  },
]

/** The heading block above the dropdown's items, as the reference shows it. */
export const ABOUT_NAV_HEADING = {
  title: "About BWENGE+",
  description: "Discover BWENGE+, our purpose, vision, mission, and principles.",
}
