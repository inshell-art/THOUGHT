// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "../Base64.sol";
import {ContractCodeStorage} from "../ContractCodeStorage.sol";
import {IThoughtRendererV2} from "./IThoughtRendererV2.sol";
import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";
import {ThoughtV2Identity} from "./ThoughtV2Identity.sol";
import {ThoughtV2WorkProfile} from "./ThoughtV2WorkProfile.sol";

/// @notice Canonical current-V2 renderer using the sealed Inshell Mono 76 v1.0.0 native SVG paths.
/// @dev The exact IM76 payload is an immutable code-storage dependency bound by its release hash.
contract ThoughtRendererV2 is IThoughtRendererV2 {
    error InvalidGlyphDataPointer();
    error TooManyRenderedRows();

    struct DerivedMetadata {
        string promptHash;
        string agentHash;
        string agentRecordHash;
        string modelRecordHash;
        string provenanceHash;
        string conversationHash;
        string workHash;
    }

    string public constant RENDERER_ID = ThoughtV2Constants.RENDERER_ID;
    bytes32 public constant RENDERER_ID_HASH = ThoughtV2Constants.RENDERER_ID_HASH;
    string public constant METADATA_PROFILE_ID = ThoughtV2Constants.METADATA_PROFILE_ID;
    bytes32 public constant METADATA_PROFILE_ID_HASH = ThoughtV2Constants.METADATA_PROFILE_ID_HASH;
    string public constant EXTERNAL_URL_BASE = ThoughtV2Constants.EXTERNAL_URL_BASE;
    string public constant WORK_PROFILE_ID = ThoughtV2Constants.WORK_PROFILE_ID;
    string public constant CONTEXT_PROFILE_ID = ThoughtV2Constants.CONTEXT_PROFILE_ID;
    bytes32 public constant CREATION_ATTESTATION_PROFILE_ID = ThoughtV2Constants.CREATION_ATTESTATION_PROFILE_ID;

    string public constant IMPLEMENTATION_ID =
        "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom";
    string public constant GLYPH_LIBRARY_SET_ID = "inshell.mono-76";
    string public constant GLYPH_LIBRARY_MEMBER_ID = "inshell.mono-76";
    string public constant GLYPH_FAMILY_NAME = "Inshell Mono 76";
    string public constant GLYPH_RELEASE_TAG = "v1.0.0";
    string public constant GLYPH_LICENSE = "UNLICENSED";
    string public constant GLYPH_COLOR = "#00ff00";
    string public constant FRAME_COLOR = "#006100";
    bytes32 public constant GLYPH_SOURCE_SHA256 = 0x7ed61ed6335fce2c1e58184916f5d344b8384fc05d4c616e83c35ad4fa9ed47f;
    bytes32 public constant GLYPH_PACKED_SHA256 = 0x3acc0a9cf60c00aa2d512356386d1e2a999499896e25661e8e631d53d5e10926;
    bytes32 public constant GLYPH_PACKED_KECCAK256 =
        0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081;
    bytes32 public constant GLYPH_MANUAL_EDIT_PAYLOAD_SHA256 =
        0x755f16a8f70d9141a8b2175bc1bafeaef93ead366179d85f3597bc3dfc9ddc56;
    bytes32 public constant glyphDefinitionsKeccak256 = GLYPH_PACKED_KECCAK256;
    uint256 public constant GLYPH_FIXED_ADVANCE = 10;
    uint256 public constant GLYPH_SCALE_HUNDREDTHS = 288;
    uint256 public constant GLYPH_CELL_WIDTH_HUNDREDTHS = 2_880;
    uint256 public constant GLYPH_ORIGIN_SHIFT_HUNDREDTHS = 288;
    uint256 public constant GLYPH_STROKE_WIDTH_HUNDREDTHS = 123;
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
        return _render(promptLine, agentLine);
    }

    function tokenURI(TokenData calldata data) external view returns (string memory) {
        // ThoughtNFTV2 validates Agent/Model records before storing TokenData. Re-inlining the
        // visible-UTF8 context validator here adds no protection to canonical token metadata.
        ThoughtV2WorkProfile.validate(data.promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        ThoughtV2WorkProfile.validate(data.agentLine, ThoughtV2WorkProfile.LineKind.Agent);
        DerivedMetadata memory derived = _deriveMetadata(data);

        string memory metadata = string.concat(
            '{"name":"THOUGHT #',
            _toString(data.tokenId),
            '","description":"THOUGHT V2 preserves a narrow terminal channel between human intention and Agent response, transforming their dialogue into an on-chain artwork.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(_render(data.promptLine, data.agentLine))),
            '","external_url":"',
            EXTERNAL_URL_BASE,
            _toString(data.tokenId),
            '","background_color":"000000","attributes":',
            _attributes(data),
            ',"properties":',
            _properties(data, derived),
            ',"thought":',
            _thought(data, msg.sender, derived),
            "}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(metadata)));
    }

    function _render(string calldata promptLine, string calldata agentLine) private view returns (string memory) {
        bytes memory promptBytes = bytes(promptLine);
        bytes memory agentBytes = bytes(agentLine);
        (bytes[] memory promptRows, uint256 promptRowCount) = _wrap(promptBytes);
        (bytes[] memory agentRows, uint256 agentRowCount) = _wrap(agentBytes);
        string memory definitions = _definitions(promptBytes, agentBytes);
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
            _xmlEscape(promptBytes),
            '" data-rows="',
            _toString(promptRowCount),
            '" data-field-x="57.6" data-field-y="128" data-field-width="844.8" data-field-height="256" data-field-bottom="384" data-horizontal-align="right" data-vertical-align="top">',
            _renderRows(promptRows, promptRowCount, true),
            "</g>",
            '<g id="agent-line" fill="none" stroke="#00ff00" stroke-width="1.23" stroke-linecap="round" stroke-linejoin="round" data-source="',
            _xmlEscape(agentBytes),
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

    function _attributes(TokenData calldata data) private pure returns (string memory) {
        uint256 promptBytes = bytes(data.promptLine).length;
        uint256 agentBytes = bytes(data.agentLine).length;
        return string.concat(
            '[{"trait_type":"Agent","value":',
            _jsonString(data.agent),
            '},{"trait_type":"Model","value":',
            _jsonString(data.model),
            '},{"trait_type":"Creation Attestation","value":"',
            _creationAttestationStatus(data.creationAttestationDigest),
            '"},{"display_type":"number","max_value":64,"trait_type":"Prompt Bytes","value":',
            _toString(promptBytes),
            '},{"display_type":"number","max_value":64,"trait_type":"Agent Bytes","value":',
            _toString(agentBytes),
            "}]"
        );
    }

    function _properties(TokenData calldata data, DerivedMetadata memory derived) private view returns (string memory) {
        return string.concat(
            '{"agentLine":',
            _jsonString(data.agentLine),
            ',"agentLineKeccak256":"',
            derived.agentHash,
            '","conversationIdentityHash":"',
            derived.conversationHash,
            '","agent":',
            _jsonString(data.agent),
            ',"agentKeccak256":"',
            derived.agentRecordHash,
            '","model":',
            _jsonString(data.model),
            ',"modelKeccak256":"',
            derived.modelRecordHash,
            '","glyphColor":"#00ff00","glyphDefinitionsKeccak256":"',
            _bytes32ToHex(glyphDefinitionsKeccak256),
            '","glyphLibraryMemberId":"',
            GLYPH_LIBRARY_MEMBER_ID,
            '","glyphSourceSha256":"',
            _bytes32ToHex(GLYPH_SOURCE_SHA256),
            '","promptLine":',
            _jsonString(data.promptLine),
            ',"promptLineKeccak256":"',
            derived.promptHash,
            '","provenanceKeccak256":"',
            derived.provenanceHash,
            '","rendererImplementationId":"',
            IMPLEMENTATION_ID,
            '","workHash":"',
            derived.workHash,
            '"}'
        );
    }

    function _thought(TokenData calldata data, address thoughtNft, DerivedMetadata memory derived)
        private
        view
        returns (string memory)
    {
        return string.concat(
            _thoughtWork(data, derived.promptHash, derived.agentHash, derived.conversationHash, derived.workHash),
            _thoughtRecords(data, derived.agentRecordHash, derived.modelRecordHash),
            _thoughtProtocolAndMint(data, thoughtNft, derived.provenanceHash),
            '"provenanceHash":"',
            derived.provenanceHash,
            '","provenanceJson":',
            _jsonString(data.provenanceJson),
            ',"provenanceProfileId":"inshell.thought.provenance.v2","rendererId":"',
            RENDERER_ID,
            '","rendererIdHash":"',
            _bytes32ToHex(RENDERER_ID_HASH),
            '","rendererImplementationId":"',
            IMPLEMENTATION_ID,
            '","rendererReleaseReady":true,"status":"minted","workProfileId":"',
            WORK_PROFILE_ID,
            '","workHash":"',
            derived.workHash,
            '"}'
        );
    }

    function _deriveMetadata(TokenData calldata data) private pure returns (DerivedMetadata memory derived) {
        bytes32 promptHash = keccak256(bytes(data.promptLine));
        bytes32 agentHash = keccak256(bytes(data.agentLine));
        derived.promptHash = _bytes32ToHex(promptHash);
        derived.agentHash = _bytes32ToHex(agentHash);
        derived.agentRecordHash = _bytes32ToHex(keccak256(bytes(data.agent)));
        derived.modelRecordHash = _bytes32ToHex(keccak256(bytes(data.model)));
        derived.provenanceHash = _bytes32ToHex(keccak256(bytes(data.provenanceJson)));
        derived.conversationHash = _bytes32ToHex(ThoughtV2Identity.conversationIdentityHash(promptHash, agentHash));
        derived.workHash = _bytes32ToHex(ThoughtV2Identity.workHash(promptHash, agentHash));
    }

    function _thoughtWork(
        TokenData calldata data,
        string memory promptHash,
        string memory agentHash,
        string memory conversationHash,
        string memory derivedWorkHash
    ) private pure returns (string memory) {
        return string.concat(
            '{"agentLine":',
            _jsonString(data.agentLine),
            ',"agentLineKeccak256":"',
            agentHash,
            '","conversationIdentityHash":"',
            conversationHash,
            '","creationAttestation":{"digest":"',
            _bytes32ToHex(data.creationAttestationDigest),
            '","profileId":"',
            _bytes32ToHex(CREATION_ATTESTATION_PROFILE_ID),
            '","status":"',
            _creationAttestationStatus(data.creationAttestationDigest),
            '","verifier":"',
            _addressToHex(data.creationAttestationVerifier),
            '"},"metadataProfileId":"',
            METADATA_PROFILE_ID,
            '","metadataProfileIdHash":"',
            _bytes32ToHex(METADATA_PROFILE_ID_HASH),
            '","promptLine":',
            _jsonString(data.promptLine),
            ',"promptLineKeccak256":"',
            promptHash,
            '","workHashPrecheck":"',
            derivedWorkHash,
            '",'
        );
    }

    function _thoughtRecords(TokenData calldata data, string memory agentRecordHash, string memory modelRecordHash)
        private
        pure
        returns (string memory)
    {
        return string.concat(
            '"records":{"agent":{"keccak256":"',
            agentRecordHash,
            '","label":',
            _jsonString(data.agent),
            '},"model":{"keccak256":"',
            modelRecordHash,
            '","label":',
            _jsonString(data.model),
            '},"workIdentityInput":false},'
        );
    }

    function _thoughtProtocolAndMint(TokenData calldata data, address thoughtNft, string memory provenanceHash)
        private
        view
        returns (string memory)
    {
        return string.concat(
            '"mint":{"chainId":"',
            _toString(block.chainid),
            '","contract":"',
            _addressToHex(thoughtNft),
            '","minter":"',
            _addressToHex(data.minter),
            '","mintedAt":"',
            _toString(data.mintedAt),
            '","pathId":"',
            _toString(data.pathId),
            '","pathSerial":"',
            _toString(data.pathSerial),
            '","status":"minted","tokenId":"',
            _toString(data.tokenId),
            '"},"protocol":{"manifestKeccak256":"',
            _bytes32ToHex(data.manifestKeccak256),
            '","protocolReleaseId":"',
            _bytes32ToHex(data.protocolReleaseId),
            '","releaseStatus":"registered","thoughtSpecHash":"',
            _bytes32ToHex(data.thoughtSpecHash),
            '","thoughtSpecId":"',
            _bytes32ToHex(data.thoughtSpecId),
            '"},"provenanceCommitmentCheck":"',
            provenanceHash,
            '",'
        );
    }

    function _creationAttestationStatus(bytes32 digest) private pure returns (string memory) {
        return digest == bytes32(0) ? "Unattested" : "Inshell THOUGHT App";
    }

    function _jsonString(string memory value) private pure returns (string memory) {
        return string.concat('"', _jsonEscape(value), '"');
    }

    function _jsonEscape(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        uint256 outputLength;
        for (uint256 i = 0; i < input.length; i++) {
            uint8 character = uint8(input[i]);
            outputLength += input[i] == '"' || input[i] == "\\" || character < 0x20 ? 2 : 1;
            if (character < 0x20 && input[i] != "\n" && input[i] != "\r" && input[i] != "\t") {
                outputLength += 4;
            }
        }

        bytes memory output = new bytes(outputLength);
        uint256 cursor;
        for (uint256 i = 0; i < input.length; i++) {
            uint8 character = uint8(input[i]);
            if (input[i] == '"' || input[i] == "\\") {
                output[cursor++] = "\\";
                output[cursor++] = input[i];
            } else if (input[i] == "\n" || input[i] == "\r" || input[i] == "\t") {
                output[cursor++] = "\\";
                if (input[i] == "\n") output[cursor++] = "n";
                else if (input[i] == "\r") output[cursor++] = "r";
                else output[cursor++] = "t";
            } else if (character < 0x20) {
                output[cursor++] = "\\";
                output[cursor++] = "u";
                output[cursor++] = "0";
                output[cursor++] = "0";
                output[cursor++] = HEX_DIGITS[character >> 4];
                output[cursor++] = HEX_DIGITS[character & 0x0f];
            } else {
                output[cursor++] = input[i];
            }
        }
        return string(output);
    }

    function _xmlEscape(bytes memory input) private pure returns (string memory) {
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

    function _bytes32ToHex(bytes32 value) private pure returns (string memory) {
        bytes memory output = new bytes(66);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 byteValue = uint8(value[i]);
            output[2 + i * 2] = HEX_DIGITS[byteValue >> 4];
            output[3 + i * 2] = HEX_DIGITS[byteValue & 0x0f];
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
            output[2 + i * 2] = HEX_DIGITS[byteValue >> 4];
            output[3 + i * 2] = HEX_DIGITS[byteValue & 0x0f];
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
