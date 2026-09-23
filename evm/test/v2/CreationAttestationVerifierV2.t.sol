// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CreationAttestationVerifierV2} from "../../src/v2/CreationAttestationVerifierV2.sol";
import {ICreationAttestationVerifierV2} from "../../src/v2/ICreationAttestationVerifierV2.sol";

interface VmCreationAttestationV2 {
    function addr(uint256 privateKey) external returns (address);
    function expectRevert(bytes calldata revertData) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
}

contract CreationAttestationVerifierV2Test {
    VmCreationAttestationV2 private constant VM =
        VmCreationAttestationV2(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 private constant AUTHORITY_KEY = 0xA7735702;
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    CreationAttestationVerifierV2 private verifier;
    address private authority;

    function setUp() public {
        authority = VM.addr(AUTHORITY_KEY);
        verifier = new CreationAttestationVerifierV2(address(this), authority);
    }

    function testNeutralProfileDomainTypeStructAndDigestParity() public view {
        ICreationAttestationVerifierV2.Claim memory claim = _claim();
        bytes32 expectedProfile = keccak256(bytes("inshell.thought.creation-workflow-attestation.v2"));
        bytes32 expectedTypeHash = keccak256(
            "CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 thoughtSpecId,bytes32 thoughtSpecHash,bytes32 workHash,bytes32 provenanceHash,bytes32 agentHash,bytes32 modelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)"
        );
        bytes32 expectedStructHash = keccak256(
            abi.encode(
                expectedTypeHash,
                claim.profileId,
                claim.thoughtNft,
                claim.protocolReleaseId,
                claim.thoughtSpecId,
                claim.thoughtSpecHash,
                claim.workHash,
                claim.provenanceHash,
                claim.agentHash,
                claim.modelHash,
                claim.runIdHash,
                claim.intendedMinter,
                claim.deadline,
                claim.authorityEpoch
            )
        );
        bytes32 expectedDomain = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("Inshell THOUGHT Creation Attestation")),
                keccak256(bytes("2")),
                block.chainid,
                address(verifier)
            )
        );

        require(verifier.profileId() == expectedProfile, "profile id mismatch");
        require(verifier.CLAIM_TYPEHASH() == expectedTypeHash, "type hash mismatch");
        require(verifier.hashStruct(claim) == expectedStructHash, "struct hash mismatch");
        require(verifier.domainSeparator() == expectedDomain, "domain separator mismatch");
        require(
            verifier.hashClaim(claim) == keccak256(abi.encodePacked("\x19\x01", expectedDomain, expectedStructHash)),
            "typed digest mismatch"
        );
    }

    function testValidNeutralClaimAndAgentModelMutationBinding() public {
        ICreationAttestationVerifierV2.Claim memory claim = _claim();
        bytes memory signature = _sign(verifier.hashClaim(claim));
        (bytes32 digest, address attestor) = verifier.verify(claim, signature);
        require(digest == verifier.hashClaim(claim), "digest mismatch");
        require(attestor == authority, "authority mismatch");

        claim.agentHash = keccak256("other agent");
        _expectBadSignature(claim, signature);
        claim = _claim();
        claim.modelHash = keccak256("other model");
        _expectBadSignature(claim, signature);
    }

    function testOldV1ProfileAndSignatureAreRejected() public {
        ICreationAttestationVerifierV2.Claim memory claim = _claim();
        bytes32 oldProfileId = keccak256(bytes("inshell.thought.creation-workflow-attestation.v1"));
        bytes32 oldTypeHash = keccak256(
            "CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 thoughtSpecId,bytes32 thoughtSpecHash,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)"
        );
        bytes32 oldDomain = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("Inshell THOUGHT Creation Attestation")),
                keccak256(bytes("1")),
                block.chainid,
                address(verifier)
            )
        );
        bytes32 oldStructHash = keccak256(
            abi.encode(
                oldTypeHash,
                oldProfileId,
                claim.thoughtNft,
                claim.protocolReleaseId,
                claim.thoughtSpecId,
                claim.thoughtSpecHash,
                claim.workHash,
                claim.provenanceHash,
                claim.agentHash,
                claim.modelHash,
                claim.runIdHash,
                claim.intendedMinter,
                claim.deadline,
                claim.authorityEpoch
            )
        );
        bytes memory oldSignature = _sign(keccak256(abi.encodePacked("\x19\x01", oldDomain, oldStructHash)));

        _expectBadSignature(claim, oldSignature);

        claim.profileId = oldProfileId;
        VM.expectRevert(
            abi.encodeWithSelector(
                CreationAttestationVerifierV2.InvalidAttestationProfile.selector,
                oldProfileId,
                verifier.PROFILE_ID()
            )
        );
        verifier.verify(claim, oldSignature);
    }

    function _claim() private view returns (ICreationAttestationVerifierV2.Claim memory) {
        return ICreationAttestationVerifierV2.Claim({
            profileId: verifier.PROFILE_ID(),
            thoughtNft: address(this),
            protocolReleaseId: keccak256("release"),
            thoughtSpecId: keccak256("THOUGHT.v2.md"),
            thoughtSpecHash: keccak256("spec bytes"),
            workHash: keccak256("work"),
            provenanceHash: keccak256("provenance"),
            agentHash: keccak256("Agent record"),
            modelHash: keccak256("Model record"),
            runIdHash: keccak256("run"),
            intendedMinter: address(0xBEEF),
            deadline: uint64(block.timestamp + 1 days),
            authorityEpoch: 1
        });
    }

    function _expectBadSignature(ICreationAttestationVerifierV2.Claim memory claim, bytes memory signature)
        private
    {
        VM.expectRevert(
            abi.encodeWithSelector(CreationAttestationVerifierV2.InvalidAttestationSignature.selector)
        );
        verifier.verify(claim, signature);
    }

    function _sign(bytes32 digest) private returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = VM.sign(AUTHORITY_KEY, digest);
        return abi.encodePacked(r, s, v);
    }
}
