/** Development twin of ./jsx-runtime (same translation, React's dev checks). */
import * as Runtime from "react/jsx-dev-runtime";
import { localizeProps } from "../server";

type JsxDev = (...args: unknown[]) => Runtime.JSX.Element;
const base = Runtime.jsxDEV as unknown as JsxDev;

export const Fragment = Runtime.Fragment;
export const jsxDEV: JsxDev = (type, props, ...rest) =>
  base(type, localizeProps(type, props as Record<string, unknown>), ...rest);
export type { JSX } from "react/jsx-dev-runtime";
