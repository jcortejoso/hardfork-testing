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


