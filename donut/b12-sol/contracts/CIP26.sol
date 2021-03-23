pragma solidity >=0.5.10;

library CIP26Lib {
    uint8 private constant CIP26_ADDRESS = 0xE1;

    function getKey(uint256 index, uint256 blockNumber) public view returns (bytes memory) {
        bytes memory out;
        bool success;
        (success, out) = address(CIP26_ADDRESS).staticcall(abi.encodePacked(index, blockNumber));
        require(success, "error calling getValidatorBLS precompile");
        require(out.length == 256, "bad getValidatorBLS result length");
        return out;
    }
}