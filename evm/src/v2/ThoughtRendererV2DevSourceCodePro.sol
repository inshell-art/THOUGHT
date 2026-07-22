// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "../Base64.sol";
import {ContractCodeStorage} from "../ContractCodeStorage.sol";
import {IThoughtRendererV2} from "./IThoughtRendererV2.sol";
import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";
import {ThoughtV2ContextProfile} from "./ThoughtV2ContextProfile.sol";
import {ThoughtV2Identity} from "./ThoughtV2Identity.sol";
import {ThoughtV2WorkProfile} from "./ThoughtV2WorkProfile.sol";

/// @notice Disposable Anvil renderer for reviewing current V2 as real ERC-721 metadata.
/// @dev This contract is deliberately chain-gated and is not the final native-path renderer.
contract ThoughtRendererV2DevSourceCodePro is IThoughtRendererV2 {
    error DevRendererAnvilOnly(uint256 chainId);
    error InvalidFontPointer();

    string public constant RENDERER_ID = ThoughtV2Constants.RENDERER_ID;
    bytes32 public constant RENDERER_ID_HASH = ThoughtV2Constants.RENDERER_ID_HASH;
    string public constant METADATA_PROFILE_ID = ThoughtV2Constants.METADATA_PROFILE_ID;
    bytes32 public constant METADATA_PROFILE_ID_HASH = ThoughtV2Constants.METADATA_PROFILE_ID_HASH;
    string public constant WORK_PROFILE_ID = ThoughtV2Constants.WORK_PROFILE_ID;
    string public constant CONTEXT_PROFILE_ID = ThoughtV2Constants.CONTEXT_PROFILE_ID;
    bytes32 public constant CREATION_ATTESTATION_PROFILE_ID = ThoughtV2Constants.CREATION_ATTESTATION_PROFILE_ID;

    string public constant IMPLEMENTATION_ID = "inshell.thought.renderer.v2.dev-source-code-pro-foreign-object";
    string public constant FONT_PROFILE_ID = "source-code-pro-latin-400-normal.woff2";
    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    address public immutable fontPointer;
    bytes32 public immutable fontKeccak256;

    constructor(address fontPointer_, bytes32 fontKeccak256_) {
        if (block.chainid != 31_337) revert DevRendererAnvilOnly(block.chainid);
        if (fontPointer_ == address(0) || fontPointer_.code.length <= 1 || fontKeccak256_ == bytes32(0)) {
            revert InvalidFontPointer();
        }
        bytes memory font = ContractCodeStorage.read(fontPointer_);
        if (keccak256(font) != fontKeccak256_) revert InvalidFontPointer();
        fontPointer = fontPointer_;
        fontKeccak256 = fontKeccak256_;
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
        string memory fontBase64 = Base64.encode(ContractCodeStorage.read(fontPointer));
        string memory style = string.concat(
            "<style>@font-face{font-family:'THOUGHT Source Code Pro';font-style:normal;font-weight:400;src:url(data:font/woff2;base64,",
            fontBase64,
            ") format('woff2')}</style>"
        );
        string memory prompt = string.concat(
            '<foreignObject data-line="prompt" x="57.6" y="128" width="844.8" height="256"><div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-start;overflow:hidden;color:#00ba00;font-family:&apos;THOUGHT Source Code Pro&apos;,monospace;font-size:48px;line-height:64px;font-weight:400;text-align:right;white-space:break-spaces;overflow-wrap:anywhere;word-break:normal;hyphens:none"><span style="display:block;width:100%">',
            _xmlEscape(promptLine),
            "</span></div></foreignObject>"
        );
        string memory agent = string.concat(
            '<foreignObject data-line="agent" x="57.6" y="576" width="844.8" height="256"><div xmlns="http://www.w3.org/1999/xhtml" style="box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;color:#00ba00;font-family:&apos;THOUGHT Source Code Pro&apos;,monospace;font-size:48px;line-height:64px;font-weight:400;text-align:left;white-space:break-spaces;overflow-wrap:anywhere;word-break:normal;hyphens:none"><span style="display:block;width:100%">',
            _xmlEscape(agentLine),
            "</span></div></foreignObject>"
        );
        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="960" viewBox="0 0 960 960" role="img" data-renderer="',
            IMPLEMENTATION_ID,
            '" aria-label="Prompt and Agent response in a terminal chat layout">',
            style,
            '<rect width="960" height="960" fill="#000000"/>',
            prompt,
            agent,
            "</svg>"
        );
    }

    function _attributes(TokenData calldata data) private pure returns (string memory) {
        uint256 promptBytes = bytes(data.promptLine).length;
        uint256 agentBytes = bytes(data.agentLine).length;
        return string.concat(
            '[{"trait_type":"Declared Agent","value":',
            _jsonString(data.declaredAgent),
            '},{"trait_type":"Declared Model","value":',
            _jsonString(data.declaredModel),
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
            '","fontKeccak256":"',
            _bytes32ToHex(fontKeccak256),
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
            '","rendererReleaseReady":false,"status":"minted-anvil-development","workProfileId":"',
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
            '","releaseStatus":"registered-disposable-anvil","thoughtSpecHash":"',
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
