// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";

library ThoughtV2WorkProfile {
    enum LineKind {
        Prompt,
        Agent
    }

    error LineEmpty(LineKind kind);
    error LineTooLarge(LineKind kind, uint256 actual, uint256 max);
    error InvalidLineByte(LineKind kind, uint256 index, uint8 value);
    error InvalidLineSpacing(LineKind kind);

    function validate(string memory value, LineKind kind) internal pure returns (uint256 byteLength) {
        bytes memory data = bytes(value);
        byteLength = data.length;
        if (byteLength == 0) revert LineEmpty(kind);
        if (byteLength > ThoughtV2Constants.MAX_LINE_BYTES) {
            revert LineTooLarge(kind, byteLength, ThoughtV2Constants.MAX_LINE_BYTES);
        }
        if (data[0] == 0x20 || data[byteLength - 1] == 0x20) revert InvalidLineSpacing(kind);

        bool previousWasSpace;
        for (uint256 i = 0; i < byteLength; i++) {
            uint8 character = uint8(data[i]);
            if (!_isAllowed(character)) revert InvalidLineByte(kind, i, character);
            bool isSpace = character == 0x20;
            if (isSpace && previousWasSpace) revert InvalidLineSpacing(kind);
            previousWasSpace = isSpace;
        }
    }

    function isAllowedByte(uint8 character) internal pure returns (bool) {
        return _isAllowed(character);
    }

    function _isAllowed(uint8 character) private pure returns (bool) {
        if (character == 0x20) return true;
        if (character >= 0x30 && character <= 0x39) return true;
        if (character >= 0x41 && character <= 0x5A) return true;
        if (character >= 0x61 && character <= 0x7A) return true;

        return character == 0x21 // !
            || character == 0x22 // "
            || character == 0x26 // &
            || character == 0x27 // '
            || character == 0x28 // (
            || character == 0x29 // )
            || character == 0x2C // ,
            || character == 0x2D // -
            || character == 0x2E // .
            || character == 0x2F // /
            || character == 0x3A // :
            || character == 0x3B // ;
            || character == 0x3F; // ?
    }
}
