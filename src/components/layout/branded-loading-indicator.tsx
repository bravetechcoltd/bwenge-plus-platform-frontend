import Image from "next/image";

export function BrandedLoadingIndicator() {
  return (
    <main
      className="bwenge-loading"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="bwenge-loading__card">
        <div className="bwenge-loading__logo-wrap" aria-hidden="true">
          <span className="bwenge-loading__orbit" />
          <Image
            src="/bwenge-plus-mark.png"
            alt=""
            width={112}
            height={112}
            priority
            className="bwenge-loading__logo"
          />
        </div>
        <p className="bwenge-loading__label">Preparing your learning space</p>
        <div className="bwenge-loading__progress" aria-hidden="true">
          <span />
        </div>
        <span className="bwenge-loading__sr-only">Loading page</span>
      </div>
    </main>
  );
}
