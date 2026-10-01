"use client"

import {
  Accessibility,
  Award,
  BadgeCheck,
  Building2,
  Compass,
  Flag,
  GraduationCap,
  Handshake,
  Infinity as InfinityIcon,
  Layers,
  Lightbulb,
  Network,
  Share2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react"

/**
 * ============================================================================
 * About BWENGE+ (HP-002)
 * ============================================================================
 *
 * The informational half of the homepage: what BWENGE+ is, who it is for, and
 * what it is for. None of it existed before — the page went from the hero
 * straight into courses — so a visitor who had never heard of the platform had
 * nothing to read.
 *
 * ── Content ───────────────────────────────────────────────────────────────
 *
 * Every sentence below is the organisation's own copy, used verbatim. Nothing
 * is paraphrased and nothing is added: no statistics, no partner names, no
 * achievements, no claims about scale. Where a section would have looked better
 * with a number in it, it does without one, because inventing one would make
 * the page say something untrue about a real organisation.
 *
 * ── Design ────────────────────────────────────────────────────────────────
 *
 * One visual system across all six sections, so they read as a single document
 * rather than six separately styled blocks: the same container width, the same
 * eyebrow-and-heading pattern, the same card treatment (solid surface, one hair
 * border, no gradient), the same icon weight, and alternating surface tints to
 * separate sections without drawing rules between them.
 *
 * Hover states move by a pixel or two and change a border. That is deliberate:
 * these sections are read, not played with, and animation here would compete
 * with the text for attention.
 *
 * Anchors (#about, #who-we-are, #our-purpose, #our-vision, #our-mission,
 * #core-values) are what the navigation dropdown targets. `scroll-mt-20` keeps
 * the fixed header from covering a heading that has just been jumped to — the
 * usual failure of in-page navigation under a sticky bar.
 */

/* ── shared pieces ─────────────────────────────────────────────────────── */

function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "center",
}: {
  eyebrow: string
  title: string
  lead?: string
  align?: "center" | "left"
}) {
  const centred = align === "center"
  return (
    <div className={`${centred ? "mx-auto max-w-3xl text-center" : "max-w-3xl"} mb-8`}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {lead && <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{lead}</p>}
    </div>
  )
}

