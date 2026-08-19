import { useQuery } from "@tanstack/react-query";

export type VisitorUser = {
  id: number;
  email: string;
  name: string | null;
  role?: "student" | "coach";
};

type SessionResponse = {
  user: VisitorUser | null;
};

async function getOrStartVisitorSession(): Promise<SessionResponse> {
  const current = await fetch("/api/auth/me", {
    credentials: "include",
  });

  if (!current.ok) {
    throw new Error(`Session check failed (${current.status})`);
  }

  const existing = (await current.json()) as SessionResponse;
  if (existing.user) return existing;

  const guest = await fetch("/api/auth/guest", {
    method: "POST",
    credentials: "include",
  });
  if (!guest.ok) {
    const body = await guest.json().catch(() => ({}));
    throw new Error(body?.error || `Visitor session failed (${guest.status})`);
  }

  return (await guest.json()) as SessionResponse;
}

export function useVisitorSession() {
  const query = useQuery<SessionResponse>({
    queryKey: ["/api/visitor-session"],
    queryFn: getOrStartVisitorSession,
    staleTime: Infinity,
    retry: 2,
  });

  return {
    user: query.data?.user ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}