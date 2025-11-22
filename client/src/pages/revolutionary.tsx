import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/hooks/use-theme";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { RevolutionaryFeatures } from "@/components/vask-revolutionary-features";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Sparkles, ArrowLeft, MessageCircle } from "lucide-react";

export default function RevolutionaryPage() {
  const [, setLocation] = useLocation();
  const { isConnected, user } = useWallet();
  const { toggleTheme, theme } = useTheme();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  if (!isConnected || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md mx-4 border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                <Sparkles className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <CardTitle className="text-xl text-purple-800 dark:text-purple-200">
              Revolutionary Features
            </CardTitle>
            <CardDescription className="text-purple-700 dark:text-purple-300">
              Connect your wallet to access world's first social media features.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                <Sparkles className="h-4 w-4" />
                <span>Revolutionary Features</span>
              </div>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                Experience the future of social media with blockchain-powered features.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.href = '/'} 
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Connect Wallet to Get Started
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
          {/* Left Sidebar - Desktop */}
          {!isMobile && <Sidebar />}

          {/* Main Content */}
          <main className="flex-1 lg:border-r border-border min-w-0 max-w-full overflow-hidden">
            {/* Header */}
            <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-3 sm:p-4 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setLocation('/home')}
                    className="h-8 w-8 sm:h-10 sm:w-10"
                  >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
        <img 
          src="/assets/finallogo.png" 
          alt="Vasukii Logo" 
          className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 logo-hover flex-shrink-0 rounded-lg"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold mystical-text truncate" data-testid="page-title">
                    Revolutionary Features
                  </h2>
                </div>
                <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    data-testid="button-toggle-theme"
                    className="h-9 w-9 sm:h-10 sm:w-10"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4 sm:h-5 sm:w-5" /> : <Moon className="h-4 w-4 sm:h-5 sm:w-5" />}
                  </Button>
                </div>
              </div>
            </header>

            {/* Revolutionary Features Content */}
            <div className="p-4 sm:p-6">
              {/* Hero Section */}
              <div className="text-center space-y-4 mb-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-full text-sm font-medium text-purple-700 dark:text-purple-300">
                  <Sparkles className="h-4 w-4" />
                  World's First Social Media Features
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                  Revolutionary Features
                </h1>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Experience groundbreaking features that have never been implemented in any social media platform before. 
                  Powered by blockchain technology, AI, and innovative user experiences.
                </p>
              </div>

              {/* Features Overview */}
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-8">
                <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 dark:bg-green-800 rounded-lg">
                        <MessageCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-green-800 dark:text-green-200">Lightning Chat Rooms</h3>
                        <p className="text-sm text-green-600 dark:text-green-400">Group chat & instant messaging</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Interactive Features */}
              <RevolutionaryFeatures userAddress={user.walletAddress} />
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </>
  );
}

