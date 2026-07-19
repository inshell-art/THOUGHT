// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "./Base64.sol";
import {IThoughtRenderer} from "./IThoughtRenderer.sol";
import {ThoughtReleaseConstants} from "./ThoughtReleaseConstants.sol";

contract ThoughtRenderer {
    string public constant RENDERER_ID = "inshell.thought.svg.v2.binary-weave-32";
    bytes32 public constant RENDERER_ID_HASH = keccak256(bytes(RENDERER_ID));
    string public constant WORK_PROFILE_ID = ThoughtReleaseConstants.WORK_PROFILE_ID;
    bytes32 public constant RENDERER_PROFILE_KECCAK256 = ThoughtReleaseConstants.RENDERER_PROFILE_KECCAK256;
    bytes32 public constant WORK_PROFILE_KECCAK256 = ThoughtReleaseConstants.WORK_PROFILE_KECCAK256;
    bytes32 public constant CREATION_ATTESTATION_PROFILE_ID = ThoughtReleaseConstants.CREATION_ATTESTATION_PROFILE_ID;
    bytes32 private constant AGENT_IDENTITY_DOMAIN = keccak256("INSHELL_THOUGHT_V2_AGENT_IDENTITY");
    bytes32 private constant WORK_DOMAIN = keccak256("INSHELL_THOUGHT_V2_WORK");
    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    struct StructuralMetrics {
        uint256 promptBytes;
        uint256 agentBytes;
        uint256 promptWeight;
        uint256 agentWeight;
        uint256 loomWeight;
        uint256 bitDistance;
    }

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
    uint256 private constant BINARY_BG_X = 32;
    uint256 private constant BINARY_BG_Y = 32;
    uint256 private constant BINARY_BG_SIDE = 32;
    uint256 private constant BINARY_BG_CELL_SIZE = 28;
    uint256 private constant BINARY_FIELD_BYTES = 128;
    uint256 private constant BINARY_RENDERED_CELL_COUNT = 892;
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
        return _render(promptLine, agentLine, packedField, promptDisplayUnits, agentDisplayUnits);
    }

    function _render(
        string calldata promptLine,
        string calldata agentLine,
        bytes calldata packedField,
        uint256 promptDisplayUnits,
        uint256 agentDisplayUnits
    ) private pure returns (string memory) {
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

    function tokenURI(
        IThoughtRenderer.TokenData calldata data,
        bytes calldata packedField,
        uint256 promptDisplayUnits,
        uint256 agentDisplayUnits
    ) external pure returns (string memory) {
        string memory svg = _render(data.promptLine, data.agentLine, packedField, promptDisplayUnits, agentDisplayUnits);
        string memory metadata = string.concat(
            '{"name":"THOUGHT #',
            _toString(data.tokenId),
            '","description":"A human prompt transformed by an Agent into a fully onchain work.',
            '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":',
            _tokenAttributes(data),
            ',"properties":',
            _tokenProperties(data),
            ',"thought":',
            _tokenThought(data, packedField),
            "}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(metadata)));
    }

    function _tokenAttributes(IThoughtRenderer.TokenData calldata data) private pure returns (string memory) {
        StructuralMetrics memory metrics = _structuralMetrics(data.promptLine, data.agentLine);
        return string.concat(
            '[{"trait_type":"Prompt","value":',
            _jsonString(data.promptLine),
            '},{"trait_type":"Agent Response","value":',
            _jsonString(data.agentLine),
            '},{"trait_type":"Declared Agent","value":',
            _jsonString(data.declaredAgent),
            '},{"trait_type":"Declared Model","value":',
            _jsonString(data.declaredModel),
            '},{"trait_type":"Creation Attestation","value":"',
            _creationAttestationStatus(data.creationAttestationDigest),
            '"},{"trait_type":"Texture Density","value":"',
            _textureDensity(metrics.loomWeight),
            '"}]'
        );
    }

    function _tokenProperties(IThoughtRenderer.TokenData calldata data) private pure returns (string memory) {
        StructuralMetrics memory metrics = _structuralMetrics(data.promptLine, data.agentLine);
        return string.concat(
            '{"promptBytes":',
            _toString(metrics.promptBytes),
            ',"agentBytes":',
            _toString(metrics.agentBytes),
            ',"promptWeight":',
            _toString(metrics.promptWeight),
            ',"agentWeight":',
            _toString(metrics.agentWeight),
            ',"loomWeight":',
            _toString(metrics.loomWeight),
            ',"bitDistance":',
            _toString(metrics.bitDistance),
            ',"protocolReleaseId":"',
            _bytes32ToHex(data.protocolReleaseId),
            '","manifestKeccak256":"',
            _bytes32ToHex(data.manifestKeccak256),
            '","rendererId":"',
            RENDERER_ID,
            '","rendererProfileKeccak256":"',
            _bytes32ToHex(RENDERER_PROFILE_KECCAK256),
            '","workProfileId":"',
            WORK_PROFILE_ID,
            '","workProfileKeccak256":"',
            _bytes32ToHex(WORK_PROFILE_KECCAK256),
            '","creationAttestationProfileId":"',
            _bytes32ToHex(CREATION_ATTESTATION_PROFILE_ID),
            '","creationAttestationVerifier":"',
            _addressToHex(data.creationAttestationVerifier),
            '","creationAttestationDigest":"',
            _bytes32ToHex(data.creationAttestationDigest),
            '","provenanceKeccak256":"',
            _bytes32ToHex(keccak256(bytes(data.provenanceJson))),
            '"}'
        );
    }

    function _tokenThought(IThoughtRenderer.TokenData calldata data, bytes calldata packedField)
        private
        pure
        returns (string memory)
    {
        bytes32 promptLineHash = keccak256(bytes(data.promptLine));
        bytes32 agentLineHash = keccak256(bytes(data.agentLine));
        bytes32 binaryFieldHash = keccak256(packedField);
        bytes32 derivedAgentIdentityHash = keccak256(abi.encode(AGENT_IDENTITY_DOMAIN, agentLineHash));
        bytes32 derivedWorkHash =
            keccak256(abi.encode(WORK_DOMAIN, RENDERER_ID_HASH, promptLineHash, agentLineHash, binaryFieldHash));
        bytes32 provenanceHash = keccak256(bytes(data.provenanceJson));
        string memory identity = string.concat(
            '{"renderer":"',
            RENDERER_ID,
            '","protocolReleaseId":"',
            _bytes32ToHex(data.protocolReleaseId),
            '","manifestKeccak256":"',
            _bytes32ToHex(data.manifestKeccak256),
            '","promptLine":',
            _jsonString(data.promptLine),
            ',"agentLine":',
            _jsonString(data.agentLine),
            ',"declaredAgent":',
            _jsonString(data.declaredAgent),
            ',"declaredModel":',
            _jsonString(data.declaredModel),
            ',"creationAttestation":"',
            _creationAttestationStatus(data.creationAttestationDigest),
            '","binaryFieldPacked":"',
            _bytesToHex(packedField),
            '","binaryFieldKeccak256":"',
            _bytes32ToHex(binaryFieldHash)
        );
        string memory hashes = string.concat(
            '","promptLineKeccak256":"',
            _bytes32ToHex(promptLineHash),
            '","agentLineKeccak256":"',
            _bytes32ToHex(agentLineHash),
            '","agentIdentityHash":"',
            _bytes32ToHex(derivedAgentIdentityHash),
            '","workHash":"',
            _bytes32ToHex(derivedWorkHash),
            '","provenanceHash":"',
            _bytes32ToHex(provenanceHash),
            '","thoughtSpecId":"',
            _bytes32ToHex(data.thoughtSpecId),
            '","thoughtSpecHash":"',
            _bytes32ToHex(data.thoughtSpecHash)
        );
        string memory context = string.concat(
            '","pathId":"',
            _toString(data.pathId),
            '","pathSerial":"',
            _toString(data.pathSerial),
            '","minter":"',
            _addressToHex(data.minter),
            '","mintedAt":"',
            _toString(data.mintedAt),
            '","provenance":',
            _jsonString(data.provenanceJson),
            "}"
        );
        return string.concat(identity, hashes, context);
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
        return (row >= 12 && row <= 14 && column >= 2 && column <= 29)
            || (row >= 28 && row <= 29 && column >= 4 && column <= 27);
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
            '" data-rendered-cells="892" data-cleared-cells="132" data-pack="msb-first-128-bytes" data-cell-size="28" data-origin-x="32" data-origin-y="32" data-dot-radius="10" data-zero="hollow-circle"><defs><circle id="binary-one" r="10" fill="#006100"/><pattern id="binary-zero-pattern" x="32" y="32" width="28" height="28" patternUnits="userSpaceOnUse"><circle id="binary-zero" cx="14" cy="14" r="10" fill="none" stroke="#006100" stroke-width="1"/></pattern></defs><rect id="binary-zero-field" x="32" y="32" width="896" height="896" fill="url(#binary-zero-pattern)"/>'
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

    function _structuralMetrics(string memory promptLine, string memory agentLine)
        private
        pure
        returns (StructuralMetrics memory metrics)
    {
        bytes memory promptData = bytes(promptLine);
        bytes memory agentData = bytes(agentLine);
        metrics.promptBytes = promptData.length;
        metrics.agentBytes = agentData.length;
        for (uint256 i = 0; i < 64; i++) {
            uint8 promptByte = uint8(promptData[i % promptData.length]);
            uint8 agentByte = uint8(agentData[i % agentData.length]);
            metrics.promptWeight += _popcount8(promptByte);
            metrics.agentWeight += _popcount8(agentByte);
            metrics.bitDistance += _popcount8(promptByte ^ agentByte);
        }
        metrics.loomWeight = metrics.promptWeight + metrics.agentWeight;
    }

    function _textureDensity(uint256 loomWeight) private pure returns (string memory) {
        if (loomWeight <= 460) return "Open";
        if (loomWeight <= 563) return "Balanced";
        return "Dense";
    }

    function _creationAttestationStatus(bytes32 digest) private pure returns (string memory) {
        return digest == bytes32(0) ? "Unattested" : "Inshell THOUGHT App";
    }

    function _popcount8(uint8 value) private pure returns (uint256 count) {
        while (value != 0) {
            value &= value - 1;
            count++;
        }
    }

    function _jsonString(string memory value) private pure returns (string memory) {
        return string.concat('"', _jsonEscape(value), '"');
    }

    function _jsonEscape(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        uint256 outputLen;
        for (uint256 i = 0; i < input.length; i++) {
            uint8 charCode = uint8(input[i]);
            if (input[i] == '"' || input[i] == "\\" || input[i] == "\n" || input[i] == "\r" || input[i] == "\t") {
                outputLen += 2;
            } else if (charCode < 0x20) {
                outputLen += 6;
            } else {
                outputLen++;
            }
        }

        bytes memory output = new bytes(outputLen);
        uint256 cursor;
        for (uint256 i = 0; i < input.length; i++) {
            uint8 charCode = uint8(input[i]);
            if (input[i] == '"') {
                output[cursor++] = "\\";
                output[cursor++] = '"';
            } else if (input[i] == "\\") {
                output[cursor++] = "\\";
                output[cursor++] = "\\";
            } else if (input[i] == "\n") {
                output[cursor++] = "\\";
                output[cursor++] = "n";
            } else if (input[i] == "\r") {
                output[cursor++] = "\\";
                output[cursor++] = "r";
            } else if (input[i] == "\t") {
                output[cursor++] = "\\";
                output[cursor++] = "t";
            } else if (charCode < 0x20) {
                output[cursor++] = "\\";
                output[cursor++] = "u";
                output[cursor++] = "0";
                output[cursor++] = "0";
                output[cursor++] = HEX_DIGITS[charCode >> 4];
                output[cursor++] = HEX_DIGITS[charCode & 0x0f];
            } else {
                output[cursor++] = input[i];
            }
        }
        return string(output);
    }

    function _bytesToHex(bytes calldata value) private pure returns (string memory) {
        bytes memory output = new bytes(2 + value.length * 2);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < value.length; i++) {
            uint8 byteValue = uint8(value[i]);
            output[2 + (i * 2)] = HEX_DIGITS[byteValue >> 4];
            output[3 + (i * 2)] = HEX_DIGITS[byteValue & 0x0f];
        }
        return string(output);
    }

    function _bytes32ToHex(bytes32 value) private pure returns (string memory) {
        bytes memory output = new bytes(66);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 byteValue = uint8(value[i]);
            output[2 + (i * 2)] = HEX_DIGITS[byteValue >> 4];
            output[3 + (i * 2)] = HEX_DIGITS[byteValue & 0x0f];
        }
        return string(output);
    }

    function _addressToHex(address account) private pure returns (string memory) {
        bytes20 value = bytes20(account);
        bytes memory output = new bytes(42);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            uint8 byteValue = uint8(value[i]);
            output[2 + (i * 2)] = HEX_DIGITS[byteValue >> 4];
            output[3 + (i * 2)] = HEX_DIGITS[byteValue & 0x0f];
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
