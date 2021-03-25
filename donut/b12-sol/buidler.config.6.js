usePlugin("@nomiclabs/buidler-ethers");

const url = process.env.RPC_NODE_URL || "http://localhost:8545"

module.exports = {
  defaultNetwork: "espresso",
  networks: {
    espresso: {
      timeout: 60 * 1000,
      url,
      gas: 6000000,
    },
  },
  solc: {
    version: "0.6.8",
  },
};