function Shell({
  id,
  tinted = false,
  children,
}: {
  id: string
  tinted?: boolean
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-20 border-t border-border py-12 sm:py-16 ${
        tinted ? "bg-muted/40" : "bg-background"
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">{children}</div>
    </section>
  )
}

/* ── 1. About BWENGE+ ──────────────────────────────────────────────────── */

const ABOUT_BLOCKS = [
  {
    icon: Layers,
    title: "MOOC and SPOC in one platform",
    body: "Open courses for anyone and private courses for a single institution, taught and administered through the same system.",
  },
  {
    icon: BadgeCheck,
    title: "Standardised content",
    body: "Course material built to shared standards, so what a learner studies in one place carries the same weight in another.",
  },
  {
    icon: Network,
    title: "Collaboration across Rwanda",
    body: "Universities, companies and industry experts developing and sharing educational content together rather than separately.",
  },
]

function AboutBwengePlus() {
  return (
    <Shell id="about">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            About BWENGE+
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Collaborative MOOC and SPOC Platform for Rwanda
          </h2>
          <p className="mt-4 text-base font-medium leading-relaxed text-foreground">
            Connecting Knowledge. Empowering Learners. Building Rwanda&rsquo;s Knowledge Economy.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            BWENGE+ is an inclusive digital MOOC and SPOC platform designed to promote
            educational content standardization and collaboration across Rwanda.
          </p>

          <dl className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {/*
              A definition list rather than a statistics strip. The platform's
              shape is a fact; its scale is not something this page is allowed to
              claim, so there are no counters here.
            */}
            <div className="bg-card p-4">
              <dt className="text-xs font-medium text-muted-foreground">Platform</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">MOOC and SPOC</dd>
            </div>
            <div className="bg-card p-4">
              <dt className="text-xs font-medium text-muted-foreground">Focus</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                Standardization and collaboration
              </dd>
            </div>
          </dl>
        </div>

        <div className="space-y-3">
          {ABOUT_BLOCKS.map((block) => (
            <div
              key={block.title}
              className="flex gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <block.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{block.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{block.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

/* ── 2. Our Purpose ───────────────────────────────────────────────────── */

function OurPurpose() {
  return (
    <Shell id="our-purpose" tinted>
      <div className="mx-auto max-w-4xl">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Compass className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              Our Purpose
            </p>
          </div>

          {/*
            Compact by instruction, and compact because it is one sentence. A
            large pull-quote treatment here would stretch 30 words across a
            screen and make the page feel padded.
          */}
          <p className="mt-5 text-lg font-medium leading-relaxed text-foreground sm:text-xl">
            To connect universities, companies, and industry experts through standardized
            digital learning content and collaborative teaching and learning communities.
          </p>
        </div>
      </div>
    </Shell>
  )
}

/* ── 3. Who We Are ────────────────────────────────────────────────────── */

const ECOSYSTEM = [
  { icon: Building2, name: "Universities" },
  { icon: Target, name: "Companies" },
  { icon: GraduationCap, name: "Educators" },
  { icon: Award, name: "Industry professionals" },
  { icon: Users, name: "Learners" },
]

const COLLABORATION = ["Develop", "Standardize", "Share", "Teach", "Access"]

function WhoWeAre() {
  return (
    <Shell id="who-we-are">
      <SectionHeading
        eyebrow="Who We Are"
        title="A collaborative digital learning community"
        lead="BWENGE+ brings together the people who make education work, so that content and skills-development opportunities are built once and shared widely."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {ECOSYSTEM.map((member) => (
          <div
            key={member.name}
            className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-5 text-center transition-colors hover:border-primary/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
              <member.icon className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-semibold text-foreground">{member.name}</p>
          </div>
        ))}
      </div>

      {/*
        What these five groups do together, as a sequence rather than five more
        cards — the collaboration is one process, and five separate boxes would
        read as five separate activities.
      */}
      <div className="mt-6 rounded-lg border border-border bg-card p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Together they
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {COLLABORATION.map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-muted/50 px-3 py-1 text-sm font-medium text-foreground">
                {step}
              </span>
              {index < COLLABORATION.length - 1 && (
                <span aria-hidden className="text-muted-foreground">
                  &rarr;
                </span>
              )}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          educational content and skills-development opportunities.
        </p>
      </div>
    </Shell>
  )
}

/* ── 4. Our Vision ────────────────────────────────────────────────────── */

function OurVision() {
  return (
    <Shell id="our-vision" tinted>
      <div className="mx-auto max-w-4xl text-center">
        <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          Our Vision
        </p>
        <blockquote className="text-lg font-medium leading-relaxed text-foreground sm:text-2xl sm:leading-relaxed">
          To transform education through standardized educational content, collaborative
          learning, and accessible digital knowledge, contributing to an inclusive and
          knowledge-based economy in Rwanda.
        </blockquote>

        {/*
          The three things the vision names, pulled out underneath it. They are
          its own words, not a gloss on it, so the statement stays the authority
          and this only makes it scannable.
        */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { icon: BadgeCheck, label: "Standardized content" },
            { icon: Handshake, label: "Collaborative learning" },
            { icon: Accessibility, label: "Accessible digital knowledge" },
          ].map((pillar) => (
            <div
              key={pillar.label}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 text-left"
            >
              <pillar.icon className="h-5 w-5 shrink-0 text-primary" />
              <span className="text-sm font-medium text-foreground">{pillar.label}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

/* ── 5. Our Mission ───────────────────────────────────────────────────── */

const MISSION_PROMISES = [
  {
    icon: Network,
    title: "An inclusive digital platform",
    body: "MOOC and SPOC together, open to universities, companies, educators, industry experts and learners.",
  },
  {
    icon: BadgeCheck,
    title: "Standardized educational content",
    body: "Material built to shared standards so it is recognised wherever it is taught.",
  },
  {
    icon: Handshake,
    title: "Collaborative course development",
    body: "Courses developed together rather than duplicated institution by institution.",
  },
  {
    icon: Share2,
    title: "Shared teaching and knowledge",
    body: "Teaching, learning and knowledge shared across the whole community.",
  },
]

function OurMission() {
  return (
    <Shell id="our-mission">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Our Mission
          </p>
          <blockquote className="text-base font-medium leading-relaxed text-foreground sm:text-lg">
            To connect universities, companies, educators, industry experts, and learners
            through an inclusive digital MOOC and SPOC platform that promotes standardized
            educational content, collaborative course development, and shared teaching,
            learning, and knowledge.
          </blockquote>
        </div>

        {/*
          The mission is one long sentence listing four commitments. Breaking
          them out is what makes it understandable; the sentence itself stays
          beside them, intact, so nothing is lost in the breaking.
        */}
        <ol className="space-y-3">
          {MISSION_PROMISES.map((promise, index) => (
            <li
              key={promise.title}
              className="flex gap-4 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <promise.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">
                    0{index + 1}
                  </span>
                  <h3 className="text-sm font-semibold text-foreground">{promise.title}</h3>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {promise.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Shell>
  )
}

/* ── 6. Our Core Values ───────────────────────────────────────────────── */

/**
 * The six official values, numbered as they are officially numbered.
 *
 * The numbering is part of the content, so it is printed rather than left to
 * the grid — a card that moves to a different position on a narrow screen keeps
 * the number it was given.
 */
const CORE_VALUES = [
  {
    number: "1",
    icon: Handshake,
    title: "Collaboration",
    body: "Meaningful progress comes through working together.",
  },
  {
    number: "2",
    icon: Accessibility,
    title: "Inclusivity and Accessibility",
    body: "Everyone deserves an opportunity to learn through accessible and inclusive digital education.",
  },
  {
    number: "3",
    icon: ShieldCheck,
    title: "Quality and Standards",
    body: "Learning content should align with relevant national education standards, professional requirements, and industry needs.",
  },
  {
    number: "4",
    icon: Lightbulb,
    title: "Innovation",
    body: "Digital technologies and innovative teaching methods should improve learning experiences and expand access to knowledge.",
  },
  {
    number: "5",
    icon: InfinityIcon,
    title: "Never Stop Learning",
    body: "Encourage continuous learning, self-development, knowledge sharing, and lifelong learning.",
  },
  {
    number: "6",
    icon: Flag,
    title: "National Development and Impact",
    body: "Align BWENGE+'s work with Rwanda's knowledge-economy ambitions through skills development, education-industry collaboration, and access to relevant knowledge.",
  },
]

function CoreValues() {
  return (
    <Shell id="core-values" tinted>
      <SectionHeading
        eyebrow="Our Core Values"
        title="What BWENGE+ holds to"
        lead="Six values that decide how the platform is built and how the community works."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CORE_VALUES.map((value) => (
          <div
            key={value.number}
            className="flex h-full flex-col rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <value.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {value.number}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground">{value.title}</h3>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
              {value.body}
            </p>
          </div>
        ))}
      </div>
    </Shell>
  )
}

/* ── the set, in order ────────────────────────────────────────────────── */

/**
 * BWENGE+ → Purpose → Who We Are → Vision → Mission → Core Values.
 *
 * The order is the argument: what the platform is, what it is for, who makes it
 * work, where it is going, how it will get there, and what it will not trade
 * away. Rendered as one component so that order cannot be half-changed by
 * reordering JSX on the page.
 */
export default function AboutSections() {
  return (
    <>
      <AboutBwengePlus />
      <OurPurpose />
      <WhoWeAre />
      <OurVision />
      <OurMission />
      <CoreValues />
    </>
  )
}

/** The dropdown's targets, kept beside the sections they point at. */
export const ABOUT_NAV_ITEMS = [
  { label: "About BWENGE+", href: "#about", description: "What the platform is" },
  { label: "Our Purpose", href: "#our-purpose", description: "What it is for" },
  { label: "Who We Are", href: "#who-we-are", description: "The community behind it" },
  { label: "Our Vision", href: "#our-vision", description: "Where it is going" },
  { label: "Our Mission", href: "#our-mission", description: "How it gets there" },
  { label: "Our Core Values", href: "#core-values", description: "What it holds to" },
]
