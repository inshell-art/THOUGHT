// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "../Base64.sol";
import {ContractCodeStorage} from "../ContractCodeStorage.sol";
import {IThoughtRendererV2} from "./IThoughtRendererV2.sol";
import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";
import {ThoughtV2ContextProfile} from "./ThoughtV2ContextProfile.sol";
import {ThoughtV2Identity} from "./ThoughtV2Identity.sol";
import {ThoughtV2WorkProfile} from "./ThoughtV2WorkProfile.sol";

/// @notice Canonical current-V2 renderer using reviewed Humanist Smooth native SVG paths.
/// @dev Glyph definitions are immutable code-storage dependencies bound by exact hashes.
contract ThoughtRendererV2 is IThoughtRendererV2 {
    error InvalidGlyphDefinitionsPointer(uint8 part);
    error TooManyRenderedRows();

    string public constant RENDERER_ID = ThoughtV2Constants.RENDERER_ID;
    bytes32 public constant RENDERER_ID_HASH = ThoughtV2Constants.RENDERER_ID_HASH;
    string public constant METADATA_PROFILE_ID = ThoughtV2Constants.METADATA_PROFILE_ID;
    bytes32 public constant METADATA_PROFILE_ID_HASH = ThoughtV2Constants.METADATA_PROFILE_ID_HASH;
    string public constant WORK_PROFILE_ID = ThoughtV2Constants.WORK_PROFILE_ID;
    string public constant CONTEXT_PROFILE_ID = ThoughtV2Constants.CONTEXT_PROFILE_ID;
    bytes32 public constant CREATION_ATTESTATION_PROFILE_ID = ThoughtV2Constants.CREATION_ATTESTATION_PROFILE_ID;

    string public constant IMPLEMENTATION_ID =
        "inshell.thought.renderer.v2.humanist-smooth-native-paths-frame-32-006100-green-00ff00";
    string public constant GLYPH_LIBRARY_SET_ID = "inshell.thought.glyph-library.set-03";
    string public constant GLYPH_LIBRARY_MEMBER_ID = "inshell.thought.glyph-library.set-03.humanist-smooth";
    string public constant GLYPH_FAMILY_NAME = "Humanist Smooth";
    string public constant GLYPH_LICENSE = "OFL-1.1";
    string public constant GLYPH_COLOR = "#00ff00";
    string public constant FRAME_COLOR = "#006100";
    bytes32 public constant GLYPH_SOURCE_SHA256 =
        0x66ddd9d4fca7fc07dded2c3295e5562c8cfcf966e4ef8bf4843646616899b7f8;
    bytes32 public constant GLYPH_SOURCE_KECCAK256 =
        0xdb76b1d4ed56646a65d138f47690a98c52593446a6c79841c1804637d0c4dc70;
    bytes32 public constant GLYPH_DEFINITIONS_PART_1_KECCAK256 =
        0x3397ceb983a0e0fcbeee7154eebe059501315c7f34b1730ce9d37f2982425f5e;
    bytes32 public constant GLYPH_DEFINITIONS_PART_2_KECCAK256 =
        0x9bc9bd78a6ed099748994515be64879548413a98187dcc45faaba65af72c7f32;
    bytes32 public constant GLYPH_DEFINITIONS_INDEX_KECCAK256 =
        0x113d43ed0e3a6ce486779bca9734801493dd9c5c629e4816b8be3d445f1b9825;
    uint256 public constant GLYPH_VISUAL_BASELINE_HUNDREDTHS = 558;
    uint256 public constant GLYPH_FIXED_ADVANCE = 6;
    uint256 public constant GLYPH_SCALE_TENTHS = 48;
    uint256 public constant MAX_COLUMNS = 29;
    uint256 public constant MAX_ROWS = 4;
    string public constant WRAP_PROFILE = "greedy-space-then-fixed-cell-overlong-word";
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
        bytes memory part1 = _validatedDefinitionsPart(
            glyphDefinitionsPointer1_, GLYPH_DEFINITIONS_PART_1_KECCAK256, 1
        );
        bytes memory part2 = _validatedDefinitionsPart(
            glyphDefinitionsPointer2_, GLYPH_DEFINITIONS_PART_2_KECCAK256, 2
        );
        _validatedDefinitionsPart(
            glyphDefinitionsIndexPointer_, GLYPH_DEFINITIONS_INDEX_KECCAK256, 3
        );
        glyphDefinitionsPointer1 = glyphDefinitionsPointer1_;
        glyphDefinitionsPointer2 = glyphDefinitionsPointer2_;
        glyphDefinitionsIndexPointer = glyphDefinitionsIndexPointer_;
        glyphDefinitionsKeccak256 = keccak256(bytes.concat(part1, part2));
    }

    function render(string calldata promptLine, string calldata agentLine) external view returns (string memory) {
        ThoughtV2WorkProfile.validate(promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        ThoughtV2WorkProfile.validate(agentLine, ThoughtV2WorkProfile.LineKind.Agent);
        return _render(promptLine, agentLine);
    }

    function tokenURI(TokenData calldata data) external view returns (string memory) {
        ThoughtV2WorkProfile.validate(data.promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        ThoughtV2WorkProfile.validate(data.agentLine, ThoughtV2WorkProfile.LineKind.Agent);
        ThoughtV2ContextProfile.validate(data.declaredAgent, ThoughtV2ContextProfile.ContextKind.DeclaredAgent);
        ThoughtV2ContextProfile.validate(data.declaredModel, ThoughtV2ContextProfile.ContextKind.DeclaredModel);

        string memory metadata = string.concat(
            '{"name":"THOUGHT #',
            _toString(data.tokenId),
            '","description":"THOUGHT V2 records the narrow terminal channel where a human and an Agent meet.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(_render(data.promptLine, data.agentLine))),
            '","background_color":"000000","attributes":',
            _attributes(data),
            ',"properties":',
            _properties(data),
            ',"thought":',
            _thought(data, msg.sender),
            "}"
        );
        return string.concat("data:application/json;base64,", Base64.encode(bytes(metadata)));
    }

    function _render(string calldata promptLine, string calldata agentLine) private view returns (string memory) {
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
            '" aria-label="Prompt and Agent response in a terminal chat layout">',
            '<rect id="work-frame" width="1024" height="1024" fill="#006100"/>',
            '<g id="work-canvas" transform="translate(32 32)">',
            '<rect id="canvas-bg" width="960" height="960" fill="#000000"/>',
            definitions,
            '<g id="prompt-line" fill="#00ff00" data-source="',
            _xmlEscape(promptLine),
            '" data-rows="',
            _toString(promptRowCount),
            '">',
            _renderRows(promptRows, promptRowCount, true),
            "</g>",
            '<g id="agent-line" fill="#00ff00" data-source="',
            _xmlEscape(agentLine),
            '" data-rows="',
            _toString(agentRowCount),
            '">',
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

    function _definitions(string calldata promptLine, string calldata agentLine)
        private
        view
        returns (string memory)
    {
        bool[128] memory used;
        _markUsed(used, bytes(promptLine));
        _markUsed(used, bytes(agentLine));

        bytes memory index = ContractCodeStorage.read(glyphDefinitionsIndexPointer);
        bytes memory order = bytes(CANONICAL_ORDER);
        uint256 definitionsLength;
        for (uint256 orderIndex = 1; orderIndex < order.length; orderIndex++) {
            if (!used[uint8(order[orderIndex])]) continue;
            (, , uint256 length) = _glyphLocation(index, orderIndex - 1);
            definitionsLength += length;
        }

        bytes memory definitions = new bytes(definitionsLength);
        uint256 destinationOffset;
        for (uint256 orderIndex = 1; orderIndex < order.length; orderIndex++) {
            if (!used[uint8(order[orderIndex])]) continue;
            (uint8 part, uint256 sourceOffset, uint256 length) =
                _glyphLocation(index, orderIndex - 1);
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
        uint256 yTenths = prompt ? 1_408 : 8_448 - (rowCount * 640);
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
            yTenths += 640;
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

    function _attributes(TokenData calldata data) private pure returns (string memory) {
        uint256 promptBytes = bytes(data.promptLine).length;
        uint256 agentBytes = bytes(data.agentLine).length;
        string memory contractTraits = string.concat(
            '{"trait_type":"Creation Attestation","value":"',
            _creationAttestationStatus(data.creationAttestationDigest),
            '"},{"display_type":"number","max_value":64,"trait_type":"Prompt Bytes","value":',
            _toString(promptBytes),
            '},{"display_type":"number","max_value":64,"trait_type":"Agent Bytes","value":',
            _toString(agentBytes),
            '},{"display_type":"number","max_value":128,"trait_type":"Pair Bytes","value":',
            _toString(promptBytes + agentBytes),
            '},{"trait_type":"Prompt Length","value":"',
            _lengthClass(promptBytes),
            '"},{"trait_type":"Agent Length","value":"',
            _lengthClass(agentBytes),
            '"}]'
        );
        if (data.creationAttestationDigest == bytes32(0)) {
            return string.concat("[", contractTraits);
        }
        return string.concat(
            '[{"trait_type":"Attested Agent","value":',
            _jsonString(data.declaredAgent),
            '},{"trait_type":"Attested Model","value":',
            _jsonString(data.declaredModel),
            "},",
            contractTraits
        );
    }

    function _properties(TokenData calldata data) private view returns (string memory) {
        bytes32 promptHash = keccak256(bytes(data.promptLine));
        bytes32 agentHash = keccak256(bytes(data.agentLine));
        return string.concat(
            '{"agentLine":',
            _jsonString(data.agentLine),
            ',"agentLineKeccak256":"',
            _bytes32ToHex(agentHash),
            '","conversationIdentityHash":"',
            _bytes32ToHex(ThoughtV2Identity.conversationIdentityHash(promptHash, agentHash)),
            '","declaredAgent":',
            _jsonString(data.declaredAgent),
            ',"declaredAgentKeccak256":"',
            _bytes32ToHex(keccak256(bytes(data.declaredAgent))),
            '","declaredModel":',
            _jsonString(data.declaredModel),
            ',"declaredModelKeccak256":"',
            _bytes32ToHex(keccak256(bytes(data.declaredModel))),
            '","glyphColor":"#00ff00","glyphDefinitionsKeccak256":"',
            _bytes32ToHex(glyphDefinitionsKeccak256),
            '","glyphLibraryMemberId":"',
            GLYPH_LIBRARY_MEMBER_ID,
            '","glyphSourceSha256":"',
            _bytes32ToHex(GLYPH_SOURCE_SHA256),
            '","promptLine":',
            _jsonString(data.promptLine),
            ',"promptLineKeccak256":"',
            _bytes32ToHex(promptHash),
            '","provenanceKeccak256":"',
            _bytes32ToHex(keccak256(bytes(data.provenanceJson))),
            '","rendererImplementationId":"',
            IMPLEMENTATION_ID,
            '","workHash":"',
            _bytes32ToHex(ThoughtV2Identity.workHash(promptHash, agentHash)),
            '"}'
        );
    }

    function _thought(TokenData calldata data, address thoughtNft) private view returns (string memory) {
        bytes32 promptHash = keccak256(bytes(data.promptLine));
        bytes32 agentHash = keccak256(bytes(data.agentLine));
        bytes32 declarationAgentHash = keccak256(bytes(data.declaredAgent));
        bytes32 declarationModelHash = keccak256(bytes(data.declaredModel));
        bytes32 provenanceHash = keccak256(bytes(data.provenanceJson));
        bytes32 conversationHash = ThoughtV2Identity.conversationIdentityHash(promptHash, agentHash);
        bytes32 derivedWorkHash = ThoughtV2Identity.workHash(promptHash, agentHash);
        return string.concat(
            _thoughtWork(data, promptHash, agentHash, conversationHash, derivedWorkHash),
            _thoughtDeclarations(data, declarationAgentHash, declarationModelHash),
            _thoughtProtocolAndMint(data, thoughtNft, provenanceHash),
            '"provenanceHash":"',
            _bytes32ToHex(provenanceHash),
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
            _bytes32ToHex(derivedWorkHash),
            '"}'
        );
    }

    function _thoughtWork(
        TokenData calldata data,
        bytes32 promptHash,
        bytes32 agentHash,
        bytes32 conversationHash,
        bytes32 derivedWorkHash
    ) private pure returns (string memory) {
        return string.concat(
            '{"agentLine":',
            _jsonString(data.agentLine),
            ',"agentLineKeccak256":"',
            _bytes32ToHex(agentHash),
            '","conversationIdentityHash":"',
            _bytes32ToHex(conversationHash),
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
            _bytes32ToHex(promptHash),
            '","workHashPrecheck":"',
            _bytes32ToHex(derivedWorkHash),
            '",'
        );
    }

    function _thoughtDeclarations(TokenData calldata data, bytes32 declarationAgentHash, bytes32 declarationModelHash)
        private
        pure
        returns (string memory)
    {
        return string.concat(
            '"declarations":{"agent":{"keccak256":"',
            _bytes32ToHex(declarationAgentHash),
            '","label":',
            _jsonString(data.declaredAgent),
            ',"status":"declared-unverified"},"model":{"keccak256":"',
            _bytes32ToHex(declarationModelHash),
            '","label":',
            _jsonString(data.declaredModel),
            ',"status":"declared-unverified"},"workIdentityInput":false},'
        );
    }

    function _thoughtProtocolAndMint(TokenData calldata data, address thoughtNft, bytes32 provenanceHash)
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
            _bytes32ToHex(provenanceHash),
            '",'
        );
    }

    function _creationAttestationStatus(bytes32 digest) private pure returns (string memory) {
        return digest == bytes32(0) ? "Unattested" : "Inshell THOUGHT App";
    }

    function _lengthClass(uint256 byteLength) private pure returns (string memory) {
        if (byteLength == 1) return "Minimum";
        if (byteLength <= 16) return "Compact";
        if (byteLength <= 32) return "Standard";
        if (byteLength < 64) return "Extended";
        return "Maximum";
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
