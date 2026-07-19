// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ICreationAttestationVerifier} from "./ICreationAttestationVerifier.sol";
import {IThoughtRenderer} from "./IThoughtRenderer.sol";
import {ThoughtReleaseConstants} from "./ThoughtReleaseConstants.sol";

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

interface IPathNFT {
    function consumeUnit(uint256 pathId, bytes32 movement, address claimer, uint256 deadline, bytes calldata signature)
        external
        returns (uint256);
}

interface IThoughtSpecRegistry {
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

interface IThoughtProtocolRegistry {
    struct ReleaseRecord {
        bytes32 manifestHash;
        string manifestURI;
        address registrar;
        uint64 registeredAt;
    }

    function isRegistered(bytes32 protocolReleaseId) external view returns (bool);
    function getRelease(bytes32 protocolReleaseId) external view returns (ReleaseRecord memory);
}

contract ThoughtNFT {
    enum DisplayKind {
        Prompt,
        Agent,
        DeclaredAgent,
        Model
    }

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

    error ApprovalCallerNotOwnerNorApproved();
    error ApprovalToCurrentOwner();
    error BalanceQueryForZeroAddress();
    error DisplayLineEmpty(DisplayKind kind);
    error DisplayLineTooLarge(DisplayKind kind, uint256 actual, uint256 max);
    error EmptyProvenance();
    error InvalidDisplayCharacter(DisplayKind kind, uint256 codepoint);
    error InvalidDisplaySpacing(DisplayKind kind);
    error InvalidPathNft();
    error InvalidReceiver();
    error InvalidSender();
    error InvalidThoughtSpecPair(bytes32 thoughtSpecId, bytes32 thoughtSpecHash);
    error InvalidThoughtSpecRegistry();
    error InvalidThoughtRenderer();
    error InvalidCreationAttestationProof();
    error InvalidCreationAttestationResult();
    error InvalidCreationAttestationVerifier();
    error InvalidProtocolRegistry();
    error InvalidProtocolRelease(bytes32 protocolReleaseId);
    error InvalidUtf8(DisplayKind kind);
    error NonexistentToken();
    error NotAuthorized();
    error ProvenanceTooLarge(uint256 size, uint256 max);
    error ReentrantCall();
    error TransferToNonReceiverImplementer();
    error TransferToZeroAddress();
    error AgentLineAlreadyMinted(bytes32 agentIdentityHash, uint256 tokenId);
    error WorkAlreadyMinted(bytes32 workHash, uint256 tokenId);

    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event PathThoughtConsumed(
        uint256 indexed tokenId, uint256 indexed pathId, uint256 pathSerial, address indexed minter
    );
    event ThoughtMinted(
        uint256 indexed tokenId,
        address indexed minter,
        bytes32 indexed workHash,
        bytes32 promptLineHash,
        bytes32 agentLineHash,
        bytes32 agentIdentityHash,
        bytes32 binaryFieldKeccak256,
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
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    string public constant name = "THOUGHT";
    string public constant symbol = "THOUGHT";

    bytes32 public constant THOUGHT_MOVEMENT = bytes32("THOUGHT");
    string public constant RENDERER_ID = ThoughtReleaseConstants.RENDERER_ID;
    string public constant WORK_PROFILE_ID = ThoughtReleaseConstants.WORK_PROFILE_ID;
    bytes32 public constant AGENT_IDENTITY_DOMAIN = keccak256("INSHELL_THOUGHT_V2_AGENT_IDENTITY");
    bytes32 public constant WORK_DOMAIN = keccak256("INSHELL_THOUGHT_V2_WORK");
    bytes32 public constant RENDERER_ID_HASH = ThoughtReleaseConstants.RENDERER_ID_HASH;
    bytes32 public constant RENDERER_PROFILE_KECCAK256 = ThoughtReleaseConstants.RENDERER_PROFILE_KECCAK256;
    bytes32 public constant WORK_PROFILE_KECCAK256 = ThoughtReleaseConstants.WORK_PROFILE_KECCAK256;
    bytes32 public constant CREATION_ATTESTATION_PROFILE_ID = ThoughtReleaseConstants.CREATION_ATTESTATION_PROFILE_ID;

    uint256 public constant MAX_PROMPT_LINE_BYTES = 64;
    uint256 public constant MAX_AGENT_LINE_BYTES = 64;
    uint256 public constant MAX_DECLARED_AGENT_BYTES = 64;
    uint256 public constant MAX_DECLARED_MODEL_BYTES = 64;
    uint256 public constant MAX_PROVENANCE_BYTES = 20_000;
    uint256 public constant BINARY_FIELD_BITS = 1024;
    uint256 public constant BINARY_FIELD_BYTES = 128;

    address public immutable pathNft;
    address public immutable thoughtSpecRegistry;
    address public immutable thoughtRenderer;
    address public immutable creationAttestationVerifier;
    address public immutable protocolRegistry;
    bytes32 public immutable protocolReleaseId;
    uint256 public totalSupply;
    mapping(bytes32 => uint256) public tokenOfWorkHash;
    mapping(bytes32 => uint256) public tokenOfAgentIdentityHash;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => ThoughtRecord) private _records;
    bool private transient _mintLocked;

    constructor(
        address pathNft_,
        address thoughtSpecRegistry_,
        address thoughtRenderer_,
        address protocolRegistry_,
        bytes32 protocolReleaseId_,
        address creationAttestationVerifier_
    ) {
        if (pathNft_ == address(0) || pathNft_.code.length == 0) {
            revert InvalidPathNft();
        }
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
        try IThoughtRenderer(thoughtRenderer_).RENDERER_ID_HASH() returns (bytes32 rendererIdHash) {
            if (rendererIdHash != RENDERER_ID_HASH) revert InvalidThoughtRenderer();
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
                || !IThoughtProtocolRegistry(protocolRegistry_).isRegistered(protocolReleaseId_)
        ) {
            revert InvalidProtocolRelease(protocolReleaseId_);
        }

        pathNft = pathNft_;
        thoughtSpecRegistry = thoughtSpecRegistry_;
        thoughtRenderer = thoughtRenderer_;
        creationAttestationVerifier = creationAttestationVerifier_;
        protocolRegistry = protocolRegistry_;
        protocolReleaseId = protocolReleaseId_;
    }

    modifier nonReentrant() {
        if (_mintLocked) {
            revert ReentrantCall();
        }
        _mintLocked = true;
        _;
        _mintLocked = false;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    function balanceOf(address account) external view returns (uint256) {
        if (account == address(0)) {
            revert BalanceQueryForZeroAddress();
        }
        return _balanceOf[account];
    }

    function ownerOf(uint256 tokenId) public view returns (address) {
        address tokenOwner = _ownerOf[tokenId];
        if (tokenOwner == address(0)) {
            revert NonexistentToken();
        }
        return tokenOwner;
    }

    function approve(address approved, uint256 tokenId) external {
        address tokenOwner = ownerOf(tokenId);
        if (approved == tokenOwner) {
            revert ApprovalToCurrentOwner();
        }
        if (msg.sender != tokenOwner && !isApprovedForAll[tokenOwner][msg.sender]) {
            revert ApprovalCallerNotOwnerNorApproved();
        }
        getApproved[tokenId] = approved;
        emit Approval(tokenOwner, approved, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function transferFrom(address from, address to, uint256 tokenId) public {
        _transfer(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        safeTransferFrom(from, to, tokenId, "");
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data) public {
        _transfer(from, to, tokenId);
        if (!_checkOnERC721Received(from, to, tokenId, data)) {
            revert TransferToNonReceiverImplementer();
        }
    }

    function mint(MintThoughtInput calldata input) external nonReentrant returns (uint256 tokenId) {
        _validateDisplayLine(input.promptLine, DisplayKind.Prompt);
        _validateDisplayLine(input.agentLine, DisplayKind.Agent);
        _validateDisplayLine(input.declaredAgent, DisplayKind.DeclaredAgent);
        _validateDisplayLine(input.declaredModel, DisplayKind.Model);
        bytes memory provenanceBytes = bytes(input.provenanceJson);
        if (provenanceBytes.length == 0) {
            revert EmptyProvenance();
        }
        if (provenanceBytes.length > MAX_PROVENANCE_BYTES) {
            revert ProvenanceTooLarge(provenanceBytes.length, MAX_PROVENANCE_BYTES);
        }
        if (
            input.thoughtSpecId == bytes32(0) || input.thoughtSpecHash == bytes32(0)
                || !IThoughtSpecRegistry(thoughtSpecRegistry)
                    .isRegisteredThoughtSpec(input.thoughtSpecId, input.thoughtSpecHash)
        ) {
            revert InvalidThoughtSpecPair(input.thoughtSpecId, input.thoughtSpecHash);
        }

        bytes32 promptLineHash = keccak256(bytes(input.promptLine));
        bytes32 agentLineHash = keccak256(bytes(input.agentLine));
        bytes memory packedField = _packedBinaryField(bytes(input.promptLine), bytes(input.agentLine));
        bytes32 binaryFieldHash = keccak256(packedField);
        bytes32 derivedAgentIdentityHash = _agentIdentityHash(agentLineHash);
        bytes32 mintedWorkHash = _workHash(promptLineHash, agentLineHash, binaryFieldHash);
        bytes32 provenanceHash = keccak256(provenanceBytes);
        uint256 existingTokenId = tokenOfAgentIdentityHash[derivedAgentIdentityHash];
        if (existingTokenId != 0) {
            revert AgentLineAlreadyMinted(derivedAgentIdentityHash, existingTokenId);
        }
        existingTokenId = tokenOfWorkHash[mintedWorkHash];
        if (existingTokenId != 0) {
            revert WorkAlreadyMinted(mintedWorkHash, existingTokenId);
        }

        (bytes32 attestationDigest, address attestor) = _verifyCreationAttestation(
            input.creationAttestation,
            input.thoughtSpecId,
            input.thoughtSpecHash,
            mintedWorkHash,
            provenanceHash,
            keccak256(bytes(input.declaredAgent)),
            keccak256(bytes(input.declaredModel))
        );

        uint256 pathSerial = IPathNFT(pathNft)
            .consumeUnit(input.pathId, THOUGHT_MOVEMENT, msg.sender, input.deadline, input.pathSignature);

        uint64 mintedAt = uint64(block.timestamp);
        tokenId = totalSupply + 1;
        totalSupply = tokenId;
        tokenOfAgentIdentityHash[derivedAgentIdentityHash] = tokenId;
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
        record.mintedAt = mintedAt;
        _mint(msg.sender, tokenId);
        if (!_checkOnERC721Received(address(0), msg.sender, tokenId, "")) {
            revert TransferToNonReceiverImplementer();
        }
        emit PathThoughtConsumed(tokenId, input.pathId, pathSerial, msg.sender);
        emit ThoughtMinted(
            tokenId,
            msg.sender,
            mintedWorkHash,
            promptLineHash,
            agentLineHash,
            derivedAgentIdentityHash,
            binaryFieldHash,
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

    function agentIdentityHash(bytes32 agentLineHash) external pure returns (bytes32) {
        return _agentIdentityHash(agentLineHash);
    }

    function workHash(bytes32 promptLineHash, bytes32 agentLineHash, bytes32 binaryFieldHash)
        external
        pure
        returns (bytes32)
    {
        return _workHash(promptLineHash, agentLineHash, binaryFieldHash);
    }

    function tokenOfAgentLineHash(bytes32 agentLineHash) external view returns (uint256 tokenId) {
        return tokenOfAgentIdentityHash[_agentIdentityHash(agentLineHash)];
    }

    function binaryField(string calldata promptLine, string calldata agentLine) external pure returns (bytes memory) {
        _validateDisplayLine(promptLine, DisplayKind.Prompt);
        _validateDisplayLine(agentLine, DisplayKind.Agent);
        return _packedBinaryField(bytes(promptLine), bytes(agentLine));
    }

    function binaryFieldOf(uint256 tokenId) external view returns (bytes memory) {
        _requireMinted(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        return _packedBinaryField(bytes(record.promptLine), bytes(record.agentLine));
    }

    function promptLineOf(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _records[tokenId].promptLine;
    }

    function agentLineOf(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _records[tokenId].agentLine;
    }

    function declaredAgentOf(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _records[tokenId].declaredAgent;
    }

    function declaredModelOf(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _records[tokenId].declaredModel;
    }

    function provenanceOf(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _records[tokenId].provenanceJson;
    }

    function promptLineHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return keccak256(bytes(_records[tokenId].promptLine));
    }

    function agentLineHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return keccak256(bytes(_records[tokenId].agentLine));
    }

    function agentIdentityHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return _agentIdentityHash(keccak256(bytes(_records[tokenId].agentLine)));
    }

    function binaryFieldKeccak256Of(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        return keccak256(_packedBinaryField(bytes(record.promptLine), bytes(record.agentLine)));
    }

    function workHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        bytes32 promptLineHash = keccak256(bytes(record.promptLine));
        bytes32 agentLineHash = keccak256(bytes(record.agentLine));
        bytes32 binaryFieldHash = keccak256(_packedBinaryField(bytes(record.promptLine), bytes(record.agentLine)));
        return _workHash(promptLineHash, agentLineHash, binaryFieldHash);
    }

    function provenanceHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return keccak256(bytes(_records[tokenId].provenanceJson));
    }

    function creationAttestationDigestOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return _records[tokenId].creationAttestationDigest;
    }

    function pathIdOf(uint256 tokenId) external view returns (uint256) {
        _requireMinted(tokenId);
        return _records[tokenId].pathId;
    }

    function pathSerialOf(uint256 tokenId) external view returns (uint256) {
        _requireMinted(tokenId);
        return _records[tokenId].pathSerial;
    }

    function authorOf(uint256 tokenId) external view returns (address) {
        _requireMinted(tokenId);
        return _records[tokenId].minter;
    }

    function mintedAtOf(uint256 tokenId) external view returns (uint64) {
        _requireMinted(tokenId);
        return _records[tokenId].mintedAt;
    }

    function thoughtSpecOf(uint256 tokenId)
        external
        view
        returns (bytes32 specId, bytes32 specHash, string memory specName, string memory ref)
    {
        _requireMinted(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        specId = record.thoughtSpecId;
        specHash = record.thoughtSpecHash;
        (bool exists, string memory specName_, bytes32 registeredHash, string memory ref_,,,) =
            IThoughtSpecRegistry(thoughtSpecRegistry).thoughtSpecMeta(specId);
        if (exists && registeredHash == specHash) {
            specName = specName_;
            ref = ref_;
        }
    }

    function protocolManifestHash() public view returns (bytes32) {
        return IThoughtProtocolRegistry(protocolRegistry).getRelease(protocolReleaseId).manifestHash;
    }

    function protocolManifestURI() external view returns (string memory) {
        return IThoughtProtocolRegistry(protocolRegistry).getRelease(protocolReleaseId).manifestURI;
    }

    function svgOf(uint256 tokenId) public view returns (string memory) {
        _requireMinted(tokenId);
        return _renderSvg(_records[tokenId]);
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        _requireMinted(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        bytes memory packedField = _packedBinaryField(bytes(record.promptLine), bytes(record.agentLine));
        uint256 promptDisplayUnits = _validateDisplayLine(record.promptLine, DisplayKind.Prompt);
        uint256 agentDisplayUnits = _validateDisplayLine(record.agentLine, DisplayKind.Agent);
        IThoughtRenderer.TokenData memory data = IThoughtRenderer.TokenData({
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
        return IThoughtRenderer(thoughtRenderer).tokenURI(data, packedField, promptDisplayUnits, agentDisplayUnits);
    }

    function _renderSvg(ThoughtRecord storage record) private view returns (string memory) {
        uint256 promptDisplayUnits = _validateDisplayLine(record.promptLine, DisplayKind.Prompt);
        uint256 agentDisplayUnits = _validateDisplayLine(record.agentLine, DisplayKind.Agent);
        bytes memory packedField = _packedBinaryField(bytes(record.promptLine), bytes(record.agentLine));
        return IThoughtRenderer(thoughtRenderer)
            .render(record.promptLine, record.agentLine, packedField, promptDisplayUnits, agentDisplayUnits);
    }

    function _packedBinaryField(bytes memory promptData, bytes memory agentData)
        private
        pure
        returns (bytes memory output)
    {
        require(promptData.length > 0 && agentData.length > 0, "empty binary source");
        output = new bytes(BINARY_FIELD_BYTES);
        assembly ("memory-safe") {
            function sourceByte(source, length, index) -> value {
                value := byte(0, mload(add(source, mod(index, length))))
            }

            function spreadHigh(nibble) -> value {
                value := or(
                    or(shl(4, and(nibble, 8)), shl(3, and(nibble, 4))),
                    or(shl(2, and(nibble, 2)), shl(1, and(nibble, 1)))
                )
            }

            function spreadLow(nibble) -> value {
                value := or(
                    or(shl(3, and(nibble, 8)), shl(2, and(nibble, 4))),
                    or(shl(1, and(nibble, 2)), and(nibble, 1))
                )
            }

            let promptLength := mload(promptData)
            let agentLength := mload(agentData)
            let promptSource := add(promptData, 32)
            let agentSource := add(agentData, 32)
            let outputTarget := add(output, 32)

            for { let row := 0 } lt(row, 32) { row := add(row, 1) } {
                let agentBitOffset := shr(1, row)
                let agentByteLane := shr(3, agentBitOffset)
                let agentMask := shr(and(agentBitOffset, 7), 0x80)
                let firstAgentColumn := iszero(and(row, 1))

                for { let group := 0 } lt(group, 4) { group := add(group, 1) } {
                    let promptByteOffset := add(mul(row, 2), shr(1, group))
                    let promptByte := sourceByte(promptSource, promptLength, promptByteOffset)
                    let promptNibble := and(promptByte, 0x0f)
                    if iszero(and(group, 1)) { promptNibble := shr(4, promptByte) }

                    let firstColumn := add(firstAgentColumn, mul(group, 8))
                    let firstAgentByte := add(mul(firstColumn, 2), agentByteLane)
                    let agentNibble := 0
                    if and(sourceByte(agentSource, agentLength, firstAgentByte), agentMask) {
                        agentNibble := or(agentNibble, 8)
                    }
                    if and(sourceByte(agentSource, agentLength, add(firstAgentByte, 4)), agentMask) {
                        agentNibble := or(agentNibble, 4)
                    }
                    if and(sourceByte(agentSource, agentLength, add(firstAgentByte, 8)), agentMask) {
                        agentNibble := or(agentNibble, 2)
                    }
                    if and(sourceByte(agentSource, agentLength, add(firstAgentByte, 12)), agentMask) {
                        agentNibble := or(agentNibble, 1)
                    }

                    let packedByte := or(spreadHigh(promptNibble), spreadLow(agentNibble))
                    if and(row, 1) { packedByte := or(spreadHigh(agentNibble), spreadLow(promptNibble)) }
                    mstore8(add(outputTarget, add(mul(row, 4), group)), packedByte)
                }
            }
        }
    }

    function _validateDisplayLine(string memory value, DisplayKind kind) private pure returns (uint256 displayUnits) {
        bytes memory data = bytes(value);
        if (data.length == 0) {
            revert DisplayLineEmpty(kind);
        }
        if (data.length > 64) {
            revert DisplayLineTooLarge(kind, data.length, 64);
        }

        (bool allAscii, uint256 asciiUnits, uint256 asciiError, uint256 invalidAscii) = _scanAscii(data);
        if (allAscii) {
            if (asciiError == 1) revert InvalidDisplaySpacing(kind);
            if (asciiError == 2) revert InvalidDisplayCharacter(kind, invalidAscii);
            return asciiUnits;
        }

        uint256 i = 0;
        while (i < data.length) {
            uint8 firstByte = uint8(data[i]);
            if (firstByte < 0x80) {
                if (firstByte == 0x20) {
                    if (i == 0 || i + 1 == data.length) {
                        revert InvalidDisplaySpacing(kind);
                    }
                    displayUnits += 4;
                } else {
                    if (firstByte < 0x21 || firstByte == 0x7F) {
                        revert InvalidDisplayCharacter(kind, firstByte);
                    }
                    displayUnits += 6;
                }
                unchecked {
                    i++;
                }
                continue;
            }

            (uint256 codepoint, uint256 next) = _decodeUtf8(data, i, kind);
            _validateCodepoint(codepoint, kind);
            displayUnits += _displayUnits(codepoint);
            i = next;
        }
    }

    function _scanAscii(bytes memory data)
        private
        pure
        returns (bool allAscii, uint256 displayUnits, uint256 errorKind, uint256 invalidCharacter)
    {
        assembly ("memory-safe") {
            allAscii := 1
            let length := mload(data)
            let source := add(data, 32)
            for { let i := 0 } lt(i, length) { i := add(i, 1) } {
                let character := byte(0, mload(add(source, i)))
                if iszero(lt(character, 0x80)) {
                    allAscii := 0
                    break
                }
                switch character
                case 0x20 {
                    if or(iszero(i), eq(add(i, 1), length)) {
                        errorKind := 1
                        break
                    }
                    displayUnits := add(displayUnits, 4)
                }
                default {
                    if or(lt(character, 0x21), eq(character, 0x7f)) {
                        errorKind := 2
                        invalidCharacter := character
                        break
                    }
                    displayUnits := add(displayUnits, 6)
                }
            }
        }
    }

    function _decodeUtf8(bytes memory data, uint256 i, DisplayKind kind)
        private
        pure
        returns (uint256 codepoint, uint256 next)
    {
        uint8 b0 = uint8(data[i]);
        if (b0 < 0x80) {
            return (b0, i + 1);
        }

        if (b0 >= 0xC2 && b0 <= 0xDF) {
            if (i + 1 >= data.length || !_isContinuation(data[i + 1])) {
                revert InvalidUtf8(kind);
            }
            return (((uint256(b0) & 0x1F) << 6) | (uint256(uint8(data[i + 1])) & 0x3F), i + 2);
        }

        if (b0 >= 0xE0 && b0 <= 0xEF) {
            if (i + 2 >= data.length || !_isContinuation(data[i + 1]) || !_isContinuation(data[i + 2])) {
                revert InvalidUtf8(kind);
            }
            uint8 b1 = uint8(data[i + 1]);
            if ((b0 == 0xE0 && b1 < 0xA0) || (b0 == 0xED && b1 > 0x9F)) {
                revert InvalidUtf8(kind);
            }
            codepoint =
                ((uint256(b0) & 0x0F) << 12) | ((uint256(b1) & 0x3F) << 6) | (uint256(uint8(data[i + 2])) & 0x3F);
            return (codepoint, i + 3);
        }

        if (b0 >= 0xF0 && b0 <= 0xF4) {
            if (
                i + 3 >= data.length || !_isContinuation(data[i + 1]) || !_isContinuation(data[i + 2])
                    || !_isContinuation(data[i + 3])
            ) {
                revert InvalidUtf8(kind);
            }
            uint8 b1 = uint8(data[i + 1]);
            if ((b0 == 0xF0 && b1 < 0x90) || (b0 == 0xF4 && b1 > 0x8F)) {
                revert InvalidUtf8(kind);
            }
            codepoint = ((uint256(b0) & 0x07) << 18) | ((uint256(b1) & 0x3F) << 12)
                | ((uint256(uint8(data[i + 2])) & 0x3F) << 6) | (uint256(uint8(data[i + 3])) & 0x3F);
            return (codepoint, i + 4);
        }

        revert InvalidUtf8(kind);
    }

    function _isContinuation(bytes1 value) private pure returns (bool) {
        uint8 byteValue = uint8(value);
        return byteValue >= 0x80 && byteValue <= 0xBF;
    }

    function _validateCodepoint(uint256 codepoint, DisplayKind kind) private pure {
        if (codepoint <= 0x1F || codepoint == 0x7F || (codepoint >= 0x80 && codepoint <= 0x9F)) {
            revert InvalidDisplayCharacter(kind, codepoint);
        }
        if (
            !_isXmlCharacter(codepoint) || _isRejectedWhitespace(codepoint) || _isDefaultIgnorable(codepoint)
                || _isNoncharacter(codepoint)
        ) {
            revert InvalidDisplayCharacter(kind, codepoint);
        }
    }

    function _isXmlCharacter(uint256 codepoint) private pure returns (bool) {
        return codepoint == 0x09 || codepoint == 0x0A || codepoint == 0x0D || (codepoint >= 0x20 && codepoint <= 0xD7FF)
            || (codepoint >= 0xE000 && codepoint <= 0xFFFD) || (codepoint >= 0x10000 && codepoint <= 0x10FFFF);
    }

    function _isRejectedWhitespace(uint256 codepoint) private pure returns (bool) {
        return (codepoint >= 0x09 && codepoint <= 0x0D) || codepoint == 0x85 || codepoint == 0xA0 || codepoint == 0x1680
            || (codepoint >= 0x2000 && codepoint <= 0x200A) || codepoint == 0x2028 || codepoint == 0x2029
            || codepoint == 0x202F || codepoint == 0x205F || codepoint == 0x3000;
    }

    function _isDefaultIgnorable(uint256 codepoint) private pure returns (bool) {
        return codepoint == 0xAD || codepoint == 0x34F || codepoint == 0x61C
            || (codepoint >= 0x115F && codepoint <= 0x1160) || (codepoint >= 0x17B4 && codepoint <= 0x17B5)
            || (codepoint >= 0x180B && codepoint <= 0x180F) || (codepoint >= 0x200B && codepoint <= 0x200F)
            || (codepoint >= 0x202A && codepoint <= 0x202E) || (codepoint >= 0x2060 && codepoint <= 0x206F)
            || codepoint == 0x3164 || (codepoint >= 0xFE00 && codepoint <= 0xFE0F) || codepoint == 0xFEFF
            || codepoint == 0xFFA0 || (codepoint >= 0xFFF0 && codepoint <= 0xFFF8)
            || (codepoint >= 0x1BCA0 && codepoint <= 0x1BCA3) || (codepoint >= 0x1D173 && codepoint <= 0x1D17A)
            || (codepoint >= 0xE0000 && codepoint <= 0xE0FFF);
    }

    function _isNoncharacter(uint256 codepoint) private pure returns (bool) {
        uint256 low = codepoint & 0xFFFF;
        return (codepoint >= 0xFDD0 && codepoint <= 0xFDEF) || low == 0xFFFE || low == 0xFFFF;
    }

    function _displayUnits(uint256 codepoint) private pure returns (uint256) {
        if (codepoint >= 0x21 && codepoint <= 0x7E) {
            return 6;
        }
        if (
            (codepoint >= 0x1100 && codepoint <= 0x11FF) || (codepoint >= 0x2E80 && codepoint <= 0xA4CF)
                || (codepoint >= 0xAC00 && codepoint <= 0xD7AF) || (codepoint >= 0xF900 && codepoint <= 0xFAFF)
                || (codepoint >= 0xFE10 && codepoint <= 0xFE6F) || (codepoint >= 0xFF00 && codepoint <= 0xFFEF)
                || (codepoint >= 0x20000 && codepoint <= 0x3FFFD)
        ) {
            return 10;
        }
        return 8;
    }

    function _agentIdentityHash(bytes32 agentLineHash) internal pure returns (bytes32) {
        return keccak256(abi.encode(AGENT_IDENTITY_DOMAIN, agentLineHash));
    }

    function _workHash(bytes32 promptLineHash, bytes32 agentLineHash, bytes32 binaryFieldHash)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encode(WORK_DOMAIN, RENDERER_ID_HASH, promptLineHash, agentLineHash, binaryFieldHash));
    }

    function _mint(address to, uint256 tokenId) private {
        if (to == address(0)) {
            revert TransferToZeroAddress();
        }
        if (_ownerOf[tokenId] != address(0)) {
            revert InvalidReceiver();
        }
        unchecked {
            _balanceOf[to] += 1;
        }
        _ownerOf[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }

    function _transfer(address from, address to, uint256 tokenId) private {
        address tokenOwner = ownerOf(tokenId);
        if (tokenOwner != from) {
            revert InvalidSender();
        }
        if (to == address(0)) {
            revert TransferToZeroAddress();
        }
        if (!_isAuthorized(msg.sender, tokenId, tokenOwner)) {
            revert NotAuthorized();
        }

        delete getApproved[tokenId];

        unchecked {
            _balanceOf[from] -= 1;
            _balanceOf[to] += 1;
        }

        _ownerOf[tokenId] = to;
        emit Transfer(from, to, tokenId);
    }

    function _isAuthorized(address operator, uint256 tokenId, address tokenOwner) private view returns (bool) {
        return operator == tokenOwner || getApproved[tokenId] == operator || isApprovedForAll[tokenOwner][operator];
    }

    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory data)
        private
        returns (bool)
    {
        if (to.code.length == 0) {
            return true;
        }

        try IERC721Receiver(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721Receiver.onERC721Received.selector;
        } catch {
            return false;
        }
    }

    function _requireMinted(uint256 tokenId) private view {
        if (_ownerOf[tokenId] == address(0)) {
            revert NonexistentToken();
        }
    }
}
