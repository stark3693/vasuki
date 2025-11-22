import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { Home, User, Settings, Search, Image, TrendingUp, Sparkles, MessageCircle, Clock, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [location, setLocation] = useLocation();
  const { user } = useWallet();

  const navItems = [
    {
      name: "Home",
      icon: Home,
      path: "/home",
      testId: "mobile-nav-home"
    },
    {
      name: "Search",
      icon: Search,
      path: "/search",
      testId: "mobile-nav-search"
    },
    {
      name: "Polls",
      icon: TrendingUp,
      path: "/prediction-polls",
      testId: "mobile-nav-polls"
    },
    {
      name: "Revolutionary",
      icon: Sparkles,
      path: "/revolutionary",
      testId: "mobile-nav-revolutionary"
    },
      {
        name: "Chat",
        icon: MessageCircle,
        path: "/chat-rooms",
        testId: "mobile-nav-chat"
      },
    {
      name: "Profile",
      icon: User,
      path: `/profile/${user?.id}`,
      testId: "mobile-nav-profile"
    },
  ];

  if (!user) return null;

  return (
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border/50 p-2 md:hidden z-50 shadow-2xl">
      <div className="flex justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || 
            (item.path === "/home" && location === "/") ||
            (item.path.startsWith("/profile") && location.startsWith("/profile")) ||
            (item.path === "/prediction-polls" && location.startsWith("/prediction-polls"));
          
          return (
            <button
              key={item.name}
              onClick={() => setLocation(item.path)}
                className={cn(
                  "nav-item flex flex-col items-center p-3 rounded-xl transition-all duration-200 mobile-touch-target min-w-0 flex-1 group",
                  isActive
                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg scale-105"
                    : "hover:bg-accent/50 hover:text-accent-foreground hover:scale-105"
                )}
              data-testid={item.testId}
            >
              <Icon className="h-5 w-5 mb-1 flex-shrink-0" />
              <span className="text-xs font-medium truncate max-w-full">{item.name}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
