import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Settings, ExternalLink, Copy } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

export function Web3NotConfigured() {
  const { toast } = useToast();

  const copyEnvTemplate = () => {
    const envTemplate = `# Web3 Configuration for Vasukii Prediction Polls
VITE_WALLET_CONNECT_PROJECT_ID=your_project_id_here
VITE_VSK_TOKEN_ADDRESS=
VITE_PREDICTION_POLL_ADDRESS=

# Get your WalletConnect Project ID from: https://cloud.walletconnect.com/
# Update contract addresses after deployment`;

    navigator.clipboard.writeText(envTemplate);
    toast({
      title: 'Environment Template Copied',
      description: 'Paste this into your .env file and update the values.',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Web3 Configuration Required
          </CardTitle>
          <CardDescription>
            To use the prediction polls feature, you need to configure Web3 settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              The prediction polls system requires Web3 configuration to connect to smart contracts and enable wallet functionality.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Setup Steps:</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Get a WalletConnect Project ID from <a href="https://cloud.walletconnect.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">cloud.walletconnect.com</a></li>
                <li>Deploy the smart contracts using <code className="bg-muted px-1 rounded">npx hardhat run scripts/deploy.ts</code></li>
                <li>Create a <code className="bg-muted px-1 rounded">.env</code> file in the project root</li>
                <li>Add the configuration values to your environment file</li>
                <li>Restart the development server</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={copyEnvTemplate} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy Environment Template
              </Button>
              <Button asChild variant="outline">
                <a href="https://cloud.walletconnect.com/" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Get Project ID
                </a>
              </Button>
            </div>

            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Example .env file:</h4>
              <pre className="text-xs text-muted-foreground overflow-x-auto">
{`VITE_WALLET_CONNECT_PROJECT_ID=your_actual_project_id
VITE_VSK_TOKEN_ADDRESS=0x1234...5678
VITE_PREDICTION_POLL_ADDRESS=0x8765...4321`}
              </pre>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Once configured, you'll be able to create and vote on prediction polls with VSK token staking!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
