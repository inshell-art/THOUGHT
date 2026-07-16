// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtNFT} from "../src/ThoughtNFT.sol";
import {ThoughtRenderer} from "../src/ThoughtRenderer.sol";
import {ThoughtSpecRegistry} from "../src/ThoughtSpecRegistry.sol";
import {ThoughtSpecRegistryV2} from "../src/ThoughtSpecRegistryV2.sol";

interface VmActive {
    function addr(uint256 privateKey) external returns (address);
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256 newTimestamp) external;
}

contract MockPathNFTActive {
    bytes32 public constant MOVEMENT_THOUGHT = bytes32("THOUGHT");
    bytes32 private constant _CONSUME_AUTHORIZATION_TYPEHASH = keccak256(
        "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)"
    );

    address public authorizedMinter;
    uint256 public consumeCallCount;

    mapping(uint256 pathId => address owner) public ownerOf;
    mapping(address claimer => uint256 nonce) public getConsumeNonce;
    mapping(uint256 pathId => bool consumed) public thoughtConsumed;

    function setAuthorizedMinter(address minter) external {
        authorizedMinter = minter;
    }

    function mintPath(address owner, uint256 pathId) external {
        ownerOf[pathId] = owner;
    }

    function consumeUnit(uint256 pathId, bytes32 movement, address claimer, uint256 deadline, bytes calldata signature)
        external
        returns (uint256 serial)
    {
        require(authorizedMinter != address(0) && msg.sender == authorizedMinter, "ERR_UNAUTHORIZED_MINTER");
        require(block.timestamp <= deadline, "CONSUME_AUTH_EXPIRED");
        require(ownerOf[pathId] != address(0), "ERC721: invalid token ID");
        require(movement == MOVEMENT_THOUGHT, "BAD_MOVEMENT");
        require(ownerOf[pathId] == claimer, "ERR_NOT_OWNER");
        require(!thoughtConsumed[pathId], "QUOTA_EXHAUSTED");

        uint256 nonce = getConsumeNonce[claimer];
        bytes32 structHash = keccak256(
            abi.encode(
                _CONSUME_AUTHORIZATION_TYPEHASH,
                address(this),
                uint256(block.chainid),
                pathId,
                movement,
                claimer,
                msg.sender,
                nonce,
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", structHash));
        require(_recover(digest, signature) == claimer, "BAD_CONSUME_AUTH");

        thoughtConsumed[pathId] = true;
        getConsumeNonce[claimer] = nonce + 1;
        consumeCallCount += 1;
        return 0;
    }

    function _recover(bytes32 digest, bytes calldata signature) private pure returns (address) {
        if (signature.length != 65) {
            return address(0);
        }

        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 32))
            v := byte(0, calldataload(add(signature.offset, 64)))
        }
        if (v < 27) {
            v += 27;
        }

        return ecrecover(digest, v, r, s);
    }
}

contract RecordingERC721ReceiverActive {
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    address public lastOperator;
    address public lastFrom;
    uint256 public lastTokenId;
    bytes32 public lastDataHash;
    uint256 public callCount;

    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4)
    {
        lastOperator = operator;
        lastFrom = from;
        lastTokenId = tokenId;
        lastDataHash = keccak256(data);
        callCount += 1;
        return _ERC721_RECEIVED;
    }
}

contract RejectingERC721ReceiverActive {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return 0xffffffff;
    }
}

contract RevertingERC721ReceiverActive {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        revert("REJECT_ERC721");
    }
}

contract WrongThoughtRendererActive {
    function RENDERER_ID_HASH() external pure returns (bytes32) {
        return keccak256("wrong.renderer");
    }
}

contract ReentrantPathNFTActive {
    ThoughtNFT public token;
    bytes32 public specId;
    bytes32 public specHash;
    bool public reentrantBlocked;
    uint256 public consumeCallCount;
    bool private _entered;

    function configure(ThoughtNFT token_, bytes32 specId_, bytes32 specHash_) external {
        token = token_;
        specId = specId_;
        specHash = specHash_;
    }

    function consumeUnit(uint256, bytes32, address, uint256, bytes calldata) external returns (uint256 serial) {
        consumeCallCount += 1;

        if (!_entered) {
            _entered = true;
            ThoughtNFT.MintThoughtInput memory input = ThoughtNFT.MintThoughtInput({
                promptLine: "nested prompt",
                agentLine: "NESTED AGENT",
                pathId: 77,
                thoughtSpecId: specId,
                thoughtSpecHash: specHash,
                provenanceJson: '{"app":"THOUGHT","test":"reentrant"}',
                deadline: block.timestamp + 1 hours,
                pathSignature: ""
            });

            try token.mint(input) returns (uint256) {
                revert("REENTRANT_MINT_SUCCEEDED");
            } catch (bytes memory data) {
                bytes4 selector;
                if (data.length >= 4) {
                    assembly {
                        selector := mload(add(data, 32))
                    }
                }
                reentrantBlocked = selector == ThoughtNFT.ReentrantCall.selector;
            }
            require(reentrantBlocked, "REENTRANT_NOT_BLOCKED");
        }

        return 777;
    }
}

contract RegularErc721Baseline {
    string public name;
    string public symbol;
    uint256 public totalSupply;
    mapping(uint256 tokenId => address owner) public ownerOf;
    mapping(address owner => uint256 balance) public balanceOf;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 || interfaceId == 0x80ac58cd || interfaceId == 0x5b5e139f;
    }

    function mint(address to) external returns (uint256 tokenId) {
        require(to != address(0), "zero address");
        tokenId = ++totalSupply;
        ownerOf[tokenId] = to;
        balanceOf[to] += 1;
        emit Transfer(address(0), to, tokenId);
    }
}

