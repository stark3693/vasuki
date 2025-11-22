import { expect } from "chai";
import { ethers } from "hardhat";
import { VasukiiToken, PredictionPoll } from "../typechain-types";

describe("PredictionPoll System", function () {
  let vskToken: VasukiiToken;
  let predictionPoll: PredictionPoll;
  let owner: any;
  let user1: any;
  let user2: any;
  let user3: any;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy VasukiiToken
    const VasukiiToken = await ethers.getContractFactory("VasukiiToken");
    vskToken = await VasukiiToken.deploy();
    await vskToken.waitForDeployment();

    // Deploy PredictionPoll
    const PredictionPoll = await ethers.getContractFactory("PredictionPoll");
    predictionPoll = await PredictionPoll.deploy(await vskToken.getAddress());
    await predictionPoll.waitForDeployment();

    // Transfer ownership of token to prediction contract
    await vskToken.transferOwnership(await predictionPoll.getAddress());

    // Mint tokens to users
    await vskToken.mint(user1.address, ethers.parseEther("1000"));
    await vskToken.mint(user2.address, ethers.parseEther("1000"));
    await vskToken.mint(user3.address, ethers.parseEther("1000"));

    // Users stake some tokens
    await vskToken.connect(user1).stake(ethers.parseEther("100"));
    await vskToken.connect(user2).stake(ethers.parseEther("100"));
    await vskToken.connect(user3).stake(ethers.parseEther("100"));
  });

  describe("Token Deployment", function () {
    it("Should deploy with correct initial supply", async function () {
      const totalSupply = await vskToken.totalSupply();
      expect(totalSupply).to.equal(ethers.parseEther("1000000"));
    });

    it("Should allow staking", async function () {
      const stakedBalance = await vskToken.getStakedBalance(user1.address);
      expect(stakedBalance).to.equal(ethers.parseEther("100"));
    });
  });

  describe("Poll Creation", function () {
    it("Should create a poll successfully", async function () {
      const options = ["Option 1", "Option 2", "Option 3"];
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      await expect(
        predictionPoll.connect(user1).createPoll(
          "Test Poll",
          "This is a test poll",
          options,
          deadline,
          true
        )
      ).to.emit(predictionPoll, "PollCreated");
    });

    it("Should reject poll with invalid parameters", async function () {
      const options = ["Only one option"];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await expect(
        predictionPoll.connect(user1).createPoll(
          "",
          "Test poll",
          options,
          deadline,
          true
        )
      ).to.be.revertedWith("Title cannot be empty");

      await expect(
        predictionPoll.connect(user1).createPoll(
          "Test Poll",
          "Test poll",
          options,
          deadline,
          true
        )
      ).to.be.revertedWith("Must have at least 2 options");
    });
  });

  describe("Voting", function () {
    let pollId: number;

    beforeEach(async function () {
      const options = ["Option 1", "Option 2", "Option 3"];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await predictionPoll.connect(user1).createPoll(
        "Test Poll",
        "This is a test poll",
        options,
        deadline,
        true
      );

      pollId = 0;
    });

    it("Should allow voting with staking", async function () {
      await vskToken.connect(user1).approve(await predictionPoll.getAddress(), ethers.parseEther("50"));
      
      await expect(
        predictionPoll.connect(user1).vote(pollId, 0, ethers.parseEther("50"))
      ).to.emit(predictionPoll, "VoteCast");
    });

    it("Should prevent double voting", async function () {
      await vskToken.connect(user1).approve(await predictionPoll.getAddress(), ethers.parseEther("50"));
      await predictionPoll.connect(user1).vote(pollId, 0, ethers.parseEther("50"));

      await expect(
        predictionPoll.connect(user1).vote(pollId, 1, ethers.parseEther("25"))
      ).to.be.revertedWith("Already voted");
    });

    it("Should reject voting after deadline", async function () {
      // Fast forward time
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        predictionPoll.connect(user1).vote(pollId, 0, ethers.parseEther("50"))
      ).to.be.revertedWith("Poll deadline passed");
    });
  });

  describe("Poll Resolution and Rewards", function () {
    let pollId: number;

    beforeEach(async function () {
      const options = ["Option 1", "Option 2", "Option 3"];
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      await predictionPoll.connect(user1).createPoll(
        "Test Poll",
        "This is a test poll",
        options,
        deadline,
        true
      );

      pollId = 0;

      // Users vote
      await vskToken.connect(user1).approve(await predictionPoll.getAddress(), ethers.parseEther("50"));
      await vskToken.connect(user2).approve(await predictionPoll.getAddress(), ethers.parseEther("30"));
      await vskToken.connect(user3).approve(await predictionPoll.getAddress(), ethers.parseEther("20"));

      await predictionPoll.connect(user1).vote(pollId, 0, ethers.parseEther("50"));
      await predictionPoll.connect(user2).vote(pollId, 0, ethers.parseEther("30"));
      await predictionPoll.connect(user3).vote(pollId, 1, ethers.parseEther("20"));

      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [3601]);
      await ethers.provider.send("evm_mine", []);
    });

    it("Should resolve poll and distribute rewards", async function () {
      // Resolve poll with option 0 as correct
      await predictionPoll.connect(user1).resolvePoll(pollId, 0);

      // Check that users can claim rewards
      const initialBalance1 = await vskToken.balanceOf(user1.address);
      const initialBalance2 = await vskToken.balanceOf(user2.address);

      await predictionPoll.connect(user1).claimReward(pollId);
      await predictionPoll.connect(user2).claimReward(pollId);

      const finalBalance1 = await vskToken.balanceOf(user1.address);
      const finalBalance2 = await vskToken.balanceOf(user2.address);

      expect(finalBalance1).to.be.gt(initialBalance1);
      expect(finalBalance2).to.be.gt(initialBalance2);
    });

    it("Should not allow claiming rewards for wrong votes", async function () {
      await predictionPoll.connect(user1).resolvePoll(pollId, 0);

      await expect(
        predictionPoll.connect(user3).claimReward(pollId)
      ).to.be.revertedWith("Voted for wrong option");
    });
  });
});
