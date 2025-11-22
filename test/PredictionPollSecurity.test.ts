import { expect } from "chai";
import { ethers } from "hardhat";
import { PredictionPollEnhanced, VasukiiToken } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("PredictionPollEnhanced - Creator Security Tests", function () {
  let predictionPoll: PredictionPollEnhanced;
  let vskToken: VasukiiToken;
  let owner: SignerWithAddress;
  let creator: SignerWithAddress;
  let voter1: SignerWithAddress;
  let voter2: SignerWithAddress;
  let voter3: SignerWithAddress;
  let attacker: SignerWithAddress;

  const POLL_TITLE = "Test Poll";
  const POLL_DESCRIPTION = "Test Description";
  const POLL_OPTIONS = ["Option A", "Option B", "Option C"];
  const CREATOR_FEE_PERCENT = 500; // 5%
  const STAKE_AMOUNT = ethers.utils.parseEther("100");
  const DEADLINE = Math.floor(Date.now() / 1000) + 86400; // 24 hours from now

  beforeEach(async function () {
    [owner, creator, voter1, voter2, voter3, attacker] = await ethers.getSigners();

    // Deploy VSK Token
    const VasukiiTokenFactory = await ethers.getContractFactory("VasukiiToken");
    vskToken = await VasukiiTokenFactory.deploy();
    await vskToken.deployed();

    // Deploy PredictionPoll Enhanced
    const PredictionPollFactory = await ethers.getContractFactory("PredictionPollEnhanced");
    predictionPoll = await PredictionPollFactory.deploy(vskToken.address);
    await predictionPoll.deployed();

    // Mint tokens to users
    await vskToken.mint(creator.address, ethers.utils.parseEther("10000"));
    await vskToken.mint(voter1.address, ethers.utils.parseEther("10000"));
    await vskToken.mint(voter2.address, ethers.utils.parseEther("10000"));
    await vskToken.mint(voter3.address, ethers.utils.parseEther("10000"));
    await vskToken.mint(attacker.address, ethers.utils.parseEther("10000"));

    // Approve token spending
    await vskToken.connect(creator).approve(predictionPoll.address, ethers.utils.parseEther("10000"));
    await vskToken.connect(voter1).approve(predictionPoll.address, ethers.utils.parseEther("10000"));
    await vskToken.connect(voter2).approve(predictionPoll.address, ethers.utils.parseEther("10000"));
    await vskToken.connect(voter3).approve(predictionPoll.address, ethers.utils.parseEther("10000"));
    await vskToken.connect(attacker).approve(predictionPoll.address, ethers.utils.parseEther("10000"));

    // Stake tokens for voting
    await predictionPoll.connect(creator).stakeTokens(STAKE_AMOUNT);
    await predictionPoll.connect(voter1).stakeTokens(STAKE_AMOUNT);
    await predictionPoll.connect(voter2).stakeTokens(STAKE_AMOUNT);
    await predictionPoll.connect(voter3).stakeTokens(STAKE_AMOUNT);
    await predictionPoll.connect(attacker).stakeTokens(STAKE_AMOUNT);
  });

  describe("Creator-Only Access Control", function () {
    it("Should allow only poll creator to resolve poll", async function () {
      // Create poll
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Creator should be able to resolve
      await expect(predictionPoll.connect(creator).resolvePoll(0, 0))
        .to.emit(predictionPoll, "PollResolved");

      // Non-creator should not be able to resolve
      await expect(predictionPoll.connect(voter1).resolvePoll(0, 1))
        .to.be.revertedWith("Only poll creator can perform this action");
    });

    it("Should allow only poll creator to claim stacks", async function () {
      // Create and setup poll
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      // Vote with stakes
      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("50"));
      await predictionPoll.connect(voter2).vote(0, 0, ethers.utils.parseEther("30"));
      await predictionPoll.connect(voter3).vote(0, 1, ethers.utils.parseEther("20"));

      // Resolve poll
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Wait for claim period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      // Creator should be able to claim stacks
      await expect(predictionPoll.connect(creator).claimStacks(0))
        .to.emit(predictionPoll, "CreatorStacksClaimed");

      // Non-creator should not be able to claim stacks
      await expect(predictionPoll.connect(voter1).claimStacks(0))
        .to.be.revertedWith("Only poll creator can perform this action");

      await expect(predictionPoll.connect(attacker).claimStacks(0))
        .to.be.revertedWith("Only poll creator can perform this action");
    });

    it("Should prevent creator from claiming stacks multiple times", async function () {
      // Create and setup poll
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      // Vote with stakes
      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("100"));

      // Resolve poll
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Wait for claim period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      // First claim should succeed
      await predictionPoll.connect(creator).claimStacks(0);

      // Second claim should fail
      await expect(predictionPoll.connect(creator).claimStacks(0))
        .to.be.revertedWith("Creator has already claimed their fee");
    });
  });

  describe("Reward Distribution Security", function () {
    it("Should distribute rewards correctly between creator and voters", async function () {
      // Create poll with 5% creator fee
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        500 // 5%
      );

      // Vote with stakes
      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("60"));
      await predictionPoll.connect(voter2).vote(0, 0, ethers.utils.parseEther("40"));
      await predictionPoll.connect(voter3).vote(0, 1, ethers.utils.parseEther("50"));

      const totalStaked = ethers.utils.parseEther("150");
      const expectedCreatorFee = totalStaked.mul(500).div(10000); // 5%
      const remainingForVoters = totalStaked.sub(expectedCreatorFee);

      // Resolve poll
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Wait for claim period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      // Check balances before claiming
      const creatorBalanceBefore = await vskToken.balanceOf(creator.address);
      const voter1BalanceBefore = await vskToken.balanceOf(voter1.address);
      const voter2BalanceBefore = await vskToken.balanceOf(voter2.address);

      // Creator claims stacks
      await predictionPoll.connect(creator).claimStacks(0);
      const creatorBalanceAfter = await vskToken.balanceOf(creator.address);
      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.equal(expectedCreatorFee);

      // Voters claim rewards
      await predictionPoll.connect(voter1).claimReward(0);
      await predictionPoll.connect(voter2).claimReward(0);

      // Check voter balances
      const voter1BalanceAfter = await vskToken.balanceOf(voter1.address);
      const voter2BalanceAfter = await vskToken.balanceOf(voter2.address);

      // Voter1 should get 60% of remaining rewards
      const voter1ExpectedReward = remainingForVoters.mul(60).div(100);
      expect(voter1BalanceAfter.sub(voter1BalanceBefore)).to.equal(voter1ExpectedReward);

      // Voter2 should get 40% of remaining rewards
      const voter2ExpectedReward = remainingForVoters.mul(40).div(100);
      expect(voter2BalanceAfter.sub(voter2BalanceBefore)).to.equal(voter2ExpectedReward);
    });

    it("Should prevent voters from claiming rewards for wrong option", async function () {
      // Create and setup poll
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      // Vote with stakes
      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("50"));
      await predictionPoll.connect(voter2).vote(0, 1, ethers.utils.parseEther("50"));

      // Resolve poll with option 0 as correct
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Wait for claim period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      // Voter1 (correct option) should be able to claim
      await expect(predictionPoll.connect(voter1).claimReward(0))
        .to.emit(predictionPoll, "RewardClaimed");

      // Voter2 (wrong option) should not be able to claim
      await expect(predictionPoll.connect(voter2).claimReward(0))
        .to.be.revertedWith("Can only claim rewards for correct vote");
    });
  });

  describe("Timing Security", function () {
    it("Should enforce resolution grace period", async function () {
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      // Try to resolve before deadline
      await expect(predictionPoll.connect(creator).resolvePoll(0, 0))
        .to.be.revertedWith("Poll is still active");

      // Fast forward past deadline
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);

      // Should be able to resolve now
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Fast forward past grace period (7 days)
      await ethers.provider.send("evm_increaseTime", [7 * 86400]);
      await ethers.provider.send("evm_mine", []);

      // Should not be able to resolve after grace period
      await expect(predictionPoll.connect(creator).resolvePoll(0, 1))
        .to.be.revertedWith("Poll already resolved");
    });

    it("Should enforce claim waiting period for creator", async function () {
      // Create and setup poll
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("100"));

      // Resolve poll
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Try to claim immediately (should fail)
      await expect(predictionPoll.connect(creator).claimStacks(0))
        .to.be.revertedWith("Must wait 1 hour after resolution");

      // Wait 1 hour
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      // Should be able to claim now
      await expect(predictionPoll.connect(creator).claimStacks(0))
        .to.emit(predictionPoll, "CreatorStacksClaimed");
    });
  });

  describe("Edge Cases and Security", function () {
    it("Should handle zero creator fee correctly", async function () {
      // Create poll with 0% creator fee
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        0 // 0% fee
      );

      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("100"));

      // Resolve poll
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Wait for claim period
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);

      // Creator should not be able to claim with 0% fee
      await expect(predictionPoll.connect(creator).claimStacks(0))
        .to.be.revertedWith("No creator fee set for this poll");
    });

    it("Should prevent creator from voting on their own poll", async function () {
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      // Creator should not be able to vote on their own poll
      await expect(predictionPoll.connect(creator).vote(0, 0, ethers.utils.parseEther("50")))
        .to.be.revertedWith("Creator cannot vote on their own poll");
    });

    it("Should prevent creator from using claimReward instead of claimStacks", async function () {
      // Create and setup poll
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("100"));

      // Resolve poll
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Creator should not be able to use claimReward function
      await expect(predictionPoll.connect(creator).claimReward(0))
        .to.be.revertedWith("Creator must use claimStacks() function");
    });

    it("Should validate creator fee limits", async function () {
      // Should not allow creator fee > 10%
      await expect(
        predictionPoll.connect(creator).createPoll(
          POLL_TITLE,
          POLL_DESCRIPTION,
          POLL_OPTIONS,
          DEADLINE,
          true,
          1001 // 10.01%
        )
      ).to.be.revertedWith("Creator fee cannot exceed 10%");

      // Should allow exactly 10%
      await expect(
        predictionPoll.connect(creator).createPoll(
          POLL_TITLE,
          POLL_DESCRIPTION,
          POLL_OPTIONS,
          DEADLINE,
          true,
          1000 // 10%
        )
      ).to.emit(predictionPoll, "PollCreated");
    });
  });

  describe("Multi-Wallet Compatibility", function () {
    it("Should work with different wallet addresses", async function () {
      // Create poll with creator
      await predictionPoll.connect(creator).createPoll(
        POLL_TITLE,
        POLL_DESCRIPTION,
        POLL_OPTIONS,
        DEADLINE,
        true,
        CREATOR_FEE_PERCENT
      );

      // Different users vote
      await predictionPoll.connect(voter1).vote(0, 0, ethers.utils.parseEther("30"));
      await predictionPoll.connect(voter2).vote(0, 0, ethers.utils.parseEther("40"));
      await predictionPoll.connect(voter3).vote(0, 1, ethers.utils.parseEther("30"));

      // Resolve with creator
      await ethers.provider.send("evm_increaseTime", [86400]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).resolvePoll(0, 0);

      // Wait and claim with creator
      await ethers.provider.send("evm_increaseTime", [3600]);
      await ethers.provider.send("evm_mine", []);
      await predictionPoll.connect(creator).claimStacks(0);

      // Voters claim rewards
      await predictionPoll.connect(voter1).claimReward(0);
      await predictionPoll.connect(voter2).claimReward(0);

      // Verify all transactions succeeded
      expect(await predictionPoll.isPollCreator(0, creator.address)).to.be.true;
      expect(await predictionPoll.hasUserVoted(0, voter1.address)).to.be.true;
      expect(await predictionPoll.hasUserVoted(0, voter2.address)).to.be.true;
      expect(await predictionPoll.hasUserVoted(0, voter3.address)).to.be.true;
    });
  });
});
