import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type AuthUser = { id: number; email: string; name: string | null; role?: "student" | "coach" };

export function useAuth() {
  const { data, isLoading, isError } = useQuery<{ user: AuthUser | null }>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });
        if (res.status === 401 || !res.ok) return { user: null };
        return res.json() as Promise<{ user: AuthUser | null }>;
      } catch {
        return { user: null };
      } finally {
        clearTimeout(timeout);
      }
    },
  });

  const signIn = useMutation({
    mutationFn: async (vars: { email: string; password: string }) => {
      const r = await apiRequest("POST", "/api/auth/signin", vars);
      return (await r.json()) as { user: AuthUser };
    },
    onSuccess: (d) => {
      queryClient.setQueryData(["/api/auth/me"], { user: d.user });
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
    },
  });

  const signUp = useMutation({
    mutationFn: async (vars: { email: string; password: string; name?: string }) => {
      const r = await apiRequest("POST", "/api/auth/signup", vars);
      return (await r.json()) as { user: AuthUser };
    },
    onSuccess: (d) => {
      queryClient.setQueryData(["/api/auth/me"], { user: d.user });
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
    },
  });

  const signOut = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/signout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], { user: null });
      queryClient.invalidateQueries({ queryKey: ["/api/practice/rounds"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research"] });
    },
  });

  return { user: data?.user ?? null, isLoading: isLoading && !isError, signIn, signUp, signOut };
}
