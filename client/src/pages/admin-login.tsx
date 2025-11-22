import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, User, Shield } from "lucide-react";

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setLocation("/admin/dashboard");
      } else {
        setError(data.message || "Login failed");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0A1A] via-[#1A1A2E] to-[#16213E] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ethereal Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-2 h-2 bg-[#8B5CF6] rounded-full animate-ethereal-1 animate-ethereal-glow"></div>
        <div className="absolute top-20 right-16 w-1 h-1 bg-[#A855F7] rounded-full animate-ethereal-2 animate-ethereal-glow"></div>
        <div className="absolute bottom-20 left-20 w-3 h-3 bg-[#7C3AED] rounded-full animate-ethereal-3 animate-ethereal-glow"></div>
        <div className="absolute bottom-10 right-10 w-1.5 h-1.5 bg-[#9333EA] rounded-full animate-ethereal-4 animate-ethereal-glow"></div>
        <div className="absolute top-1/3 left-1/3 w-2.5 h-2.5 bg-[#6D28D9] rounded-full animate-ethereal-5 animate-ethereal-glow"></div>
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-[#8B5CF6] rounded-full animate-ethereal-1 animate-ethereal-glow"></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-[#A855F7] rounded-full animate-ethereal-2 animate-ethereal-glow"></div>
        <div className="absolute top-1/4 right-1/4 w-1.5 h-1.5 bg-[#7C3AED] rounded-full animate-ethereal-3 animate-ethereal-glow"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="border-0 shadow-2xl bg-white/5 backdrop-blur-xl border-white/10">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#8B5CF6] to-[#A855F7] rounded-xl flex items-center justify-center shadow-lg">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-white tracking-wide">Admin Panel</CardTitle>
              <CardDescription className="text-[#ADD8E6]/70">
                Secure access to VasukiiMicroblog administration
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-white font-medium">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ADD8E6]/50 w-4 h-4" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-[#ADD8E6]/50 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#ADD8E6]/50 w-4 h-4" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-[#ADD8E6]/50 focus:border-[#8B5CF6] focus:ring-[#8B5CF6]/20"
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert className="bg-red-500/10 border-red-500/20 backdrop-blur-sm">
                  <AlertDescription className="text-red-300">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-[#8B5CF6] to-[#A855F7] hover:from-[#7C3AED] hover:to-[#9333EA] text-white font-medium py-2.5 shadow-lg transition-all duration-300"
              >
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[#ADD8E6]/70">
                Authorized personnel only
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

