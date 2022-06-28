import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ExampleToken, ExampleToken__factory, VestingContract, VestingContract__factory } from "../src/types";

describe("Vesting Contract", function () {
  let contract: VestingContract;
  let token: ExampleToken;
  let owner: SignerWithAddress;
  let timestampBefore: number;
  beforeEach(async function () {
    const VestingFactory = (await ethers.getContractFactory("VestingContract")) as VestingContract__factory;
    const ExampleTokenFactory = (await ethers.getContractFactory("ExampleToken")) as ExampleToken__factory;
    token = await ExampleTokenFactory.deploy(10000);
    contract = await VestingFactory.deploy(token.address);
    [owner] = await ethers.getSigners();
    const blockNumBefore = await ethers.provider.getBlockNumber();
    const blockBefore = await ethers.provider.getBlock(blockNumBefore);
    timestampBefore = blockBefore.timestamp;
  });

  it("it should fail because of insufficient funds", async function () {
    let receiver = ethers.Wallet.createRandom().address;

    await expect(contract.createVestingSchedule(receiver, timestampBefore, 100)).to.be.revertedWith(
      "Not enough available tokens in contract",
    );
  });

  it("it should create VestingSchedule", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    let availableAmount = await contract.getAvailableAmount();
    expect(availableAmount).equal(100);

    await contract.createVestingSchedule(receiver, timestampBefore, 100);

    let vestingSchedule = await contract.getVestingSchedule(receiver);

    expect(vestingSchedule.receiver).equal(receiver);
    expect(vestingSchedule.start).equal(timestampBefore);
    expect(vestingSchedule.total).equal(100);
    expect(vestingSchedule.released).equal(0);
  });

  it("it should create only one VestingSchedule per address", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    await contract.createVestingSchedule(receiver, timestampBefore, 50);

    await expect(contract.createVestingSchedule(receiver, timestampBefore, 20)).to.be.revertedWith(
      "This receiver already has a VestingSchedule",
    );
  });

  it("it should account for vested tokens", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    let receiver2 = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    await contract.createVestingSchedule(receiver, timestampBefore, 50);

    await expect(contract.createVestingSchedule(receiver2, timestampBefore, 60)).to.be.revertedWith(
      "Not enough available tokens in contract",
    );
  });
});
