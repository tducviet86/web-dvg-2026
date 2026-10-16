import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Dashboard from "@/features/admin/entry";
export const metadata: Metadata = {
  title: "Quản trị demo",
  robots: { index: false, follow: false },
};
export default async function Admin({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await params;
  const [section, id, action] = segments;
  const kinds = ["projects", "properties", "posts", "leads"];
  const valid =
    segments.length === 0 ||
    (section === "settings" &&
      (segments.length === 1 || (segments.length === 2 && id === "reset"))) ||
    (kinds.includes(section) &&
      (segments.length === 1 ||
        (segments.length === 2 && id === "new") ||
        (segments.length === 3 && ["edit", "delete"].includes(action))));
  if (!valid) notFound();
  return <Dashboard />;
}
