// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";

library ThoughtV2ContextProfile {
    enum ContextKind {
        DeclaredAgent,
        DeclaredModel
    }

    error ContextEmpty(ContextKind kind);
    error ContextTooLarge(ContextKind kind, uint256 actual, uint256 max);
    error InvalidContextCharacter(ContextKind kind, uint256 codepoint);
    error InvalidContextEncoding(ContextKind kind);
    error InvalidContextSpacing(ContextKind kind);

    function validate(string memory value, ContextKind kind) internal pure returns (uint256 byteLength) {
        bytes memory data = bytes(value);
        byteLength = data.length;
        if (byteLength == 0) revert ContextEmpty(kind);
        if (byteLength > ThoughtV2Constants.MAX_CONTEXT_LABEL_BYTES) {
            revert ContextTooLarge(kind, byteLength, ThoughtV2Constants.MAX_CONTEXT_LABEL_BYTES);
        }
        if (data[0] == 0x20 || data[byteLength - 1] == 0x20) revert InvalidContextSpacing(kind);

        uint256 i;
        while (i < byteLength) {
            uint8 firstByte = uint8(data[i]);
            if (firstByte < 0x80) {
                if (firstByte < 0x20 || firstByte == 0x7F) {
                    revert InvalidContextCharacter(kind, firstByte);
                }
                unchecked {
                    i++;
                }
                continue;
            }

            (uint256 codepoint, uint256 next) = _decodeUtf8(data, i, kind);
            _validateCodepoint(codepoint, kind);
            i = next;
        }
    }

    function _decodeUtf8(bytes memory data, uint256 i, ContextKind kind)
        private
        pure
        returns (uint256 codepoint, uint256 next)
    {
        uint8 b0 = uint8(data[i]);
        if (b0 >= 0xC2 && b0 <= 0xDF) {
            if (i + 1 >= data.length || !_isContinuation(data[i + 1])) {
                revert InvalidContextEncoding(kind);
            }
            return (((uint256(b0) & 0x1F) << 6) | (uint256(uint8(data[i + 1])) & 0x3F), i + 2);
        }

        if (b0 >= 0xE0 && b0 <= 0xEF) {
            if (i + 2 >= data.length || !_isContinuation(data[i + 1]) || !_isContinuation(data[i + 2])) {
                revert InvalidContextEncoding(kind);
            }
            uint8 b1 = uint8(data[i + 1]);
            if ((b0 == 0xE0 && b1 < 0xA0) || (b0 == 0xED && b1 > 0x9F)) {
                revert InvalidContextEncoding(kind);
            }
            codepoint =
                ((uint256(b0) & 0x0F) << 12) | ((uint256(b1) & 0x3F) << 6) | (uint256(uint8(data[i + 2])) & 0x3F);
            return (codepoint, i + 3);
        }

        if (b0 >= 0xF0 && b0 <= 0xF4) {
            if (
                i + 3 >= data.length || !_isContinuation(data[i + 1]) || !_isContinuation(data[i + 2])
                    || !_isContinuation(data[i + 3])
            ) {
                revert InvalidContextEncoding(kind);
            }
            uint8 b1 = uint8(data[i + 1]);
            if ((b0 == 0xF0 && b1 < 0x90) || (b0 == 0xF4 && b1 > 0x8F)) {
                revert InvalidContextEncoding(kind);
            }
            codepoint = ((uint256(b0) & 0x07) << 18) | ((uint256(b1) & 0x3F) << 12)
                | ((uint256(uint8(data[i + 2])) & 0x3F) << 6) | (uint256(uint8(data[i + 3])) & 0x3F);
            return (codepoint, i + 4);
        }

        revert InvalidContextEncoding(kind);
    }

    function _isContinuation(bytes1 value) private pure returns (bool) {
        uint8 byteValue = uint8(value);
        return byteValue >= 0x80 && byteValue <= 0xBF;
    }

    function _validateCodepoint(uint256 codepoint, ContextKind kind) private pure {
        if (codepoint >= 0x80 && codepoint <= 0x9F) revert InvalidContextCharacter(kind, codepoint);
        if (
            !_isXmlCharacter(codepoint) || _isRejectedWhitespace(codepoint) || _isDefaultIgnorable(codepoint)
                || _isNoncharacter(codepoint)
        ) {
            revert InvalidContextCharacter(kind, codepoint);
        }
    }

    function _isXmlCharacter(uint256 codepoint) private pure returns (bool) {
        return (codepoint >= 0x20 && codepoint <= 0xD7FF) || (codepoint >= 0xE000 && codepoint <= 0xFFFD)
            || (codepoint >= 0x10000 && codepoint <= 0x10FFFF);
    }

    function _isRejectedWhitespace(uint256 codepoint) private pure returns (bool) {
        return codepoint == 0x85 || codepoint == 0xA0 || codepoint == 0x1680
            || (codepoint >= 0x2000 && codepoint <= 0x200A) || codepoint == 0x2028 || codepoint == 0x2029
            || codepoint == 0x202F || codepoint == 0x205F || codepoint == 0x3000;
    }

    function _isDefaultIgnorable(uint256 codepoint) private pure returns (bool) {
        return codepoint == 0xAD || codepoint == 0x34F || codepoint == 0x61C
            || (codepoint >= 0x115F && codepoint <= 0x1160) || (codepoint >= 0x17B4 && codepoint <= 0x17B5)
            || (codepoint >= 0x180B && codepoint <= 0x180F) || (codepoint >= 0x200B && codepoint <= 0x200F)
            || (codepoint >= 0x202A && codepoint <= 0x202E) || (codepoint >= 0x2060 && codepoint <= 0x206F)
            || codepoint == 0x3164 || (codepoint >= 0xFE00 && codepoint <= 0xFE0F) || codepoint == 0xFEFF
            || codepoint == 0xFFA0 || (codepoint >= 0xFFF0 && codepoint <= 0xFFF8)
            || (codepoint >= 0x1BCA0 && codepoint <= 0x1BCA3) || (codepoint >= 0x1D173 && codepoint <= 0x1D17A)
            || (codepoint >= 0xE0000 && codepoint <= 0xE0FFF);
    }

    function _isNoncharacter(uint256 codepoint) private pure returns (bool) {
        uint256 low = codepoint & 0xFFFF;
        return (codepoint >= 0xFDD0 && codepoint <= 0xFDEF) || low == 0xFFFE || low == 0xFFFF;
    }
}
