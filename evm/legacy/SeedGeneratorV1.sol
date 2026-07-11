// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtSeedLibV1} from "./ThoughtSeedLibV1.sol";

contract SeedGeneratorV1 {
    function getSeed(uint256 accountAddress, uint64 index, string calldata text) external pure returns (uint256) {
        return ThoughtSeedLibV1.computeSeed128(accountAddress, index, bytes(text));
    }
}
