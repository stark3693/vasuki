import React from 'react';
import { Card, CardContent } from './card';

interface AppLoaderProps {
  message?: string;
}

export function AppLoader({ message = "Loading Vasukii..." }: AppLoaderProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-4 border-primary/20 rounded-full animate-spin"></div>
              <div className="absolute top-0 left-0 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold">Vasukii</h2>
              <p className="text-sm text-muted-foreground">{message}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
