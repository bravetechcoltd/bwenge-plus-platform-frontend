"use client"

import { useState } from "react"
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  Handshake,
  Infinity as InfinityIcon,
  Landmark,
  Layers,
  Lightbulb,
  Monitor,
  Network,
  Settings,
  Share2,
  ShieldCheck,
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
 * Built to "/public/BWENGE+ Educational Platform Overview.png", section by
 * section and in its proportions.
 *
 * ── What the reference is ─────────────────────────────────────────────────
 *
 * Four bands, each a wide editorial split rather than a stack of full-width
 * blocks:
 *
 *   1. About BWENGE+   text on the left  | orbit diagram + photo on the right
 *   2. Who We Are      text ~1/3 | hub-and-spoke diagram ~40% | photo ~27%
 *   3. Vision | Mission  one band, photo bleeding off the left edge, the two
 *                        halves divided by a hairline
 *   4. Core Values     heading column ~1/4 | three-across grid
 *
 * The type is large and the bodies are small: a 36–40px heading over 13px grey
 * prose is what makes those bands read as dense without feeling cramped. The
 * icon chips are circles of tinted colour — purple, blue, green, amber, cyan —
 * never six of the same purple, and the only saturated fill on the page is the
 * ecosystem disc at the centre of each diagram.
 *
 * ── The photographs ───────────────────────────────────────────────────────
 *
 * The reference places three photographs: a student with a laptop beside the
 * orbit, a group around a laptop beside the community diagram, and Kigali
 * clipped into the left edge of the vision band. Those files are not in this
 * repository, and stock photographs presented as this platform's community
 * would be a claim about who uses it.
 *
 * So `Figure` takes the exact slot each one occupies and renders the file when
 * it is there, falling back to a brand panel when it is not. Drop
 * `/about/learner.jpg`, `/about/community.jpg` and `/about/kigali.jpg` into
 * `public` and the three compositions complete themselves with no code change.
 *
 * ── Colour ────────────────────────────────────────────────────────────────
 *
 * #5B4E96 and #8F7BC9, declared once on the wrapper and read through `var()`,
 * scoped to these sections so the rest of the application's palette is
 * untouched.
 */

const BRAND = {
  "--bw-primary": "#5B4E96",
  "--bw-secondary": "#8F7BC9",
  "--bw-tint": "#F6F5FC",
  "--bw-line": "#E8E5F3",
} as React.CSSProperties

const TINT = {
  purple: { bg: "rgba(91,78,150,0.10)", fg: "#5B4E96" },
  violet: { bg: "rgba(143,123,201,0.16)", fg: "#6F5DB3" },
  pink: { bg: "rgba(192,132,252,0.14)", fg: "#9333EA" },
  green: { bg: "rgba(16,163,110,0.10)", fg: "#0E8F60" },
  blue: { bg: "rgba(37,99,235,0.10)", fg: "#2563EB" },
  cyan: { bg: "rgba(8,145,178,0.10)", fg: "#0891B2" },
  amber: { bg: "rgba(217,119,6,0.12)", fg: "#B45309" },
} as const

type TintName = keyof typeof TINT

/* ── small shared pieces ──────────────────────────────────────────────── */

function Chip({
  icon: Icon,
  tint = "purple",
  size = 44,
}: {
  icon: any
  tint?: TintName
  size?: number
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{
        height: size,
        width: size,
        backgroundColor: TINT[tint].bg,
        color: TINT[tint].fg,
      }}
    >
      <Icon style={{ height: size * 0.44, width: size * 0.44 }} strokeWidth={1.9} />
    </span>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{ color: "var(--bw-secondary)" }}
    >
      {children}
    </p>
  )
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[30px] font-bold leading-[1.1] tracking-tight text-foreground sm:text-[38px]">
      {children}
    </h2>
  )
}

/**
 * A photograph slot.
 *
 * It holds its aspect ratio whether or not the file exists, so the composition
 * beside it never shifts when the image loads or fails. Missing is the normal
 * state today, and the fallback is a quiet brand panel rather than a broken
 * icon or an empty hole.
 */
