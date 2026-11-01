"use client";
/**
 * The forms and widgets of interactive.tsx, split out of the shared page
 * bundle: their code (form validation, dialogs) is downloaded only by pages
 * that show them. Still rendered on the server, so nothing pops in.
 */
import dynamic from "next/dynamic";

export const ContactForm = dynamic(() =>
  import("./interactive").then((m) => m.ContactForm),
);
export const ContactDialog = dynamic(() =>
  import("./interactive").then((m) => m.ContactDialog),
);
export const Process = dynamic(() =>
  import("./interactive").then((m) => m.Process),
);
