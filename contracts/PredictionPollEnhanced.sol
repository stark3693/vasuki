// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PredictionPollEnhanced
 * @dev Enhanced smart contract for secure creator-only reward claiming
 * @notice Implements comprehensive access control and security measures
 */
contract PredictionPollEnhanced is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable vskToken;
    
    // Staking tracking for users
    mapping(address => uint256) public userStakedBalance;
    uint256 public totalStakedTokens;
    
    // Poll structure with enhanced security
    struct Poll {
        uint256 id;
        address creator;
        string title;
        string description;
        string[] options;
        uint256 deadline;
        uint256 correctOption;
        bool isResolved;
        bool isStakingEnabled;
        uint256 totalStaked;
        uint256 creatorFeePercent; // Percentage of total staked tokens that creator gets (e.g., 500 = 5%)
        bool creatorHasClaimed; // Track if creator has claimed their fee
        uint256 resolutionTimestamp; // Track when poll was resolved
        mapping(uint256 => uint256) optionVotes;
        mapping(uint256 => uint256) optionStaked;
        mapping(address => bool) hasVoted;
        mapping(address => uint256) userVote;
        mapping(address => uint256) userStake;
        mapping(address => bool) hasClaimedReward;
    }
    
    // State variables
    uint256 public pollCounter;
    mapping(uint256 => Poll) public polls;
    mapping(address => uint256[]) public userPolls;
    mapping(address => uint256[]) public userVotes;
    
    // Security settings
    uint256 public constant MAX_CREATOR_FEE_PERCENT = 1000; // 10% maximum
    uint256 public constant MIN_POLL_DURATION = 1 hours;
    uint256 public constant MAX_POLL_DURATION = 365 days;
    uint256 public constant RESOLUTION_GRACE_PERIOD = 7 days; // Time after deadline to resolve
    
    // Events
    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string title,
        uint256 deadline,
        bool isStakingEnabled,
        uint256 creatorFeePercent
    );
    
    event VoteCast(
        uint256 indexed pollId,
        address indexed voter,
        uint256 option,
        uint256 stakeAmount
    );
    
    event PollResolved(
        uint256 indexed pollId,
        uint256 correctOption,
        uint256 totalRewards,
        uint256 resolutionTimestamp
    );
    
    event RewardClaimed(
        uint256 indexed pollId,
        address indexed user,
        uint256 rewardAmount,
        bool isCreator
    );
    
    event CreatorStacksClaimed(
        uint256 indexed pollId,
        address indexed creator,
        uint256 claimedAmount,
        uint256 creatorFeePercent
    );
    
    event SecurityEvent(
        uint256 indexed pollId,
        string eventType,
        address indexed user,
        string message
    );
    
    event TokensStaked(address indexed user, uint256 amount, uint256 timestamp);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 timestamp);
    
    // Enhanced Modifiers
    modifier pollExists(uint256 _pollId) {
        require(_pollId < pollCounter, "Poll does not exist");
        _;
    }
    
    modifier onlyPollCreator(uint256 _pollId) {
        require(polls[_pollId].creator == msg.sender, "Only poll creator can perform this action");
        _;
    }
    
    modifier pollActive(uint256 _pollId) {
        require(block.timestamp < polls[_pollId].deadline, "Poll deadline has passed");
        _;
    }
    
    modifier pollResolved(uint256 _pollId) {
        require(polls[_pollId].isResolved, "Poll must be resolved before claiming rewards");
        _;
    }
    
    modifier pollResolvable(uint256 _pollId) {
        Poll storage poll = polls[_pollId];
        require(block.timestamp >= poll.deadline, "Poll is still active");
        require(block.timestamp <= poll.deadline + RESOLUTION_GRACE_PERIOD, "Resolution grace period expired");
        require(!poll.isResolved, "Poll already resolved");
        _;
    }
    
    modifier validCreatorFee(uint256 _feePercent) {
        require(_feePercent <= MAX_CREATOR_FEE_PERCENT, "Creator fee cannot exceed 10%");
        _;
    }
    
    modifier validPollDuration(uint256 _deadline) {
        uint256 duration = _deadline - block.timestamp;
        require(duration >= MIN_POLL_DURATION, "Poll duration must be at least 1 hour");
        require(duration <= MAX_POLL_DURATION, "Poll duration cannot exceed 1 year");
        _;
    }
    
    constructor(address _vskToken) Ownable(msg.sender) {
        require(_vskToken != address(0), "Invalid token address");
        vskToken = IERC20(_vskToken);
    }
    
    /**
     * @dev Stake tokens for voting
     * @param _amount Amount of tokens to stake
     */
    function stakeTokens(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(vskToken.balanceOf(msg.sender) >= _amount, "Insufficient token balance");
        require(vskToken.allowance(msg.sender, address(this)) >= _amount, "Insufficient allowance");
        
        // Transfer tokens from user to this contract
        require(vskToken.transferFrom(msg.sender, address(this), _amount), "Token transfer failed");
        
        // Update staking balances
        userStakedBalance[msg.sender] += _amount;
        totalStakedTokens += _amount;
        
        emit TokensStaked(msg.sender, _amount, block.timestamp);
    }
    
    /**
     * @dev Unstake tokens
     * @param _amount Amount of tokens to unstake
     */
    function unstakeTokens(uint256 _amount) external nonReentrant {
        require(_amount > 0, "Amount must be greater than 0");
        require(userStakedBalance[msg.sender] >= _amount, "Insufficient staked balance");
        
        // Update staking balances
        userStakedBalance[msg.sender] -= _amount;
        totalStakedTokens -= _amount;
        
        // Transfer tokens back to user
        require(vskToken.transfer(msg.sender, _amount), "Token transfer failed");
        
        emit TokensUnstaked(msg.sender, _amount, block.timestamp);
    }
    
    /**
     * @dev Create a new prediction poll with enhanced security
     * @param _title Poll title
     * @param _description Poll description
     * @param _options Array of poll options
     * @param _deadline Poll deadline timestamp
     * @param _isStakingEnabled Whether staking is enabled for this poll
     * @param _creatorFeePercent Creator fee percentage (e.g., 500 = 5%, max 1000 = 10%)
     */
    function createPoll(
        string memory _title,
        string memory _description,
        string[] memory _options,
        uint256 _deadline,
        bool _isStakingEnabled,
        uint256 _creatorFeePercent
    ) external whenNotPaused validCreatorFee(_creatorFeePercent) validPollDuration(_deadline) {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_options.length >= 2, "Must have at least 2 options");
        require(_options.length <= 10, "Cannot have more than 10 options");
        
        uint256 pollId = pollCounter;
        Poll storage poll = polls[pollId];
        
        poll.id = pollId;
        poll.creator = msg.sender;
        poll.title = _title;
        poll.description = _description;
        poll.deadline = _deadline;
        poll.isStakingEnabled = _isStakingEnabled;
        poll.creatorFeePercent = _creatorFeePercent;
        poll.creatorHasClaimed = false;
        poll.resolutionTimestamp = 0;
        
        // Add options
        for (uint256 i = 0; i < _options.length; i++) {
            require(bytes(_options[i]).length > 0, "Option cannot be empty");
            poll.options.push(_options[i]);
        }
        
        pollCounter++;
        userPolls[msg.sender].push(pollId);
        
        emit PollCreated(pollId, msg.sender, _title, _deadline, _isStakingEnabled, _creatorFeePercent);
        emit SecurityEvent(pollId, "POLL_CREATED", msg.sender, "Poll created successfully");
    }
    
    /**
     * @dev Vote on a poll with optional staking
     * @param _pollId Poll ID
     * @param _option Option index to vote for
     * @param _stakeAmount Amount of tokens to stake (0 if no staking)
     */
    function vote(
        uint256 _pollId,
        uint256 _option,
        uint256 _stakeAmount
    ) external nonReentrant pollExists(_pollId) pollActive(_pollId) whenNotPaused {
        Poll storage poll = polls[_pollId];
        
        require(!poll.hasVoted[msg.sender], "Already voted on this poll");
        require(_option < poll.options.length, "Invalid option selected");
        require(msg.sender != poll.creator, "Creator cannot vote on their own poll");
        
        if (poll.isStakingEnabled && _stakeAmount > 0) {
            require(_stakeAmount <= userStakedBalance[msg.sender], "Insufficient staked balance");
            require(_stakeAmount >= 1 ether, "Minimum stake amount is 1 VSK");
            
            // Use already staked tokens for voting
            userStakedBalance[msg.sender] -= _stakeAmount;
            
            poll.userStake[msg.sender] = _stakeAmount;
            poll.optionStaked[_option] += _stakeAmount;
            poll.totalStaked += _stakeAmount;
        }
        
        poll.hasVoted[msg.sender] = true;
        poll.userVote[msg.sender] = _option;
        poll.optionVotes[_option]++;
        userVotes[msg.sender].push(_pollId);
        
        emit VoteCast(_pollId, msg.sender, _option, _stakeAmount);
        emit SecurityEvent(_pollId, "VOTE_CAST", msg.sender, "Vote cast successfully");
    }
    
    /**
     * @dev Resolve a poll by marking the correct option (creator only)
     * @param _pollId Poll ID
     * @param _correctOption Index of the correct option
     */
    function resolvePoll(
        uint256 _pollId,
        uint256 _correctOption
    ) external pollExists(_pollId) onlyPollCreator(_pollId) pollResolvable(_pollId) {
        Poll storage poll = polls[_pollId];
        
        require(_correctOption < poll.options.length, "Invalid correct option");
        require(poll.optionVotes[_correctOption] > 0, "Correct option must have at least one vote");
        
        poll.correctOption = _correctOption;
        poll.isResolved = true;
        poll.resolutionTimestamp = block.timestamp;
        
        emit PollResolved(_pollId, _correctOption, poll.totalStaked, block.timestamp);
        emit SecurityEvent(_pollId, "POLL_RESOLVED", msg.sender, "Poll resolved by creator");
    }
    
    /**
     * @dev Claim rewards for a resolved poll (for voters who chose the correct option)
     * @param _pollId Poll ID
     */
    function claimReward(uint256 _pollId) external nonReentrant pollExists(_pollId) pollResolved(_pollId) {
        Poll storage poll = polls[_pollId];
        
        require(poll.hasVoted[msg.sender], "Must have voted on this poll to claim rewards");
        require(!poll.hasClaimedReward[msg.sender], "Already claimed reward for this poll");
        require(poll.userVote[msg.sender] == poll.correctOption, "Can only claim rewards for correct vote");
        require(msg.sender != poll.creator, "Creator must use claimStacks() function");
        
        poll.hasClaimedReward[msg.sender] = true;
        
        uint256 rewardAmount = 0;
        
        if (poll.isStakingEnabled && poll.totalStaked > 0) {
            // Calculate creator fee
            uint256 creatorFee = (poll.totalStaked * poll.creatorFeePercent) / 10000;
            uint256 remainingForVoters = poll.totalStaked - creatorFee;
            
            // Calculate proportional reward based on stake
            uint256 userStake = poll.userStake[msg.sender];
            if (poll.optionStaked[poll.correctOption] > 0) {
                rewardAmount = (userStake * remainingForVoters) / poll.optionStaked[poll.correctOption];
            }
        }
        
        if (rewardAmount > 0) {
            require(vskToken.transfer(msg.sender, rewardAmount), "Reward transfer failed");
        }
        
        emit RewardClaimed(_pollId, msg.sender, rewardAmount, false);
        emit SecurityEvent(_pollId, "REWARD_CLAIMED", msg.sender, "Voter reward claimed successfully");
    }
    
    /**
     * @dev Allow poll creator to claim their fee from staked tokens (CREATOR ONLY)
     * @param _pollId Poll ID
     */
    function claimStacks(uint256 _pollId) external nonReentrant pollExists(_pollId) onlyPollCreator(_pollId) pollResolved(_pollId) {
        Poll storage poll = polls[_pollId];
        
        require(!poll.creatorHasClaimed, "Creator has already claimed their fee");
        require(poll.totalStaked > 0, "No tokens staked on this poll");
        require(poll.creatorFeePercent > 0, "No creator fee set for this poll");
        
        // Additional security: Check if enough time has passed since resolution
        require(block.timestamp >= poll.resolutionTimestamp + 1 hours, "Must wait 1 hour after resolution");
        
        poll.creatorHasClaimed = true;
        
        // Calculate creator fee
        uint256 creatorFee = (poll.totalStaked * poll.creatorFeePercent) / 10000;
        
        require(creatorFee > 0, "Creator fee amount is zero");
        require(vskToken.balanceOf(address(this)) >= creatorFee, "Insufficient contract balance");
        
        require(vskToken.transfer(msg.sender, creatorFee), "Creator fee transfer failed");
        
        emit CreatorStacksClaimed(_pollId, msg.sender, creatorFee, poll.creatorFeePercent);
        emit RewardClaimed(_pollId, msg.sender, creatorFee, true);
        emit SecurityEvent(_pollId, "CREATOR_STACKS_CLAIMED", msg.sender, "Creator fee claimed successfully");
    }
    
    /**
     * @dev Emergency function to claim unclaimed rewards after grace period (owner only)
     * @param _pollId Poll ID
     */
    function emergencyClaimUnclaimedRewards(uint256 _pollId) external onlyOwner pollExists(_pollId) pollResolved(_pollId) {
        Poll storage poll = polls[_pollId];
        
        require(block.timestamp >= poll.resolutionTimestamp + 30 days, "Emergency claim not yet available");
        
        uint256 unclaimedAmount = vskToken.balanceOf(address(this));
        if (unclaimedAmount > 0) {
            require(vskToken.transfer(owner(), unclaimedAmount), "Emergency transfer failed");
            emit SecurityEvent(_pollId, "EMERGENCY_CLAIM", msg.sender, "Unclaimed rewards claimed by owner");
        }
    }
    
    /**
     * @dev Get poll details with enhanced information
     * @param _pollId Poll ID
     * @return id Poll ID
     * @return creator Poll creator address
     * @return title Poll title
     * @return description Poll description
     * @return options Poll options array
     * @return deadline Poll deadline timestamp
     * @return correctOption Correct option index
     * @return isResolved Whether poll is resolved
     * @return isStakingEnabled Whether staking is enabled
     * @return totalStaked Total amount staked
     * @return creatorFeePercent Creator fee percentage
     * @return creatorHasClaimed Whether creator has claimed their fee
     * @return resolutionTimestamp When poll was resolved
     */
    function getPoll(uint256 _pollId) external view pollExists(_pollId) returns (
        uint256 id,
        address creator,
        string memory title,
        string memory description,
        string[] memory options,
        uint256 deadline,
        uint256 correctOption,
        bool isResolved,
        bool isStakingEnabled,
        uint256 totalStaked,
        uint256 creatorFeePercent,
        bool creatorHasClaimed,
        uint256 resolutionTimestamp
    ) {
        Poll storage poll = polls[_pollId];
        return (
            poll.id,
            poll.creator,
            poll.title,
            poll.description,
            poll.options,
            poll.deadline,
            poll.correctOption,
            poll.isResolved,
            poll.isStakingEnabled,
            poll.totalStaked,
            poll.creatorFeePercent,
            poll.creatorHasClaimed,
            poll.resolutionTimestamp
        );
    }
    
    /**
     * @dev Get creator fee information for a poll
     * @param _pollId Poll ID
     * @return creatorFeePercent Creator fee percentage
     * @return creatorHasClaimed Whether creator has claimed their fee
     * @return totalStaked Total amount staked
     * @return creatorFeeAmount Calculated creator fee amount
     * @return canClaim Whether creator can claim now
     * @return timeUntilClaimable Seconds until creator can claim (0 if claimable now)
     */
    function getCreatorFeeInfo(uint256 _pollId) external view pollExists(_pollId) returns (
        uint256 creatorFeePercent,
        bool creatorHasClaimed,
        uint256 totalStaked,
        uint256 creatorFeeAmount,
        bool canClaim,
        uint256 timeUntilClaimable
    ) {
        Poll storage poll = polls[_pollId];
        creatorFeePercent = poll.creatorFeePercent;
        creatorHasClaimed = poll.creatorHasClaimed;
        totalStaked = poll.totalStaked;
        creatorFeeAmount = (poll.totalStaked * poll.creatorFeePercent) / 10000;
        
        if (!poll.isResolved || poll.creatorHasClaimed || poll.creatorFeePercent == 0) {
            canClaim = false;
            timeUntilClaimable = 0;
        } else {
            uint256 claimTime = poll.resolutionTimestamp + 1 hours;
            if (block.timestamp >= claimTime) {
                canClaim = true;
                timeUntilClaimable = 0;
            } else {
                canClaim = false;
                timeUntilClaimable = claimTime - block.timestamp;
            }
        }
    }
    
    /**
     * @dev Check if address is poll creator
     * @param _pollId Poll ID
     * @param _address Address to check
     * @return Whether address is the poll creator
     */
    function isPollCreator(uint256 _pollId, address _address) external view pollExists(_pollId) returns (bool) {
        return polls[_pollId].creator == _address;
    }
    
    /**
     * @dev Get user's staked balance
     * @param _user User address
     * @return User's staked balance
     */
    function getStakedBalance(address _user) external view returns (uint256) {
        return userStakedBalance[_user];
    }
    
    /**
     * @dev Get poll vote counts
     * @param _pollId Poll ID
     * @return Vote counts for each option
     */
    function getPollVotes(uint256 _pollId) external view pollExists(_pollId) returns (uint256[] memory) {
        Poll storage poll = polls[_pollId];
        uint256[] memory votes = new uint256[](poll.options.length);
        
        for (uint256 i = 0; i < poll.options.length; i++) {
            votes[i] = poll.optionVotes[i];
        }
        
        return votes;
    }
    
    /**
     * @dev Get poll staked amounts
     * @param _pollId Poll ID
     * @return Staked amounts for each option
     */
    function getPollStakes(uint256 _pollId) external view pollExists(_pollId) returns (uint256[] memory) {
        Poll storage poll = polls[_pollId];
        uint256[] memory stakes = new uint256[](poll.options.length);
        
        for (uint256 i = 0; i < poll.options.length; i++) {
            stakes[i] = poll.optionStaked[i];
        }
        
        return stakes;
    }
    
    /**
     * @dev Check if user has voted on a poll
     * @param _pollId Poll ID
     * @param _user User address
     * @return Whether user has voted
     */
    function hasUserVoted(uint256 _pollId, address _user) external view pollExists(_pollId) returns (bool) {
        return polls[_pollId].hasVoted[_user];
    }
    
    /**
     * @dev Get user's vote and stake for a poll
     * @param _pollId Poll ID
     * @param _user User address
     * @return Vote option and stake amount
     */
    function getUserVote(uint256 _pollId, address _user) external view pollExists(_pollId) returns (uint256, uint256) {
        Poll storage poll = polls[_pollId];
        return (poll.userVote[_user], poll.userStake[_user]);
    }
    
    /**
     * @dev Get user's polls
     * @param _user User address
     * @return Array of poll IDs created by user
     */
    function getUserPolls(address _user) external view returns (uint256[] memory) {
        return userPolls[_user];
    }
    
    /**
     * @dev Get user's votes
     * @param _user User address
     * @return Array of poll IDs user has voted on
     */
    function getUserVotes(address _user) external view returns (uint256[] memory) {
        return userVotes[_user];
    }
    
    /**
     * @dev Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = vskToken.balanceOf(address(this));
        if (balance > 0) {
            vskToken.transfer(owner(), balance);
        }
    }
}