function Figure({
  src,
  alt,
  icon: Icon,
  className = "",
  rounded = "rounded-2xl",
}: {
  src: string
  alt: string
  icon: any
  className?: string
  rounded?: string
}) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        aria-hidden
        className={`flex items-center justify-center overflow-hidden ${rounded} ${className}`}
        style={{
          background: "linear-gradient(160deg, rgba(91,78,150,0.08), rgba(143,123,201,0.16))",
          border: "1px solid var(--bw-line)",
        }}
      >
        <Icon className="h-10 w-10" strokeWidth={1.2} style={{ color: "var(--bw-secondary)" }} />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  )
}

function Band({
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
      className={`scroll-mt-20 overflow-hidden py-12 sm:py-16 ${className}`}
      style={{ ...BRAND, backgroundColor: tinted ? "var(--bw-tint)" : "transparent" }}
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

const ORBIT: { icon: any; label: string; tint: TintName }[] = [
  { icon: Landmark, label: "Universities", tint: "blue" },
  { icon: GraduationCap, label: "Educators", tint: "green" },
  { icon: Briefcase, label: "Industry", tint: "blue" },
  { icon: Users, label: "Learners", tint: "pink" },
]

function OrbitNode({ icon: Icon, label, tint }: (typeof ORBIT)[number]) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span
        className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-card shadow-sm"
        style={{ border: "1px solid var(--bw-line)", color: TINT[tint].fg }}
      >
        <Icon className="h-[22px] w-[22px]" strokeWidth={1.9} />
      </span>
      <span className="text-[12px] font-semibold text-foreground">{label}</span>
    </div>
  )
}

/**
 * The orbit.
 *
 * A three-by-three grid with the four nodes in the corners and the disc in the
 * middle, which is the reference's diagonal arrangement and — unlike absolute
 * positioning on a circle — survives a phone: below `sm` the ring is dropped
 * and the four nodes become a plain two-column pair around the disc.
 */
function BwengeOrbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      <div
        aria-hidden
        className="absolute inset-[14%] hidden rounded-full border border-dashed sm:block"
        style={{ borderColor: "rgba(91,78,150,0.3)" }}
      />

      <div className="relative grid h-full grid-cols-3 grid-rows-3 place-items-center">
        <div className="col-start-1 row-start-1">
          <OrbitNode {...ORBIT[0]} />
        </div>
        <div className="col-start-3 row-start-1">
          <OrbitNode {...ORBIT[1]} />
        </div>

        <div
          className="col-start-2 row-start-2 flex h-[124px] w-[124px] flex-col items-center justify-center rounded-full text-center text-white shadow-lg sm:h-[136px] sm:w-[136px]"
          style={{ background: "var(--bw-primary)" }}
        >
          <GraduationCap className="mb-1 h-6 w-6" strokeWidth={1.7} />
          <span className="text-[15px] font-bold leading-none">BWENGE+</span>
          <span className="mt-1 text-[10px] leading-[1.3] opacity-85">
            Knowledge
            <br />
            Connects Us
          </span>
        </div>

        <div className="col-start-1 row-start-3">
          <OrbitNode {...ORBIT[2]} />
        </div>
        <div className="col-start-3 row-start-3">
          <OrbitNode {...ORBIT[3]} />
        </div>
      </div>
    </div>
  )
}

