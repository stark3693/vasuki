import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { useEncryption } from "@/hooks/use-encryption";
import { useTheme } from "@/hooks/use-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Wallet as WalletIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const [, setLocation] = useLocation();
  const { isConnected, user, disconnect } = useWallet();
  const { encryptText, decryptText, isDataEncrypted, isEncryptionAvailable } = useEncryption();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!isConnected) {
      setLocation("/");
    }
  }, [isConnected, setLocation]);

  useEffect(() => {
    if (user) {
      // Decrypt display name if encrypted
      const decryptedDisplayName = user.isEncrypted && user.displayNameEncrypted && isDataEncrypted(user.displayNameEncrypted)
        ? decryptText(user.displayNameEncrypted)
        : user.displayName || "";
      
      // Decrypt bio if encrypted
      const decryptedBio = user.isEncrypted && user.bioEncrypted && isDataEncrypted(user.bioEncrypted)
        ? decryptText(user.bioEncrypted)
        : user.bio || "";
      
      setDisplayName(decryptedDisplayName);
      setBio(decryptedBio);
    }
  }, [user, decryptText, isDataEncrypted]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { displayName?: string; bio?: string }) => {
      const response = await apiRequest('PATCH', `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/users', user?.id], data);
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update your profile. Please try again.",
        variant: "destructive",
      });
    }
  });


  const handleSaveProfile = async () => {
    let profileData: any = {
      isEncrypted: isEncryptionAvailable,
    };

    // Handle display name encryption
    if (displayName.trim()) {
      if (isEncryptionAvailable) {
        const encryptedDisplayName = encryptText(displayName.trim());
        profileData.displayNameEncrypted = encryptedDisplayName;
        profileData.displayName = ''; // Empty for encrypted content
      } else {
        profileData.displayName = displayName.trim();
      }
    }

    // Handle bio encryption
    if (bio.trim()) {
      if (isEncryptionAvailable) {
        const encryptedBio = encryptText(bio.trim());
        profileData.bioEncrypted = encryptedBio;
        profileData.bio = ''; // Empty for encrypted content
      } else {
        profileData.bio = bio.trim();
      }
    }

    updateProfileMutation.mutate(profileData);
  };



  const handleDisconnectWallet = () => {
    if (window.confirm("Are you sure you want to disconnect your wallet?")) {
      disconnect();
      setLocation("/");
    }
  };

  if (!isConnected || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row">
        {/* Left Sidebar - Desktop */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 min-w-0 max-w-full overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border p-3 sm:p-4 z-10">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/home")}
                data-testid="button-back"
                className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold truncate" data-testid="page-title">Settings</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Manage your Vasukii experience</p>
              </div>
            </div>
          </header>

          <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
            {/* Appearance */}
            <Card className="bg-card border">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg font-semibold">Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-medium text-sm sm:text-base">Dark Mode</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Switch between light and dark themes
                    </p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={toggleTheme}
                    data-testid="switch-theme"
                    className="flex-shrink-0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Profile */}
            <Card className="bg-card border">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg font-semibold">Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm sm:text-base">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    data-testid="input-display-name"
                    className="text-sm sm:text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm sm:text-base">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us about yourself"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={3}
                    data-testid="textarea-bio"
                    className="text-sm sm:text-base"
                  />
                </div>
                <Button
                  onClick={handleSaveProfile}
                  disabled={updateProfileMutation.isPending}
                  className="wallet-button w-full sm:w-auto"
                  data-testid="button-save-profile"
                >
                  <span className="text-sm sm:text-base">
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </span>
                </Button>
              </CardContent>
            </Card>

            {/* Data Rights */}
            <Card className="bg-card border">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg font-semibold">Data Rights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="p-3 sm:p-4 bg-muted rounded-lg">
                  <h3 className="font-medium mb-2 text-sm sm:text-base">How Your Data is Stored</h3>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>• Profile settings stored locally in your browser</li>
                    <li>• Vasks stored on IPFS for decentralized access</li>
                    <li>• Interactions recorded on blockchain</li>
                    <li>• You maintain full control of your data</li>
                  </ul>
                </div>

              </CardContent>
            </Card>

            {/* Wallet */}
            <Card className="bg-card border">
              <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg font-semibold">Wallet Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-border rounded-lg space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                    <WalletIcon className="text-lg sm:text-xl text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm sm:text-base">MetaMask</p>
                      <p className="text-xs sm:text-sm text-muted-foreground font-mono break-all" data-testid="text-wallet-address">
                        {user.walletAddress}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDisconnectWallet}
                    variant="outline"
                    data-testid="button-disconnect-wallet"
                    className="w-full sm:w-auto"
                  >
                    <span className="text-sm sm:text-base">Disconnect</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && <MobileNav />}
    </div>
  );
}
