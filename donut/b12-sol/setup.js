const fs = require("fs")
const Kit = require("@celo/contractkit")
const Web3 = require("web3")
const { sleep } = require("@celo/base")

const devAccounts = JSON.parse(fs.readFileSync("../localenv/dev-accounts.json"))

const url = process.env.RPC_URL || "http://localhost:8545"
const address = process.env.FUNDED_ADDRESS || "0xd927E9e733a46f46e18528148D8b98E496545f66" // validator 0
const kit = Kit.newKit(url)

before(async () => {
  await sleep(2000)
  await kit.web3.eth.personal.unlockAccount(address, '', 100000)
})

after(async () => {
  await kit.web3.eth.personal.lockAccount(address)
})