# Simple Vesting Contract

This is a simple vesting contract that allows an owner to periodically release a certain token to addresses.

### Usage
Here is a rundown of how the vesting contract can be used:

The owner calls the constructor of `VestingContract` giving the address of the token that they want to vest;

The owner transfers a certain amount of tokens to be made available for vesting;

The owner calls `createVestingSchedule` with the address of the receiver of the tokens, a timestamp signaling when the vesting should start and the amount of the tokens the receiver will get;

Every 3 months after the timestamp, the owner or the receiver can call the `release` function to release the vested tokens to the receiver's address.

### Testing

A few tests were developed detailing specific use cases and exceptions that might occur, if you want to run the tests follow the steps below.

## Pre Requisites

This creates a copy of .env to ensure the necessary environment variables are set:
```sh
cp .env.example .env
```

Install packages:

```sh
yarn install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
$ yarn compile
```

### TypeChain

Compile the smart contracts and generate TypeChain artifacts:

```sh
$ yarn typechain
```

### Test

Run the Mocha tests:

```sh
$ yarn test
```

