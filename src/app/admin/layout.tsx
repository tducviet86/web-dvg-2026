import "@/features/admin/admin.css";
import { PageNavigation } from "@/components/page-navigation";
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PageNavigation>{children}</PageNavigation>;
}
