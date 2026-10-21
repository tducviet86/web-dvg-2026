"use client";
import type { ReactNode } from "react";
import { usePageNavigation } from "./page-navigation";

export function RentalSearchForm({
  action,
  children,
}: {
  action: string;
  children: ReactNode;
}) {
  const navigate = usePageNavigation();
  return (
    <form
      action={action}
      className="rental-search filter-form"
      onSubmit={(event) => {
        if (!navigate) return;
        event.preventDefault();
        const query = new URLSearchParams();
        for (const [key, value] of new FormData(event.currentTarget)) {
          if (typeof value === "string" && value.trim())
            query.set(key, value.trim());
        }
        navigate(`${action}${query.size ? `?${query}` : ""}#can-ho`);
      }}
    >
      {children}
    </form>
  );
}
