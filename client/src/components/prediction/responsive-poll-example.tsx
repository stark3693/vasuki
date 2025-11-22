import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  ResponsivePollLayout, 
  ResponsivePollGrid, 
  ResponsivePollCardWrapper,
  ResponsiveActionBar,
  ResponsiveStatusIndicator 
} from './responsive-poll-layout';
import { LivePollDemo } from './live-poll-demo';

// Example usage of responsive poll components
export function ResponsivePollExample() {
  return (
    <ResponsivePollLayout>
      {/* Main poll content */}
      <div className="space-y-6">
        {/* Page Header */}
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
            Live Poll Market
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Real-time blockchain prediction polls with instant updates
          </p>
        </div>

        {/* Demo Component */}
        <LivePollDemo />

        {/* Poll Grid */}
        <ResponsivePollGrid>
          {/* Example Poll Card 1 */}
          <ResponsivePollCardWrapper>
            <Card className="poll-card">
              <CardHeader className="poll-card-header">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="poll-card-title">
                      Will Bitcoin reach $100k this year?
                    </CardTitle>
                    <p className="poll-card-description mt-2">
                      Predict the future price of Bitcoin with real-time blockchain voting
                    </p>
                  </div>
                  <div className="poll-badge-container">
                    <Badge variant="outline" className="poll-badge border-green-500 text-green-700">
                      Active
                    </Badge>
                    <Badge variant="outline" className="poll-badge border-yellow-500 text-yellow-700">
                      Staking
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="poll-card-content">
                {/* Vote Options */}
                <div className="poll-vote-options">
                  <div className="poll-vote-option">
                    <div className="poll-vote-option-radio">
                      <input type="radio" name="poll1" className="w-4 h-4" />
                    </div>
                    <div className="poll-vote-option-label">
                      Yes, Bitcoin will reach $100k
                    </div>
                  </div>
                  <div className="poll-vote-option">
                    <div className="poll-vote-option-radio">
                      <input type="radio" name="poll1" className="w-4 h-4" />
                    </div>
                    <div className="poll-vote-option-label">
                      No, Bitcoin will stay below $100k
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="poll-progress bg-gray-200 rounded-full h-2">
                    <div className="poll-progress bg-blue-500 h-2 rounded-full" style={{ width: '65%' }}></div>
                  </div>
                  <div className="poll-progress-text">65% voted Yes</div>
                </div>

                {/* Stats */}
                <div className="poll-stats">
                  <div className="poll-stat-item">
                    <div className="poll-stat-label">
                      Total Votes
                    </div>
                    <div className="poll-stat-value">1,234</div>
                  </div>
                  <div className="poll-stat-item">
                    <div className="poll-stat-label">
                      Total Staked
                    </div>
                    <div className="poll-stat-value">5,678 VSK</div>
                  </div>
                </div>

                {/* Actions */}
                <ResponsiveActionBar>
                  <Button className="poll-action-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Vote Now
                  </Button>
                  <Button variant="outline" className="poll-action-button">
                    View Results
                  </Button>
                </ResponsiveActionBar>
              </CardContent>
            </Card>
          </ResponsivePollCardWrapper>

          {/* Example Poll Card 2 */}
          <ResponsivePollCardWrapper>
            <Card className="poll-card">
              <CardHeader className="poll-card-header">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="poll-card-title">
                      Ethereum 2.0 Upgrade Success?
                    </CardTitle>
                    <p className="poll-card-description mt-2">
                      Will the Ethereum network successfully complete its major upgrade?
                    </p>
                  </div>
                  <div className="poll-badge-container">
                    <ResponsiveStatusIndicator status="active" />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="poll-card-content">
                {/* Simplified content for mobile */}
                <div className="space-y-3">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold mb-1">892</div>
                    <div className="text-sm text-muted-foreground">Total Votes</div>
                  </div>
                  
                  <ResponsiveActionBar>
                    <Button className="poll-action-button w-full">
                      Participate
                    </Button>
                  </ResponsiveActionBar>
                </div>
              </CardContent>
            </Card>
          </ResponsivePollCardWrapper>

          {/* Example Poll Card 3 - Mobile Optimized */}
          <ResponsivePollCardWrapper>
            <Card className="poll-card">
              <CardHeader className="poll-mobile-padding">
                <CardTitle className="poll-mobile-text font-semibold">
                  DeFi TVL Growth
                </CardTitle>
                <p className="poll-mobile-text text-muted-foreground mt-1">
                  Will DeFi TVL surpass $200B?
                </p>
              </CardHeader>

              <CardContent className="poll-mobile-padding pt-0">
                <div className="poll-mobile-spacing">
                  <div className="flex justify-between items-center">
                    <span className="poll-mobile-text">Progress</span>
                    <span className="poll-mobile-text font-medium">42%</span>
                  </div>
                  <div className="poll-progress bg-gray-200 rounded-full h-2">
                    <div className="poll-progress bg-green-500 h-2 rounded-full" style={{ width: '42%' }}></div>
                  </div>
                  
                  <ResponsiveActionBar>
                    <Button className="poll-action-button w-full">
                      Vote
                    </Button>
                  </ResponsiveActionBar>
                </div>
              </CardContent>
            </Card>
          </ResponsivePollCardWrapper>
        </ResponsivePollGrid>

        {/* Mobile-first action bar */}
        <ResponsiveActionBar className="lg:hidden">
          <Button className="poll-action-button">
            Create Poll
          </Button>
          <Button variant="outline" className="poll-action-button">
            View All
          </Button>
        </ResponsiveActionBar>
      </div>
    </ResponsivePollLayout>
  );
}

// Export the responsive components for use in other files
export {
  ResponsivePollLayout,
  ResponsivePollGrid,
  ResponsivePollCardWrapper,
  ResponsiveActionBar,
  ResponsiveStatusIndicator
};
