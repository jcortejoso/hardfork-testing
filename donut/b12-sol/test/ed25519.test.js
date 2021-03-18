const { assert } = require("chai");

const ed25519 = require("./ed25519.json");

require("../setup")

describe("CIP 25 (ed25519 verify)", function () {
  let instance;
  this.timeout(60000);

  before(async () => {
    const contract = await ethers.getContractFactory("CIP25Lib");
    instance = await contract.deploy();
  });

  it("has 8 test cases", () => {
      // Sanity check to ensure we are loading the test cases correctly
      assert.equal(ed25519.length, 8)
  })

  for (const {name, input, expected} of ed25519) {
      it(name, async () => {
          const result = await instance.verify("0x" + input)
          assert.equal(result, "0x" + expected)
      })
  }
});
