#! /usr/bin/env bash

repo="$1"
buildpath="$2"


if [ -z $repo ]; then
  echo "Missing celo-blockchain-path argument"
  echo "Usage: ./script/setup.sh <celo-blockchain-path> <contracts-build-path>"
  exit 1
fi
if [ -z $buildpath ]; then
  echo "Missing contracts-build-path argument"
  echo "Usage: ./script/setup.sh <celo-blockchain-path> <contracts-build-path>"
  exit 1
fi

echo "celo-blockchain path: $repo"

echo "Building celo-blockchain"
(cd $repo; make all)


echo "Copying binaries"
mkdir -p ./bin
cp "$repo/build/bin/geth" ./bin
cp "$repo/build/bin/mycelo" ./bin

echo "Generating genesis.json"
./bin/mycelo genesis-from-config --buildpath "$buildpath" ./localenv