// tslint:disable:no-console
const { newKitFromWeb3 } = require("@celo/contractkit");
import { ContractKit} from "@celo/contractkit"
const { assert } = require("chai");
const ejsUtil = require("ethereumjs-util");
const lodash = require("lodash");
import Web3 from "web3";
import BigNumber from "bignumber.js"
const { Promise: bluebirdPromise } = require("bluebird");

const {address: nodeAddress, privateKey: nodePrivateKey, url} = (require("../setup") as any)


const notCompatibleError =
  "ethCompatible is true, but non-eth-compatible fields are present";
const noReplayProtectionError = "replay protection is required";

// Arbitrary addresses to use in the transactions
const toAddress = "0x8c36775E95A5f7FEf6894Ba658628352Ac58605B";
const gatewayFeeRecipientAddress = "0xc77538d1e30C0e4ec44B0DcaD97FD3dc63fcaCC4";

// Simple contract with a single constant
const bytecode =
  "0x608060405260008055348015601357600080fd5b5060358060216000396000f3006080604052600080fd00a165627a7a72305820c7f3f7c299940bb1d9b122d25e8f288817e45bbdeaccdd2f6e8801677ed934e70029";

///////// Configurable values to run only some of the tests during development ////////////////
// ReplayProtectionTests lets you skip or run only the replay-protection tests during dev
// Value when committing should be "run"
// tslint:disable-next-line
let replayProtectionTests: "run" | "skip" | "only" = "run";
// devFilter can be used during development to only run a subset of testcases.
// But if you're going to commit you should set them all back to undefined (i.e. no filter).
const devFilter: Filter = {
  ethCompatible: undefined,
  contractCreation: undefined,
  useFeeCurrency: undefined,
  useGatewayFee: undefined,
  useGatewayFeeRecipient: undefined,
  sendRawTransaction: undefined,
};
///////////////////////////////////////////////////////////////////////////////////////////////

// Filter specifies which subset of cases to generate.
// (e.g. {lightNode: true, sendRawTransaction: false} makes it only run cases which send through a light
// node using `eth_sendRawTransaction`
type Filter = Partial<TestCase>;

// TestCase describes the specific case we want to test
interface TestCase {
  ethCompatible: boolean;
  contractCreation: boolean;
  useFeeCurrency: boolean;
  useGatewayFee: boolean;
  useGatewayFeeRecipient: boolean;
  sendRawTransaction: boolean; // whether to use eth_sendRawTransaction ot eth_sendTransaction
  errorString: string | null;
  errorReason: string | null;
}

// generateTestCases is used to generate all the cases we want to test for a setup which
// is either pre-Donut or post-Donut (cipIsActivated true means post-Donut)
function generateTestCases() {
  const cases: TestCase[] = [];
  const getValues = (fieldFilter: boolean | undefined) => {
    return fieldFilter === undefined ? [false, true] : [fieldFilter];
  };
  // Generate all possible combinations (but some are invalid and excluded using 'continue' below)
  for (const ethCompatible of getValues(devFilter.ethCompatible)) {
    for (const contractCreation of getValues(devFilter.contractCreation)) {
      for (const useFeeCurrency of getValues(devFilter.useFeeCurrency)) {
        for (const useGatewayFee of getValues(devFilter.useGatewayFee)) {
          for (const useGatewayFeeRecipient of getValues(
            devFilter.useGatewayFeeRecipient
          )) {
            for (const sendRawTransaction of getValues(
              devFilter.sendRawTransaction
            )) {
              let errorString: string | null = null;
              let errorReason: string | null = null;
              const hasCeloFields =
                useFeeCurrency || useGatewayFee || useGatewayFeeRecipient;
              if (ethCompatible && hasCeloFields) {
                errorString = notCompatibleError;
                errorReason = "transaction has celo-only fields";
              }
              if (sendRawTransaction && ethCompatible && hasCeloFields) {
                // Such scenarios don't make sense, since eth-compatible transactions in RLP can't have
                // these fields.  So skip these cases.
                continue;
              }
              cases.push({
                ethCompatible,
                contractCreation,
                useFeeCurrency,
                useGatewayFee,
                useGatewayFeeRecipient,
                sendRawTransaction,
                errorString,
                errorReason,
              });
            }
          }
        }
      }
    }
  }
  return cases;
}

