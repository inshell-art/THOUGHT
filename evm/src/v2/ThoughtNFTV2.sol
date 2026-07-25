// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import {ICreationAttestationVerifier} from "../ICreationAttestationVerifier.sol";
import {IThoughtRendererV2} from "./IThoughtRendererV2.sol";
import {ThoughtV2Constants} from "./ThoughtV2Constants.sol";
import {ThoughtV2ContextProfile} from "./ThoughtV2ContextProfile.sol";
import {ThoughtV2Identity} from "./ThoughtV2Identity.sol";
import {ThoughtV2WorkProfile} from "./ThoughtV2WorkProfile.sol";

interface IPathNFTV2 {
    function consumeUnit(uint256 pathId, bytes32 movement, address claimer, uint256 deadline, bytes calldata signature)
        external
        returns (uint32);
}

interface IThoughtSpecRegistryV2 {
    function isRegisteredThoughtSpec(bytes32 specId, bytes32 specHash) external view returns (bool);

    function thoughtSpecMeta(bytes32 specId)
        external
        view
        returns (
            bool exists,
            string memory specName,
            bytes32 specHash,
            string memory ref,
            address pointer,
            uint32 byteLength,
            uint64 registeredAt
        );
}

interface IThoughtProtocolRegistryV2 {
    struct ReleaseRecord {
        bytes32 manifestHash;
        string manifestURI;
        address registrar;
        uint64 registeredAt;
    }

    function isRegistered(bytes32 protocolReleaseId) external view returns (bool);
    function getRelease(bytes32 protocolReleaseId) external view returns (ReleaseRecord memory);
}

