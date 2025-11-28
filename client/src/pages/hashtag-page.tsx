import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Hash, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import VaskCard from "@/components/vask/vask-card";
import { Button } from "@/components/ui/button";
import type { VaskWithAuthor, User } from "@shared/schema";

export default function HashtagPage() {
  const [match, params] = useRoute("/hashtag/:tag");
  const tag = params?.tag || "";

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const { data: vasks, isLoading } = useQuery<VaskWithAuthor[]>({
    queryKey: ["/api/vasks/hashtag", tag, user?.id],
    queryFn: async () => {
      const res = await fetch(`/api/vasks/hashtag/${encodeURIComponent(tag)}?currentUserId=${user?.id || ''}`);
      if (!res.ok) throw new Error("Failed to fetch vasks");
      return res.json();
    },
    enabled: !!tag,
  });

  if (!match) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Feed
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center">
            <Hash className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">#{tag}</h1>
            <p className="text-sm text-muted-foreground">
              {vasks?.length || 0} {vasks?.length === 1 ? 'post' : 'posts'}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse bg-card p-6 rounded-lg border">
              <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
              <div className="h-4 bg-muted rounded w-full mb-3"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Posts */}
      {!isLoading && vasks && vasks.length > 0 && user && (
        <div className="border border-border rounded-lg overflow-hidden divide-y divide-border">
          {vasks.map((vask) => (
            <VaskCard key={vask.id} vask={vask} currentUser={user} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && vasks && vasks.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border">
          <Hash className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No posts found</h2>
          <p className="text-muted-foreground">
            Be the first to use #{tag}!
          </p>
        </div>
      )}
    </div>
  );
}
