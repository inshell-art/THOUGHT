// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICreationAttestationVerifier} from "../../src/ICreationAttestationVerifier.sol";
import {ThoughtSpecRegistry} from "../../src/ThoughtSpecRegistry.sol";
import {ThoughtSpecRegistryV2} from "../../src/ThoughtSpecRegistryV2.sol";
import {IThoughtRendererV2} from "../../src/v2/IThoughtRendererV2.sol";
import {ThoughtNFTV2} from "../../src/v2/ThoughtNFTV2.sol";
import {ThoughtV2ContextProfile} from "../../src/v2/ThoughtV2ContextProfile.sol";
import {ThoughtV2WorkProfile} from "../../src/v2/ThoughtV2WorkProfile.sol";

interface VmThoughtV2 {
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
}

contract MockPathNFTV2 {
    bool public shouldRevert;
    uint256 public consumeCallCount;

    function setShouldRevert(bool value) external {
        shouldRevert = value;
    }

    function consumeUnit(uint256 pathId, bytes32 movement, address claimer, uint256, bytes calldata)
        external
        returns (uint256 serial)
    {
        require(!shouldRevert, "PATH_REVERT");
        require(movement == bytes32("THOUGHT"), "BAD_MOVEMENT");
        require(claimer != address(0), "BAD_CLAIMER");
        consumeCallCount += 1;
        return pathId * 10;
    }
}

contract MockThoughtRendererV2 is IThoughtRendererV2 {
    bytes32 public constant RENDERER_ID_HASH = keccak256(bytes("inshell.thought.svg.v2.terminal-chat-path-glyphs"));
    bytes32 public constant METADATA_PROFILE_ID_HASH = keccak256(bytes("inshell.thought.metadata.v2.terminal-chat"));

    function render(string calldata, string calldata) external pure returns (string memory) {
        return "<svg id='thought-v2'/>";
    }

    function tokenURI(TokenData calldata data) external pure returns (string memory) {
        return string.concat(data.declaredAgent, "|", data.declaredModel);
    }
}

contract WrongThoughtRendererV2 {
    function RENDERER_ID_HASH() external pure returns (bytes32) {
        return keccak256("wrong.renderer.v2");
    }
}

contract WrongMetadataProfileRendererV2 {
    bytes32 public constant RENDERER_ID_HASH = keccak256(bytes("inshell.thought.svg.v2.terminal-chat-path-glyphs"));

    function METADATA_PROFILE_ID_HASH() external pure returns (bytes32) {
        return keccak256("wrong.metadata.v2");
    }
}

contract MockCreationAttestationVerifierV2 is ICreationAttestationVerifier {
    address public constant ATTESTOR = address(0xA77357);
    bytes32 private constant _PROFILE_ID = keccak256(bytes("inshell.thought.creation-workflow-attestation.v1"));

    function profileId() external pure returns (bytes32) {
        return _PROFILE_ID;
    }

    function hashClaim(Claim calldata claim) external pure returns (bytes32) {
        return keccak256(abi.encode(claim));
    }

    function verify(Claim calldata claim, bytes calldata) external pure returns (bytes32 digest, address attestor) {
        return (keccak256(abi.encode(claim)), ATTESTOR);
    }
}

contract WrongCreationAttestationVerifierV2 is ICreationAttestationVerifier {
    function profileId() external pure returns (bytes32) {
        return keccak256("wrong.creation-attestation.profile");
    }

    function hashClaim(Claim calldata claim) external pure returns (bytes32) {
        return keccak256(abi.encode(claim));
    }

    function verify(Claim calldata claim, bytes calldata) external pure returns (bytes32 digest, address attestor) {
        return (keccak256(abi.encode(claim)), address(0xBAD));
    }
}

contract InvalidResultCreationAttestationVerifierV2 is ICreationAttestationVerifier {
    bool private immutable _zeroDigest;

    constructor(bool zeroDigest_) {
        _zeroDigest = zeroDigest_;
    }

    function profileId() external pure returns (bytes32) {
        return keccak256(bytes("inshell.thought.creation-workflow-attestation.v1"));
    }

    function hashClaim(Claim calldata claim) external pure returns (bytes32) {
        return keccak256(abi.encode(claim));
    }

    function verify(Claim calldata claim, bytes calldata) external view returns (bytes32 digest, address attestor) {
        digest = _zeroDigest ? bytes32(0) : keccak256(abi.encode(claim));
        attestor = _zeroDigest ? address(0xA77357) : address(0);
    }
}