contract ThoughtNFTV2 is ERC721 {
    struct CreationAttestationProof {
        bytes32 runIdHash;
        uint64 deadline;
        uint32 authorityEpoch;
        bytes signature;
    }

    struct MintThoughtInput {
        string promptLine;
        string agentLine;
        string declaredAgent;
        string declaredModel;
        uint256 pathId;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        string provenanceJson;
        uint256 deadline;
        bytes pathSignature;
        CreationAttestationProof creationAttestation;
    }

    struct ThoughtRecord {
        string promptLine;
        string agentLine;
        string declaredAgent;
        string declaredModel;
        string provenanceJson;
        bytes32 creationAttestationDigest;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        uint256 pathId;
        uint256 pathSerial;
        address minter;
        uint64 mintedAt;
    }

    error EmptyProvenance();
    error InvalidCreationAttestationProof();
    error InvalidCreationAttestationResult();
    error InvalidCreationAttestationVerifier();
    error InvalidPathNft();
    error InvalidProtocolRegistry();
    error InvalidProtocolRelease(bytes32 protocolReleaseId);
    error InvalidThoughtRenderer();
    error InvalidThoughtSpecPair(bytes32 thoughtSpecId, bytes32 thoughtSpecHash);
    error InvalidThoughtSpecRegistry();
    error ProvenanceTooLarge(uint256 size, uint256 max);
    error ReentrantCall();
    error ConversationAlreadyMinted(bytes32 conversationIdentityHash, uint256 tokenId);
    error WorkAlreadyMinted(bytes32 workHash, uint256 tokenId);

    event PathThoughtConsumed(
        uint256 indexed tokenId, uint256 indexed pathId, uint256 pathSerial, address indexed minter
    );
    event ThoughtMinted(
        uint256 indexed tokenId,
        address indexed minter,
        bytes32 indexed workHash,
        bytes32 promptLineHash,
        bytes32 agentLineHash,
        bytes32 conversationIdentityHash,
        uint256 pathId,
        uint256 pathSerial,
        bytes32 thoughtSpecId,
        bytes32 thoughtSpecHash
    );
    event CreationAttested(
        uint256 indexed tokenId,
        bytes32 indexed digest,
        address indexed attestor,
        bytes32 profileId,
        bytes32 workHash,
        bytes32 runIdHash,
        address minter,
        uint64 deadline,
        uint32 authorityEpoch
    );

    bytes32 public constant THOUGHT_MOVEMENT = bytes32("THOUGHT");
    string public constant WORK_PROFILE_ID = ThoughtV2Constants.WORK_PROFILE_ID;
    bytes32 public constant WORK_PROFILE_ID_HASH = ThoughtV2Constants.WORK_PROFILE_ID_HASH;
    string public constant RENDERER_ID = ThoughtV2Constants.RENDERER_ID;
    bytes32 public constant RENDERER_ID_HASH = ThoughtV2Constants.RENDERER_ID_HASH;
    string public constant CONTEXT_PROFILE_ID = ThoughtV2Constants.CONTEXT_PROFILE_ID;
    bytes32 public constant CONTEXT_PROFILE_ID_HASH = ThoughtV2Constants.CONTEXT_PROFILE_ID_HASH;
    string public constant METADATA_PROFILE_ID = ThoughtV2Constants.METADATA_PROFILE_ID;
    bytes32 public constant METADATA_PROFILE_ID_HASH = ThoughtV2Constants.METADATA_PROFILE_ID_HASH;
    bytes32 public constant CONVERSATION_IDENTITY_DOMAIN = ThoughtV2Constants.CONVERSATION_IDENTITY_DOMAIN;
    bytes32 public constant WORK_DOMAIN = ThoughtV2Constants.WORK_DOMAIN;
    bytes32 public constant CREATION_ATTESTATION_PROFILE_ID =
        ThoughtV2Constants.CREATION_ATTESTATION_PROFILE_ID;

    uint256 public constant MAX_PROMPT_LINE_BYTES = ThoughtV2Constants.MAX_LINE_BYTES;
    uint256 public constant MAX_AGENT_LINE_BYTES = ThoughtV2Constants.MAX_LINE_BYTES;
    uint256 public constant MAX_DECLARED_AGENT_BYTES = ThoughtV2Constants.MAX_CONTEXT_LABEL_BYTES;
    uint256 public constant MAX_DECLARED_MODEL_BYTES = ThoughtV2Constants.MAX_CONTEXT_LABEL_BYTES;
    uint256 public constant MAX_PROVENANCE_BYTES = ThoughtV2Constants.MAX_PROVENANCE_BYTES;

    address public immutable pathNft;
    address public immutable thoughtSpecRegistry;
    address public immutable thoughtRenderer;
    address public immutable creationAttestationVerifier;
    address public immutable protocolRegistry;
    bytes32 public immutable protocolReleaseId;

    uint256 public totalSupply;
    mapping(bytes32 conversationIdentityHash => uint256 tokenId) public tokenOfConversationIdentityHash;
    mapping(bytes32 workHash => uint256 tokenId) public tokenOfWorkHash;

    mapping(uint256 tokenId => ThoughtRecord) private _records;
    bool private transient _mintLocked;

    constructor(
        address pathNft_,
        address thoughtSpecRegistry_,
        address thoughtRenderer_,
        address protocolRegistry_,
        bytes32 protocolReleaseId_,
        address creationAttestationVerifier_
    ) ERC721("THOUGHT", "THOUGHT") {
        if (pathNft_ == address(0) || pathNft_.code.length == 0) revert InvalidPathNft();
        if (thoughtSpecRegistry_ == address(0) || thoughtSpecRegistry_.code.length == 0) {
            revert InvalidThoughtSpecRegistry();
        }
        if (thoughtRenderer_ == address(0) || thoughtRenderer_.code.length == 0) {
            revert InvalidThoughtRenderer();
        }
        if (protocolRegistry_ == address(0) || protocolRegistry_.code.length == 0) {
            revert InvalidProtocolRegistry();
        }
        if (creationAttestationVerifier_ == address(0) || creationAttestationVerifier_.code.length == 0) {
            revert InvalidCreationAttestationVerifier();
        }

        try IThoughtRendererV2(thoughtRenderer_).RENDERER_ID_HASH() returns (bytes32 rendererIdHash) {
            if (rendererIdHash != RENDERER_ID_HASH) revert InvalidThoughtRenderer();
        } catch {
            revert InvalidThoughtRenderer();
        }
        try IThoughtRendererV2(thoughtRenderer_).METADATA_PROFILE_ID_HASH() returns (bytes32 metadataProfileIdHash) {
            if (metadataProfileIdHash != METADATA_PROFILE_ID_HASH) revert InvalidThoughtRenderer();
        } catch {
            revert InvalidThoughtRenderer();
        }
        try ICreationAttestationVerifier(creationAttestationVerifier_).profileId() returns (bytes32 profileId_) {
            if (profileId_ != CREATION_ATTESTATION_PROFILE_ID) revert InvalidCreationAttestationVerifier();
        } catch {
            revert InvalidCreationAttestationVerifier();
        }
        if (
            protocolReleaseId_ == bytes32(0)
                || !IThoughtProtocolRegistryV2(protocolRegistry_).isRegistered(protocolReleaseId_)
        ) {
            revert InvalidProtocolRelease(protocolReleaseId_);
        }

        pathNft = pathNft_;
        thoughtSpecRegistry = thoughtSpecRegistry_;
        thoughtRenderer = thoughtRenderer_;
        protocolRegistry = protocolRegistry_;
        protocolReleaseId = protocolReleaseId_;
        creationAttestationVerifier = creationAttestationVerifier_;
    }

    modifier nonReentrantMint() {
        if (_mintLocked) revert ReentrantCall();
        _mintLocked = true;
        _;
        _mintLocked = false;
    }

    function mint(MintThoughtInput calldata input) external nonReentrantMint returns (uint256 tokenId) {
        ThoughtV2WorkProfile.validate(input.promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        ThoughtV2WorkProfile.validate(input.agentLine, ThoughtV2WorkProfile.LineKind.Agent);
        ThoughtV2ContextProfile.validate(input.declaredAgent, ThoughtV2ContextProfile.ContextKind.DeclaredAgent);
        ThoughtV2ContextProfile.validate(input.declaredModel, ThoughtV2ContextProfile.ContextKind.DeclaredModel);

        bytes memory provenanceBytes = bytes(input.provenanceJson);
        if (provenanceBytes.length == 0) revert EmptyProvenance();
        if (provenanceBytes.length > MAX_PROVENANCE_BYTES) {
            revert ProvenanceTooLarge(provenanceBytes.length, MAX_PROVENANCE_BYTES);
        }
        if (
            input.thoughtSpecId == bytes32(0) || input.thoughtSpecHash == bytes32(0)
                || !IThoughtSpecRegistryV2(thoughtSpecRegistry)
                    .isRegisteredThoughtSpec(input.thoughtSpecId, input.thoughtSpecHash)
        ) {
            revert InvalidThoughtSpecPair(input.thoughtSpecId, input.thoughtSpecHash);
        }

        bytes32 promptLineHash = keccak256(bytes(input.promptLine));
        bytes32 agentLineHash = keccak256(bytes(input.agentLine));
        bytes32 conversationHash = ThoughtV2Identity.conversationIdentityHash(promptLineHash, agentLineHash);
        bytes32 mintedWorkHash = ThoughtV2Identity.workHash(promptLineHash, agentLineHash);

        uint256 existingTokenId = tokenOfConversationIdentityHash[conversationHash];
        if (existingTokenId != 0) revert ConversationAlreadyMinted(conversationHash, existingTokenId);
        existingTokenId = tokenOfWorkHash[mintedWorkHash];
        if (existingTokenId != 0) revert WorkAlreadyMinted(mintedWorkHash, existingTokenId);

        bytes32 provenanceHash = keccak256(provenanceBytes);
        (bytes32 attestationDigest, address attestor) = _verifyCreationAttestation(
            input.creationAttestation,
            input.thoughtSpecId,
            input.thoughtSpecHash,
            mintedWorkHash,
            provenanceHash,
            keccak256(bytes(input.declaredAgent)),
            keccak256(bytes(input.declaredModel))
        );

        uint256 pathSerial = IPathNFTV2(pathNft)
            .consumeUnit(input.pathId, THOUGHT_MOVEMENT, msg.sender, input.deadline, input.pathSignature);

        tokenId = totalSupply + 1;
        totalSupply = tokenId;
        tokenOfConversationIdentityHash[conversationHash] = tokenId;
        tokenOfWorkHash[mintedWorkHash] = tokenId;

        ThoughtRecord storage record = _records[tokenId];
        record.promptLine = input.promptLine;
        record.agentLine = input.agentLine;
        record.declaredAgent = input.declaredAgent;
        record.declaredModel = input.declaredModel;
        record.provenanceJson = input.provenanceJson;
        record.creationAttestationDigest = attestationDigest;
        record.thoughtSpecId = input.thoughtSpecId;
        record.thoughtSpecHash = input.thoughtSpecHash;
        record.pathId = input.pathId;
        record.pathSerial = pathSerial;
        record.minter = msg.sender;
        record.mintedAt = uint64(block.timestamp);

        _safeMint(msg.sender, tokenId);

        emit PathThoughtConsumed(tokenId, input.pathId, pathSerial, msg.sender);
        emit ThoughtMinted(
            tokenId,
            msg.sender,
            mintedWorkHash,
            promptLineHash,
            agentLineHash,
            conversationHash,
            input.pathId,
            pathSerial,
            input.thoughtSpecId,
            input.thoughtSpecHash
        );
        if (attestationDigest != bytes32(0)) {
            emit CreationAttested(
                tokenId,
                attestationDigest,
                attestor,
                CREATION_ATTESTATION_PROFILE_ID,
                mintedWorkHash,
                input.creationAttestation.runIdHash,
                msg.sender,
                input.creationAttestation.deadline,
                input.creationAttestation.authorityEpoch
            );
        }
    }

    function validateWorkLines(string calldata promptLine, string calldata agentLine)
        external
        pure
        returns (uint256 promptBytes, uint256 agentBytes)
    {
        promptBytes = ThoughtV2WorkProfile.validate(promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        agentBytes = ThoughtV2WorkProfile.validate(agentLine, ThoughtV2WorkProfile.LineKind.Agent);
    }

    function isAllowedWorkByte(uint8 character) external pure returns (bool) {
        return ThoughtV2WorkProfile.isAllowedByte(character);
    }

    function validateDeclarations(string calldata declaredAgent, string calldata declaredModel)
        external
        pure
        returns (uint256 declaredAgentBytes, uint256 declaredModelBytes)
    {
        declaredAgentBytes =
            ThoughtV2ContextProfile.validate(declaredAgent, ThoughtV2ContextProfile.ContextKind.DeclaredAgent);
        declaredModelBytes =
            ThoughtV2ContextProfile.validate(declaredModel, ThoughtV2ContextProfile.ContextKind.DeclaredModel);
    }

    function conversationIdentityHash(bytes32 promptLineHash, bytes32 agentLineHash)
        public
        pure
        returns (bytes32)
    {
        return ThoughtV2Identity.conversationIdentityHash(promptLineHash, agentLineHash);
    }

    function conversationIdentityHashForLines(string calldata promptLine, string calldata agentLine)
        public
        pure
        returns (bytes32)
    {
        ThoughtV2WorkProfile.validate(promptLine, ThoughtV2WorkProfile.LineKind.Prompt);
        ThoughtV2WorkProfile.validate(agentLine, ThoughtV2WorkProfile.LineKind.Agent);
        return ThoughtV2Identity.conversationIdentityHash(
            keccak256(bytes(promptLine)), keccak256(bytes(agentLine))
        );
    }

    function tokenOfConversation(string calldata promptLine, string calldata agentLine)
        external
        view
        returns (uint256 tokenId)
    {
        return tokenOfConversationIdentityHash[conversationIdentityHashForLines(promptLine, agentLine)];
    }

    function workHash(bytes32 promptLineHash, bytes32 agentLineHash) public pure returns (bytes32) {
        return ThoughtV2Identity.workHash(promptLineHash, agentLineHash);
    }

    function promptLineOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _records[tokenId].promptLine;
    }

    function agentLineOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _records[tokenId].agentLine;
    }

    function declaredAgentOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _records[tokenId].declaredAgent;
    }

    function declaredModelOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _records[tokenId].declaredModel;
    }

    function declaredAgentHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return keccak256(bytes(_records[tokenId].declaredAgent));
    }

    function declaredModelHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return keccak256(bytes(_records[tokenId].declaredModel));
    }

    function provenanceOf(uint256 tokenId) external view returns (string memory) {
        _requireOwned(tokenId);
        return _records[tokenId].provenanceJson;
    }

    function promptLineHashOf(uint256 tokenId) public view returns (bytes32) {
        _requireOwned(tokenId);
        return keccak256(bytes(_records[tokenId].promptLine));
    }

    function agentLineHashOf(uint256 tokenId) public view returns (bytes32) {
        _requireOwned(tokenId);
        return keccak256(bytes(_records[tokenId].agentLine));
    }

    function conversationIdentityHashOf(uint256 tokenId) public view returns (bytes32) {
        return ThoughtV2Identity.conversationIdentityHash(promptLineHashOf(tokenId), agentLineHashOf(tokenId));
    }

    function workHashOf(uint256 tokenId) public view returns (bytes32) {
        return ThoughtV2Identity.workHash(promptLineHashOf(tokenId), agentLineHashOf(tokenId));
    }

    function provenanceHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return keccak256(bytes(_records[tokenId].provenanceJson));
    }

    function creationAttestationDigestOf(uint256 tokenId) external view returns (bytes32) {
        _requireOwned(tokenId);
        return _records[tokenId].creationAttestationDigest;
    }

    function pathIdOf(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _records[tokenId].pathId;
    }

    function pathSerialOf(uint256 tokenId) external view returns (uint256) {
        _requireOwned(tokenId);
        return _records[tokenId].pathSerial;
    }

    function authorOf(uint256 tokenId) external view returns (address) {
        _requireOwned(tokenId);
        return _records[tokenId].minter;
    }

    function mintedAtOf(uint256 tokenId) external view returns (uint64) {
        _requireOwned(tokenId);
        return _records[tokenId].mintedAt;
    }

    function thoughtSpecOf(uint256 tokenId)
        external
        view
        returns (bytes32 specId, bytes32 specHash, string memory specName, string memory ref)
    {
        _requireOwned(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        specId = record.thoughtSpecId;
        specHash = record.thoughtSpecHash;
        (bool exists, string memory specName_, bytes32 registeredHash, string memory ref_,,,) =
            IThoughtSpecRegistryV2(thoughtSpecRegistry).thoughtSpecMeta(specId);
        if (exists && registeredHash == specHash) {
            specName = specName_;
            ref = ref_;
        }
    }

    function protocolManifestHash() public view returns (bytes32) {
        return IThoughtProtocolRegistryV2(protocolRegistry).getRelease(protocolReleaseId).manifestHash;
    }

    function protocolManifestURI() external view returns (string memory) {
        return IThoughtProtocolRegistryV2(protocolRegistry).getRelease(protocolReleaseId).manifestURI;
    }

    function svgOf(uint256 tokenId) public view returns (string memory) {
        _requireOwned(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        return IThoughtRendererV2(thoughtRenderer).render(record.promptLine, record.agentLine);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        IThoughtRendererV2.TokenData memory data = IThoughtRendererV2.TokenData({
            tokenId: tokenId,
            promptLine: record.promptLine,
            agentLine: record.agentLine,
            declaredAgent: record.declaredAgent,
            declaredModel: record.declaredModel,
            provenanceJson: record.provenanceJson,
            thoughtSpecId: record.thoughtSpecId,
            thoughtSpecHash: record.thoughtSpecHash,
            pathId: record.pathId,
            pathSerial: record.pathSerial,
            minter: record.minter,
            mintedAt: record.mintedAt,
            creationAttestationDigest: record.creationAttestationDigest,
            protocolReleaseId: protocolReleaseId,
            manifestKeccak256: protocolManifestHash(),
            creationAttestationVerifier: creationAttestationVerifier
        });
        return IThoughtRendererV2(thoughtRenderer).tokenURI(data);
    }

    function _verifyCreationAttestation(
        CreationAttestationProof calldata proof,
        bytes32 thoughtSpecId,
        bytes32 thoughtSpecHash,
        bytes32 mintedWorkHash,
        bytes32 provenanceHash,
        bytes32 declaredAgentHash,
        bytes32 declaredModelHash
    ) private view returns (bytes32 digest, address attestor) {
        if (
            proof.runIdHash == bytes32(0) && proof.deadline == 0 && proof.authorityEpoch == 0
                && proof.signature.length == 0
        ) {
            return (bytes32(0), address(0));
        }
        if (
            proof.runIdHash == bytes32(0) || proof.deadline == 0 || proof.authorityEpoch == 0
                || proof.signature.length != 65
        ) {
            revert InvalidCreationAttestationProof();
        }

        ICreationAttestationVerifier.Claim memory claim = ICreationAttestationVerifier.Claim({
            profileId: CREATION_ATTESTATION_PROFILE_ID,
            thoughtNft: address(this),
            protocolReleaseId: protocolReleaseId,
            thoughtSpecId: thoughtSpecId,
            thoughtSpecHash: thoughtSpecHash,
            workHash: mintedWorkHash,
            provenanceHash: provenanceHash,
            declaredAgentHash: declaredAgentHash,
            declaredModelHash: declaredModelHash,
            runIdHash: proof.runIdHash,
            intendedMinter: msg.sender,
            deadline: proof.deadline,
            authorityEpoch: proof.authorityEpoch
        });
        (digest, attestor) = ICreationAttestationVerifier(creationAttestationVerifier).verify(claim, proof.signature);
        if (digest == bytes32(0) || attestor == address(0)) revert InvalidCreationAttestationResult();
    }
}
