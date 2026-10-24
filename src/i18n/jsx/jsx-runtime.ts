/**
 * JSX runtime for Server Components (`@jsxImportSource @/i18n/jsx`): same as
 * React's, but visible text and text attributes are translated for /en, /ko
 * and /zh while rendering. Vietnamese pages are untouched.
 */
import * as Runtime from "react/jsx-runtime";
import { localizeProps } from "../server";

type Jsx = (
  type: unknown,
  props: unknown,
  key?: unknown,
) => Runtime.JSX.Element;
const jsxBase = Runtime.jsx as unknown as Jsx;
const jsxsBase = Runtime.jsxs as unknown as Jsx;

export const Fragment = Runtime.Fragment;
export const jsx: Jsx = (type, props, key) =>
  jsxBase(type, localizeProps(type, props as Record<string, unknown>), key);
export const jsxs: Jsx = (type, props, key) =>
  jsxsBase(type, localizeProps(type, props as Record<string, unknown>), key);
export type { JSX } from "react/jsx-runtime";
