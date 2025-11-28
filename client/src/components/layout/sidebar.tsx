import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, User, Settings, Search, Image, TrendingUp, Sparkles, MessageCircle, Clock, ShoppingCart, Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import NotificationCenter from "@/components/notification-center";

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useWallet();
  const [pendingInvitations, setPendingInvitations] = useState(0);

  // Check for pending invitations
  useEffect(() => {
    if (user?.id) {
      const checkInvitations = async () => {
        try {
          const response = await fetch(`/api/chat-invitations/${user.id}`);
          if (response.ok) {
            const invitations = await response.json();
            const pending = invitations.filter((inv: any) => inv.status === 'pending');
            setPendingInvitations(pending.length);
          }
        } catch (error) {
          console.error('Failed to check invitations:', error);
        }
      };

      checkInvitations();
      // Check every 10 seconds
      const interval = setInterval(checkInvitations, 10000);
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  const navItems = [
    {
      name: "Home",
      icon: Home,
      path: "/home",
      testId: "nav-home"
    },
    {
      name: "Search",
      icon: Search,
      path: "/search",
      testId: "nav-search"
    },
    {
      name: "Prediction Polls",
      icon: TrendingUp,
      path: "/prediction-polls",
      testId: "nav-polls"
    },
    {
      name: "Revolutionary",
      icon: Sparkles,
      path: "/revolutionary",
      testId: "nav-revolutionary"
    },
      {
        name: "Chat Rooms",
        icon: MessageCircle,
        path: "/chat-rooms",
        testId: "nav-chat-rooms",
        hasNotification: pendingInvitations > 0,
        notificationCount: pendingInvitations
      },
    {
      name: "Bookmarks",
      icon: Bookmark,
      path: "/bookmarks",
      testId: "nav-bookmarks"
    },
    {
      name: "Profile",
      icon: User,
      path: `/profile/${user?.id}`,
      testId: "nav-profile"
    },
    {
      name: "Settings",
      icon: Settings,
      path: "/settings",
      testId: "nav-settings"
    },
  ];

  if (!user) return null;

  return (
      <aside className="w-64 border-r border-border/50 bg-background/95 backdrop-blur-xl p-4 lg:p-6 min-h-screen flex flex-col shadow-lg">
      <div className="space-y-6 lg:space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-between mb-3">
            <div className="flex-1"></div>
            <img 
              src="/assets/finallogo.png" 
              alt="Vasukii Logo" 
              className="h-16 w-16 lg:h-20 lg:w-20 logo-hover rounded-lg"
              data-testid="app-logo"
            />
            <div className="flex-1 flex justify-end">
              <NotificationCenter />
            </div>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold gradient-text">
            Vasukii
          </h1>
          <p className="text-xs text-muted-foreground mt-1 hidden lg:block">
            Decentralized Social Network
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path || 
              (item.path === "/home" && location === "/") ||
              (item.path.startsWith("/profile") && location.startsWith("/profile"));
            
            return (
              <button
                key={item.name}
                onClick={() => setLocation(item.path)}
                  className={cn(
                    "nav-item w-full flex items-center space-x-3 p-3 lg:p-4 rounded-xl transition-all duration-200 group",
                    isActive
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg scale-105"
                      : "hover:bg-accent/50 hover:text-accent-foreground hover:scale-105"
                  )}
                data-testid={item.testId}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium text-sm lg:text-base truncate">{item.name}</span>
                {item.hasNotification && (
                  <Badge variant="destructive" className="ml-auto text-xs px-2 py-1">
                    {item.notificationCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Post Vask button removed as requested */}
      </div>

      <div className="mt-auto pt-4 lg:pt-6 border-t border-border/50">
        <div className="flex items-center space-x-3 p-3 lg:p-4 rounded-xl bg-muted/30 backdrop-blur-sm hover:bg-muted/50 transition-all duration-200">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white font-bold text-sm lg:text-base">
              {(user.displayName || user.ensName || user.walletAddress)[0].toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm lg:text-base font-semibold truncate" data-testid="text-user-name">
              {user.displayName || user.ensName || "Anonymous"}
            </p>
            <p className="text-xs text-primary font-medium truncate" data-testid="text-user-username">
              @{user.uniqueId}
            </p>
            <p className="text-xs text-muted-foreground truncate font-mono hidden lg:block" data-testid="text-user-address">
              {user.walletAddress.slice(0, 10)}...{user.walletAddress.slice(-8)}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
