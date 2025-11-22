import React from 'react';
import { useIndexedDB } from '../hooks/use-indexeddb';
import { AppLoader } from './ui/app-loader';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const { isReady, error } = useIndexedDB();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-red-500 mb-2">Database Error</h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <p className="text-xs text-muted-foreground">
            Please refresh the page or check your browser's IndexedDB support.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return <AppLoader message="Initializing database..." />;
  }

  return <>{children}</>;
}
