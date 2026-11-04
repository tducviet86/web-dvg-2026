import { searchable } from "./filter";

/** "Không gian thương mại" of capital-square → its detail page path. */
export const productPath = (projectSlug: string, product: string) =>
  `du-an/${projectSlug}/${searchable(product)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
