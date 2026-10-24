import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { previewPost, previewProject } from "@/lib/api/preview";

/** Opens an unpublished project/post for a signed-in editor. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const slug = url.searchParams.get("slug") ?? "";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))
    return new Response("Invalid slug", { status: 400 });
  const found =
    type === "project"
      ? await previewProject(slug)
      : type === "post"
        ? await previewPost(slug)
        : null;
  // Not signed in (or no access): back to the admin login.
  if (!found) redirect(`/admin/login?next=${encodeURIComponent("/admin")}`);
  (await draftMode()).enable();
  redirect(type === "project" ? `/du-an/${slug}` : `/blog/${slug}`);
}