contract ToggleERC721ReceiverV2 {
    bool public accepts;

    function setAccepts(bool value) external {
        accepts = value;
    }

    function mint(ThoughtNFTV2 target, ThoughtNFTV2.MintThoughtInput calldata input) external returns (uint256) {
        return target.mint(input);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external view returns (bytes4) {
        return accepts ? bytes4(0x150b7a02) : bytes4(0);
    }
}

contract ThoughtNFTV2Test {
    VmThoughtV2 private constant VM = VmThoughtV2(address(uint160(uint256(keccak256("hevm cheat code")))));

    address private constant USER = address(0xBEEF);
    string private constant SPEC_NAME = "THOUGHT.v2.md";
    string private constant SPEC_REF = "THOUGHT.v2.md";
    string private constant SPEC_TEXT = "# THOUGHT.v2.md\n\nVersion: v2\n\nTerminal English conversation works.\n";
    bytes32 private constant MANIFEST_HASH = keccak256("inshell.thought.protocol.v2.test");

    MockPathNFTV2 private path;
    ThoughtSpecRegistry private specRegistry;
    ThoughtSpecRegistryV2 private protocolRegistry;
    MockThoughtRendererV2 private renderer;
    MockCreationAttestationVerifierV2 private attestationVerifier;
    ThoughtNFTV2 private token;
    bytes32 private specId;
    bytes32 private specHash;
    bytes32 private releaseId;

    function setUp() public {
        path = new MockPathNFTV2();
        specRegistry = new ThoughtSpecRegistry(address(this));
        protocolRegistry = new ThoughtSpecRegistryV2(address(this));
        renderer = new MockThoughtRendererV2();
        attestationVerifier = new MockCreationAttestationVerifierV2();
        (specId, specHash,) = specRegistry.registerThoughtSpec(SPEC_NAME, SPEC_REF, bytes(SPEC_TEXT));
        releaseId = protocolRegistry.registerRelease(MANIFEST_HASH, "ipfs://thought-v2-test-manifest");
        token = _deploy(address(renderer));
    }

    function testTerminalEnglishRepertoireIsExactlyFrozen76Bytes() public view {
        bytes memory expected = bytes(" ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'\"-()/&");
        require(expected.length == 76, "frozen repertoire size mismatch");

        uint256 allowedCount;
        for (uint256 character = 0; character <= type(uint8).max; character++) {
            bool actual = token.isAllowedWorkByte(uint8(character));
            bool shouldAllow = _contains(expected, uint8(character));
            require(actual == shouldAllow, "unexpected repertoire byte");
            if (actual) allowedCount += 1;
        }
        require(allowedCount == 76, "unexpected allowed byte count");
    }

    function testTerminalEnglishAcceptsBoundaryAndPunctuationOnlyWorks() public view {
        string memory maximum = _repeat("A", 64);
        (uint256 promptBytes, uint256 agentBytes) = token.validateWorkLines(maximum, "...?!");
        require(promptBytes == 64, "prompt boundary mismatch");
        require(agentBytes == 5, "punctuation work mismatch");

        token.validateWorkLines("Wait - why?", "... because.");
        token.validateWorkLines("(Are you there?)", "Yes, I'm here.");
    }

    function testTerminalEnglishRejectsSizeSpacingAndUnsupportedBytes() public {
        VM.expectRevert(
            abi.encodeWithSelector(
                ThoughtV2WorkProfile.LineTooLarge.selector,
                ThoughtV2WorkProfile.LineKind.Prompt,
                uint256(65),
                uint256(64)
            )
        );
        token.validateWorkLines(_repeat("A", 65), "fine");

        VM.expectRevert(
            abi.encodeWithSelector(
                ThoughtV2WorkProfile.InvalidLineSpacing.selector, ThoughtV2WorkProfile.LineKind.Prompt
            )
        );
        token.validateWorkLines(" leading", "fine");

        VM.expectRevert(
            abi.encodeWithSelector(
                ThoughtV2WorkProfile.InvalidLineSpacing.selector, ThoughtV2WorkProfile.LineKind.Agent
            )
        );
        token.validateWorkLines("fine", "two  spaces");

        VM.expectRevert(
            abi.encodeWithSelector(
                ThoughtV2WorkProfile.InvalidLineByte.selector,
                ThoughtV2WorkProfile.LineKind.Prompt,
                uint256(4),
                uint8(0x5F)
            )
        );
        token.validateWorkLines("code_name", "fine");

        VM.expectRevert(
            abi.encodeWithSelector(
                ThoughtV2WorkProfile.InvalidLineByte.selector,
                ThoughtV2WorkProfile.LineKind.Agent,
                uint256(0),
                uint8(0xE4)
            )
        );
        token.validateWorkLines("fine", unicode"你好");
    }

    function testPairIdentityIsOrderedAndWorkHashUsesFrozenDomains() public view {
        bytes32 promptHash = keccak256(bytes("Are you there?"));
        bytes32 agentHash = keccak256(bytes("I am here."));
        bytes32 expectedIdentity = keccak256(abi.encode(token.CONVERSATION_IDENTITY_DOMAIN(), promptHash, agentHash));
        bytes32 expectedWorkHash =
            keccak256(abi.encode(token.WORK_DOMAIN(), token.RENDERER_ID_HASH(), promptHash, agentHash));

        require(
            token.WORK_PROFILE_ID_HASH() == 0x2bf311e6034eb35e6d1f7bd92894012ee7e528609830cb3b28df1ce5dd82f85a,
            "profile id hash drift"
        );
        require(
            token.RENDERER_ID_HASH() == 0x01982604c90acf1ca63020e0c3761b25d8dc8fc3c267d27ace14cb0d2c813d73,
            "renderer id hash drift"
        );
        require(
            token.CONTEXT_PROFILE_ID_HASH() == 0x9894359f9294f4b3a871442b19d851203138fad4a648c16f62fc04f55dff02b8,
            "context profile id hash drift"
        );
        require(
            token.METADATA_PROFILE_ID_HASH() == 0x4cefae9cf44cc61bc8ec16e266ecb31f53e634834fe5975cc564ae9dfc51858b,
            "metadata profile id hash drift"
        );
        require(
            token.CONVERSATION_IDENTITY_DOMAIN() == 0x83856e36e7dce724ed9101c7ab12471fedb4bc4478671dd8d135eddd5565ec17,
            "conversation domain drift"
        );
        require(
            token.WORK_DOMAIN() == 0x067f661d579b55748656bedd022ca2f5e113b78c9f39180ac6926f9bbdcb158f,
            "work domain drift"
        );
        require(token.conversationIdentityHash(promptHash, agentHash) == expectedIdentity, "identity formula drift");
        require(token.workHash(promptHash, agentHash) == expectedWorkHash, "work formula drift");
        require(
            expectedIdentity == 0x5c33034f3880c9b2c55c39102a9d32e049ac51218d68deb2c1d5c8371f182b3b,
            "conversation vector drift"
        );
        require(
            expectedWorkHash == 0xae80266ecd2c572d4dcda920bcb6e39f4cd0226137845a92819d37803ab6e2da, "work vector drift"
        );
        require(
            token.conversationIdentityHash(promptHash, agentHash)
                != token.conversationIdentityHash(agentHash, promptHash),
            "conversation identity must be ordered"
        );
    }

    function testMintStoresV2PairIdentityAndDelegatesMetadata() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("Are you there?", "I am here.", 7);
        VM.prank(USER);
        uint256 tokenId = token.mint(input);

        bytes32 promptHash = keccak256(bytes(input.promptLine));
        bytes32 agentHash = keccak256(bytes(input.agentLine));
        bytes32 identity = token.conversationIdentityHash(promptHash, agentHash);

        require(tokenId == 1 && token.totalSupply() == 1, "supply mismatch");
        require(token.ownerOf(tokenId) == USER, "owner mismatch");
        require(_equal(token.promptLineOf(tokenId), input.promptLine), "prompt mismatch");
        require(_equal(token.agentLineOf(tokenId), input.agentLine), "agent mismatch");
        require(_equal(token.declaredAgentOf(tokenId), input.declaredAgent), "declared agent mismatch");
        require(_equal(token.declaredModelOf(tokenId), input.declaredModel), "declared model mismatch");
        require(_equal(token.provenanceOf(tokenId), input.provenanceJson), "provenance mismatch");
        require(token.promptLineHashOf(tokenId) == promptHash, "prompt hash mismatch");
        require(token.agentLineHashOf(tokenId) == agentHash, "agent hash mismatch");
        require(token.conversationIdentityHashOf(tokenId) == identity, "stored identity mismatch");
        require(token.pathIdOf(tokenId) == 7 && token.pathSerialOf(tokenId) == 70, "PATH facts mismatch");
        require(token.authorOf(tokenId) == USER, "immutable author mismatch");
        require(token.mintedAtOf(tokenId) == uint64(block.timestamp), "mint time mismatch");
        require(token.creationAttestationDigestOf(tokenId) == bytes32(0), "empty proof stored a digest");
        require(token.tokenOfConversationIdentityHash(identity) == tokenId, "identity reservation missing");
        require(token.tokenOfConversation(input.promptLine, input.agentLine) == tokenId, "pair lookup mismatch");
        require(token.workHashOf(tokenId) == token.workHash(promptHash, agentHash), "stored work mismatch");
        require(token.provenanceHashOf(tokenId) == keccak256(bytes(input.provenanceJson)), "provenance hash mismatch");
        require(_equal(token.svgOf(tokenId), "<svg id='thought-v2'/>"), "renderer delegation mismatch");
        require(
            _equal(token.tokenURI(tokenId), "Inshell THOUGHT App|Example Model 1"),
            "declaration metadata delegation mismatch"
        );
        require(token.protocolManifestHash() == MANIFEST_HASH, "manifest hash mismatch");
        require(_equal(token.protocolManifestURI(), "ipfs://thought-v2-test-manifest"), "manifest URI mismatch");

        (bytes32 storedSpecId, bytes32 storedSpecHash, string memory name, string memory ref) =
            token.thoughtSpecOf(tokenId);
        require(storedSpecId == specId && storedSpecHash == specHash, "spec pair mismatch");
        require(_equal(name, SPEC_NAME) && _equal(ref, SPEC_REF), "spec metadata mismatch");

        bytes32 tokenUriHash = keccak256(bytes(token.tokenURI(tokenId)));
        VM.prank(USER);
        token.transferFrom(USER, address(0xCAFE), tokenId);
        require(token.ownerOf(tokenId) == address(0xCAFE), "transfer failed");
        require(token.authorOf(tokenId) == USER, "transfer changed author");
        require(keccak256(bytes(token.tokenURI(tokenId))) == tokenUriHash, "transfer changed metadata");
    }

    function testConstructorPinsDependenciesAndRejectsInvalidTargetsAndRelease() public {
        require(token.pathNft() == address(path), "PATH dependency mismatch");
        require(token.thoughtSpecRegistry() == address(specRegistry), "spec registry dependency mismatch");
        require(token.thoughtRenderer() == address(renderer), "renderer dependency mismatch");
        require(token.protocolRegistry() == address(protocolRegistry), "protocol registry dependency mismatch");
        require(token.protocolReleaseId() == releaseId, "release dependency mismatch");
        require(
            token.creationAttestationVerifier() == address(attestationVerifier),
            "attestation verifier dependency mismatch"
        );

        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidPathNft.selector));
        _deployWith(
            address(0),
            address(specRegistry),
            address(renderer),
            address(protocolRegistry),
            releaseId,
            address(attestationVerifier)
        );

        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidThoughtSpecRegistry.selector));
        _deployWith(
            address(path),
            address(0x1234),
            address(renderer),
            address(protocolRegistry),
            releaseId,
            address(attestationVerifier)
        );

        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidThoughtRenderer.selector));
        _deployWith(
            address(path),
            address(specRegistry),
            address(0),
            address(protocolRegistry),
            releaseId,
            address(attestationVerifier)
        );

        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidProtocolRegistry.selector));
        _deployWith(
            address(path),
            address(specRegistry),
            address(renderer),
            address(0x1234),
            releaseId,
            address(attestationVerifier)
        );

        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationVerifier.selector));
        _deployWith(
            address(path), address(specRegistry), address(renderer), address(protocolRegistry), releaseId, address(0)
        );

        WrongCreationAttestationVerifierV2 wrongVerifier = new WrongCreationAttestationVerifierV2();
        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationVerifier.selector));
        _deployWith(
            address(path),
            address(specRegistry),
            address(renderer),
            address(protocolRegistry),
            releaseId,
            address(wrongVerifier)
        );

        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidProtocolRelease.selector, bytes32(0)));
        _deployWith(
            address(path),
            address(specRegistry),
            address(renderer),
            address(protocolRegistry),
            bytes32(0),
            address(attestationVerifier)
        );

        bytes32 missingRelease = keccak256("missing V2 release");
        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidProtocolRelease.selector, missingRelease));
        _deployWith(
            address(path),
            address(specRegistry),
            address(renderer),
            address(protocolRegistry),
            missingRelease,
            address(attestationVerifier)
        );
    }

    function testMarketplaceInterfacesAndNonexistentTokenReadsRevert() public {
        require(_equal(token.name(), "THOUGHT"), "name mismatch");
        require(_equal(token.symbol(), "THOUGHT"), "symbol mismatch");
        require(token.supportsInterface(0x01ffc9a7), "ERC165 unsupported");
        require(token.supportsInterface(0x80ac58cd), "ERC721 unsupported");
        require(token.supportsInterface(0x5b5e139f), "ERC721Metadata unsupported");
        require(!token.supportsInterface(0xffffffff), "invalid interface supported");

        uint256 missing = 404;
        bytes memory nonexistent = abi.encodeWithSignature("ERC721NonexistentToken(uint256)", missing);
        VM.expectRevert(nonexistent);
        token.ownerOf(missing);
        VM.expectRevert(nonexistent);
        token.promptLineOf(missing);
        VM.expectRevert(nonexistent);
        token.agentLineOf(missing);
        VM.expectRevert(nonexistent);
        token.declaredAgentOf(missing);
        VM.expectRevert(nonexistent);
        token.declaredModelOf(missing);
        VM.expectRevert(nonexistent);
        token.provenanceOf(missing);
        VM.expectRevert(nonexistent);
        token.conversationIdentityHashOf(missing);
        VM.expectRevert(nonexistent);
        token.workHashOf(missing);
        VM.expectRevert(nonexistent);
        token.creationAttestationDigestOf(missing);
        VM.expectRevert(nonexistent);
        token.pathIdOf(missing);
        VM.expectRevert(nonexistent);
        token.pathSerialOf(missing);
        VM.expectRevert(nonexistent);
        token.authorOf(missing);
        VM.expectRevert(nonexistent);
        token.mintedAtOf(missing);
        VM.expectRevert(nonexistent);
        token.thoughtSpecOf(missing);
        VM.expectRevert(nonexistent);
        token.svgOf(missing);
        VM.expectRevert(nonexistent);
        token.tokenURI(missing);
    }

    function testUniquenessIsPromptPlusAgentRatherThanAgentOnly() public {
        _mint("Can you hear me?", "Yes, clearly.", 1);
        _mint("Are you still there?", "Yes, clearly.", 2);
        _mint("Can you hear me?", "I am listening.", 3);
        _mint("Yes, clearly.", "Can you hear me?", 4);

        require(token.totalSupply() == 4, "distinct ordered pairs should mint");
        require(path.consumeCallCount() == 4, "unexpected PATH consumption");
    }

    function testDuplicatePairFailsBeforePathConsumption() public {
        string memory prompt = "Can you hear me?";
        string memory agent = "Yes, clearly.";
        uint256 tokenId = _mint(prompt, agent, 1);
        bytes32 identity = token.conversationIdentityHashForLines(prompt, agent);

        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.ConversationAlreadyMinted.selector, identity, tokenId));
        VM.prank(USER);
        token.mint(_input(prompt, agent, 2));

        require(path.consumeCallCount() == 1, "duplicate consumed PATH");
        require(token.totalSupply() == 1, "duplicate changed supply");
    }

    function testInvalidWorkFailsBeforePathConsumptionOrReservation() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("bad_input", "No.", 1);
        VM.expectRevert(
            abi.encodeWithSelector(
                ThoughtV2WorkProfile.InvalidLineByte.selector,
                ThoughtV2WorkProfile.LineKind.Prompt,
                uint256(3),
                uint8(0x5F)
            )
        );
        VM.prank(USER);
        token.mint(input);

        require(path.consumeCallCount() == 0, "invalid work consumed PATH");
        require(token.totalSupply() == 0, "invalid work changed supply");
    }

    function testPathFailureRollsBackSupplyAndPairReservations() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("Do you remember?", "Every byte.", 1);
        bytes32 identity = token.conversationIdentityHashForLines(input.promptLine, input.agentLine);
        bytes32 work = token.workHash(keccak256(bytes(input.promptLine)), keccak256(bytes(input.agentLine)));
        path.setShouldRevert(true);

        VM.expectRevert(abi.encodeWithSignature("Error(string)", "PATH_REVERT"));
        VM.prank(USER);
        token.mint(input);

        require(token.totalSupply() == 0, "failed PATH changed supply");
        require(token.tokenOfConversationIdentityHash(identity) == 0, "failed PATH reserved identity");
        require(token.tokenOfWorkHash(work) == 0, "failed PATH reserved work");
        require(path.consumeCallCount() == 0, "reverted PATH count persisted");
    }

    function testContractKeepsNonemptyProvenanceOpaque() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("Record this?", "Exactly as bytes.", 1);
        input.provenanceJson = "not-json-contract-does-not-parse";
        uint256 tokenId = _mintInput(input);
        require(_equal(token.provenanceOf(tokenId), input.provenanceJson), "opaque provenance changed");

        ThoughtNFTV2.MintThoughtInput memory emptyInput = _input("Another record?", "No empty bytes.", 2);
        emptyInput.provenanceJson = "";
        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.EmptyProvenance.selector));
        VM.prank(USER);
        token.mint(emptyInput);
        require(path.consumeCallCount() == 1, "empty provenance consumed PATH");
    }

    function testInvalidDeclarationsProvenanceAndSpecFailBeforePath() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("Who are you?", "Declared context.", 1);
        input.declaredAgent = "";
        _expectMintRevert(
            input,
            abi.encodeWithSelector(
                ThoughtV2ContextProfile.ContextEmpty.selector, ThoughtV2ContextProfile.ContextKind.DeclaredAgent
            )
        );

        input = _input("Which model?", "The declared one.", 1);
        input.declaredModel = _repeat("M", 65);
        _expectMintRevert(
            input,
            abi.encodeWithSelector(
                ThoughtV2ContextProfile.ContextTooLarge.selector,
                ThoughtV2ContextProfile.ContextKind.DeclaredModel,
                uint256(65),
                uint256(64)
            )
        );

        input = _input("Where is provenance?", "It cannot be empty.", 1);
        input.provenanceJson = "";
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFTV2.EmptyProvenance.selector));

        input = _input("Which spec?", "The registered pair.", 1);
        input.thoughtSpecHash = bytes32(uint256(0xBAD));
        _expectMintRevert(
            input, abi.encodeWithSelector(ThoughtNFTV2.InvalidThoughtSpecPair.selector, specId, bytes32(uint256(0xBAD)))
        );

        require(path.consumeCallCount() == 0, "invalid local input consumed PATH");
        require(token.totalSupply() == 0, "invalid local input changed supply");
    }

    function testMaximumOpaqueProvenanceMintsAndOverflowFailsBeforePath() public {
        ThoughtNFTV2.MintThoughtInput memory maximum = _input("Keep all bytes?", "Exactly to the limit.", 1);
        maximum.provenanceJson = _repeat("p", token.MAX_PROVENANCE_BYTES());
        uint256 tokenId = _mintInput(maximum);
        require(bytes(token.provenanceOf(tokenId)).length == token.MAX_PROVENANCE_BYTES(), "maximum provenance drift");

        ThoughtNFTV2.MintThoughtInput memory overflow = _input("One more byte?", "That must fail.", 2);
        overflow.provenanceJson = _repeat("p", token.MAX_PROVENANCE_BYTES() + 1);
        _expectMintRevert(
            overflow,
            abi.encodeWithSelector(
                ThoughtNFTV2.ProvenanceTooLarge.selector, token.MAX_PROVENANCE_BYTES() + 1, token.MAX_PROVENANCE_BYTES()
            )
        );

        require(path.consumeCallCount() == 1, "overflow provenance consumed PATH");
        require(token.totalSupply() == 1, "overflow provenance changed supply");
    }

    function testEveryPartialOrWrongLengthAttestationProofFailsBeforePath() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("Partial run?", "Reject it.", 1);
        input.creationAttestation.runIdHash = keccak256("partial-run");
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationProof.selector));

        input = _input("Partial deadline?", "Reject it.", 1);
        input.creationAttestation.deadline = uint64(block.timestamp + 1 hours);
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationProof.selector));

        input = _input("Partial epoch?", "Reject it.", 1);
        input.creationAttestation.authorityEpoch = 1;
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationProof.selector));

        input = _input("Partial signature?", "Reject it.", 1);
        input.creationAttestation.signature = new bytes(65);
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationProof.selector));

        input = _completeProofInput("Wrong proof size?", "Reject sixty four.", 64);
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationProof.selector));

        input = _completeProofInput("Wrong proof size?", "Reject sixty six.", 66);
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationProof.selector));

        require(path.consumeCallCount() == 0, "partial proof consumed PATH");
        require(token.totalSupply() == 0, "partial proof changed supply");
    }

    function testInvalidVerifierResultsFailBeforePath() public {
        InvalidResultCreationAttestationVerifierV2 zeroDigestVerifier =
            new InvalidResultCreationAttestationVerifierV2(true);
        ThoughtNFTV2 zeroDigestToken = _deployWith(
            address(path),
            address(specRegistry),
            address(renderer),
            address(protocolRegistry),
            releaseId,
            address(zeroDigestVerifier)
        );
        ThoughtNFTV2.MintThoughtInput memory input = _completeProofInput("Zero digest?", "Reject it.", 65);
        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationResult.selector));
        VM.prank(USER);
        zeroDigestToken.mint(input);

        InvalidResultCreationAttestationVerifierV2 zeroAttestorVerifier =
            new InvalidResultCreationAttestationVerifierV2(false);
        ThoughtNFTV2 zeroAttestorToken = _deployWith(
            address(path),
            address(specRegistry),
            address(renderer),
            address(protocolRegistry),
            releaseId,
            address(zeroAttestorVerifier)
        );
        input = _completeProofInput("Zero attestor?", "Reject it.", 65);
        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidCreationAttestationResult.selector));
        VM.prank(USER);
        zeroAttestorToken.mint(input);

        require(path.consumeCallCount() == 0, "invalid verifier result consumed PATH");
        require(zeroDigestToken.totalSupply() == 0, "zero digest changed supply");
        require(zeroAttestorToken.totalSupply() == 0, "zero attestor changed supply");
    }

    function testReceiverRejectionRollsBackPathSupplyAndPairReservations() public {
        ToggleERC721ReceiverV2 receiver = new ToggleERC721ReceiverV2();
        ThoughtNFTV2.MintThoughtInput memory input = _input("Can you receive this?", "Only with ERC721 consent.", 9);
        bytes32 identity = token.conversationIdentityHashForLines(input.promptLine, input.agentLine);
        bytes32 work = token.workHash(keccak256(bytes(input.promptLine)), keccak256(bytes(input.agentLine)));

        VM.expectRevert(abi.encodeWithSignature("ERC721InvalidReceiver(address)", address(receiver)));
        receiver.mint(token, input);

        require(path.consumeCallCount() == 0, "receiver rejection consumed PATH");
        require(token.totalSupply() == 0, "receiver rejection changed supply");
        require(token.tokenOfConversationIdentityHash(identity) == 0, "receiver rejection reserved identity");
        require(token.tokenOfWorkHash(work) == 0, "receiver rejection reserved work");

        receiver.setAccepts(true);
        uint256 tokenId = receiver.mint(token, input);
        require(tokenId == 1 && token.ownerOf(tokenId) == address(receiver), "retry mint failed");
        require(path.consumeCallCount() == 1, "retry PATH count mismatch");
        require(token.tokenOfConversationIdentityHash(identity) == tokenId, "retry identity missing");
        require(token.tokenOfWorkHash(work) == tokenId, "retry work missing");
    }

    function testMultipleRegisteredThoughtSpecsRemainMintable() public {
        (bytes32 olderSpecId, bytes32 olderSpecHash,) = specRegistry.registerThoughtSpec(
            "THOUGHT.v1.md", "THOUGHT.v1.md", bytes("# THOUGHT.v1.md\n\nVersion: v1\n")
        );
        uint256 currentTokenId = _mint("Current selected spec?", "Use the V2 record.", 1);
        ThoughtNFTV2.MintThoughtInput memory older = _input("Older selected spec?", "It can coexist.", 2);
        older.thoughtSpecId = olderSpecId;
        older.thoughtSpecHash = olderSpecHash;
        uint256 olderTokenId = _mintInput(older);

        (bytes32 currentId, bytes32 currentHash,,) = token.thoughtSpecOf(currentTokenId);
        (bytes32 storedOlderId, bytes32 storedOlderHash,,) = token.thoughtSpecOf(olderTokenId);
        require(currentId == specId && currentHash == specHash, "current spec drift");
        require(storedOlderId == olderSpecId && storedOlderHash == olderSpecHash, "older spec drift");
    }

    function testTerminalEnglishAppliesOnlyToVisibleWorkLines() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("Who declared this?", "The context remains exact.", 1);
        input.declaredAgent = unicode"Inshell 思考 App";
        input.declaredModel = unicode"模型 ألف";
        uint256 tokenId = _mintInput(input);

        require(_equal(token.declaredAgentOf(tokenId), input.declaredAgent), "Unicode Agent declaration drift");
        require(_equal(token.declaredModelOf(tokenId), input.declaredModel), "Unicode model declaration drift");
        require(
            token.declaredAgentHashOf(tokenId) == keccak256(bytes(input.declaredAgent)), "Agent declaration hash drift"
        );
        require(
            token.declaredModelHashOf(tokenId) == keccak256(bytes(input.declaredModel)), "model declaration hash drift"
        );

        (uint256 agentBytes, uint256 modelBytes) = token.validateDeclarations(input.declaredAgent, input.declaredModel);
        require(agentBytes == bytes(input.declaredAgent).length, "Agent declaration byte length drift");
        require(modelBytes == bytes(input.declaredModel).length, "model declaration byte length drift");
    }

    function testOptionalCreationAttestationRemainsBoundToV2WorkHash() public {
        ThoughtNFTV2.MintThoughtInput memory input = _input("Was this official?", "The claim binds it.", 1);
        input.creationAttestation = ThoughtNFTV2.CreationAttestationProof({
            runIdHash: keccak256("run-1"),
            deadline: uint64(block.timestamp + 1 hours),
            authorityEpoch: 1,
            signature: new bytes(65)
        });
        uint256 tokenId = _mintInput(input);

        bytes32 expectedDigest = keccak256(
            abi.encode(
                ICreationAttestationVerifier.Claim({
                    profileId: token.CREATION_ATTESTATION_PROFILE_ID(),
                    thoughtNft: address(token),
                    protocolReleaseId: releaseId,
                    thoughtSpecId: specId,
                    thoughtSpecHash: specHash,
                    workHash: token.workHash(keccak256(bytes(input.promptLine)), keccak256(bytes(input.agentLine))),
                    provenanceHash: keccak256(bytes(input.provenanceJson)),
                    declaredAgentHash: keccak256(bytes(input.declaredAgent)),
                    declaredModelHash: keccak256(bytes(input.declaredModel)),
                    runIdHash: input.creationAttestation.runIdHash,
                    intendedMinter: USER,
                    deadline: input.creationAttestation.deadline,
                    authorityEpoch: input.creationAttestation.authorityEpoch
                })
            )
        );
        require(token.creationAttestationDigestOf(tokenId) == expectedDigest, "attestation claim drift");
    }

    function testConstructorRejectsRendererProfileDrift() public {
        WrongThoughtRendererV2 wrongRenderer = new WrongThoughtRendererV2();
        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidThoughtRenderer.selector));
        _deploy(address(wrongRenderer));

        WrongMetadataProfileRendererV2 wrongMetadata = new WrongMetadataProfileRendererV2();
        VM.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidThoughtRenderer.selector));
        _deploy(address(wrongMetadata));
    }

    function testRuntimeBytecodeRemainsDeployable() public view {
        require(address(token).code.length == 17_088, "update reviewed V2 runtime size");
        require(address(token).code.length < 24_576, "V2 exceeds EIP-170");
    }

    function _deploy(address rendererAddress) private returns (ThoughtNFTV2) {
        return _deployWith(
            address(path),
            address(specRegistry),
            rendererAddress,
            address(protocolRegistry),
            releaseId,
            address(attestationVerifier)
        );
    }

    function _deployWith(
        address pathAddress,
        address specRegistryAddress,
        address rendererAddress,
        address protocolRegistryAddress,
        bytes32 protocolRelease,
        address verifierAddress
    ) private returns (ThoughtNFTV2) {
        return new ThoughtNFTV2(
            pathAddress, specRegistryAddress, rendererAddress, protocolRegistryAddress, protocolRelease, verifierAddress
        );
    }

    function _input(string memory prompt, string memory agent, uint256 pathId)
        private
        view
        returns (ThoughtNFTV2.MintThoughtInput memory)
    {
        return ThoughtNFTV2.MintThoughtInput({
            promptLine: prompt,
            agentLine: agent,
            declaredAgent: "Inshell THOUGHT App",
            declaredModel: "Example Model 1",
            pathId: pathId,
            thoughtSpecId: specId,
            thoughtSpecHash: specHash,
            provenanceJson: "{\"schema\":\"inshell.thought.provenance.v2\"}",
            deadline: block.timestamp + 1 hours,
            pathSignature: "",
            creationAttestation: ThoughtNFTV2.CreationAttestationProof({
                runIdHash: bytes32(0), deadline: 0, authorityEpoch: 0, signature: ""
            })
        });
    }

    function _mint(string memory prompt, string memory agent, uint256 pathId) private returns (uint256) {
        return _mintInput(_input(prompt, agent, pathId));
    }

    function _mintInput(ThoughtNFTV2.MintThoughtInput memory input) private returns (uint256) {
        VM.prank(USER);
        return token.mint(input);
    }

    function _expectMintRevert(ThoughtNFTV2.MintThoughtInput memory input, bytes memory revertData) private {
        VM.expectRevert(revertData);
        VM.prank(USER);
        token.mint(input);
    }

    function _completeProofInput(string memory prompt, string memory agent, uint256 signatureLength)
        private
        view
        returns (ThoughtNFTV2.MintThoughtInput memory input)
    {
        input = _input(prompt, agent, 1);
        input.creationAttestation = ThoughtNFTV2.CreationAttestationProof({
            runIdHash: keccak256(bytes(prompt)),
            deadline: uint64(block.timestamp + 1 hours),
            authorityEpoch: 1,
            signature: new bytes(signatureLength)
        });
    }

    function _repeat(string memory character, uint256 count) private pure returns (string memory) {
        bytes memory unit = bytes(character);
        require(unit.length == 1, "single byte only");
        bytes memory output = new bytes(count);
        for (uint256 i = 0; i < count; i++) {
            output[i] = unit[0];
        }
        return string(output);
    }

    function _contains(bytes memory haystack, uint8 needle) private pure returns (bool) {
        for (uint256 i = 0; i < haystack.length; i++) {
            if (uint8(haystack[i]) == needle) return true;
        }
        return false;
    }

    function _equal(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }
}
