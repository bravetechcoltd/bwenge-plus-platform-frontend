import { ImageResponse } from "next/og"

/**
 * The default social-sharing image (SEO-001).
 *
 * `/og-image.jpg` 404s today, so every link to this site shared on WhatsApp,
 * LinkedIn, X or Slack renders as a bare grey card. This generates a real
 * 1200x630 PNG at request time from the brand's own colours — no binary asset
 * to keep in sync, and nothing to go stale when the wording changes.
 *
 * Colours are the ones sampled from `bwenge-plus-mark.png`, so the card
 * matches the logo rather than approximating it.
 *
 * Edge runtime: `ImageResponse` is built for it and it keeps the render off
 * the Node server path.
 */
export const runtime = "edge"

export const alt =
  "BwengePlus — online courses and verifiable certificates"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const DEEP = "#443676"
const MID = "#62529c"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "90px",
          backgroundColor: DEEP,
          backgroundImage: `linear-gradient(135deg, ${DEEP} 0%, ${MID} 100%)`,
          color: "#FFFFFF",
          fontFamily: "sans-serif",
        }}
      >
        {/* The brand's plus glyph, drawn the same way as the app icon. */}
        <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              backgroundColor: "#FFFFFF",
              color: MID,
              fontSize: "48px",
              fontWeight: 700,
              lineHeight: 1,
            }}
          >
            +
          </div>
          <div style={{ fontSize: "36px", fontWeight: 600, opacity: 0.95 }}>
            BwengePlus
          </div>
        </div>

        <div
          style={{
            marginTop: "44px",
            fontSize: "68px",
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            maxWidth: "900px",
          }}
        >
          Online courses and verifiable certificates
        </div>

        <div
          style={{
            marginTop: "26px",
            fontSize: "30px",
            lineHeight: 1.4,
            opacity: 0.85,
            maxWidth: "860px",
          }}
        >
          Open MOOC courses and institution-led programmes. Learn at your own
          pace.
        </div>

        <div
          style={{
            marginTop: "auto",
            fontSize: "25px",
            opacity: 0.75,
          }}
        >
          www.bwengeplus.com
        </div>
      </div>
    ),
    size
  )
}
