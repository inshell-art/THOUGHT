// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IThoughtRenderer {
    struct TokenData {
        uint256 tokenId;
        string promptLine;
        string agentLine;
        string declaredAgent;
        string declaredModel;
        string provenanceJson;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        uint256 pathId;
        uint256 pathSerial;
        address minter;
        uint64 mintedAt;
        bytes32 creationAttestationDigest;
        bytes32 protocolReleaseId;
        bytes32 manifestKeccak256;
        address creationAttestationVerifier;
    }

    function RENDERER_ID_HASH() external view returns (bytes32);

    function render(
        string calldata promptLine,
        string calldata agentLine,
        bytes calldata packedField,
        uint256 promptDisplayUnits,
        uint256 agentDisplayUnits
    ) external view returns (string memory);

    function tokenURI(
        TokenData calldata data,
        bytes calldata packedField,
        uint256 promptDisplayUnits,
        uint256 agentDisplayUnits
    ) external view returns (string memory);
}
