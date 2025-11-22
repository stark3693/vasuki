// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title VasukiiToken
 * @dev ERC-20 token for staking in prediction polls
 * @notice This token is used for staking when voting on prediction polls
 */
contract VasukiiToken is ERC20, Ownable, ERC20Permit {
    uint256 public constant INITIAL_SUPPLY = 1000000 * 10**18; // 1M tokens
    uint256 public constant MAX_SUPPLY = 10000000 * 10**18; // 10M tokens max
    
    // Mapping to track staked amounts per user
    mapping(address => uint256) public stakedBalance;
    mapping(address => uint256) public stakingTimestamp;
    
    // Events
    event TokensStaked(address indexed user, uint256 amount, uint256 timestamp);
    event TokensUnstaked(address indexed user, uint256 amount, uint256 timestamp);
    event TokensMinted(address indexed to, uint256 amount);
    
    constructor() 
        ERC20("Vasukii Token", "VSK") 
        Ownable(msg.sender)
        ERC20Permit("Vasukii Token")
    {
        _mint(msg.sender, INITIAL_SUPPLY);
    }
    
    /**
     * @dev Mint new tokens (only owner)
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
        emit TokensMinted(to, amount);
    }
    
    /**
     * @dev Public claim function for users to get initial VSK tokens
     * @param amount Amount of tokens to claim (max 1000 VSK)
     */
    function claimTokens(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(amount <= 1000 * 10**18, "Cannot claim more than 1000 VSK");
        require(balanceOf(msg.sender) == 0, "Already claimed tokens");
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        
        _mint(msg.sender, amount);
        emit TokensMinted(msg.sender, amount);
    }
    
    /**
     * @dev Stake tokens for prediction polls
     * @param amount Amount of tokens to stake
     */
    function stake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _transfer(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        stakingTimestamp[msg.sender] = block.timestamp;
        
        emit TokensStaked(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Unstake tokens
     * @param amount Amount of tokens to unstake
     */
    function unstake(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");
        
        stakedBalance[msg.sender] -= amount;
        _transfer(address(this), msg.sender, amount);
        
        emit TokensUnstaked(msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev Get staked balance for a user
     * @param user Address of the user
     * @return Amount of staked tokens
     */
    function getStakedBalance(address user) external view returns (uint256) {
        return stakedBalance[user];
    }
    
    /**
     * @dev Transfer staked tokens (used by prediction contract)
     * @param from Address to transfer from
     * @param to Address to transfer to
     * @param amount Amount to transfer
     */
    function transferStaked(address from, address to, uint256 amount) external {
        require(msg.sender == owner(), "Only owner can transfer staked tokens");
        require(stakedBalance[from] >= amount, "Insufficient staked balance");
        
        stakedBalance[from] -= amount;
        stakedBalance[to] += amount;
    }
    
    /**
     * @dev Burn staked tokens (used for rewards distribution)
     * @param from Address to burn from
     * @param amount Amount to burn
     */
    function burnStaked(address from, uint256 amount) external {
        require(msg.sender == owner(), "Only owner can burn staked tokens");
        require(stakedBalance[from] >= amount, "Insufficient staked balance");
        
        stakedBalance[from] -= amount;
        _burn(address(this), amount);
    }
    
    /**
     * @dev Batch transfer tokens to multiple addresses
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to transfer (must match recipients length)
     */
    function batchTransfer(address[] calldata recipients, uint256[] calldata amounts) external {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= 100, "Too many recipients"); // Gas limit protection
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Invalid amount");
            _transfer(msg.sender, recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev Batch mint tokens to multiple addresses (only owner)
     * @param recipients Array of recipient addresses
     * @param amounts Array of amounts to mint (must match recipients length)
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(recipients.length > 0, "Empty arrays");
        require(recipients.length <= 100, "Too many recipients"); // Gas limit protection
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            require(amounts[i] > 0, "Invalid amount");
            require(totalSupply() + amounts[i] <= MAX_SUPPLY, "Exceeds max supply");
            _mint(recipients[i], amounts[i]);
            emit TokensMinted(recipients[i], amounts[i]);
        }
    }
    
    /**
     * @dev Distribute tokens to all users (only owner)
     * @param recipients Array of recipient addresses
     * @param amountPerUser Amount to give to each user
     */
    function distributeToUsers(address[] calldata recipients, uint256 amountPerUser) external onlyOwner {
        require(recipients.length > 0, "Empty recipients array");
        require(recipients.length <= 100, "Too many recipients"); // Gas limit protection
        require(amountPerUser > 0, "Invalid amount per user");
        
        uint256 totalAmount = recipients.length * amountPerUser;
        require(totalSupply() + totalAmount <= MAX_SUPPLY, "Exceeds max supply");
        require(balanceOf(msg.sender) >= totalAmount, "Insufficient balance for distribution");
        
        for (uint256 i = 0; i < recipients.length; i++) {
            require(recipients[i] != address(0), "Invalid recipient");
            _transfer(msg.sender, recipients[i], amountPerUser);
        }
    }
}
