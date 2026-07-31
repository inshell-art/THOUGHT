// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/// @notice Decoder for the packed UTF-8 SVG-path artifacts distributed with
/// the Inshell Mono 76 package. It does not prescribe where a downstream
/// contract stores the immutable blob.
library InshellMono76Decoder {
    error InvalidBlob();
    error UnsupportedCharacter(bytes1 character);

    uint256 internal constant PATH_OFFSET = 162;

    function weight(bytes memory blob) internal pure returns (uint16 result) {
        _validate(blob);
        result = _uint16(blob, 5);
    }

    function glyph(
        bytes memory blob,
        bytes1 character
    ) internal pure returns (string memory) {
        _validate(blob);
        uint256 glyphIndex = _glyphIndex(character);
        uint256 start = PATH_OFFSET + _uint16(blob, 8 + glyphIndex * 2);
        uint256 end = PATH_OFFSET + _uint16(blob, 8 + (glyphIndex + 1) * 2);
        if (end < start || end > blob.length) revert InvalidBlob();

        bytes memory output = new bytes(end - start);
        for (uint256 index = 0; index < output.length; index++) {
            output[index] = blob[start + index];
        }
        return string(output);
    }

    function _validate(bytes memory blob) private pure {
        if (
            blob.length < PATH_OFFSET
                || blob[0] != 0x49 // I
                || blob[1] != 0x4d // M
                || blob[2] != 0x37 // 7
                || blob[3] != 0x36 // 6
                || uint8(blob[4]) != 1
                || uint8(blob[7]) != 76
        ) revert InvalidBlob();
    }

    function _uint16(
        bytes memory blob,
        uint256 offset
    ) private pure returns (uint16) {
        if (offset + 1 >= blob.length) revert InvalidBlob();
        return (uint16(uint8(blob[offset])) << 8)
            | uint16(uint8(blob[offset + 1]));
    }

    function _glyphIndex(bytes1 character) private pure returns (uint256) {
        bytes memory repertoire =
            bytes(" ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&");
        for (uint256 index = 0; index < repertoire.length; index++) {
            if (repertoire[index] == character) return index;
        }
        revert UnsupportedCharacter(character);
    }
}
