// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractCodeStorage} from "../../src/ContractCodeStorage.sol";
import {IThoughtRendererV2} from "../../src/v2/IThoughtRendererV2.sol";
import {ThoughtRendererV2DevSourceCodePro} from "../../src/v2/ThoughtRendererV2DevSourceCodePro.sol";

interface VmRendererV2 {
    function expectRevert(bytes calldata revertData) external;
}

contract ThoughtRendererV2DevSourceCodeProTest {
    VmRendererV2 private constant VM = VmRendererV2(address(uint160(uint256(keccak256("hevm cheat code")))));

    ThoughtRendererV2DevSourceCodePro private renderer;

    function setUp() public {
        bytes memory font = hex"774f46326465762d666f6e74";
        address pointer = ContractCodeStorage.write(font);
        renderer = new ThoughtRendererV2DevSourceCodePro(pointer, keccak256(font));
    }

    function testDevRendererIsExplicitlyTemporaryButContractCompatible() public view {
        require(
            renderer.RENDERER_ID_HASH() == keccak256(bytes("inshell.thought.svg.v2.terminal-chat-path-glyphs")),
            "renderer compatibility ID drift"
        );
        require(
            renderer.METADATA_PROFILE_ID_HASH() == keccak256(bytes("inshell.thought.metadata.v2.terminal-chat")),
            "metadata profile compatibility ID drift"
        );
        require(
            keccak256(bytes(renderer.IMPLEMENTATION_ID()))
                == keccak256(
                    bytes(
                        "inshell.thought.renderer.v2.dev-source-code-pro-foreign-object-outer-frame-32-404040"
                    )
                ),
            "dev implementation ID drift"
        );
    }

    function testRenderEmbedsFontAndTerminalChatComposition() public view {
        string memory svg = renderer.render("Are you there?", "I am here.");
        require(_contains(svg, "<foreignObject data-line=\"prompt\""), "missing prompt field");
        require(_contains(svg, "<foreignObject data-line=\"agent\""), "missing agent field");
        require(_contains(svg, "font/woff2;base64,d09GMmRldi1mb250"), "missing embedded font");
        require(
            _contains(svg, '<rect id="work-frame" width="1024" height="1024" fill="#404040"/>'),
            "missing approved outer work frame"
        );
        require(
            _contains(svg, '<g id="work-canvas" transform="translate(32 32)">'),
            "missing framed canvas transform"
        );
        require(!_contains(svg, "scale("), "inner canvas must not be scaled");
        require(
            _contains(svg, '<rect id="canvas-bg" width="960" height="960" fill="#000000"/>'),
            "missing black inner canvas"
        );
        require(_contains(svg, "fill=\"#000000\""), "missing black field");
        require(_contains(svg, "color:#00ba00"), "missing canonical green");
        require(!_contains(svg, "stroke="), "chat message frame returned");
        require(_contains(svg, "Are you there?"), "missing prompt");
        require(_contains(svg, "I am here."), "missing response");
    }

    function testConstructorRejectsMissingCodeAndFontHashMismatch() public {
        VM.expectRevert(abi.encodeWithSelector(ThoughtRendererV2DevSourceCodePro.InvalidFontPointer.selector));
        new ThoughtRendererV2DevSourceCodePro(address(0), keccak256("font"));

        VM.expectRevert(abi.encodeWithSelector(ThoughtRendererV2DevSourceCodePro.InvalidFontPointer.selector));
        new ThoughtRendererV2DevSourceCodePro(address(0x1234), keccak256("font"));

        bytes memory font = hex"774f46326465762d666f6e74";
        address pointer = ContractCodeStorage.write(font);
        VM.expectRevert(abi.encodeWithSelector(ThoughtRendererV2DevSourceCodePro.InvalidFontPointer.selector));
        new ThoughtRendererV2DevSourceCodePro(pointer, keccak256("wrong font"));
    }

    function testRenderEscapesApprovedTerminalPunctuation() public view {
        string memory svg = renderer.render("Are you \"there\" & okay?", "Yes, I'm here.");
        require(_contains(svg, "Are you &quot;there&quot; &amp; okay?"), "prompt XML escaping drift");
        require(_contains(svg, "Yes, I&apos;m here."), "Agent XML escaping drift");
        require(!_contains(svg, "\"there\" & okay?"), "raw XML-sensitive prompt leaked");
    }

    function testTokenUriContainsCompleteMetadataDataUrl() public view {
        IThoughtRendererV2.TokenData memory data = _data(bytes32(0));
        string memory uri = renderer.tokenURI(data);
        require(_startsWith(uri, "data:application/json;base64,"), "metadata URI prefix mismatch");
        require(bytes(uri).length > 2_000, "metadata URI unexpectedly incomplete");
    }

    function testTokenUriUsesAllAndOnlyCanonicalMarketplaceTraits() public view {
        string memory metadata = _metadataJsonFromTokenUri(renderer.tokenURI(_data(bytes32(0))));
        string memory exactAttributes = string.concat(
            '"attributes":[{"trait_type":"Creation Attestation","value":"Unattested"},',
            '{"display_type":"number","max_value":64,"trait_type":"Prompt Bytes","value":14},',
            '{"display_type":"number","max_value":64,"trait_type":"Agent Bytes","value":10},',
            '{"display_type":"number","max_value":128,"trait_type":"Pair Bytes","value":24},',
            '{"trait_type":"Prompt Length","value":"Compact"},',
            '{"trait_type":"Agent Length","value":"Compact"}]'
        );
        require(_contains(metadata, exactAttributes), "canonical attribute order or values drifted");
        require(_count(metadata, '"trait_type":') == 6, "unexpected unattested marketplace trait count");
        require(!_contains(metadata, '"trait_type":"Attested Agent"'), "unattested Agent became a trait");
        require(!_contains(metadata, '"trait_type":"Attested Model"'), "unattested model became a trait");
        require(!_contains(metadata, '"trait_type":"Declared Agent"'), "legacy declaration trait leaked");
        require(!_contains(metadata, '"trait_type":"Declared Model"'), "legacy declaration trait leaked");
        require(!_contains(metadata, "Conversation Form"), "fixture conversation form leaked into traits");
        require(!_contains(metadata, "Work Profile"), "work profile leaked into traits");
        require(_count(metadata, '"status":"declared-unverified"') == 2, "declaration statuses drifted");

        string memory attested = _metadataJsonFromTokenUri(renderer.tokenURI(_data(keccak256("attested"))));
        require(
            _contains(
                attested,
                string.concat(
                    '"attributes":[{"trait_type":"Attested Agent","value":"Not applicable"},',
                    '{"trait_type":"Attested Model","value":"Not applicable"},',
                    '{"trait_type":"Creation Attestation","value":"Inshell THOUGHT App"},'
                )
            ),
            "attested declaration trait gate drifted"
        );
        require(
            _contains(attested, '"trait_type":"Creation Attestation","value":"Inshell THOUGHT App"'),
            "attested trait mismatch"
        );
        require(
            _contains(attested, '"verifier":"0x0000000000000000000000000000000000a77357"'),
            "attestation verifier missing from metadata"
        );
        require(_count(attested, '"trait_type":') == 8, "unexpected attested marketplace trait count");
        require(!_contains(attested, '"trait_type":"Declared Agent"'), "legacy declaration trait leaked");
        require(!_contains(attested, '"trait_type":"Declared Model"'), "legacy declaration trait leaked");
    }

    function _data(bytes32 attestationDigest) private pure returns (IThoughtRendererV2.TokenData memory) {
        return IThoughtRendererV2.TokenData({
            tokenId: 1,
            promptLine: "Are you there?",
            agentLine: "I am here.",
            declaredAgent: "Not applicable",
            declaredModel: "Not applicable",
            provenanceJson: "{\"schema\":\"inshell.thought.provenance.v2\"}",
            thoughtSpecId: keccak256("THOUGHT.v2.md"),
            thoughtSpecHash: keccak256("spec"),
            pathId: 1,
            pathSerial: 1,
            minter: address(0xBEEF),
            mintedAt: 1_234,
            creationAttestationDigest: attestationDigest,
            protocolReleaseId: keccak256("release"),
            manifestKeccak256: keccak256("manifest"),
            creationAttestationVerifier: address(0xA77357)
        });
    }

    function _metadataJsonFromTokenUri(string memory uri) private pure returns (string memory) {
        bytes memory source = bytes(uri);
        bytes memory prefix = bytes("data:application/json;base64,");
        require(source.length > prefix.length, "token URI too short");
        for (uint256 i = 0; i < prefix.length; i++) {
            require(source[i] == prefix[i], "token URI prefix drift");
        }
        bytes memory encoded = new bytes(source.length - prefix.length);
        for (uint256 i = 0; i < encoded.length; i++) {
            encoded[i] = source[prefix.length + i];
        }
        return string(_base64Decode(encoded));
    }

    function _base64Decode(bytes memory data) private pure returns (bytes memory) {
        require(data.length % 4 == 0, "bad base64 length");
        uint256 padding;
        if (data.length > 0 && data[data.length - 1] == bytes1("=")) padding++;
        if (data.length > 1 && data[data.length - 2] == bytes1("=")) padding++;
        bytes memory output = new bytes((data.length / 4) * 3 - padding);
        uint256 out;
        for (uint256 i = 0; i < data.length; i += 4) {
            uint24 chunk = (uint24(_base64Value(data[i])) << 18) | (uint24(_base64Value(data[i + 1])) << 12)
                | (uint24(_base64Value(data[i + 2])) << 6) | uint24(_base64Value(data[i + 3]));
            if (out < output.length) output[out++] = bytes1(uint8(chunk >> 16));
            if (out < output.length) output[out++] = bytes1(uint8(chunk >> 8));
            if (out < output.length) output[out++] = bytes1(uint8(chunk));
        }
        return output;
    }

    function _base64Value(bytes1 character) private pure returns (uint8) {
        uint8 code = uint8(character);
        if (code >= 65 && code <= 90) return code - 65;
        if (code >= 97 && code <= 122) return code - 71;
        if (code >= 48 && code <= 57) return code + 4;
        if (character == bytes1("+")) return 62;
        if (character == bytes1("/")) return 63;
        if (character == bytes1("=")) return 0;
        revert("bad base64 character");
    }

    function _contains(string memory value, string memory needle) private pure returns (bool) {
        bytes memory haystack = bytes(value);
        bytes memory expected = bytes(needle);
        if (expected.length > haystack.length) return false;
        for (uint256 i = 0; i <= haystack.length - expected.length; i++) {
            bool matches = true;
            for (uint256 j = 0; j < expected.length; j++) {
                if (haystack[i + j] != expected[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        return false;
    }

    function _startsWith(string memory value, string memory prefix) private pure returns (bool) {
        bytes memory text = bytes(value);
        bytes memory expected = bytes(prefix);
        if (expected.length > text.length) return false;
        for (uint256 i = 0; i < expected.length; i++) {
            if (text[i] != expected[i]) return false;
        }
        return true;
    }

    function _count(string memory value, string memory needle) private pure returns (uint256 count) {
        bytes memory haystack = bytes(value);
        bytes memory expected = bytes(needle);
        if (expected.length == 0 || expected.length > haystack.length) return 0;
        for (uint256 i = 0; i <= haystack.length - expected.length; i++) {
            bool matches = true;
            for (uint256 j = 0; j < expected.length; j++) {
                if (haystack[i + j] != expected[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) count++;
        }
    }
}
