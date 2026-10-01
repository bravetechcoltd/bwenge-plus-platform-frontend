"use client"

import { useEffect, useState } from "react"
import { ArrowRight, Check, PackageOpen } from "lucide-react"

import HomeNavigation from "@/components/layout/home-navigation"

import { ProductIcon } from "@/components/products/product-icon"
import { accentStyle, listProducts, type Product } from "@/lib/products/products-api"

/**
 * ============================================================================
 * Our Products (PR-001)
 * ============================================================================
 *
 * A page of its own rather than a band on the homepage.
 *
 * As a homepage section it competed with the course catalogue for the same
 * scroll, and it had nowhere to grow: a fourth product would have pushed it to
 * two rows between sections that are about something else entirely. A page can
 * be linked to, shared and bookmarked, which is what someone asking "what else
 * does Bwenge do" actually wants.
 *
 * The products come from the database, administered at
 * /dashboard/system-admin/products. Nothing here is hardcoded, including the
 * order and which product carries "You are here".
 */
export default function OurProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const list = await listProducts()
        if (!cancelled) setProducts(list)
      } catch {
        if (!cancelled) setFailed(true)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/*
        NAV-002. The same bar as the homepage, not a copy of it.

        This page had a reduced header of its own — logo and a back link — which
        meant arriving here dropped the search, the About menu, the theme toggle
        and the account controls, so the site appeared to lose half its chrome
        on one route.

        The bar is fixed, so the padding below clears it: 64px for the nav row,
        plus the search row at lg where that row exists.
      */}
      <HomeNavigation />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:pt-[9rem]">
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-primary">
            Our Products
          </p>
          <h1 className="text-[30px] font-bold leading-[1.12] tracking-tight text-foreground sm:text-[38px]">
            Everything Bwenge builds
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Connecting Knowledge. Empowering Learners. Building Rwanda&rsquo;s Knowledge
            Economy.
          </p>
        </div>

        <div className="mt-10">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-border bg-card p-6"
                >
                  <div className="mb-4 h-11 w-11 rounded-lg bg-muted" />
                  <div className="mb-2 h-4 w-32 rounded bg-muted" />
                  <div className="mb-4 h-3 w-24 rounded bg-muted" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-muted" />
                    <div className="h-3 w-5/6 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            /*
             * Two different empty states would be a lie in one direction or the
             * other: nothing published is not the same as nothing reachable,
             * and telling a visitor there are no products when the request
             * failed is worse than admitting the list could not be loaded.
             */
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <PackageOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-semibold text-foreground">
                {failed ? "Products could not be loaded" : "No products listed yet"}
              </p>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                {failed
                  ? "Something went wrong reaching the list. Please try again in a moment."
                  : "Nothing has been published here yet. Check back soon."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const accent = accentStyle(product.accent)

  /*
   * The product the visitor is already inside has nowhere to send them, so its
   * card is not a link. Rendering an anchor that goes to the page you are on is
   * a dead control dressed as a live one.
   */
  const isLink = !product.is_current && !!product.url

  const body = (
    <>
      <div className="mb-4 flex items-start justify-between gap-3">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ backgroundColor: accent.bg, color: accent.fg }}
        >
          <ProductIcon name={product.icon} className="h-[22px] w-[22px]" />
        </span>
        {product.is_current && (
          <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-[11px] font-semibold text-success">
            You are here
          </span>
        )}
      </div>

      <h2 className="text-base font-bold text-foreground">{product.name}</h2>
      {product.tagline && (
        <p className="text-xs font-semibold" style={{ color: accent.fg }}>
          {product.tagline}
        </p>
      )}
      {product.description && (
        <p className="mt-2.5 flex-1 text-[13px] leading-relaxed text-muted-foreground">
          {product.description}
        </p>
      )}

      {product.highlights.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {product.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: accent.fg }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}

      {product.action_label && (
        <span
          className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
          style={{ color: isLink ? accent.fg : undefined }}
        >
          {product.action_label}
          {isLink && (
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          )}
        </span>
      )}
    </>
  )

  const shell =
    "group flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow"

  if (!isLink) {
    return <div className={shell}>{body}</div>
  }

  return (
    <a
      href={product.url}
      target="_blank"
      // Without this the opened tab keeps a handle on this one via window.opener.
      rel="noopener noreferrer"
      className={`${shell} hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
    >
      {body}
    </a>
  )
}
