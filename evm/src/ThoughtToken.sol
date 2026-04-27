// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "./Base64.sol";

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

interface IPathNFT {
    function consumeUnit(
        uint256 pathId,
        bytes32 movement,
        address claimer,
        uint256 deadline,
        bytes calldata signature
    ) external returns (uint32);
}

interface IThoughtSpecRegistry {
    function specMeta(bytes32 specId)
        external
        view
        returns (
            bytes32 specHash,
            string memory ref,
            address pointer,
            uint32 byteLength,
            uint64 registeredAt,
            bool exists
        );
}

contract ThoughtToken {
    error ApprovalCallerNotOwnerNorApproved();
    error ApprovalToCurrentOwner();
    error BalanceQueryForZeroAddress();
    error EmptyProvenance();
    error EmptyThoughtText();
    error InvalidPathNft();
    error InvalidReceiver();
    error InvalidRecipient();
    error InvalidSender();
    error InvalidThoughtSpecRegistry();
    error NonexistentToken();
    error NotAuthorized();
    error NotOwner();
    error ProvenanceTooLarge(uint256 actual, uint256 max);
    error RawTextTooLarge(uint256 actual, uint256 max);
    error ReentrantCall();
    error ThoughtAlreadyMinted(bytes32 textHash, uint256 tokenId);
    error ThoughtTextTooLarge(uint256 actual, uint256 max);
    error UnknownThoughtSpec(bytes32 thoughtSpecId);
    error TransferToNonReceiverImplementer();
    error TransferToZeroAddress();
    error WrongPayment();

    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event PathThoughtConsumed(uint256 indexed pathId, address indexed claimer, uint32 serial);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event ThoughtMinted(
        uint256 indexed tokenId,
        address indexed minter,
        uint256 indexed pathId,
        bytes32 textHash,
        bytes32 provenanceHash,
        bytes32 thoughtSpecId,
        uint64 mintedAt
    );

    struct ThoughtRecord {
        string rawText;
        string provenanceJson;
        bytes32 textHash;
        bytes32 provenanceHash;
        bytes32 thoughtSpecId;
        uint256 pathId;
        uint32 pathSerial;
        address minter;
        uint64 mintedAt;
    }

    string public constant name = "THOUGHT";
    string public constant symbol = "THOUGHT";

    uint256 public constant MAX_RAW_TEXT_BYTES = 4096;
    uint256 public constant MAX_PROVENANCE_BYTES = 1024;
    bytes32 public constant PATH_MOVEMENT_THOUGHT = bytes32("THOUGHT");
    bytes32 public constant DEFAULT_THOUGHT_SPEC_ID = keccak256("thought.md.v1");
    uint256 private constant CANVAS_SIZE = 960;
    uint256 private constant CANVAS_PADDING = 28;
    uint256 private constant IMAGE_SIZE = 29;
    uint256 private constant IMAGE_GAP = 6;
    uint256 private constant TEXT_Y = 932;
    uint256 private constant SCALE_BPS = 10_000;
    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    address public immutable owner;
    address public immutable pathNft;
    address public immutable thoughtSpecRegistry;
    uint256 public mintPrice;
    uint256 public totalSupply;
    mapping(bytes32 textHash => uint256 tokenId) public tokenOfTextHash;

    mapping(uint256 tokenId => address owner) private _ownerOf;
    mapping(address owner => uint256 balance) private _balanceOf;
    mapping(uint256 tokenId => address approved) public getApproved;
    mapping(address owner => mapping(address operator => bool approved)) public isApprovedForAll;
    mapping(uint256 tokenId => ThoughtRecord record) private _thoughts;
    uint256 private _mintLocked;

    constructor(address pathNft_, address thoughtSpecRegistry_) {
        if (pathNft_ == address(0) || pathNft_.code.length == 0) {
            revert InvalidPathNft();
        }
        if (thoughtSpecRegistry_ == address(0) || thoughtSpecRegistry_.code.length == 0) {
            revert InvalidThoughtSpecRegistry();
        }

        owner = msg.sender;
        pathNft = pathNft_;
        thoughtSpecRegistry = thoughtSpecRegistry_;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    modifier nonReentrant() {
        if (_mintLocked == 1) {
            revert ReentrantCall();
        }
        _mintLocked = 1;
        _;
        _mintLocked = 0;
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

    function authorOf(uint256 tokenId) external view returns (address) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].minter;
    }

    function thoughtText(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].rawText;
    }

    function pathIdOf(uint256 tokenId) external view returns (uint256) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].pathId;
    }

    function pathSerialOf(uint256 tokenId) external view returns (uint32) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].pathSerial;
    }

    function isThoughtMinted(bytes32 textHash) external view returns (bool) {
        return tokenOfTextHash[textHash] != 0;
    }

    function tokenOfThought(bytes32 textHash) external view returns (uint256) {
        return tokenOfTextHash[textHash];
    }

    function getThought(uint256 tokenId) external view returns (ThoughtRecord memory) {
        _requireMinted(tokenId);
        return _thoughts[tokenId];
    }

    function rawTextOf(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].rawText;
    }

    function provenanceOf(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].provenanceJson;
    }

    function textHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].textHash;
    }

    function provenanceHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].provenanceHash;
    }

    function recordOf(uint256 tokenId) external view returns (ThoughtRecord memory) {
        _requireMinted(tokenId);
        return _thoughts[tokenId];
    }

    function normalizeThought(string calldata rawText) external pure returns (string memory) {
        return _canonicalizeThought(rawText);
    }

    function renderThoughtSvg(string calldata rawText) external pure returns (string memory) {
        return _buildSvg(_canonicalizeThought(rawText));
    }

    function renderTokenSvg(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _buildSvg(_thoughts[tokenId].rawText);
    }

    function setMintPrice(uint256 newMintPrice) external onlyOwner {
        mintPrice = newMintPrice;
    }

    function withdraw(address payable recipient) external onlyOwner {
        if (recipient == address(0)) {
            revert InvalidRecipient();
        }
        (bool ok,) = recipient.call{value: address(this).balance}("");
        require(ok, "withdraw failed");
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

    function mint(
        string calldata rawText,
        uint256 pathId,
        bytes32 thoughtSpecId,
        string calldata provenanceJson,
        uint256 deadline,
        bytes calldata pathSignature
    ) external payable nonReentrant returns (uint256 tokenId) {
        if (msg.value != mintPrice) {
            revert WrongPayment();
        }
        if (!_isThoughtSpecRegistered(thoughtSpecId)) {
            revert UnknownThoughtSpec(thoughtSpecId);
        }

        string memory canonicalText = _canonicalizeThought(rawText);
        bytes memory rawBytes = bytes(canonicalText);
        bytes memory provenanceBytes = bytes(provenanceJson);

        if (rawBytes.length == 0) {
            revert EmptyThoughtText();
        }
        if (provenanceBytes.length == 0) {
            revert EmptyProvenance();
        }
        if (rawBytes.length > MAX_RAW_TEXT_BYTES) {
            revert RawTextTooLarge(rawBytes.length, MAX_RAW_TEXT_BYTES);
        }
        if (provenanceBytes.length > MAX_PROVENANCE_BYTES) {
            revert ProvenanceTooLarge(provenanceBytes.length, MAX_PROVENANCE_BYTES);
        }

        bytes32 textHash = keccak256(rawBytes);
        uint256 existingTokenId = tokenOfTextHash[textHash];
        if (existingTokenId != 0) {
            revert ThoughtAlreadyMinted(textHash, existingTokenId);
        }
        bytes32 provenanceHash = keccak256(provenanceBytes);

        uint32 pathSerial = IPathNFT(pathNft).consumeUnit(
            pathId,
            PATH_MOVEMENT_THOUGHT,
            msg.sender,
            deadline,
            pathSignature
        );

        uint64 mintedAt = uint64(block.timestamp);
        tokenId = totalSupply + 1;
        totalSupply = tokenId;
        tokenOfTextHash[textHash] = tokenId;
        _thoughts[tokenId] = ThoughtRecord({
            rawText: canonicalText,
            provenanceJson: provenanceJson,
            textHash: textHash,
            provenanceHash: provenanceHash,
            thoughtSpecId: thoughtSpecId,
            pathId: pathId,
            pathSerial: pathSerial,
            minter: msg.sender,
            mintedAt: mintedAt
        });
        _mint(msg.sender, tokenId);
        emit PathThoughtConsumed(pathId, msg.sender, pathSerial);
        emit ThoughtMinted(tokenId, msg.sender, pathId, textHash, provenanceHash, thoughtSpecId, mintedAt);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);

        ThoughtRecord storage record = _thoughts[tokenId];
        string memory textHash = _bytes32ToHex(record.textHash);
        string memory provenanceHash = _bytes32ToHex(record.provenanceHash);
        string memory thoughtSpecId = _bytes32ToHex(record.thoughtSpecId);
        string memory svg = _buildSvg(record.rawText);
        string memory image = string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg)));
        string memory json = string.concat(
            '{"name":"THOUGHT #',
            _toString(tokenId),
            '","description":',
            _jsonString(record.rawText),
            ',"attributes":',
            _tokenAttributes(record, textHash, provenanceHash, thoughtSpecId),
            ',"thought":',
            _tokenThought(record.rawText, record.provenanceJson),
            ',"properties":',
            _tokenProperties(record, textHash, provenanceHash, thoughtSpecId),
            ',"image":"',
            image,
            '"}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
    }

    function _tokenAttributes(
        ThoughtRecord storage record,
        string memory textHash,
        string memory provenanceHash,
        string memory thoughtSpecId
    ) private view returns (string memory) {
        return string.concat(
            '[{"trait_type":"path","value":"',
            _toString(record.pathId),
            '"},{"trait_type":"schema","value":"thought.provenance.v1',
            '"},{"trait_type":"textHash","value":"',
            textHash,
            '"},{"trait_type":"provenanceHash","value":"',
            provenanceHash,
            '"},{"trait_type":"thoughtSpec","value":"',
            thoughtSpecId,
            '"}]'
        );
    }

    function _tokenThought(string memory rawText, string memory provenanceJson) private pure returns (string memory) {
        return string.concat('{"text":', _jsonString(rawText), ',"provenance":', _jsonString(provenanceJson), "}");
    }

    function _tokenProperties(
        ThoughtRecord storage record,
        string memory textHash,
        string memory provenanceHash,
        string memory thoughtSpecId
    ) private view returns (string memory) {
        return string.concat(
            '{"rawText":',
            _jsonString(record.rawText),
            ',"provenanceJson":',
            _jsonString(record.provenanceJson),
            ',"textHash":"',
            textHash,
            '","provenanceHash":"',
            provenanceHash,
            '","thoughtSpecId":"',
            thoughtSpecId,
            '","pathId":"',
            _toString(record.pathId),
            '","minter":"',
            _addressToHex(record.minter),
            '","mintedAt":',
            _toString(record.mintedAt),
            "}"
        );
    }

    function _isThoughtSpecRegistered(bytes32 thoughtSpecId) private view returns (bool) {
        (,,,,, bool exists) = IThoughtSpecRegistry(thoughtSpecRegistry).specMeta(thoughtSpecId);
        return exists;
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

    function _canonicalizeThought(string memory rawText) private pure returns (string memory) {
        bytes memory input = bytes(rawText);
        uint256 outputLen = 0;

        for (uint256 i = 0; i < input.length; i++) {
            uint8 code = uint8(input[i]);
            if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
                outputLen += 1;
            }
        }

        bytes memory output = new bytes(outputLen);
        uint256 cursor = 0;
        for (uint256 i = 0; i < input.length; i++) {
            uint8 code = uint8(input[i]);
            if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
                if (code >= 97) {
                    code -= 32;
                }
                output[cursor++] = bytes1(code);
            }
        }

        return string(output);
    }

    function _buildSvg(string memory text) private pure returns (string memory) {
        bytes memory chars = bytes(text);
        bytes memory body = abi.encodePacked(
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 960 960' shape-rendering='crispEdges'>",
            "<rect width='960' height='960' fill='#050505'/>"
        );

        if (chars.length > 0) {
            uint256 availableWidth = CANVAS_SIZE - (CANVAS_PADDING * 2);
            uint256 naturalWidth =
                (chars.length * IMAGE_SIZE) + (chars.length > 1 ? (chars.length - 1) * IMAGE_GAP : 0);
            uint256 scaleBps = naturalWidth > availableWidth ? (availableWidth * SCALE_BPS) / naturalWidth : SCALE_BPS;
            uint256 imageSize = (IMAGE_SIZE * scaleBps) / SCALE_BPS;
            uint256 gap = chars.length > 1 ? (IMAGE_GAP * scaleBps) / SCALE_BPS : 0;

            if (imageSize == 0) {
                imageSize = 1;
            }

            uint256 rowWidth = (chars.length * imageSize) + (chars.length > 1 ? (chars.length - 1) * gap : 0);
            uint256 xStart = (CANVAS_SIZE - rowWidth) / 2;
            uint256 yStart = (CANVAS_SIZE - imageSize) / 2;

            for (uint256 i = 0; i < chars.length; i++) {
                if (chars[i] == bytes1(uint8(32))) {
                    continue;
                }
                uint256 x = xStart + (i * (imageSize + gap));
                body = abi.encodePacked(
                    body,
                    "<rect x='",
                    _toString(x),
                    "' y='",
                    _toString(yStart),
                    "' width='",
                    _toString(imageSize),
                    "' height='",
                    _toString(imageSize),
                    "' fill='#",
                    _colorHex(chars[i]),
                    "'/>"
                );
            }

            body = abi.encodePacked(
                body,
                "<text x='480' y='",
                _toString(TEXT_Y),
                "' font-family='monospace' font-size='",
                _toString(_textSize(chars.length)),
                "' font-weight='100' text-anchor='middle' fill='#E8EDF7' fill-opacity='0.72'>",
                _xmlEscape(text),
                "</text>"
            );
        }

        return string(abi.encodePacked(body, "</svg>"));
    }

    function _textSize(uint256 charCount) private pure returns (uint256) {
        if (charCount > 90) {
            return 9;
        }
        if (charCount > 64) {
            return 10;
        }
        if (charCount > 48) {
            return 12;
        }
        if (charCount > 32) {
            return 14;
        }
        return 18;
    }

    function _colorHex(bytes1 char_) private pure returns (string memory) {
        uint8 code = uint8(char_);
        if (code >= 97 && code <= 122) {
            char_ = bytes1(uint8(code - 32));
        }

        if (char_ == "A") return "00ffff";
        if (char_ == "B") return "0000ff";
        if (char_ == "C") return "6f4e37";
        if (char_ == "D") return "6699ff";
        if (char_ == "E") return "fff9e3";
        if (char_ == "F") return "ff00ff";
        if (char_ == "G") return "008000";
        if (char_ == "H") return "ffcc00";
        if (char_ == "I") return "4b0082";
        if (char_ == "J") return "00a86b";
        if (char_ == "K") return "c3b091";
        if (char_ == "L") return "00ff00";
        if (char_ == "M") return "800000";
        if (char_ == "N") return "0a1172";
        if (char_ == "O") return "ffa500";
        if (char_ == "P") return "ffaadd";
        if (char_ == "Q") return "a6a6a6";
        if (char_ == "R") return "ff0000";
        if (char_ == "S") return "fa8072";
        if (char_ == "T") return "008080";
        if (char_ == "U") return "5533ff";
        if (char_ == "V") return "aa55ff";
        if (char_ == "W") return "f5deb3";
        if (char_ == "X") return "bbcccc";
        if (char_ == "Y") return "ffff00";
        return "778877";
    }

    function _xmlEscape(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        uint256 outputLen = 0;

        for (uint256 i = 0; i < input.length; i++) {
            if (input[i] == "&") {
                outputLen += 5;
            } else if (input[i] == "<" || input[i] == ">") {
                outputLen += 4;
            } else if (input[i] == '"' || input[i] == "'") {
                outputLen += 6;
            } else {
                outputLen += 1;
            }
        }

        bytes memory output = new bytes(outputLen);
        uint256 cursor = 0;
        for (uint256 i = 0; i < input.length; i++) {
            uint8 charCode = uint8(input[i]);
            if (input[i] == "&") {
                output[cursor++] = "&";
                output[cursor++] = "a";
                output[cursor++] = "m";
                output[cursor++] = "p";
                output[cursor++] = ";";
            } else if (input[i] == "<") {
                output[cursor++] = "&";
                output[cursor++] = "l";
                output[cursor++] = "t";
                output[cursor++] = ";";
            } else if (input[i] == ">") {
                output[cursor++] = "&";
                output[cursor++] = "g";
                output[cursor++] = "t";
                output[cursor++] = ";";
            } else if (input[i] == '"') {
                output[cursor++] = "&";
                output[cursor++] = "q";
                output[cursor++] = "u";
                output[cursor++] = "o";
                output[cursor++] = "t";
                output[cursor++] = ";";
            } else if (input[i] == "'") {
                output[cursor++] = "&";
                output[cursor++] = "a";
                output[cursor++] = "p";
                output[cursor++] = "o";
                output[cursor++] = "s";
                output[cursor++] = ";";
            } else if (charCode < 0x20 && charCode != 0x09 && charCode != 0x0a && charCode != 0x0d) {
                output[cursor++] = " ";
            } else {
                output[cursor++] = input[i];
            }
        }

        return string(output);
    }

    function _jsonString(string memory value) private pure returns (string memory) {
        return string.concat('"', _jsonEscape(value), '"');
    }

    function _jsonEscape(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        uint256 outputLen = 0;

        for (uint256 i = 0; i < input.length; i++) {
            uint8 charCode = uint8(input[i]);
            if (
                input[i] == '"' ||
                input[i] == "\\" ||
                input[i] == "\n" ||
                input[i] == "\r" ||
                input[i] == "\t"
            ) {
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

    function _bytes32ToHex(bytes32 value) private pure returns (string memory) {
        bytes memory output = new bytes(66);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 charCode = uint8(value[i]);
            output[2 + i * 2] = HEX_DIGITS[charCode >> 4];
            output[3 + i * 2] = HEX_DIGITS[charCode & 0x0f];
        }
        return string(output);
    }

    function _addressToHex(address value) private pure returns (string memory) {
        bytes20 account = bytes20(value);
        bytes memory output = new bytes(42);
        output[0] = "0";
        output[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            uint8 charCode = uint8(account[i]);
            output[2 + i * 2] = HEX_DIGITS[charCode >> 4];
            output[3 + i * 2] = HEX_DIGITS[charCode & 0x0f];
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
            digits += 1;
            temp /= 10;
        }

        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
