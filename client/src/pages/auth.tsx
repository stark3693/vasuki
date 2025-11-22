import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/hooks/use-wallet";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  ChevronRight,
  Shield,
  ExternalLink,
  Check,
  AlertTriangle,
  Loader2,
  TrendingUp,
  MessageSquare,
  Users,
  Zap
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { isConnected, isConnecting, connectMetaMask, connectWalletConnect } = useWallet();
  const { toast } = useToast();
  const [isAnimating, setIsAnimating] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const features = [
    {
      icon: TrendingUp,
      title: "Prediction Markets",
      description: "Create and participate in prediction polls, vote on outcomes and track results",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: MessageSquare,
      title: "Social Vasks",
      description: "Share thoughts, engage with community, and build your reputation",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      icon: Users,
      title: "Lightning Chat",
      description: "Real-time encrypted chat rooms with community",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Revolutionary Features",
      description: "Access exclusive Web3 features and decentralized tools",
      gradient: "from-amber-500 to-orange-500"
    }
  ];

  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('success');
      setTimeout(() => {
        setLocation("/home");
      }, 1000);
    }
  }, [isConnected, setLocation]);

  const handleConnectMetaMask = async () => {
    try {
      setIsAnimating(true);
      setConnectionStatus('connecting');
      await connectMetaMask();
    } catch (error) {
      setIsAnimating(false);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Failed to connect to MetaMask");
      toast({
        title: "Connection Failed",
        description: error instanceof Error ? error.message : "Failed to connect to MetaMask",
        variant: "destructive",
      });
    }
  };

  const handleConnectPhantom = async () => {
    try {
      setIsAnimating(true);
      setConnectionStatus('connecting');
      await connectWalletConnect();
    } catch (error) {
      setIsAnimating(false);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Please install Phantom wallet or use MetaMask");
      toast({
        title: "Phantom Connection Failed",
        description: error instanceof Error ? error.message : "Please install Phantom wallet or use MetaMask",
        variant: "destructive",
      });
    }
  };

  const handleConnectOtherWallet = async () => {
    try {
      setIsAnimating(true);
      setConnectionStatus('connecting');
      await connectWalletConnect();
    } catch (error) {
      setIsAnimating(false);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : "Please install a compatible wallet like MetaMask, Phantom, or Coinbase Wallet");
      toast({
        title: "Wallet Connection Failed",
        description: error instanceof Error ? error.message : "Please install a compatible wallet like MetaMask, Phantom, or Coinbase Wallet",
        variant: "destructive",
      });
    }
  };

  if (isConnected) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 relative overflow-hidden auth-gradient-bg">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Simplified Particle System */}
        <div className="absolute top-10 left-10 w-1 h-1 bg-purple-500 rounded-full auth-particle"></div>
        <div className="absolute top-20 right-16 w-1 h-1 bg-cyan-400 rounded-full auth-particle" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-16 w-1 h-1 bg-purple-400 rounded-full auth-particle" style={{ animationDelay: '4s' }}></div>
        <div className="absolute bottom-10 right-10 w-1 h-1 bg-cyan-500 rounded-full auth-particle" style={{ animationDelay: '6s' }}></div>
        <div className="absolute top-1/3 left-1/3 w-1 h-1 bg-purple-300 rounded-full auth-particle" style={{ animationDelay: '8s' }}></div>
        <div className="absolute top-2/3 right-1/3 w-1 h-1 bg-cyan-300 rounded-full auth-particle" style={{ animationDelay: '10s' }}></div>
        <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-purple-400 rounded-full auth-particle" style={{ animationDelay: '12s' }}></div>
        <div className="absolute top-1/4 right-1/4 w-1 h-1 bg-cyan-400 rounded-full auth-particle" style={{ animationDelay: '14s' }}></div>
        
        {/* Glow Orbs */}
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-purple-500 rounded-full auth-glow-orb"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyan-500 rounded-full auth-glow-orb"></div>
      </div>

      {/* Main Container - Side by Side */}
      <div className="max-w-7xl w-full relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* LEFT SIDE - Wallet Connection */}
          <div className="auth-card-enter">
            <div className="auth-glass-card rounded-3xl p-8 md:p-12 space-y-8">
              {/* Logo Section */}
              <div className="text-center space-y-4">
                <div className="auth-logo-enter">
                  <img 
                    src="/assets/finallogo.png" 
                    alt="Vasukii Logo" 
                    className="w-20 h-20 md:w-24 md:h-24 mx-auto logo-hover rounded-lg"
                  />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent">
                    Connect Your Wallet
                  </h1>
                  <p className="text-sm text-muted-foreground mt-2">
                    Secure blockchain authentication
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {connectionStatus === 'error' && (
                <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-red-800 dark:text-red-200">
                    {errorMessage}
                  </AlertDescription>
                </Alert>
              )}

              {/* Success State */}
              {connectionStatus === 'success' && (
                <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400">
                  <Check className="h-5 w-5" />
                  <span className="font-medium">Connected successfully!</span>
                </div>
              )}

              {/* Wallet Connection Buttons */}
              <div className="space-y-4">
                {/* MetaMask Button */}
                <button
                  onClick={handleConnectMetaMask}
                  disabled={isConnecting || isAnimating}
                  className="premium-wallet-button auth-button-stagger auth-button-hover"
                  data-testid="button-connect-metamask"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center">
                      <svg className="w-7 h-7" viewBox="0 0 318.6 318.6" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <style>{`.cls-1{fill:#e2761b;stroke:#e2761b;stroke-linecap:round;stroke-linejoin:round;}.cls-2{fill:#e4761b;stroke:#e4761b;stroke-linecap:round;stroke-linejoin:round;}.cls-3{fill:#d7c1b3;stroke:#d7c1b3;stroke-linecap:round;stroke-linejoin:round;}.cls-4{fill:#233447;stroke:#233447;stroke-linecap:round;stroke-linejoin:round;}.cls-5{fill:#cd6116;stroke:#cd6116;stroke-linecap:round;stroke-linejoin:round;}.cls-6{fill:#e4751f;stroke:#e4751f;stroke-linecap:round;stroke-linejoin:round;}.cls-7{fill:#f6851b;stroke:#f6851b;stroke-linecap:round;stroke-linejoin:round;}.cls-8{fill:#c0ad9e;stroke:#c0ad9e;stroke-linecap:round;stroke-linejoin:round;}.cls-9{fill:#161616;stroke:#161616;stroke-linecap:round;stroke-linejoin:round;}.cls-10{fill:#763e1a;stroke:#763e1a;stroke-linecap:round;stroke-linejoin:round;}`}</style>
                        </defs>
                        <polygon className="cls-1" points="274.1,35.5 174.6,109.4 193,65.8 "/>
                        <polygon className="cls-2" points="44.4,35.5 143.1,110.1 125.6,65.8 "/>
                        <polygon className="cls-1" points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7 "/>
                        <polygon className="cls-2" points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8 "/>
                        <polygon className="cls-1" points="103.6,138.2 87.8,162.1 144.1,164.6 142.8,106.7 "/>
                        <polygon className="cls-2" points="214.9,138.2 175.9,106.4 174.6,164.6 230.8,162.1 "/>
                        <polygon className="cls-1" points="106.8,247.4 140.6,230.9 111.4,208.1 "/>
                        <polygon className="cls-2" points="177.9,230.9 211.8,247.4 207.1,208.1 "/>
                        <polygon className="cls-3" points="211.8,247.4 177.9,230.9 180.6,253 180.3,262.3 "/>
                        <polygon className="cls-4" points="106.8,247.4 138.3,262.3 138.1,253 140.6,230.9 "/>
                        <polygon className="cls-5" points="138.8,193.5 110.6,185.2 130.5,176.1 "/>
                        <polygon className="cls-5" points="179.7,193.5 188,176.1 208,185.2 "/>
                        <polygon className="cls-6" points="106.8,247.4 111.6,206.8 80.3,207.7 "/>
                        <polygon className="cls-6" points="207,206.8 211.8,247.4 238.3,207.7 "/>
                        <polygon className="cls-6" points="230.8,162.1 174.6,164.6 179.8,193.5 188.1,176.1 208.1,185.2 "/>
                        <polygon className="cls-6" points="110.6,185.2 130.6,176.1 138.8,193.5 144.1,164.6 87.8,162.1 "/>
                        <polygon className="cls-7" points="87.8,162.1 111.6,206.8 110.6,185.2 "/>
                        <polygon className="cls-7" points="208.1,185.2 207,206.8 230.8,162.1 "/>
                        <polygon className="cls-7" points="144.1,164.6 138.8,193.5 145.4,227.6 146.9,182.7 "/>
                        <polygon className="cls-7" points="174.6,164.6 171.9,182.6 173.1,227.6 179.8,193.5 "/>
                        <polygon className="cls-8" points="179.8,193.5 173.1,227.6 177.9,230.9 207.1,208.1 208.1,185.2 "/>
                        <polygon className="cls-8" points="110.6,185.2 111.4,208.1 140.6,230.9 145.4,227.6 138.8,193.5 "/>
                        <polygon className="cls-9" points="180.3,262.3 180.6,253 178.1,250.8 140.4,250.8 138.1,253 138.3,262.3 106.8,247.4 117.8,256.4 140.1,271.9 178.4,271.9 200.8,256.4 211.8,247.4 "/>
                        <polygon className="cls-10" points="177.9,230.9 173.1,227.6 145.4,227.6 140.6,230.9 138.1,253 140.4,250.8 178.1,250.8 180.6,253 "/>
                        <polygon className="cls-9" points="278.3,114.2 286.8,73.4 274.1,35.5 177.9,106.9 214.9,138.2 267.2,153.5 278.8,140 273.8,136.4 281.8,129.1 275.6,124.3 283.6,118.2 "/>
                        <polygon className="cls-9" points="31.8,73.4 40.3,114.2 34.9,118.2 42.9,124.3 36.8,129.1 44.8,136.4 39.8,140 51.3,153.5 103.6,138.2 140.6,106.9 44.4,35.5 "/>
                        <polygon className="cls-10" points="267.2,153.5 214.9,138.2 230.8,162.1 207.1,208.1 238.3,207.7 284.8,207.7 "/>
                        <polygon className="cls-10" points="103.6,138.2 51.3,153.5 33.9,207.7 80.3,207.7 111.4,208.1 87.8,162.1 "/>
                        <polygon className="cls-10" points="174.6,164.6 177.9,106.9 193,65.8 125.6,65.8 140.6,106.9 144.1,164.6 145.3,182.8 145.4,227.6 173.1,227.6 173.3,182.8 "/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">MetaMask</div>
                      <div className="text-xs text-muted-foreground">Most popular</div>
                    </div>
                  </div>
                  {isConnecting || isAnimating ? (
                    <Loader2 className="h-5 w-5 auth-loading-spinner" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>

                {/* Phantom Button */}
                <button
                  onClick={handleConnectPhantom}
                  disabled={isConnecting || isAnimating}
                  className="premium-wallet-button auth-button-stagger auth-button-hover"
                  data-testid="button-connect-phantom"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center">
                      <svg className="w-7 h-7" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="phantom-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#AB9FF2"/>
                            <stop offset="100%" stopColor="#AB9FF2"/>
                          </linearGradient>
                        </defs>
                        <rect width="40" height="40" rx="12" fill="url(#phantom-gradient)"/>
                        <path d="M22.5 12.5C22.5 11.1193 21.3807 10 20 10C18.6193 10 17.5 11.1193 17.5 12.5V17.5H12.5C11.1193 17.5 10 18.6193 10 20C10 21.3807 11.1193 22.5 12.5 22.5H17.5V27.5C17.5 28.8807 18.6193 30 20 30C21.3807 30 22.5 28.8807 22.5 27.5V22.5H27.5C28.8807 22.5 30 21.3807 30 20C30 18.6193 28.8807 17.5 27.5 17.5H22.5V12.5Z" fill="white"/>
                        <circle cx="20" cy="20" r="3" fill="#AB9FF2"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Phantom</div>
                      <div className="text-xs text-muted-foreground">Solana & Ethereum</div>
                    </div>
                  </div>
                  {isConnecting || isAnimating ? (
                    <Loader2 className="h-5 w-5 auth-loading-spinner" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>

                {/* WalletConnect Button */}
                <button
                  onClick={handleConnectOtherWallet}
                  disabled={isConnecting || isAnimating}
                  className="premium-wallet-button auth-button-stagger auth-button-hover"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center">
                      <svg className="w-7 h-7" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="wallet-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#4A90E2"/>
                            <stop offset="100%" stopColor="#357ABD"/>
                          </linearGradient>
                        </defs>
                        <rect width="40" height="40" rx="12" fill="url(#wallet-gradient)"/>
                        <path d="M20 8C13.373 8 8 13.373 8 20s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm0 18c-3.314 0-6-2.686-6-6s2.686-6 6-6 6 2.686 6 6-2.686 6-6 6z" fill="white"/>
                        <circle cx="20" cy="20" r="4" fill="#4A90E2"/>
                      </svg>
                    </div>
                    <div className="text-left">
                      <div className="font-medium">WalletConnect</div>
                      <div className="text-xs text-muted-foreground">250+ wallets</div>
                    </div>
                  </div>
                  {isConnecting || isAnimating ? (
                    <Loader2 className="h-5 w-5 auth-loading-spinner" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>
              </div>

              {/* Security Badge */}
              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Secure Connection</span>
              </div>

              {/* Help Link */}
              <div className="text-center">
                <a 
                  href="https://metamask.io/download/" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center space-x-1"
                >
                  <span>Don't have a wallet? Get MetaMask</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Features Showcase */}
          <div className="auth-features-enter">
            <div className="space-y-6">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-300 to-cyan-300 bg-clip-text text-transparent mb-2">
                  What You Can Do
                </h2>
                <p className="text-muted-foreground">
                  Unlock powerful Web3 features
                </p>
              </div>

              <div className="space-y-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="auth-glass-card rounded-2xl p-6 auth-feature-card hover:scale-105 transition-transform duration-300"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0`}>
                        <feature.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}