contract ThoughtNFTTest {
    VmActive private constant vm = VmActive(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant USER_KEY = 0xA11CE;
    uint256 private constant OTHER_KEY = 0xB0B;
    string private constant DEFAULT_PROVENANCE =
        '{"app":"THOUGHT","version":"v2","route":"codex","agentVerified":false}';
    string private constant DEFAULT_SPEC_NAME = "THOUGHT.v2.md";
    string private constant DEFAULT_SPEC_REF = "THOUGHT.v2.md";
    string private constant DEFAULT_SPEC_TEXT =
        "# THOUGHT.v2.md\n\nVersion: v2\n\nThe contract mints final visible V2 lines only.\n";
    bytes32 private constant PROTOCOL_RELEASE_HASH = keccak256("inshell.thought.protocol.v2.test");
    uint256 private constant APPROVED_MAX_COMPLETE_MINT_GAS = 825_000;
    uint256 private constant APPROVED_MAX_COMBINED_DEPLOYMENT_GAS = 8_000_000;
    bytes32 private constant CONSUME_AUTHORIZATION_TYPEHASH = keccak256(
        "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)"
    );

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
    event GasProfile(string metric, uint256 gasUsed, uint256 responseBytes);

    MockPathNFTActive private path;
    ThoughtSpecRegistry private registry;
    ThoughtSpecRegistryV2 private protocolRegistry;
    ThoughtRenderer private renderer;
    ThoughtNFT private token;
    address private user;
    bytes32 private defaultSpecId;
    bytes32 private defaultSpecHash;
    bytes32 private protocolReleaseId;

    function setUp() public {
        user = vm.addr(USER_KEY);
        path = new MockPathNFTActive();
        registry = new ThoughtSpecRegistry(address(this));
        protocolRegistry = new ThoughtSpecRegistryV2(address(this));
        renderer = new ThoughtRenderer();
        (defaultSpecId, defaultSpecHash,) =
            registry.registerThoughtSpec(DEFAULT_SPEC_NAME, DEFAULT_SPEC_REF, bytes(DEFAULT_SPEC_TEXT));
        protocolReleaseId = protocolRegistry.registerRelease(PROTOCOL_RELEASE_HASH, "ipfs://thought-v2-test-manifest");
        token = new ThoughtNFT(
            address(path), address(registry), address(renderer), address(protocolRegistry), protocolReleaseId
        );
        path.setAuthorizedMinter(address(token));
        for (uint256 pathId = 1; pathId <= 96; pathId++) {
            path.mintPath(user, pathId);
        }
    }

    function testRegistryRegistersExactSpecBytes() public view {
        (
            bool exists,
            string memory specName,
            bytes32 specHash,
            string memory ref,
            address pointer,
            uint32 byteLength,
            uint64 registeredAt
        ) = registry.thoughtSpecMeta(defaultSpecId);

        require(exists, "spec missing");
        require(_equal(specName, DEFAULT_SPEC_NAME), "spec name mismatch");
        require(specHash == defaultSpecHash, "spec hash mismatch");
        require(_equal(ref, DEFAULT_SPEC_REF), "spec ref mismatch");
        require(pointer != address(0), "spec pointer missing");
        require(byteLength == bytes(DEFAULT_SPEC_TEXT).length, "spec byte length mismatch");
        require(registeredAt == uint64(block.timestamp), "registeredAt mismatch");
        require(registry.isRegisteredThoughtSpec(defaultSpecId, defaultSpecHash), "spec pair should validate");
        require(_bytesEqual(registry.thoughtSpecBytes(defaultSpecId), bytes(DEFAULT_SPEC_TEXT)), "spec bytes mismatch");
        require(_equal(registry.thoughtSpecText(defaultSpecId), DEFAULT_SPEC_TEXT), "spec text mismatch");
    }

    function testRegistryOwnerAndSpecNameValidation() public {
        ThoughtSpecRegistry ownedRegistry = new ThoughtSpecRegistry(user);
        require(ownedRegistry.owner() == user, "owner mismatch");
        require(registry.isValidThoughtSpecName("THOUGHT.v2.md"), "v2 name should pass");
        require(registry.isValidThoughtSpecName("THOUGHT.v12.md"), "multi digit version should pass");
        require(!registry.isValidThoughtSpecName("THOUGHT.v0.md"), "v0 should fail");
        require(!registry.isValidThoughtSpecName("THOUGHT.v02.md"), "leading zero should fail");
        require(!registry.isValidThoughtSpecName("THOUGHT.md"), "legacy name should fail");

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistry.OwnerZeroAddress.selector));
        new ThoughtSpecRegistry(address(0));

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistry.NotOwner.selector));
        ownedRegistry.registerThoughtSpec("THOUGHT.v3.md", "THOUGHT.v3.md", bytes("Version: v3"));
    }

    function testConstructorPinsDependenciesAndProtocolReleaseAndRejectsInvalidTargets() public {
        require(token.pathNft() == address(path), "path dependency mismatch");
        require(token.thoughtSpecRegistry() == address(registry), "registry dependency mismatch");
        require(token.thoughtRenderer() == address(renderer), "renderer dependency mismatch");
        require(token.protocolRegistry() == address(protocolRegistry), "protocol registry mismatch");
        require(token.protocolReleaseId() == protocolReleaseId, "protocol release id mismatch");
        require(token.protocolManifestHash() == PROTOCOL_RELEASE_HASH, "manifest hash mismatch");
        require(_equal(token.protocolManifestURI(), "ipfs://thought-v2-test-manifest"), "manifest URI mismatch");

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidPathNft.selector));
        new ThoughtNFT(address(0), address(registry), address(renderer), address(protocolRegistry), protocolReleaseId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidPathNft.selector));
        new ThoughtNFT(
            address(0x1234), address(registry), address(renderer), address(protocolRegistry), protocolReleaseId
        );

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidThoughtSpecRegistry.selector));
        new ThoughtNFT(address(path), address(0), address(renderer), address(protocolRegistry), protocolReleaseId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidThoughtSpecRegistry.selector));
        new ThoughtNFT(address(path), address(0x1234), address(renderer), address(protocolRegistry), protocolReleaseId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidThoughtRenderer.selector));
        new ThoughtNFT(address(path), address(registry), address(0), address(protocolRegistry), protocolReleaseId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidThoughtRenderer.selector));
        new ThoughtNFT(address(path), address(registry), address(0x1234), address(protocolRegistry), protocolReleaseId);

        WrongThoughtRendererActive wrongRenderer = new WrongThoughtRendererActive();
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidThoughtRenderer.selector));
        new ThoughtNFT(
            address(path), address(registry), address(wrongRenderer), address(protocolRegistry), protocolReleaseId
        );

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidProtocolRegistry.selector));
        new ThoughtNFT(address(path), address(registry), address(renderer), address(0), protocolReleaseId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidProtocolRegistry.selector));
        new ThoughtNFT(address(path), address(registry), address(renderer), address(0x1234), protocolReleaseId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidProtocolRelease.selector, bytes32(0)));
        new ThoughtNFT(address(path), address(registry), address(renderer), address(protocolRegistry), bytes32(0));

        bytes32 missingRelease = keccak256("missing release");
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidProtocolRelease.selector, missingRelease));
        new ThoughtNFT(address(path), address(registry), address(renderer), address(protocolRegistry), missingRelease);
    }

    function testMultipleRegisteredSpecVersionsRemainMintable() public {
        (bytes32 secondSpecId, bytes32 secondSpecHash,) =
            registry.registerThoughtSpec("THOUGHT.v3.md", "THOUGHT.v3.md", bytes("# THOUGHT\nVersion: v3\n"));

        ThoughtNFT.MintThoughtInput memory firstInput = _input("first spec", "FIRST SPEC", 1, USER_KEY);
        vm.prank(user);
        uint256 firstTokenId = token.mint(firstInput);
        ThoughtNFT.MintThoughtInput memory secondInput =
            _input("second spec", "SECOND SPEC", 2, USER_KEY, secondSpecId, secondSpecHash, DEFAULT_PROVENANCE);
        vm.prank(user);
        uint256 secondTokenId = token.mint(secondInput);

        (bytes32 firstId, bytes32 firstHash,,) = token.thoughtSpecOf(firstTokenId);
        (bytes32 secondId, bytes32 secondHash,,) = token.thoughtSpecOf(secondTokenId);
        require(firstId == defaultSpecId && firstHash == defaultSpecHash, "first spec pair mismatch");
        require(secondId == secondSpecId && secondHash == secondSpecHash, "second spec pair mismatch");
    }

    function testMarketplaceInterfacesAndNonexistentTokenReadsRevert() public {
        require(_equal(token.name(), "THOUGHT"), "name getter mismatch");
        require(_equal(token.symbol(), "THOUGHT"), "symbol getter mismatch");
        require(token.supportsInterface(0x01ffc9a7), "ERC165 unsupported");
        require(token.supportsInterface(0x80ac58cd), "ERC721 unsupported");
        require(token.supportsInterface(0x5b5e139f), "ERC721Metadata unsupported");
        require(!token.supportsInterface(0xffffffff), "invalid interface supported");

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.BalanceQueryForZeroAddress.selector));
        token.balanceOf(address(0));

        uint256 missingTokenId = 404;
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.ownerOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.promptLineOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.agentLineOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.provenanceOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.workHashOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.recordOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.thoughtSpecOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.svgOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NonexistentToken.selector));
        token.tokenURI(missingTokenId);
    }

    function testRegistryEnumerationDuplicateAndUnknownSpecReads() public {
        require(registry.thoughtSpecCount() == 1, "unexpected initial spec count");
        require(registry.thoughtSpecIdAt(0) == defaultSpecId, "spec id at zero mismatch");
        require(registry.latestThoughtSpecId() == defaultSpecId, "latest spec mismatch");
        require(registry.validateThoughtSpec(defaultSpecId, defaultSpecHash), "registered spec should validate");
        require(registry.validateSpec(defaultSpecId), "legacy validateSpec wrapper failed");
        require(!registry.validateThoughtSpec(defaultSpecId, bytes32(0)), "zero spec hash validated");
        require(!registry.validateThoughtSpec(bytes32(uint256(0xCAFE)), defaultSpecHash), "unknown spec validated");

        vm.expectRevert(
            abi.encodeWithSelector(ThoughtSpecRegistry.ThoughtSpecAlreadyRegistered.selector, defaultSpecId)
        );
        registry.registerThoughtSpec(DEFAULT_SPEC_NAME, DEFAULT_SPEC_REF, bytes(DEFAULT_SPEC_TEXT));

        bytes32 missingSpecId = keccak256("THOUGHT.v404.md");
        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistry.ThoughtSpecNotFound.selector, missingSpecId));
        registry.thoughtSpecBytes(missingSpecId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistry.EmptyThoughtSpec.selector));
        registry.registerThoughtSpec("THOUGHT.v3.md", "THOUGHT.v3.md", bytes(""));

        string memory oversizeSpec = _repeat("x", registry.MAX_THOUGHT_SPEC_BYTES() + 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ThoughtSpecRegistry.ThoughtSpecTooLarge.selector,
                bytes(oversizeSpec).length,
                registry.MAX_THOUGHT_SPEC_BYTES()
            )
        );
        registry.registerThoughtSpec("THOUGHT.v4.md", "THOUGHT.v4.md", bytes(oversizeSpec));
    }

    function testErc721ApprovalsTransfersAndApprovalClearing() public {
        address other = vm.addr(OTHER_KEY);
        uint256 tokenId = _mintAsUser("transfer prompt", "TRANSFER AGENT", 1);

        require(token.ownerOf(tokenId) == user, "owner mismatch before transfer");
        require(token.balanceOf(user) == 1, "user balance before transfer mismatch");
        require(token.balanceOf(other) == 0, "other balance before transfer mismatch");

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.NotAuthorized.selector));
        token.transferFrom(user, other, tokenId);

        vm.prank(user);
        token.approve(other, tokenId);
        require(token.getApproved(tokenId) == other, "approval missing");

        vm.prank(other);
        token.transferFrom(user, other, tokenId);
        require(token.ownerOf(tokenId) == other, "owner mismatch after approved transfer");
        require(token.balanceOf(user) == 0, "user balance after transfer mismatch");
        require(token.balanceOf(other) == 1, "other balance after transfer mismatch");
        require(token.getApproved(tokenId) == address(0), "token approval not cleared");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.InvalidSender.selector));
        token.transferFrom(user, user, tokenId);

        vm.prank(other);
        token.setApprovalForAll(user, true);
        require(token.isApprovedForAll(other, user), "operator approval missing");

        vm.prank(user);
        token.transferFrom(other, user, tokenId);
        require(token.ownerOf(tokenId) == user, "owner mismatch after operator transfer");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.ApprovalToCurrentOwner.selector));
        token.approve(user, tokenId);

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.ApprovalCallerNotOwnerNorApproved.selector));
        token.approve(other, tokenId);
    }

    function testSafeTransfersRequireReceiverMagicAndRollbackOnFailure() public {
        RecordingERC721ReceiverActive receiver = new RecordingERC721ReceiverActive();
        RejectingERC721ReceiverActive rejectingReceiver = new RejectingERC721ReceiverActive();
        RevertingERC721ReceiverActive revertingReceiver = new RevertingERC721ReceiverActive();
        bytes memory payload = "receiver payload";

        uint256 acceptedTokenId = _mintAsUser("safe accepted", "SAFE ACCEPTED", 1);
        vm.prank(user);
        token.safeTransferFrom(user, address(receiver), acceptedTokenId, payload);
        require(token.ownerOf(acceptedTokenId) == address(receiver), "safe transfer receiver owner mismatch");
        require(receiver.lastOperator() == user, "receiver operator mismatch");
        require(receiver.lastFrom() == user, "receiver from mismatch");
        require(receiver.lastTokenId() == acceptedTokenId, "receiver token mismatch");
        require(receiver.lastDataHash() == keccak256(payload), "receiver payload mismatch");
        require(receiver.callCount() == 1, "receiver call count mismatch");

        uint256 rejectedTokenId = _mintAsUser("safe rejected", "SAFE REJECTED", 2);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.TransferToNonReceiverImplementer.selector));
        token.safeTransferFrom(user, address(rejectingReceiver), rejectedTokenId, payload);
        require(token.ownerOf(rejectedTokenId) == user, "bad receiver transfer did not roll back");

        uint256 revertedTokenId = _mintAsUser("safe reverted", "SAFE REVERTED", 3);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFT.TransferToNonReceiverImplementer.selector));
        token.safeTransferFrom(user, address(revertingReceiver), revertedTokenId, payload);
        require(token.ownerOf(revertedTokenId) == user, "reverting receiver transfer did not roll back");
    }

    function testPathSignatureFailuresDoNotMintConsumeOrReserve() public {
        ThoughtNFT.MintThoughtInput memory badSigner = _input("wrong signer", "WRONG SIGNER", 1, OTHER_KEY);
        _expectMintStringRevert(badSigner, "BAD_CONSUME_AUTH");
        require(token.totalSupply() == 0, "wrong signer minted");
        require(path.consumeCallCount() == 0, "wrong signer consumed path");
        require(!path.thoughtConsumed(1), "wrong signer marked path consumed");

        ThoughtNFT.MintThoughtInput memory expired = _input("expired auth", "EXPIRED AUTH", 2, USER_KEY);
        expired.deadline = block.timestamp + 1;
        vm.warp(expired.deadline + 1);
        _expectMintStringRevert(expired, "CONSUME_AUTH_EXPIRED");
        require(token.totalSupply() == 0, "expired auth minted");
        require(path.consumeCallCount() == 0, "expired auth consumed path");
        require(!path.thoughtConsumed(2), "expired auth marked path consumed");

        ThoughtNFT.MintThoughtInput memory original = _input("replay source", "REPLAY SOURCE", 3, USER_KEY);
        vm.prank(user);
        token.mint(original);
        require(token.totalSupply() == 1, "first mint failed");

        ThoughtNFT.MintThoughtInput memory replay = original;
        replay.promptLine = "replay target";
        replay.agentLine = "REPLAY TARGET";
        _expectMintStringRevert(replay, "QUOTA_EXHAUSTED");
        require(token.totalSupply() == 1, "replay minted");
        require(token.tokenOfWorkHash(_workHashFor(replay.promptLine, replay.agentLine)) == 0, "replay reserved work");
    }

    function testMintRejectsReentrantPathCallbackAndStillMintsOuterWork() public {
        ReentrantPathNFTActive reentrantPath = new ReentrantPathNFTActive();
        ThoughtNFT reentrantToken = new ThoughtNFT(
            address(reentrantPath), address(registry), address(renderer), address(protocolRegistry), protocolReleaseId
        );
        reentrantPath.configure(reentrantToken, defaultSpecId, defaultSpecHash);

        ThoughtNFT.MintThoughtInput memory input = ThoughtNFT.MintThoughtInput({
            promptLine: "outer prompt",
            agentLine: "OUTER AGENT",
            pathId: 1,
            thoughtSpecId: defaultSpecId,
            thoughtSpecHash: defaultSpecHash,
            provenanceJson: DEFAULT_PROVENANCE,
            deadline: block.timestamp + 1 hours,
            pathSignature: ""
        });

        vm.prank(user);
        uint256 tokenId = reentrantToken.mint(input);

        require(tokenId == 1, "outer mint token id mismatch");
        require(reentrantToken.totalSupply() == 1, "reentrant mint changed supply");
        require(reentrantToken.ownerOf(tokenId) == user, "outer mint owner mismatch");
        require(reentrantPath.consumeCallCount() == 1, "unexpected consume calls");
        require(reentrantPath.reentrantBlocked(), "reentrant callback was not blocked");
        require(reentrantToken.pathSerialOf(tokenId) == 777, "path serial not stored");
    }

    function testMintStoresRecordHashesAndEmitsEvents() public {
        ThoughtNFT.MintThoughtInput memory input = _input("quiet signal", "QUIET SIGNAL", 1, USER_KEY);
        bytes32 promptHash = keccak256(bytes(input.promptLine));
        bytes32 agentHash = keccak256(bytes(input.agentLine));
        bytes32 binaryHash = keccak256(token.binaryField(input.promptLine, input.agentLine));
        bytes32 agentIdentity = token.agentIdentityHash(agentHash);
        bytes32 mintedWorkHash = token.workHash(promptHash, agentHash, binaryHash);
        bytes32 provenanceHash = keccak256(bytes(input.provenanceJson));

        vm.expectEmit(true, true, true, true);
        emit PathThoughtConsumed(1, 1, 0, user);
        vm.expectEmit(true, true, true, true);
        emit ThoughtMinted(
            1,
            user,
            mintedWorkHash,
            promptHash,
            agentHash,
            agentIdentity,
            binaryHash,
            1,
            0,
            defaultSpecId,
            defaultSpecHash
        );

        vm.prank(user);
        uint256 tokenId = token.mint(input);

        require(tokenId == 1, "unexpected token id");
        require(token.totalSupply() == 1, "unexpected total supply");
        require(token.ownerOf(tokenId) == user, "owner mismatch");
        require(path.thoughtConsumed(1), "path not consumed");
        require(path.consumeCallCount() == 1, "path call count mismatch");
        require(token.tokenOfWorkHash(mintedWorkHash) == tokenId, "work token mismatch");
        require(_equal(token.promptLineOf(tokenId), input.promptLine), "prompt line mismatch");
        require(_equal(token.agentLineOf(tokenId), input.agentLine), "agent line mismatch");
        require(_equal(token.provenanceOf(tokenId), input.provenanceJson), "provenance mismatch");
        require(token.promptLineHashOf(tokenId) == promptHash, "prompt hash mismatch");
        require(token.agentLineHashOf(tokenId) == agentHash, "agent hash mismatch");
        require(token.agentIdentityHashOf(tokenId) == agentIdentity, "agent identity mismatch");
        require(token.binaryFieldKeccak256Of(tokenId) == binaryHash, "binary hash mismatch");
        require(token.workHashOf(tokenId) == mintedWorkHash, "work hash mismatch");
        require(token.provenanceHashOf(tokenId) == provenanceHash, "provenance hash mismatch");
        require(token.pathIdOf(tokenId) == 1, "path id mismatch");
        require(token.pathSerialOf(tokenId) == 0, "path serial mismatch");
        require(token.authorOf(tokenId) == user, "author mismatch");
        require(token.mintedAtOf(tokenId) == uint64(block.timestamp), "mint time mismatch");

        ThoughtNFT.ThoughtRecordView memory record = token.recordOf(tokenId);
        require(_equal(record.promptLine, input.promptLine), "record prompt mismatch");
        require(_equal(record.agentLine, input.agentLine), "record agent mismatch");
        require(record.workHash == mintedWorkHash, "record work hash mismatch");
        require(record.provenanceHash == provenanceHash, "record provenance hash mismatch");
        require(record.minter == user, "record minter mismatch");

        (bytes32 specId, bytes32 specHash, string memory specName, string memory specRef) = token.thoughtSpecOf(tokenId);
        require(specId == defaultSpecId, "resolved spec id mismatch");
        require(specHash == defaultSpecHash, "resolved spec hash mismatch");
        require(_equal(specName, DEFAULT_SPEC_NAME), "resolved spec name mismatch");
        require(_equal(specRef, DEFAULT_SPEC_REF), "resolved spec ref mismatch");
    }

    function testInvalidLocalInputDoesNotCallPath() public {
        _expectMintRevert(
            _input("", "VALID AGENT", 1, USER_KEY),
            abi.encodeWithSelector(ThoughtNFT.DisplayLineEmpty.selector, ThoughtNFT.DisplayKind.Prompt)
        );
        require(path.consumeCallCount() == 0, "empty prompt called path");

        _expectMintRevert(
            _input("valid prompt", "", 2, USER_KEY),
            abi.encodeWithSelector(ThoughtNFT.DisplayLineEmpty.selector, ThoughtNFT.DisplayKind.Agent)
        );
        require(path.consumeCallCount() == 0, "empty agent called path");

        _expectMintRevert(
            _input(
                "spec prompt", "SPEC AGENT", 3, USER_KEY, defaultSpecId, bytes32(uint256(0xBEEF)), DEFAULT_PROVENANCE
            ),
            abi.encodeWithSelector(ThoughtNFT.InvalidThoughtSpecPair.selector, defaultSpecId, bytes32(uint256(0xBEEF)))
        );
        require(path.consumeCallCount() == 0, "bad spec called path");
        require(!path.thoughtConsumed(5), "bad spec consumed path");

        _expectMintRevert(
            _input("prov prompt", "PROV AGENT", 4, USER_KEY, defaultSpecId, defaultSpecHash, ""),
            abi.encodeWithSelector(ThoughtNFT.EmptyProvenance.selector)
        );
        require(path.consumeCallCount() == 0, "empty provenance called path");
        require(!path.thoughtConsumed(6), "empty provenance consumed path");

        string memory oversizeProvenance = _repeat("p", token.MAX_PROVENANCE_BYTES() + 1);
        _expectMintRevert(
            _input("big provenance", "BIG PROVENANCE", 5, USER_KEY, defaultSpecId, defaultSpecHash, oversizeProvenance),
            abi.encodeWithSelector(
                ThoughtNFT.ProvenanceTooLarge.selector, bytes(oversizeProvenance).length, token.MAX_PROVENANCE_BYTES()
            )
        );
        require(path.consumeCallCount() == 0, "bad provenance called path");
        require(!path.thoughtConsumed(7), "bad provenance consumed path");
    }

    function testPathConsumeFailureDoesNotMintReserveOrIncrementSupply() public {
        path.setAuthorizedMinter(address(0xCAFE));
        ThoughtNFT.MintThoughtInput memory input = _input("valid prompt", "VALID AGENT", 1, USER_KEY);
        bytes32 mintedWorkHash = _workHashFor(input.promptLine, input.agentLine);

        vm.prank(user);
        (bool ok,) = address(token).call(abi.encodeWithSelector(token.mint.selector, input));
        require(!ok, "mint should fail at path consume");
        require(token.totalSupply() == 0, "failed consume incremented supply");
        require(token.tokenOfWorkHash(mintedWorkHash) == 0, "failed consume reserved work");
        require(!path.thoughtConsumed(1), "failed consume persisted path state");
    }

    function testDuplicateWorkDoesNotCallPath() public {
        _mintAsUser("same prompt", "SAME AGENT", 1);
        uint256 beforeCalls = path.consumeCallCount();
        ThoughtNFT.MintThoughtInput memory duplicate = _input("same prompt", "SAME AGENT", 2, USER_KEY);
        bytes32 agentIdentity = token.agentIdentityHash(keccak256(bytes(duplicate.agentLine)));

        _expectMintRevert(
            duplicate, abi.encodeWithSelector(ThoughtNFT.AgentLineAlreadyMinted.selector, agentIdentity, uint256(1))
        );
        require(path.consumeCallCount() == beforeCalls, "duplicate called path");
        require(!path.thoughtConsumed(2), "duplicate consumed path");
    }

    function testUtf8ValidationAcceptsGlobalVisibleText() public {
        _mintAsUser("lowercase prompt", "UPPERCASE AGENT", 1);
        _mintAsUser(unicode"quiet 山 river", unicode"QUIET 山 RIVER", 2);
        uint256 cjkToken = _mintAsUser(unicode"你好 世界", unicode"你好 世界", 3);
        uint256 arabicToken = _mintAsUser(unicode"مرحبا", unicode"مرحبا", 4);
        uint256 hebrewToken = _mintAsUser(unicode"שלום", unicode"שלום", 5);
        uint256 combiningToken = _mintAsUser(unicode"é", unicode"ä", 6);
        uint256 emojiToken = _mintAsUser(unicode"😀 👋🏽", unicode"🚀 🌍", 7);
        uint256 flagToken = _mintAsUser(unicode"🇺🇸", unicode"🇯🇵", 8);
        uint256 thaiToken = _mintAsUser(unicode"ภาษาไทย้", unicode"สัญญาณไทย", 9);
        uint256 arabicMarksToken = _mintAsUser(unicode"مَرْحَبًا", unicode"صَوْتٌ عَرَبِيّ", 10);

        require(_equal(token.promptLineOf(cjkToken), unicode"你好 世界"), "cjk prompt mismatch");
        require(_equal(token.agentLineOf(arabicToken), unicode"مرحبا"), "arabic agent mismatch");
        require(_equal(token.agentLineOf(hebrewToken), unicode"שלום"), "hebrew agent mismatch");
        require(_equal(token.promptLineOf(combiningToken), unicode"é"), "combining prompt mismatch");
        require(_equal(token.agentLineOf(emojiToken), unicode"🚀 🌍"), "emoji agent mismatch");
        require(_equal(token.promptLineOf(flagToken), unicode"🇺🇸"), "flag prompt mismatch");
        require(_equal(token.promptLineOf(thaiToken), unicode"ภาษาไทย้"), "thai prompt mismatch");
        require(
            _equal(token.agentLineOf(arabicMarksToken), unicode"صَوْتٌ عَرَبِيّ"),
            "arabic marks agent mismatch"
        );
    }

    function testUtf8ValidationRejectsMalformedBytes() public {
        _expectPromptUtf8Revert(hex"80");
        _expectPromptUtf8Revert(hex"c0af");
        _expectPromptUtf8Revert(hex"e080af");
        _expectPromptUtf8Revert(hex"eda080");
        _expectPromptUtf8Revert(hex"f4908080");
        _expectPromptUtf8Revert(hex"e282");
        _expectPromptUtf8Revert(hex"f09f92");
        _expectPromptUtf8Revert(hex"e228a1");
        _expectPromptUtf8Revert(hex"f0288cbc");
        _expectPromptUtf8Revert(hex"f5908080");
        _expectPromptUtf8Revert(hex"ff");

        bytes memory rawAgentLine = hex"80";
        ThoughtNFT.MintThoughtInput memory input = _input("VALID PROMPT", string(rawAgentLine), 1, USER_KEY);
        _expectMintRevert(input, abi.encodeWithSelector(ThoughtNFT.InvalidUtf8.selector, ThoughtNFT.DisplayKind.Agent));
        require(path.consumeCallCount() == 0, "invalid Agent utf8 called path");
    }

    function testUtf8ValidationRejectsControlsAndInvisibleCharacters() public {
        _expectPromptCharacterRevert(hex"0a", 0x0a);
        _expectPromptCharacterRevert(hex"09", 0x09);
        _expectPromptCharacterRevert(hex"7f", 0x7f);
        _expectPromptCharacterRevert(hex"c280", 0x80);
        _expectPromptCharacterRevert(hex"c2a0", 0x00A0);
        _expectPromptCharacterRevert(hex"e28080", 0x2000);
        _expectPromptCharacterRevert(hex"e2808b", 0x200B);
        _expectPromptCharacterRevert(hex"e280ae", 0x202E);
        _expectPromptCharacterRevert(hex"e281a0", 0x2060);
        _expectPromptCharacterRevert(hex"efbbbf", 0xFEFF);
        _expectPromptCharacterRevert(hex"cd8f", 0x034F);
        _expectPromptCharacterRevert(hex"d89c", 0x061C);
        _expectPromptCharacterRevert(hex"e1859f", 0x115F);
        _expectPromptCharacterRevert(hex"e19eb4", 0x17B4);
        _expectPromptCharacterRevert(hex"e1a08b", 0x180B);
        _expectPromptCharacterRevert(hex"e281af", 0x206F);
        _expectPromptCharacterRevert(hex"e385a4", 0x3164);
        _expectPromptCharacterRevert(hex"efb880", 0xFE00);
        _expectPromptCharacterRevert(hex"efbea0", 0xFFA0);
        _expectPromptCharacterRevert(hex"efbfb0", 0xFFF0);
        _expectPromptCharacterRevert(hex"f09bb2a0", 0x1BCA0);
        _expectPromptCharacterRevert(hex"f09d85b3", 0x1D173);
        _expectPromptCharacterRevert(hex"f3a08080", 0xE0000);
        _expectPromptCharacterRevert(hex"efb790", 0xFDD0);
        _expectPromptCharacterRevert(hex"efbfbe", 0xFFFE);
        _expectPromptCharacterRevert(hex"f48fbfbf", 0x10FFFF);
    }

    function testUtf8ValidationRejectsEveryFrozenRangeBoundary() public {
        uint256[] memory codepoints = new uint256[](81);
        codepoints[0] = 0x0009;
        codepoints[1] = 0x000D;
        codepoints[2] = 0x0085;
        codepoints[3] = 0x00A0;
        codepoints[4] = 0x1680;
        codepoints[5] = 0x2000;
        codepoints[6] = 0x200A;
        codepoints[7] = 0x2028;
        codepoints[8] = 0x2029;
        codepoints[9] = 0x202F;
        codepoints[10] = 0x205F;
        codepoints[11] = 0x3000;
        codepoints[12] = 0x00AD;
        codepoints[13] = 0x034F;
        codepoints[14] = 0x061C;
        codepoints[15] = 0x115F;
        codepoints[16] = 0x1160;
        codepoints[17] = 0x17B4;
        codepoints[18] = 0x17B5;
        codepoints[19] = 0x180B;
        codepoints[20] = 0x180F;
        codepoints[21] = 0x200B;
        codepoints[22] = 0x200C;
        codepoints[23] = 0x200D;
        codepoints[24] = 0x200E;
        codepoints[25] = 0x200F;
        codepoints[26] = 0x202A;
        codepoints[27] = 0x202E;
        codepoints[28] = 0x2060;
        codepoints[29] = 0x2066;
        codepoints[30] = 0x2069;
        codepoints[31] = 0x206F;
        codepoints[32] = 0x3164;
        codepoints[33] = 0xFE00;
        codepoints[34] = 0xFE0F;
        codepoints[35] = 0xFEFF;
        codepoints[36] = 0xFFA0;
        codepoints[37] = 0xFFF0;
        codepoints[38] = 0xFFF8;
        codepoints[39] = 0x1BCA0;
        codepoints[40] = 0x1BCA3;
        codepoints[41] = 0x1D173;
        codepoints[42] = 0x1D17A;
        codepoints[43] = 0xE0000;
        codepoints[44] = 0xE0FFF;
        codepoints[45] = 0xFDD0;
        codepoints[46] = 0xFDEF;
        codepoints[47] = 0xFFFE;
        codepoints[48] = 0xFFFF;
        codepoints[49] = 0x1FFFE;
        codepoints[50] = 0x1FFFF;
        codepoints[51] = 0x2FFFE;
        codepoints[52] = 0x2FFFF;
        codepoints[53] = 0x3FFFE;
        codepoints[54] = 0x3FFFF;
        codepoints[55] = 0x4FFFE;
        codepoints[56] = 0x4FFFF;
        codepoints[57] = 0x5FFFE;
        codepoints[58] = 0x5FFFF;
        codepoints[59] = 0x6FFFE;
        codepoints[60] = 0x6FFFF;
        codepoints[61] = 0x7FFFE;
        codepoints[62] = 0x7FFFF;
        codepoints[63] = 0x8FFFE;
        codepoints[64] = 0x8FFFF;
        codepoints[65] = 0x9FFFE;
        codepoints[66] = 0x9FFFF;
        codepoints[67] = 0xAFFFE;
        codepoints[68] = 0xAFFFF;
        codepoints[69] = 0xBFFFE;
        codepoints[70] = 0xBFFFF;
        codepoints[71] = 0xCFFFE;
        codepoints[72] = 0xCFFFF;
        codepoints[73] = 0xDFFFE;
        codepoints[74] = 0xDFFFF;
        codepoints[75] = 0xEFFFE;
        codepoints[76] = 0xEFFFF;
        codepoints[77] = 0xFFFFE;
        codepoints[78] = 0xFFFFF;
        codepoints[79] = 0x10FFFE;
        codepoints[80] = 0x10FFFF;

        for (uint256 i = 0; i < codepoints.length; i++) {
            _expectPromptCharacterRevert(_utf8(codepoints[i]), codepoints[i]);
        }
    }

    function testFuzzRawPromptNeverPanics(bytes memory rawPrompt) public view {
        if (rawPrompt.length > 65) {
            assembly ("memory-safe") {
                mstore(rawPrompt, 65)
            }
        }
        (bool ok, bytes memory result) =
            address(token).staticcall(abi.encodeWithSelector(ThoughtNFT.binaryField.selector, string(rawPrompt), "A"));
        if (ok) {
            bytes memory field = abi.decode(result, (bytes));
            require(rawPrompt.length >= 1 && rawPrompt.length <= 64, "accepted invalid byte length");
            require(field.length == 128, "accepted field length mismatch");
            return;
        }

        require(_revertSelector(result) != 0x4e487b71, "validator panicked");
    }

    function testFuzzBinaryFieldMatchesIndependentReference(
        bytes32 promptSeed,
        bytes32 agentSeed,
        uint8 promptLengthSeed,
        uint8 agentLengthSeed
    ) public view {
        uint256 promptLength = uint256(promptLengthSeed) % 64 + 1;
        uint256 agentLength = uint256(agentLengthSeed) % 64 + 1;
        bytes memory prompt = _visibleAscii(promptSeed, promptLength);
        bytes memory agent = _visibleAscii(agentSeed, agentLength);
        bytes memory actual = token.binaryField(string(prompt), string(agent));
        bytes memory expected = _referenceBinaryField(prompt, agent);
        require(_bytesEqual(actual, expected), "optimized field differs from reference");
    }

    function testSpacingRulesRejectOuterSpacesAndPreserveRepeatedInternalSpaces() public {
        _expectMintRevert(
            _input(" leading", "VALID AGENT", 1, USER_KEY),
            abi.encodeWithSelector(ThoughtNFT.InvalidDisplaySpacing.selector, ThoughtNFT.DisplayKind.Prompt)
        );
        _expectMintRevert(
            _input("trailing ", "VALID AGENT", 2, USER_KEY),
            abi.encodeWithSelector(ThoughtNFT.InvalidDisplaySpacing.selector, ThoughtNFT.DisplayKind.Prompt)
        );
        uint256 promptTokenId = _mintAsUser("double  space", "VALID AGENT", 3);
        uint256 agentTokenId = _mintAsUser("valid prompt", "DOUBLE  SPACE", 4);
        require(_equal(token.promptLineOf(promptTokenId), "double  space"), "prompt spaces changed");
        require(_equal(token.agentLineOf(agentTokenId), "DOUBLE  SPACE"), "agent spaces changed");
    }

    function testLetterCaseIsPreservedExactly() public {
        uint256 mixedCaseTokenId = _mintAsUser("UPPER Prompt", "lower Agent", 1);
        require(_equal(token.promptLineOf(mixedCaseTokenId), "UPPER Prompt"), "prompt case changed");
        require(_equal(token.agentLineOf(mixedCaseTokenId), "lower Agent"), "agent case changed");

        uint256 tokenId = _mintAsUser(unicode"你好", unicode"你好", 2);
        require(_equal(token.promptLineOf(tokenId), unicode"你好"), "non-latin prompt changed");
        require(_equal(token.agentLineOf(tokenId), unicode"你好"), "non-latin agent changed");
    }

    function testBothLinesUseExact64ByteLimit() public {
        require(token.MAX_PROMPT_LINE_BYTES() == 64, "prompt byte limit changed");
        require(token.MAX_AGENT_LINE_BYTES() == 64, "agent byte limit changed");
        _mintAsUser(_repeat("a", 64), _repeat("A", 64), 1);

        _expectMintRevert(
            _input(_repeat("a", token.MAX_PROMPT_LINE_BYTES() + 1), "VALID AGENT", 2, USER_KEY),
            abi.encodeWithSelector(
                ThoughtNFT.DisplayLineTooLarge.selector,
                ThoughtNFT.DisplayKind.Prompt,
                token.MAX_PROMPT_LINE_BYTES() + 1,
                token.MAX_PROMPT_LINE_BYTES()
            )
        );
        _expectMintRevert(
            _input("valid prompt", _repeat("A", token.MAX_AGENT_LINE_BYTES() + 1), 3, USER_KEY),
            abi.encodeWithSelector(
                ThoughtNFT.DisplayLineTooLarge.selector,
                ThoughtNFT.DisplayKind.Agent,
                token.MAX_AGENT_LINE_BYTES() + 1,
                token.MAX_AGENT_LINE_BYTES()
            )
        );
    }

    function testAgentLineUniquenessRejectsChangedPromptBeforePathConsumption() public {
        _mintAsUser("same prompt", "FIRST AGENT", 1);
        uint256 beforeCalls = path.consumeCallCount();

        ThoughtNFT.MintThoughtInput memory duplicate = _input("other prompt", "FIRST AGENT", 2, USER_KEY);
        bytes32 agentLineHash = keccak256(bytes(duplicate.agentLine));
        bytes32 agentIdentity = token.agentIdentityHash(agentLineHash);
        _expectMintRevert(
            duplicate, abi.encodeWithSelector(ThoughtNFT.AgentLineAlreadyMinted.selector, agentIdentity, uint256(1))
        );
        require(path.consumeCallCount() == beforeCalls, "duplicate called path");
        require(!path.thoughtConsumed(2), "duplicate consumed path");
        require(token.tokenOfAgentLineHash(agentLineHash) == 1, "agent hash lookup mismatch");
    }

    function testAgentLineUniquenessAllowsSharedPromptAndExactByteVariants() public {
        _mintAsUser("same prompt", "FIRST AGENT", 1);
        _mintAsUser("same prompt", "SECOND AGENT", 2);
        _mintAsUser("other prompt", "First Agent", 3);
        _mintAsUser("unicode prompt", unicode"FIRST ÁGENT", 4);
        _mintAsUser("combining prompt", unicode"FIRST ÁGENT", 5);
        require(token.totalSupply() == 5, "different agent lines should mint");

        bytes memory firstPromptField = token.binaryField("same prompt", "FIRST AGENT");
        bytes memory changedPromptField = token.binaryField("other prompt", "FIRST AGENT");
        require(!_bytesEqual(firstPromptField, changedPromptField), "prompt must affect binary field");
    }

    function testAgentIdentityUsesOnlyExactAgentBytesAndWorkUsesBothLines() public view {
        bytes32 firstPromptHash = keccak256(bytes("first prompt"));
        bytes32 secondPromptHash = keccak256(bytes("second prompt"));
        bytes32 firstAgentHash = keccak256(bytes("FIRST AGENT"));
        bytes32 caseAgentHash = keccak256(bytes("First Agent"));
        bytes32 precomposedAgentHash = keccak256(bytes(unicode"Á"));
        bytes32 combiningAgentHash = keccak256(bytes(unicode"Á"));

        bytes32 identity = token.agentIdentityHash(firstAgentHash);
        require(identity == token.agentIdentityHash(firstAgentHash), "prompt changed Agent identity");
        require(identity != token.agentIdentityHash(caseAgentHash), "case-distinct Agent identity collapsed");
        require(
            token.agentIdentityHash(precomposedAgentHash) != token.agentIdentityHash(combiningAgentHash),
            "combining Agent identity normalized"
        );

        bytes32 firstFieldHash = keccak256(token.binaryField("first prompt", "FIRST AGENT"));
        bytes32 secondFieldHash = keccak256(token.binaryField("second prompt", "FIRST AGENT"));
        bytes32 firstWorkHash = token.workHash(firstPromptHash, firstAgentHash, firstFieldHash);
        bytes32 secondWorkHash = token.workHash(secondPromptHash, firstAgentHash, secondFieldHash);
        require(firstWorkHash != secondWorkHash, "prompt did not change work identity");

        bytes32 changedAgentFieldHash = keccak256(token.binaryField("first prompt", "First Agent"));
        bytes32 changedAgentWorkHash = token.workHash(firstPromptHash, caseAgentHash, changedAgentFieldHash);
        require(firstWorkHash != changedAgentWorkHash, "Agent did not change work identity");
    }

    function testSvgAndMetadataUseFormalTwoLineRenderer() public {
        uint256 tokenId = _mintAsUser("a&b<c>\"'", "A&B<C>\"'", 1);
        string memory svg = token.svgOf(tokenId);
        string memory metadata = _metadataJsonFromTokenUri(token.tokenURI(tokenId));

        require(!_contains(svg, 'id="work-frame"'), "svg should not include an outer work frame");
        require(!_contains(svg, 'id="work-canvas"'), "svg should not scale the canvas through a wrapper");
        require(_contains(svg, '<rect id="canvas-bg" width="960" height="960" fill="#000000"/>'), "missing black bg");
        require(_contains(svg, 'id="binary-background"'), "missing binary background");
        require(_contains(svg, 'data-pack="msb-first-128-bytes"'), "binary packing metadata missing");
        require(_contains(svg, 'opacity="1"'), "binary background opacity mismatch");
        require(_contains(svg, '<circle id="binary-one"'), "binary background should render circles");
        require(_count(svg, 'text-anchor="middle"') == 2, "both lines should be centered");
        require(
            _contains(svg, '<clipPath id="agent-line-clip"><rect x="94" y="373" width="772" height="74" rx="9"/>'),
            "agent clip mismatch"
        );
        require(
            _contains(svg, '<clipPath id="prompt-line-clip"><rect x="150" y="821" width="660" height="46" rx="9"/>'),
            "prompt clip mismatch"
        );
        require(
            _contains(svg, 'font-size="44" fill="#ffffff" clip-path="url(#agent-line-clip)"'),
            "agent typography mismatch"
        );
        require(
            _contains(svg, 'font-size="16" fill="#ffffff" clip-path="url(#prompt-line-clip)"'),
            "prompt typography mismatch"
        );
        require(!_contains(svg, "PROMPT:"), "svg should not label prompt");
        require(!_contains(svg, "AGENT:"), "svg should not label agent");
        require(!_contains(svg, "Color Font"), "svg contains color font text");
        require(!_contains(svg, "colorFont"), "svg contains color font field");
        require(_contains(svg, "A&amp;B&lt;C&gt;&quot;&apos;"), "agent xml escaping failed");
        require(_contains(svg, "a&amp;b&lt;c&gt;&quot;&apos;"), "prompt xml escaping failed");

        require(_contains(metadata, '"name":"THOUGHT #1"'), "metadata name missing");
        require(_contains(metadata, '"image":"data:image/svg+xml;base64,'), "metadata image missing");
        require(
            _contains(metadata, '"description":"A human prompt transformed by an Agent into a fully onchain work."'),
            "description missing"
        );
        require(_contains(metadata, '"trait_type":"Prompt","value":"a&b<c>\\\"\'"'), "prompt trait missing");
        require(_contains(metadata, '"trait_type":"Agent Response","value":"A&B<C>\\\"\'"'), "Agent trait missing");
        require(_contains(metadata, '"trait_type":"Texture Density","value":"'), "density trait missing");
        require(_contains(metadata, '"trait_type":"Binary Contrast","value":"'), "contrast trait missing");
        require(_contains(metadata, '"trait_type":"Protocol","value":"V2"'), "protocol trait missing");
        require(
            _contains(metadata, '"renderer":"inshell.thought.svg.v2.binary-weave-32"'),
            "thought object missing renderer"
        );
        require(_contains(metadata, '"binaryFieldPacked":"0x'), "thought object missing packed binary field");
        require(_contains(metadata, '"binaryFieldKeccak256":"0x'), "binary field hash missing");
        require(_contains(metadata, '"agentIdentityHash":"0x'), "agent identity hash missing");
        require(_contains(metadata, '"protocolReleaseId":"0x'), "protocol release ID missing");
        require(_contains(metadata, '"manifestKeccak256":"0x'), "manifest hash missing");
        require(_contains(metadata, '"promptWeight":'), "prompt weight missing");
        require(_contains(metadata, '"agentWeight":'), "Agent weight missing");
        require(_contains(metadata, '"loomWeight":'), "loom weight missing");
        require(_contains(metadata, '"bitDistance":'), "bit distance missing");
        require(_contains(metadata, "\"promptLine\":\"a&b<c>\\\"'\""), "prompt metadata escaping failed");
        require(_contains(metadata, "\"agentLine\":\"A&B<C>\\\"'\""), "agent metadata escaping failed");
        require(_contains(metadata, '"provenanceHash":"'), "provenance hash missing");
        require(!_contains(metadata, "Color Font"), "metadata contains color font text");
        require(!_contains(metadata, "colorFont"), "metadata contains color font field");
        require(!_contains(metadata, DEFAULT_SPEC_TEXT), "metadata embeds full spec text");
    }

    function testRendererQueryGasBudget() public {
        uint256 tokenId = _mintAsUser("query budget", "QUERY BUDGET", 1);

        uint256 beforeSvg = gasleft();
        string memory svg = token.svgOf(tokenId);
        uint256 svgGas = beforeSvg - gasleft();
        require(bytes(svg).length > 0, "svg missing");
        require(svgGas < 10_000_000, "svg query exceeds renderer gas budget");

        uint256 beforeTokenUri = gasleft();
        string memory uri = token.tokenURI(tokenId);
        uint256 tokenUriGas = beforeTokenUri - gasleft();
        require(bytes(uri).length > 0, "token uri missing");
        require(tokenUriGas < 18_000_000, "token uri query exceeds renderer gas budget");
    }

    function testGasProfileMintOneByteLines() public {
        _measureMint("mint.lines.1", "a", "A");
    }

    function testGasProfileDeploymentsAndRegularErc721Baseline() public {
        uint256 beforeBaseline = gasleft();
        RegularErc721Baseline baseline = new RegularErc721Baseline("BASELINE", "BASE");
        uint256 baselineDeploymentGas = beforeBaseline - gasleft();
        emit GasProfile("deploy.regular-erc721-baseline", baselineDeploymentGas, address(baseline).code.length);

        uint256 beforeRenderer = gasleft();
        ThoughtRenderer measuredRenderer = new ThoughtRenderer();
        uint256 rendererDeploymentGas = beforeRenderer - gasleft();
        emit GasProfile("deploy.thought-renderer", rendererDeploymentGas, address(measuredRenderer).code.length);

        uint256 beforeToken = gasleft();
        ThoughtNFT measuredToken = new ThoughtNFT(
            address(path), address(registry), address(measuredRenderer), address(protocolRegistry), protocolReleaseId
        );
        uint256 tokenDeploymentGas = beforeToken - gasleft();
        emit GasProfile("deploy.thought-nft", tokenDeploymentGas, address(measuredToken).code.length);
        require(
            rendererDeploymentGas + tokenDeploymentGas <= APPROVED_MAX_COMBINED_DEPLOYMENT_GAS,
            "combined deployment exceeds approved gas budget"
        );
    }

    function testGasProfilePathConsumeUnit() public {
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        bytes32 movement = token.THOUGHT_MOVEMENT();
        vm.prank(address(token));
        uint256 beforeCall = gasleft();
        path.consumeUnit(1, movement, user, auth.deadline, auth.signature);
        uint256 gasUsed = beforeCall - gasleft();
        emit GasProfile("path.consume-unit", gasUsed, 0);
    }

    function testGasProfileMintThirtyOneByteLines() public {
        _measureMint("mint.lines.31", _repeat("a", 31), _repeat("A", 31));
    }

    function testGasProfileMintThirtyTwoByteLines() public {
        _measureMint("mint.lines.32", _repeat("a", 32), _repeat("A", 32));
    }

    function testGasProfileMintThirtyThreeByteLines() public {
        _measureMint("mint.lines.33", _repeat("a", 33), _repeat("A", 33));
    }

    function testGasProfileMintSixtyThreeByteLines() public {
        _measureMint("mint.lines.63", _repeat("a", 63), _repeat("A", 63));
    }

    function testGasProfileMintSixtyFourByteLines() public {
        _measureMint("mint.lines.64", _repeat("a", 64), _repeat("A", 64));
    }

    function testGasProfileWorstValidFourByteUnicodeLines() public {
        _measureMint(
            "mint.lines.unicode64",
            unicode"😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀😀",
            unicode"😁😁😁😁😁😁😁😁😁😁😁😁😁😁😁😁"
        );
    }

    function testGasProfileBinaryFieldOneByteLines() public {
        uint256 gasBefore = gasleft();
        bytes memory field = token.binaryField("a", "A");
        uint256 gasUsed = gasBefore - gasleft();
        require(field.length == 128, "binary field length mismatch");
        emit GasProfile("binary-field.lines.1", gasUsed, field.length);
    }

    function testGasProfileBinaryFieldSixtyFourByteLines() public {
        uint256 gasBefore = gasleft();
        bytes memory field = token.binaryField(_repeat("a", 64), _repeat("A", 64));
        uint256 gasUsed = gasBefore - gasleft();
        require(field.length == 128, "binary field length mismatch");
        emit GasProfile("binary-field.lines.64", gasUsed, field.length);
    }

    function testGasProfileMalformedUtf8Rejection() public {
        bytes memory malformed = hex"c0af";
        ThoughtNFT.MintThoughtInput memory input = _input(string(malformed), "VALID AGENT", 1, USER_KEY);
        vm.prank(user);
        uint256 beforeCall = gasleft();
        (bool ok,) = address(token).call(abi.encodeWithSelector(ThoughtNFT.mint.selector, input));
        uint256 gasUsed = beforeCall - gasleft();
        require(!ok, "malformed UTF-8 should revert");
        emit GasProfile("mint.reject.malformed-utf8", gasUsed, 0);
    }

    function testGasProfileSvgResponseOnly() public {
        uint256 tokenId = _mintAsUser("query budget", "QUERY BUDGET", 1);

        uint256 beforeSvg = gasleft();
        string memory svg = token.svgOf(tokenId);
        uint256 svgGas = beforeSvg - gasleft();
        emit GasProfile("svgOf.short", svgGas, bytes(svg).length);
    }

    function testGasProfileTokenUriResponseOnly() public {
        uint256 tokenId = _mintAsUser("query budget", "QUERY BUDGET", 1);
        uint256 beforeTokenUri = gasleft();
        string memory uri = token.tokenURI(tokenId);
        uint256 tokenUriGas = beforeTokenUri - gasleft();
        emit GasProfile("tokenURI.short", tokenUriGas, bytes(uri).length);
    }

    function testGasProfileMaximumProvenanceMintAndRead() public {
        string memory provenance = string.concat('{"payload":"', _repeat("p", token.MAX_PROVENANCE_BYTES() - 14), '"}');
        require(bytes(provenance).length == token.MAX_PROVENANCE_BYTES(), "maximum provenance fixture mismatch");
        ThoughtNFT.MintThoughtInput memory input =
            _input("max provenance", "MAX PROVENANCE", 1, USER_KEY, defaultSpecId, defaultSpecHash, provenance);

        vm.prank(user);
        uint256 beforeMint = gasleft();
        uint256 tokenId = token.mint(input);
        uint256 mintGas = beforeMint - gasleft();
        emit GasProfile("mint.provenance.20000", mintGas, bytes(provenance).length);

        uint256 beforeRead = gasleft();
        string memory returnedProvenance = token.provenanceOf(tokenId);
        uint256 readGas = beforeRead - gasleft();
        require(keccak256(bytes(returnedProvenance)) == keccak256(bytes(provenance)), "provenance read mismatch");
        emit GasProfile("provenanceOf.20000", readGas, bytes(returnedProvenance).length);
    }

    function testSvgBinaryBackgroundUsesOrthogonalBinaryWeave() public {
        uint256 tokenId = _mintAsUser("ab", "C", 1);
        string memory svg = token.svgOf(tokenId);
        bytes memory field = token.binaryField("ab", "C");
        uint256 expectedOnes = _packedVisibleOneCount(field);

        require(_contains(svg, 'id="binary-background"'), "missing binary background");
        require(_contains(svg, 'fill="#006100"'), "binary background should use canonical green");
        require(_contains(svg, 'data-grid-columns="32"'), "binary background should use fixed square grid columns");
        require(_contains(svg, 'data-grid-rows="32"'), "binary background should use fixed square grid rows");
        require(_contains(svg, 'data-bit-capacity="1024"'), "binary background should use fixed capacity");
        require(_contains(svg, 'data-prompt-bit-positions="512"'), "prompt allocation mismatch");
        require(_contains(svg, 'data-agent-bit-positions="512"'), "agent allocation mismatch");
        require(_contains(svg, 'data-pack="msb-first-128-bytes"'), "packing metadata mismatch");
        require(_contains(svg, 'data-rendered-cells="840"'), "binary background should clear text block cells");
        require(_contains(svg, 'data-cleared-cells="184"'), "binary background should expose cleared cells");
        require(_contains(svg, 'data-cell-size="24"'), "binary background should use fixed equal square cells");
        require(_contains(svg, 'data-origin-x="96"'), "binary background should center grid horizontally");
        require(_contains(svg, 'data-origin-y="96"'), "binary background should center grid vertically");
        require(_contains(svg, '<circle id="binary-one" r="6" fill="#006100"/>'), "one bit circle missing");
        require(
            _contains(
                svg,
                '<pattern id="binary-zero-pattern" x="96" y="96" width="24" height="24" patternUnits="userSpaceOnUse"><circle id="binary-zero" cx="12" cy="12" r="7" fill="none" stroke="#006100" stroke-width="2"/></pattern>'
            ),
            "zero bit pattern missing"
        );
        require(
            _contains(
                svg,
                '<rect id="binary-zero-field" x="96" y="96" width="768" height="768" fill="url(#binary-zero-pattern)"/>'
            ),
            "zero field missing"
        );
        require(
            _contains(svg, '<rect id="agent-text-clear" x="92" y="372" width="776" height="76" fill="#000000"/>'),
            "agent clear missing"
        );
        require(
            _contains(svg, '<rect id="prompt-text-clear" x="148" y="820" width="664" height="48" fill="#000000"/>'),
            "prompt clear missing"
        );
        require(_count(svg, '<use href="#binary-one"') == expectedOnes, "one bits should match packed field");
        require(!_contains(svg, "&#9679;"), "binary background should not use text glyph circles");
        require(!_contains(svg, "textLength="), "binary background should not use text spacing");
        require(!_contains(svg, "01100001"), "binary background should not render literal zeros and ones");
        require(!_contains(svg, "01100001 01100010 01000011"), "binary background should not repeat byte tokens");

        uint256 denseTokenId = _mintAsUser(_repeat("a", 64), _repeat("B", 64), 2);
        string memory denseSvg = token.svgOf(denseTokenId);
        require(_contains(denseSvg, 'data-cell-size="24"'), "dense binary background should keep fixed cells");

        uint256 longTokenId = _mintAsUser(_repeat(unicode"你", 21), "B", 3);
        string memory longSvg = token.svgOf(longTokenId);
        require(_contains(longSvg, 'data-cell-size="24"'), "long binary background should keep fixed cells");
    }

    function testBinaryFieldIsExactly128BytesAndUsesOrthogonalCheckerboard() public {
        bytes memory field = token.binaryField("a", "b");
        require(field.length == token.BINARY_FIELD_BYTES(), "packed binary field length mismatch");

        bytes memory prompt = bytes("a");
        bytes memory agent = bytes("b");
        for (uint256 row = 0; row < 32; row++) {
            for (uint256 column = 0; column < 32; column++) {
                uint256 fieldIndex = row * 32 + column;
                if ((row + column) % 2 == 0) {
                    uint256 promptIndex = row * 16 + column / 2;
                    require(
                        _packedBit(field, fieldIndex) == _sourceBit(prompt, promptIndex % 8), "prompt weave mismatch"
                    );
                } else {
                    uint256 agentIndex = column * 16 + row / 2;
                    require(_packedBit(field, fieldIndex) == _sourceBit(agent, agentIndex % 8), "agent weave mismatch");
                }
            }
        }

        uint256 tokenId = _mintAsUser("a", "b", 1);
        require(_bytesEqual(token.binaryFieldOf(tokenId), field), "stored binary field mismatch");
        require(token.binaryFieldKeccak256Of(tokenId) == keccak256(field), "stored field hash mismatch");

        bytes memory boundary = token.binaryField(_repeat("a", 64), _repeat("b", 64));
        require(boundary.length == 128, "boundary packed field length mismatch");
    }

    function testNormativeCapitalABPackedFieldVector() public view {
        bytes memory expected =
            hex"200220021001100175577557baabbaab200220021001100120022002100110012002200210011001200220021001100175577557baabbaab2002200210011001200220021001100175577557baabbaab200220021001100120022002100110012002200210011001200220021001100175577557baabbaab2002200210011001";
        require(_bytesEqual(token.binaryField("A", "B"), expected), "normative A/B field mismatch");
    }

    function testDistinctSixtyFourByteDirectionDiagnosticVector() public view {
        string memory prompt = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        string memory agent = "/+9876543210zyxwvutsrqponmlkjihgfedcbaZYXWVUTSRQPONMLKJIHGFEDCBA";
        bytes memory expected =
            hex"20022008100510102177757d12bfbaea75d76088baefb05075f235a83af51b8063073258930f19383266666cb19d9362228237ddbeabb4047c0a2820bc111414282a28801441144429df7df516fbbefe7dff6a00bfabb5047f4a3f203fb11f146a3e3ad0974b15e41b110e46258c8d8d0b754a22ad140fbf0bd55fd786efaeff";
        bytes memory actual = token.binaryField(prompt, agent);
        require(_bytesEqual(actual, expected), "64-byte direction vector mismatch");
        require(
            keccak256(actual) == 0x4d93c30effd46629ffa92070d1a16533e6438dea159a5a8ab2171d3f013beb7e,
            "64-byte direction hash mismatch"
        );
    }

    function testCyclingFieldCollisionDoesNotCollapseWorkIdentity() public view {
        bytes memory firstField = token.binaryField("a", "b");
        bytes memory secondField = token.binaryField("aa", "bb");
        require(_bytesEqual(firstField, secondField), "expected deliberate cycling collision");

        bytes32 firstPromptHash = keccak256(bytes("a"));
        bytes32 firstAgentHash = keccak256(bytes("b"));
        bytes32 secondPromptHash = keccak256(bytes("aa"));
        bytes32 secondAgentHash = keccak256(bytes("bb"));
        require(
            token.workHash(firstPromptHash, firstAgentHash, keccak256(firstField))
                != token.workHash(secondPromptHash, secondAgentHash, keccak256(secondField)),
            "field collision collapsed work identity"
        );
        require(
            token.agentIdentityHash(firstAgentHash) != token.agentIdentityHash(secondAgentHash),
            "field collision collapsed Agent identity"
        );
    }

    function testRuntimeCodeSizesRemainDeployable() public view {
        require(address(token).code.length <= 22 * 1024, "ThoughtNFT exceeds target runtime size");
        require(address(renderer).code.length < 24_576, "ThoughtRenderer exceeds EIP-170 runtime limit");
    }

    function testTypeScriptGoldenSvgAndTokenUriImageMatchExactly() public {
        vm.warp(1_700_000_000);
        uint256 tokenId = _mintAsUser("a", "b", 1);
        string memory svg = token.svgOf(tokenId);
        require(
            keccak256(bytes(svg)) == 0x0b9311310a8f9c5a615a766f384eec8bfb9b0a07f400416b34d771717c00f5ca,
            "TypeScript/Solidity SVG mismatch"
        );
        string memory metadata = _metadataJsonFromTokenUri(token.tokenURI(tokenId));
        string memory embeddedSvg = _svgFromMetadata(metadata);
        require(keccak256(bytes(embeddedSvg)) == keccak256(bytes(svg)), "tokenURI SVG mismatch");
        require(
            keccak256(bytes(token.tokenURI(tokenId)))
                == 0x8565890ca125fd9feb741173fde3383dbced208c3d20b8002790ddee660a8522,
            "TypeScript/Solidity tokenURI mismatch"
        );
    }

    function testManualDirectMintDoesNotRequireAgentReceipt() public {
        ThoughtNFT.MintThoughtInput memory input = _input(
            "manual prompt",
            "manual result",
            1,
            USER_KEY,
            defaultSpecId,
            defaultSpecHash,
            '{"schema":"thought.provenance.v2","promptLine":"manual prompt","agentLine":"manual result"}'
        );

        vm.prank(user);
        uint256 tokenId = token.mint(input);
        require(tokenId == 1, "manual mint token id mismatch");
        require(token.ownerOf(tokenId) == user, "manual mint owner mismatch");
        require(path.thoughtConsumed(1), "manual mint did not consume path");
    }

    function testMaximumLinesUseCanonicalCarouselWithoutTextSqueezing() public {
        uint256 shortTokenId = _mintAsUser("short", "SHORT", 1);
        string memory shortSvg = token.svgOf(shortTokenId);
        require(!_contains(shortSvg, "<animate"), "short lines should remain static");

        uint256 longTokenId = _mintAsUser(_repeat("a", 64), _repeat("A", 64), 2);
        string memory longSvg = token.svgOf(longTokenId);
        require(_contains(longSvg, '<g id="agent-line-carousel">'), "long Agent should use carousel");
        require(!_contains(longSvg, '<g id="prompt-line-carousel">'), "64-byte ASCII prompt should remain static");
        require(_contains(longSvg, '<animate attributeName="x"'), "carousel animation missing");
        require(!_contains(longSvg, "textLength="), "canonical carousel must not squeeze glyphs");
        require(!_contains(longSvg, 'lengthAdjust="spacingAndGlyphs"'), "canonical carousel must not length-adjust");
    }

    function testLegalLongAgentUsesCarouselWithShortPrompt() public {
        uint256 tokenId = _mintAsUser("short", _repeat("A", 27), 1);
        string memory svg = token.svgOf(tokenId);
        require(_contains(svg, '<g id="agent-line-carousel">'), "long Agent should use carousel");
        require(!_contains(svg, '<g id="prompt-line-carousel">'), "short prompt should remain static");
    }

    function testActiveApiSurfaceRemovesLegacyPreviewAndColorFontHelpers() public {
        _mintAsUser("surface prompt", "SURFACE AGENT", 1);
        require(bytes(token.svgOf(1)).length > 0, "svgOf missing");
        require(bytes(token.tokenURI(1)).length > 0, "tokenURI missing");

        (bool previewWorkOk,) = address(token).staticcall(abi.encodeWithSignature("previewWork(string)", "RETURN"));
        (bool previewTextOk,) = address(token).staticcall(abi.encodeWithSignature("previewText(string)", "RETURN"));
        (bool normalizeThoughtOk,) =
            address(token).staticcall(abi.encodeWithSignature("normalizeThought(string)", "RETURN"));
        (bool normalizeTextOk,) = address(token).staticcall(abi.encodeWithSignature("normalizeText(string)", "RETURN"));
        (bool renderThoughtSvgOk,) =
            address(token).staticcall(abi.encodeWithSignature("renderThoughtSvg(string)", "RETURN"));
        (bool colorFontOk,) = address(token).staticcall(abi.encodeWithSignature("colorFont()"));
        (bool colorFontDataOk,) = address(token).staticcall(abi.encodeWithSignature("colorFontData()"));

        require(!previewWorkOk, "previewWork should not exist");
        require(!previewTextOk, "previewText should not exist");
        require(!normalizeThoughtOk, "normalizeThought should not exist");
        require(!normalizeTextOk, "normalizeText should not exist");
        require(!renderThoughtSvgOk, "renderThoughtSvg should not exist");
        require(!colorFontOk, "colorFont should not exist");
        require(!colorFontDataOk, "colorFontData should not exist");
    }

    struct ConsumeAuth {
        uint256 deadline;
        bytes signature;
    }

    function _mintAsUser(string memory promptLine, string memory agentLine, uint256 pathId)
        private
        returns (uint256 tokenId)
    {
        ThoughtNFT.MintThoughtInput memory input = _input(promptLine, agentLine, pathId, USER_KEY);
        vm.prank(user);
        return token.mint(input);
    }

    function _measureMint(string memory metric, string memory promptLine, string memory agentLine) private {
        ThoughtNFT.MintThoughtInput memory input = _input(promptLine, agentLine, 1, USER_KEY);
        vm.prank(user);
        uint256 beforeCall = gasleft();
        token.mint(input);
        uint256 gasUsed = beforeCall - gasleft();
        require(gasUsed <= APPROVED_MAX_COMPLETE_MINT_GAS, "mint exceeds approved complete gas budget");
        emit GasProfile(metric, gasUsed, 0);
    }

    function _input(string memory promptLine, string memory agentLine, uint256 pathId, uint256 privateKey)
        private
        returns (ThoughtNFT.MintThoughtInput memory input)
    {
        return _input(promptLine, agentLine, pathId, privateKey, defaultSpecId, defaultSpecHash, DEFAULT_PROVENANCE);
    }

    function _input(
        string memory promptLine,
        string memory agentLine,
        uint256 pathId,
        uint256 privateKey,
        bytes32 specId,
        bytes32 specHash,
        string memory provenance
    ) private returns (ThoughtNFT.MintThoughtInput memory input) {
        ConsumeAuth memory auth = _signConsume(pathId, privateKey);
        input = ThoughtNFT.MintThoughtInput({
            promptLine: promptLine,
            agentLine: agentLine,
            pathId: pathId,
            thoughtSpecId: specId,
            thoughtSpecHash: specHash,
            provenanceJson: provenance,
            deadline: auth.deadline,
            pathSignature: auth.signature
        });
    }

    function _signConsume(uint256 pathId, uint256 privateKey) private returns (ConsumeAuth memory auth) {
        address claimer = vm.addr(privateKey);
        auth.deadline = block.timestamp + 1 hours;
        uint256 nonce = path.getConsumeNonce(claimer);
        bytes32 structHash = keccak256(
            abi.encode(
                CONSUME_AUTHORIZATION_TYPEHASH,
                address(path),
                uint256(block.chainid),
                pathId,
                token.THOUGHT_MOVEMENT(),
                claimer,
                address(token),
                nonce,
                auth.deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        auth.signature = abi.encodePacked(r, s, v);
    }

    function _expectMintRevert(ThoughtNFT.MintThoughtInput memory input, bytes memory revertData) private {
        vm.prank(user);
        vm.expectRevert(revertData);
        token.mint(input);
    }

    function _expectMintStringRevert(ThoughtNFT.MintThoughtInput memory input, string memory reason) private {
        vm.prank(user);
        vm.expectRevert(bytes(reason));
        token.mint(input);
    }

    function _expectPromptUtf8Revert(bytes memory rawPromptLine) private {
        ThoughtNFT.MintThoughtInput memory input = _input(string(rawPromptLine), "VALID AGENT", 1, USER_KEY);
        vm.prank(user);
        (bool ok, bytes memory result) = address(token).call(abi.encodeWithSelector(token.mint.selector, input));
        require(!ok, "malformed raw calldata should revert");
        require(
            _bytesEqual(result, abi.encodeWithSelector(ThoughtNFT.InvalidUtf8.selector, ThoughtNFT.DisplayKind.Prompt)),
            "malformed raw calldata revert mismatch"
        );
        require(path.consumeCallCount() == 0, "invalid utf8 called path");
    }

    function _expectPromptCharacterRevert(bytes memory rawPromptLine, uint256 codepoint) private {
        ThoughtNFT.MintThoughtInput memory input = _input(string(rawPromptLine), "VALID AGENT", 1, USER_KEY);
        vm.prank(user);
        (bool ok, bytes memory result) = address(token).call(abi.encodeWithSelector(token.mint.selector, input));
        require(!ok, "prohibited raw calldata should revert");
        require(
            _bytesEqual(
                result,
                abi.encodeWithSelector(
                    ThoughtNFT.InvalidDisplayCharacter.selector, ThoughtNFT.DisplayKind.Prompt, codepoint
                )
            ),
            "prohibited raw calldata revert mismatch"
        );
        require(path.consumeCallCount() == 0, "invalid character called path");
    }

    function _revertSelector(bytes memory result) private pure returns (bytes4 selector) {
        if (result.length < 4) return bytes4(0);
        assembly ("memory-safe") {
            selector := mload(add(result, 32))
        }
    }

    function _utf8(uint256 codepoint) private pure returns (bytes memory encoded) {
        require(codepoint <= 0x10FFFF && (codepoint < 0xD800 || codepoint > 0xDFFF), "invalid scalar");
        if (codepoint <= 0x7F) {
            encoded = new bytes(1);
            encoded[0] = bytes1(uint8(codepoint));
        } else if (codepoint <= 0x7FF) {
            encoded = new bytes(2);
            encoded[0] = bytes1(uint8(0xC0 | (codepoint >> 6)));
            encoded[1] = bytes1(uint8(0x80 | (codepoint & 0x3F)));
        } else if (codepoint <= 0xFFFF) {
            encoded = new bytes(3);
            encoded[0] = bytes1(uint8(0xE0 | (codepoint >> 12)));
            encoded[1] = bytes1(uint8(0x80 | ((codepoint >> 6) & 0x3F)));
            encoded[2] = bytes1(uint8(0x80 | (codepoint & 0x3F)));
        } else {
            encoded = new bytes(4);
            encoded[0] = bytes1(uint8(0xF0 | (codepoint >> 18)));
            encoded[1] = bytes1(uint8(0x80 | ((codepoint >> 12) & 0x3F)));
            encoded[2] = bytes1(uint8(0x80 | ((codepoint >> 6) & 0x3F)));
            encoded[3] = bytes1(uint8(0x80 | (codepoint & 0x3F)));
        }
    }

    function _visibleAscii(bytes32 seed, uint256 length) private pure returns (bytes memory output) {
        output = new bytes(length);
        for (uint256 i = 0; i < length; i++) {
            output[i] = bytes1(uint8(0x21 + (uint8(seed[i % 32]) % 94)));
        }
    }

    function _referenceBinaryField(bytes memory prompt, bytes memory agent) private pure returns (bytes memory packed) {
        packed = new bytes(128);
        uint256 promptBits = prompt.length * 8;
        uint256 agentBits = agent.length * 8;
        for (uint256 row = 0; row < 32; row++) {
            for (uint256 column = 0; column < 32; column++) {
                uint256 bit;
                if ((row + column) % 2 == 0) {
                    bit = _sourceBit(prompt, (row * 16 + column / 2) % promptBits);
                } else {
                    bit = _sourceBit(agent, (column * 16 + row / 2) % agentBits);
                }
                if (bit != 0) {
                    uint256 fieldIndex = row * 32 + column;
                    packed[fieldIndex / 8] |= bytes1(uint8(uint256(1) << (7 - (fieldIndex % 8))));
                }
            }
        }
    }

    function _metadataJsonFromTokenUri(string memory uri) private pure returns (string memory) {
        bytes memory source = bytes(uri);
        bytes memory prefix = bytes("data:application/json;base64,");
        require(source.length > prefix.length, "token uri too short");
        for (uint256 i = 0; i < prefix.length; i++) {
            require(source[i] == prefix[i], "token uri prefix mismatch");
        }

        bytes memory encoded = new bytes(source.length - prefix.length);
        for (uint256 i = 0; i < encoded.length; i++) {
            encoded[i] = source[prefix.length + i];
        }
        return string(_base64Decode(encoded));
    }

    function _svgFromMetadata(string memory metadata) private pure returns (string memory) {
        bytes memory source = bytes(metadata);
        bytes memory marker = bytes('"image":"data:image/svg+xml;base64,');
        uint256 start = type(uint256).max;
        for (uint256 i = 0; i + marker.length <= source.length; i++) {
            bool match_ = true;
            for (uint256 j = 0; j < marker.length; j++) {
                if (source[i + j] != marker[j]) {
                    match_ = false;
                    break;
                }
            }
            if (match_) {
                start = i + marker.length;
                break;
            }
        }
        require(start != type(uint256).max, "image marker missing");
        uint256 end = start;
        while (end < source.length && source[end] != bytes1('"')) end++;
        require(end < source.length, "image terminator missing");
        bytes memory encoded = new bytes(end - start);
        for (uint256 i = 0; i < encoded.length; i++) {
            encoded[i] = source[start + i];
        }
        return string(_base64Decode(encoded));
    }

    function _base64Decode(bytes memory data) private pure returns (bytes memory) {
        require(data.length % 4 == 0, "bad base64 length");
        uint256 padding = 0;
        if (data.length > 0 && data[data.length - 1] == bytes1("=")) {
            padding++;
        }
        if (data.length > 1 && data[data.length - 2] == bytes1("=")) {
            padding++;
        }

        bytes memory output = new bytes((data.length / 4) * 3 - padding);
        uint256 out = 0;
        for (uint256 i = 0; i < data.length; i += 4) {
            uint24 chunk = (uint24(_base64Value(data[i])) << 18) | (uint24(_base64Value(data[i + 1])) << 12)
                | (uint24(_base64Value(data[i + 2])) << 6) | uint24(_base64Value(data[i + 3]));
            if (out < output.length) {
                output[out++] = bytes1(uint8(chunk >> 16));
            }
            if (out < output.length) {
                output[out++] = bytes1(uint8(chunk >> 8));
            }
            if (out < output.length) {
                output[out++] = bytes1(uint8(chunk));
            }
        }
        return output;
    }

    function _base64Value(bytes1 char_) private pure returns (uint8) {
        uint8 code = uint8(char_);
        if (code >= 65 && code <= 90) {
            return code - 65;
        }
        if (code >= 97 && code <= 122) {
            return code - 71;
        }
        if (code >= 48 && code <= 57) {
            return code + 4;
        }
        if (char_ == bytes1("+")) {
            return 62;
        }
        if (char_ == bytes1("/")) {
            return 63;
        }
        if (char_ == bytes1("=")) {
            return 0;
        }
        revert("bad base64 char");
    }

    function _count(string memory haystack, string memory needle) private pure returns (uint256 count) {
        bytes memory source = bytes(haystack);
        bytes memory target = bytes(needle);
        if (target.length == 0 || target.length > source.length) {
            return 0;
        }
        for (uint256 i = 0; i <= source.length - target.length; i++) {
            bool match_ = true;
            for (uint256 j = 0; j < target.length; j++) {
                if (source[i + j] != target[j]) {
                    match_ = false;
                    break;
                }
            }
            if (match_) {
                count++;
            }
        }
    }

    function _contains(string memory haystack, string memory needle) private pure returns (bool) {
        return _count(haystack, needle) > 0;
    }

    function _equal(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }

    function _bytesEqual(bytes memory left, bytes memory right) private pure returns (bool) {
        return keccak256(left) == keccak256(right);
    }

    function _workHashFor(string memory promptLine, string memory agentLine) private view returns (bytes32) {
        bytes32 promptHash = keccak256(bytes(promptLine));
        bytes32 agentHash = keccak256(bytes(agentLine));
        bytes32 binaryHash = keccak256(token.binaryField(promptLine, agentLine));
        return token.workHash(promptHash, agentHash, binaryHash);
    }

    function _packedBit(bytes memory packed, uint256 bitOffset) private pure returns (uint8) {
        return (uint8(packed[bitOffset / 8]) >> (7 - (bitOffset % 8))) & 1;
    }

    function _sourceBit(bytes memory source, uint256 bitOffset) private pure returns (uint8) {
        return (uint8(source[bitOffset / 8]) >> (7 - (bitOffset % 8))) & 1;
    }

    function _packedOneCount(bytes memory packed) private pure returns (uint256 count) {
        for (uint256 i = 0; i < packed.length * 8; i++) {
            count += _packedBit(packed, i);
        }
    }

    function _packedVisibleOneCount(bytes memory packed) private pure returns (uint256 count) {
        for (uint256 i = 0; i < packed.length * 8; i++) {
            uint256 row = i / 32;
            uint256 column = i % 32;
            bool cleared = (row >= 11 && row <= 14) || (row >= 30 && column >= 2 && column <= 29);
            if (!cleared) count += _packedBit(packed, i);
        }
    }

    function _repeat(string memory char_, uint256 count) private pure returns (string memory) {
        bytes memory charBytes = bytes(char_);
        bytes memory output = new bytes(charBytes.length * count);
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = 0; j < charBytes.length; j++) {
                output[i * charBytes.length + j] = charBytes[j];
            }
        }
        return string(output);
    }
}
