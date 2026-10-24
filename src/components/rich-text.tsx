/** @jsxImportSource @/i18n/jsx */
/**
 * Plain text from the CMS shown with its structure: blank lines separate
 * paragraphs, lines starting with a symbol or emoji (◆ 🔹 ✔ • - …) become a
 * list keeping that symbol as the bullet, and a line ending with ":" is a
 * small heading ("🏢 Tiện ích tòa nhà miễn phí:").
 */
type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; marker: string; text: string }
  | { kind: "ul"; items: { marker: string; text: string }[] };

const MARKER = /^([^\p{L}\p{N}\s(“"']+)\s*(.+)$/u;

function parse(text: string): Block[] {
  const blocks: Block[] = [];
  for (const line of text.replace(/\r/g, "").split("\n")) {
    const value = line.trim();
    if (!value) {
      blocks.push({ kind: "p", text: "" });
      continue;
    }
    const match = value.match(MARKER);
    const marker = match?.[1] ?? "";
    const body = match?.[2] ?? value;
    if (body.endsWith(":")) blocks.push({ kind: "h", marker, text: body });
    else if (marker) {
      const last = blocks.at(-1);
      if (last?.kind === "ul") last.items.push({ marker, text: body });
      else blocks.push({ kind: "ul", items: [{ marker, text: body }] });
    } else {
      const last = blocks.at(-1);
      // Consecutive plain lines stay one paragraph (with line breaks).
      if (last?.kind === "p" && last.text) last.text += `\n${body}`;
      else blocks.push({ kind: "p", text: body });
    }
  }
  return blocks.filter((b) => b.kind !== "p" || b.text);
}

export function RichText({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={`rich-text ${className}`}>
      {parse(text).map((block, i) =>
        block.kind === "p" ? (
          <p key={i}>
            {block.text.split("\n").map((line, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        ) : block.kind === "h" ? (
          <h3 key={i}>
            {block.marker && <span aria-hidden="true">{block.marker}</span>}
            {block.text}
          </h3>
        ) : (
          <ul key={i}>
            {block.items.map((item, j) => (
              <li key={j}>
                <span className="rich-marker" aria-hidden="true">
                  {item.marker}
                </span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
