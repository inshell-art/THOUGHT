// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractCodeStorage} from "../../src/ContractCodeStorage.sol";
import {IThoughtRendererV2} from "../../src/v2/IThoughtRendererV2.sol";
import {ThoughtRendererV2} from "../../src/v2/ThoughtRendererV2.sol";
import {ThoughtRendererV2Split} from "../../src/v2/ThoughtRendererV2Split.sol";
import {ThoughtSvgRendererV2} from "../../src/v2/ThoughtSvgRendererV2.sol";

interface VmRendererV2 {
    function expectRevert(bytes calldata revertData) external;
    function readFile(string calldata path) external view returns (string memory data);
    function readFileBinary(string calldata path) external view returns (bytes memory data);
}

contract ThoughtRendererV2Test {
    VmRendererV2 private constant VM = VmRendererV2(address(uint160(uint256(keccak256("hevm cheat code")))));

    ThoughtRendererV2 private renderer;
    ThoughtRendererV2Split private splitRenderer;
    ThoughtSvgRendererV2 private svgRenderer;
    address private pointer1;

    event RendererMeasurement(
        bytes32 indexed svgHash,
        uint256 svgBytes,
        uint256 renderGas,
        bytes32 indexed tokenUriHash,
        uint256 tokenUriBytes,
        uint256 tokenUriGas
    );

    event SplitRendererMeasurement(
        bytes32 indexed svgHash,
        uint256 svgBytes,
        uint256 renderGas,
        bytes32 indexed tokenUriHash,
        uint256 tokenUriBytes,
        uint256 tokenUriGas
    );

    event BoundaryRendererMeasurement(
        bool indexed split,
        bytes32 indexed svgHash,
        uint256 svgBytes,
        uint256 renderGas,
        bytes32 indexed tokenUriHash,
        uint256 tokenUriBytes,
        uint256 tokenUriGas
    );

    event RendererArchitectureMeasurement(
        uint256 monolithicRuntimeBytes,
        uint256 svgRuntimeBytes,
        uint256 metadataRuntimeBytes,
        uint256 monolithicDeployGas,
        uint256 splitDeployGas,
        uint256 monolithicRenderGas,
        uint256 splitRenderGas,
        uint256 monolithicTokenUriGas,
        uint256 splitTokenUriGas
    );

    function setUp() public {
        pointer1 = ContractCodeStorage.write(VM.readFileBinary("../protocol/current/v2/renderer/mono-76.im76.bin"));
        renderer = new ThoughtRendererV2(pointer1);
        svgRenderer = new ThoughtSvgRendererV2(pointer1);
        splitRenderer = new ThoughtRendererV2Split(address(svgRenderer));
    }

    function testRendererBindsSealedMono76Configuration() public view {
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
                        "inshell.thought.renderer.v2.mono-76-v1-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom"
                    )
                ),
            "implementation ID drift"
        );
        require(
            keccak256(bytes(renderer.GLYPH_LIBRARY_MEMBER_ID()))
                == keccak256(bytes("inshell.mono-76")),
            "glyph member drift"
        );
        require(renderer.GLYPH_FIXED_ADVANCE() == 10, "fixed advance drift");
        require(renderer.GLYPH_SCALE_HUNDREDTHS() == 288, "glyph scale drift");
        require(renderer.GLYPH_ORIGIN_SHIFT_HUNDREDTHS() == 288, "origin shift drift");
        require(renderer.GLYPH_STROKE_WIDTH_HUNDREDTHS() == 123, "stroke width drift");
        require(
            renderer.glyphDefinitionsKeccak256()
                == 0xba37d00bb395b84f0487791300a29cdd2b1712b078fa218c6ed74fa11d74a081,
            "packed payload drift"
        );
        require(renderer.MAX_COLUMNS() == 29 && renderer.MAX_ROWS() == 4, "wrapping bounds drift");
    }

    function testRenderUsesOnlyNativePathsAndApprovedTerminalChatComposition() public view {
        string memory svg = renderer.render("Are you there?", "I am here.");
        require(
            _contains(svg, '<rect id="work-frame" width="1024" height="1024" fill="#006100"/>'),
            "missing approved outer work frame"
        );
        require(_contains(svg, '<g id="work-canvas" transform="translate(32 32)">'), "missing framed canvas transform");
        require(
            _contains(svg, '<rect id="canvas-bg" width="960" height="960" fill="#000000"/>'),
            "missing black inner canvas"
        );
        require(_contains(svg, "<defs><path"), "missing canonical path definitions");
        require(_contains(svg, 'id="g41"'), "used prompt glyph definition missing");
        require(_contains(svg, 'id="g49"'), "used Agent glyph definition missing");
        require(!_contains(svg, 'id="g5a"'), "unused glyph definition returned");
        require(
            _contains(
                svg,
                '<g id="prompt-line" fill="none" stroke="#00ff00" stroke-width="1.23" stroke-linecap="round" stroke-linejoin="round"'
            ),
            "missing canonical prompt paint"
        );
        require(
            _contains(
                svg,
                '<g id="agent-line" fill="none" stroke="#00ff00" stroke-width="1.23" stroke-linecap="round" stroke-linejoin="round"'
            ),
            "missing canonical Agent paint"
        );
        require(_contains(svg, 'data-glyph-release="v1.0.0"'), "Mono 76 release pin missing");
        require(_contains(svg, 'data-glyph-origin-shift-x="1"'), "Mono 76 origin shift missing");
        require(_contains(svg, 'data-prompt-vertical-align="top"'), "fixed prompt alignment missing");
        require(_contains(svg, 'data-agent-vertical-align="bottom"'), "fixed Agent alignment missing");
        require(
            _contains(
                svg,
                'data-field-y="128" data-field-width="844.8" data-field-height="256" data-field-bottom="384" data-horizontal-align="right" data-vertical-align="top"'
            ),
            "prompt field geometry drift"
        );
        require(
            _contains(
                svg, 'data-field-y="576" data-field-width="844.8" data-field-height="256" data-field-bottom="832"'
            ),
            "Agent field geometry drift"
        );
        require(
            _contains(
                svg,
                '<g transform="translate(502.08 171.52) scale(2.88 -2.88)"><use href="#g41"/>'
            ),
            "prompt placement drift"
        );
        require(
            _contains(
                svg,
                '<g transform="translate(60.48 811.52) scale(2.88 -2.88)"><use href="#g49"/>'
            ),
            "Agent placement drift"
        );
        require(!_contains(svg, "<foreignObject"), "foreignObject returned");
        require(!_contains(svg, "<text"), "SVG text returned");
        require(!_contains(svg, "@font-face"), "embedded font returned");
        require(!_contains(svg, "<style"), "browser style dependency returned");
        require(_contains(svg, 'data-source="Are you there?"'), "missing exact prompt source");
        require(_contains(svg, 'data-source="I am here."'), "missing exact Agent source");
    }

    function testPromptKeepsFixedTopAndAgentKeepsFixedBottomAcrossOneThroughFourRows() public view {
        string memory oneRow = renderer.render("A", "A");
        require(
            _contains(oneRow, '<g transform="translate(876.48 171.52) scale(2.88 -2.88)"><use href="#g41"/>'),
            "one-row prompt top drift"
        );
        require(
            _contains(oneRow, '<g transform="translate(60.48 811.52) scale(2.88 -2.88)"><use href="#g41"/>'),
            "one-row Agent bottom drift"
        );

        string memory twoRows = renderer.render("AAAAAAAAAAAAAAA BBBBBBBBBBBBBBB", "AAAAAAAAAAAAAAA BBBBBBBBBBBBBBB");
        require(
            _contains(twoRows, '<g transform="translate(473.28 171.52) scale(2.88 -2.88)"><use href="#g41"/>'),
            "two-row prompt top drift"
        );
        require(
            _contains(twoRows, '<g transform="translate(60.48 811.52) scale(2.88 -2.88)"><use href="#g42"/>'),
            "two-row Agent bottom drift"
        );

        string memory threeRows = renderer.render(
            "AAAAAAAAAAAAAAAAAAAA BBBBBBBBBBBBBBBBBBBB CCCCCCCCCCCCCCCCCCCC",
            "AAAAAAAAAAAAAAAAAAAA BBBBBBBBBBBBBBBBBBBB CCCCCCCCCCCCCCCCCCCC"
        );
        require(
            _contains(threeRows, '<g transform="translate(329.28 171.52) scale(2.88 -2.88)"><use href="#g41"/>'),
            "three-row prompt top drift"
        );
        require(
            _contains(threeRows, '<g transform="translate(60.48 811.52) scale(2.88 -2.88)"><use href="#g43"/>'),
            "three-row Agent bottom drift"
        );

        string memory fourRows = renderer.render(
            "AAAAAAAAAAAAAAA BBBBBBBBBBBBBBB CCCCCCCCCCCCCCC DDDDDDDDDDDDDDD",
            "AAAAAAAAAAAAAAA BBBBBBBBBBBBBBB CCCCCCCCCCCCCCC DDDDDDDDDDDDDDD"
        );
        require(
            _contains(fourRows, '<g transform="translate(473.28 171.52) scale(2.88 -2.88)"><use href="#g41"/>'),
            "four-row prompt top drift"
        );
        require(
            _contains(fourRows, '<g transform="translate(60.48 811.52) scale(2.88 -2.88)"><use href="#g44"/>'),
            "four-row Agent bottom drift"
        );
    }

    function testConstructorRejectsMissingOrMismatchedPackedPayload() public {
        VM.expectRevert(abi.encodeWithSelector(ThoughtRendererV2.InvalidGlyphDataPointer.selector));
        new ThoughtRendererV2(address(0));

        address wrongPointer = ContractCodeStorage.write(bytes("wrong packed payload"));
        VM.expectRevert(abi.encodeWithSelector(ThoughtRendererV2.InvalidGlyphDataPointer.selector));
        new ThoughtRendererV2(wrongPointer);
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
        string memory metadata = _metadataJsonFromTokenUri(uri);
        require(_contains(metadata, '"name":"THOUGHT #1"'), "metadata name missing");
        require(_contains(metadata, '"image":"data:image/svg+xml;base64,'), "embedded image missing");
        require(
            _contains(metadata, '"external_url":"https://inshell.art/thought/1"'),
            "canonical external URL missing"
        );
        require(_contains(metadata, '"properties":{'), "properties missing");
        require(_contains(metadata, '"thought":{'), "THOUGHT extension missing");
    }

    function testCanonicalExternalUrlCoversBoundaryTokenIdsAndSplitParity() public view {
        _requireCanonicalExternalUrl(1, "https://inshell.art/thought/1");
        _requireCanonicalExternalUrl(42, "https://inshell.art/thought/42");
        _requireCanonicalExternalUrl(
            type(uint256).max,
            "https://inshell.art/thought/115792089237316195423570985008687907853269984665640564039457584007913129639935"
        );
    }

    function testRepresentativeRenderingStaysWithinPracticalEthCallBudget() public view {
        uint256 gasBefore = gasleft();
        renderer.render("Are you there?", "I am here.");
        uint256 renderGas = gasBefore - gasleft();
        require(renderGas < 5_000_000, "representative render gas regression");

        gasBefore = gasleft();
        renderer.tokenURI(_data(bytes32(0)));
        uint256 tokenUriGas = gasBefore - gasleft();
        require(tokenUriGas < 10_000_000, "representative tokenURI gas regression");
    }

    function testEmitRepresentativeRendererMeasurement() public {
        uint256 gasBefore = gasleft();
        string memory svg = renderer.render("Are you there?", "I am here.");
        uint256 renderGas = gasBefore - gasleft();

        gasBefore = gasleft();
        string memory uri = renderer.tokenURI(_data(bytes32(0)));
        uint256 tokenUriGas = gasBefore - gasleft();

        emit RendererMeasurement(
            keccak256(bytes(svg)), bytes(svg).length, renderGas, keccak256(bytes(uri)), bytes(uri).length, tokenUriGas
        );
    }

    function testEmitRepresentativeSplitRendererMeasurement() public {
        uint256 gasBefore = gasleft();
        string memory svg = splitRenderer.render("Are you there?", "I am here.");
        uint256 renderGas = gasBefore - gasleft();

        gasBefore = gasleft();
        string memory uri = splitRenderer.tokenURI(_data(bytes32(0)));
        uint256 tokenUriGas = gasBefore - gasleft();

        emit SplitRendererMeasurement(
            keccak256(bytes(svg)), bytes(svg).length, renderGas, keccak256(bytes(uri)), bytes(uri).length, tokenUriGas
        );
    }

    function testEmitBoundaryMonolithicRendererMeasurement() public {
        _emitBoundaryRendererMeasurement(renderer, false);
    }

    function testEmitBoundarySplitRendererMeasurement() public {
        _emitBoundaryRendererMeasurement(splitRenderer, true);
    }

    function testBoundaryLinesWithMinimalProvenanceStayWithinPracticalEthCallBudget() public view {
        string memory promptLine = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?!";
        string memory agentLine = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?";

        uint256 gasBefore = gasleft();
        renderer.render(promptLine, agentLine);
        uint256 renderGas = gasBefore - gasleft();
        require(renderGas < 1_500_000, "boundary render gas regression");

        IThoughtRendererV2.TokenData memory data = _data(bytes32(0));
        data.promptLine = promptLine;
        data.agentLine = agentLine;
        gasBefore = gasleft();
        renderer.tokenURI(data);
        uint256 tokenUriGas = gasBefore - gasleft();
        require(tokenUriGas < 10_000_000, "boundary tokenURI gas regression");
    }

    function testSplitRendererMatchesOptimizedMonolithicBytes() public view {
        _requireSameRender("Are you there?", "I am here.");
        _requireSameRender("Are you \"there\" & okay?", "Yes, I'm here.");
        _requireSameRender("AZaz09 .,?!:;'\"-()/&", "&/()-\"';:!?., 90zaZA");
        _requireSameRender(
            "AAAAAAAAAAAAAAA BBBBBBBBBBBBBBB CCCCCCCCCCCCCCC DDDDDDDDDDDDDDD",
            "AAAAAAAAAAAAAAA BBBBBBBBBBBBBBB CCCCCCCCCCCCCCC DDDDDDDDDDDDDDD"
        );

        IThoughtRendererV2.TokenData memory unattested = _data(bytes32(0));
        require(
            keccak256(bytes(renderer.tokenURI(unattested))) == keccak256(bytes(splitRenderer.tokenURI(unattested))),
            "unattested split tokenURI drift"
        );

        IThoughtRendererV2.TokenData memory attested = _data(keccak256("attested"));
        require(
            keccak256(bytes(renderer.tokenURI(attested))) == keccak256(bytes(splitRenderer.tokenURI(attested))),
            "attested split tokenURI drift"
        );
    }

    function testEmitRendererArchitectureMeasurement() public {
        uint256 gasBefore = gasleft();
        new ThoughtRendererV2(pointer1);
        uint256 monolithicDeployGas = gasBefore - gasleft();

        gasBefore = gasleft();
        ThoughtSvgRendererV2 measuredSvg = new ThoughtSvgRendererV2(pointer1);
        new ThoughtRendererV2Split(address(measuredSvg));
        uint256 splitDeployGas = gasBefore - gasleft();

        gasBefore = gasleft();
        string memory monolithicSvg = renderer.render("Are you there?", "I am here.");
        uint256 monolithicRenderGas = gasBefore - gasleft();

        gasBefore = gasleft();
        string memory splitSvg = splitRenderer.render("Are you there?", "I am here.");
        uint256 splitRenderGas = gasBefore - gasleft();
        require(keccak256(bytes(monolithicSvg)) == keccak256(bytes(splitSvg)), "measured split SVG drift");

        IThoughtRendererV2.TokenData memory data = _data(bytes32(0));
        gasBefore = gasleft();
        string memory monolithicUri = renderer.tokenURI(data);
        uint256 monolithicTokenUriGas = gasBefore - gasleft();

        gasBefore = gasleft();
        string memory splitUri = splitRenderer.tokenURI(data);
        uint256 splitTokenUriGas = gasBefore - gasleft();
        require(keccak256(bytes(monolithicUri)) == keccak256(bytes(splitUri)), "measured split tokenURI drift");

        emit RendererArchitectureMeasurement(
            address(renderer).code.length,
            address(svgRenderer).code.length,
            address(splitRenderer).code.length,
            monolithicDeployGas,
            splitDeployGas,
            monolithicRenderGas,
            splitRenderGas,
            monolithicTokenUriGas,
            splitTokenUriGas
        );
    }

    function testTokenUriUsesAllAndOnlyCanonicalMarketplaceTraits() public view {
        string memory metadata = _metadataJsonFromTokenUri(renderer.tokenURI(_data(bytes32(0))));
        string memory exactAttributes = string.concat(
            '"attributes":[{"trait_type":"Agent","value":"Not applicable"},',
            '{"trait_type":"Model","value":"Not applicable"},',
            '{"trait_type":"Creation Attestation","value":"Unattested"},',
            '{"display_type":"number","max_value":64,"trait_type":"Prompt Bytes","value":14},',
            '{"display_type":"number","max_value":64,"trait_type":"Agent Bytes","value":10}]'
        );
        require(_contains(metadata, exactAttributes), "canonical attribute order or values drifted");
        require(_count(metadata, '"trait_type":') == 5, "unexpected unattested marketplace trait count");
        require(
            _contains(
                metadata,
                '"description":"THOUGHT V2 preserves a narrow terminal channel between human intention and Agent response, transforming their dialogue into an on-chain artwork."'
            ),
            "canonical description drifted"
        );
        require(_contains(metadata, '"agent":"Not applicable"'), "neutral Agent property missing");
        require(_contains(metadata, '"agentKeccak256":"'), "neutral Agent hash property missing");
        require(_contains(metadata, '"model":"Not applicable"'), "neutral model property missing");
        require(_contains(metadata, '"modelKeccak256":"'), "neutral model hash property missing");
        require(!_contains(metadata, '"trait_type":"Declared Agent"'), "legacy declaration trait leaked");
        require(!_contains(metadata, '"trait_type":"Declared Model"'), "legacy declaration trait leaked");
        require(!_contains(metadata, '"trait_type":"Attested Agent"'), "legacy attested trait leaked");
        require(!_contains(metadata, '"trait_type":"Attested Model"'), "legacy attested trait leaked");
        require(!_contains(metadata, "Conversation Form"), "fixture conversation form leaked into traits");
        require(!_contains(metadata, "Work Profile"), "work profile leaked into traits");
        require(!_contains(metadata, '"trait_type":"Pair Bytes"'), "redundant pair trait leaked");
        require(!_contains(metadata, '"trait_type":"Prompt Length"'), "redundant prompt length leaked");
        require(!_contains(metadata, '"trait_type":"Agent Length"'), "redundant agent length leaked");
        require(!_contains(metadata, '"declarations"'), "legacy declarations object leaked");
        require(!_contains(metadata, "declared-unverified"), "legacy declaration status leaked");
        require(
            _contains(metadata, '"records":{"agent":{"keccak256":"'),
            "neutral records object missing"
        );

        string memory attested = _metadataJsonFromTokenUri(renderer.tokenURI(_data(keccak256("attested"))));
        require(
            _contains(
                attested,
                string.concat(
                    '"attributes":[{"trait_type":"Agent","value":"Not applicable"},',
                    '{"trait_type":"Model","value":"Not applicable"},',
                    '{"trait_type":"Creation Attestation","value":"Inshell THOUGHT App"},'
                )
            ),
            "attested neutral traits drifted"
        );
        require(
            _contains(attested, '"trait_type":"Creation Attestation","value":"Inshell THOUGHT App"'),
            "attested trait mismatch"
        );
        require(
            _contains(attested, '"verifier":"0x0000000000000000000000000000000000a77357"'),
            "attestation verifier missing from metadata"
        );
        require(_count(attested, '"trait_type":') == 5, "unexpected attested marketplace trait count");
        require(!_contains(attested, '"trait_type":"Declared Agent"'), "legacy declaration trait leaked");
        require(!_contains(attested, '"trait_type":"Declared Model"'), "legacy declaration trait leaked");
        require(!_contains(attested, '"trait_type":"Attested Agent"'), "legacy attested trait leaked");
        require(!_contains(attested, '"trait_type":"Attested Model"'), "legacy attested trait leaked");
    }

    function testAgentAndModelRecordsDoNotChangeArtworkBytes() public view {
        IThoughtRendererV2.TokenData memory first = _data(bytes32(0));
        IThoughtRendererV2.TokenData memory second = _data(bytes32(0));
        second.agent = "Different neutral Agent record";
        second.model = "Different neutral model record";

        string memory firstMetadata = _metadataJsonFromTokenUri(renderer.tokenURI(first));
        string memory secondMetadata = _metadataJsonFromTokenUri(renderer.tokenURI(second));
        require(
            keccak256(bytes(firstMetadata)) != keccak256(bytes(secondMetadata)),
            "record changes must remain visible in metadata"
        );
        require(
            keccak256(bytes(_between(firstMetadata, '"image":"', '","external_url"')))
                == keccak256(bytes(_between(secondMetadata, '"image":"', '","external_url"'))),
            "neutral records changed artwork bytes"
        );
    }

    function _requireCanonicalExternalUrl(uint256 tokenId, string memory expectedUrl) private view {
        IThoughtRendererV2.TokenData memory data = _data(bytes32(0));
        data.tokenId = tokenId;
        string memory monolithicUri = renderer.tokenURI(data);
        string memory splitUri = splitRenderer.tokenURI(data);
        require(
            keccak256(bytes(monolithicUri)) == keccak256(bytes(splitUri)),
            "external URL split tokenURI drift"
        );

        string memory metadata = _metadataJsonFromTokenUri(monolithicUri);
        string memory externalUrl = _between(metadata, '"external_url":"', '"');
        require(keccak256(bytes(externalUrl)) == keccak256(bytes(expectedUrl)), "external URL value drift");
        require(_count(metadata, '"external_url":') == 1, "external URL must be top-level exactly once");
        require(
            _indexOf(metadata, '"image":') < _indexOf(metadata, '"external_url":')
                && _indexOf(metadata, '"external_url":') < _indexOf(metadata, '"background_color":'),
            "external URL metadata order drift"
        );
        require(!_contains(externalUrl, "localhost"), "localhost external URL leaked");
        require(!_contains(externalUrl, "127.0.0.1"), "LAN external URL leaked");
        require(!_contains(externalUrl, "thought.inshell.art"), "deprecated subdomain leaked");
        require(!_contains(externalUrl, "gallery.inshell.art"), "alternate subdomain leaked");
        require(!_contains(externalUrl, "github.io"), "Pages external URL leaked");
        require(!_contains(externalUrl, "?"), "external URL query leaked");
        require(!_contains(externalUrl, "#"), "external URL fragment leaked");
    }

    function _data(bytes32 attestationDigest) private pure returns (IThoughtRendererV2.TokenData memory) {
        return IThoughtRendererV2.TokenData({
            tokenId: 1,
            promptLine: "Are you there?",
            agentLine: "I am here.",
            agent: "Not applicable",
            model: "Not applicable",
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

    function _requireSameRender(string memory promptLine, string memory agentLine) private view {
        require(
            keccak256(bytes(renderer.render(promptLine, agentLine)))
                == keccak256(bytes(splitRenderer.render(promptLine, agentLine))),
            "split SVG drift"
        );
    }

    function _emitBoundaryRendererMeasurement(IThoughtRendererV2 target, bool split) private {
        string memory promptLine = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?!";
        string memory agentLine = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?";

        uint256 gasBefore = gasleft();
        string memory svg = target.render(promptLine, agentLine);
        uint256 renderGas = gasBefore - gasleft();

        IThoughtRendererV2.TokenData memory data = _data(bytes32(0));
        data.promptLine = promptLine;
        data.agentLine = agentLine;
        gasBefore = gasleft();
        string memory uri = target.tokenURI(data);
        uint256 tokenUriGas = gasBefore - gasleft();

        emit BoundaryRendererMeasurement(
            split,
            keccak256(bytes(svg)),
            bytes(svg).length,
            renderGas,
            keccak256(bytes(uri)),
            bytes(uri).length,
            tokenUriGas
        );
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

    function _indexOf(string memory value, string memory needle) private pure returns (uint256) {
        bytes memory haystack = bytes(value);
        bytes memory expected = bytes(needle);
        if (expected.length == 0 || expected.length > haystack.length) return type(uint256).max;
        for (uint256 i = 0; i <= haystack.length - expected.length; i++) {
            bool matches = true;
            for (uint256 j = 0; j < expected.length; j++) {
                if (haystack[i + j] != expected[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return i;
        }
        return type(uint256).max;
    }

    function _between(string memory value, string memory startNeedle, string memory endNeedle)
        private
        pure
        returns (string memory)
    {
        bytes memory source = bytes(value);
        bytes memory start = bytes(startNeedle);
        bytes memory end = bytes(endNeedle);
        uint256 startIndex = type(uint256).max;
        for (uint256 i = 0; i + start.length <= source.length; i++) {
            bool matches = true;
            for (uint256 j = 0; j < start.length; j++) {
                if (source[i + j] != start[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                startIndex = i + start.length;
                break;
            }
        }
        require(startIndex != type(uint256).max, "start delimiter missing");
        for (uint256 i = startIndex; i + end.length <= source.length; i++) {
            bool matches = true;
            for (uint256 j = 0; j < end.length; j++) {
                if (source[i + j] != end[j]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                bytes memory output = new bytes(i - startIndex);
                for (uint256 j = 0; j < output.length; j++) output[j] = source[startIndex + j];
                return string(output);
            }
        }
        revert("end delimiter missing");
    }
}
