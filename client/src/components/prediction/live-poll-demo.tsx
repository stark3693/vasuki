import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Play, Pause, RotateCcw, Zap, Users, TrendingUp } from 'lucide-react';
import { livePollService } from '../../lib/live-poll-service';

export function LivePollDemo() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationCount, setSimulationCount] = useState(0);
  const [lastEvent, setLastEvent] = useState<string>('');

  useEffect(() => {
    const handlePollUpdate = (update: any) => {
      setLastEvent(`${update.type} - Poll ${update.pollId} - ${new Date().toLocaleTimeString()}`);
    };

    livePollService.onUpdate(handlePollUpdate);

    return () => {
      livePollService.offUpdate(handlePollUpdate);
    };
  }, []);

  const startSimulation = () => {
    if (isSimulating) return;
    
    setIsSimulating(true);
    setSimulationCount(0);
    
    // Simulate realistic poll activity
    const simulateVote = () => {
      if (!isSimulating) return;
      
      const pollId = Math.floor(Math.random() * 5) + 1; // Random poll ID 1-5
      const option = Math.floor(Math.random() * 3); // Random option 0-2
      const stakeAmount = (Math.random() * 100).toFixed(2); // Random stake 0-100
      
      livePollService.simulateVote(pollId, option, stakeAmount);
      setSimulationCount(prev => prev + 1);
      
      // Schedule next vote
      const delay = Math.random() * 3000 + 1000; // 1-4 seconds
      setTimeout(simulateVote, delay);
    };
    
    // Start simulation
    simulateVote();
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  const resetDemo = () => {
    setIsSimulating(false);
    setSimulationCount(0);
    setLastEvent('');
  };

  const simulatePollCreation = () => {
    const pollId = Math.floor(Math.random() * 1000) + 100;
    const titles = [
      'Will Bitcoin reach $100k this year?',
      'Ethereum 2.0 upgrade success?',
      'DeFi TVL to surpass $200B?',
      'NFT market recovery in Q2?',
      'Layer 2 adoption milestone?'
    ];
    const title = titles[Math.floor(Math.random() * titles.length)];
    
    livePollService.simulatePollCreation(pollId, title);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
          Live Poll Demo
        </CardTitle>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          Simulate real-time blockchain poll activity
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
        {/* Status Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-blue-600 mb-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              Votes Simulated
            </div>
            <div className="text-xl sm:text-2xl font-bold text-blue-700">
              {simulationCount}
            </div>
          </div>
          
          <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-xs sm:text-sm text-green-600 mb-2">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
              Status
            </div>
            <div className="text-sm sm:text-lg font-bold text-green-700">
              {isSimulating ? (
                <Badge className="bg-green-500 text-white animate-pulse text-xs">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full mr-1 animate-ping"></div>
                  LIVE
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Stopped</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Last Event */}
        {lastEvent && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-xs text-muted-foreground mb-2">Last Event:</div>
            <div className="text-xs sm:text-sm font-mono break-words leading-relaxed">{lastEvent}</div>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={isSimulating ? stopSimulation : startSimulation}
              className={`flex-1 h-10 sm:h-11 ${isSimulating ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-sm sm:text-base font-medium`}
            >
              {isSimulating ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
            
            <Button
              onClick={resetDemo}
              variant="outline"
              size="icon"
              className="h-10 sm:h-11 w-10 sm:w-11"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            onClick={simulatePollCreation}
            variant="outline"
            className="w-full h-10 sm:h-11 text-sm sm:text-base font-medium"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create Test Poll
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-xs text-muted-foreground space-y-2 p-3 bg-muted/30 rounded-lg">
          <div><strong>Start:</strong> Begin simulating random votes</div>
          <div><strong>Stop:</strong> Pause simulation</div>
          <div><strong>Reset:</strong> Clear counters and events</div>
          <div><strong>Create Poll:</strong> Simulate new poll creation</div>
        </div>

        {/* Real-time Notice */}
        <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <div className="animate-pulse w-2 h-2 bg-green-500 rounded-full flex-shrink-0 mt-1"></div>
            <span className="text-xs sm:text-sm text-green-700 dark:text-green-300 leading-relaxed">
              <strong>🚀 Live Updates:</strong> All poll cards will update in real-time when simulation is active.
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
