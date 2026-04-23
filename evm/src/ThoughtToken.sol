// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "./Base64.sol";

interface IERC721Receiver {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

contract ThoughtToken {
    error ApprovalCallerNotOwnerNorApproved();
    error ApprovalToCurrentOwner();
    error BalanceQueryForZeroAddress();
    error EmptyThought();
    error InvalidReceiver();
    error InvalidRecipient();
    error InvalidSender();
    error NonexistentToken();
    error NotAuthorized();
    error NotOwner();
    error TransferToNonReceiverImplementer();
    error TransferToZeroAddress();
    error WrongPayment();

    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event ThoughtMinted(uint256 indexed tokenId, address indexed author, string text);

    struct ThoughtData {
        address author;
        string text;
    }

    string public constant name = "THOUGHT";
    string public constant symbol = "THOUGHT";

    uint256 public constant MAX_TEXT_LEN = 120;
    uint256 private constant CANVAS_SIZE = 960;
    uint256 private constant CANVAS_PADDING = 28;
    uint256 private constant IMAGE_SIZE = 29;
    uint256 private constant IMAGE_GAP = 6;
    uint256 private constant TEXT_Y = 932;
    uint256 private constant SCALE_BPS = 10_000;

    address public immutable owner;
    uint256 public mintPrice;
    uint256 public totalSupply;

    mapping(uint256 tokenId => address owner) private _ownerOf;
    mapping(address owner => uint256 balance) private _balanceOf;
    mapping(uint256 tokenId => address approved) public getApproved;
    mapping(address owner => mapping(address operator => bool approved)) public isApprovedForAll;
    mapping(uint256 tokenId => ThoughtData data) private _thoughts;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
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
        return _thoughts[tokenId].author;
    }

    function thoughtText(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _thoughts[tokenId].text;
    }

    function normalizeThought(string calldata rawText) external pure returns (string memory) {
        return _normalizeThought(rawText);
    }

    function renderThoughtSvg(string calldata rawText) external pure returns (string memory) {
        return _buildSvg(_normalizeThought(rawText));
    }

    function renderTokenSvg(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        return _buildSvg(_thoughts[tokenId].text);
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

    function mint(string calldata rawText) external payable returns (uint256 tokenId) {
        if (msg.value != mintPrice) {
            revert WrongPayment();
        }

        string memory normalized = _normalizeThought(rawText);
        if (bytes(normalized).length == 0) {
            revert EmptyThought();
        }

        tokenId = totalSupply + 1;
        totalSupply = tokenId;
        _thoughts[tokenId] = ThoughtData({author: msg.sender, text: normalized});
        _mint(msg.sender, tokenId);
        emit ThoughtMinted(tokenId, msg.sender, normalized);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);

        string memory text = _thoughts[tokenId].text;
        string memory svg = _buildSvg(text);
        string memory image = string.concat("data:image/svg+xml;base64,", Base64.encode(bytes(svg)));
        string memory json = string.concat(
            '{"name":"THOUGHT #',
            _toString(tokenId),
            '","description":"One round in. canvas out.","attributes":[{"trait_type":"text","value":"',
            text,
            '"},{"trait_type":"chars","display_type":"number","value":"',
            _toString(bytes(text).length),
            '"}],"image":"',
            image,
            '"}'
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(json)));
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

    function _normalizeThought(string memory rawText) private pure returns (string memory) {
        bytes memory input = bytes(rawText);
        bytes memory output = new bytes(MAX_TEXT_LEN);
        uint256 outputLen = 0;
        bool pendingSpace = false;

        for (uint256 i = 0; i < input.length; i++) {
            uint8 code = uint8(input[i]);
            if (code >= 97 && code <= 122) {
                code -= 32;
            }

            bool isLetter = code >= 65 && code <= 90;

            if (!isLetter) {
                if (outputLen > 0) {
                    pendingSpace = true;
                }
                continue;
            }

            if (pendingSpace) {
                if (outputLen >= MAX_TEXT_LEN) {
                    break;
                }
                output[outputLen] = bytes1(uint8(32));
                outputLen += 1;
                pendingSpace = false;
            }

            if (outputLen >= MAX_TEXT_LEN) {
                break;
            }

            output[outputLen] = bytes1(code);
            outputLen += 1;
        }

        assembly {
            mstore(output, outputLen)
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
                text,
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
