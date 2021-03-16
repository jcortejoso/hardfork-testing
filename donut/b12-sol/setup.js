const fs = require("fs")
const Kit = require("@celo/contractkit")
const Web3 = require("web3")
const { sleep } = require("@celo/base")

const devAccounts = JSON.parse(fs.readFileSync("../localenv/dev-accounts.json"))

const url ="http://localhost:8545"
const privateKey = devAccounts[0].privateKey
const address = devAccounts[0].address
const kit = Kit.newKit(url)
let gethAddress

module.exports = {url, privateKey, address}

before(async () => {
  const accounts = await kit.web3.eth.personal.getAccounts()
  gethAddress = accounts[0]
  const balance = await kit.connection.getBalance(gethAddress)
  if (balance.length < 18) {
    await kit.connection.addAccount(privateKey)
    await kit.sendTransaction({
      from: address,
      to: gethAddress,
      value: Web3.utils.toWei("1", "ether").toString()
    })
    await sleep(5000)
  }
  await kit.web3.eth.personal.unlockAccount(gethAddress, '', 100000)
})

after(async () => {
  await kit.web3.eth.personal.lockAccount(gethAddress)
})