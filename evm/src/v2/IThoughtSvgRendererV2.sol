// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IThoughtSvgRendererV2 {
    function IMPLEMENTATION_ID() external view returns (string memory);

    function IMPLEMENTATION_ID_HASH() external view returns (bytes32);

    function GLYPH_LIBRARY_MEMBER_ID() external view returns (string memory);

    function GLYPH_SOURCE_SHA256() external view returns (bytes32);

    function glyphDefinitionsPointer1() external view returns (address);

    function glyphDefinitionsPointer2() external view returns (address);

    function glyphDefinitionsIndexPointer() external view returns (address);

    function glyphDefinitionsKeccak256() external view returns (bytes32);

    function render(string calldata promptLine, string calldata agentLine) external view returns (string memory);
}
