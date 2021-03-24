const fs = require("fs")
const Kit = require("@celo/contractkit")
const Web3 = require("web3")
const { sleep } = require("@celo/base")

const devAccounts = JSON.parse(fs.readFileSync("../localenv/dev-accounts.json"))

const url = process.env.RPC_NODE_URL || "http://localhost:8545"
const address = process.env.RPC_NODE_ADDRESS || "0xd927E9e733a46f46e18528148D8b98E496545f66" // validator 0
const privateKey = process.env.RPC_NODE_PRIVATE_KEY || "5b278a5547041600410532c3bb4d4bcb7ed42b030763b55789918d56e7910d1b"
const kit = Kit.newKit(url)

module.exports = { address, privateKey, url }

before(async () => {
  await sleep(2000)
  await kit.web3.eth.personal.unlockAccount(address, '', 100000)
})

after(async () => {
  await kit.web3.eth.personal.lockAccount(address)
})