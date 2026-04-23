// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtToken} from "../src/ThoughtToken.sol";

contract ThoughtTokenTest {
    ThoughtToken private token;

    function setUp() public {
        token = new ThoughtToken();
    }

    function testNormalizeThoughtUppercasesAndCollapses() public view {
        string memory normalized = token.normalizeThought("hello, world!!! 42");
        require(_equal(normalized, "HELLO WORLD"), "unexpected normalization");
    }

    function testMintStoresNormalizedThoughtAndOwnership() public {
        uint256 tokenId = token.mint("hello, world!!! 42");
        require(tokenId == 1, "unexpected token id");
        require(token.totalSupply() == 1, "unexpected total supply");
        require(token.ownerOf(tokenId) == address(this), "unexpected owner");
        require(_equal(token.thoughtText(tokenId), "HELLO WORLD"), "unexpected stored text");
        require(token.authorOf(tokenId) == address(this), "unexpected author");
    }

    function testRenderThoughtSvgIncludesExpectedColorsAndText() public view {
        string memory svg = token.renderThoughtSvg("why");
        require(_contains(svg, "#f5deb3"), "missing W color");
        require(_contains(svg, "#ffcc00"), "missing H color");
        require(_contains(svg, "#ffff00"), "missing Y color");
        require(_contains(svg, ">WHY</text>"), "missing rendered text");
    }

    function testTokenUriIsDataUriJson() public {
        uint256 tokenId = token.mint("hello world");
        string memory uri = token.tokenURI(tokenId);
        require(_contains(uri, "data:application/json;base64,"), "missing json data uri prefix");
    }

    function testMintPriceIsEnforced() public {
        token.setMintPrice(0.01 ether);
        (bool ok,) = address(token).call{value: 0}(abi.encodeWithSelector(token.mint.selector, "HELLO"));
        require(!ok, "mint should fail without required value");
    }

    function _contains(string memory haystack, string memory needle) private pure returns (bool) {
        bytes memory source = bytes(haystack);
        bytes memory target = bytes(needle);

        if (target.length == 0 || target.length > source.length) {
            return false;
        }

        for (uint256 i = 0; i <= source.length - target.length; i++) {
            bool match_ = true;
            for (uint256 j = 0; j < target.length; j++) {
                if (source[i + j] != target[j]) {
                    match_ = false;
                    break;
                }
            }
            if (match_) {
                return true;
            }
        }

        return false;
    }

    function _equal(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