// TestEnv encapsulates a pre-Donut or post-Donut environment and the tests to run on it
class TestEnv {
  testCases: TestCase[];
  chainId: number = 0;
  stableTokenAddr: string = "";
  gasPrice: string = "";

  // There are three cases: (a), (b), and (c) below.
  // (a) contractkit instances without the private key, for transacting using `eth_sendTransaction`
  kit: ContractKit;
  // (b) contractkit instances with the private key, for signing locally (to then use `eth_sendRawTransaction`)
  kitWithLocalWallet: ContractKit;
  // (c) web3 instances with the private key, for generating and signing raw eth-compatible transactions (to then
  // use with `eth_sendRawTransaction`)
  web3: Web3;

  constructor() {
    this.testCases = generateTestCases();
    this.kit = newKitFromWeb3(new Web3(url));
    this.kitWithLocalWallet = newKitFromWeb3(new Web3(url));
    this.web3 = new Web3(url);
  }

  // before() does all the setup needed to then enable the individual test cases to be run
  async before() {
    this.chainId = await this.kit.connection.chainId();
    this.stableTokenAddr = (await this.kit.contracts.getStableToken()).address;
    const gasPriceMinimum = await (
      await this.kit.contracts.getGasPriceMinimum()
    ).gasPriceMinimum();
    this.gasPrice = gasPriceMinimum.times(5).toString();

    await bluebirdPromise.delay(2000);

    // Make sure we can use the validator's address to send transactions
    // For signing on the node, unlock the account (and add it first if it's the light node)
    await this.kit.connection.web3.eth.personal.unlockAccount(
      nodeAddress,
      "",
      1000
    );
    // For the local wallets, add the private key.
    // The web3 instances don't need that, because we use a function that takes in the private key.
    this.kitWithLocalWallet.connection.addAccount(nodePrivateKey);
  }

  async generateUnprotectedTransaction(
    ethCompatible: boolean
  ): Promise<string> {
    const encode = (ejsUtil as any).rlp.encode; // the typescript typings are incomplete
    const numToHex = (x: number | BigNumber) =>
      ejsUtil.bufferToHex(ejsUtil.toBuffer(x));
    const nonce = await this.kit.connection.nonce(nodeAddress);
    const celoOnlyFields = ethCompatible ? [] : ["0x", "0x", "0x"];
    const arr = [
      nonce > 0 ? numToHex(nonce) : "0x",
      numToHex(parseInt(this.gasPrice, 10)),
      numToHex(1000000), // plenty of gas
      ...celoOnlyFields,
      toAddress, // to
      "0x05", // value: 5 wei
      "0x", // no data
    ];
    const signingHash = ejsUtil.rlphash(arr);
    const pk = ejsUtil.addHexPrefix(nodePrivateKey);
    const sig = ejsUtil.ecsign(signingHash, ejsUtil.toBuffer(pk));
    arr.push(
      ejsUtil.bufferToHex(sig.v as any),
      ejsUtil.bufferToHex(sig.r),
      ejsUtil.bufferToHex(sig.s)
    ); // TODO: is the any ok?
    return ejsUtil.bufferToHex(encode(arr));
  }

  runReplayProtectionTests() {
    for (const ethCompatible of [false, true]) {
      this.runReplayProtectionTest(ethCompatible);
    }
  }

  runReplayProtectionTest(ethCompatible: boolean) {
    describe(`Transaction without replay protection, ethCompatible: ${ethCompatible}`, () => {
      let minedTx: any = null; // Use any because we haven't added `ethCompatible` to these types
      let error: string | null = null;

      before(async () => {
        const tx = await this.generateUnprotectedTransaction(ethCompatible);
        try {
          const receipt = await (
            await this.kit.connection.sendSignedTransaction(tx)
          ).waitReceipt();
          minedTx = await this.kit.web3.eth.getTransaction(
            receipt.transactionHash
          );
          error = null;
        } catch (err) {
          error = err.message;
        }
      });

      // Replay protection is mandatory, so the transaction should fail
      it("fails due to replay protection being mandatory", () => {
        assert.isNull(
          minedTx,
          "Transaction succeeded when it should have failed"
        );
        assert.match(
          error!,
          new RegExp(noReplayProtectionError),
          `Got "${error}", expected "${noReplayProtectionError}"`
        );
      });
    });
  }

  runTestCase(testCase: TestCase) {
    // Generate a human-readable summary of the test case
    const options: string[] = [];
    lodash.forEach(testCase, (value: any, key: any) => {
      if (value === true) {
        options.push(key);
      }
    });
    describe(`Testcase with: ${options.join(", ")}`, () => {
      let minedTx: any; // Use any because we haven't added `ethCompatible` to these types
      let error: string | null = null;

      before(async () => {
        const tx: any = {
          from: nodeAddress,
          gas: 1000000, // plenty for both types of transaction
          gasPrice: this.gasPrice,
          chainId: this.chainId,
          nonce: await this.kit.connection.nonce(nodeAddress),
        };
        if (testCase.useFeeCurrency) {
          tx.feeCurrency = this.stableTokenAddr;
        }
        if (testCase.useGatewayFee) {
          tx.gatewayFee = "0x25";
        }
        if (testCase.useGatewayFeeRecipient) {
          tx.gatewayFeeRecipient = gatewayFeeRecipientAddress;
        }

        if (testCase.contractCreation) {
          tx.data = bytecode;
        } else {
          tx.to = await toAddress;
          tx.value = 5;
        }

        try {
          let txHash: string;
          // Use the right contractkit/web3 instances according to whether the testcase say to send
          // the transaction through the validator or the light client
          const k = this.kit;
          const kLocal = this.kitWithLocalWallet;
          const w3 = this.web3;

          if (testCase.sendRawTransaction) {
            // Sign the transaction locally and send using `eth_sendRawTransaction`
            let raw: string;
            if (testCase.ethCompatible) {
              const signed = await w3.eth.accounts.signTransaction(
                tx,
                nodePrivateKey
              );
              raw = signed.rawTransaction!;
            } else {
              const signed = await kLocal.connection.wallet!.signTransaction(
                tx
              );
              raw = signed.raw;
            }
            // Once the transaction is signed and encoded, it doesn't matter whether we send it with web3 or contractkit
            txHash = (await w3.eth.sendSignedTransaction(raw)).transactionHash;
          } else {
            // Send using `eth_sendTransaction`
            const params: any = tx; // haven't added `ethCompatible` to the tx type
            // Only include ethCompatible if it's true.  This confirms that omitting it results to normal Celo
            // transactions, but doesn't test that ethCompatible: false also does.  But we will see in the resulting
            // transaction object (from eth_getTransaction) that it has ethCompatible: false.
            if (testCase.ethCompatible) {
              params.ethCompatible = true;
            }
            const res = await k.sendTransaction(params);
            txHash = (await res.waitReceipt()).transactionHash;
          }

          minedTx = await k.web3.eth.getTransaction(txHash);
          error = null;
        } catch (err) {
          error = err.message;
        }
      });

      // Verify that sending the transaction either worked or failed as expected for this test case
      if (testCase.errorString !== null) {
        it(`fails with the expected error (${testCase.errorReason})`, () => {
          assert.notEqual(error, null, "Expected an error but didn't get one");
          assert.match(
            error!,
            new RegExp(testCase.errorString!, "i"),
            `Got "${error}", expected "${testCase.errorString}"`
          );
        });
      } else {
        it("succeeds", () => {
          assert.equal(
            error,
            null,
            "Got an error but expected the transaction to succeed"
          );
        });
        it(`ethCompatible is ${testCase.ethCompatible}`, () => {
          assert.equal(minedTx.ethCompatible, testCase.ethCompatible);
        });
      }
    });
  }
}

describe("CIP-35 >", function (this: any) {
  this.timeout(0);
  const testEnv = new TestEnv();
  before(async function (this) {
    this.timeout(0);
    await testEnv.before();
  });

  if (replayProtectionTests !== "only") {
    for (const testCase of testEnv.testCases) {
      testEnv.runTestCase(testCase);
    }
  }

  if (replayProtectionTests !== "skip") {
    testEnv.runReplayProtectionTests();
  }

  after(async function (this: any) {
    this.timeout(0);
  });
});
