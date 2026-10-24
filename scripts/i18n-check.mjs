/**
 * Lists Vietnamese text left on translated pages (visible text and text
 * attributes). Usage: node scripts/i18n-check.mjs <url> [<url>…]
 */
const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const decode = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'");
export function leftovers(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<(head)[\s\S]*?<\/head>/, "");
  const found = new Set();
  for (const m of body.matchAll(/>([^<]+)</g)) {
    const text = decode(m[1]).replace(/\s+/g, " ").trim();
    if (text && VI.test(text)) found.add(text);
  }
  for (const m of body.matchAll(
    /(?:placeholder|aria-label|alt|title)="([^"]+)"/g,
  )) {
    const text = decode(m[1]).trim();
    if (VI.test(text)) found.add(`@${text}`);
  }
  // The brand name is kept in every language; the language switcher is bilingual.
  return [...found].filter((t) =>
    VI.test(
      t.replace(/Đất Vàng|ĐẤT VÀNG|Ngôn ngữ \/ Language|Tiếng Việt/g, ""),
    ),
  );
}
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const url of process.argv.slice(2)) {
    const html = await (
      await fetch(url, { headers: { "user-agent": "dvg-i18n-check bot" } })
    ).text();
    const left = leftovers(html);
    console.log(`${url}: ${left.length} Vietnamese strings`);
    for (const t of left.slice(0, 15)) console.log("   ", t.slice(0, 110));
  }
}
