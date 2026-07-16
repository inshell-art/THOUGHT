// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "./Base64.sol";
import {ThoughtReleaseConstants} from "./ThoughtReleaseConstants.sol";

interface IThoughtRenderer {
    function RENDERER_ID_HASH() external view returns (bytes32);

    function render(
        string calldata promptLine,
        string calldata agentLine,
        bytes calldata packedField,
        uint256 promptDisplayUnits,
        uint256 agentDisplayUnits
    ) external view returns (string memory);
}

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
        Agent
    }

    struct MintThoughtInput {
        string promptLine;
        string agentLine;
        uint256 pathId;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        string provenanceJson;
        uint256 deadline;
        bytes pathSignature;
    }

    struct ThoughtRecord {
        string promptLine;
        string agentLine;
        string provenanceJson;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        uint256 pathId;
        uint256 pathSerial;
        address minter;
        uint64 mintedAt;
    }

    struct ThoughtRecordView {
        string promptLine;
        string agentLine;
        string provenanceJson;
        bytes32 promptLineHash;
        bytes32 agentLineHash;
        bytes32 workHash;
        bytes32 provenanceHash;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        uint256 pathId;
        uint256 pathSerial;
        address minter;
        uint64 mintedAt;
    }

    struct StructuralMetrics {
        uint256 promptBytes;
        uint256 agentBytes;
        uint256 promptWeight;
        uint256 agentWeight;
        uint256 loomWeight;
        uint256 bitDistance;
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
    bytes32 public constant WORK_PROFILE_ID_HASH = ThoughtReleaseConstants.WORK_PROFILE_ID_HASH;
    bytes32 public constant WORK_PROFILE_KECCAK256 = ThoughtReleaseConstants.WORK_PROFILE_KECCAK256;

    uint256 public constant MAX_PROMPT_LINE_BYTES = 64;
    uint256 public constant MAX_AGENT_LINE_BYTES = 64;
    uint256 public constant MAX_PROVENANCE_BYTES = 20_000;
    uint256 public constant BINARY_FIELD_BITS = 1024;
    uint256 public constant BINARY_FIELD_BYTES = 128;

    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    address public immutable pathNft;
    address public immutable thoughtSpecRegistry;
    address public immutable thoughtRenderer;
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
        bytes32 protocolReleaseId_
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
        try IThoughtRenderer(thoughtRenderer_).RENDERER_ID_HASH() returns (bytes32 rendererIdHash) {
            if (rendererIdHash != RENDERER_ID_HASH) revert InvalidThoughtRenderer();
        } catch {
            revert InvalidThoughtRenderer();
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
        bytes memory provenanceBytes = bytes(input.provenanceJson);
        if (provenanceBytes.length == 0) {
            revert EmptyProvenance();
        }
        if (provenanceBytes.length > MAX_PROVENANCE_BYTES) {
            revert ProvenanceTooLarge(provenanceBytes.length, MAX_PROVENANCE_BYTES);
        }

        bytes32 promptLineHash = keccak256(bytes(input.promptLine));
        bytes32 agentLineHash = keccak256(bytes(input.agentLine));
        bytes memory packedField = _packedBinaryField(bytes(input.promptLine), bytes(input.agentLine));
        bytes32 binaryFieldHash = keccak256(packedField);
        bytes32 derivedAgentIdentityHash = _agentIdentityHash(agentLineHash);
        bytes32 mintedWorkHash = _workHash(promptLineHash, agentLineHash, binaryFieldHash);
        uint256 existingTokenId = tokenOfAgentIdentityHash[derivedAgentIdentityHash];
        if (existingTokenId != 0) {
            revert AgentLineAlreadyMinted(derivedAgentIdentityHash, existingTokenId);
        }

        if (
            input.thoughtSpecId == bytes32(0) || input.thoughtSpecHash == bytes32(0)
                || !IThoughtSpecRegistry(thoughtSpecRegistry)
                    .isRegisteredThoughtSpec(input.thoughtSpecId, input.thoughtSpecHash)
        ) {
            revert InvalidThoughtSpecPair(input.thoughtSpecId, input.thoughtSpecHash);
        }

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
        record.provenanceJson = input.provenanceJson;
        record.thoughtSpecId = input.thoughtSpecId;
        record.thoughtSpecHash = input.thoughtSpecHash;
        record.pathId = input.pathId;
        record.pathSerial = pathSerial;
        record.minter = msg.sender;
        record.mintedAt = mintedAt;
        _mint(msg.sender, tokenId);
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

    function recordOf(uint256 tokenId) external view returns (ThoughtRecordView memory view_) {
        _requireMinted(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        view_.promptLine = record.promptLine;
        view_.agentLine = record.agentLine;
        view_.provenanceJson = record.provenanceJson;
        view_.promptLineHash = keccak256(bytes(record.promptLine));
        view_.agentLineHash = keccak256(bytes(record.agentLine));
        view_.workHash = _workHash(
            view_.promptLineHash,
            view_.agentLineHash,
            keccak256(_packedBinaryField(bytes(record.promptLine), bytes(record.agentLine)))
        );
        view_.provenanceHash = keccak256(bytes(record.provenanceJson));
        view_.thoughtSpecId = record.thoughtSpecId;
        view_.thoughtSpecHash = record.thoughtSpecHash;
        view_.pathId = record.pathId;
        view_.pathSerial = record.pathSerial;
        view_.minter = record.minter;
        view_.mintedAt = record.mintedAt;
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

    function previewSvg(string calldata promptLine, string calldata agentLine) external view returns (string memory) {
        uint256 promptDisplayUnits = _validateDisplayLine(promptLine, DisplayKind.Prompt);
        uint256 agentDisplayUnits = _validateDisplayLine(agentLine, DisplayKind.Agent);
        bytes memory packedField = _packedBinaryField(bytes(promptLine), bytes(agentLine));
        return IThoughtRenderer(thoughtRenderer)
            .render(promptLine, agentLine, packedField, promptDisplayUnits, agentDisplayUnits);
    }

    function svgOf(uint256 tokenId) public view returns (string memory) {
        _requireMinted(tokenId);
        return _renderSvg(_records[tokenId]);
    }

    function tokenURI(uint256 tokenId) public view returns (string memory) {
        _requireMinted(tokenId);
        ThoughtRecord storage record = _records[tokenId];
        string memory svg = _renderSvg(record);
        string memory metadata = string.concat(
            '{"name":"THOUGHT #',
            _toString(tokenId),
            '","description":"A human prompt transformed by an Agent into a fully onchain work.',
            '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":',
            _tokenAttributes(record),
            ',"properties":',
            _tokenProperties(record),
            ',"thought":',
            _tokenThought(record),
            "}"
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(metadata)));
    }

    function _tokenAttributes(ThoughtRecord storage record) private view returns (string memory) {
        StructuralMetrics memory metrics = _structuralMetrics(record.promptLine, record.agentLine);
        return string.concat(
            '[{"trait_type":"Prompt","value":',
            _jsonString(record.promptLine),
            '},{"trait_type":"Agent Response","value":',
            _jsonString(record.agentLine),
            '},{"trait_type":"Texture Density","value":"',
            _textureDensity(metrics.loomWeight),
            '"},{"trait_type":"Binary Contrast","value":"',
            _binaryContrast(metrics.bitDistance),
            '"},{"trait_type":"Protocol","value":"V2"}]'
        );
    }

    function _tokenProperties(ThoughtRecord storage record) private view returns (string memory) {
        StructuralMetrics memory metrics = _structuralMetrics(record.promptLine, record.agentLine);
        return string.concat(
            '{"promptBytes":',
            _toString(metrics.promptBytes),
            ',"agentBytes":',
            _toString(metrics.agentBytes),
            ',"promptWeight":',
            _toString(metrics.promptWeight),
            ',"agentWeight":',
            _toString(metrics.agentWeight),
            ',"loomWeight":',
            _toString(metrics.loomWeight),
            ',"bitDistance":',
            _toString(metrics.bitDistance),
            ',"protocolReleaseId":"',
            _bytes32ToHex(protocolReleaseId),
            '","manifestKeccak256":"',
            _bytes32ToHex(protocolManifestHash()),
            '","rendererId":"',
            RENDERER_ID,
            '","rendererProfileKeccak256":"',
            _bytes32ToHex(RENDERER_PROFILE_KECCAK256),
            '","workProfileId":"',
            WORK_PROFILE_ID,
            '","workProfileKeccak256":"',
            _bytes32ToHex(WORK_PROFILE_KECCAK256),
            '","provenanceKeccak256":"',
            _bytes32ToHex(keccak256(bytes(record.provenanceJson))),
            '"}'
        );
    }

    function _tokenThought(ThoughtRecord storage record) private view returns (string memory) {
        bytes memory packedField = _packedBinaryField(bytes(record.promptLine), bytes(record.agentLine));
        bytes32 promptLineHash = keccak256(bytes(record.promptLine));
        bytes32 agentLineHash = keccak256(bytes(record.agentLine));
        bytes32 binaryFieldHash = keccak256(packedField);
        bytes32 derivedAgentIdentityHash = _agentIdentityHash(agentLineHash);
        bytes32 derivedWorkHash = _workHash(promptLineHash, agentLineHash, binaryFieldHash);
        bytes32 provenanceHash = keccak256(bytes(record.provenanceJson));
        string memory identity = string.concat(
            '{"renderer":"',
            RENDERER_ID,
            '","protocolReleaseId":"',
            _bytes32ToHex(protocolReleaseId),
            '","manifestKeccak256":"',
            _bytes32ToHex(protocolManifestHash()),
            '","promptLine":',
            _jsonString(record.promptLine),
            ',"agentLine":',
            _jsonString(record.agentLine),
            ',"binaryFieldPacked":"',
            _bytesToHex(packedField),
            '","binaryFieldKeccak256":"',
            _bytes32ToHex(binaryFieldHash)
        );
        string memory hashes = string.concat(
            '","promptLineKeccak256":"',
            _bytes32ToHex(promptLineHash),
            '","agentLineKeccak256":"',
            _bytes32ToHex(agentLineHash),
            '","agentIdentityHash":"',
            _bytes32ToHex(derivedAgentIdentityHash),
            '","workHash":"',
            _bytes32ToHex(derivedWorkHash),
            '","provenanceHash":"',
            _bytes32ToHex(provenanceHash),
            '","thoughtSpecId":"',
            _bytes32ToHex(record.thoughtSpecId),
            '","thoughtSpecHash":"',
            _bytes32ToHex(record.thoughtSpecHash)
        );
        string memory context = string.concat(
            '","pathId":"',
            _toString(record.pathId),
            '","pathSerial":"',
            _toString(record.pathSerial),
            '","minter":"',
            _addressToHex(record.minter),
            '","mintedAt":"',
            _toString(record.mintedAt),
            '","provenance":',
            _jsonString(record.provenanceJson),
            "}"
        );
        return string.concat(identity, hashes, context);
    }

    function _specNameOf(ThoughtRecord storage record) private view returns (string memory) {
        (bool exists, string memory specName, bytes32 registeredHash,,,,) =
            IThoughtSpecRegistry(thoughtSpecRegistry).thoughtSpecMeta(record.thoughtSpecId);
        if (exists && registeredHash == record.thoughtSpecHash) {
            return specName;
        }
        return _bytes32ToHex(record.thoughtSpecId);
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

    function _structuralMetrics(string memory promptLine, string memory agentLine)
        private
        pure
        returns (StructuralMetrics memory metrics)
    {
        bytes memory promptData = bytes(promptLine);
        bytes memory agentData = bytes(agentLine);
        metrics.promptBytes = promptData.length;
        metrics.agentBytes = agentData.length;

        for (uint256 i = 0; i < 64; i++) {
            uint8 promptByte = uint8(promptData[i % promptData.length]);
            uint8 agentByte = uint8(agentData[i % agentData.length]);
            metrics.promptWeight += _popcount8(promptByte);
            metrics.agentWeight += _popcount8(agentByte);
            metrics.bitDistance += _popcount8(promptByte ^ agentByte);
        }
        metrics.loomWeight = metrics.promptWeight + metrics.agentWeight;
    }

    function _textureDensity(uint256 loomWeight) private pure returns (string memory) {
        if (loomWeight <= 460) return "Open";
        if (loomWeight <= 563) return "Balanced";
        return "Dense";
    }

    function _binaryContrast(uint256 bitDistance) private pure returns (string memory) {
        if (bitDistance <= 170) return "Low";
        if (bitDistance <= 341) return "Medium";
        return "High";
    }

    function _popcount8(uint8 value) private pure returns (uint256 count) {
        while (value != 0) {
            value &= value - 1;
            count++;
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

    function _jsonString(string memory value) private pure returns (string memory) {
        return string.concat('"', _jsonEscape(value), '"');
    }

    function _jsonBare(string memory value) private pure returns (string memory) {
        return _jsonEscape(value);
    }

    function _jsonEscape(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        uint256 outputLen = 0;

        for (uint256 i = 0; i < input.length; i++) {
            uint8 charCode = uint8(input[i]);
            if (input[i] == '"' || input[i] == "\\" || input[i] == "\n" || input[i] == "\r" || input[i] == "\t") {
                outputLen += 2;
            } else if (charCode < 0x20) {
                outputLen += 6;
            } else {
                outputLen += 1;
            }
        }

        bytes memory output = new bytes(outputLen);
        uint256 cursor = 0;
        for (uint256 i = 0; i < input.length; i++) {
            uint8 charCode = uint8(input[i]);
            if (input[i] == '"') {
                output[cursor++] = "\\";
                output[cursor++] = '"';
            } else if (input[i] == "\\") {
                output[cursor++] = "\\";
                output[cursor++] = "\\";
            } else if (input[i] == "\n") {
                output[cursor++] = "\\";
                output[cursor++] = "n";
            } else if (input[i] == "\r") {
                output[cursor++] = "\\";
                output[cursor++] = "r";
            } else if (input[i] == "\t") {
                output[cursor++] = "\\";
                output[cursor++] = "t";
            } else if (charCode < 0x20) {
                output[cursor++] = "\\";
                output[cursor++] = "u";
                output[cursor++] = "0";
                output[cursor++] = "0";
                output[cursor++] = HEX_DIGITS[charCode >> 4];
                output[cursor++] = HEX_DIGITS[charCode & 0x0f];
            } else {
                output[cursor++] = input[i];
            }
        }

        return string(output);
    }

    function _bytesToHex(bytes memory value) private pure returns (string memory) {
        bytes memory output = new bytes(2 + value.length * 2);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < value.length; i++) {
            uint8 byteValue = uint8(value[i]);
            output[2 + (i * 2)] = HEX_DIGITS[byteValue >> 4];
            output[3 + (i * 2)] = HEX_DIGITS[byteValue & 0x0f];
        }
        return string(output);
    }

    function _bytes32ToHex(bytes32 value) private pure returns (string memory) {
        bytes memory output = new bytes(66);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 byteValue = uint8(value[i]);
            output[2 + (i * 2)] = HEX_DIGITS[byteValue >> 4];
            output[3 + (i * 2)] = HEX_DIGITS[byteValue & 0x0f];
        }
        return string(output);
    }

    function _addressToHex(address account) private pure returns (string memory) {
        bytes20 value = bytes20(account);
        bytes memory output = new bytes(42);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            uint8 byteValue = uint8(value[i]);
            output[2 + (i * 2)] = HEX_DIGITS[byteValue >> 4];
            output[3 + (i * 2)] = HEX_DIGITS[byteValue & 0x0f];
        }
        return string(output);
    }

    function _toString(uint256 value) private pure returns (string memory) {
        if (value == 0) {
            return "0";
        }

        uint256 digits = 0;
        uint256 temp = value;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
