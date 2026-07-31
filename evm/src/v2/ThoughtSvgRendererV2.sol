// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractCodeStorage} from "../ContractCodeStorage.sol";
import {IThoughtSvgRendererV2} from "./IThoughtSvgRendererV2.sol";
import {ThoughtV2WorkProfile} from "./ThoughtV2WorkProfile.sol";

/// @notice Split-candidate SVG renderer. It owns only artwork construction and immutable glyph access.
contract ThoughtSvgRendererV2 is IThoughtSvgRendererV2 {
    error InvalidGlyphDefinitionsPointer(uint8 part);
    error TooManyRenderedRows();

    string public constant IMPLEMENTATION_ID =
        "inshell.thought.renderer.v2.humanist-smooth-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom";
    bytes32 public constant IMPLEMENTATION_ID_HASH = keccak256(bytes(IMPLEMENTATION_ID));
    string public constant GLYPH_LIBRARY_MEMBER_ID = "inshell.thought.glyph-library.set-03.humanist-smooth";
    bytes32 public constant GLYPH_SOURCE_SHA256 = 0x66ddd9d4fca7fc07dded2c3295e5562c8cfcf966e4ef8bf4843646616899b7f8;
    bytes32 public constant GLYPH_DEFINITIONS_PART_1_KECCAK256 =
        0x3397ceb983a0e0fcbeee7154eebe059501315c7f34b1730ce9d37f2982425f5e;
    bytes32 public constant GLYPH_DEFINITIONS_PART_2_KECCAK256 =
        0x9bc9bd78a6ed099748994515be64879548413a98187dcc45faaba65af72c7f32;
    bytes32 public constant GLYPH_DEFINITIONS_INDEX_KECCAK256 =
        0x113d43ed0e3a6ce486779bca9734801493dd9c5c629e4816b8be3d445f1b9825;
    uint256 public constant MAX_COLUMNS = 29;
    uint256 public constant MAX_ROWS = 4;
    string public constant WRAP_PROFILE = "greedy-space-then-fixed-cell-overlong-word";

    uint256 private constant PROMPT_FIELD_TOP_TENTHS = 1_280;
    uint256 private constant AGENT_FIELD_BOTTOM_TENTHS = 8_320;
    uint256 private constant LINE_HEIGHT_TENTHS = 640;
    uint256 private constant GLYPH_CELL_Y_INSET_TENTHS = 128;
    string private constant CANONICAL_ORDER =
        " ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&";
    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    address public immutable glyphDefinitionsPointer1;
    address public immutable glyphDefinitionsPointer2;
    address public immutable glyphDefinitionsIndexPointer;
    bytes32 public immutable glyphDefinitionsKeccak256;

    constructor(
        address glyphDefinitionsPointer1_,
        address glyphDefinitionsPointer2_,
        address glyphDefinitionsIndexPointer_
    ) {
        bytes memory part1 = _validatedDefinitionsPart(glyphDefinitionsPointer1_, GLYPH_DEFINITIONS_PART_1_KECCAK256, 1);
        bytes memory part2 = _validatedDefinitionsPart(glyphDefinitionsPointer2_, GLYPH_DEFINITIONS_PART_2_KECCAK256, 2);
        _validatedDefinitionsPart(glyphDefinitionsIndexPointer_, GLYPH_DEFINITIONS_INDEX_KECCAK256, 3);
        glyphDefinitionsPointer1 = glyphDefinitionsPointer1_;
        glyphDefinitionsPointer2 = glyphDefinitionsPointer2_;
        glyphDefinitionsIndexPointer = glyphDefinitionsIndexPointer_;
        glyphDefinitionsKeccak256 = keccak256(bytes.concat(part1, part2));
    }

    function render(string calldata promptLine, string calldata agentLine) external view returns (string memory) {
        ThoughtV2WorkProfile.validate(promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        ThoughtV2WorkProfile.validate(agentLine, ThoughtV2WorkProfile.LineKind.Agent);
        (bytes[] memory promptRows, uint256 promptRowCount) = _wrap(bytes(promptLine));
        (bytes[] memory agentRows, uint256 agentRowCount) = _wrap(bytes(agentLine));
        string memory definitions = _definitions(promptLine, agentLine);
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024" role="img" data-renderer="',
            IMPLEMENTATION_ID,
            '" data-glyph-library-member="',
            GLYPH_LIBRARY_MEMBER_ID,
            '" data-glyph-visual-baseline="5.58" data-wrap="',
            WRAP_PROFILE,
            '" data-prompt-vertical-align="top" data-agent-vertical-align="bottom" aria-label="Prompt and Agent response in a terminal chat layout">',
            '<rect id="work-frame" width="1024" height="1024" fill="#006100"/>',
            '<g id="work-canvas" transform="translate(32 32)">',
            '<rect id="canvas-bg" width="960" height="960" fill="#000000"/>',
            definitions,
            '<g id="prompt-line" fill="#00ff00" data-source="',
            _xmlEscape(promptLine),
            '" data-rows="',
            _toString(promptRowCount),
            '" data-field-x="57.6" data-field-y="128" data-field-width="844.8" data-field-height="256" data-field-bottom="384" data-horizontal-align="right" data-vertical-align="top">',
            _renderRows(promptRows, promptRowCount, true),
            "</g>",
            '<g id="agent-line" fill="#00ff00" data-source="',
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

    function _validatedDefinitionsPart(address pointer, bytes32 expectedHash, uint8 part)
        private
        view
        returns (bytes memory definitions)
    {
        if (pointer == address(0) || pointer.code.length <= 1) {
            revert InvalidGlyphDefinitionsPointer(part);
        }
        definitions = ContractCodeStorage.read(pointer);
        if (keccak256(definitions) != expectedHash) revert InvalidGlyphDefinitionsPointer(part);
    }

    function _definitions(string calldata promptLine, string calldata agentLine) private view returns (string memory) {
        bool[128] memory used;
        _markUsed(used, bytes(promptLine));
        _markUsed(used, bytes(agentLine));

        bytes memory index = ContractCodeStorage.read(glyphDefinitionsIndexPointer);
        bytes memory order = bytes(CANONICAL_ORDER);
        uint256 definitionsLength;
        for (uint256 orderIndex = 1; orderIndex < order.length; orderIndex++) {
            if (!used[uint8(order[orderIndex])]) continue;
            (,, uint256 length) = _glyphLocation(index, orderIndex - 1);
            definitionsLength += length;
        }

        bytes memory definitions = new bytes(definitionsLength);
        uint256 destinationOffset;
        for (uint256 orderIndex = 1; orderIndex < order.length; orderIndex++) {
            if (!used[uint8(order[orderIndex])]) continue;
            (uint8 part, uint256 sourceOffset, uint256 length) = _glyphLocation(index, orderIndex - 1);
            ContractCodeStorage.copySlice(
                part == 1 ? glyphDefinitionsPointer1 : glyphDefinitionsPointer2,
                definitions,
                destinationOffset,
                sourceOffset,
                length
            );
            destinationOffset += length;
        }
        return string.concat("<defs>", string(definitions), "</defs>");
    }

    function _markUsed(bool[128] memory used, bytes memory line) private pure {
        for (uint256 index = 0; index < line.length; index++) {
            uint8 character = uint8(line[index]);
            if (character != 32) used[character] = true;
        }
    }

    function _glyphLocation(bytes memory index, uint256 glyphIndex)
        private
        pure
        returns (uint8 part, uint256 offset, uint256 length)
    {
        uint256 cursor = glyphIndex * 5;
        part = uint8(index[cursor]);
        offset = (uint256(uint8(index[cursor + 1])) << 8) | uint256(uint8(index[cursor + 2]));
        length = (uint256(uint8(index[cursor + 3])) << 8) | uint256(uint8(index[cursor + 4]));
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

    function _renderRows(bytes[] memory rows, uint256 rowCount, bool prompt)
        private
        pure
        returns (string memory output)
    {
        uint256 yTenths = prompt
            ? PROMPT_FIELD_TOP_TENTHS + GLYPH_CELL_Y_INSET_TENTHS
            : AGENT_FIELD_BOTTOM_TENTHS - (rowCount * LINE_HEIGHT_TENTHS) + GLYPH_CELL_Y_INSET_TENTHS;
        for (uint256 rowIndex = 0; rowIndex < rowCount; rowIndex++) {
            bytes memory row = rows[rowIndex];
            uint256 xTenths = prompt ? 9_024 - (row.length * 288) : 576;
            for (uint256 column = 0; column < row.length; column++) {
                bytes1 character = row[column];
                if (character != bytes1(" ")) {
                    output = string.concat(
                        output,
                        '<use href="#',
                        _glyphId(character),
                        '" transform="translate(',
                        _tenths(xTenths),
                        " ",
                        _tenths(yTenths),
                        ') scale(4.8)"/>'
                    );
                }
                xTenths += 288;
            }
            yTenths += LINE_HEIGHT_TENTHS;
        }
    }

    function _glyphId(bytes1 character) private pure returns (string memory) {
        bytes memory suffix = new bytes(4);
        suffix[0] = "0";
        suffix[1] = "0";
        uint8 value = uint8(character);
        suffix[2] = HEX_DIGITS[value >> 4];
        suffix[3] = HEX_DIGITS[value & 0x0f];
        return string.concat("humanist-smooth-g", string(suffix));
    }

    function _tenths(uint256 value) private pure returns (string memory) {
        uint256 remainder = value % 10;
        if (remainder == 0) return _toString(value / 10);
        return string.concat(_toString(value / 10), ".", _toString(remainder));
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
