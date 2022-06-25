import { expect } from "chai";
import { ethers } from "hardhat";
import { Poll, Poll__factory } from "../src/types";

describe("Poll contract", function () {
  let contract: Poll;
  beforeEach(async function () {
    const PollFactory = (await ethers.getContractFactory(
      "Poll",
    )) as Poll__factory;
    contract = await PollFactory.deploy();
  });

  describe("Ballot", () => {
    it("it should create a ballot", async function () {
      const [owner] = await ethers.getSigners();
      await contract.createBallot("My ballot", ["option 1", "option 2"], 1000);

      // Check ballot properties
      let ballot = await contract.ballots(0);
      expect(ballot.description).to.equal("My ballot");
      expect(ballot.creator).to.equal(owner.address);
      expect(ballot.deadline).to.equal(1000);

      // Check if VoteOptions were created
      let voteOptions = await contract.getVoteOptions(0);
      expect(voteOptions.length).to.equal(2);
      expect(voteOptions[0].description).to.equal("option 1");
      expect(voteOptions[1].description).to.equal("option 2");
    });
  });
});
