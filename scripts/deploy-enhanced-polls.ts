import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying Enhanced Prediction Poll Contract...");

  // Get the contract factory
  const PredictionPollEnhanced = await ethers.getContractFactory("PredictionPollEnhanced");
  
  // Deploy the contract
  console.log("📦 Deploying contract...");
  const predictionPoll = await PredictionPollEnhanced.deploy(
    "0x5CB7681Ce38c8bD8089DEd49E0B585596b423B1C" // VSK Token address
  );

  await predictionPoll.deployed();

  console.log("✅ Enhanced Prediction Poll Contract deployed to:", predictionPoll.address);
  console.log("🔗 Contract deployed by:", await predictionPoll.deployTransaction.from);
  console.log("⛽ Gas used:", predictionPoll.deployTransaction.gasLimit?.toString());

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  
  try {
    const pollCounter = await predictionPoll.pollCounter();
    console.log("📊 Initial poll counter:", pollCounter.toString());
    
    const maxCreatorFee = await predictionPoll.MAX_CREATOR_FEE_PERCENT();
    console.log("💰 Max creator fee percent:", maxCreatorFee.toString());
    
    const vskTokenAddress = await predictionPoll.vskToken();
    console.log("🪙 VSK Token address:", vskTokenAddress);
    
    console.log("✅ Contract deployment verified successfully!");
    
  } catch (error) {
    console.error("❌ Contract verification failed:", error);
  }

  // Save deployment info
  const deploymentInfo = {
    contractAddress: predictionPoll.address,
    deployer: await predictionPoll.deployTransaction.from,
    gasUsed: predictionPoll.deployTransaction.gasLimit?.toString(),
    timestamp: new Date().toISOString(),
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId
  };

  console.log("\n📄 Deployment Information:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Verify contract on block explorer");
  console.log("2. Update frontend with new contract address");
  console.log("3. Test creator-only reward claiming functionality");
  console.log("4. Run security tests");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
