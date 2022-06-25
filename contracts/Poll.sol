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

contract Poll {
    Ballot[] public ballots;

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
}
