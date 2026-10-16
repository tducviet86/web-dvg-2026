import { toast } from "sonner";
export function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`dvg:${key}`);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeStore<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(`dvg:${key}`, JSON.stringify(value));
    window.dispatchEvent(new Event("dvg-storage"));
    return true;
  } catch {
    toast.error(
      "Không thể lưu trên trình duyệt. Vui lòng kiểm tra dung lượng hoặc quyền lưu trữ.",
    );
    return false;
  }
}
