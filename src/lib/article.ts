/** Blog article text (Admin › Bài viết) and its blocks, shared by the
 * public page and the editor's live preview. */
export type ArticleBlock =
  | { kind: "p"; text: string }
  | { kind: "h2" | "h3"; text: string; id: string }
  | { kind: "quote"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "figure"; src: string; caption: string };

const slugify = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Plain text from Admin › Bài viết: one paragraph per line (blank lines optional),
 * "## " / "### " headings, "> " quotes, "- " lists and `![chú thích](url)`
 * images inserted with the editor's "Chèn ảnh" button.
 */
export function parseArticle(text: string): ArticleBlock[] {
  const blocks: ArticleBlock[] = [];
  for (const chunk of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = chunk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) continue;
    for (const [i, line] of lines.entries()) {
      const image = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
      if (image) {
        blocks.push({ kind: "figure", caption: image[1], src: image[2] });
        continue;
      }
      const heading = line.match(/^(#{2,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length === 2 ? "h2" : "h3";
        // "1. Toàn cảnh…": the page numbers the sections itself.
        const text =
          level === "h2"
            ? heading[2].replace(/^\d{1,2}[.)]\s+/, "")
            : heading[2];
        blocks.push({ kind: level, text, id: slugify(text) });
        continue;
      }
      const last = blocks.at(-1);
      const quote = line.match(/^>\s?(.*)$/);
      if (quote) {
        if (last?.kind === "quote" && i > 0) last.text += `\n${quote[1]}`;
        else blocks.push({ kind: "quote", text: quote[1] });
        continue;
      }
      const item = line.match(/^[-•*]\s+(.+)$/);
      if (item) {
        if (last?.kind === "list" && i > 0) last.items.push(item[1]);
        else blocks.push({ kind: "list", items: [item[1]] });
        continue;
      }
      // Every line is its own paragraph: articles pasted from Word or a chat
      // tool put one line break between paragraphs.
      blocks.push({ kind: "p", text: line });
    }
  }
  return blocks;
}
