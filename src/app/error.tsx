"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="not-found">
      <h1>Chưa thể tải không gian này.</h1>
      <p>Vui lòng thử lại sau một chút.</p>
      <button className="button button-primary" onClick={reset}>
        Thử lại
      </button>
    </main>
  );
}
