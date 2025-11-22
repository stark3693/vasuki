// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title VaskTimeCapsule
 * @dev World's First Time-Locked Social Media Content System
 * @notice Users can create time-locked posts that unlock based on blockchain conditions
 */
contract VaskTimeCapsule is Ownable, ReentrancyGuard, Pausable {
    IERC20 public immutable vskToken;
    
    // Time capsule structure
    struct TimeCapsule {
        uint256 id;
        address creator;
        string content; // Will be encrypted in production
        uint256 unlockTime;
        uint256 unlockBlock;
        uint256 priceTarget; // For price-based unlocking
        string priceToken; // Token symbol (BTC, ETH, etc.)
        bool isPriceBased;
        bool isUnlocked;
        uint256 stakeAmount;
        address[] witnesses; // Users who can verify the prediction
        mapping(address => bool) hasWitnessed;
        uint256 witnessThreshold;
        bool isWitnessBased;
        uint256 createdAt;
        uint256 unlockFee;
    }
    
    // State variables
    uint256 public capsuleCounter;
    mapping(uint256 => TimeCapsule) public timeCapsules;
    mapping(address => uint256[]) public userCapsules;
    
    // Price oracle integration (simplified)
    mapping(string => uint256) public tokenPrices; // Token symbol => price in USD (scaled by 1e8)
    
    // Events
    event TimeCapsuleCreated(
        uint256 indexed capsuleId,
        address indexed creator,
        uint256 unlockTime,
        uint256 stakeAmount,
        bool isPriceBased,
        string priceToken,
        uint256 priceTarget
    );
    
    event TimeCapsuleUnlocked(
        uint256 indexed capsuleId,
        address indexed creator,
        uint256 unlockTime,
        string reason
    );
    
    event PriceUpdated(string indexed token, uint256 newPrice, uint256 timestamp);
    
    event WitnessAdded(uint256 indexed capsuleId, address indexed witness, address indexed user);
    
    event CapsuleContentRevealed(uint256 indexed capsuleId, string content);
    
    // Modifiers
    modifier capsuleExists(uint256 _capsuleId) {
        require(_capsuleId < capsuleCounter, "Capsule does not exist");
        _;
    }
    
    modifier onlyCreator(uint256 _capsuleId) {
        require(timeCapsules[_capsuleId].creator == msg.sender, "Only creator can perform this action");
        _;
    }
    
    modifier notUnlocked(uint256 _capsuleId) {
        require(!timeCapsules[_capsuleId].isUnlocked, "Capsule already unlocked");
        _;
    }
    
    constructor(address _vskToken) Ownable(msg.sender) {
        vskToken = IERC20(_vskToken);
    }
    
    /**
     * @dev Create a time capsule with time-based unlocking
     * @param _content Encrypted content to be revealed
     * @param _unlockTime Unix timestamp when capsule should unlock
     * @param _stakeAmount VSK tokens to stake for credibility
     */
    function createTimeCapsule(
        string memory _content,
        uint256 _unlockTime,
        uint256 _stakeAmount
    ) external nonReentrant whenNotPaused {
        require(_unlockTime > block.timestamp, "Unlock time must be in the future");
        require(_stakeAmount > 0, "Stake amount must be greater than 0");
        require(vskToken.balanceOf(msg.sender) >= _stakeAmount, "Insufficient VSK balance");
        
        // Transfer stake to contract
        require(vskToken.transferFrom(msg.sender, address(this), _stakeAmount), "Stake transfer failed");
        
        uint256 capsuleId = capsuleCounter++;
        TimeCapsule storage capsule = timeCapsules[capsuleId];
        
        capsule.id = capsuleId;
        capsule.creator = msg.sender;
        capsule.content = _content;
        capsule.unlockTime = _unlockTime;
        capsule.unlockBlock = 0; // Not used for time-based
        capsule.priceTarget = 0;
        capsule.priceToken = "";
        capsule.isPriceBased = false;
        capsule.isUnlocked = false;
        capsule.stakeAmount = _stakeAmount;
        capsule.isWitnessBased = false;
        capsule.createdAt = block.timestamp;
        capsule.unlockFee = _stakeAmount / 10; // 10% fee for unlocking
        
        userCapsules[msg.sender].push(capsuleId);
        
        emit TimeCapsuleCreated(capsuleId, msg.sender, _unlockTime, _stakeAmount, false, "", 0);
    }
    
    /**
     * @dev Create a time capsule with price-based unlocking
     * @param _content Encrypted content to be revealed
     * @param _priceToken Token symbol (BTC, ETH, etc.)
     * @param _priceTarget Target price in USD (scaled by 1e8)
     * @param _stakeAmount VSK tokens to stake for credibility
     */
    function createPriceCapsule(
        string memory _content,
        string memory _priceToken,
        uint256 _priceTarget,
        uint256 _stakeAmount
    ) external nonReentrant whenNotPaused {
        require(_priceTarget > 0, "Price target must be greater than 0");
        require(_stakeAmount > 0, "Stake amount must be greater than 0");
        require(vskToken.balanceOf(msg.sender) >= _stakeAmount, "Insufficient VSK balance");
        
        // Transfer stake to contract
        require(vskToken.transferFrom(msg.sender, address(this), _stakeAmount), "Stake transfer failed");
        
        uint256 capsuleId = capsuleCounter++;
        TimeCapsule storage capsule = timeCapsules[capsuleId];
        
        capsule.id = capsuleId;
        capsule.creator = msg.sender;
        capsule.content = _content;
        capsule.unlockTime = 0; // Not used for price-based
        capsule.unlockBlock = 0;
        capsule.priceTarget = _priceTarget;
        capsule.priceToken = _priceToken;
        capsule.isPriceBased = true;
        capsule.isUnlocked = false;
        capsule.stakeAmount = _stakeAmount;
        capsule.isWitnessBased = false;
        capsule.createdAt = block.timestamp;
        capsule.unlockFee = _stakeAmount / 10; // 10% fee for unlocking
        
        userCapsules[msg.sender].push(capsuleId);
        
        emit TimeCapsuleCreated(capsuleId, msg.sender, 0, _stakeAmount, true, _priceToken, _priceTarget);
    }
    
    /**
     * @dev Create a witness-based time capsule
     * @param _content Encrypted content to be revealed
     * @param _unlockTime Unix timestamp when capsule should unlock
     * @param _stakeAmount VSK tokens to stake for credibility
     * @param _witnesses Array of witness addresses
     * @param _witnessThreshold Minimum number of witnesses needed
     */
    function createWitnessCapsule(
        string memory _content,
        uint256 _unlockTime,
        uint256 _stakeAmount,
        address[] memory _witnesses,
        uint256 _witnessThreshold
    ) external nonReentrant whenNotPaused {
        require(_unlockTime > block.timestamp, "Unlock time must be in the future");
        require(_stakeAmount > 0, "Stake amount must be greater than 0");
        require(_witnesses.length > 0, "Must have at least one witness");
        require(_witnessThreshold > 0 && _witnessThreshold <= _witnesses.length, "Invalid witness threshold");
        require(vskToken.balanceOf(msg.sender) >= _stakeAmount, "Insufficient VSK balance");
        
        // Transfer stake to contract
        require(vskToken.transferFrom(msg.sender, address(this), _stakeAmount), "Stake transfer failed");
        
        uint256 capsuleId = capsuleCounter++;
        TimeCapsule storage capsule = timeCapsules[capsuleId];
        
        capsule.id = capsuleId;
        capsule.creator = msg.sender;
        capsule.content = _content;
        capsule.unlockTime = _unlockTime;
        capsule.unlockBlock = 0;
        capsule.priceTarget = 0;
        capsule.priceToken = "";
        capsule.isPriceBased = false;
        capsule.isUnlocked = false;
        capsule.stakeAmount = _stakeAmount;
        capsule.isWitnessBased = true;
        capsule.witnessThreshold = _witnessThreshold;
        capsule.createdAt = block.timestamp;
        capsule.unlockFee = _stakeAmount / 10; // 10% fee for unlocking
        
        // Add witnesses
        for (uint256 i = 0; i < _witnesses.length; i++) {
            capsule.witnesses.push(_witnesses[i]);
            emit WitnessAdded(capsuleId, _witnesses[i], msg.sender);
        }
        
        userCapsules[msg.sender].push(capsuleId);
        
        emit TimeCapsuleCreated(capsuleId, msg.sender, _unlockTime, _stakeAmount, false, "", 0);
    }
    
    /**
     * @dev Unlock a time capsule if conditions are met
     * @param _capsuleId ID of the capsule to unlock
     */
    function unlockCapsule(uint256 _capsuleId) external nonReentrant capsuleExists(_capsuleId) notUnlocked(_capsuleId) {
        TimeCapsule storage capsule = timeCapsules[_capsuleId];
        
        bool canUnlock = false;
        string memory reason = "";
        
        if (capsule.isPriceBased) {
            // Check if price target is met
            uint256 currentPrice = tokenPrices[capsule.priceToken];
            if (currentPrice >= capsule.priceTarget) {
                canUnlock = true;
                reason = string(abi.encodePacked("Price target reached: ", capsule.priceToken, " at $", _uint2str(currentPrice / 1e8)));
            }
        } else if (capsule.isWitnessBased) {
            // Check if enough witnesses have verified
            uint256 witnessCount = 0;
            for (uint256 i = 0; i < capsule.witnesses.length; i++) {
                if (capsule.hasWitnessed[capsule.witnesses[i]]) {
                    witnessCount++;
                }
            }
            
            if (witnessCount >= capsule.witnessThreshold && block.timestamp >= capsule.unlockTime) {
                canUnlock = true;
                reason = "Witness threshold reached and time elapsed";
            }
        } else {
            // Time-based unlocking
            if (block.timestamp >= capsule.unlockTime) {
                canUnlock = true;
                reason = "Time-based unlock condition met";
            }
        }
        
        require(canUnlock, "Unlock conditions not met");
        
        capsule.isUnlocked = true;
        
        // Return stake to creator (minus unlock fee)
        uint256 returnAmount = capsule.stakeAmount - capsule.unlockFee;
        if (returnAmount > 0) {
            require(vskToken.transfer(capsule.creator, returnAmount), "Stake return failed");
        }
        
        // Burn or distribute unlock fee
        // For now, we'll keep it in the contract (can be distributed to treasury later)
        
        emit TimeCapsuleUnlocked(_capsuleId, capsule.creator, block.timestamp, reason);
        emit CapsuleContentRevealed(_capsuleId, capsule.content);
    }
    
    /**
     * @dev Witness a prediction (for witness-based capsules)
     * @param _capsuleId ID of the capsule
     */
    function witnessPrediction(uint256 _capsuleId) external capsuleExists(_capsuleId) notUnlocked(_capsuleId) {
        TimeCapsule storage capsule = timeCapsules[_capsuleId];
        require(capsule.isWitnessBased, "Not a witness-based capsule");
        require(!capsule.hasWitnessed[msg.sender], "Already witnessed");
        
        // Check if sender is in the witness list
        bool isWitness = false;
        for (uint256 i = 0; i < capsule.witnesses.length; i++) {
            if (capsule.witnesses[i] == msg.sender) {
                isWitness = true;
                break;
            }
        }
        require(isWitness, "Not authorized to witness");
        
        capsule.hasWitnessed[msg.sender] = true;
        emit WitnessAdded(_capsuleId, msg.sender, capsule.creator);
    }
    
    /**
     * @dev Update token prices (only owner - in production, this would be from an oracle)
     * @param _token Token symbol
     * @param _price Price in USD (scaled by 1e8)
     */
    function updateTokenPrice(string memory _token, uint256 _price) external onlyOwner {
        tokenPrices[_token] = _price;
        emit PriceUpdated(_token, _price, block.timestamp);
    }
    
    /**
     * @dev Get capsule details
     * @param _capsuleId ID of the capsule
     */
    function getCapsule(uint256 _capsuleId) external view capsuleExists(_capsuleId) returns (
        uint256 id,
        address creator,
        uint256 unlockTime,
        uint256 priceTarget,
        string memory priceToken,
        bool isPriceBased,
        bool isUnlocked,
        uint256 stakeAmount,
        bool isWitnessBased,
        uint256 witnessThreshold,
        uint256 createdAt,
        uint256 witnessCount
    ) {
        TimeCapsule storage capsule = timeCapsules[_capsuleId];
        
        uint256 currentWitnessCount = 0;
        if (capsule.isWitnessBased) {
            for (uint256 i = 0; i < capsule.witnesses.length; i++) {
                if (capsule.hasWitnessed[capsule.witnesses[i]]) {
                    currentWitnessCount++;
                }
            }
        }
        
        return (
            capsule.id,
            capsule.creator,
            capsule.unlockTime,
            capsule.priceTarget,
            capsule.priceToken,
            capsule.isPriceBased,
            capsule.isUnlocked,
            capsule.stakeAmount,
            capsule.isWitnessBased,
            capsule.witnessThreshold,
            capsule.createdAt,
            currentWitnessCount
        );
    }
    
    /**
     * @dev Get user's capsules
     * @param _user User address
     */
    function getUserCapsules(address _user) external view returns (uint256[] memory) {
        return userCapsules[_user];
    }
    
    /**
     * @dev Emergency function to pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Emergency function to unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Helper function to convert uint to string
    function _uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}

