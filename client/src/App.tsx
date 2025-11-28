import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { WalletProvider } from "@/hooks/use-wallet";
import { ThemeProvider } from "@/hooks/use-theme";
import { Web3Provider } from "@/providers/web3-provider";
import { DatabaseProvider } from "@/components/database-provider";
import { WalletAuthGuard } from "@/components/auth/wallet-auth-guard";

import AuthPage from "@/pages/auth";
import HomePage from "@/pages/home";
import ProfilePage from "@/pages/profile";
import UsernameProfilePage from "@/pages/username-profile";
import SettingsPage from "@/pages/settings";
import SearchPage from "@/pages/search";
import AdminLoginPage from "@/pages/admin-login";
import AdminDashboardPage from "@/pages/admin-dashboard";
import { PredictionPollsPage } from "@/pages/prediction-polls";
import RevolutionaryPage from "@/pages/revolutionary";
import ChatRoomsPage from "@/pages/chat-rooms";
import ChatRoomDetailPage from "@/pages/chat-room-detail";
import HashtagPage from "@/pages/hashtag-page";
import ReactionLeaderboard from "@/pages/reaction-leaderboard";
import BookmarksPage from "@/pages/bookmarks-page";
import NotificationsPage from "@/pages/notifications-page";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={AuthPage} />
      <Route path="/admin" component={AdminLoginPage} />
      <Route path="/admin/login" component={AdminLoginPage} />
      <Route path="/admin/dashboard" component={AdminDashboardPage} />
      <Route path="/home">
        <WalletAuthGuard>
          <HomePage />
        </WalletAuthGuard>
      </Route>
      <Route path="/profile/:id?">
        <WalletAuthGuard>
          <ProfilePage />
        </WalletAuthGuard>
      </Route>
      <Route path="/u/:username">
        <WalletAuthGuard>
          <UsernameProfilePage />
        </WalletAuthGuard>
      </Route>
      <Route path="/settings">
        <WalletAuthGuard>
          <SettingsPage />
        </WalletAuthGuard>
      </Route>
      <Route path="/search">
        <WalletAuthGuard>
          <SearchPage />
        </WalletAuthGuard>
      </Route>
      <Route path="/prediction-polls">
        <WalletAuthGuard>
          <PredictionPollsPage />
        </WalletAuthGuard>
      </Route>
      <Route path="/revolutionary">
        <WalletAuthGuard>
          <RevolutionaryPage />
        </WalletAuthGuard>
      </Route>
          <Route path="/chat-rooms">
            <WalletAuthGuard>
              <ChatRoomsPage />
            </WalletAuthGuard>
          </Route>
          <Route path="/chat-rooms/:roomId">
            <WalletAuthGuard>
              <ChatRoomDetailPage />
            </WalletAuthGuard>
          </Route>
          <Route path="/hashtag/:tag">
            <WalletAuthGuard>
              <HashtagPage />
            </WalletAuthGuard>
          </Route>
          <Route path="/leaderboard/reactions">
            <WalletAuthGuard>
              <ReactionLeaderboard />
            </WalletAuthGuard>
          </Route>
          <Route path="/bookmarks">
            <WalletAuthGuard>
              <BookmarksPage />
            </WalletAuthGuard>
          </Route>
          <Route path="/notifications">
            <WalletAuthGuard>
              <NotificationsPage />
            </WalletAuthGuard>
          </Route>
          <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DatabaseProvider>
        <ThemeProvider>
          <WalletProvider>
            <Web3Provider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </Web3Provider>
          </WalletProvider>
        </ThemeProvider>
      </DatabaseProvider>
    </QueryClientProvider>
  );
}

export default App;
