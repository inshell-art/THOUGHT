// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICreationAttestationVerifierV2 {
    struct Claim {
        bytes32 profileId;
        address thoughtNft;
        bytes32 protocolReleaseId;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        bytes32 workHash;
        bytes32 provenanceHash;
        bytes32 agentHash;
        bytes32 modelHash;
        bytes32 runIdHash;
        address intendedMinter;
        uint64 deadline;
        uint32 authorityEpoch;
    }

    function profileId() external pure returns (bytes32);

    function hashClaim(Claim calldata claim) external view returns (bytes32);

    function verify(Claim calldata claim, bytes calldata signature)
        external
        view
        returns (bytes32 digest, address attestor);
}
