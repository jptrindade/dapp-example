// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title VestingContract
 */
contract VestingContract is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    struct VestingSchedule {
        // address of the receiver of tokens
        address payable receiver;
        // start time of the vesting period
        uint256 start;
        // total amount of tokens to be released
        uint256 total;
        // amount of tokens released
        uint256 released;
    }

    // address of the ERC20 token
    IERC20 private immutable _token;
    // one month in seconds
    uint256 private constant MONTH = 30 * 24 * 60 * 60;
    // amount of time that the tokens will be locked (one year)
    uint256 private constant vestingPeriod = 12 * MONTH;
    // used to gradually release tokens over a certain period
    uint256 private constant vestingThreshold = 3 * MONTH;

    mapping(address => VestingSchedule) private vestingSchedules;
    uint256 private vestingSchedulesTotalAmount;

    /**
     * @dev Creates a vesting contract.
     * @param tokenAddress address of the ERC20 token contract
     */
    constructor(address tokenAddress) {
        require(tokenAddress != address(0x0), "Token address invalid");
        _token = IERC20(tokenAddress);
    }

    /**
     * @dev Returns the amount of tokens that can be vested.
     */
    function getAvailableAmount() public view returns (uint256) {
        return _token.balanceOf(address(this)).sub(vestingSchedulesTotalAmount);
    }

    /**
     * @dev Returns the vesting schedule for a given address.
     */
    function getVestingSchedule(address receiverAddress) public view returns (VestingSchedule memory) {
        return vestingSchedules[receiverAddress];
    }

    /**
     * @dev Calculates the amount of tokens to release.
     */
    function _getAmountToRelease(VestingSchedule memory vestingSchedule) internal view returns (uint256) {
        if (block.timestamp >= vestingSchedule.start.add(vestingPeriod)) {
            return vestingSchedule.total.sub(vestingSchedule.released);
        } else {
            uint256 parts = vestingPeriod.div(vestingThreshold);
            uint256 amountSlice = vestingSchedule.total.div(parts);
            uint256 partsReleased = block.timestamp.sub(vestingSchedule.start).div(vestingThreshold);
            uint256 amountToRelease = partsReleased.mul(amountSlice).sub(vestingSchedule.released);

            return amountToRelease;
        }
    }

    /**
     * @notice Creates a new vesting schedule for a receiver.
     * @param _receiver address of the receiver to whom vested tokens are transferred
     * @param _start start time of the vesting period
     * @param _amount total amount of tokens to be released at the end of the vesting
     */
    function createVestingSchedule(
        address payable _receiver,
        uint256 _start,
        uint256 _amount
    ) public onlyOwner nonReentrant {
        require(getAvailableAmount() >= _amount, "Not enough available tokens in contract");
        require(vestingSchedules[_receiver].total == 0, "This receiver already has a VestingSchedule");
        require(_amount > 0, "Amount must be > 0");

        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.add(_amount);
        vestingSchedules[_receiver] = VestingSchedule(_receiver, _start, _amount, 0);
    }

    /**
     * @notice Release vested amount of tokens.
     * @param receiver the vesting schedule identifier
     */
    function release(address payable receiver) public nonReentrant {
        VestingSchedule storage vestingSchedule = vestingSchedules[receiver];
        bool isreceiver = msg.sender == vestingSchedule.receiver;
        bool isOwner = msg.sender == owner();
        require(isreceiver || isOwner, "Only receiver and owner can release vested tokens");
        require(block.timestamp > vestingSchedule.start, "Vesting period has not started yet");
        require(vestingSchedule.released < vestingSchedule.total, "All tokens have been released already");
        uint256 amountToRelease = _getAmountToRelease(vestingSchedule);
        vestingSchedule.released = vestingSchedule.released.add(amountToRelease);
        vestingSchedulesTotalAmount = vestingSchedulesTotalAmount.sub(amountToRelease);
        _token.safeTransfer(vestingSchedule.receiver, amountToRelease);
    }
}
