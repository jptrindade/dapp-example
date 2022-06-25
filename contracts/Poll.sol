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
    VoteOption[] options;
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

    constructor() {
        console.log("Deploying a Pool");
    }

    function createPoll(
        string calldata _description,
        string[] calldata _options,
        uint256 _deadline
    ) external {
        uint256 optionsLength = _options.length;
        VoteOption[] memory options = new VoteOption[](optionsLength);
        for (uint256 i = 0; i < optionsLength; i++) {
            options[i] = VoteOption({
                description: _options[i],
                voteCount: 0
            });
        }
        ballots.push(
            Ballot({
                creator: msg.sender,
                description: _description,
                deadline: _deadline,
                options: options
            })
        );
    }

    function vote(uint256 _ballotId, uint256 _optionId) external {
        require(_ballotId < ballots.length, "Invalid ballot id");
        require(
            ballots[_ballotId].deadline < block.timestamp,
            "This ballot has ended"
        );
        require(
            _optionId < ballots[_ballotId].options.length,
            "Invalid option"
        );
        require(
            registers[msg.sender][_ballotId].voted == false,
            "You already voted on this ballot"
        );
        registers[msg.sender][_ballotId] = Register({
            voted: true,
            option: _optionId
        });
        ballots[_ballotId].options[_optionId].voteCount += 1;
    }
}
