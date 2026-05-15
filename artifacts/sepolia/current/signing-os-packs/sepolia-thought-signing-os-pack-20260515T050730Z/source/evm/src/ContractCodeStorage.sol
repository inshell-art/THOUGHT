// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

library ContractCodeStorage {
    error ContractCodeStorageWriteFailed();
    error ContractCodeStorageDataTooLarge(uint256 actual, uint256 max);
    error ContractCodeStorageInvalidPointer(address pointer);

    uint256 internal constant MAX_PAYLOAD_BYTES = 0x6000 - 1;

    function write(bytes memory data) internal returns (address pointer) {
        if (data.length > MAX_PAYLOAD_BYTES) {
            revert ContractCodeStorageDataTooLarge(data.length, MAX_PAYLOAD_BYTES);
        }

        bytes memory runtimeCode = abi.encodePacked(hex"00", data);
        bytes memory creationCode = abi.encodePacked(
            hex"61",
            bytes2(uint16(runtimeCode.length)),
            hex"80600c6000396000f3",
            runtimeCode
        );

        assembly {
            pointer := create(0, add(creationCode, 0x20), mload(creationCode))
        }

        if (pointer == address(0)) {
            revert ContractCodeStorageWriteFailed();
        }
    }

    function read(address pointer) internal view returns (bytes memory data) {
        if (pointer == address(0)) {
            revert ContractCodeStorageInvalidPointer(pointer);
        }

        uint256 codeSize;
        assembly {
            codeSize := extcodesize(pointer)
        }

        if (codeSize <= 1) {
            revert ContractCodeStorageInvalidPointer(pointer);
        }

        uint256 dataSize = codeSize - 1;
        data = new bytes(dataSize);
        assembly {
            extcodecopy(pointer, add(data, 0x20), 1, dataSize)
        }
    }
}
