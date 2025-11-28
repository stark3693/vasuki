import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Hash, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface TrendingHashtag {
  id: string;
  tag: string;
  count: number;
  lastUsed: string;
}

export default function TrendingHashtags() {
  const { data: hashtags, isLoading } = useQuery<TrendingHashtag[]>({
    queryKey: ["/api/hashtags/trending"],
    queryFn: async () => {
      const res = await fetch("/api/hashtags/trending?limit=10");
      if (!res.ok) throw new Error("Failed to fetch trending hashtags");
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Trending</h2>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (!hashtags || hashtags.length === 0) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Trending</h2>
        </div>
        <p className="text-sm text-muted-foreground">No trending hashtags yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">Trending</h2>
      </div>
      <div className="space-y-3">
        {hashtags.map((hashtag, index) => (
          <Link
            key={hashtag.id}
            href={`/hashtag/${hashtag.tag.replace(/^#/, '')}`}
            className="block hover:bg-accent p-2 rounded-lg transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-muted-foreground text-sm font-mono">
                  {index + 1}
                </span>
                <Hash className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {hashtag.tag.replace(/^#/, '')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {hashtag.count} {hashtag.count === 1 ? 'post' : 'posts'}
                  </p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
