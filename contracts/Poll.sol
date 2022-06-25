// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "hardhat/console.sol";

struct VoteOption {
    string description;
    uint256 voteCount;
}

struct Ballot {
    address creator;
    string description;
    uint256 deadline;
}

// The option field could be useful to allow
// a voter to change their vote in the future
struct Register {
    bool voted;
    uint256 option;
}

contract Poll {
    Ballot[] public ballots;
    // Connects the address of a voter
    // With a mapping of Ballot ids (in uint256)
    // To the corresponding Register
    mapping(address => mapping(uint256 => Register)) public registers;

    //Mapping of Ballot ids to the corresponding VoteOptions
    mapping(uint256 => VoteOption[]) public voteOptions;

    constructor() {
        console.log("Deploying a Pool");
    }

    function createBallot(
        string calldata _description,
        string[] calldata _options,
        uint256 _deadline
    ) external {
        uint256 optionsLength = _options.length;
        uint256 ballotsLength = ballots.length;
        for (uint256 i = 0; i < optionsLength; i++) {
            voteOptions[ballotsLength].push(
                VoteOption({ description: _options[i], voteCount: 0 })
            );
        }
        ballots.push(
            Ballot({
                creator: msg.sender,
                description: _description,
                deadline: _deadline + block.timestamp
            })
        );
    }

    function vote(uint256 _ballotId, uint256 _optionId) external {
        require(_ballotId < ballots.length, "Invalid ballot id");
        require(
            ballots[_ballotId].deadline > block.timestamp,
            "This ballot has ended"
        );
        require(_optionId < voteOptions[_ballotId].length, "Invalid option");
        require(
            registers[msg.sender][_ballotId].voted == false,
            "You already voted on this ballot"
        );
        registers[msg.sender][_ballotId] = Register({
            voted: true,
            option: _optionId
        });
        voteOptions[_ballotId][_optionId].voteCount += 1;
    }

    function getBallots() external view returns (Ballot[] memory) {
        return ballots;
    }

    function getVoteOptions(uint256 _ballotId)
        external
        view
        returns (VoteOption[] memory)
    {
        return voteOptions[_ballotId];
    }
}
