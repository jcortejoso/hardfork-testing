# Donut Testing

This folder contains test script to verify all DONUT CIPs

Testing should work on any tesnet. In particular, testing should be done:

 * On mycelo local testnet
 * On a pre-harfork k8s testnet
 * On baklava

## Mycelo Local Testing

Requirements:
* Make sure you have `celo-blockchain` & `celo-monorepo` projects downloaded and updated.
* Make sure `celo-monorepo` protocol contracts are compiled (run `yarn truffle compile` inside `packages/protocol`)

First, define environment variables `CELO_MONOREPO` and `CELO_BLOCKCHAIN`

```bash
export CELO_MONOREPO=/path/to/celo-monorepo
export CELO_BLOCKCHAIN=/path/to/celo-blockchain
```

Then run:

```bash
make all
```

This will put `geth` and `mycelo` binaries on `./bin/`. And also generates a `genesis.json` on `./localenv`


### Config

On `localenv/genesis-config.json` we have a environment with:

 * block period: 2s
 * epoch size: 50
 * lookbackWindow pre-hardfork: 6
 * lookbackWindow post-hardfork: 10
 * accounts mnemonic: mouse gym name soon awake claim decline midnight trash rhythm execute dirt
 * donut & churrito activation Block: 60

## Instructions

You need to have a full archive node available with an account with funds in it, and with the RPC APIs enabled, including 'istanbul' besides the usual ones.  You will need the node's url (which can be a public url or on localhost if you're using port forwarding), and the account's address and private key.

If you're using mycelo, to make it run in archive mode, you can do:

```
mycelo validator-run --extraflags "--gcmode archive"
```

For other testnets, use the so-called "private tx nodes", since these use archive mode, or spin up your own node for it.

NOTE: See the CIP21 and CIP28 below for conditions which should hold before you set Donut activation, as these tests depend on them.

# Javascript tests

These tests cover the following CIPs, and can be run any time after Donut activation:

* CIP 25: Ed25519 Precompile
* CIP 31: BLS Curve Operations on 12-381
* CIP 30: BLS Curve Operations on 12-377
* CIP 20: Extensible Hash Function Precompile
* CIP 26: Precompile for getting a validator's BLS public key
* CIP 35: Support for Ethereum-compatible transactions

```
cd b12sol
npm install
export RPC_NODE_URL=[the url, default which works for mycelo: http://localhost:8545]
export RPC_NODE_ADDRESS=[the address, default which works for mycelo: 0xd927E9e733a46f46e18528148D8b98E496545f66 ]
export RPC_NODE_URL=[private key (without 0x prefix), default which works for mycelo: 5b278a5547041600410532c3bb4d4bcb7ed42b030763b55789918d56e7910d1b]
npm run test
```

# Golang tests

# CIP 22 (epoch snark data)

See instructions in `cip-22/README.md`

# CIP 21

To run this test, you have to wait for an epoch change following Donut activation (you can't run it if the network is still in the same epoch in which donut was activated).  You also have to make sure that Donut activation will actually change the lookbackwindow for the next epoch (you should set the lookback window on the BlockchainParameters contract to be something besides 12 in the epoch before activation, or earlier)

```
make cip21
./bin/cip21 --rpc [rpc url] --activationblock [donut block] --epoch [epoch size] --value-before [the initial lookback window value, usually 6 with mycelo or 12 otherwise] --value-after [the value you set on the contract]
```

# CIP 28

To run this test, before Donut activation, your validators (or at least one of them) should be running using the `--miner.validator` and `--tx-fee-recipient` flags with different addresses for the two.  You will need these addresses for such a validator available.

```
make cip28
./bin/cip28 --rpc [rpc url] --activationblock [donut block] --window [4 * number of validators, or something like that] --validator [miner.validator address] --txfeerecipient [tx-fee-recipient address]
```
