import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type AuthUser = { id: number; email: string; name: string | null };

export function useAuth() {
  const { data, isLoading } = useQuery<{ user: AuthUser | null }>({
    queryKey: ["/api/auth/me"],
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

  return { user: data?.user ?? null, isLoading, signIn, signUp, signOut };
}
