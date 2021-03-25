const { assert } = require("chai");
const Web3 = require("web3");
const { BLS } = require('bls12377js')
const Big = require("big-integer")

require("../setup")

const url = process.env.RPC_NODE_URL || "http://localhost:8545"

describe("CIP 26 (getValidatorBLS)", function () {
    let instance;
    let blockNumber;
    let rpcResult;
    let web3 = new Web3(url);
    web3.extend({methods: [{name: 'getBLS', call: 'istanbul_getValidatorsBLSPublicKeys', params: 1, inputFormatter: [web3.utils.numberToHex]}]})
    this.timeout(60000);

    before(async () => {
        const contract = await ethers.getContractFactory("CIP26Lib");
        blockNumber = await ethers.provider.getBlockNumber();
        rpcResult = await web3.getBLS(blockNumber);
        instance = await contract.deploy();
    });

    it('sanity check that there is at least one test to run', () => {
        assert.notEqual(rpcResult.length, 0, "API call for BLS keys gave no results")
    })

    it(`gets the correct BLS key for each validator`, async () => {
        const n = Math.min(rpcResult.length, 10) // no need to test more than 10
        for (let index = 0; index < n; index++) {
            console.log("Checking for validator", index)
            let result = await instance.getKey(index, blockNumber)
            // The precompile gives the uncompressed key, while the API gives compressed
            // so we split up the precompile's result and then compare to what you get
            // when you decompress what the API gave
            result = result.slice(2)
            let actualPieces = [
                result.slice(0, 128),
                result.slice(128, 256),
                result.slice(256, 384),
                result.slice(384, 512),
            ].map(hex => Big(hex, 16))

            const expectedCompressed = rpcResult[index]
            const expectedG2 = BLS.decompressG2(new Buffer(expectedCompressed.slice(2), "hex"))
            const expectedX = expectedG2.x().toFs()
            const expectedY = expectedG2.y().toFs()
            const expectedPieces = [
                expectedX[0].toBig(),
                expectedX[1].toBig(),
                expectedY[0].toBig(),
                expectedY[1].toBig(),
            ]
            for (let i = 0; i < 4; i++) {
                const actual = actualPieces[i]
                const expected = expectedPieces[i]
                assert(actual.compare(expected) === 0, `Mismatch for index ${index} at block ${blockNumber}: expected ${expected.toString(16)} actual ${actual.toString(16)}`)
            }
        }
    })
});
