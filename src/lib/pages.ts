export type EditorialContent = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: [string, string][];
  seoTitle?: string | null;
  seoDescription?: string | null;
};
