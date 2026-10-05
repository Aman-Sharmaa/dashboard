"use client";

import { useEffect } from "react";

interface ViewTrackerProps {
  id: string;
  type: "page" | "post";
}

export function ViewTracker({ id, type }: ViewTrackerProps) {
  useEffect(() => {
    if (!id) return;
    
    // Check session storage to avoid multiple counting per session
    const storageKey = `viewed_${type}_${id}`;
    if (sessionStorage.getItem(storageKey)) return;

    fetch(`/api/cms/${type === "page" ? "pages" : "posts"}/${id}/view`, {
      method: "POST",
    })
      .then((res) => {
        if (res.ok) {
          sessionStorage.setItem(storageKey, "true");
        }
      })
      .catch((err) => console.error("Failed to track view:", err));
  }, [id, type]);

  return null;
}
