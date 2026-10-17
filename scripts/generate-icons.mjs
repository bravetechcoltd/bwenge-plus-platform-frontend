/**
 * Generate the app icon set (SEO-001).
 *
 * ── Why these are drawn and not cropped ────────────────────────────────────
 *
 * The only brand assets in the repository are `bwenge-plus-mark.png` and
 * `BwengePlusLogo.png`, both wide lockups (760x260 and 1536x1024). Scaling a
 * wordmark into a 32px square makes it an illegible smudge, and stretching it
 * distorts the brand.
 *
 * So the icon reuses the one element of the mark that is already square and
 * already carries the brand: the "+" glyph, on the mark's own purple. The
 * colours below were sampled from `bwenge-plus-mark.png` rather than chosen —
 * #62529c is the badge body, and the deeper tone anchors the gradient.
 *
 * Run with: node scripts/generate-icons.mjs
 * The output is committed; this is not part of the build.
 */
import sharp from "sharp"
import { mkdir } from "node:fs/promises"

// Sampled from public/bwenge-plus-mark.png.
const DEEP = "#443676"
const MID = "#62529c"

/**
 * @param size   output square size in px
 * @param inset  fraction of the canvas left as padding around the glyph.
 *               Maskable icons need the artwork inside the middle 80%, since
 *               launchers crop to a circle or squircle.
 * @param radius corner radius as a fraction of size. 0.5 would be a circle;
 *               maskable icons are full-bleed because the launcher does the
 *               rounding.
 */
function iconSvg(size, { inset = 0.18, radius = 0.22, fullBleed = false } = {}) {
  const r = fullBleed ? 0 : size * radius
  // Plus bar thickness and arm length, as fractions of the usable area.
  const usable = size * (1 - inset * 2)
  const bar = usable * 0.26
  const arm = usable * 0.92
  const cx = size / 2
  const cy = size / 2

  return Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${DEEP}"/>
      <stop offset="100%" stop-color="${MID}"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="url(#g)"/>
  <g fill="#FFFFFF">
    <rect x="${cx - bar / 2}" y="${cy - arm / 2}" width="${bar}" height="${arm}" rx="${bar * 0.3}"/>
    <rect x="${cx - arm / 2}" y="${cy - bar / 2}" width="${arm}" height="${bar}" rx="${bar * 0.3}"/>
  </g>
</svg>`)
}

const OUTPUTS = [
  // Next.js app-directory conventions. Next emits the <link> tags for these.
  { file: "src/app/icon.png", size: 512, opts: {} },
  { file: "src/app/apple-icon.png", size: 180, opts: { radius: 0.0 } },

  // Referenced explicitly by the web manifest.
  { file: "public/icons/icon-192.png", size: 192, opts: {} },
  { file: "public/icons/icon-512.png", size: 512, opts: {} },
  {
    file: "public/icons/icon-maskable-512.png",
    size: 512,
    opts: { inset: 0.26, fullBleed: true },
  },
]

await mkdir("public/icons", { recursive: true })

for (const { file, size, opts } of OUTPUTS) {
  await sharp(iconSvg(size, opts)).png({ compressionLevel: 9 }).toFile(file)
  const meta = await sharp(file).metadata()
  console.log(`  ${file.padEnd(36)} ${meta.width}x${meta.height}`)
}

console.log(`\n  ${OUTPUTS.length} icon(s) generated`)
