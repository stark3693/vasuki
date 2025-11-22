import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Vasukii Prediction Poll System with existing token...");

  // Your existing token address
  const EXISTING_TOKEN_ADDRESS = "0x5CB7681Ce38c8bD8089DEd49E0B585596b423B1C";

  // Get the contract factory
  const PredictionPoll = await ethers.getContractFactory("PredictionPoll");

  // Deploy PredictionPoll with your existing token
  console.log("Deploying PredictionPoll with existing token...");
  console.log("Token address:", EXISTING_TOKEN_ADDRESS);
  
  const predictionPoll = await PredictionPoll.deploy(EXISTING_TOKEN_ADDRESS);
  await predictionPoll.waitForDeployment();
  const predictionPollAddress = await predictionPoll.getAddress();
  console.log("PredictionPoll deployed to:", predictionPollAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("Existing Token:", EXISTING_TOKEN_ADDRESS);
  console.log("PredictionPoll:", predictionPollAddress);
  console.log("Network:", await ethers.provider.getNetwork().then(n => n.name));
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      ExistingToken: EXISTING_TOKEN_ADDRESS,
      PredictionPoll: predictionPollAddress
    },
    timestamp: new Date().toISOString()
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n=== Next Steps ===");
  console.log("1. Update your .env file with the PredictionPoll address");
  console.log("2. Get a WalletConnect Project ID from https://cloud.walletconnect.com/");
  console.log("3. Add VITE_WALLET_CONNECT_PROJECT_ID to your .env file");
  console.log("4. Restart your development server");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
