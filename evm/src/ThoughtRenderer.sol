// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ThoughtRenderer {
    string public constant RENDERER_ID = "inshell.thought.svg.v2.binary-weave-32";
    bytes32 public constant RENDERER_ID_HASH = keccak256(bytes(RENDERER_ID));

    uint256 private constant AGENT_X = 480;
    uint256 private constant AGENT_Y = 410;
    uint256 private constant AGENT_TARGET_WIDTH = 772;
    uint256 private constant AGENT_CAROUSEL_ACTIVATION_WIDTH = 672;
    uint256 private constant AGENT_BASE_FONT = 44;
    uint256 private constant AGENT_CLIP_X = 94;
    uint256 private constant AGENT_CLIP_Y = 373;
    uint256 private constant AGENT_CLIP_HEIGHT = 74;
    uint256 private constant AGENT_CLIP_RADIUS = 9;
    uint256 private constant PROMPT_X = 480;
    uint256 private constant PROMPT_Y = 844;
    uint256 private constant PROMPT_TARGET_WIDTH = 660;
    uint256 private constant PROMPT_BASE_FONT = 16;
    uint256 private constant PROMPT_CLIP_X = 150;
    uint256 private constant PROMPT_CLIP_Y = 821;
    uint256 private constant PROMPT_CLIP_HEIGHT = 46;
    uint256 private constant PROMPT_CLIP_RADIUS = 9;
    uint256 private constant CAROUSEL_MIN_GAP = 240;
    uint256 private constant CAROUSEL_FONT_GAP_MULTIPLIER = 6;
    uint256 private constant BINARY_BG_X = 96;
    uint256 private constant BINARY_BG_Y = 96;
    uint256 private constant BINARY_BG_SIDE = 32;
    uint256 private constant BINARY_BG_CELL_SIZE = 24;
    uint256 private constant BINARY_FIELD_BYTES = 128;
    uint256 private constant BINARY_RENDERED_CELL_COUNT = 840;
    string private constant FONT_STACK =
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Noto Sans Mono', 'Noto Sans Mono CJK SC', 'Noto Sans Mono CJK JP', 'Noto Sans Mono CJK KR', 'Noto Sans', monospace, sans-serif";

    error InvalidBinaryFieldLength(uint256 actual, uint256 expected);

    function render(
        string calldata promptLine,
        string calldata agentLine,
        bytes calldata packedField,
        uint256 promptDisplayUnits,
        uint256 agentDisplayUnits
    ) external pure returns (string memory) {
        if (packedField.length != BINARY_FIELD_BYTES) {
            revert InvalidBinaryFieldLength(packedField.length, BINARY_FIELD_BYTES);
        }

        string memory agentLineSvg = string.concat(
            '<g id="agent-line-area">',
            _svgTextLine(
                "agent-line-text",
                agentDisplayUnits,
                AGENT_X,
                AGENT_Y,
                AGENT_CAROUSEL_ACTIVATION_WIDTH,
                "agent-line-clip",
                AGENT_CLIP_X,
                AGENT_BASE_FONT,
                agentLine
            ),
            "</g>"
        );
        string memory promptLineSvg = string.concat(
            '<g id="prompt-line-area">',
            _svgTextLine(
                "prompt-line-text",
                promptDisplayUnits,
                PROMPT_X,
                PROMPT_Y,
                PROMPT_TARGET_WIDTH,
                "prompt-line-clip",
                PROMPT_CLIP_X,
                PROMPT_BASE_FONT,
                promptLine
            ),
            "</g>"
        );
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960"><rect id="canvas-bg" width="960" height="960" fill="#000000"/>',
            _svgBinaryBackground(packedField),
            _svgClipDefs(),
            agentLineSvg,
            promptLineSvg,
            "</svg>"
        );
    }

    function _svgClipDefs() private pure returns (string memory) {
        return string.concat(
            '<defs><clipPath id="agent-line-clip"><rect x="94" y="373" width="772" height="74" rx="9"/></clipPath>',
            '<clipPath id="prompt-line-clip"><rect x="150" y="821" width="660" height="46" rx="9"/></clipPath></defs>'
        );
    }

    function _svgBinaryBackground(bytes calldata packed) private pure returns (string memory) {
        uint256 oneCount;
        for (uint256 bitOffset = 0; bitOffset < 1024; bitOffset++) {
            if (!_isClearedCell(bitOffset) && _packedBitIsOne(packed, bitOffset)) oneCount++;
        }

        bytes memory output = new bytes(48_000);
        uint256 cursor = _writeBinaryScaffold(output, oneCount);
        for (uint256 bitOffset = 0; bitOffset < 1024; bitOffset++) {
            if (!_packedBitIsOne(packed, bitOffset) || _isClearedCell(bitOffset)) continue;
            (uint256 cx, uint256 cy) = _binaryCellCenter(bitOffset);
            cursor = _writeSvgBytes(output, cursor, '<use href="#binary-one" x="');
            cursor = _writeSvgUint(output, cursor, cx);
            cursor = _writeSvgBytes(output, cursor, '" y="');
            cursor = _writeSvgUint(output, cursor, cy);
            cursor = _writeSvgBytes(output, cursor, '"/>');
        }

        cursor = _writeSvgBytes(
            output,
            cursor,
            '<rect id="agent-text-clear" x="92" y="372" width="776" height="76" fill="#000000"/><rect id="prompt-text-clear" x="148" y="820" width="664" height="48" fill="#000000"/>'
        );
        cursor = _writeSvgBytes(output, cursor, "</g>");
        assembly ("memory-safe") {
            mstore(output, cursor)
        }
        return string(output);
    }

    function _binaryCellCenter(uint256 bitOffset) private pure returns (uint256 cx, uint256 cy) {
        cx = BINARY_BG_X + (bitOffset % BINARY_BG_SIDE) * BINARY_BG_CELL_SIZE + BINARY_BG_CELL_SIZE / 2;
        cy = BINARY_BG_Y + (bitOffset / BINARY_BG_SIDE) * BINARY_BG_CELL_SIZE + BINARY_BG_CELL_SIZE / 2;
    }

    function _isClearedCell(uint256 bitOffset) private pure returns (bool) {
        uint256 row = bitOffset / BINARY_BG_SIDE;
        uint256 column = bitOffset % BINARY_BG_SIDE;
        return (row >= 11 && row <= 14) || (row >= 30 && column >= 2 && column <= 29);
    }

    function _writeBinaryScaffold(bytes memory output, uint256 oneCount) private pure returns (uint256 cursor) {
        cursor = _writeSvgBytes(
            output,
            cursor,
            '<g id="binary-background" opacity="1" fill="#006100" aria-label="Orthogonal UTF-8 binary weave: prompt bits travel horizontally and Agent bits travel vertically; filled circles are one bits and hollow rings are zero bits" data-grid-columns="32" data-grid-rows="32" data-bit-capacity="1024" data-prompt-bit-positions="512" data-agent-bit-positions="512" data-one-cells="'
        );
        cursor = _writeSvgUint(output, cursor, oneCount);
        cursor = _writeSvgBytes(output, cursor, '" data-zero-cells="');
        cursor = _writeSvgUint(output, cursor, BINARY_RENDERED_CELL_COUNT - oneCount);
        cursor = _writeSvgBytes(
            output,
            cursor,
            '" data-rendered-cells="840" data-cleared-cells="184" data-pack="msb-first-128-bytes" data-cell-size="24" data-origin-x="96" data-origin-y="96" data-dot-radius="6" data-zero="hollow-circle"><defs><circle id="binary-one" r="6" fill="#006100"/><pattern id="binary-zero-pattern" x="96" y="96" width="24" height="24" patternUnits="userSpaceOnUse"><circle id="binary-zero" cx="12" cy="12" r="7" fill="none" stroke="#006100" stroke-width="2"/></pattern></defs><rect id="binary-zero-field" x="96" y="96" width="768" height="768" fill="url(#binary-zero-pattern)"/>'
        );
    }

    function _packedBitIsOne(bytes calldata packed, uint256 bitOffset) private pure returns (bool) {
        return ((uint8(packed[bitOffset / 8]) >> (7 - (bitOffset % 8))) & 1) == 1;
    }

    function _svgTextLine(
        string memory baseId,
        uint256 displayUnits,
        uint256 x,
        uint256 y,
        uint256 carouselActivationWidth,
        string memory clipId,
        uint256 clipX,
        uint256 fontSize,
        string memory value
    ) private pure returns (string memory) {
        uint256 textWidth = (displayUnits * fontSize + 9) / 10;
        string memory escapedValue = _xmlEscape(value);
        if (textWidth <= carouselActivationWidth) {
            return string.concat(
                '<text id="',
                baseId,
                '" x="',
                _toString(x),
                '" y="',
                _toString(y),
                '" xml:space="preserve" text-anchor="middle" dominant-baseline="middle" font-family="',
                FONT_STACK,
                '" font-size="',
                _toString(fontSize),
                '" fill="#ffffff" clip-path="url(#',
                clipId,
                ')">',
                escapedValue,
                "</text>"
            );
        }

        uint256 gap = fontSize * CAROUSEL_FONT_GAP_MULTIPLIER;
        if (gap < CAROUSEL_MIN_GAP) gap = CAROUSEL_MIN_GAP;
        uint256 travel = textWidth + gap;
        uint256 duration = (travel + 79) / 80;
        if (duration < 14) duration = 14;
        uint256 copyX = clipX + travel;
        string memory textAttrs = string.concat(
            '" y="',
            _toString(y),
            '" xml:space="preserve" dominant-baseline="middle" font-family="',
            FONT_STACK,
            '" font-size="',
            _toString(fontSize),
            '" fill="#ffffff" clip-path="url(#',
            clipId,
            ')">'
        );
        string memory firstAnimation = string.concat(
            '<animate attributeName="x" values="',
            _toString(clipX),
            ";-",
            _toString(travel - clipX),
            '" dur="',
            _toString(duration),
            's" repeatCount="indefinite"/>'
        );
        string memory copyAnimation = string.concat(
            '<animate attributeName="x" values="',
            _toString(copyX),
            ";",
            _toString(clipX),
            '" dur="',
            _toString(duration),
            's" repeatCount="indefinite"/>'
        );
        string memory firstText = string.concat(
            '<text id="', baseId, '" x="', _toString(clipX), textAttrs, escapedValue, firstAnimation, "</text>"
        );
        string memory copyText = string.concat(
            '<text id="', baseId, '-copy" x="', _toString(copyX), textAttrs, escapedValue, copyAnimation, "</text>"
        );
        return string.concat(
            '<g id="',
            keccak256(bytes(baseId)) == keccak256(bytes("agent-line-text"))
                ? "agent-line-carousel"
                : "prompt-line-carousel",
            '">',
            firstText,
            copyText,
            "</g>"
        );
    }

    function _xmlEscape(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        uint256 outputLen;
        for (uint256 i = 0; i < input.length; i++) {
            if (input[i] == "&") outputLen += 5;
            else if (input[i] == "<" || input[i] == ">") outputLen += 4;
            else if (input[i] == '"' || input[i] == "'") outputLen += 6;
            else outputLen++;
        }

        bytes memory output = new bytes(outputLen);
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

    function _writeSvgBytes(bytes memory output, uint256 cursor, string memory value) private pure returns (uint256) {
        bytes memory data = bytes(value);
        for (uint256 i = 0; i < data.length; i++) {
            output[cursor + i] = data[i];
        }
        return cursor + data.length;
    }

    function _writeSvgUint(bytes memory output, uint256 cursor, uint256 value) private pure returns (uint256) {
        return _writeSvgBytes(output, cursor, _toString(value));
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
