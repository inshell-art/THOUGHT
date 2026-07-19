// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

import {ICreationAttestationVerifier} from "./ICreationAttestationVerifier.sol";

contract CreationAttestationVerifier is ICreationAttestationVerifier, EIP712, Ownable2Step {
    string public constant PROFILE_NAME = "inshell.thought.creation-workflow-attestation.v1";
    bytes32 public constant PROFILE_ID = keccak256(bytes(PROFILE_NAME));
    bytes32 public constant CLAIM_TYPEHASH = keccak256(
        "CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 thoughtSpecId,bytes32 thoughtSpecHash,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)"
    );

    error AttestationPaused();
    error AuthorityEpochOverflow();
    error ExpiredAttestation(uint64 deadline, uint256 currentTimestamp);
    error InvalidAttestationAuthority();
    error InvalidAttestationProfile(bytes32 actual, bytes32 expected);
    error InvalidAttestationSignature();
    error InvalidAttestationThoughtNft(address actual, address caller);
    error InvalidAuthorityEpoch(uint32 actual, uint32 expected);
    error InvalidRunIdHash();

    event AttestationAuthorityRotated(
        address indexed oldAuthority, address indexed newAuthority, uint32 indexed oldEpoch, uint32 newEpoch
    );
    event AttestationPauseStateChanged(bool oldPaused, bool newPaused);

    address public authority;
    uint32 public authorityEpoch = 1;
    bool public paused;

    constructor(address initialOwner, address initialAuthority)
        EIP712("Inshell THOUGHT Creation Attestation", "1")
        Ownable(initialOwner)
    {
        if (initialAuthority == address(0)) {
            revert InvalidAttestationAuthority();
        }
        authority = initialAuthority;
    }

    function profileId() external pure returns (bytes32) {
        return PROFILE_ID;
    }

    function domainSeparator() external view returns (bytes32) {
        return _domainSeparatorV4();
    }

    function hashStruct(Claim calldata claim) public pure returns (bytes32) {
        return keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                claim.profileId,
                claim.thoughtNft,
                claim.protocolReleaseId,
                claim.thoughtSpecId,
                claim.thoughtSpecHash,
                claim.workHash,
                claim.provenanceHash,
                claim.declaredAgentHash,
                claim.declaredModelHash,
                claim.runIdHash,
                claim.intendedMinter,
                claim.deadline,
                claim.authorityEpoch
            )
        );
    }

    function hashClaim(Claim calldata claim) public view returns (bytes32) {
        return _hashTypedDataV4(hashStruct(claim));
    }

    function verify(Claim calldata claim, bytes calldata signature)
        external
        view
        returns (bytes32 digest, address attestor)
    {
        if (paused) revert AttestationPaused();
        if (claim.thoughtNft != msg.sender) revert InvalidAttestationThoughtNft(claim.thoughtNft, msg.sender);
        if (claim.profileId != PROFILE_ID) revert InvalidAttestationProfile(claim.profileId, PROFILE_ID);
        if (claim.runIdHash == bytes32(0)) revert InvalidRunIdHash();
        uint32 currentEpoch = authorityEpoch;
        if (claim.authorityEpoch != currentEpoch) revert InvalidAuthorityEpoch(claim.authorityEpoch, currentEpoch);
        if (block.timestamp > claim.deadline) revert ExpiredAttestation(claim.deadline, block.timestamp);
        if (signature.length != 65) revert InvalidAttestationSignature();

        digest = hashClaim(claim);
        (address recovered, ECDSA.RecoverError error,) = ECDSA.tryRecover(digest, signature);
        if (error != ECDSA.RecoverError.NoError || recovered != authority) revert InvalidAttestationSignature();
        attestor = recovered;
    }

    function rotateAuthority(address newAuthority) external onlyOwner {
        if (newAuthority == address(0)) revert InvalidAttestationAuthority();
        uint32 oldEpoch = authorityEpoch;
        if (oldEpoch == type(uint32).max) revert AuthorityEpochOverflow();
        address oldAuthority = authority;
        uint32 newEpoch = oldEpoch + 1;
        authority = newAuthority;
        authorityEpoch = newEpoch;
        emit AttestationAuthorityRotated(oldAuthority, newAuthority, oldEpoch, newEpoch);
    }

    function pause() external onlyOwner {
        if (!paused) {
            paused = true;
            emit AttestationPauseStateChanged(false, true);
        }
    }

    function unpause() external onlyOwner {
        if (paused) {
            paused = false;
            emit AttestationPauseStateChanged(true, false);
        }
    }
}
