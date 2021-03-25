usePlugin("@nomiclabs/buidler-ethers");

const url = process.env.RPC_NODE_URL || "http://localhost:8545"

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  defaultNetwork: "espresso",
  networks: {
    espresso: {
      timeout: 60 * 1000,
      url,
      gas: 6000000,
    },
  },

  // This is a sample solc configuration that specifies which version of solc to use
  solc: {
    version: "0.5.10",
  },
};
