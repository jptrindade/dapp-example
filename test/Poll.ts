import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { Poll, Poll__factory } from "../src/types";

describe("Poll contract", function () {
  let contract: Poll;
  let owner: SignerWithAddress;
  let timestampBefore: number;
  beforeEach(async function () {
    const PollFactory = (await ethers.getContractFactory(
      "Poll",
    )) as Poll__factory;
    contract = await PollFactory.deploy();
    [owner] = await ethers.getSigners();
    await contract.createBallot("My ballot", ["option 1", "option 2"], 1000);
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore.timestamp;
  });

  describe("Ballot", async function () {
    it("it should create a ballot", async function () {
      // Check ballot properties
      let ballot = await contract.ballots(0);

      expect(ballot.description).to.equal("My ballot");
      expect(ballot.creator).to.equal(owner.address);
      expect(ballot.deadline).to.equal(timestampBefore + 1000);

      // Check if VoteOptions were created
      let voteOptions = await contract.getVoteOptions(0);
      expect(voteOptions.length).to.equal(2);
      expect(voteOptions[0].description).to.equal("option 1");
      expect(voteOptions[0].voteCount).to.equal(0);
      expect(voteOptions[1].description).to.equal("option 2");
      expect(voteOptions[1].voteCount).to.equal(0);
    });

    it("can't vote on invalid ballot", async function () {
      await expect(contract.vote(1, 0)).to.be.revertedWith(
        "Invalid ballot id",
      );
    });

    it("can't vote after deadline", async function () {
      await ethers.provider.send("evm_mine", [timestampBefore + 2000]);
      await expect(contract.vote(0, 0)).to.be.revertedWith(
        "This ballot has ended",
      );
    });

    it("can't vote on invalid ballot", async function () {
      await expect(contract.vote(0, 3)).to.be.revertedWith("Invalid option");
    });

    it("it should register a vote", async function () {
      await contract.vote(0, 0);

      // Check if VoteOptions changed
      let voteOptions = await contract.getVoteOptions(0);
      expect(voteOptions[0].voteCount).to.equal(1);
      expect(voteOptions[1].voteCount).to.equal(0);
    });

    it("can't vote twice on the same option", async function () {
      await contract.vote(0, 0);
      await expect(contract.vote(0, 0)).to.be.revertedWith(
        "You already voted on this ballot",
      );
    });

    it("can't vote twice on same ballot", async function () {
      await contract.vote(0, 0);
      await expect(contract.vote(0, 1)).to.be.revertedWith(
        "You already voted on this ballot",
      );
    });
  });
});
