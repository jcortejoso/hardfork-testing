

.PHONY: geth localenv contracts

CELO_BLOCKCHAIN ?= ../../celo-blockchain
CELO_MONOREPO ?= ../../celo-monorepo
BUILDPATH = $(CELO_MONOREPO)/packages/protocol/build/contracts

LOCALENV = ./localenv
BIN = ./bin
B12SOL = ./b12-sol
mycelo = $(BIN)/mycelo


localenv: geth
	@echo "Generating genesis.json"
	$(mycelo) genesis-from-config --buildpath $(BUILDPATH) ./localenv

geth:
	@echo "Building celo-blockchain"
	mkdir -p $(BIN)
	cd $(CELO_BLOCKCHAIN) && make all
	cp $(CELO_BLOCKCHAIN)/build/bin/geth $(BIN)
	cp $(CELO_BLOCKCHAIN)/build/bin/mycelo $(BIN)

contracts:
	@echo "Compiling Contracts"
	cd $(CELO_MONOREPO)/packages/protocol && yarn truffle compile

precompiles:
	@echo "Installing dependencies for b12-sol (precompile tests)"
	cd $(B12SOL)
	npm install

cip28:
	go build -o $(BIN)/cip28 ./cip-28

cip21:
	go build -o $(BIN)/cip21 ./cip-21

all: localenv cip28 cip21 precompiles
