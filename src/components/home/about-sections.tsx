"use client"

import { useState } from "react"
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
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
  Users,
  Users2,
} from "lucide-react"

/**
 * ============================================================================
 * BWENGE+ information sections (HP-002)
 * ============================================================================
 *
 * Built to "/public/BWENGE+ Educational Platform Overview.png".
 *
 * ── What makes the reference look the way it does ─────────────────────────
 *
 * Three things, and the first two are what a summary of it always loses:
 *
 *   1. The surfaces are never flat. Each band is near-white with soft, very
 *      low-opacity colour washes behind the illustrations — lavender, cornflower,
 *      a little green — plus a pale map silhouette behind the About orbit. Those
 *      washes are why it reads as depth rather than as boxes on a page.
 *
 *   2. The cards have almost no border. They sit on a soft, wide, low-opacity
 *      shadow with a hairline at most. A 1px grey border on every card is the
 *      single change that makes a layout like this look generated.
 *
 *   3. The type is a hard ratio: a ~34px bold heading over a 15px lead over a
 *      12.5px body, with 10–11px copy inside the cards. The density comes from
 *      that gap, not from cramming.
 *
 * Everything below follows those, plus the per-element detail the crops show:
 * diamond markers on the orbit ring, coloured rings around the white orbit
 * nodes, card titles tinted to their own icon colour, the raised middle card in
 * the mission row, and the Kigali photo clipped into a chevron that points into
 * the vision copy.
 *
 * ── The photographs ───────────────────────────────────────────────────────
 *
 * The reference uses three, in About, Who We Are and Vision; Mission and Core
 * Values have none, and adding any there would depart from it.
 *
 * This environment has no network access, so no stock library was reachable.
 * The three are cut from the reference PNG itself with sharp and live in
 * /public/about — which makes them exact rather than approximate, since they
 * are the images the design was drawn around.
 *
 * Each crop already carries its own composition: the colour shapes behind the
 * learner, the geometry behind the group, the chevron around Kigali. So they
 * are frameless cut-outs on the band wash, not cards — a rounded frame would
 * put a second shape around one that already has its own.
 */

const BRAND = {
  "--bw-primary": "#5B4E96",
  "--bw-deep": "#4A3F80",
  "--bw-secondary": "#8F7BC9",
  "--bw-wash": "#F7F6FC",
  "--bw-line": "#EDEBF6",
  "--bw-shadow": "0 2px 14px rgba(42,46,90,0.07)",
  "--bw-shadow-lg": "0 8px 28px rgba(42,46,90,0.10)",
} as React.CSSProperties

const TINT = {
  purple: { bg: "#EDE9F8", fg: "#5B4E96", ring: "rgba(91,78,150,0.22)" },
  violet: { bg: "#F0EAFB", fg: "#7A5FC0", ring: "rgba(122,95,192,0.22)" },
  pink: { bg: "#F8E9F6", fg: "#9D4EDD", ring: "rgba(157,78,221,0.20)" },
  blue: { bg: "#E4EDFD", fg: "#2F6BE0", ring: "rgba(47,107,224,0.20)" },
  green: { bg: "#E3F5EC", fg: "#12916A", ring: "rgba(18,145,106,0.20)" },
  cyan: { bg: "#E0F2FA", fg: "#0E8BB0", ring: "rgba(14,139,176,0.20)" },
  amber: { bg: "#FDF0DC", fg: "#C97A14", ring: "rgba(201,122,20,0.22)" },
} as const

type TintName = keyof typeof TINT

/* ── primitives ───────────────────────────────────────────────────────── */

function Chip({
  icon: Icon,
  tint = "purple",
  size = 46,
}: {
  icon: any
  tint?: TintName
  size?: number
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full"
      style={{ height: size, width: size, backgroundColor: TINT[tint].bg, color: TINT[tint].fg }}
    >
      <Icon style={{ height: size * 0.42, width: size * 0.42 }} strokeWidth={1.9} />
    </span>
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2.5 text-[11px] font-bold uppercase tracking-[0.15em]"
      style={{ color: "var(--bw-secondary)" }}
    >
      {children}
    </p>
  )
}

