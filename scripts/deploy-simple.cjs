const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Vasukii Prediction Poll System...");

  // Get the contract factories
  const VasukiiToken = await ethers.getContractFactory("VasukiiToken");
  const PredictionPoll = await ethers.getContractFactory("PredictionPoll");

  // Deploy VasukiiToken
  console.log("Deploying VasukiiToken...");
  const vskToken = await VasukiiToken.deploy();
  await vskToken.waitForDeployment();
  const vskTokenAddress = await vskToken.getAddress();
  console.log("VasukiiToken deployed to:", vskTokenAddress);

  // Deploy PredictionPoll
  console.log("Deploying PredictionPoll...");
  const predictionPoll = await PredictionPoll.deploy(vskTokenAddress);
  await predictionPoll.waitForDeployment();
  const predictionPollAddress = await predictionPoll.getAddress();
  console.log("PredictionPoll deployed to:", predictionPollAddress);

  // Transfer ownership of token to prediction contract for staking management
  console.log("Transferring token ownership to prediction contract...");
  await vskToken.transferOwnership(predictionPollAddress);
  console.log("Token ownership transferred");

  console.log("\n=== Deployment Summary ===");
  console.log("VasukiiToken:", vskTokenAddress);
  console.log("PredictionPoll:", predictionPollAddress);
  console.log("Network:", (await ethers.provider.getNetwork()).name);
  console.log("Chain ID:", (await ethers.provider.getNetwork()).chainId);

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    contracts: {
      VasukiiToken: vskTokenAddress,
      PredictionPoll: predictionPollAddress
    },
    timestamp: new Date().toISOString()
  };

  console.log("\nDeployment info:", JSON.stringify(deploymentInfo, null, 2));
  
  console.log("\n=== Environment Variables to Set ===");
  console.log(`VITE_VSK_TOKEN_ADDRESS=${vskTokenAddress}`);
  console.log(`VITE_PREDICTION_POLL_ADDRESS=${predictionPollAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });