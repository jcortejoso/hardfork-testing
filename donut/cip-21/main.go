package main

import (
	"context"
	"flag"
	"fmt"
	"os"

	"github.com/celo-org/celo-blockchain/common/hexutil"
	"github.com/celo-org/celo-blockchain/consensus/istanbul"
	"github.com/celo-org/celo-blockchain/log"
	"github.com/celo-org/kliento/client"
)

var ctx = context.Background()

var (
	rpcEndPoint       = flag.String("rpc", "http://localhost:8545/", "RPC Endpoint for the celo node")
	activationBlock   = flag.Uint64("activationblock", 0, "Activation block number for etherbase split hardfork")
	epochSize         = flag.Uint64("epoch", 0, "Epoch Size")
	preHardForkValue  = flag.Uint64("value-before", 0, "Lookback Window value before hardfork")
	postHardForkValue = flag.Uint64("value-after", 0, "Lookback Window value after hardfork")
)

func main() {
	log.Root().SetHandler(log.LvlFilterHandler(log.LvlInfo, log.StreamHandler(os.Stderr, log.TerminalFormat(true))))

	flag.Parse()

	// Validate flag values

	if *activationBlock == 0 {
		fmt.Println("Missing required flag -activationblock (must be > 0)")
		flag.PrintDefaults()
		os.Exit(1)
	}

	if *epochSize == 0 {
		fmt.Println("Missing required flag -epoch (must be > 0)")
		flag.PrintDefaults()
		os.Exit(1)
	}
	if *preHardForkValue == 0 {
		fmt.Println("Missing required flag -value-before (must be > 0)")
		flag.PrintDefaults()
		os.Exit(1)
	}

	if *postHardForkValue == 0 {
		fmt.Println("Missing required flag -value-after (must be > 0)")
		flag.PrintDefaults()
		os.Exit(1)
	}

	if *preHardForkValue == *postHardForkValue {
		fmt.Println("Bad options: -value-after & -value-before must be different")
		flag.PrintDefaults()
		os.Exit(1)
	}

	cc, err := client.Dial(*rpcEndPoint)
	if err != nil {
		fmt.Printf("Can't open connection to blockchain node. url=%s  err=%s\n", *rpcEndPoint, err)
		os.Exit(1)
	}

	latest, err := cc.Eth.HeaderByNumber(ctx, nil)
	if err != nil {
		fmt.Printf("Error Getting Latest Block. err = %s\n", err)
		os.Exit(1)
	}

	if latest.Number.Uint64() < *activationBlock {
		fmt.Printf("Node's latest block (%d) must be bigger than HardFork activation block (%d)\n", latest.Number.Uint64(), *activationBlock)
		os.Exit(1)
	}

	// choose three points

	// lastBlock epoch before activation
	activationEpoch := istanbul.GetEpochNumber(*activationBlock, *epochSize)

	if activationEpoch == 1 {
		fmt.Printf("Hardfork activation epoch must be bigger than 1\n")
		os.Exit(1)
	}

	blockOnEpochBeforeHF := istanbul.GetEpochLastBlockNumber(activationEpoch-1, *epochSize)
	firstBlockActivationHFEpoch, err := istanbul.GetEpochFirstBlockNumber(activationEpoch-1, *epochSize)
	if err != nil {
		fmt.Printf("Error computing first block of epoch: err=%s", err)
		os.Exit(1)
	}
	lastBlockActivationHFEpoch := istanbul.GetEpochLastBlockNumber(activationEpoch-1, *epochSize)
	firstBlockNextEpoch, err := istanbul.GetEpochFirstBlockNumber(activationEpoch+1, *epochSize)
	if err != nil {
		fmt.Printf("Error computing first block of epoch: err=%s", err)
		os.Exit(1)
	}

	if latest.Number.Uint64() < firstBlockNextEpoch {
		fmt.Printf("Node's latest block (%d) must be bigger than %d\n", latest.Number.Uint64(), firstBlockNextEpoch)
		os.Exit(1)
	}

	// Run Tests
	log.Info("Testing for CIP-21: Governable LookbackWindow")

	// Before Epoch value must be "before value"
	var value uint64
	value, err = getLookbackWindow(ctx, cc, blockOnEpochBeforeHF)
	if err != nil {
		fmt.Printf("Failed to obtain lookbackWindow for block %d (err=%s)\n", blockOnEpochBeforeHF, err)
		os.Exit(1)
	}

	if value != *preHardForkValue {
		fmt.Printf("Test Failed: LookbackWindow value pre hardfork should be %d but is %d (blockNumber=%d)\n", *preHardForkValue, value, blockOnEpochBeforeHF)
		os.Exit(1)
	}

	value, err = getLookbackWindow(ctx, cc, firstBlockActivationHFEpoch)
	if err != nil {
		fmt.Printf("Failed to obtain lookbackWindow for block %d (err=%s)\n", firstBlockActivationHFEpoch, err)
		os.Exit(1)
	}
	if value != *preHardForkValue {
		fmt.Printf("Test Failed: LookbackWindow value on hardfork's epoch should be %d but is %d (blockNumber=%d)\n", *preHardForkValue, value, firstBlockActivationHFEpoch)
		os.Exit(1)
	}

	value, err = getLookbackWindow(ctx, cc, lastBlockActivationHFEpoch)
	if err != nil {
		fmt.Printf("Failed to obtain lookbackWindow for block %d (err=%s)\n", lastBlockActivationHFEpoch, err)
		os.Exit(1)
	}
	if value != *preHardForkValue {
		fmt.Printf("Test Failed: LookbackWindow value on hardfork's epoch should be %d but is %d (blockNumber=%d)\n", *preHardForkValue, value, lastBlockActivationHFEpoch)
		os.Exit(1)
	}

	value, err = getLookbackWindow(ctx, cc, firstBlockNextEpoch)
	if err != nil {
		fmt.Printf("Failed to obtain lookbackWindow for block %d (err=%s)\n", firstBlockNextEpoch, err)
		os.Exit(1)
	}
	if value != *postHardForkValue {
		fmt.Printf("Test Failed: LookbackWindow value post hardfork should be %d but is %d (blockNumber=%d)\n", *postHardForkValue, value, firstBlockNextEpoch)
		os.Exit(1)
	}
}

func getLookbackWindow(ctx context.Context, cc *client.CeloClient, blockNumber uint64) (uint64, error) {
	var value uint64

	err := cc.Rpc.Call(&value, "istanbul_getLookbackWindow", hexutil.EncodeUint64(uint64(blockNumber)))
	if err != nil {
		return 0, err
	}
	return value, nil
}
