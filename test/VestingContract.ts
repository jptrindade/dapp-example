import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ExampleToken, ExampleToken__factory, VestingContract, VestingContract__factory } from "../src/types";

describe("Vesting Contract", function () {
  let contract: VestingContract;
  let token: ExampleToken;
  let owner: SignerWithAddress;
  let signed1: SignerWithAddress;
  let timestampBefore: number;
  // one month in seconds
  const MONTH = 30 * 24 * 60 * 60;
  beforeEach(async function () {
    const VestingFactory = (await ethers.getContractFactory("VestingContract")) as VestingContract__factory;
    const ExampleTokenFactory = (await ethers.getContractFactory("ExampleToken")) as ExampleToken__factory;
    token = await ExampleTokenFactory.deploy(100000);
    contract = await VestingFactory.deploy(token.address);
    [owner, signed1] = await ethers.getSigners();
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

  it("it should return the full amount after vesting ends", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    await contract.createVestingSchedule(receiver, timestampBefore, 50);
    let vesting_end = timestampBefore + 12 * MONTH;
    await ethers.provider.send("evm_mine", [vesting_end]);
    await contract.release(receiver);

    expect(await token.balanceOf(receiver)).equal(50);
  });

  it("it should fail because vesting schedule has not started", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    await contract.createVestingSchedule(receiver, timestampBefore + MONTH, 50);
    await expect(contract.release(receiver)).to.be.revertedWith("Vesting period has not started yet");
  });

  it("it should fail because the address is not allowed to release vested tokens", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    await contract.createVestingSchedule(receiver, timestampBefore, 50);
    let vesting_end = timestampBefore + 12 * MONTH;
    await ethers.provider.send("evm_mine", [vesting_end]);

    await expect(contract.connect(signed1).release(receiver)).to.be.revertedWith(
      "Only receiver and owner can release vested tokens",
    );
  });

  it("it should not allow release after the entire balance was transferred", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    await contract.createVestingSchedule(receiver, timestampBefore, 50);
    let vesting_end = timestampBefore + 12 * MONTH;
    await ethers.provider.send("evm_mine", [vesting_end]);
    await contract.release(receiver);

    await expect(contract.release(receiver)).to.be.revertedWith("All tokens have been released already");
  });

  it("it should respect the vesting schedule release thresholds", async function () {
    let receiver = ethers.Wallet.createRandom().address;
    await token.transfer(contract.address, 100);

    await contract.createVestingSchedule(receiver, timestampBefore, 100);
    await contract.release(receiver);
    expect(await token.balanceOf(receiver)).equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + MONTH]);
    await contract.release(receiver);
    expect(await token.balanceOf(receiver)).equal(0);

    await ethers.provider.send("evm_mine", [timestampBefore + 3 * MONTH]);
    await contract.release(receiver);
    expect(await token.balanceOf(receiver)).equal(25);

    await ethers.provider.send("evm_mine", [timestampBefore + 6 * MONTH]);
    await contract.release(receiver);
    expect(await token.balanceOf(receiver)).equal(50);

    await ethers.provider.send("evm_mine", [timestampBefore + 9 * MONTH]);
    await contract.release(receiver);
    expect(await token.balanceOf(receiver)).equal(75);

    await ethers.provider.send("evm_mine", [timestampBefore + 12 * MONTH]);
    await contract.release(receiver);
    expect(await token.balanceOf(receiver)).equal(100);
  });

  it("it should work for 50 addresses", async function () {
    await token.transfer(contract.address, 50000);

    let receiverInfo = [];
    for (let i = 0; i < 50; i++) {
      let address = ethers.Wallet.createRandom().address;
      let totalAmount = Math.floor(Math.random() * 1000);
      receiverInfo.push({
        address: address,
        totalAmount: totalAmount,
        amountReleased: 0,
      });
      await contract.createVestingSchedule(address, timestampBefore, totalAmount);
    }

    for (let threshold = 1; threshold < 5; threshold++) {
      await ethers.provider.send("evm_mine", [timestampBefore + 3 * threshold * MONTH]);
      for (let i = 0; i < 50; i++) {
        await contract.release(receiverInfo[i].address);
        if (threshold == 4) receiverInfo[i].amountReleased = receiverInfo[i].totalAmount;
        else receiverInfo[i].amountReleased += Math.floor(receiverInfo[i].totalAmount / 4);
        expect(await token.balanceOf(receiverInfo[i].address)).equal(receiverInfo[i].amountReleased);
      }
    }
  });
});
