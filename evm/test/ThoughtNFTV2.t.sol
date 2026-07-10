// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtNFTV2} from "../src/ThoughtNFTV2.sol";
import {ThoughtSpecRegistryV2} from "../src/ThoughtSpecRegistryV2.sol";

interface VmV2 {
    function addr(uint256 privateKey) external returns (address);
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
    function warp(uint256 newTimestamp) external;
}

contract MockPathNFTV2 {
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

contract RecordingERC721ReceiverV2 {
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

contract RejectingERC721ReceiverV2 {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return 0xffffffff;
    }
}

contract RevertingERC721ReceiverV2 {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        revert("REJECT_ERC721");
    }
}

contract ReentrantPathNFTV2 {
    ThoughtNFTV2 public token;
    bytes32 public specId;
    bytes32 public specHash;
    bool public reentrantBlocked;
    uint256 public consumeCallCount;
    bool private _entered;

    function configure(ThoughtNFTV2 token_, bytes32 specId_, bytes32 specHash_) external {
        token = token_;
        specId = specId_;
        specHash = specHash_;
    }

    function consumeUnit(uint256, bytes32, address, uint256, bytes calldata) external returns (uint256 serial) {
        consumeCallCount += 1;

        if (!_entered) {
            _entered = true;
            ThoughtNFTV2.MintThoughtV2Input memory input = ThoughtNFTV2.MintThoughtV2Input({
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
                reentrantBlocked = selector == ThoughtNFTV2.ReentrantCall.selector;
            }
            require(reentrantBlocked, "REENTRANT_NOT_BLOCKED");
        }

        return 777;
    }
}

contract ThoughtNFTV2Test {
    VmV2 private constant vm = VmV2(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant USER_KEY = 0xA11CE;
    uint256 private constant OTHER_KEY = 0xB0B;
    string private constant DEFAULT_PROVENANCE =
        '{"app":"THOUGHT","version":"v2","route":"codex","agentVerified":false}';
    string private constant DEFAULT_SPEC_NAME = "THOUGHT.v2.md";
    string private constant DEFAULT_SPEC_REF = "THOUGHT.v2.md";
    string private constant DEFAULT_SPEC_TEXT =
        "# THOUGHT.v2.md\n\nVersion: v2\n\nThe contract mints final visible V2 lines only.\n";
    bytes32 private constant CONSUME_AUTHORIZATION_TYPEHASH = keccak256(
        "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)"
    );

    event PathThoughtConsumedV2(
        uint256 indexed tokenId,
        uint256 indexed pathId,
        uint256 pathSerial,
        address indexed minter
    );
    event ThoughtMintedV2(
        uint256 indexed tokenId,
        address indexed minter,
        bytes32 indexed workHash,
        bytes32 promptLineHash,
        bytes32 agentLineHash,
        uint256 pathId,
        uint256 pathSerial,
        bytes32 thoughtSpecId,
        bytes32 thoughtSpecHash
    );

    MockPathNFTV2 private path;
    ThoughtSpecRegistryV2 private registry;
    ThoughtNFTV2 private token;
    address private user;
    bytes32 private defaultSpecId;
    bytes32 private defaultSpecHash;

    function setUp() public {
        user = vm.addr(USER_KEY);
        path = new MockPathNFTV2();
        registry = new ThoughtSpecRegistryV2(address(this));
        (defaultSpecId, defaultSpecHash,) =
            registry.registerThoughtSpec(DEFAULT_SPEC_NAME, DEFAULT_SPEC_REF, bytes(DEFAULT_SPEC_TEXT));
        token = new ThoughtNFTV2(address(path), address(registry));
        path.setAuthorizedMinter(address(token));
        for (uint256 pathId = 1; pathId <= 96; pathId++) {
            path.mintPath(user, pathId);
        }
    }

    function testRegistryRegistersExactV2SpecBytes() public view {
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
        ThoughtSpecRegistryV2 ownedRegistry = new ThoughtSpecRegistryV2(user);
        require(ownedRegistry.owner() == user, "owner mismatch");
        require(registry.isValidThoughtSpecName("THOUGHT.v2.md"), "v2 name should pass");
        require(registry.isValidThoughtSpecName("THOUGHT.v12.md"), "multi digit version should pass");
        require(!registry.isValidThoughtSpecName("THOUGHT.v0.md"), "v0 should fail");
        require(!registry.isValidThoughtSpecName("THOUGHT.v02.md"), "leading zero should fail");
        require(!registry.isValidThoughtSpecName("THOUGHT.md"), "legacy name should fail");

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.OwnerZeroAddress.selector));
        new ThoughtSpecRegistryV2(address(0));

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.NotOwner.selector));
        ownedRegistry.registerThoughtSpec("THOUGHT.v3.md", "THOUGHT.v3.md", bytes("Version: v3"));
    }

    function testConstructorPinsDependenciesAndRejectsInvalidTargets() public {
        require(token.pathNft() == address(path), "path dependency mismatch");
        require(token.thoughtSpecRegistry() == address(registry), "registry dependency mismatch");

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidPathNft.selector));
        new ThoughtNFTV2(address(0), address(registry));

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidPathNft.selector));
        new ThoughtNFTV2(address(0x1234), address(registry));

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidThoughtSpecRegistry.selector));
        new ThoughtNFTV2(address(path), address(0));

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidThoughtSpecRegistry.selector));
        new ThoughtNFTV2(address(path), address(0x1234));
    }

    function testMarketplaceInterfacesAndNonexistentTokenReadsRevert() public {
        require(_equal(token.name(), "THOUGHT"), "name getter mismatch");
        require(_equal(token.symbol(), "THOUGHT"), "symbol getter mismatch");
        require(token.supportsInterface(0x01ffc9a7), "ERC165 unsupported");
        require(token.supportsInterface(0x80ac58cd), "ERC721 unsupported");
        require(token.supportsInterface(0x5b5e139f), "ERC721Metadata unsupported");
        require(!token.supportsInterface(0xffffffff), "invalid interface supported");

        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.BalanceQueryForZeroAddress.selector));
        token.balanceOf(address(0));

        uint256 missingTokenId = 404;
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.ownerOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.promptLineOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.agentLineOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.provenanceOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.workHashOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.recordOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.thoughtSpecOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
        token.svgOf(missingTokenId);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NonexistentToken.selector));
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

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.ThoughtSpecAlreadyRegistered.selector, defaultSpecId));
        registry.registerThoughtSpec(DEFAULT_SPEC_NAME, DEFAULT_SPEC_REF, bytes(DEFAULT_SPEC_TEXT));

        bytes32 missingSpecId = keccak256("THOUGHT.v404.md");
        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.ThoughtSpecNotFound.selector, missingSpecId));
        registry.thoughtSpecBytes(missingSpecId);

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.EmptyThoughtSpec.selector));
        registry.registerThoughtSpec("THOUGHT.v3.md", "THOUGHT.v3.md", bytes(""));

        string memory oversizeSpec = _repeat("x", registry.MAX_THOUGHT_SPEC_BYTES() + 1);
        vm.expectRevert(
            abi.encodeWithSelector(
                ThoughtSpecRegistryV2.ThoughtSpecTooLarge.selector,
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
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.NotAuthorized.selector));
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
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.InvalidSender.selector));
        token.transferFrom(user, user, tokenId);

        vm.prank(other);
        token.setApprovalForAll(user, true);
        require(token.isApprovedForAll(other, user), "operator approval missing");

        vm.prank(user);
        token.transferFrom(other, user, tokenId);
        require(token.ownerOf(tokenId) == user, "owner mismatch after operator transfer");

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.ApprovalToCurrentOwner.selector));
        token.approve(user, tokenId);

        vm.prank(other);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.ApprovalCallerNotOwnerNorApproved.selector));
        token.approve(other, tokenId);
    }

    function testSafeTransfersRequireReceiverMagicAndRollbackOnFailure() public {
        RecordingERC721ReceiverV2 receiver = new RecordingERC721ReceiverV2();
        RejectingERC721ReceiverV2 rejectingReceiver = new RejectingERC721ReceiverV2();
        RevertingERC721ReceiverV2 revertingReceiver = new RevertingERC721ReceiverV2();
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
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.TransferToNonReceiverImplementer.selector));
        token.safeTransferFrom(user, address(rejectingReceiver), rejectedTokenId, payload);
        require(token.ownerOf(rejectedTokenId) == user, "bad receiver transfer did not roll back");

        uint256 revertedTokenId = _mintAsUser("safe reverted", "SAFE REVERTED", 3);
        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(ThoughtNFTV2.TransferToNonReceiverImplementer.selector));
        token.safeTransferFrom(user, address(revertingReceiver), revertedTokenId, payload);
        require(token.ownerOf(revertedTokenId) == user, "reverting receiver transfer did not roll back");
    }

    function testPathSignatureFailuresDoNotMintConsumeOrReserve() public {
        ThoughtNFTV2.MintThoughtV2Input memory badSigner = _input("wrong signer", "WRONG SIGNER", 1, OTHER_KEY);
        _expectMintStringRevert(badSigner, "BAD_CONSUME_AUTH");
        require(token.totalSupply() == 0, "wrong signer minted");
        require(path.consumeCallCount() == 0, "wrong signer consumed path");
        require(!path.thoughtConsumed(1), "wrong signer marked path consumed");

        ThoughtNFTV2.MintThoughtV2Input memory expired = _input("expired auth", "EXPIRED AUTH", 2, USER_KEY);
        expired.deadline = block.timestamp + 1;
        vm.warp(expired.deadline + 1);
        _expectMintStringRevert(expired, "CONSUME_AUTH_EXPIRED");
        require(token.totalSupply() == 0, "expired auth minted");
        require(path.consumeCallCount() == 0, "expired auth consumed path");
        require(!path.thoughtConsumed(2), "expired auth marked path consumed");

        ThoughtNFTV2.MintThoughtV2Input memory original = _input("replay source", "REPLAY SOURCE", 3, USER_KEY);
        vm.prank(user);
        token.mint(original);
        require(token.totalSupply() == 1, "first mint failed");

        ThoughtNFTV2.MintThoughtV2Input memory replay = original;
        replay.promptLine = "replay target";
        replay.agentLine = "REPLAY TARGET";
        _expectMintStringRevert(replay, "QUOTA_EXHAUSTED");
        require(token.totalSupply() == 1, "replay minted");
        require(token.tokenOfWorkHash(token.workHash(keccak256(bytes(replay.promptLine)), keccak256(bytes(replay.agentLine)))) == 0, "replay reserved work");
    }

    function testMintRejectsReentrantPathCallbackAndStillMintsOuterWork() public {
        ReentrantPathNFTV2 reentrantPath = new ReentrantPathNFTV2();
        ThoughtNFTV2 reentrantToken = new ThoughtNFTV2(address(reentrantPath), address(registry));
        reentrantPath.configure(reentrantToken, defaultSpecId, defaultSpecHash);

        ThoughtNFTV2.MintThoughtV2Input memory input = ThoughtNFTV2.MintThoughtV2Input({
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
        ThoughtNFTV2.MintThoughtV2Input memory input = _input("quiet signal", "QUIET SIGNAL", 1, USER_KEY);
        bytes32 promptHash = keccak256(bytes(input.promptLine));
        bytes32 agentHash = keccak256(bytes(input.agentLine));
        bytes32 mintedWorkHash = token.workHash(promptHash, agentHash);
        bytes32 provenanceHash = keccak256(bytes(input.provenanceJson));

        vm.expectEmit(true, true, true, true);
        emit PathThoughtConsumedV2(1, 1, 0, user);
        vm.expectEmit(true, true, true, true);
        emit ThoughtMintedV2(
            1, user, mintedWorkHash, promptHash, agentHash, 1, 0, defaultSpecId, defaultSpecHash
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
        require(token.workHashOf(tokenId) == mintedWorkHash, "work hash mismatch");
        require(token.provenanceHashOf(tokenId) == provenanceHash, "provenance hash mismatch");
        require(token.pathIdOf(tokenId) == 1, "path id mismatch");
        require(token.pathSerialOf(tokenId) == 0, "path serial mismatch");
        require(token.authorOf(tokenId) == user, "author mismatch");
        require(token.mintedAtOf(tokenId) == uint64(block.timestamp), "mint time mismatch");

        ThoughtNFTV2.ThoughtRecordV2 memory record = token.recordOf(tokenId);
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
            abi.encodeWithSelector(ThoughtNFTV2.DisplayLineEmpty.selector, ThoughtNFTV2.DisplayKind.Prompt)
        );
        require(path.consumeCallCount() == 0, "empty prompt called path");

        _expectMintRevert(
            _input("valid prompt", "", 2, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.DisplayLineEmpty.selector, ThoughtNFTV2.DisplayKind.Agent)
        );
        require(path.consumeCallCount() == 0, "empty agent called path");

        _expectMintRevert(
            _input("Bad prompt", "GOOD AGENT", 3, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.InvalidAsciiCase.selector, ThoughtNFTV2.DisplayKind.Prompt, bytes1("B"))
        );
        require(path.consumeCallCount() == 0, "bad prompt called path");
        require(!path.thoughtConsumed(3), "bad prompt consumed path");

        _expectMintRevert(
            _input("good prompt", "bad agent", 4, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.InvalidAsciiCase.selector, ThoughtNFTV2.DisplayKind.Agent, bytes1("b"))
        );
        require(path.consumeCallCount() == 0, "bad agent called path");
        require(!path.thoughtConsumed(4), "bad agent consumed path");

        _expectMintRevert(
            _input("spec prompt", "SPEC AGENT", 5, USER_KEY, defaultSpecId, bytes32(uint256(0xBEEF)), DEFAULT_PROVENANCE),
            abi.encodeWithSelector(
                ThoughtNFTV2.InvalidThoughtSpecPair.selector, defaultSpecId, bytes32(uint256(0xBEEF))
            )
        );
        require(path.consumeCallCount() == 0, "bad spec called path");
        require(!path.thoughtConsumed(5), "bad spec consumed path");

        _expectMintRevert(
            _input("prov prompt", "PROV AGENT", 6, USER_KEY, defaultSpecId, defaultSpecHash, ""),
            abi.encodeWithSelector(ThoughtNFTV2.EmptyProvenance.selector)
        );
        require(path.consumeCallCount() == 0, "empty provenance called path");
        require(!path.thoughtConsumed(6), "empty provenance consumed path");

        string memory oversizeProvenance = _repeat("p", token.MAX_PROVENANCE_BYTES() + 1);
        _expectMintRevert(
            _input("big provenance", "BIG PROVENANCE", 7, USER_KEY, defaultSpecId, defaultSpecHash, oversizeProvenance),
            abi.encodeWithSelector(
                ThoughtNFTV2.ProvenanceTooLarge.selector, bytes(oversizeProvenance).length, token.MAX_PROVENANCE_BYTES()
            )
        );
        require(path.consumeCallCount() == 0, "bad provenance called path");
        require(!path.thoughtConsumed(7), "bad provenance consumed path");
    }

    function testPathConsumeFailureDoesNotMintReserveOrIncrementSupply() public {
        path.setAuthorizedMinter(address(0xCAFE));
        ThoughtNFTV2.MintThoughtV2Input memory input = _input("valid prompt", "VALID AGENT", 1, USER_KEY);
        bytes32 mintedWorkHash = token.workHash(keccak256(bytes(input.promptLine)), keccak256(bytes(input.agentLine)));

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
        ThoughtNFTV2.MintThoughtV2Input memory duplicate = _input("same prompt", "SAME AGENT", 2, USER_KEY);
        bytes32 mintedWorkHash =
            token.workHash(keccak256(bytes(duplicate.promptLine)), keccak256(bytes(duplicate.agentLine)));

        _expectMintRevert(
            duplicate, abi.encodeWithSelector(ThoughtNFTV2.WorkAlreadyMinted.selector, mintedWorkHash, uint256(1))
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

        require(_equal(token.promptLineOf(cjkToken), unicode"你好 世界"), "cjk prompt mismatch");
        require(_equal(token.agentLineOf(arabicToken), unicode"مرحبا"), "arabic agent mismatch");
        require(_equal(token.agentLineOf(hebrewToken), unicode"שלום"), "hebrew agent mismatch");
    }

    function testUtf8ValidationRejectsMalformedBytes() public {
        _expectPromptUtf8Revert(hex"80");
        _expectPromptUtf8Revert(hex"c080");
        _expectPromptUtf8Revert(hex"eda080");
        _expectPromptUtf8Revert(hex"f4908080");
        _expectPromptUtf8Revert(hex"e282");
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
    }

    function testSpacingRulesRejectOuterAndRepeatedSpaces() public {
        _expectMintRevert(
            _input(" leading", "VALID AGENT", 1, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.InvalidDisplaySpacing.selector, ThoughtNFTV2.DisplayKind.Prompt)
        );
        _expectMintRevert(
            _input("trailing ", "VALID AGENT", 2, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.InvalidDisplaySpacing.selector, ThoughtNFTV2.DisplayKind.Prompt)
        );
        _expectMintRevert(
            _input("double  space", "VALID AGENT", 3, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.InvalidDisplaySpacing.selector, ThoughtNFTV2.DisplayKind.Prompt)
        );
    }

    function testAsciiCaseRules() public {
        _expectMintRevert(
            _input("UPPER PROMPT", "VALID AGENT", 1, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.InvalidAsciiCase.selector, ThoughtNFTV2.DisplayKind.Prompt, bytes1("U"))
        );
        _expectMintRevert(
            _input("valid prompt", "lower agent", 2, USER_KEY),
            abi.encodeWithSelector(ThoughtNFTV2.InvalidAsciiCase.selector, ThoughtNFTV2.DisplayKind.Agent, bytes1("l"))
        );

        _mintAsUser("valid prompt", "VALID AGENT", 3);
        uint256 tokenId = _mintAsUser(unicode"你好", unicode"你好", 4);
        require(_equal(token.promptLineOf(tokenId), unicode"你好"), "non-latin prompt changed");
        require(_equal(token.agentLineOf(tokenId), unicode"你好"), "non-latin agent changed");
    }

    function testDisplayLimitsAndByteLimits() public {
        _mintAsUser(_repeat("a", 72), _repeat("A", 27), 1);

        _expectMintRevert(
            _input(_repeat("a", 73), "VALID AGENT", 2, USER_KEY),
            abi.encodeWithSelector(
                ThoughtNFTV2.DisplayLineTooWide.selector,
                ThoughtNFTV2.DisplayKind.Prompt,
                uint256(438),
                token.PROMPT_MAX_UNITS()
            )
        );
        _expectMintRevert(
            _input("valid prompt", _repeat("A", 28), 3, USER_KEY),
            abi.encodeWithSelector(
                ThoughtNFTV2.DisplayLineTooWide.selector,
                ThoughtNFTV2.DisplayKind.Agent,
                uint256(168),
                token.AGENT_MAX_UNITS()
            )
        );
        _expectMintRevert(
            _input(_repeat("a", token.PROMPT_MAX_BYTES() + 1), "VALID AGENT", 4, USER_KEY),
            abi.encodeWithSelector(
                ThoughtNFTV2.DisplayLineTooLarge.selector,
                ThoughtNFTV2.DisplayKind.Prompt,
                token.PROMPT_MAX_BYTES() + 1,
                token.PROMPT_MAX_BYTES()
            )
        );
        _expectMintRevert(
            _input("valid prompt", _repeat("A", token.AGENT_MAX_BYTES() + 1), 5, USER_KEY),
            abi.encodeWithSelector(
                ThoughtNFTV2.DisplayLineTooLarge.selector,
                ThoughtNFTV2.DisplayKind.Agent,
                token.AGENT_MAX_BYTES() + 1,
                token.AGENT_MAX_BYTES()
            )
        );
    }

    function testWorkUniquenessAllowsOneSideToDiffer() public {
        _mintAsUser("same prompt", "FIRST AGENT", 1);
        _mintAsUser("same prompt", "SECOND AGENT", 2);
        _mintAsUser("other prompt", "FIRST AGENT", 3);
        require(token.totalSupply() == 3, "one-sided differences should mint");

        ThoughtNFTV2.MintThoughtV2Input memory duplicate = _input("same prompt", "FIRST AGENT", 4, USER_KEY);
        bytes32 mintedWorkHash =
            token.workHash(keccak256(bytes(duplicate.promptLine)), keccak256(bytes(duplicate.agentLine)));
        _expectMintRevert(
            duplicate, abi.encodeWithSelector(ThoughtNFTV2.WorkAlreadyMinted.selector, mintedWorkHash, uint256(1))
        );
        require(!path.thoughtConsumed(4), "duplicate consumed path");
    }

    function testSvgAndMetadataUseTwoLineV2Renderer() public {
        uint256 tokenId = _mintAsUser("a&b<c>\"'", "A&B<C>\"'", 1);
        string memory svg = token.svgOf(tokenId);
        string memory metadata = _metadataJsonFromTokenUri(token.tokenURI(tokenId));

        require(!_contains(svg, 'id="work-frame"'), "svg should not include an outer work frame");
        require(!_contains(svg, 'id="work-canvas"'), "svg should not scale the canvas through a wrapper");
        require(_contains(svg, '<rect id="canvas-bg" width="960" height="960" fill="#050505"/>'), "missing dark bg");
        require(_contains(svg, 'id="binary-background"'), "missing binary background");
        require(_contains(svg, 'data-zero="hollow-circle"'), "binary background should preserve zero cells");
        require(_contains(svg, 'opacity="1.00"'), "binary background opacity mismatch");
        require(_contains(svg, '<circle '), "binary background should render circles");
        require(_count(svg, 'text-anchor="middle"') == 2, "both lines should be centered");
        require(!_contains(svg, "PROMPT:"), "svg should not label prompt");
        require(!_contains(svg, "AGENT:"), "svg should not label agent");
        require(!_contains(svg, "Color Font"), "svg contains color font text");
        require(!_contains(svg, "colorFont"), "svg contains color font field");
        require(_contains(svg, "A&amp;B&lt;C&gt;&quot;&apos;"), "agent xml escaping failed");
        require(_contains(svg, "a&amp;b&lt;c&gt;&quot;&apos;"), "prompt xml escaping failed");

        require(_contains(metadata, '"name":"THOUGHT #1"'), "metadata name missing");
        require(_contains(metadata, '"image":"data:image/svg+xml;base64,'), "metadata image missing");
        require(_contains(metadata, '"trait_type":"Render","value":"THOUGHT V2"'), "render trait missing");
        require(_contains(metadata, '"trait_type":"PATH","value":"1"'), "path trait missing");
        require(_contains(metadata, '"trait_type":"PATH Serial","value":"0"'), "serial trait missing");
        require(_contains(metadata, '"trait_type":"Spec","value":"THOUGHT.v2.md"'), "spec trait missing");
        require(_contains(metadata, '"version":"v2"'), "thought object missing version");
        require(_contains(metadata, "\"promptLine\":\"a&b<c>\\\"'\""), "prompt metadata escaping failed");
        require(_contains(metadata, "\"agentLine\":\"A&B<C>\\\"'\""), "agent metadata escaping failed");
        require(_contains(metadata, '"provenanceHash":"'), "provenance hash missing");
        require(!_contains(metadata, "Color Font"), "metadata contains color font text");
        require(!_contains(metadata, "colorFont"), "metadata contains color font field");
        require(!_contains(metadata, DEFAULT_SPEC_TEXT), "metadata embeds full spec text");
    }

    function testSvgBinaryBackgroundUsesPromptBytesBeforeAgentBytes() public {
        uint256 tokenId = _mintAsUser("ab", "C", 1);
        string memory svg = token.svgOf(tokenId);

        require(_contains(svg, 'id="binary-background"'), "missing binary background");
        require(_contains(svg, 'fill="#006100"'), "binary background should use canonical green");
        require(_contains(svg, 'data-grid-columns="32"'), "binary background should use fixed square grid columns");
        require(_contains(svg, 'data-grid-rows="32"'), "binary background should use fixed square grid rows");
        require(_contains(svg, 'data-bit-capacity="1024"'), "binary background should use fixed capacity");
        require(_contains(svg, 'data-rendered-cells="892"'), "binary background should clear text block cells");
        require(_contains(svg, 'data-cleared-cells="132"'), "binary background should expose cleared cells");
        require(_contains(svg, 'data-source-bit-count="24"'), "binary background should expose source bit count");
        require(
            _contains(svg, 'data-fill-rule="repeat-short-truncate-long"'), "binary background should expose fill rule"
        );
        require(_contains(svg, 'data-cell-size="28"'), "binary background should use fixed equal square cells");
        require(_contains(svg, 'data-origin-x="32"'), "binary background should center grid horizontally");
        require(_contains(svg, 'data-origin-y="32"'), "binary background should center grid vertically");
        require(_contains(svg, 'data-dot-radius="10"'), "binary background should derive fixed dot radius");
        require(_contains(svg, 'data-zero="hollow-circle"'), "binary background should preserve zero cells");
        require(_contains(svg, '<circle id="binary-one" r="10" fill="#006100"/>'), "one bit circle missing");
        require(
            _contains(svg, '<circle id="binary-zero" r="10" fill="none" stroke="#006100" stroke-width="1"/>'),
            "zero bit ring missing"
        );
        require(_count(svg, '<use href="#binary-') == 892, "binary background should clear cells under text blocks");
        require(_count(svg, '<use href="#binary-zero"') == 555, "zero bits should be rings");
        require(!_contains(svg, "&#9679;"), "binary background should not use text glyph circles");
        require(!_contains(svg, "textLength="), "binary background should not use text spacing");
        require(!_contains(svg, "01100001"), "binary background should not render literal zeros and ones");
        require(!_contains(svg, "01100001 01100010 01000011"), "binary background should not repeat byte tokens");

        uint256 denseTokenId = _mintAsUser(_repeat("a", 72), _repeat("B", 27), 2);
        string memory denseSvg = token.svgOf(denseTokenId);
        require(_contains(denseSvg, 'data-cell-size="28"'), "dense binary background should keep fixed cells");
        require(_count(denseSvg, '<use href="#binary-') == 892, "dense binary background should clear text cells");

        uint256 longTokenId = _mintAsUser(_repeat(unicode"你", 43), "B", 3);
        string memory longSvg = token.svgOf(longTokenId);
        require(_contains(longSvg, 'data-source-bit-count="1040"'), "long binary background should expose source bits");
        require(_contains(longSvg, 'data-cell-size="28"'), "long binary background should keep fixed cells");
        require(_count(longSvg, '<use href="#binary-') == 892, "long binary background should clear text cells");
    }

    function testSqueezedSvgOnlyUsesTextLengthForLongLines() public {
        uint256 shortTokenId = _mintAsUser("short", "SHORT", 1);
        string memory shortSvg = token.svgOf(shortTokenId);
        require(!_contains(shortSvg, 'textLength="820"'), "short lines should not be squeezed");
        require(!_contains(shortSvg, 'lengthAdjust="spacingAndGlyphs"'), "short lines should not length-adjust");

        uint256 longTokenId = _mintAsUser(_repeat("a", 72), _repeat("A", 27), 2);
        string memory longSvg = token.svgOf(longTokenId);
        require(_contains(longSvg, 'textLength="820"'), "long lines should be squeezed");
        require(_contains(longSvg, 'lengthAdjust="spacingAndGlyphs"'), "long lines should length-adjust");
    }

    function testV2ApiSurfaceRemovesPreviewAndColorFontHelpers() public {
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
        ThoughtNFTV2.MintThoughtV2Input memory input = _input(promptLine, agentLine, pathId, USER_KEY);
        vm.prank(user);
        return token.mint(input);
    }

    function _input(string memory promptLine, string memory agentLine, uint256 pathId, uint256 privateKey)
        private
        returns (ThoughtNFTV2.MintThoughtV2Input memory input)
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
    ) private returns (ThoughtNFTV2.MintThoughtV2Input memory input) {
        ConsumeAuth memory auth = _signConsume(pathId, privateKey);
        input = ThoughtNFTV2.MintThoughtV2Input({
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

    function _expectMintRevert(ThoughtNFTV2.MintThoughtV2Input memory input, bytes memory revertData) private {
        vm.prank(user);
        vm.expectRevert(revertData);
        token.mint(input);
    }

    function _expectMintStringRevert(ThoughtNFTV2.MintThoughtV2Input memory input, string memory reason) private {
        vm.prank(user);
        vm.expectRevert(bytes(reason));
        token.mint(input);
    }

    function _expectPromptUtf8Revert(bytes memory rawPromptLine) private {
        ThoughtNFTV2.MintThoughtV2Input memory input =
            _input(string(rawPromptLine), "VALID AGENT", 1, USER_KEY);
        _expectMintRevert(
            input, abi.encodeWithSelector(ThoughtNFTV2.InvalidUtf8.selector, ThoughtNFTV2.DisplayKind.Prompt)
        );
        require(path.consumeCallCount() == 0, "invalid utf8 called path");
    }

    function _expectPromptCharacterRevert(bytes memory rawPromptLine, uint256 codepoint) private {
        ThoughtNFTV2.MintThoughtV2Input memory input =
            _input(string(rawPromptLine), "VALID AGENT", 1, USER_KEY);
        _expectMintRevert(
            input,
            abi.encodeWithSelector(
                ThoughtNFTV2.InvalidDisplayCharacter.selector, ThoughtNFTV2.DisplayKind.Prompt, codepoint
            )
        );
        require(path.consumeCallCount() == 0, "invalid character called path");
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
