pragma solidity >=0.5.10;

library CIP25Lib {
    uint8 private constant CIP25_ADDRESS = 0xF3;

    function verify(bytes memory input) public view returns (bytes memory) {
        bytes memory out;
        bool success;
        (success, out) = address(CIP25_ADDRESS).staticcall(abi.encodePacked(input));
        require(success, "error calling ed2559 precompile");
        require(out.length == 32, "bad ed2559 result length");
        return out;
    }
}