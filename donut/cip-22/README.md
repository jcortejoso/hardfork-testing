### Setup

1. Install rust
2. Clone the following repos as siblings in the same directory:
  - https://github.com/lucasege/plumo-prover and check out the branch lucasege/cip22
  - https://github.com/kobigurk/ethers-rs and check out the branch kobigurk/validators_keys
  - https://github.com:celo-org/celo-bls-snark-rs and check out master
4. In plumo-prover, `cargo build --release`
5. Make sure your network (mycelo, testnet, baklava) has been running for at least one full epoch after Donut activation and is accessible at http://localhost:8545 (if not, override the url using the flag)
6. Determine the arguments to use:
   --epoch-duration epoch size
   --start-block an epoch block after donut activation
   --end-block the next epoch bock after --start-block
   --maximum-validators 150
   --maximum-nonsigners 150 minus the number of validators you have
   --node-url full node running RPC and including the istanbul API, besides the usual ones (if not http://localhost:8545)
7. Run `./target/release/plumo` with the arguments listed above.  However, RAM usage is a problem we still need to resolve.