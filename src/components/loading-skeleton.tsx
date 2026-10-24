/** @jsxImportSource @/i18n/jsx */
export default function Loading() {
  return (
    <main
      id="main"
      className="container loading-state"
      aria-busy="true"
      aria-label="Đang tải nội dung"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-hero" />
      <div className="grid grid-3">
        {[1, 2, 3].map((i) => (
          <div className="skeleton skeleton-card" key={i} />
        ))}
      </div>
    </main>
  );
}
