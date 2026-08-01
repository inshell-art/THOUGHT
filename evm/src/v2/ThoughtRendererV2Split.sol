// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "../Base64.sol";
import {IThoughtRendererV2} from "./IThoughtRendererV2.sol";
import {IThoughtSvgRendererV2} from "./IThoughtSvgRendererV2.sol";
import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";
import {ThoughtV2Identity} from "./ThoughtV2Identity.sol";

/// @notice Split-candidate metadata renderer coordinating a standalone SVG renderer.
contract ThoughtRendererV2Split is IThoughtRendererV2 {
    error InvalidSvgRenderer();

    struct DerivedMetadata {
        bytes32 promptHash;
        bytes32 agentHash;
        bytes32 agentRecordHash;
        bytes32 modelRecordHash;
        bytes32 provenanceHash;
        bytes32 conversationHash;
        bytes32 workHash;
    }

    string public constant RENDERER_ID = ThoughtV2Constants.RENDERER_ID;
    bytes32 public constant RENDERER_ID_HASH = ThoughtV2Constants.RENDERER_ID_HASH;
    string public constant METADATA_PROFILE_ID = ThoughtV2Constants.METADATA_PROFILE_ID;
    bytes32 public constant METADATA_PROFILE_ID_HASH = ThoughtV2Constants.METADATA_PROFILE_ID_HASH;
    string public constant EXTERNAL_URL_BASE = ThoughtV2Constants.EXTERNAL_URL_BASE;
    string public constant WORK_PROFILE_ID = ThoughtV2Constants.WORK_PROFILE_ID;
    string public constant CONTEXT_PROFILE_ID = ThoughtV2Constants.CONTEXT_PROFILE_ID;
    bytes32 public constant CREATION_ATTESTATION_PROFILE_ID = ThoughtV2Constants.CREATION_ATTESTATION_PROFILE_ID;

    string public constant GLYPH_COLOR = "#00ff00";
    string public constant FRAME_COLOR = "#006100";
    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    address public immutable svgRenderer;
    address public immutable glyphDefinitionsPointer1;
    address public immutable glyphDefinitionsPointer2;
    address public immutable glyphDefinitionsIndexPointer;
    bytes32 public immutable glyphDefinitionsKeccak256;

    constructor(address svgRenderer_) {
        if (svgRenderer_ == address(0) || svgRenderer_.code.length == 0) revert InvalidSvgRenderer();
        IThoughtSvgRendererV2 candidate = IThoughtSvgRendererV2(svgRenderer_);
        try candidate.IMPLEMENTATION_ID_HASH() returns (bytes32 implementationIdHash) {
            if (implementationIdHash != keccak256(bytes(candidate.IMPLEMENTATION_ID()))) revert InvalidSvgRenderer();
        } catch {
            revert InvalidSvgRenderer();
        }

        svgRenderer = svgRenderer_;
        glyphDefinitionsPointer1 = candidate.glyphDefinitionsPointer1();
        glyphDefinitionsPointer2 = candidate.glyphDefinitionsPointer2();
        glyphDefinitionsIndexPointer = candidate.glyphDefinitionsIndexPointer();
        glyphDefinitionsKeccak256 = candidate.glyphDefinitionsKeccak256();
    }

    function IMPLEMENTATION_ID() public view returns (string memory) {
        return IThoughtSvgRendererV2(svgRenderer).IMPLEMENTATION_ID();
    }

    function IMPLEMENTATION_ID_HASH() public view returns (bytes32) {
        return IThoughtSvgRendererV2(svgRenderer).IMPLEMENTATION_ID_HASH();
    }

    function GLYPH_LIBRARY_MEMBER_ID() public view returns (string memory) {
        return IThoughtSvgRendererV2(svgRenderer).GLYPH_LIBRARY_MEMBER_ID();
    }

    function GLYPH_SOURCE_SHA256() public view returns (bytes32) {
        return IThoughtSvgRendererV2(svgRenderer).GLYPH_SOURCE_SHA256();
    }

    function render(string calldata promptLine, string calldata agentLine) external view returns (string memory) {
        return IThoughtSvgRendererV2(svgRenderer).render(promptLine, agentLine);
    }

    function tokenURI(TokenData calldata data) external view returns (string memory) {
        DerivedMetadata memory derived = _deriveMetadata(data);
        string memory metadata = string.concat(
            '{"name":"THOUGHT #',
            _toString(data.tokenId),
            '","description":"THOUGHT V2 preserves a narrow terminal channel between human intention and Agent response, transforming their dialogue into an on-chain artwork.","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(IThoughtSvgRendererV2(svgRenderer).render(data.promptLine, data.agentLine))),
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
            '},{"display_type":"number","max_value":128,"trait_type":"Pair Bytes","value":',
            _toString(promptBytes + agentBytes),
            '},{"trait_type":"Prompt Length","value":"',
            _lengthClass(promptBytes),
            '"},{"trait_type":"Agent Length","value":"',
            _lengthClass(agentBytes),
            '"}]'
        );
    }

    function _properties(TokenData calldata data, DerivedMetadata memory derived) private view returns (string memory) {
        return string.concat(
            '{"agentLine":',
            _jsonString(data.agentLine),
            ',"agentLineKeccak256":"',
            _bytes32ToHex(derived.agentHash),
            '","conversationIdentityHash":"',
            _bytes32ToHex(derived.conversationHash),
            '","agent":',
            _jsonString(data.agent),
            ',"agentKeccak256":"',
            _bytes32ToHex(derived.agentRecordHash),
            '","model":',
            _jsonString(data.model),
            ',"modelKeccak256":"',
            _bytes32ToHex(derived.modelRecordHash),
            '","glyphColor":"#00ff00","glyphDefinitionsKeccak256":"',
            _bytes32ToHex(glyphDefinitionsKeccak256),
            '","glyphLibraryMemberId":"',
            GLYPH_LIBRARY_MEMBER_ID(),
            '","glyphSourceSha256":"',
            _bytes32ToHex(GLYPH_SOURCE_SHA256()),
            '","promptLine":',
            _jsonString(data.promptLine),
            ',"promptLineKeccak256":"',
            _bytes32ToHex(derived.promptHash),
            '","provenanceKeccak256":"',
            _bytes32ToHex(derived.provenanceHash),
            '","rendererImplementationId":"',
            IMPLEMENTATION_ID(),
            '","workHash":"',
            _bytes32ToHex(derived.workHash),
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
            _bytes32ToHex(derived.provenanceHash),
            '","provenanceJson":',
            _jsonString(data.provenanceJson),
            ',"provenanceProfileId":"inshell.thought.provenance.v2","rendererId":"',
            RENDERER_ID,
            '","rendererIdHash":"',
            _bytes32ToHex(RENDERER_ID_HASH),
            '","rendererImplementationId":"',
            IMPLEMENTATION_ID(),
            '","rendererReleaseReady":true,"status":"minted","workProfileId":"',
            WORK_PROFILE_ID,
            '","workHash":"',
            _bytes32ToHex(derived.workHash),
            '"}'
        );
    }

    function _deriveMetadata(TokenData calldata data) private pure returns (DerivedMetadata memory derived) {
        derived.promptHash = keccak256(bytes(data.promptLine));
        derived.agentHash = keccak256(bytes(data.agentLine));
        derived.agentRecordHash = keccak256(bytes(data.agent));
        derived.modelRecordHash = keccak256(bytes(data.model));
        derived.provenanceHash = keccak256(bytes(data.provenanceJson));
        derived.conversationHash = ThoughtV2Identity.conversationIdentityHash(derived.promptHash, derived.agentHash);
        derived.workHash = ThoughtV2Identity.workHash(derived.promptHash, derived.agentHash);
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

    function _thoughtRecords(TokenData calldata data, bytes32 agentRecordHash, bytes32 modelRecordHash)
        private
        pure
        returns (string memory)
    {
        return string.concat(
            '"records":{"agent":{"keccak256":"',
            _bytes32ToHex(agentRecordHash),
            '","label":',
            _jsonString(data.agent),
            '},"model":{"keccak256":"',
            _bytes32ToHex(modelRecordHash),
            '","label":',
            _jsonString(data.model),
            '},"workIdentityInput":false},'
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