function AboutBwengeSection() {
  return (
    <Band id="about" tinted>
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {/* ── left ── */}
        <div>
          <Eyebrow>About BWENGE+</Eyebrow>
          <Heading>
            About <span style={{ color: "var(--bw-primary)" }}>BWENGE+</span>
          </Heading>

          <p className="mt-4 max-w-[30rem] text-[15px] font-medium leading-relaxed text-foreground">
            An inclusive digital learning ecosystem connecting universities, companies,
            educators, industry experts, and learners across Rwanda.
          </p>

          <p className="mt-4 max-w-[30rem] text-[13px] leading-[1.75] text-muted-foreground">
            BWENGE+ is an inclusive digital MOOC and SPOC platform designed to promote
            educational content standardization and collaboration across Rwanda. We connect
            universities, companies, educators, industry experts, and learners through a shared
            digital learning environment where knowledge can be developed, delivered, and
            shared.
          </p>

          <a
            href="#who-we-are"
            className="mt-6 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ background: "var(--bw-primary)" }}
          >
            Learn More
            <ArrowRight className="h-4 w-4" />
          </a>

          {/*
            Chips, not cards. Four short statements of what the platform is for
            do not each need a bordered container, and giving them one would make
            this column taller than the diagram beside it.
          */}
          <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 sm:grid-cols-4">
            {ABOUT_INDICATORS.map((item) => (
              <div key={item.label} className="flex flex-col items-start gap-2.5">
                <Chip icon={item.icon} tint={item.tint} />
                <span className="text-[12px] font-semibold leading-[1.35] text-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── right: orbit, with the learner photograph alongside ── */}
        <div className="relative">
          {/*
            The handwritten aside from the reference. Decorative, so it is
            hidden from assistive technology and from narrow screens, where it
            would collide with the diagram.
          */}
          <p
            aria-hidden
            className="absolute -top-2 right-2 hidden max-w-[9rem] text-right text-[13px] font-medium italic leading-tight xl:block"
            style={{ color: "var(--bw-secondary)" }}
          >
            Together for a stronger Rwanda
          </p>

          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <BwengeOrbit />
            <Figure
              src="/about/learner.jpg"
              alt="A BWENGE+ learner studying on a laptop"
              icon={Monitor}
              className="hidden h-[280px] w-[180px] sm:block"
            />
          </div>
        </div>
      </div>
    </Band>
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

const COMMUNITY_MEMBERS: Record<
  string,
  { icon: any; title: string; body: string; tint: TintName }
> = {
  universities: {
    icon: Landmark,
    title: "Universities",
    body: "Developing, standardizing, and sharing quality content.",
    tint: "blue",
  },
  industry: {
    icon: Briefcase,
    title: "Industry Professionals",
    body: "Connecting education with real-world skills and industry needs.",
    tint: "blue",
  },
  educators: {
    icon: GraduationCap,
    title: "Educators",
    body: "Creating and delivering meaningful learning experiences.",
    tint: "green",
  },
  companies: {
    icon: Building2,
    title: "Companies",
    body: "Collaborating to strengthen skills development.",
    tint: "cyan",
  },
  learners: {
    icon: Users,
    title: "Learners",
    body: "Accessing relevant knowledge, skills and opportunities.",
    tint: "pink",
  },
}

const PROCESS = ["Connect", "Collaborate", "Learn", "Share", "Grow"]

function MemberCard({
  member,
}: {
  member: (typeof COMMUNITY_MEMBERS)[keyof typeof COMMUNITY_MEMBERS]
}) {
  const Icon = member.icon
  return (
    <div
      className="flex gap-3 rounded-xl bg-card p-3.5 shadow-sm transition-shadow hover:shadow-md"
      style={{ border: "1px solid var(--bw-line)" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: TINT[member.tint].bg, color: TINT[member.tint].fg }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <h3 className="text-[12.5px] font-bold leading-tight" style={{ color: TINT[member.tint].fg }}>
          {member.title}
        </h3>
        <p className="mt-1 text-[11px] leading-[1.45] text-muted-foreground">{member.body}</p>
      </div>
    </div>
  )
}

/**
 * The hub and its five spokes.
 *
 * Universities above, Industry and Educators flanking the disc, Companies and
 * Learners below — the reference's arrangement. The connectors are one SVG
 * stretched behind the grid with `preserveAspectRatio="none"`, so the lines
 * follow the cards as the grid reflows instead of drifting off them; the whole
 * overlay is dropped below `lg`, where the cards stack and there is nothing
 * left for a line to connect.
 */
function BwengeEcosystem() {
  return (
    <div>
      <div className="relative mx-auto max-w-xl lg:max-w-none">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {[
            [50, 26],
            [26, 50],
            [74, 50],
            [30, 76],
            [70, 76],
          ].map(([x, y]) => (
            <line
              key={`${x}-${y}`}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke="var(--bw-line)"
              strokeWidth="0.5"
            />
          ))}
        </svg>

        <div className="relative">
          <div className="mb-3 lg:mx-auto lg:max-w-[18rem]">
            <MemberCard member={COMMUNITY_MEMBERS.universities} />
          </div>

          <div className="grid items-center gap-3 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <MemberCard member={COMMUNITY_MEMBERS.industry} />

            <div
              className="mx-auto my-1 flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full text-white shadow-lg lg:my-0"
              style={{ background: "var(--bw-primary)" }}
            >
              <GraduationCap className="mb-1 h-5 w-5" strokeWidth={1.7} />
              <span className="text-[13px] font-bold">BWENGE+</span>
            </div>

            <MemberCard member={COMMUNITY_MEMBERS.educators} />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <MemberCard member={COMMUNITY_MEMBERS.companies} />
            <MemberCard member={COMMUNITY_MEMBERS.learners} />
          </div>
        </div>
      </div>

      {/* Connect → Collaborate → Learn → Share → Grow */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {PROCESS.map((step, index) => (
          <span key={step} className="flex items-center gap-3">
            <span className="text-[13px] font-semibold" style={{ color: "var(--bw-primary)" }}>
              {step}
            </span>
            {index < PROCESS.length - 1 && (
              <ArrowRight aria-hidden className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function WhoWeAreSection() {
  return (
    <Band id="who-we-are">
      {/* Three columns at xl, as the reference has it: prose, diagram, photo. */}
      <div className="grid gap-8 lg:grid-cols-2 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.1fr)_minmax(0,0.62fr)] xl:items-center xl:gap-6">
        <div>
          <Eyebrow>Our Community</Eyebrow>
          <Heading>Who We Are</Heading>
          <p className="mt-4 text-[14px] leading-relaxed text-foreground">
            We are a collaborative digital learning community committed to making quality
            education, knowledge sharing, and professional development more accessible.
          </p>

          <p className="mt-5 text-[12.5px] font-bold text-foreground">
            We work together towards a future where:
          </p>
          <ul className="mt-3 space-y-2.5">
            {COMMUNITY_POINTS.map((point) => (
              <li key={point} className="flex gap-2.5">
                <span
                  className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "var(--bw-primary)" }}
                >
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                </span>
                <span className="text-[12px] leading-[1.5] text-muted-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <BwengeEcosystem />

        <Figure
          src="/about/community.jpg"
          alt="Educators and learners collaborating around a laptop"
          icon={Users2}
          className="hidden h-[320px] w-full xl:block"
        />
      </div>
    </Band>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   3 + 4. Vision and Mission — one band, split by a hairline
   ══════════════════════════════════════════════════════════════════════════ */

const VISION_FLOW: { icon: any; label: string }[] = [
  { icon: GraduationCap, label: "Education" },
  { icon: Users2, label: "Collaboration" },
  { icon: BookOpen, label: "Knowledge" },
  { icon: Settings, label: "Skills" },
  { icon: Target, label: "Impact" },
]

const MISSION_ITEMS: { icon: any; title: string; body: string; tint: TintName }[] = [
  {
    icon: Network,
    title: "Connect",
    body: "Universities, companies, educators, experts and learners.",
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
      <Heading>Our Vision</Heading>
      <p className="mt-4 max-w-[28rem] text-[13px] leading-[1.75] text-muted-foreground">
        To transform education through standardized educational content, collaborative
        learning, and accessible digital knowledge, contributing to an inclusive and
        knowledge-based economy in Rwanda.
      </p>

      {/*
        Education → Collaboration → Knowledge → Skills → Impact. The arrows are
        decorative and hidden from assistive technology; the five labels read as
        the list they are.
      */}
      <ol className="mt-7 flex flex-wrap items-start gap-y-5">
        {VISION_FLOW.map((node, index) => (
          <li key={node.label} className="flex items-start">
            <div className="flex w-[78px] flex-col items-center gap-2 text-center">
              <Chip icon={node.icon} tint="purple" />
              <span className="text-[11px] font-semibold leading-tight text-foreground">
                {node.label}
              </span>
            </div>
            {index < VISION_FLOW.length - 1 && (
              <ArrowRight
                aria-hidden
                className="mt-[15px] h-3.5 w-3.5 shrink-0 text-muted-foreground/60"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function MissionItem({ icon: Icon, title, body, tint }: (typeof MISSION_ITEMS)[number]) {
  return (
    <li
      className="flex h-full flex-col items-center rounded-xl p-3 text-center transition-shadow hover:bg-card hover:shadow-md"
      style={{ border: "1px solid var(--bw-line)", backgroundColor: "rgba(246,245,252,0.6)" }}
    >
      <Chip icon={Icon} tint={tint} size={38} />
      <h3 className="mt-2 text-[12.5px] font-bold" style={{ color: TINT[tint].fg }}>
        {title}
      </h3>
      <p className="mt-1 text-[10.5px] leading-[1.45] text-muted-foreground">{body}</p>
    </li>
  )
}

function MissionSection() {
  return (
    <div id="our-mission" className="scroll-mt-20">
      <Eyebrow>Our Mission</Eyebrow>
      <Heading>Our Mission</Heading>
      <p className="mt-4 text-[13px] leading-[1.75] text-muted-foreground">
        To connect universities, companies, educators, industry experts, and learners through an
        inclusive digital MOOC and SPOC platform that promotes standardized educational content,
        collaborative course development, and shared teaching and learning.
      </p>

      <ul className="mt-7 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {MISSION_ITEMS.map((item) => (
          <MissionItem key={item.title} {...item} />
        ))}
      </ul>
    </div>
  )
}

/**
 * The reference runs these across one band with Kigali clipped into the left
 * edge. They are one thought — where the platform is going and how it gets
 * there — and two full-width sections would double the height for no added
 * meaning.
 */
function VisionAndMission() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16" style={BRAND}>
      {/* The photograph bleeds off the left edge, behind the content column. */}
      <Figure
        src="/about/kigali.jpg"
        alt="Kigali"
        icon={Building2}
        rounded="rounded-r-3xl"
        className="absolute left-0 top-1/2 hidden h-[260px] w-[200px] -translate-y-1/2 xl:block"
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 xl:pl-[14rem]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
          <VisionSection />
          <div className="lg:border-l lg:pl-10" style={{ borderColor: "var(--bw-line)" }}>
            <MissionSection />
          </div>
        </div>
      </div>
    </section>
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
    body: "We believe that meaningful progress comes through working together. We promote collaboration among universities, companies, educators, and learners to develop and share knowledge.",
    tint: "purple",
  },
  {
    number: "02",
    icon: Users2,
    title: "Inclusivity and Accessibility",
    body: "We believe that everyone deserves an opportunity to learn. We promote accessible and inclusive digital education for learners and educators from different backgrounds and institutions.",
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
    body: "We align our efforts with Rwanda's knowledge economy ambitions by supporting skills development, education-industry collaboration, and access to relevant knowledge.",
    tint: "violet",
  },
]

function CoreValueItem({ number, icon, title, body, tint }: (typeof CORE_VALUES)[number]) {
  return (
    <div
      className="flex h-full gap-3 rounded-xl p-4 transition-shadow hover:bg-card hover:shadow-md"
      style={{ border: "1px solid var(--bw-line)", backgroundColor: "rgba(255,255,255,0.65)" }}
    >
      <Chip icon={icon} tint={tint} size={38} />
      <div className="min-w-0">
        {/*
          The numbering is part of the official content, so it is printed rather
          than implied by grid position — a card that reflows on a narrow screen
          keeps the number it was given.
        */}
        <p className="text-[12px] font-bold" style={{ color: TINT[tint].fg }}>
          {number}
        </p>
        <h3 className="mt-0.5 text-[12.5px] font-bold leading-tight text-foreground">{title}</h3>
        <p className="mt-1.5 text-[11px] leading-[1.5] text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

function CoreValuesSection() {
  return (
    <Band id="core-values" tinted>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.52fr)_minmax(0,2fr)] lg:gap-10">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Eyebrow>Our Core Values</Eyebrow>
          <Heading>Our Core Values</Heading>
          <p className="mt-4 text-[13px] leading-[1.7] text-muted-foreground">
            The principles that guide how we learn, teach, collaborate, and grow together.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CORE_VALUES.map((value) => (
            <CoreValueItem key={value.number} {...value} />
          ))}
        </div>
      </div>
    </Band>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function AboutSections() {
  return (
    <div style={BRAND}>
      <AboutBwengeSection />
      <WhoWeAreSection />
      <VisionAndMission />
      <CoreValuesSection />
    </div>
  )
}

/** The dropdown's contents, kept beside the sections they point at. */
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
    label: "Core Values",
    href: "#core-values",
    description: "The principles that guide our work.",
    icon: Award,
  },
]

export const ABOUT_NAV_HEADING = {
  title: "About BWENGE+",
  description: "Discover BWENGE+, our purpose, vision, mission, and principles.",
}
