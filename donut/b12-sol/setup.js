const fs = require("fs")

const devAccounts = JSON.parse(fs.readFileSync("../localenv/dev-accounts.json"))

module.exports = {
  privateKey: devAccounts[0].privateKey,
  address: devAccounts[0].address,
}




before(async () => {
  console.log("***** pk", module.exports.privateKey)
  console.log("***** addr", module.exports.address)
})