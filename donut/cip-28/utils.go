package main

import (
	"github.com/celo-org/celo-blockchain/common"
	"github.com/celo-org/celo-blockchain/consensus/istanbul"
	"github.com/celo-org/celo-blockchain/core/types"
	"github.com/celo-org/celo-blockchain/rlp"
	"golang.org/x/crypto/sha3"
)

// ecrecover extracts the block header's signer
func ecrecover(header *types.Header) (common.Address, error) {
	// Retrieve the signature from the header extra-data
	istanbulExtra, err := types.ExtractIstanbulExtra(header)
	if err != nil {
		return common.Address{}, err
	}

	addr, err := istanbul.GetSignatureAddress(sigHash(header).Bytes(), istanbulExtra.Seal)
	if err != nil {
		return addr, err
	}
	return addr, nil
}

func sigHash(header *types.Header) (hash common.Hash) {
	hasher := sha3.NewLegacyKeccak256()

	// Clean seal is required for calculating proposer seal.
	rlp.Encode(hasher, types.IstanbulFilteredHeader(header, false))
	hasher.Sum(hash[:0])
	return hash
}

func parseAddress(addr string) (common.Address, bool) {
	if !common.IsHexAddress(addr) {
		return common.Address{}, false
	}

	return common.HexToAddress(addr), true
}
