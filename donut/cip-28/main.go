package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"math/big"
	"os"

	"github.com/celo-org/celo-blockchain/log"
	"github.com/celo-org/kliento/client"

	"github.com/celo-org/celo-blockchain/common"
)

var ctx = context.Background()

var (
	rpcEndPoint         = flag.String("rpc", "http://localhost:8545/", "RPC Endpoint for the celo node")
	activationBlock     = flag.Uint64("activationblock", 0, "Activation block number for etherbase split hardfork")
	blockWindow         = flag.Uint64("window", 20, "Number of block to inspect (before & after)")
	validatorAddressStr = flag.String("validator", "", "Validator address")
	txFeeAddressStr     = flag.String("txfeerecipient", "", "Tx Fee address")
)

type blockRange struct {
	from, to uint64
}

func main() {
	log.Root().SetHandler(log.LvlFilterHandler(log.LvlInfo, log.StreamHandler(os.Stderr, log.TerminalFormat(true))))

	flag.Parse()

	// Validate flag values

	if *activationBlock == 0 {
		fmt.Println("Missing required flag -activationblock (must be > 0)")
		flag.PrintDefaults()
		os.Exit(1)
	}

	if *validatorAddressStr == "" {
		fmt.Println("Missing required flag -validator")
		flag.PrintDefaults()
		os.Exit(1)
	}

	if *txFeeAddressStr == "" {
		fmt.Println("Missing required flag -txfeerecipient")
		flag.PrintDefaults()
		os.Exit(1)
	}

	validatorAddress, ok := parseAddress(*validatorAddressStr)
	if !ok {
		fmt.Println("validator: Invalid address format: " + *validatorAddressStr)
		flag.PrintDefaults()
		os.Exit(1)
	}

	txFeeRecipientAddress, ok := parseAddress(*txFeeAddressStr)
	if !ok {
		fmt.Println("txfeerecipient: Invalid address format: " + *txFeeAddressStr)
		flag.PrintDefaults()
		os.Exit(1)
	}

	if validatorAddress == txFeeRecipientAddress {
		fmt.Println("Bad options: -txfeerecipient & -validator must be different addresses")
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

	// Run Tests
	log.Info("Testing for CIP-28: Split Etherbase")
	err = testCIPNotActive(ctx, cc, blockRange{from: *activationBlock - *blockWindow - 1, to: *activationBlock - 1}, validatorAddress)
	if err != nil {
		fmt.Printf("Test Failed: testCIPNotActive error: %s\n", err)
		os.Exit(1)
	}

	err = testCIPAfterActivation(ctx, cc, blockRange{from: *activationBlock, to: *activationBlock + *blockWindow}, validatorAddress, txFeeRecipientAddress)
	if err != nil {
		fmt.Printf("Test Failed: testCIPAfterActivation error: %s\n", err)
		os.Exit(1)
	}
}

func testCIPAfterActivation(ctx context.Context, cc *client.CeloClient, blocks blockRange, validator common.Address, txFeeRecipient common.Address) error {
	log.Info("Analyzing blocks after activation", "from", blocks.from, "to", blocks.to)

	foundOne := false
	for currentNumber := blocks.from; currentNumber <= blocks.to; currentNumber++ {
		header, err := cc.Eth.HeaderByNumber(ctx, new(big.Int).SetUint64(currentNumber))
		if err != nil {
			log.Error("Error fetching block header", "block_number", currentNumber)
			return err
		}

		author, err := ecrecover(header)
		if err != nil {
			log.Error("Error recovering block signer", "block_number", currentNumber)
			return err
		}

		if author == validator {
			if author == header.Coinbase {
				log.Error("CIP Error: block signer == block coinbase after activation block")
				return errors.New("CIP Error: block signer == block coinbase after activation block")
			}
			if header.Coinbase != txFeeRecipient {
				log.Error("CIP Error: block coinbase != tx fee recipient after activation block")
				return errors.New("CIP Error: block coinbase != tx fee recipient after activation block")
			}
			foundOne = true
			log.Info("Found valid block by author", "block_number", currentNumber)
		}
	}

	if foundOne {
		return nil
	}
	return fmt.Errorf("Can't find any blocks signed by %s before activation block", validator)
}

func testCIPNotActive(ctx context.Context, cc *client.CeloClient, blocks blockRange, validator common.Address) error {
	log.Info("Analyzing blocks before activation", "from", blocks.from, "to", blocks.to)

	foundOne := false
	for currentNumber := blocks.from; currentNumber <= blocks.to; currentNumber++ {
		header, err := cc.Eth.HeaderByNumber(ctx, new(big.Int).SetUint64(currentNumber))
		if err != nil {
			log.Error("Error fetching block header", "block_number", currentNumber)
			return err
		}

		author, err := ecrecover(header)
		if err != nil {
			log.Error("Error recovering block signer", "block_number", currentNumber)
			return err
		}

		if author == validator {
			if author != header.Coinbase {
				log.Error("CIP Error: block signer != block coinbase before activation block")
				return errors.New("CIP Error: block signer != block coinbase before activation block")
			}
			foundOne = true
			log.Info("Found valid block by author", "block_number", currentNumber)

		}
	}

	if foundOne {
		return nil
	}
	return fmt.Errorf("Can't find any blocks signed by %s before activation block", validator)
}
