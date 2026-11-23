import Page, { generateMetadata } from "./[...slug]/page";

type Props = Parameters<typeof Page>[0];
type SectionProps = Omit<Props, "params"> & {
  params: Promise<{ locale: string; slug?: string[] }>;
};

/**
 * A section of the catch-all page ([...slug]) served as its own route, so it
 * loads only the stylesheets its route file imports (Next.js bundles CSS per
 * route). Same rendering and metadata as the catch-all.
 */
export function sectionRoute(section: string) {
  const full = (props: SectionProps): Props => ({
    ...props,
    params: props.params.then((p) => ({
      ...p,
      slug: [section, ...(p.slug ?? [])],
    })),
  });
  return {
    Page: (props: SectionProps) => Page(full(props)),
    generateMetadata: (props: SectionProps) => generateMetadata(full(props)),
  };
}
