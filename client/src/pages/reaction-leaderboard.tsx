import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Trophy, TrendingUp, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface LeaderboardEntry {
  vask: {
    id: string;
    content: string;
    createdAt: string;
    authorId: string;
  };
  author: {
    uniqueId: string;
    displayName: string;
    profileImage?: string;
  };
  reactionCount: number;
  emojis: string[];
}

const REACTION_FILTERS = [
  { emoji: null, label: "All Reactions", icon: "🎉" },
  { emoji: "❤️", label: "Most Loved", icon: "❤️" },
  { emoji: "🔥", label: "Hottest", icon: "🔥" },
  { emoji: "😂", label: "Funniest", icon: "😂" },
  { emoji: "💯", label: "Perfect", icon: "💯" },
  { emoji: "🚀", label: "Trending", icon: "🚀" },
  { emoji: "💎", label: "Premium", icon: "💎" },
];

export default function ReactionLeaderboard() {
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  const { data: leaderboard, isLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/reactions", selectedFilter],
    queryFn: async () => {
      const url = selectedFilter
        ? `/api/leaderboard/reactions?emoji=${encodeURIComponent(selectedFilter)}&limit=20`
        : `/api/leaderboard/reactions?limit=20`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch leaderboard");
      return res.json();
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feed
          </Button>
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
            <Trophy className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Reaction Leaderboard</h1>
            <p className="text-muted-foreground">
              Most reacted posts of all time
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {REACTION_FILTERS.map((filter) => (
            <button
              key={filter.label}
              onClick={() => setSelectedFilter(filter.emoji)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                selectedFilter === filter.emoji
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-accent hover:bg-accent/80"
              }`}
            >
              <span className="mr-2">{filter.icon}</span>
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 bg-muted rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Leaderboard */}
      {!isLoading && leaderboard && leaderboard.length > 0 && (
        <div className="space-y-3">
          {leaderboard.map((entry, index) => (
            <Link key={entry.vask.id} href={`/profile/${entry.vask.authorId}`}>
              <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group">
                <div className="flex gap-4 items-start">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center font-bold text-white text-lg">
                    {index === 0 && "🥇"}
                    {index === 1 && "🥈"}
                    {index === 2 && "🥉"}
                    {index > 2 && `#${index + 1}`}
                  </div>

                  {/* Author Avatar */}
                  <div className="flex-shrink-0">
                    {entry.author.profileImage ? (
                      <img
                        src={entry.author.profileImage}
                        alt={entry.author.displayName || entry.author.uniqueId}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold">
                        {(entry.author.displayName || entry.author.uniqueId)[0].toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {entry.author.displayName || entry.author.uniqueId}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @{entry.author.uniqueId}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mb-2 line-clamp-2">
                      {entry.vask.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {entry.reactionCount} reactions
                      </span>
                      <span className="flex gap-1">
                        {entry.emojis.slice(0, 5).map((emoji, i) => (
                          <span key={i}>{emoji}</span>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && (!leaderboard || leaderboard.length === 0) && (
        <Card className="p-12 text-center">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No reactions yet</h2>
          <p className="text-muted-foreground">
            Be the first to react to posts and climb the leaderboard!
          </p>
        </Card>
      )}
    </div>
  );
}
