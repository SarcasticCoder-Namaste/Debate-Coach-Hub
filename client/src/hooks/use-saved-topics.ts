import { useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { SavedTopic } from "@shared/schema";

const USER_ID_KEY = "dm:user-id";

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `g_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = generateId();
    window.localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

async function fetchSavedTopics(userId: string): Promise<SavedTopic[]> {
  const res = await fetch("/api/saved-topics", {
    headers: { "x-user-id": userId },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function postSavedTopic(userId: string, topicId: string): Promise<void> {
  const res = await fetch("/api/saved-topics", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    credentials: "include",
    body: JSON.stringify({ topicId }),
  });
  if (!res.ok) throw new Error(`${res.status}`);
}

async function deleteSavedTopic(userId: string, topicId: string): Promise<void> {
  const res = await fetch(
    `/api/saved-topics/${encodeURIComponent(topicId)}`,
    {
      method: "DELETE",
      headers: { "x-user-id": userId },
      credentials: "include",
    },
  );
  if (!res.ok) throw new Error(`${res.status}`);
}

export function useSavedTopics() {
  // Avoid using apiRequest because we need a custom header.
  // void to keep parity with rest of app.
  void apiRequest;

  const userId = useMemo(() => getOrCreateUserId(), []);

  const { data: saved = [], isLoading } = useQuery<SavedTopic[]>({
    queryKey: ["/api/saved-topics", userId],
    queryFn: () => fetchSavedTopics(userId),
  });

  const savedIds = useMemo(
    () => new Set(saved.map((s) => s.topicId)),
    [saved],
  );

  const addMutation = useMutation({
    mutationFn: (topicId: string) => postSavedTopic(userId, topicId),
    onMutate: async (topicId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/saved-topics", userId] });
      const prev = queryClient.getQueryData<SavedTopic[]>([
        "/api/saved-topics",
        userId,
      ]);
      const optimistic: SavedTopic = {
        id: -Date.now(),
        userId,
        topicId,
        createdAt: new Date(),
      };
      queryClient.setQueryData<SavedTopic[]>(
        ["/api/saved-topics", userId],
        [optimistic, ...(prev ?? []).filter((s) => s.topicId !== topicId)],
      );
      return { prev };
    },
    onError: (_err, _topicId, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["/api/saved-topics", userId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-topics", userId] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (topicId: string) => deleteSavedTopic(userId, topicId),
    onMutate: async (topicId) => {
      await queryClient.cancelQueries({ queryKey: ["/api/saved-topics", userId] });
      const prev = queryClient.getQueryData<SavedTopic[]>([
        "/api/saved-topics",
        userId,
      ]);
      queryClient.setQueryData<SavedTopic[]>(
        ["/api/saved-topics", userId],
        (prev ?? []).filter((s) => s.topicId !== topicId),
      );
      return { prev };
    },
    onError: (_err, _topicId, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["/api/saved-topics", userId], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-topics", userId] });
    },
  });

  // Mirror the saved set into localStorage so a quick page-load can read it
  // synchronously (e.g. for the bookmark icon initial state).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "dm:saved-topics",
        JSON.stringify(Array.from(savedIds)),
      );
    } catch {
      // ignore quota errors
    }
  }, [savedIds]);

  function toggle(topicId: string) {
    if (savedIds.has(topicId)) {
      removeMutation.mutate(topicId);
    } else {
      addMutation.mutate(topicId);
    }
  }

  function isSaved(topicId: string) {
    return savedIds.has(topicId);
  }

  return {
    userId,
    saved,
    savedIds,
    isLoading,
    isPending: addMutation.isPending || removeMutation.isPending,
    toggle,
    isSaved,
  };
}
