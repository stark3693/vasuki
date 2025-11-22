// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PredictionPoll
 * @dev Smart contract for creating and managing prediction polls with staking
 * @notice Users can create polls, vote with optional staking, and claim rewards
 */
contract PredictionPoll is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable vskToken;
    
    // Staking tracking for users
    mapping(address => uint256) public userStakedBalance;
    uint256 public totalStakedTokens;
    
    // Poll structure
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
    
    // Events
    event PollCreated(
        uint256 indexed pollId,
        address indexed creator,
        string title,
        uint256 deadline,
        bool isStakingEnabled
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
        uint256 totalRewards
    );
    
    event RewardClaimed(
        uint256 indexed pollId,
        address indexed user,
        uint256 rewardAmount
    );
    
    event CreatorStacksClaimed(
        uint256 indexed pollId,
        address indexed creator,
        uint256 claimedAmount,
        uint256 creatorFeePercent
    );
    
    event PollPaused(uint256 indexed pollId);
    event PollUnpaused(uint256 indexed pollId);
    event TokensStaked(address indexed user, uint256 amount, uint256 timestamp);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 timestamp);
    
    // Modifiers
    modifier pollExists(uint256 _pollId) {
        require(_pollId < pollCounter, "Poll does not exist");
        _;
    }
    
    modifier onlyPollCreator(uint256 _pollId) {
        require(polls[_pollId].creator == msg.sender, "Only poll creator");
        _;
    }
    
    modifier pollActive(uint256 _pollId) {
        require(block.timestamp < polls[_pollId].deadline, "Poll deadline passed");
        _;
    }
    
    modifier pollResolved(uint256 _pollId) {
        require(polls[_pollId].isResolved, "Poll not resolved");
        _;
    }
    
    constructor(address _vskToken) Ownable(msg.sender) {
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
     * @dev Get user's staked balance
     * @param _user User address
     * @return User's staked balance
     */
    function getStakedBalance(address _user) external view returns (uint256) {
        return userStakedBalance[_user];
    }
    
    /**
     * @dev Create a new prediction poll
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
    ) external whenNotPaused {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_options.length >= 2, "Must have at least 2 options");
        require(_options.length <= 10, "Cannot have more than 10 options");
        require(_deadline > block.timestamp, "Deadline must be in the future");
        require(_deadline <= block.timestamp + 365 days, "Deadline too far in future");
        require(_creatorFeePercent <= 1000, "Creator fee cannot exceed 10%");
        
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
        
        // Add options
        for (uint256 i = 0; i < _options.length; i++) {
            poll.options.push(_options[i]);
        }
        
        pollCounter++;
        userPolls[msg.sender].push(pollId);
        
        emit PollCreated(pollId, msg.sender, _title, _deadline, _isStakingEnabled);
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
        
        require(!poll.hasVoted[msg.sender], "Already voted");
        require(_option < poll.options.length, "Invalid option");
        
        if (poll.isStakingEnabled && _stakeAmount > 0) {
            require(_stakeAmount <= userStakedBalance[msg.sender], "Insufficient staked balance");
            
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
    }
    
    /**
     * @dev Resolve a poll by marking the correct option
     * @param _pollId Poll ID
     * @param _correctOption Index of the correct option
     */
    function resolvePoll(
        uint256 _pollId,
        uint256 _correctOption
    ) external pollExists(_pollId) onlyPollCreator(_pollId) {
        Poll storage poll = polls[_pollId];
        
        require(block.timestamp >= poll.deadline, "Poll still active");
        require(!poll.isResolved, "Poll already resolved");
        require(_correctOption < poll.options.length, "Invalid correct option");
        
        poll.correctOption = _correctOption;
        poll.isResolved = true;
        
        emit PollResolved(_pollId, _correctOption, poll.totalStaked);
    }
    
    /**
     * @dev Claim rewards for a resolved poll (for voters who chose the correct option)
     * @param _pollId Poll ID
     */
    function claimReward(uint256 _pollId) external nonReentrant pollExists(_pollId) pollResolved(_pollId) {
        Poll storage poll = polls[_pollId];
        
        require(poll.hasVoted[msg.sender], "Did not vote on this poll");
        require(!poll.hasClaimedReward[msg.sender], "Already claimed reward");
        require(poll.userVote[msg.sender] == poll.correctOption, "Voted for wrong option");
        
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
        
        emit RewardClaimed(_pollId, msg.sender, rewardAmount);
    }
    
    /**
     * @dev Allow poll creator to claim their fee from staked tokens
     * @param _pollId Poll ID
     */
    function claimStacks(uint256 _pollId) external nonReentrant pollExists(_pollId) onlyPollCreator(_pollId) pollResolved(_pollId) {
        Poll storage poll = polls[_pollId];
        
        require(!poll.creatorHasClaimed, "Creator has already claimed stacks");
        require(poll.totalStaked > 0, "No tokens staked on this poll");
        
        poll.creatorHasClaimed = true;
        
        // Calculate creator fee
        uint256 creatorFee = (poll.totalStaked * poll.creatorFeePercent) / 10000;
        
        if (creatorFee > 0) {
            require(vskToken.transfer(msg.sender, creatorFee), "Creator fee transfer failed");
        }
        
        emit CreatorStacksClaimed(_pollId, msg.sender, creatorFee, poll.creatorFeePercent);
    }
    
    /**
     * @dev Get poll details
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
        bool creatorHasClaimed
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
            poll.creatorHasClaimed
        );
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
     * @dev Get creator fee information for a poll
     * @param _pollId Poll ID
     * @return creatorFeePercent Creator fee percentage
     * @return creatorHasClaimed Whether creator has claimed their fee
     * @return totalStaked Total amount staked
     * @return creatorFeeAmount Calculated creator fee amount
     */
    function getCreatorFeeInfo(uint256 _pollId) external view pollExists(_pollId) returns (
        uint256 creatorFeePercent,
        bool creatorHasClaimed,
        uint256 totalStaked,
        uint256 creatorFeeAmount
    ) {
        Poll storage poll = polls[_pollId];
        creatorFeePercent = poll.creatorFeePercent;
        creatorHasClaimed = poll.creatorHasClaimed;
        totalStaked = poll.totalStaked;
        creatorFeeAmount = (poll.totalStaked * poll.creatorFeePercent) / 10000;
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
