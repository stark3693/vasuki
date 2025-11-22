import React from 'react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

interface ResponsivePollLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsivePollLayout({ children, className = '' }: ResponsivePollLayoutProps) {
  return (
    <div className={`w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6 ${className}`}>
      {/* Responsive Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          {children}
        </div>
        
        {/* Sidebar for larger screens */}
        <div className="lg:col-span-1 space-y-4 lg:space-y-6">
          {/* Responsive Info Card */}
          <Card className="hidden lg:block">
            <CardContent className="p-4">
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Live Poll Market</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Real-time blockchain updates</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Instant vote synchronization</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span>Live staking rewards</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Mobile-first responsive info */}
          <Card className="lg:hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">Live Updates</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Responsive Poll Grid Component
interface ResponsivePollGridProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsivePollGrid({ children, className = '' }: ResponsivePollGridProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6 ${className}`}>
      {children}
    </div>
  );
}

// Responsive Poll Card Wrapper
interface ResponsivePollCardWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsivePollCardWrapper({ children, className = '' }: ResponsivePollCardWrapperProps) {
  return (
    <div className={`w-full ${className}`}>
      {children}
    </div>
  );
}

// Mobile-First Action Bar
interface ResponsiveActionBarProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveActionBar({ children, className = '' }: ResponsiveActionBarProps) {
  return (
    <div className={`sticky bottom-4 z-50 lg:static lg:z-auto ${className}`}>
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-4 shadow-lg lg:shadow-none lg:border-0 lg:bg-transparent lg:p-0">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {children}
        </div>
      </div>
    </div>
  );
}

// Responsive Status Indicator
interface ResponsiveStatusIndicatorProps {
  status: 'live' | 'active' | 'closed' | 'resolved';
  className?: string;
}

export function ResponsiveStatusIndicator({ status, className = '' }: ResponsiveStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'live':
        return {
          color: 'bg-green-500',
          text: 'Live',
          icon: 'animate-pulse'
        };
      case 'active':
        return {
          color: 'bg-blue-500',
          text: 'Active',
          icon: ''
        };
      case 'closed':
        return {
          color: 'bg-gray-500',
          text: 'Closed',
          icon: ''
        };
      case 'resolved':
        return {
          color: 'bg-purple-500',
          text: 'Resolved',
          icon: ''
        };
      default:
        return {
          color: 'bg-gray-500',
          text: 'Unknown',
          icon: ''
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color} ${config.icon}`}></div>
      <span className="text-xs sm:text-sm font-medium">{config.text}</span>
    </div>
  );
}

// Responsive Breakpoint Indicator (for development)
export function ResponsiveBreakpointIndicator() {
  return (
    <div className="fixed top-4 right-4 z-50 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
      <span className="block sm:hidden">XS</span>
      <span className="hidden sm:block md:hidden">SM</span>
      <span className="hidden md:block lg:hidden">MD</span>
      <span className="hidden lg:block xl:hidden">LG</span>
      <span className="hidden xl:block 2xl:hidden">XL</span>
      <span className="hidden 2xl:block">2XL</span>
    </div>
  );
}