function Heading({ children, size = "lg" }: { children: React.ReactNode; size?: "lg" | "md" }) {
  return (
    <h2
      className={`font-bold leading-[1.12] tracking-[-0.02em] text-foreground ${
        size === "lg" ? "text-[28px] sm:text-[34px]" : "text-[24px] sm:text-[28px]"
      }`}
    >
      {children}
    </h2>
  )
}

/**
 * A colour wash.
 *
 * The reference's depth comes from large, very soft, low-opacity blooms behind
 * the illustrations rather than from gradients on the cards. They are
 * decorative and non-interactive, so they are aria-hidden and
 * pointer-events-none, and they sit at low opacity so text over them stays at
 * full contrast.
 */
function Wash({
  className,
  color,
  opacity = 0.5,
}: {
  className: string
  color: string
  opacity?: number
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute rounded-full blur-3xl ${className}`}
      style={{ backgroundColor: color, opacity }}
    />
  )
}

/** A photograph slot that holds its size whether or not the file is there. */
function Figure({
  src,
  alt,
  className = "",
  style,
}: {
  src: string
  alt: string
  className?: string
  style?: React.CSSProperties
}) {
  const [failed, setFailed] = useState(false)

  /*
   * A missing file leaves the slot empty rather than drawing a placeholder.
   * These images are cut-outs floating on the band's own wash, not cards, so
   * there is no frame to hold open — a coloured rectangle in the gap would be
   * more conspicuous than the gap.
   */
  if (failed) return null

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
      style={style}
    />
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   1. About BWENGE+
   ══════════════════════════════════════════════════════════════════════════ */

const ABOUT_INDICATORS: { icon: any; label: string; tint: TintName }[] = [
  { icon: Users2, label: "Collaborative Learning", tint: "purple" },
  { icon: BadgeCheck, label: "Standardized Content", tint: "green" },
  { icon: Network, label: "Industry Connection", tint: "blue" },
  { icon: Users, label: "Inclusive Access", tint: "cyan" },
]

const ORBIT: { icon: any; label: string; tint: TintName }[] = [
  { icon: Landmark, label: "Universities", tint: "blue" },
  { icon: GraduationCap, label: "Educators", tint: "green" },
  { icon: Briefcase, label: "Industry", tint: "blue" },
  { icon: Users, label: "Learners", tint: "pink" },
]

/** White circle, tinted glyph, and a ring in the same tint — as the crop shows. */
function OrbitNode({ icon: Icon, label, tint }: (typeof ORBIT)[number]) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-white"
        style={{
          color: TINT[tint].fg,
          boxShadow: `0 0 0 5px ${TINT[tint].bg}, var(--bw-shadow)`,
        }}
      >
        <Icon className="h-[23px] w-[23px]" strokeWidth={1.9} />
      </span>
      <span className="text-[11.5px] font-semibold text-foreground">{label}</span>
    </div>
  )
}

function BwengeOrbit() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[370px]">
      {/* the dashed ring, with the four diamond markers the reference sets on it */}
      <div
        aria-hidden
        className="absolute inset-[13%] hidden rounded-full border border-dashed sm:block"
        style={{ borderColor: "rgba(91,78,150,0.28)" }}
      >
        {[
          "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2",
          "left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
          "top-1/2 left-0 -translate-y-1/2 -translate-x-1/2",
          "top-1/2 right-0 -translate-y-1/2 translate-x-1/2",
        ].map((pos) => (
          <span
            key={pos}
            className={`absolute h-[7px] w-[7px] rotate-45 ${pos}`}
            style={{ backgroundColor: "var(--bw-secondary)", opacity: 0.55 }}
          />
        ))}
      </div>

      <div className="relative grid h-full grid-cols-3 grid-rows-3 place-items-center">
        <div className="col-start-1 row-start-1">
          <OrbitNode {...ORBIT[0]} />
        </div>
        <div className="col-start-3 row-start-1">
          <OrbitNode {...ORBIT[1]} />
        </div>

        <div
          className="col-start-2 row-start-2 flex h-[122px] w-[122px] flex-col items-center justify-center rounded-full text-center text-white sm:h-[134px] sm:w-[134px]"
          style={{
            background: "linear-gradient(155deg, #6C5BA8, var(--bw-deep))",
            boxShadow: "0 10px 30px rgba(91,78,150,0.35)",
          }}
        >
          <GraduationCap className="mb-1.5 h-[26px] w-[26px]" strokeWidth={1.6} />
          <span className="text-[15px] font-bold leading-none tracking-tight">BWENGE+</span>
          <span className="mt-1.5 text-[9.5px] font-medium leading-[1.35] opacity-80">
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
    <section
      id="about"
      className="relative scroll-mt-20 overflow-hidden py-14 sm:py-16"
      style={{ ...BRAND, backgroundColor: "#FBFAFE" }}
    >
      {/* the washes behind the illustration, as in the reference */}
      <Wash className="-right-20 top-0 h-[460px] w-[560px]" color="#D9D4F2" opacity={0.55} />
      <Wash className="right-[16%] top-[8%] h-[260px] w-[300px]" color="#CFE0FA" opacity={0.5} />
      <Wash className="-right-10 bottom-0 h-[240px] w-[280px]" color="#CDEBDC" opacity={0.45} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          {/* ── left ── */}
          <div>
            <Eyebrow>About BWENGE+</Eyebrow>
            <Heading>
              About <span style={{ color: "var(--bw-primary)" }}>BWENGE+</span>
            </Heading>

            <p className="mt-4 max-w-[29rem] text-[15px] font-medium leading-[1.55] text-foreground">
              An inclusive digital learning ecosystem connecting universities, companies,
              educators, industry experts, and learners across Rwanda.
            </p>

            <p className="mt-4 max-w-[29rem] text-[12.5px] leading-[1.85] text-muted-foreground">
              BWENGE+ is an inclusive digital MOOC and SPOC platform designed to promote
              educational content standardization and collaboration across Rwanda. We connect
              universities, companies, educators, industry experts, and learners through a
              shared digital learning environment where knowledge can be developed, delivered,
              and shared.
            </p>

            <a
              href="#who-we-are"
              className="mt-7 inline-flex items-center gap-3 rounded-full py-3 pl-6 pr-4 text-[12.5px] font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #6C5BA8, var(--bw-deep))",
                boxShadow: "0 8px 20px rgba(91,78,150,0.32)",
              }}
            >
              Learn More
              <ArrowRight className="h-4 w-4" />
            </a>

            <div className="mt-9 grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-4">
              {ABOUT_INDICATORS.map((item) => (
                <div key={item.label} className="flex flex-col items-start gap-3">
                  <Chip icon={item.icon} tint={item.tint} />
                  <span className="text-[11.5px] font-semibold leading-[1.35] text-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── right ── */}
          <div className="relative">
            {/* the pale map silhouette the reference sets behind the orbit */}
            <svg
              aria-hidden
              viewBox="0 0 200 180"
              className="pointer-events-none absolute left-1/2 top-1/2 hidden h-[330px] w-[380px] -translate-x-1/2 -translate-y-1/2 sm:block"
              style={{ opacity: 0.35 }}
            >
              <path
                d="M38 60 L72 26 L128 20 L168 48 L178 96 L150 142 L96 160 L48 142 L24 104 Z"
                fill="#D7D0F0"
              />
            </svg>

            <p
              aria-hidden
              className="absolute -top-4 right-0 hidden max-w-[8.5rem] text-right text-[13.5px] font-medium italic leading-[1.35] text-foreground/70 lg:block"
            >
              Together
              <br />
              for a stronger
              <br />
              Rwanda
            </p>

            <div className="relative grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <BwengeOrbit />
              <Figure
                src="/about/learner.png"
                alt="A BWENGE+ learner studying on a laptop"
                className="hidden h-[300px] w-[215px] object-contain sm:block"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
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

type Member = { icon: any; title: string; body: string; tint: TintName }

const MEMBERS: Record<string, Member> = {
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
    tint: "violet",
  },
  companies: {
    icon: Building2,
    title: "Companies",
    body: "Collaborating to strengthen skills development.",
    tint: "blue",
  },
  learners: {
    icon: Users,
    title: "Learners",
    body: "Accessing relevant knowledge, skills and opportunities.",
    tint: "violet",
  },
}

const PROCESS = ["Connect", "Collaborate", "Learn", "Share", "Grow"]

/**
 * A member card.
 *
 * White, a generous radius, one soft wide shadow and no visible border — the
 * reference's card, and the detail a border would destroy. The title takes its
 * icon's colour, which is what stops five near-identical cards reading as a
 * wall of grey text.
 */
function MemberCard({ member }: { member: Member }) {
  const Icon = member.icon
  return (
    <div
      className="flex gap-3 rounded-[14px] bg-white p-3.5 transition-shadow hover:shadow-[var(--bw-shadow-lg)]"
      style={{ boxShadow: "var(--bw-shadow)" }}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
        style={{ backgroundColor: TINT[member.tint].bg, color: TINT[member.tint].fg }}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.9} />
      </span>
      <div className="min-w-0">
        <h3
          className="text-[12.5px] font-bold leading-tight"
          style={{ color: TINT[member.tint].fg }}
        >
          {member.title}
        </h3>
        <p className="mt-1 text-[10.5px] leading-[1.5] text-muted-foreground">{member.body}</p>
      </div>
    </div>
  )
}

function BwengeEcosystem() {
  return (
    <div>
      <div className="relative mx-auto max-w-xl lg:max-w-none">
        {/* the faint ring and the spokes */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 hidden h-full w-full lg:block"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <circle cx="50" cy="50" r="27" fill="none" stroke="#E7E3F4" strokeWidth="0.6" />
          {[
            [50, 24],
            [25, 50],
            [75, 50],
            [31, 78],
            [69, 78],
          ].map(([x, y]) => (
            <line
              key={`${x}-${y}`}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              stroke="#E7E3F4"
              strokeWidth="0.6"
            />
          ))}
        </svg>

        <div className="relative">
          <div className="mb-4 lg:mx-auto lg:max-w-[17.5rem]">
            <MemberCard member={MEMBERS.universities} />
          </div>

          <div className="grid items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <MemberCard member={MEMBERS.industry} />

            <div
              className="mx-auto my-1 flex h-[110px] w-[110px] flex-col items-center justify-center rounded-full text-white lg:my-0"
              style={{
                background: "linear-gradient(155deg, #6C5BA8, var(--bw-deep))",
                boxShadow: "0 10px 28px rgba(91,78,150,0.32)",
              }}
            >
              <GraduationCap className="mb-1 h-[22px] w-[22px]" strokeWidth={1.6} />
              <span className="text-[13px] font-bold tracking-tight">BWENGE+</span>
            </div>

            <MemberCard member={MEMBERS.educators} />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <MemberCard member={MEMBERS.companies} />
            <MemberCard member={MEMBERS.learners} />
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2">
        {PROCESS.map((step, index) => (
          <span key={step} className="flex items-center gap-3.5">
            <span className="text-[12.5px] font-semibold" style={{ color: "var(--bw-primary)" }}>
              {step}
            </span>
            {index < PROCESS.length - 1 && (
              <ArrowRight aria-hidden className="h-3.5 w-3.5 text-muted-foreground/50" />
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

function WhoWeAreSection() {
  return (
    <section
      id="who-we-are"
      className="relative scroll-mt-20 overflow-hidden py-14 sm:py-16"
      style={{ ...BRAND, backgroundColor: "#FBFAFE" }}
    >
      <Wash className="-left-24 top-10 h-[300px] w-[360px]" color="#DCD7F3" opacity={0.4} />
      <Wash className="-right-16 top-6 h-[340px] w-[380px]" color="#CDEBDC" opacity={0.45} />
      <Wash className="right-[8%] bottom-0 h-[260px] w-[300px]" color="#CFE0FA" opacity={0.4} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.76fr)_minmax(0,1.12fr)_minmax(0,0.58fr)] lg:items-center lg:gap-6">
          <div>
            <Eyebrow>Our Community</Eyebrow>
            <Heading size="md">Who We Are</Heading>
            <p className="mt-4 text-[14px] leading-[1.6] text-foreground">
              We are a collaborative digital learning community committed to making quality
              education, knowledge sharing, and professional development more accessible.
            </p>

            <p className="mt-6 text-[12px] font-bold text-foreground">
              We work together towards a future where:
            </p>
            <ul className="mt-3.5 space-y-3">
              {COMMUNITY_POINTS.map((point) => (
                <li key={point} className="flex gap-2.5">
                  <span
                    className="mt-[2px] flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--bw-primary)" }}
                  >
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.5} />
                  </span>
                  <span className="text-[11.5px] leading-[1.55] text-muted-foreground">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <BwengeEcosystem />

          <Figure
            src="/about/community.png"
            alt="Educators and learners collaborating around a laptop"
            className="hidden h-[300px] w-full object-contain lg:block"
          />
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   3 + 4. Vision and Mission
   ══════════════════════════════════════════════════════════════════════════ */

const VISION_FLOW: { icon: any; label: string; tint: TintName }[] = [
  { icon: GraduationCap, label: "Education", tint: "purple" },
  { icon: Users2, label: "Collaboration", tint: "purple" },
  { icon: BookOpen, label: "Knowledge", tint: "purple" },
  { icon: Settings, label: "Skills", tint: "green" },
  { icon: Target, label: "Impact", tint: "purple" },
]

const MISSION_ITEMS: { icon: any; title: string; body: string; tint: TintName }[] = [
  {
    icon: Users2,
    title: "Connect",
    body: "Universities, companies, educators, experts and learners.",
    tint: "purple",
  },
  {
    icon: ShieldCheck,
    title: "Standardize",
    body: "Quality content aligned with relevant standards.",
    tint: "blue",
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
    icon: BarChart3,
    title: "Impact",
    body: "Skills development and Rwanda's knowledge economy.",
    tint: "green",
  },
]

function VisionSection() {
  return (
    <div id="our-vision" className="scroll-mt-20">
      <Eyebrow>Our Vision</Eyebrow>
      <Heading size="md">Our Vision</Heading>
      <p className="mt-4 max-w-[27rem] text-[12.5px] leading-[1.85] text-muted-foreground">
        To transform education through standardized educational content, collaborative
        learning, and accessible digital knowledge, contributing to an inclusive and
        knowledge-based economy in Rwanda.
      </p>

      <ol className="mt-8 flex flex-wrap items-start gap-y-5">
        {VISION_FLOW.map((node, index) => (
          <li key={node.label} className="flex items-start">
            <div className="flex w-[76px] flex-col items-center gap-2.5 text-center">
              <Chip icon={node.icon} tint={node.tint} />
              <span className="text-[11px] font-semibold leading-tight text-foreground">
                {node.label}
              </span>
            </div>
            {index < VISION_FLOW.length - 1 && (
              <ArrowRight
                aria-hidden
                className="mt-[16px] h-3.5 w-3.5 shrink-0 text-muted-foreground/50"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

/**
 * A mission item.
 *
 * The reference lifts the middle one — white and shadowed where its neighbours
 * are flat on the wash. It is not a state, it is composition: it stops a row of
 * five identical boxes from reading as a table.
 */
function MissionItem({
  item,
  raised,
}: {
  item: (typeof MISSION_ITEMS)[number]
  raised: boolean
}) {
  return (
    <li
      className="flex h-full flex-col items-center rounded-[14px] px-3 py-4 text-center transition-shadow"
      style={{
        backgroundColor: raised ? "#FFFFFF" : "rgba(255,255,255,0.55)",
        boxShadow: raised ? "var(--bw-shadow-lg)" : "var(--bw-shadow)",
      }}
    >
      <Chip icon={item.icon} tint={item.tint} size={40} />
      <h3 className="mt-2.5 text-[12.5px] font-bold" style={{ color: TINT[item.tint].fg }}>
        {item.title}
      </h3>
      <p className="mt-1.5 text-[10px] leading-[1.55] text-muted-foreground">{item.body}</p>
    </li>
  )
}

function MissionSection() {
  return (
    <div id="our-mission" className="scroll-mt-20">
      <Eyebrow>Our Mission</Eyebrow>
      <Heading size="md">Our Mission</Heading>
      <p className="mt-4 text-[12.5px] leading-[1.85] text-muted-foreground">
        To connect universities, companies, educators, industry experts, and learners through an
        inclusive digital MOOC and SPOC platform that promotes standardized educational content,
        collaborative course development, and shared teaching and learning.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {MISSION_ITEMS.map((item, index) => (
          <MissionItem key={item.title} item={item} raised={index === 2} />
        ))}
      </ul>
    </div>
  )
}

/**
 * One band for both, with Kigali clipped into a chevron at the left edge that
 * points into the vision copy — the reference's composition, and the reason
 * these two do not each need a band of their own.
 */
function VisionAndMission() {
  return (
    <section className="relative overflow-hidden py-14 sm:py-16" style={{ ...BRAND, backgroundColor: "#FFFFFF" }}>
      {/*
        Kigali, cut from the reference with the chevron it is already set in.
        No clip-path and no overlay: the shape is in the image, and clipping a
        shape onto a shape is what produced the ragged edge before.
      */}
      <Figure
        src="/about/kigali.png"
        alt="Kigali"
        className="absolute left-0 top-1/2 hidden h-[240px] w-[170px] -translate-y-1/2 object-contain lg:block"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:pl-[12rem]">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
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
    icon: Users2,
    title: "Collaboration",
    body: "We believe that meaningful progress comes through working together. We promote collaboration among universities, companies, educators, and learners to develop and share knowledge.",
    tint: "purple",
  },
  {
    number: "02",
    icon: Users,
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
    icon: BarChart3,
    title: "National Development and Impact",
    body: "We align our efforts with Rwanda's knowledge economy ambitions by supporting skills development, education-industry collaboration, and access to relevant knowledge.",
    tint: "violet",
  },
]

function CoreValueItem({ number, icon, title, body, tint }: (typeof CORE_VALUES)[number]) {
  return (
    <div
      className="flex h-full gap-3.5 rounded-[14px] bg-white p-4 transition-shadow hover:shadow-[var(--bw-shadow-lg)]"
      style={{ boxShadow: "var(--bw-shadow)" }}
    >
      <Chip icon={icon} tint={tint} size={40} />
      <div className="min-w-0">
        {/*
          The numbering is part of the official content, so it is printed rather
          than implied by grid position: a card that reflows on a narrow screen
          keeps the number it was given.
        */}
        <p className="text-[12px] font-bold" style={{ color: TINT[tint].fg }}>
          {number}
        </p>
        <h3 className="mt-1 text-[12.5px] font-bold leading-tight text-foreground">{title}</h3>
        <p className="mt-2 text-[10.5px] leading-[1.6] text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

function CoreValuesSection() {
  return (
    <section
      id="core-values"
      className="relative scroll-mt-20 overflow-hidden py-14 sm:py-16"
      style={{ ...BRAND, backgroundColor: "var(--bw-wash)" }}
    >
      <Wash className="-left-20 -top-10 h-[280px] w-[340px]" color="#DCD7F3" opacity={0.45} />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-9 lg:grid-cols-[minmax(0,0.5fr)_minmax(0,2fr)] lg:gap-10">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Eyebrow>Our Core Values</Eyebrow>
            <Heading size="md">Our Core Values</Heading>
            <p className="mt-4 text-[12px] leading-[1.75] text-muted-foreground">
              The principles that guide how we learn, teach, collaborate, and grow together.
            </p>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
            {CORE_VALUES.map((value) => (
              <CoreValueItem key={value.number} {...value} />
            ))}
          </div>
        </div>
      </div>
    </section>
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
