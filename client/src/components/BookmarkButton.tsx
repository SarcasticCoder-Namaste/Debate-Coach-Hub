import { Bookmark, BookmarkCheck } from "lucide-react";
import { useSavedTopics } from "@/hooks/use-saved-topics";
import { useToast } from "@/hooks/use-toast";

type Variant = "card" | "hero";

interface BookmarkButtonProps {
  topicId: string;
  variant?: Variant;
  className?: string;
}

export function BookmarkButton({
  topicId,
  variant = "card",
  className = "",
}: BookmarkButtonProps) {
  const { isSaved, toggle, isPending } = useSavedTopics();
  const { toast } = useToast();
  const saved = isSaved(topicId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = saved;
    toggle(topicId);
    toast({
      title: wasSaved ? "Removed from Saved" : "Saved",
      description: wasSaved
        ? "Topic removed from your Saved list."
        : "Find it again under the Saved filter on /topics.",
    });
  };

  const base =
    variant === "hero"
      ? "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors"
      : "inline-flex items-center justify-center rounded-md border h-8 w-8 transition-colors";

  const tone =
    variant === "hero"
      ? saved
        ? "bg-accent text-accent-foreground border-accent"
        : "bg-white/10 text-white border-white/20 hover:bg-white/20"
      : saved
      ? "bg-accent/15 text-accent border-accent/40"
      : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-foreground/40";

  const Icon = saved ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from Saved" : "Save topic"}
      data-testid={`button-bookmark-${topicId}`}
      className={`${base} ${tone} ${className}`}
    >
      <Icon className={variant === "hero" ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {variant === "hero" && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
