import { ethers } from "hardhat";

async function main() {
  console.log("🧪 Testing VSK Token Distribution System...");

  // Replace with your deployed contract address
  const VSK_TOKEN_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
  
  if (VSK_TOKEN_ADDRESS === "YOUR_DEPLOYED_CONTRACT_ADDRESS") {
    console.error("❌ Please update VSK_TOKEN_ADDRESS in this script with your deployed contract address");
    return;
  }

  const [deployer, adminWallet] = await ethers.getSigners();
  console.log("Testing with accounts:");
  console.log("  Deployer:", deployer.address);
  console.log("  Admin Wallet:", adminWallet.address);

  // Connect to the deployed contract
  const VasukiiToken = await ethers.getContractFactory("VasukiiToken");
  const vskToken = VasukiiToken.attach(VSK_TOKEN_ADDRESS);

  // Get contract info
  const name = await vskToken.name();
  const symbol = await vskToken.symbol();
  const totalSupply = await vskToken.totalSupply();
  const adminBalance = await vskToken.balanceOf(adminWallet.address);

  console.log("\n📊 Contract Info:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Total Supply:", ethers.formatEther(totalSupply), symbol);
  console.log("  Admin Balance:", ethers.formatEther(adminBalance), symbol);

  // Test users (replace with real user addresses)
  const testUsers = [
    "0x742d35Cc6634C0532925a3b8D7a8b4E5e8E5b6d7",
    "0x8ba1f109551bD432803012645Hac136c6a8e1c8c",
    "0x1234567890123456789012345678901234567890",
    "0x9876543210987654321098765432109876543210",
    "0x1111111111111111111111111111111111111111"
  ];

  const amountPerUser = ethers.parseEther("20"); // 20 VSK tokens
  const totalNeeded = amountPerUser * BigInt(testUsers.length);

  console.log("\n🎯 Distribution Test:");
  console.log("  Recipients:", testUsers.length);
  console.log("  Amount per user:", ethers.formatEther(amountPerUser), "VSK");
  console.log("  Total tokens needed:", ethers.formatEther(totalNeeded), "VSK");

  if (adminBalance < totalNeeded) {
    console.error("❌ Admin wallet doesn't have enough tokens for distribution");
    console.error("  Required:", ethers.formatEther(totalNeeded), "VSK");
    console.error("  Available:", ethers.formatEther(adminBalance), "VSK");
    return;
  }

  try {
    // Test batch transfer from admin wallet
    console.log("\n🔄 Executing batch transfer...");
    const amounts = testUsers.map(() => amountPerUser);
    
    // Connect as admin wallet
    const vskTokenAsAdmin = vskToken.connect(adminWallet);
    const tx = await vskTokenAsAdmin.batchTransfer(testUsers, amounts);
    console.log("  Transaction hash:", tx.hash);
    
    await tx.wait();
    console.log("✅ Batch transfer successful!");

    // Check balances after distribution
    console.log("\n💰 Balances after distribution:");
    let totalDistributed = BigInt(0);
    
    for (let i = 0; i < testUsers.length; i++) {
      const balance = await vskToken.balanceOf(testUsers[i]);
      console.log(`  ${testUsers[i]}: ${ethers.formatEther(balance)} VSK`);
      totalDistributed += balance;
    }

    const newAdminBalance = await vskToken.balanceOf(adminWallet.address);
    console.log(`  Admin (${adminWallet.address}): ${ethers.formatEther(newAdminBalance)} VSK`);
    
    console.log("\n📈 Distribution Summary:");
    console.log("  Total distributed:", ethers.formatEther(totalDistributed), "VSK");
    console.log("  Admin balance change:", ethers.formatEther(adminBalance - newAdminBalance), "VSK");

    // Test distributeToUsers function (alternative method)
    console.log("\n🔄 Testing distributeToUsers function...");
    
    // Reset balances for testing (transfer back to admin)
    for (const user of testUsers) {
      const balance = await vskToken.balanceOf(user);
      if (balance > 0) {
        const userContract = vskToken.connect(await ethers.getSigner(user));
        await userContract.transfer(adminWallet.address, balance);
      }
    }

    // Test distributeToUsers
    const tx2 = await vskTokenAsAdmin.distributeToUsers(testUsers, amountPerUser);
    await tx2.wait();
    console.log("✅ distributeToUsers successful!");

    // Verify final balances
    console.log("\n💰 Final balances after distributeToUsers:");
    for (let i = 0; i < testUsers.length; i++) {
      const balance = await vskToken.balanceOf(testUsers[i]);
      console.log(`  ${testUsers[i]}: ${ethers.formatEther(balance)} VSK`);
    }

    console.log("\n🎉 All distribution tests passed!");

  } catch (error) {
    console.error("❌ Distribution test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

