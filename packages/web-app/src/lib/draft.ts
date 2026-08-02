import { useEffect, useState } from "react";

// Generic localStorage-backed draft, per ADR 0006. SSR-safe: state starts null
// (matching the server render) and hydrates from localStorage after mount, so
// there's no hydration mismatch.
function readDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeDraft<T>(key: string, value: T | null) {
  if (typeof window === "undefined") return;
  if (value === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, JSON.stringify(value));
  }
}

export function useDraft<T>(key: string) {
  const [draft, setDraftState] = useState<T | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Re-reads on key change is the point (e.g. switching plans re-keys the cart draft).
  useEffect(() => {
    setDraftState(readDraft<T>(key));
    setHydrated(true);
  }, [key]);

  function setDraft(value: T | null) {
    setDraftState(value);
    writeDraft(key, value);
  }

  return { draft, setDraft, hydrated };
}

// Draft-conflict confirmation (plan decision #15): starting a new workout while
// one is already in progress confirms-and-replaces rather than hard-blocking.
export function confirmReplaceDraft(inProgressWorkoutName: string): boolean {
  return window.confirm(
    `You have an unfinished workout in progress (${inProgressWorkoutName}). Start this one instead? Your progress will be discarded.`,
  );
}
