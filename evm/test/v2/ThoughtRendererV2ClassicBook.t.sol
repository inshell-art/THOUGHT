// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractCodeStorage} from "../../src/ContractCodeStorage.sol";
import {IThoughtRendererV2} from "../../src/v2/IThoughtRendererV2.sol";
import {ThoughtRendererV2Split} from "../../src/v2/ThoughtRendererV2Split.sol";
import {ThoughtSvgRendererV2ClassicBook} from "../../src/v2/ThoughtSvgRendererV2ClassicBook.sol";

interface VmClassicBookRendererV2 {
    function expectRevert(bytes calldata revertData) external;
    function readFileBinary(string calldata path) external view returns (bytes memory data);
}

contract ThoughtRendererV2ClassicBookTest {
    VmClassicBookRendererV2 private constant VM =
        VmClassicBookRendererV2(address(uint160(uint256(keccak256("hevm cheat code")))));

    ThoughtSvgRendererV2ClassicBook private svgRenderer;
    ThoughtRendererV2Split private renderer;
    address private packedPointer;

    event ClassicBookMeasurement(
        string label,
        bytes32 indexed svgHash,
        uint256 svgBytes,
        uint256 renderGas,
        bytes32 indexed tokenUriHash,
        uint256 tokenUriBytes,
        uint256 tokenUriGas
    );

    function setUp() public {
        packedPointer = ContractCodeStorage.write(
            VM.readFileBinary(
                "../protocol/current/v2/renderer/experiments/classic-book/classic-book.im76.bin"
            )
        );
        svgRenderer = new ThoughtSvgRendererV2ClassicBook(packedPointer);
        renderer = new ThoughtRendererV2Split(address(svgRenderer));
    }

    function testBindsExactClassicBookPackedPayloadAndDescriptor() public view {
        require(
            keccak256(bytes(svgRenderer.IMPLEMENTATION_ID()))
                == svgRenderer.IMPLEMENTATION_ID_HASH(),
            "implementation identity drift"
        );
        require(
            keccak256(bytes(renderer.GLYPH_LIBRARY_MEMBER_ID()))
                == keccak256(bytes("inshell.thought.glyph-library.set-05.classic-book")),
            "glyph-library member drift"
        );
        require(
            renderer.GLYPH_SOURCE_SHA256()
                == 0x2789bd55606ddb20933414a64cc150ca78346714d1e04040b11ed3db6d718a38,
            "source hash drift"
        );
        require(
            renderer.glyphDefinitionsKeccak256()
                == 0xa1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430,
            "packed payload hash drift"
        );
        require(renderer.glyphDefinitionsPointer1() == packedPointer, "packed pointer drift");
        require(renderer.glyphDefinitionsPointer2() == address(0), "unexpected second pointer");
        require(renderer.glyphDefinitionsIndexPointer() == address(0), "unexpected index pointer");
    }

    function testConstructorRejectsMissingOrMismatchedPackedPayload() public {
        VM.expectRevert(
            abi.encodeWithSelector(ThoughtSvgRendererV2ClassicBook.InvalidGlyphDataPointer.selector)
        );
        new ThoughtSvgRendererV2ClassicBook(address(0));

        address wrongPointer = ContractCodeStorage.write(bytes("IM76"));
        VM.expectRevert(
            abi.encodeWithSelector(ThoughtSvgRendererV2ClassicBook.InvalidGlyphDataPointer.selector)
        );
        new ThoughtSvgRendererV2ClassicBook(wrongPointer);
    }

    function testRenderUsesClassicBookNativeCenterlinesAndFixedFieldAnchors() public view {
        string memory svg = renderer.render("A", "A");
        require(
            _contains(svg, 'data-glyph-library-member="inshell.thought.glyph-library.set-05.classic-book"'),
            "Classic Book descriptor missing"
        );
        require(
            _contains(svg, '<path id="g41" d="M1 0L4 10L7 0M2.3 4L5.7 4"/>'),
            "exact packed A path missing"
        );
        require(!_contains(svg, 'id="g5a"'), "unused glyph definition returned");
        require(
            _contains(
                svg,
                '<g id="prompt-line" fill="none" stroke="#00ff00" stroke-width="0.82" stroke-linecap="round" stroke-linejoin="round"'
            ),
            "canonical centerline paint missing"
        );
        require(
            _contains(
                svg,
                '<g transform="translate(873.6 171.52) scale(2.88 -2.88)"><use href="#g41"/></g>'
            ),
            "prompt top anchor drift"
        );
        require(
            _contains(
                svg,
                '<g transform="translate(57.6 811.52) scale(2.88 -2.88)"><use href="#g41"/></g>'
            ),
            "Agent bottom anchor drift"
        );
        require(!_contains(svg, "<foreignObject"), "foreignObject returned");
        require(!_contains(svg, "<text"), "SVG text returned");
        require(!_contains(svg, "@font-face"), "embedded font returned");
    }

    function testRenderUsesApprovedClassicBookRevision8Paths() public view {
        string memory svg = renderer.render("G?2", "fk-");
        require(
            _contains(svg, '<path id="g47" d="M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q7 0 7 2L7 5L4 5"/>'),
            "revision-8 G lower-join path missing"
        );
        require(
            _contains(svg, '<path id="g3f" d="M1 8Q2 10 4 10Q7 10 7 7Q7 5 4 4L4 3M4 0L4 1"/>'),
            "revision-3 question-mark path missing"
        );
        require(
            _contains(svg, '<path id="g32" d="M1 8Q2 10 4 10Q7 10 7 7Q7 6 5 4L1 0L7 0"/>'),
            "revision-4 two path missing"
        );
        require(
            _contains(svg, '<path id="g66" d="M3 0L3 8Q3 11 5 11Q6 11 7 10M1 7L7 7"/>'),
            "revision-5 optical-spacing f path missing"
        );
        require(
            _contains(svg, '<path id="g6b" d="M1 0L1 10M7 7L1 2M3.18 3.82L7 0"/>'),
            "revision-6 k junction path missing"
        );
        require(
            _contains(svg, '<path id="g2d" d="M1 5L7 5"/>'),
            "revision-7 centered hyphen path missing"
        );
    }

    function testTokenUriPublishesClassicBookDescriptor() public view {
        string memory metadata = _metadataJsonFromTokenUri(renderer.tokenURI(_data("Are you there?", "I am here.")));
        require(
            _contains(metadata, '"glyphLibraryMemberId":"inshell.thought.glyph-library.set-05.classic-book"'),
            "metadata glyph member drift"
        );
        require(
            _contains(
                metadata,
                '"glyphDefinitionsKeccak256":"0xa1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430"'
            ),
            "metadata packed commitment drift"
        );
        require(
            _contains(
                metadata,
                '"rendererImplementationId":"inshell.thought.renderer.v2.classic-book-76-im76-native-paths-frame-32-006100-green-00ff00-prompt-top-agent-bottom"'
            ),
            "metadata implementation drift"
        );
    }

    function testRepresentativeAndMaximumPairsStayBelowHardTokenUriGate() public {
        _measureAndRequire(
            "representative",
            "Are you there?",
            "I am here.",
            8_000_000
        );
        _measureAndRequire(
            "distinct-64-pair",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789?!",
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?",
            8_000_000
        );
        _measureAndRequire(
            "all-75-visible-glyphs-64-pair",
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,",
            "?!:;'\"-()/&ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0",
            8_000_000
        );
    }

    function _measureAndRequire(
        string memory label,
        string memory promptLine,
        string memory agentLine,
        uint256 gasLimit
    ) private {
        uint256 gasBefore = gasleft();
        string memory svg = renderer.render(promptLine, agentLine);
        uint256 renderGas = gasBefore - gasleft();

        gasBefore = gasleft();
        string memory uri = renderer.tokenURI(_data(promptLine, agentLine));
        uint256 tokenUriGas = gasBefore - gasleft();
        require(tokenUriGas < gasLimit, "Classic Book tokenURI gas acceptance failed");

        emit ClassicBookMeasurement(
            label,
            keccak256(bytes(svg)),
            bytes(svg).length,
            renderGas,
            keccak256(bytes(uri)),
            bytes(uri).length,
            tokenUriGas
        );
    }

    function _data(string memory promptLine, string memory agentLine)
        private
        pure
        returns (IThoughtRendererV2.TokenData memory)
    {
        return IThoughtRendererV2.TokenData({
            tokenId: 1,
            promptLine: promptLine,
            agentLine: agentLine,
            agent: "Not applicable",
            model: "Not applicable",
            provenanceJson: "{\"schema\":\"inshell.thought.provenance.v2\"}",
            thoughtSpecId: keccak256("THOUGHT.v2.md"),
            thoughtSpecHash: keccak256("spec"),
            pathId: 1,
            pathSerial: 1,
            minter: address(0xBEEF),
            mintedAt: 1_234,
            creationAttestationDigest: bytes32(0),
            protocolReleaseId: keccak256("release"),
            manifestKeccak256: keccak256("manifest"),
            creationAttestationVerifier: address(0xA77357)
        });
    }

    function _metadataJsonFromTokenUri(string memory uri) private pure returns (string memory) {
        bytes memory source = bytes(uri);
        bytes memory prefix = bytes("data:application/json;base64,");
        require(source.length > prefix.length, "token URI too short");
        for (uint256 index = 0; index < prefix.length; index++) {
            require(source[index] == prefix[index], "token URI prefix drift");
        }
        bytes memory encoded = new bytes(source.length - prefix.length);
        for (uint256 index = 0; index < encoded.length; index++) {
            encoded[index] = source[prefix.length + index];
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
        for (uint256 index = 0; index < data.length; index += 4) {
            uint24 chunk =
                (uint24(_base64Value(data[index])) << 18)
                | (uint24(_base64Value(data[index + 1])) << 12)
                | (uint24(_base64Value(data[index + 2])) << 6)
                | uint24(_base64Value(data[index + 3]));
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
        for (uint256 index = 0; index <= haystack.length - expected.length; index++) {
            bool matches = true;
            for (uint256 needleIndex = 0; needleIndex < expected.length; needleIndex++) {
                if (haystack[index + needleIndex] != expected[needleIndex]) {
                    matches = false;
                    break;
                }
            }
            if (matches) return true;
        }
        return false;
    }
}
