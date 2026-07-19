// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

import {CreationAttestationVerifier} from "../src/CreationAttestationVerifier.sol";
import {ICreationAttestationVerifier} from "../src/ICreationAttestationVerifier.sol";

interface VmAttestation {
    function addr(uint256 privateKey) external returns (address);
    function chainId(uint256 newChainId) external;
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256 newTimestamp) external;
}

contract CreationAttestationVerifierHarness is CreationAttestationVerifier {
    constructor(address initialOwner, address initialAuthority)
        CreationAttestationVerifier(initialOwner, initialAuthority)
    {}

    function forceAuthorityEpoch(uint32 value) external {
        authorityEpoch = value;
    }
}

contract CreationAttestationVerifierTest {
    VmAttestation private constant vm = VmAttestation(address(uint160(uint256(keccak256("hevm cheat code")))));

    uint256 private constant AUTHORITY_KEY = 0xA7735702;
    uint256 private constant NEXT_AUTHORITY_KEY = 0xA7735703;
    uint256 private constant WRONG_KEY = 0xBAD;
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    uint256 private constant SECP256K1_N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

    event AttestationAuthorityRotated(
        address indexed oldAuthority, address indexed newAuthority, uint32 indexed oldEpoch, uint32 newEpoch
    );
    event AttestationPauseStateChanged(bool oldPaused, bool newPaused);

    CreationAttestationVerifierHarness private verifier;
    address private authority;

    function setUp() public {
        authority = vm.addr(AUTHORITY_KEY);
        verifier = new CreationAttestationVerifierHarness(address(this), authority);
    }

    function testProfileDomainTypeStructAndDigestParity() public view {
        ICreationAttestationVerifier.Claim memory claim = _claim();
        bytes32 expectedProfile = keccak256(bytes("inshell.thought.creation-workflow-attestation.v1"));
        require(verifier.profileId() == expectedProfile, "profile id mismatch");
        require(
            verifier.CLAIM_TYPEHASH()
                == keccak256(
                    "CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 thoughtSpecId,bytes32 thoughtSpecHash,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)"
                ),
            "type hash mismatch"
        );

        bytes32 expectedStructHash = keccak256(
            abi.encode(
                verifier.CLAIM_TYPEHASH(),
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
        bytes32 expectedDomain = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("Inshell THOUGHT Creation Attestation")),
                keccak256(bytes("1")),
                block.chainid,
                address(verifier)
            )
        );
        require(verifier.hashStruct(claim) == expectedStructHash, "struct hash mismatch");
        require(verifier.domainSeparator() == expectedDomain, "domain separator mismatch");
        require(
            verifier.hashClaim(claim) == keccak256(abi.encodePacked("\x19\x01", expectedDomain, expectedStructHash)),
            "typed digest mismatch"
        );
    }

    function testValidSignatureAndInclusiveDeadline() public {
        ICreationAttestationVerifier.Claim memory claim = _claim();
        claim.deadline = uint64(block.timestamp);
        bytes memory signature = _sign(AUTHORITY_KEY, verifier.hashClaim(claim));
        (bytes32 digest, address attestor) = verifier.verify(claim, signature);
        require(digest == verifier.hashClaim(claim), "digest mismatch");
        require(attestor == authority, "attestor mismatch");
    }

    function testRejectsWrongSignerAndEveryChangedCommitment() public {
        ICreationAttestationVerifier.Claim memory claim = _claim();
        bytes memory signature = _sign(AUTHORITY_KEY, verifier.hashClaim(claim));

        _expectBadSignature(_withProtocolRelease(claim, keccak256("other release")), signature);
        _expectBadSignature(_withThoughtSpecId(claim, keccak256("other spec id")), signature);
        _expectBadSignature(_withThoughtSpecHash(claim, keccak256("other spec hash")), signature);
        _expectBadSignature(_withWork(claim, keccak256("other work")), signature);
        _expectBadSignature(_withProvenance(claim, keccak256("other provenance")), signature);
        _expectBadSignature(_withDeclaredAgent(claim, keccak256("other agent")), signature);
        _expectBadSignature(_withDeclaredModel(claim, keccak256("other model")), signature);
        _expectBadSignature(_withRun(claim, keccak256("other run")), signature);
        _expectBadSignature(_withMinter(claim, address(0xBEEF)), signature);
        _expectBadSignature(_withDeadline(claim, claim.deadline + 1), signature);

        bytes memory wrongSignature = _sign(WRONG_KEY, verifier.hashClaim(claim));
        _expectBadSignature(claim, wrongSignature);
    }

    function testDomainSeparatesChainVerifierAndCallingNft() public {
        ICreationAttestationVerifier.Claim memory claim = _claim();
        bytes memory signature = _sign(AUTHORITY_KEY, verifier.hashClaim(claim));

        uint256 originalChainId = block.chainid;
        vm.chainId(originalChainId + 1);
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationSignature.selector));
        verifier.verify(claim, signature);
        vm.chainId(originalChainId);

        CreationAttestationVerifier other = new CreationAttestationVerifier(address(this), authority);
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationSignature.selector));
        other.verify(claim, signature);

        claim.thoughtNft = address(0xBEEF);
        vm.expectRevert(
            abi.encodeWithSelector(
                CreationAttestationVerifier.InvalidAttestationThoughtNft.selector, address(0xBEEF), address(this)
            )
        );
        verifier.verify(claim, signature);
    }

    function testRejectsProfileRunEpochExpiryAndMalformedSignatures() public {
        ICreationAttestationVerifier.Claim memory claim = _claim();
        bytes memory signature = _sign(AUTHORITY_KEY, verifier.hashClaim(claim));

        claim.profileId = keccak256("wrong profile");
        vm.expectRevert(
            abi.encodeWithSelector(
                CreationAttestationVerifier.InvalidAttestationProfile.selector, claim.profileId, verifier.PROFILE_ID()
            )
        );
        verifier.verify(claim, signature);

        claim = _claim();
        claim.runIdHash = bytes32(0);
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidRunIdHash.selector));
        verifier.verify(claim, signature);

        claim = _claim();
        claim.authorityEpoch = 2;
        vm.expectRevert(
            abi.encodeWithSelector(CreationAttestationVerifier.InvalidAuthorityEpoch.selector, uint32(2), uint32(1))
        );
        verifier.verify(claim, signature);

        claim = _claim();
        vm.warp(uint256(claim.deadline) + 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                CreationAttestationVerifier.ExpiredAttestation.selector, claim.deadline, block.timestamp
            )
        );
        verifier.verify(claim, signature);

        claim = _claim();
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationSignature.selector));
        verifier.verify(claim, hex"01");

        bytes memory badV = signature;
        badV[64] = bytes1(uint8(29));
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationSignature.selector));
        verifier.verify(claim, badV);
    }

    function testRejectsHighSSignature() public {
        ICreationAttestationVerifier.Claim memory claim = _claim();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(AUTHORITY_KEY, verifier.hashClaim(claim));
        bytes32 highS = bytes32(SECP256K1_N - uint256(s));
        bytes memory signature = abi.encodePacked(r, highS, v == 27 ? uint8(28) : uint8(27));
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationSignature.selector));
        verifier.verify(claim, signature);
    }

    function testRejectsPreviousDraftTypeSignature() public {
        ICreationAttestationVerifier.Claim memory claim = _claim();
        bytes32 oldTypeHash = keccak256(
            "CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)"
        );
        bytes32 oldStructHash = keccak256(
            abi.encode(
                oldTypeHash,
                claim.profileId,
                claim.thoughtNft,
                claim.protocolReleaseId,
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
        bytes32 oldDigest = keccak256(abi.encodePacked("\x19\x01", verifier.domainSeparator(), oldStructHash));
        bytes memory oldSignature = _sign(AUTHORITY_KEY, oldDigest);
        _expectBadSignature(claim, oldSignature);
    }

    function testRotationPauseAndTwoStepOwnership() public {
        ICreationAttestationVerifier.Claim memory oldClaim = _claim();
        bytes memory oldSignature = _sign(AUTHORITY_KEY, verifier.hashClaim(oldClaim));
        address nextAuthority = vm.addr(NEXT_AUTHORITY_KEY);
        vm.expectEmit(true, true, true, true);
        emit AttestationAuthorityRotated(authority, nextAuthority, 1, 2);
        verifier.rotateAuthority(nextAuthority);
        require(verifier.authority() == nextAuthority, "authority not rotated");
        require(verifier.authorityEpoch() == 2, "epoch not incremented once");

        vm.expectRevert(
            abi.encodeWithSelector(CreationAttestationVerifier.InvalidAuthorityEpoch.selector, uint32(1), uint32(2))
        );
        verifier.verify(oldClaim, oldSignature);

        ICreationAttestationVerifier.Claim memory claim = _claim();
        claim.authorityEpoch = 2;
        bytes memory signature = _sign(NEXT_AUTHORITY_KEY, verifier.hashClaim(claim));
        vm.expectEmit(false, false, false, true);
        emit AttestationPauseStateChanged(false, true);
        verifier.pause();
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.AttestationPaused.selector));
        verifier.verify(claim, signature);
        vm.expectEmit(false, false, false, true);
        emit AttestationPauseStateChanged(true, false);
        verifier.unpause();
        (, address attestor) = verifier.verify(claim, signature);
        require(attestor == nextAuthority, "new authority rejected");

        address nextOwner = address(0xB0B);
        verifier.transferOwnership(nextOwner);
        require(verifier.owner() == address(this), "ownership changed before acceptance");
        require(verifier.pendingOwner() == nextOwner, "pending owner missing");
        vm.prank(nextOwner);
        verifier.acceptOwnership();
        require(verifier.owner() == nextOwner, "ownership not accepted");

        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, address(this)));
        verifier.pause();
    }

    function testUnauthorizedGovernanceCallsRevert() public {
        address attacker = address(0xBADCA11);
        bytes memory unauthorized = abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, attacker);

        vm.prank(attacker);
        vm.expectRevert(unauthorized);
        verifier.rotateAuthority(address(0xBEEF));

        vm.prank(attacker);
        vm.expectRevert(unauthorized);
        verifier.pause();

        verifier.pause();
        vm.prank(attacker);
        vm.expectRevert(unauthorized);
        verifier.unpause();

        vm.prank(attacker);
        vm.expectRevert(unauthorized);
        verifier.transferOwnership(attacker);
    }

    function testRejectsZeroAuthorityAndEpochOverflow() public {
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationAuthority.selector));
        new CreationAttestationVerifier(address(this), address(0));

        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationAuthority.selector));
        verifier.rotateAuthority(address(0));

        verifier.forceAuthorityEpoch(type(uint32).max);
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.AuthorityEpochOverflow.selector));
        verifier.rotateAuthority(address(0xBEEF));
    }

    function testGeneratedSolidityAndTypeScriptClaimVectorsMatchByteForByte() public view {
        _assertFixture(
            0xd4e816b4af3344204c7b8af8cef0ad4cf06b3baa09093db26e553427ccb31426,
            0x051a76aced247f3ad67f24a2425f9d666cbaf59550a6a5e291e22e7a2750fc8c,
            0xc22b20ee4fb5318b4915f096594a51f31b920764e8dfbe3ebf751484be8201eb,
            0xfc52514a38c41457b11d6bf8f0158c577d55770aa622353347483fc1cdbb9f1f,
            0x6c5831e7a188d49dfae2e28135e9accdc7fea28a0b15a96e0088948f8a1da35d,
            1_900_000_000,
            1,
            0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410,
            0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76,
            0xc8ca2a02c5181e28a231768aacd44d0c3bdf8fc49e70f3409b19b33559b152c6,
            0x182be6c6ea2554f3a9a42218e15cb63ec3826790568c6258358444d1b1f5caa0
        );
        _assertFixture(
            0xbdc30cbed335f1d28f71dcef28b2ab139d0ae6f03944ebada7ce8087e874753f,
            0x95a601c9ca161f7d74ce9e5721d9a110e71e36a4de8cbe53f03c4ac88c041830,
            0xa26ae416726b7f226ffaa0d0a4faed8ed912561db8c4b10bddcf4287224344f4,
            0xfa1f7232970e8e3e749f67df13741d4e421c69e890ee9b1cd4e75efb10f160b4,
            0x56ac95bc41c27c2391057ff4c5a706db4d73e555ff15ef2fb77d6d62a286c07f,
            1_900_000_001,
            2,
            0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410,
            0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76,
            0x5dabfc69714f1f2e84eb300e096c65eed50c517358e96749de2bdc50b1fc42af,
            0x2f2d2363cfabf85c43686381da7378d6089479a2404c4d38c86c5041b6f0d2d2
        );
        _assertFixture(
            0xc7e795b3a802384b4efaa25d75aaddc7072f87a0782a24b3f8391dc8ffb770db,
            0x796c4b5da942db2280d85e6b6b094434f68b46aacc24c9d41a10c4b953bd8648,
            0x03783fac2efed8fbc9ad443e592ee30e61d65f471140c10ca155e937b435b760,
            0x7d61fdc86cb928ea48fbf22d28ed5341c2e6a2599c550270b824b71dfa078d06,
            0x93a8ee18d9602f8a338e31fab00bfe3e8aeef42370d44af53229d64944f41050,
            1,
            1,
            0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410,
            0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76,
            0xfcd3ba8953665824dfa04b030fe2a2fd59bec13223720141d601feae648ed316,
            0x78d4885821485f69836ff9fde1f075453a65b89bb927d367a268aa045ff24481
        );
        _assertFixture(
            0x0ce141da3527defa276bcabee9009b343c496b9542e9effb4921b0ec275f168e,
            0xb971a2a5290c39d2ca94d68a760acb852bad85ce539d2a73123bddcc07078b0a,
            0x5ab08aef833c4bacf716f44e5807bb1c48a27aa7addc150bbc5876449eee0423,
            0x053ea8dfceb88f7e2715e6cc21b0d98ab1ecc160780d8bd20812f097acc8cb76,
            0x535d98ffc69460b764aae5d8b5f0c26fd558d65a48d81538dc94bdaae74a78c6,
            type(uint64).max,
            type(uint32).max,
            0x0a33583e39050834eb77372ea8b41ceded8fe4bb47c31fe1a72ebb880351b410,
            0x8f78c9727cd40f9f7a4548c6e32a22832ce5101b69cf9d60d4e300f4f8cb4a76,
            0xb33c468fd3b01d5cadadfbbf65f1bb029943f8215eea44105ac803c83f8cc176,
            0x181acb52f51c905761657c735302b676fdceae2a186e270b076b3589b45fcaab
        );
        _assertFixture(
            0xbdc30cbed335f1d28f71dcef28b2ab139d0ae6f03944ebada7ce8087e874753f,
            0xae7522f78a3f9f8020434a72d9697c3b2a9879215f7c2065555801640a36f8b4,
            0xa26ae416726b7f226ffaa0d0a4faed8ed912561db8c4b10bddcf4287224344f4,
            0xfa1f7232970e8e3e749f67df13741d4e421c69e890ee9b1cd4e75efb10f160b4,
            0x836268bd68d70279569364187bb9265ac9e63582b5578a7700a187e1d4bf9a59,
            1_900_000_005,
            2,
            0xd2a0889e3063cd1bc14ea17c8af8aefaf583118537acfd1234ab285622596a9f,
            0xede859e68d811854a387b195bc37684d55b08874fbca0fe9ab865769f1f4c5a5,
            0x7b42083f622d430aabc7a0bbc16540b40cd6f2d28f55877552e73078891667bf,
            0xc9b7408911d0a3fb228495ea087419bd6027ebca462262702a68f5016e6e3a1d
        );
    }

    function _assertFixture(
        bytes32 workHash,
        bytes32 provenanceHash,
        bytes32 declaredAgentHash,
        bytes32 declaredModelHash,
        bytes32 runIdHash,
        uint64 deadline,
        uint32 epoch,
        bytes32 thoughtSpecId,
        bytes32 thoughtSpecHash,
        bytes32 expectedStructHash,
        bytes32 expectedDigest
    ) private view {
        ICreationAttestationVerifier.Claim memory claim = ICreationAttestationVerifier.Claim({
            profileId: 0x0dc216b0e8f18cabaa4afee047e80f349ed3c2de67ace911157300279f74c669,
            thoughtNft: address(0x1111111111111111111111111111111111111111),
            protocolReleaseId: 0xf333ec9668d39a5ed5a75dfcbc625e10c255e068bd4041c05f625570fffa2815,
            thoughtSpecId: thoughtSpecId,
            thoughtSpecHash: thoughtSpecHash,
            workHash: workHash,
            provenanceHash: provenanceHash,
            declaredAgentHash: declaredAgentHash,
            declaredModelHash: declaredModelHash,
            runIdHash: runIdHash,
            intendedMinter: address(0x3333333333333333333333333333333333333333),
            deadline: deadline,
            authorityEpoch: epoch
        });
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("Inshell THOUGHT Creation Attestation")),
                keccak256(bytes("1")),
                uint256(31_337),
                address(0x4444444444444444444444444444444444444444)
            )
        );
        require(
            domainSeparator == 0xe8f46ccefdc8999c23551f7b793ea867dc675ce0e092c6ab8c1f2796423a18fc,
            "fixture domain separator mismatch"
        );
        bytes32 structHash = verifier.hashStruct(claim);
        require(structHash == expectedStructHash, "fixture struct hash mismatch");
        require(
            keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash)) == expectedDigest,
            "fixture digest mismatch"
        );
    }

    function _claim() private view returns (ICreationAttestationVerifier.Claim memory claim) {
        claim = ICreationAttestationVerifier.Claim({
            profileId: verifier.PROFILE_ID(),
            thoughtNft: address(this),
            protocolReleaseId: keccak256("release"),
            thoughtSpecId: keccak256("THOUGHT.v2.md"),
            thoughtSpecHash: keccak256("spec bytes"),
            workHash: keccak256("work"),
            provenanceHash: keccak256("provenance"),
            declaredAgentHash: keccak256(bytes("Fixture Agent")),
            declaredModelHash: keccak256(bytes("Fixture Model")),
            runIdHash: keccak256("run"),
            intendedMinter: address(0xA11CE),
            deadline: uint64(block.timestamp + 1 hours),
            authorityEpoch: verifier.authorityEpoch()
        });
    }

    function _sign(uint256 key, bytes32 digest) private returns (bytes memory) {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(key, digest);
        return abi.encodePacked(r, s, v);
    }

    function _expectBadSignature(ICreationAttestationVerifier.Claim memory claim, bytes memory signature) private {
        vm.expectRevert(abi.encodeWithSelector(CreationAttestationVerifier.InvalidAttestationSignature.selector));
        verifier.verify(claim, signature);
    }

    function _withProtocolRelease(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.protocolReleaseId = value;
        return claim;
    }

    function _withWork(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.workHash = value;
        return claim;
    }

    function _withThoughtSpecId(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.thoughtSpecId = value;
        return claim;
    }

    function _withThoughtSpecHash(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.thoughtSpecHash = value;
        return claim;
    }

    function _withProvenance(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.provenanceHash = value;
        return claim;
    }

    function _withDeclaredAgent(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.declaredAgentHash = value;
        return claim;
    }

    function _withDeclaredModel(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.declaredModelHash = value;
        return claim;
    }

    function _withRun(ICreationAttestationVerifier.Claim memory claim, bytes32 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.runIdHash = value;
        return claim;
    }

    function _withMinter(ICreationAttestationVerifier.Claim memory claim, address value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.intendedMinter = value;
        return claim;
    }

    function _withDeadline(ICreationAttestationVerifier.Claim memory claim, uint64 value)
        private
        pure
        returns (ICreationAttestationVerifier.Claim memory)
    {
        claim.deadline = value;
        return claim;
    }
}
