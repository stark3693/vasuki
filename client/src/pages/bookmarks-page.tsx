import { useQuery } from "@tanstack/react-query";
import { useWallet } from "@/hooks/use-wallet";
import { Bookmark, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import VaskCard from "@/components/vask/vask-card";
import type { VaskWithAuthor } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksPage() {
  const { user } = useWallet();

  const { data: bookmarks, isLoading } = useQuery<VaskWithAuthor[]>({
    queryKey: ["/api/bookmarks", user?.id],
    queryFn: async () => {
      const response = await fetch(`/api/bookmarks?userId=${user?.id}`);
      if (!response.ok) throw new Error("Failed to fetch bookmarks");
      return response.json();
    },
    enabled: !!user?.id,
  });

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <header className="sticky top-0 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 sm:p-6 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <Link href="/home">
              <Button variant="ghost" size="icon" className="rounded-full">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
                <Bookmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  Bookmarks
                </h1>
                <p className="text-sm text-muted-foreground">
                  {bookmarks?.length || 0} saved {bookmarks?.length === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-4 sm:p-6">
          {isLoading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-4 p-6 bg-card/30 rounded-lg border border-border/50">
                  <div className="flex space-x-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-3">
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : bookmarks && bookmarks.length > 0 ? (
            <div className="space-y-0 divide-y divide-border/50">
              {bookmarks.map((vask) => (
                <VaskCard key={vask.id} vask={vask} currentUser={user} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-full flex items-center justify-center mb-6">
                <Bookmark className="h-12 w-12 text-yellow-600 dark:text-yellow-400" />
              </div>
              <h3 className="text-xl font-semibold mb-3">No bookmarks yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Save posts by clicking the bookmark icon. Your saved posts will appear here.
              </p>
              <Link href="/home">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Feed
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
