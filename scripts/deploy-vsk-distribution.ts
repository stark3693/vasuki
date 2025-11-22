import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying VSK Token with Distribution Features...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());

  // Deploy VasukiiToken
  const VasukiiToken = await ethers.getContractFactory("VasukiiToken");
  const vskToken = await VasukiiToken.deploy();
  await vskToken.waitForDeployment();

  const vskTokenAddress = await vskToken.getAddress();
  console.log("✅ VasukiiToken deployed to:", vskTokenAddress);

  // Get token info
  const name = await vskToken.name();
  const symbol = await vskToken.symbol();
  const decimals = await vskToken.decimals();
  const totalSupply = await vskToken.totalSupply();

  console.log("📊 Token Info:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Decimals:", decimals);
  console.log("  Total Supply:", ethers.formatEther(totalSupply), symbol);

  // Test distribution functionality
  console.log("\n🧪 Testing Distribution Features...");

  // Create some test addresses (these would be real user addresses in production)
  const testUsers = [
    "0x742d35Cc6634C0532925a3b8D7a8b4E5e8E5b6d7",
    "0x8ba1f109551bD432803012645Hac136c6a8e1c8c",
    "0x1234567890123456789012345678901234567890"
  ];

  const amountPerUser = ethers.parseEther("20"); // 20 VSK tokens

  console.log("📝 Test Distribution:");
  console.log("  Recipients:", testUsers.length);
  console.log("  Amount per user:", ethers.formatEther(amountPerUser), "VSK");
  console.log("  Total amount:", ethers.formatEther(amountPerUser * BigInt(testUsers.length)), "VSK");

  // Test batch transfer (simulating distribution from admin wallet)
  try {
    console.log("\n🔄 Testing batchTransfer...");
    const amounts = testUsers.map(() => amountPerUser);
    
    // Note: In real scenario, admin wallet would call this
    // For testing, we'll use the deployer account which has the initial supply
    const tx = await vskToken.batchTransfer(testUsers, amounts);
    await tx.wait();
    console.log("✅ Batch transfer successful!");
    
    // Check balances
    for (let i = 0; i < testUsers.length; i++) {
      const balance = await vskToken.balanceOf(testUsers[i]);
      console.log(`  ${testUsers[i]}: ${ethers.formatEther(balance)} VSK`);
    }
  } catch (error) {
    console.error("❌ Batch transfer failed:", error);
  }

  // Save deployment info
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId,
    vskTokenAddress,
    deployerAddress: deployer.address,
    adminWalletAddress: "0x9D1AF2fbcF4ae543ddc6Ce2B739F4d51906a9075",
    deploymentTime: new Date().toISOString(),
    tokenInfo: {
      name,
      symbol,
      decimals: Number(decimals),
      totalSupply: ethers.formatEther(totalSupply)
    }
  };

  console.log("\n📋 Deployment Summary:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n🎯 Next Steps:");
  console.log("1. Update .env file with VSK_TOKEN_ADDRESS:", vskTokenAddress);
  console.log("2. Transfer tokens from deployer to admin wallet:", deploymentInfo.adminWalletAddress);
  console.log("3. Use the admin dashboard to distribute tokens to users");
  console.log("4. Test the distribution functionality with real user addresses");

  return deploymentInfo;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

