// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractCodeStorage} from "../ContractCodeStorage.sol";
import {IThoughtSvgRendererV2} from "./IThoughtSvgRendererV2.sol";
import {ThoughtV2WorkProfile} from "./ThoughtV2WorkProfile.sol";

/// @notice Split-candidate SVG renderer using the sealed Inshell Mono 76 v1.0.0 payload.
contract ThoughtSvgRendererV2 is IThoughtSvgRendererV2 {
    error InvalidGlyphDataPointer();
    error TooManyRenderedRows();

    string public constant IMPLEMENTATION_ID =
        "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom";
    bytes32 public constant IMPLEMENTATION_ID_HASH = keccak256(bytes(IMPLEMENTATION_ID));
    string public constant GLYPH_LIBRARY_MEMBER_ID = "inshell.mono-76";
    bytes32 public constant GLYPH_SOURCE_SHA256 = 0x7ed61ed6335fce2c1e58184916f5d344b8384fc05d4c616e83c35ad4fa9ed47f;
    bytes32 public constant GLYPH_PACKED_SHA256 = 0x3acc0a9cf60c00aa2d512356386d1e2a999499896e25661e8e631d53d5e10926;
    bytes32 public constant GLYPH_PACKED_KECCAK256 =
        0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081;
    bytes32 public constant glyphDefinitionsKeccak256 = GLYPH_PACKED_KECCAK256;
    uint256 public constant MAX_COLUMNS = 29;
    uint256 public constant MAX_ROWS = 4;
    string public constant WRAP_PROFILE = "greedy-space-then-fixed-cell-overlong-word";

    uint256 private constant PACKED_BYTES = 4_600;
    uint256 private constant PACKED_HEADER_BYTES = 162;
    uint256 private constant PACKED_PATH_BYTES = 4_438;
    uint256 private constant PROMPT_FIELD_TOP_HUNDREDTHS = 12_800;
    uint256 private constant AGENT_FIELD_BOTTOM_HUNDREDTHS = 83_200;
    uint256 private constant LINE_HEIGHT_HUNDREDTHS = 6_400;
    uint256 private constant GLYPH_BASELINE_INSET_HUNDREDTHS = 4_352;
    uint256 private constant GLYPH_SCALE_HUNDREDTHS = 288;
    uint256 private constant GLYPH_CELL_WIDTH_HUNDREDTHS = 2_880;
    uint256 private constant GLYPH_ORIGIN_SHIFT_HUNDREDTHS = 288;
    uint256 private constant GLYPH_FIXED_ADVANCE = 10;
    string private constant CANONICAL_ORDER =
        " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    address public immutable glyphDefinitionsPointer1;

    constructor(address glyphDataPointer) {
        if (glyphDataPointer == address(0) || glyphDataPointer.code.length != PACKED_BYTES + 1) {
            revert InvalidGlyphDataPointer();
        }
        bytes memory payload = ContractCodeStorage.read(glyphDataPointer);
        if (
            keccak256(payload) != GLYPH_PACKED_KECCAK256 || payload[0] != "I" || payload[1] != "M"
                || payload[2] != "7" || payload[3] != "6" || uint8(payload[4]) != 1
                || uint8(payload[5]) != 0x01 || uint8(payload[6]) != 0x90 || uint8(payload[7]) != 76
                || _uint16(payload, 8) != 0
        ) {
            revert InvalidGlyphDataPointer();
        }
        uint256 previous;
        for (uint256 index = 1; index <= 76; index++) {
            uint256 offset = _uint16(payload, 8 + index * 2);
            if (offset < previous || offset > PACKED_PATH_BYTES) revert InvalidGlyphDataPointer();
            previous = offset;
        }
        if (previous != PACKED_PATH_BYTES) revert InvalidGlyphDataPointer();
        glyphDefinitionsPointer1 = glyphDataPointer;
    }

    function glyphDefinitionsPointer2() external pure returns (address) {
        return address(0);
    }

    function glyphDefinitionsIndexPointer() external pure returns (address) {
        return address(0);
    }

    function render(string calldata promptLine, string calldata agentLine) external view returns (string memory) {
        ThoughtV2WorkProfile.validate(promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        ThoughtV2WorkProfile.validate(agentLine, ThoughtV2WorkProfile.LineKind.Agent);
        (bytes[] memory promptRows, uint256 promptRowCount) = _wrap(bytes(promptLine));
        (bytes[] memory agentRows, uint256 agentRowCount) = _wrap(bytes(agentLine));
        string memory definitions = _definitions(bytes(promptLine), bytes(agentLine));
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" data-renderer="',
            IMPLEMENTATION_ID,
            '" data-glyph-library-member="',
            GLYPH_LIBRARY_MEMBER_ID,
            '" data-glyph-format="IM76-v1" data-glyph-release="v1.0.0" data-glyph-svg-baseline="12" data-glyph-scale="2.88" data-glyph-origin-shift-x="1" data-wrap="',
            WRAP_PROFILE,
            '" data-prompt-vertical-align="top" data-agent-vertical-align="bottom" aria-label="Prompt and Agent response in a terminal chat layout">',
            '<rect id="work-frame" width="1024" height="1024" fill="#006100"/>',
            '<g id="work-canvas" transform="translate(32 32)">',
            '<rect id="canvas-bg" width="960" height="960" fill="#000000"/>',
            definitions,
            '<g id="prompt-line" fill="none" stroke="#00ff00" stroke-width="1.23" stroke-linecap="round" stroke-linejoin="round" data-source="',
            _xmlEscape(promptLine),
            '" data-rows="',
            _toString(promptRowCount),
            '" data-field-x="57.6" data-field-y="128" data-field-width="844.8" data-field-height="256" data-field-bottom="384" data-horizontal-align="right" data-vertical-align="top">',
            _renderRows(promptRows, promptRowCount, true),
            "</g>",
            '<g id="agent-line" fill="none" stroke="#00ff00" stroke-width="1.23" stroke-linecap="round" stroke-linejoin="round" data-source="',
            _xmlEscape(agentLine),
            '" data-rows="',
            _toString(agentRowCount),
            '" data-field-x="57.6" data-field-y="576" data-field-width="844.8" data-field-height="256" data-field-bottom="832" data-horizontal-align="left" data-vertical-align="bottom">',
            _renderRows(agentRows, agentRowCount, false),
            "</g>",
            "</g>",
            "</svg>"
        );
    }

    function _definitions(bytes memory promptLine, bytes memory agentLine) private view returns (string memory) {
        bool[128] memory used;
        _markUsed(used, promptLine);
        _markUsed(used, agentLine);

        bytes memory offsets = ContractCodeStorage.readSlice(glyphDefinitionsPointer1, 8, 154);
        bytes memory order = bytes(CANONICAL_ORDER);
        bytes memory prefix = bytes('<path id="g');
        bytes memory infix = bytes('" d="');
        bytes memory suffix = bytes('"/>');
        uint256 definitionsLength;
        for (uint256 orderIndex = 1; orderIndex < order.length; orderIndex++) {
            if (!used[uint8(order[orderIndex])]) continue;
            (uint256 start, uint256 end) = _pathOffsets(offsets, orderIndex);
            definitionsLength += prefix.length + 2 + infix.length + (end - start) + suffix.length;
        }

        bytes memory definitions = new bytes(definitionsLength + 32);
        uint256 cursor;
        for (uint256 orderIndex = 1; orderIndex < order.length; orderIndex++) {
            uint8 character = uint8(order[orderIndex]);
            if (!used[character]) continue;
            (uint256 start, uint256 end) = _pathOffsets(offsets, orderIndex);
            cursor = _appendBytes(definitions, cursor, prefix);
            definitions[cursor++] = HEX_DIGITS[character >> 4];
            definitions[cursor++] = HEX_DIGITS[character & 0x0f];
            cursor = _appendBytes(definitions, cursor, infix);
            ContractCodeStorage.copySlice(
                glyphDefinitionsPointer1,
                definitions,
                cursor,
                PACKED_HEADER_BYTES + start,
                end - start
            );
            cursor += end - start;
            cursor = _appendBytes(definitions, cursor, suffix);
        }
        assembly ("memory-safe") {
            mstore(definitions, cursor)
        }
        return string.concat("<defs>", string(definitions), "</defs>");
    }

    function _markUsed(bool[128] memory used, bytes memory line) private pure {
        for (uint256 index = 0; index < line.length; index++) {
            uint8 character = uint8(line[index]);
            if (character != 32) used[character] = true;
        }
    }

    function _pathOffsets(bytes memory offsets, uint256 orderIndex)
        private
        pure
        returns (uint256 start, uint256 end)
    {
        uint256 cursor = orderIndex * 2;
        start = _uint16(offsets, cursor);
        end = _uint16(offsets, cursor + 2);
    }

    function _uint16(bytes memory value, uint256 cursor) private pure returns (uint256) {
        return (uint256(uint8(value[cursor])) << 8) | uint256(uint8(value[cursor + 1]));
    }

    function _wrap(bytes memory input) private pure returns (bytes[] memory rows, uint256 rowCount) {
        rows = new bytes[](MAX_ROWS);
        uint256 cursor;
        while (cursor < input.length) {
            if (rowCount == MAX_ROWS) revert TooManyRenderedRows();
            uint256 remaining = input.length - cursor;
            uint256 rowLength = remaining <= MAX_COLUMNS ? remaining : MAX_COLUMNS;
            if (remaining > MAX_COLUMNS) {
                for (uint256 offset = MAX_COLUMNS; offset > 0; offset--) {
                    if (input[cursor + offset - 1] == bytes1(" ")) {
                        rowLength = offset - 1;
                        break;
                    }
                }
            }
            rows[rowCount++] = _slice(input, cursor, rowLength);
            cursor += rowLength;
            if (cursor < input.length && input[cursor] == bytes1(" ")) cursor++;
        }
    }

    function _slice(bytes memory input, uint256 start, uint256 length) private pure returns (bytes memory output) {
        output = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            output[i] = input[start + i];
        }
    }

    function _renderRows(bytes[] memory rows, uint256 rowCount, bool prompt) private pure returns (string memory) {
        uint256 characterCount;
        for (uint256 rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            characterCount += rows[rowIndex].length;
        }

        bytes memory output = new bytes(characterCount * 32 + rowCount * 96 + 32);
        bytes memory rowPrefix = bytes('<g transform="translate(');
        bytes memory rowSuffix = bytes(') scale(2.88 -2.88)">');
        bytes memory glyphPrefix = bytes('<use href="#g');
        bytes memory glyphWithoutX = bytes('"/>');
        bytes memory glyphWithX = bytes('" x="');
        bytes memory glyphWithXSuffix = bytes('"/>');
        uint256 cursor;
        uint256 yHundredths = prompt
            ? PROMPT_FIELD_TOP_HUNDREDTHS + GLYPH_BASELINE_INSET_HUNDREDTHS
            : AGENT_FIELD_BOTTOM_HUNDREDTHS - (rowCount * LINE_HEIGHT_HUNDREDTHS)
                + GLYPH_BASELINE_INSET_HUNDREDTHS;
        for (uint256 rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            bytes memory row = rows[rowIndex];
            uint256 xHundredths = prompt
                ? 90_240 - (row.length * GLYPH_CELL_WIDTH_HUNDREDTHS) + GLYPH_ORIGIN_SHIFT_HUNDREDTHS
                : 5_760 + GLYPH_ORIGIN_SHIFT_HUNDREDTHS;
            cursor = _appendBytes(output, cursor, rowPrefix);
            cursor = _appendHundredths(output, cursor, xHundredths);
            output[cursor++] = " ";
            cursor = _appendHundredths(output, cursor, yHundredths);
            cursor = _appendBytes(output, cursor, rowSuffix);
            for (uint256 column = 0; column < row.length; column++) {
                bytes1 character = row[column];
                if (character != bytes1(" ")) {
                    cursor = _appendBytes(output, cursor, glyphPrefix);
                    uint8 characterValue = uint8(character);
                    output[cursor++] = HEX_DIGITS[characterValue >> 4];
                    output[cursor++] = HEX_DIGITS[characterValue & 0x0f];
                    if (column == 0) {
                        cursor = _appendBytes(output, cursor, glyphWithoutX);
                    } else {
                        cursor = _appendBytes(output, cursor, glyphWithX);
                        cursor = _appendUint(output, cursor, column * GLYPH_FIXED_ADVANCE);
                        cursor = _appendBytes(output, cursor, glyphWithXSuffix);
                    }
                }
            }
            cursor = _appendBytes(output, cursor, bytes("</g>"));
            yHundredths += LINE_HEIGHT_HUNDREDTHS;
        }
        assembly ("memory-safe") {
            mstore(output, cursor)
        }
        return string(output);
    }

    function _appendBytes(bytes memory output, uint256 cursor, bytes memory value)
        private
        pure
        returns (uint256 nextCursor)
    {
        uint256 length = value.length;
        assembly ("memory-safe") {
            let source := add(value, 0x20)
            let destination := add(add(output, 0x20), cursor)
            let end := add(source, length)
            for {} lt(source, end) {
                source := add(source, 0x20)
                destination := add(destination, 0x20)
            } { mstore(destination, mload(source)) }
        }
        nextCursor = cursor + length;
    }

    function _appendHundredths(bytes memory output, uint256 cursor, uint256 value)
        private
        pure
        returns (uint256 nextCursor)
    {
        nextCursor = _appendUint(output, cursor, value / 100);
        uint256 remainder = value % 100;
        if (remainder != 0) {
            output[nextCursor++] = ".";
            output[nextCursor++] = bytes1(uint8(48 + remainder / 10));
            if (remainder % 10 != 0) output[nextCursor++] = bytes1(uint8(48 + remainder % 10));
        }
    }

    function _appendUint(bytes memory output, uint256 cursor, uint256 value) private pure returns (uint256 nextCursor) {
        uint256 digits = 1;
        uint256 remaining = value;
        while (remaining >= 10) {
            digits++;
            remaining /= 10;
        }
        nextCursor = cursor + digits;
        uint256 writeCursor = nextCursor;
        do {
            output[--writeCursor] = bytes1(uint8(48 + value % 10));
            value /= 10;
        } while (writeCursor > cursor);
    }

    function _xmlEscape(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        uint256 outputLength;
        for (uint256 i = 0; i < input.length; i++) {
            if (input[i] == "&") outputLength += 5;
            else if (input[i] == "<" || input[i] == ">") outputLength += 4;
            else if (input[i] == '"' || input[i] == "'") outputLength += 6;
            else outputLength++;
        }
        bytes memory output = new bytes(outputLength);
        uint256 cursor;
        for (uint256 i = 0; i < input.length; i++) {
            bytes memory escaped;
            if (input[i] == "&") {
                escaped = bytes("&amp;");
            } else if (input[i] == "<") {
                escaped = bytes("&lt;");
            } else if (input[i] == ">") {
                escaped = bytes("&gt;");
            } else if (input[i] == '"') {
                escaped = bytes("&quot;");
            } else if (input[i] == "'") {
                escaped = bytes("&apos;");
            } else {
                output[cursor++] = input[i];
                continue;
            }
            for (uint256 j = 0; j < escaped.length; j++) {
                output[cursor++] = escaped[j];
            }
        }
        return string(output);
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) return "0";
        uint256 digits;
        uint256 remaining = value;
        while (remaining != 0) {
            digits++;
            remaining /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits--;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
}
