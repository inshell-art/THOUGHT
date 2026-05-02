// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtSpecRegistry} from "../src/ThoughtSpecRegistry.sol";
import {ThoughtToken} from "../src/ThoughtToken.sol";

interface Vm {
    function addr(uint256 privateKey) external returns (address);
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
    function sign(uint256 privateKey, bytes32 digest) external returns (uint8 v, bytes32 r, bytes32 s);
}

contract MockPathNFT {
    bytes32 public constant MOVEMENT_THOUGHT = bytes32("THOUGHT");
    bytes32 private constant _CONSUME_AUTHORIZATION_TYPEHASH = keccak256(
        "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)"
    );

    address public authorizedMinter;

    mapping(uint256 pathId => address owner) public ownerOf;
    mapping(address claimer => uint256 nonce) public getConsumeNonce;
    mapping(uint256 pathId => bool consumed) public thoughtConsumed;

    function setAuthorizedMinter(address minter) external {
        authorizedMinter = minter;
    }

    function mintPath(address owner, uint256 pathId) external {
        ownerOf[pathId] = owner;
    }

    function consumeUnit(
        uint256 pathId,
        bytes32 movement,
        address claimer,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint32 serial) {
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

contract ThoughtTokenTest {
    Vm private constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));
    uint256 private constant USER_KEY = 0xA11CE;
    uint256 private constant OTHER_KEY = 0xB0B;
    string private constant DEFAULT_PROVENANCE = '{"schema":"thought.provenance.v1","route":"local"}';
    bytes32 private constant DEFAULT_SPEC_ID = keccak256("thought.md.v1");
    bytes32 private constant DEFAULT_SPEC_HASH = keccak256("THOUGHT.md fixture");
    string private constant DEFAULT_SPEC_REF = "THOUGHT.md@v1";
    string private constant DEFAULT_SPEC_TEXT = "THOUGHT.md fixture";
    bytes32 private constant DEFAULT_PROMPT_HASH = keccak256("why we are here?");
    bytes32 private constant CONSUME_AUTHORIZATION_TYPEHASH = keccak256(
        "ConsumeAuthorization(address pathNft,uint256 chainId,uint256 pathId,bytes32 movement,address claimer,address executor,uint256 nonce,uint256 deadline)"
    );

    event ThoughtMinted(
        uint256 indexed tokenId,
        address indexed minter,
        uint256 indexed pathId,
        bytes32 textHash,
        bytes32 provenanceHash,
        bytes32 thoughtSpecId,
        uint64 mintedAt
    );

    MockPathNFT private path;
    ThoughtSpecRegistry private registry;
    ThoughtToken private token;
    address private user;

    function setUp() public {
        user = vm.addr(USER_KEY);
        path = new MockPathNFT();
        registry = new ThoughtSpecRegistry();
        registry.registerSpec(DEFAULT_SPEC_ID, DEFAULT_SPEC_REF, bytes(DEFAULT_SPEC_TEXT), true);
        token = new ThoughtToken(address(path), address(registry));
        path.setAuthorizedMinter(address(token));
        for (uint256 pathId = 1; pathId <= 32; pathId++) {
            path.mintPath(user, pathId);
        }
    }

    function testDefaultThoughtSpecIsRegistered() public view {
        (
            bytes32 activeSpecId,
            bytes32 hash,
            string memory ref,
            address pointer,
            uint32 byteLength,
            uint64 registeredAt,
            bool exists
        ) = registry.activeSpecMeta();

        require(exists, "spec should exist");
        require(activeSpecId == DEFAULT_SPEC_ID, "active spec id mismatch");
        require(hash == DEFAULT_SPEC_HASH, "spec hash mismatch");
        require(_equal(ref, DEFAULT_SPEC_REF), "spec ref mismatch");
        require(pointer != address(0), "spec pointer missing");
        require(byteLength == bytes(DEFAULT_SPEC_TEXT).length, "spec byte length mismatch");
        require(registeredAt == uint64(block.timestamp), "spec registeredAt mismatch");
        require(registry.validateSpec(DEFAULT_SPEC_ID), "spec validation failed");
        require(_equal(registry.specText(DEFAULT_SPEC_ID), DEFAULT_SPEC_TEXT), "spec text mismatch");
        require(token.thoughtSpecRegistry() == address(registry), "token registry mismatch");
    }

    function testRegisterSameThoughtSpecIdReverts() public {
        (bool ok,) = address(registry).call(
            abi.encodeWithSelector(
                registry.registerSpec.selector,
                DEFAULT_SPEC_ID,
                DEFAULT_SPEC_REF,
                bytes(DEFAULT_SPEC_TEXT),
                false
            )
        );
        require(!ok, "duplicate spec id should fail");
    }

    function testRegisterSpecAndReadExactBytesBack() public {
        bytes32 specId = keccak256("thought.md.v2");
        bytes memory specBytes = bytes("THOUGHT.md v2\nnew procedure");
        registry.registerSpec(specId, "THOUGHT.md@v2", specBytes, false);

        (bytes32 hash, string memory ref, address pointer, uint32 byteLength,, bool exists) = registry.specMeta(specId);
        require(exists, "new spec should exist");
        require(hash == keccak256(specBytes), "new spec hash mismatch");
        require(_equal(ref, "THOUGHT.md@v2"), "new spec ref mismatch");
        require(pointer != address(0), "new spec pointer missing");
        require(byteLength == specBytes.length, "new spec byte length mismatch");
        require(_bytesEqual(registry.specBytes(specId), specBytes), "new spec bytes mismatch");
        require(registry.validateSpec(specId), "new spec validation failed");
    }

    function testGas_registerSpec_500Bytes() public {
        registry.registerSpec(keccak256("gas.spec.500"), "gas.spec.500", _bytesRepeat("S", 500), false);
    }

    function testGas_registerSpec_1KB() public {
        registry.registerSpec(keccak256("gas.spec.1kb"), "gas.spec.1kb", _bytesRepeat("S", 1024), false);
    }

    function testGas_registerSpec_4KB() public {
        registry.registerSpec(keccak256("gas.spec.4kb"), "gas.spec.4kb", _bytesRepeat("S", 4096), false);
    }

    function testGas_registerSpec_8KB() public {
        registry.registerSpec(keccak256("gas.spec.8kb"), "gas.spec.8kb", _bytesRepeat("S", 8192), false);
    }

    function testGas_registerSpec_16KB() public {
        registry.registerSpec(keccak256("gas.spec.16kb"), "gas.spec.16kb", _bytesRepeat("S", 16_384), false);
    }

    function testNormalizeThoughtKeepsReadableSingleSpaces() public view {
        string memory normalized = token.normalizeThought("hello, WORLD!!! 42");
        require(_equal(normalized, "HELLO WORLD"), "unexpected normalization");
    }

    function testTextCodecPreviewsCanonicalText() public view {
        (string memory normalized, bool valid, uint8 reasonCode) = token.previewText("hello, WORLD!!! 42");
        require(_equal(normalized, "HELLO WORLD"), "unexpected preview text");
        require(valid, "preview should be valid");
        require(reasonCode == 0, "unexpected reason");
        require(token.MAX_TEXT_BYTES() == 1024, "unexpected text cap");
        require(token.isCanonicalText("HELLO WORLD"), "canonical text should be valid");
        require(!token.isCanonicalText("hello"), "lowercase text is not canonical");
        require(!token.isCanonicalText("HELLO  WORLD"), "repeated spaces are not canonical");
        require(token.textHashOf("HELLO WORLD") == keccak256(bytes("HELLO WORLD")), "unexpected codec hash");
    }

    function testMintRejectsNonCanonicalText() public {
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "hello",
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "mint should reject noncanonical text");
        require(!path.thoughtConsumed(1), "noncanonical text should not consume path");
    }

    function testMintStoresRawTextProvenanceAndOwnership() public {
        string memory text = "HELLOWORLD";
        string memory storedText = "HELLOWORLD";
        string memory provenance = '{"schema":"thought.provenance.v1","route":"local"}';
        uint256 tokenId = _mintAsUserWithProvenance(text, provenance, 1, USER_KEY);
        bytes32 textHash = keccak256(bytes(storedText));
        bytes32 provenanceHash = keccak256(bytes(provenance));

        require(tokenId == 1, "unexpected token id");
        require(token.totalSupply() == 1, "unexpected total supply");
        require(token.ownerOf(tokenId) == user, "unexpected owner");
        require(_equal(token.thoughtText(tokenId), storedText), "unexpected stored text");
        require(_equal(token.rawTextOf(tokenId), storedText), "unexpected raw text");
        require(_equal(token.provenanceOf(tokenId), provenance), "unexpected provenance");
        require(token.textHashOf(tokenId) == textHash, "unexpected text hash");
        require(token.provenanceHashOf(tokenId) == provenanceHash, "unexpected provenance hash");
        require(token.isThoughtMinted(textHash), "text should be marked minted");
        require(token.tokenOfThought(textHash) == tokenId, "unexpected text token");
        require(token.authorOf(tokenId) == user, "unexpected author");
        require(token.pathIdOf(tokenId) == 1, "unexpected path id");
        require(token.pathSerialOf(tokenId) == 0, "unexpected path serial");
        require(path.thoughtConsumed(1), "path thought was not consumed");

        ThoughtToken.ThoughtRecord memory record = token.getThought(tokenId);
        require(_equal(record.rawText, storedText), "record raw text mismatch");
        require(_equal(record.provenanceJson, provenance), "record provenance mismatch");
        require(record.textHash == textHash, "record text hash mismatch");
        require(record.promptHash == DEFAULT_PROMPT_HASH, "record prompt hash mismatch");
        require(record.provenanceHash == provenanceHash, "record provenance hash mismatch");
        require(record.thoughtSpecId == DEFAULT_SPEC_ID, "record spec mismatch");
        require(record.pathId == 1, "record path mismatch");
        require(record.minter == user, "record minter mismatch");
        require(record.mintedAt == uint64(block.timestamp), "record mintedAt mismatch");

        (
            bytes32 recordTextHash,
            bytes32 recordPromptHash,
            bytes32 recordProvenanceHash,
            bytes32 recordSpecId,
            uint256 recordPathId,
            address recordMinter,
            uint64 recordMintedAt
        ) = token.recordOf(tokenId);
        require(recordTextHash == textHash, "recordOf text hash mismatch");
        require(recordPromptHash == DEFAULT_PROMPT_HASH, "recordOf prompt hash mismatch");
        require(recordProvenanceHash == provenanceHash, "recordOf provenance hash mismatch");
        require(recordSpecId == DEFAULT_SPEC_ID, "recordOf spec mismatch");
        require(recordPathId == 1, "recordOf path mismatch");
        require(recordMinter == user, "recordOf minter mismatch");
        require(recordMintedAt == uint64(block.timestamp), "recordOf mintedAt mismatch");
    }

    function testRenderThoughtSvgIncludesExpectedColorsAndText() public view {
        string memory svg = token.renderThoughtSvg("  why 42 <tag>  ");
        require(_contains(svg, "#f5deb3"), "missing W color");
        require(_contains(svg, "#ffcc00"), "missing H color");
        require(_contains(svg, "#ffff00"), "missing Y color");
        require(_contains(svg, "#008080"), "missing T color");
        require(_contains(svg, ">WHY TAG</text>"), "missing rendered text");
    }

    function testTokenUriIsDataUriJson() public {
        uint256 tokenId = _mintAsUser("HELLOWORLD", 1, USER_KEY);
        string memory uri = token.tokenURI(tokenId);
        require(_contains(uri, "data:application/json;base64,"), "missing json data uri prefix");
    }

    function testMintPriceIsEnforced() public {
        token.setMintPrice(0.01 ether);
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call{value: 0}(
            abi.encodeWithSelector(
                token.mint.selector,
                "HELLO",
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "mint should fail without required value");
        require(!path.thoughtConsumed(1), "path should not be consumed before payment passes");
    }

    function testMintRequiresPathAuthorization() public {
        path.setAuthorizedMinter(address(0xCAFE));
        string memory text = "HELLO";
        bytes32 textHash = keccak256(bytes(text));
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                text,
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "mint should fail without path movement authorization");
        require(token.totalSupply() == 0, "thought should not mint after failed consume");
        require(!token.isThoughtMinted(textHash), "failed consume should not reserve text");
    }

    function testMintRequiresSignedPathConsumeAuth() public {
        ConsumeAuth memory auth = _signConsume(1, OTHER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "HELLO",
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "mint should fail with bad consume signature");
        require(token.totalSupply() == 0, "thought should not mint after bad signature");
    }

    function testPathThoughtQuotaIsOne() public {
        _mintAsUser("FIRST", 1, USER_KEY);

        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "SECOND",
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "second thought from same path should fail");
        require(token.totalSupply() == 1, "quota failure should not mint");
    }

    function testDuplicateCanonicalTextRevertsEvenWithDifferentProvenance() public {
        string memory text = "HELLO";
        _mintAsUserWithProvenance("HELLO", '{"schema":"thought.provenance.v1","run":"a"}', 1, USER_KEY);
        bytes32 textHash = keccak256(bytes(text));
        require(token.isThoughtMinted(textHash), "canonical text should be marked minted");
        require(_equal(token.thoughtText(1), text), "stored text should be canonical");

        ConsumeAuth memory auth = _signConsume(2, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "HELLO",
                2,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                '{"schema":"thought.provenance.v1","run":"b"}',
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "duplicate canonical text should fail");
        require(token.totalSupply() == 1, "duplicate should not mint");
        require(!path.thoughtConsumed(2), "duplicate should not consume path");
    }

    function testSameProvenanceWithDifferentCanonicalTextIsAllowed() public {
        string memory provenance = '{"schema":"thought.provenance.v1","run":"same"}';
        uint256 firstTokenId = _mintAsUserWithProvenance("HELLO", provenance, 1, USER_KEY);
        uint256 secondTokenId = _mintAsUserWithProvenance("WORLD", provenance, 2, USER_KEY);

        require(firstTokenId == 1, "unexpected first token");
        require(secondTokenId == 2, "unexpected second token");
        require(token.provenanceHashOf(firstTokenId) == token.provenanceHashOf(secondTokenId), "provenance hashes differ");
    }

    function testDifferentEnglishLettersAreDifferentTexts() public {
        _mintAsUser("HELLO", 1, USER_KEY);
        _mintAsUser("HELLOO", 2, USER_KEY);
        _mintAsUser("HELLOWORLD", 3, USER_KEY);

        require(token.totalSupply() == 3, "distinct stored titles should mint");
    }

    function testEmptyRawTextReverts() public {
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "",
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "empty raw text should fail");
        require(!path.thoughtConsumed(1), "empty text should not consume path");

        ConsumeAuth memory whitespaceAuth = _signConsume(2, USER_KEY);
        vm.prank(user);
        (bool whitespaceOk,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                " \n\t ",
                2,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                whitespaceAuth.deadline,
                whitespaceAuth.signature
            )
        );
        require(!whitespaceOk, "whitespace-only raw text should fail");
        require(!path.thoughtConsumed(2), "whitespace-only text should not consume path");

        ConsumeAuth memory numberAuth = _signConsume(3, USER_KEY);
        vm.prank(user);
        (bool numberOk,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "12345!!!",
                3,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                numberAuth.deadline,
                numberAuth.signature
            )
        );
        require(!numberOk, "number-only raw text should fail");
        require(!path.thoughtConsumed(3), "number-only text should not consume path");
    }

    function testEmptyProvenanceReverts() public {
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "HELLO",
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                "",
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "empty provenance should fail");
        require(!path.thoughtConsumed(1), "empty provenance should not consume path");
    }

    function testUnknownThoughtSpecReverts() public {
        bytes32 unknownSpecId = keccak256("thought.md.unknown");
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "HELLO",
                1,
                unknownSpecId,
                DEFAULT_PROMPT_HASH,
                DEFAULT_PROVENANCE,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "unknown spec should fail");
        require(!path.thoughtConsumed(1), "unknown spec should not consume path");
    }

    function testOversizeTextReverts() public {
        string memory text = _repeat("A", token.MAX_TEXT_BYTES() + 1);
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                ThoughtToken.ThoughtTextTooLarge.selector,
                bytes(text).length,
                token.MAX_TEXT_BYTES()
            )
        );
        token.mint(text, 1, DEFAULT_SPEC_ID, DEFAULT_PROMPT_HASH, DEFAULT_PROVENANCE, auth.deadline, auth.signature);
        require(!path.thoughtConsumed(1), "oversize text should not consume path");
    }

    function testOversizeProvenanceReverts() public {
        string memory provenance = _repeat("P", token.MAX_PROVENANCE_BYTES() + 1);
        ConsumeAuth memory auth = _signConsume(1, USER_KEY);
        vm.prank(user);
        (bool ok,) = address(token).call(
            abi.encodeWithSelector(
                token.mint.selector,
                "HELLO",
                1,
                DEFAULT_SPEC_ID,
                DEFAULT_PROMPT_HASH,
                provenance,
                auth.deadline,
                auth.signature
            )
        );
        require(!ok, "oversize provenance should fail");
        require(!path.thoughtConsumed(1), "oversize provenance should not consume path");
    }

    function testGas_mint_provenance_512b() public {
        _mintAsUserWithProvenance("GASFIVEONETWO", _repeat("P", 512), 1, USER_KEY);
    }

    function testGas_mint_provenance_700b() public {
        _mintAsUserWithProvenance("GASSEVENHUNDRED", _repeat("P", 700), 1, USER_KEY);
    }

    function testGas_mint_provenance_900b() public {
        _mintAsUserWithProvenance("GASNINEHUNDRED", _repeat("P", 900), 1, USER_KEY);
    }

    function testGas_mint_provenance_2048b() public {
        _mintAsUserWithProvenance("GASTWENTYFORTYEIGHT", _repeat("P", 2048), 1, USER_KEY);
    }

    function testGas_revert_provenance_2049b() public {
        _assertOversizeProvenanceReverts(_repeat("P", 2049), 1);
    }

    function testMintEventIncludesProvenanceFields() public {
        string memory text = "HELLO";
        string memory storedText = "HELLO";
        string memory provenance = '{"schema":"thought.provenance.v1","event":"yes"}';
        bytes32 textHash = keccak256(bytes(storedText));
        bytes32 provenanceHash = keccak256(bytes(provenance));

        vm.expectEmit(true, true, true, true);
        emit ThoughtMinted(1, user, 1, textHash, provenanceHash, DEFAULT_SPEC_ID, uint64(block.timestamp));

        _mintAsUserWithProvenance(text, provenance, 1, USER_KEY);
    }

    struct ConsumeAuth {
        uint256 deadline;
        bytes signature;
    }

    function _mintAsUser(string memory text, uint256 pathId, uint256 privateKey) private returns (uint256 tokenId) {
        return _mintAsUserWithProvenance(text, DEFAULT_PROVENANCE, pathId, privateKey);
    }

    function _mintAsUserWithProvenance(
        string memory text,
        string memory provenance,
        uint256 pathId,
        uint256 privateKey
    ) private returns (uint256 tokenId) {
        ConsumeAuth memory auth = _signConsume(pathId, privateKey);
        vm.prank(user);
        return token.mint(text, pathId, DEFAULT_SPEC_ID, DEFAULT_PROMPT_HASH, provenance, auth.deadline, auth.signature);
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
                token.PATH_MOVEMENT_THOUGHT(),
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

    function _assertOversizeProvenanceReverts(string memory provenance, uint256 pathId) private {
        ConsumeAuth memory auth = _signConsume(pathId, USER_KEY);
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                ThoughtToken.ProvenanceTooLarge.selector,
                bytes(provenance).length,
                token.MAX_PROVENANCE_BYTES()
            )
        );
        token.mint(
            "OVERSIZE",
            pathId,
            DEFAULT_SPEC_ID,
            DEFAULT_PROMPT_HASH,
            provenance,
            auth.deadline,
            auth.signature
        );
        require(!path.thoughtConsumed(pathId), "oversize provenance should not consume path");
    }

    function _contains(string memory haystack, string memory needle) private pure returns (bool) {
        bytes memory source = bytes(haystack);
        bytes memory target = bytes(needle);

        if (target.length == 0 || target.length > source.length) {
            return false;
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
                return true;
            }
        }

        return false;
    }

    function _equal(string memory left, string memory right) private pure returns (bool) {
        return keccak256(bytes(left)) == keccak256(bytes(right));
    }

    function _bytesEqual(bytes memory left, bytes memory right) private pure returns (bool) {
        return keccak256(left) == keccak256(right);
    }

    function _bytesRepeat(string memory char_, uint256 count) private pure returns (bytes memory) {
        bytes memory charBytes = bytes(char_);
        bytes memory output = new bytes(charBytes.length * count);
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = 0; j < charBytes.length; j++) {
                output[i * charBytes.length + j] = charBytes[j];
            }
        }
        return output;
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
