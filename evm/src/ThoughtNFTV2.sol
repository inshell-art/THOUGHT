// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Base64} from "./Base64.sol";

interface IERC721ReceiverV2 {
    function onERC721Received(address operator, address from, uint256 tokenId, bytes calldata data)
        external
        returns (bytes4);
}

interface IPathNFTV2 {
    function consumeUnit(uint256 pathId, bytes32 movement, address claimer, uint256 deadline, bytes calldata signature)
        external
        returns (uint256);
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

contract ThoughtNFTV2 {
    enum DisplayKind {
        Prompt,
        Agent
    }

    struct DisplayMeasure {
        uint256 byteLength;
        uint256 displayUnits;
    }

    struct MintThoughtV2Input {
        string promptLine;
        string agentLine;
        uint256 pathId;
        bytes32 thoughtSpecId;
        bytes32 thoughtSpecHash;
        string provenanceJson;
        uint256 deadline;
        bytes pathSignature;
    }

    struct ThoughtRecordV2 {
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

    error ApprovalCallerNotOwnerNorApproved();
    error ApprovalToCurrentOwner();
    error BalanceQueryForZeroAddress();
    error DisplayLineEmpty(DisplayKind kind);
    error DisplayLineTooLarge(DisplayKind kind, uint256 actual, uint256 max);
    error DisplayLineTooWide(DisplayKind kind, uint256 actual, uint256 max);
    error EmptyProvenance();
    error InvalidAsciiCase(DisplayKind kind, bytes1 char);
    error InvalidDisplayCharacter(DisplayKind kind, uint256 codepoint);
    error InvalidDisplaySpacing(DisplayKind kind);
    error InvalidPathNft();
    error InvalidReceiver();
    error InvalidSender();
    error InvalidThoughtSpecPair(bytes32 thoughtSpecId, bytes32 thoughtSpecHash);
    error InvalidThoughtSpecRegistry();
    error InvalidUtf8(DisplayKind kind);
    error NonexistentToken();
    error NotAuthorized();
    error ProvenanceTooLarge(uint256 size, uint256 max);
    error ReentrantCall();
    error TransferToNonReceiverImplementer();
    error TransferToZeroAddress();
    error WorkAlreadyMinted(bytes32 workHash, uint256 tokenId);

    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
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
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    string public constant name = "THOUGHT";
    string public constant symbol = "THOUGHT";

    bytes32 public constant THOUGHT_MOVEMENT = bytes32("THOUGHT");
    bytes32 public constant WORK_DOMAIN = keccak256("INSHELL_THOUGHT_V2_WORK");
    bytes32 public constant RENDER_DOMAIN = keccak256("THOUGHT_RENDER_V2");

    uint256 public constant PROMPT_MAX_BYTES = 320;
    uint256 public constant AGENT_MAX_BYTES = 180;
    uint256 public constant PROMPT_MAX_UNITS = 433;
    uint256 public constant AGENT_MAX_UNITS = 162;
    uint256 public constant MAX_PROVENANCE_BYTES = 20_000;

    uint256 private constant SVG_WIDTH = 960;
    uint256 private constant SVG_HEIGHT = 960;
    string private constant WORK_FRAME_COLOR = "#202020";
    string private constant WORK_FRAME_TRANSFORM = "translate(16 16) scale(0.9666666666666667)";
    uint256 private constant AGENT_X = 480;
    uint256 private constant AGENT_Y = 420;
    uint256 private constant AGENT_TARGET_WIDTH = 820;
    uint256 private constant AGENT_BASE_FONT = 118;
    uint256 private constant AGENT_MIN_FONT = 48;
    uint256 private constant PROMPT_X = 480;
    uint256 private constant PROMPT_Y = 830;
    uint256 private constant PROMPT_TARGET_WIDTH = 820;
    uint256 private constant PROMPT_BASE_FONT = 34;
    uint256 private constant PROMPT_MIN_FONT = 18;
    uint256 private constant BINARY_BG_X = 48;
    uint256 private constant BINARY_BG_Y = 57;
    uint256 private constant BINARY_BG_ROWS = 48;
    uint256 private constant BINARY_BG_ROW_GAP = 18;
    uint256 private constant BINARY_BG_WIDTH = 864;
    uint256 private constant BINARY_BG_HEIGHT = (BINARY_BG_ROWS - 1) * BINARY_BG_ROW_GAP;
    uint256 private constant BINARY_BG_DOT_RADIUS_NUMERATOR = 32;
    uint256 private constant BINARY_BG_DOT_RADIUS_DENOMINATOR = 100;
    string private constant FONT_STACK =
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Noto Sans Mono', 'Noto Sans Mono CJK SC', 'Noto Sans Mono CJK JP', 'Noto Sans Mono CJK KR', 'Noto Sans', monospace, sans-serif";
    bytes16 private constant HEX_DIGITS = "0123456789abcdef";

    address public immutable pathNft;
    address public immutable thoughtSpecRegistry;
    uint256 public totalSupply;
    mapping(bytes32 => uint256) public tokenOfWorkHash;

    mapping(uint256 => address) private _ownerOf;
    mapping(address => uint256) private _balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    mapping(uint256 => ThoughtRecordV2) private _records;
    mapping(uint256 => DisplayMeasure) private _promptMeasures;
    mapping(uint256 => DisplayMeasure) private _agentMeasures;
    uint256 private _mintLocked;

    constructor(address pathNft_, address thoughtSpecRegistry_) {
        if (pathNft_ == address(0) || pathNft_.code.length == 0) {
            revert InvalidPathNft();
        }
        if (thoughtSpecRegistry_ == address(0) || thoughtSpecRegistry_.code.length == 0) {
            revert InvalidThoughtSpecRegistry();
        }

        pathNft = pathNft_;
        thoughtSpecRegistry = thoughtSpecRegistry_;
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

    function mint(MintThoughtV2Input calldata input) external nonReentrant returns (uint256 tokenId) {
        DisplayMeasure memory promptMeasure = _validateDisplayLine(input.promptLine, DisplayKind.Prompt);
        DisplayMeasure memory agentMeasure = _validateDisplayLine(input.agentLine, DisplayKind.Agent);
        bytes memory provenanceBytes = bytes(input.provenanceJson);
        if (provenanceBytes.length == 0) {
            revert EmptyProvenance();
        }
        if (provenanceBytes.length > MAX_PROVENANCE_BYTES) {
            revert ProvenanceTooLarge(provenanceBytes.length, MAX_PROVENANCE_BYTES);
        }

        bytes32 promptLineHash = keccak256(bytes(input.promptLine));
        bytes32 agentLineHash = keccak256(bytes(input.agentLine));
        bytes32 mintedWorkHash = _workHash(promptLineHash, agentLineHash);
        uint256 existingTokenId = tokenOfWorkHash[mintedWorkHash];
        if (existingTokenId != 0) {
            revert WorkAlreadyMinted(mintedWorkHash, existingTokenId);
        }

        bytes32 provenanceHash = keccak256(provenanceBytes);
        if (
            input.thoughtSpecId == bytes32(0) || input.thoughtSpecHash == bytes32(0)
                || !IThoughtSpecRegistryV2(thoughtSpecRegistry).isRegisteredThoughtSpec(
                    input.thoughtSpecId, input.thoughtSpecHash
                )
        ) {
            revert InvalidThoughtSpecPair(input.thoughtSpecId, input.thoughtSpecHash);
        }

        uint256 pathSerial =
            IPathNFTV2(pathNft).consumeUnit(input.pathId, THOUGHT_MOVEMENT, msg.sender, input.deadline, input.pathSignature);

        uint64 mintedAt = uint64(block.timestamp);
        tokenId = totalSupply + 1;
        totalSupply = tokenId;
        tokenOfWorkHash[mintedWorkHash] = tokenId;
        _records[tokenId] = ThoughtRecordV2({
            promptLine: input.promptLine,
            agentLine: input.agentLine,
            provenanceJson: input.provenanceJson,
            promptLineHash: promptLineHash,
            agentLineHash: agentLineHash,
            workHash: mintedWorkHash,
            provenanceHash: provenanceHash,
            thoughtSpecId: input.thoughtSpecId,
            thoughtSpecHash: input.thoughtSpecHash,
            pathId: input.pathId,
            pathSerial: pathSerial,
            minter: msg.sender,
            mintedAt: mintedAt
        });
        _promptMeasures[tokenId] = promptMeasure;
        _agentMeasures[tokenId] = agentMeasure;

        _mint(msg.sender, tokenId);
        emit PathThoughtConsumedV2(tokenId, input.pathId, pathSerial, msg.sender);
        emit ThoughtMintedV2(
            tokenId,
            msg.sender,
            mintedWorkHash,
            promptLineHash,
            agentLineHash,
            input.pathId,
            pathSerial,
            input.thoughtSpecId,
            input.thoughtSpecHash
        );
    }

    function workHash(bytes32 promptLineHash, bytes32 agentLineHash) external pure returns (bytes32) {
        return _workHash(promptLineHash, agentLineHash);
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
        return _records[tokenId].promptLineHash;
    }

    function agentLineHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return _records[tokenId].agentLineHash;
    }

    function workHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return _records[tokenId].workHash;
    }

    function provenanceHashOf(uint256 tokenId) external view returns (bytes32) {
        _requireMinted(tokenId);
        return _records[tokenId].provenanceHash;
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

    function recordOf(uint256 tokenId) external view returns (ThoughtRecordV2 memory) {
        _requireMinted(tokenId);
        return _records[tokenId];
    }

    function thoughtSpecOf(uint256 tokenId)
        external
        view
        returns (bytes32 specId, bytes32 specHash, string memory specName, string memory ref)
    {
        _requireMinted(tokenId);
        ThoughtRecordV2 storage record = _records[tokenId];
        specId = record.thoughtSpecId;
        specHash = record.thoughtSpecHash;
        (bool exists, string memory specName_, bytes32 registeredHash, string memory ref_,,,) =
            IThoughtSpecRegistryV2(thoughtSpecRegistry).thoughtSpecMeta(specId);
        if (exists && registeredHash == specHash) {
            specName = specName_;
            ref = ref_;
        }
    }

    function svgOf(uint256 tokenId) public view returns (string memory) {
        _requireMinted(tokenId);
        return _renderSvg(_records[tokenId], _promptMeasures[tokenId], _agentMeasures[tokenId]);
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        _requireMinted(tokenId);
        ThoughtRecordV2 storage record = _records[tokenId];
        string memory svg = _renderSvg(record, _promptMeasures[tokenId], _agentMeasures[tokenId]);
        string memory metadata = string.concat(
            '{"name":"THOUGHT #',
            _toString(tokenId),
            '","description":"A THOUGHT is a human prompt transformed by an Agent into a mintable work.',
            '","image":"data:image/svg+xml;base64,',
            Base64.encode(bytes(svg)),
            '","attributes":',
            _tokenAttributes(record),
            ',"thought":',
            _tokenThought(record),
            "}"
        );

        return string.concat("data:application/json;base64,", Base64.encode(bytes(metadata)));
    }

    function _tokenAttributes(ThoughtRecordV2 storage record) private view returns (string memory) {
        return string.concat(
            '[{"trait_type":"Render","value":"THOUGHT V2"},{"trait_type":"PATH","value":"',
            _toString(record.pathId),
            '"},{"trait_type":"PATH Serial","value":"',
            _toString(record.pathSerial),
            '"},{"trait_type":"Spec","value":"',
            _jsonBare(_specNameOf(record)),
            '"}]'
        );
    }

    function _tokenThought(ThoughtRecordV2 storage record) private view returns (string memory) {
        return string.concat(
            '{"version":"v2","promptLine":',
            _jsonString(record.promptLine),
            ',"agentLine":',
            _jsonString(record.agentLine),
            ',"promptLineHash":"',
            _bytes32ToHex(record.promptLineHash),
            '","agentLineHash":"',
            _bytes32ToHex(record.agentLineHash),
            '","workHash":"',
            _bytes32ToHex(record.workHash),
            '","provenanceHash":"',
            _bytes32ToHex(record.provenanceHash),
            '","thoughtSpecId":"',
            _bytes32ToHex(record.thoughtSpecId),
            '","thoughtSpecHash":"',
            _bytes32ToHex(record.thoughtSpecHash),
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
    }

    function _specNameOf(ThoughtRecordV2 storage record) private view returns (string memory) {
        (bool exists, string memory specName, bytes32 registeredHash,,,,) =
            IThoughtSpecRegistryV2(thoughtSpecRegistry).thoughtSpecMeta(record.thoughtSpecId);
        if (exists && registeredHash == record.thoughtSpecHash) {
            return specName;
        }
        return _bytes32ToHex(record.thoughtSpecId);
    }

    function _renderSvg(
        ThoughtRecordV2 storage record,
        DisplayMeasure storage promptMeasure,
        DisplayMeasure storage agentMeasure
    ) private view returns (string memory) {
        (uint256 agentFontSize, bool agentSqueezed) =
            _fontSize(DisplayKind.Agent, agentMeasure.displayUnits, AGENT_TARGET_WIDTH, AGENT_BASE_FONT, AGENT_MIN_FONT);
        (uint256 promptFontSize, bool promptSqueezed) =
            _fontSize(
                DisplayKind.Prompt, promptMeasure.displayUnits, PROMPT_TARGET_WIDTH, PROMPT_BASE_FONT, PROMPT_MIN_FONT
            );

        return string.concat(
            '<svg xmlns="http://www.w3.org/2000/svg" width="',
            _toString(SVG_WIDTH),
            '" height="',
            _toString(SVG_HEIGHT),
            '" viewBox="0 0 960 960"><rect id="work-frame" width="960" height="960" fill="',
            WORK_FRAME_COLOR,
            '"/><g id="work-canvas" transform="',
            WORK_FRAME_TRANSFORM,
            '"><rect id="canvas-bg" width="960" height="960" fill="#050505"/>',
            _svgBinaryBackground(record.promptLine, record.agentLine),
            _svgTextLine(
                AGENT_X,
                AGENT_Y,
                AGENT_TARGET_WIDTH,
                agentFontSize,
                "#f4f4f4",
                record.agentLine,
                agentSqueezed
            ),
            _svgTextLine(
                PROMPT_X,
                PROMPT_Y,
                PROMPT_TARGET_WIDTH,
                promptFontSize,
                "#b8b8b8",
                record.promptLine,
                promptSqueezed
            ),
            "</g></svg>"
        );
    }

    function _svgBinaryBackground(string memory promptLine, string memory agentLine) private pure returns (string memory) {
        bytes memory promptData = bytes(promptLine);
        bytes memory agentData = bytes(agentLine);
        if (promptData.length + agentData.length == 0) {
            return "";
        }

        bytes memory output = abi.encodePacked(
            '<g id="binary-background" opacity="0.50" fill="#006100" aria-label="UTF-8 binary background: prompt line bytes then agent line bytes; filled green circles are one bits and hollow green circles are zero bits"'
        );
        uint256 totalBits = (promptData.length + agentData.length) * 8;
        uint256 columns = _binaryGridColumns(totalBits);
        uint256 rows = (totalBits + columns - 1) / columns;
        uint256 cellSize = BINARY_BG_WIDTH / columns;
        uint256 cellSizeY = BINARY_BG_HEIGHT / rows;
        if (cellSizeY < cellSize) {
            cellSize = cellSizeY;
        }
        if (cellSize < 1) {
            cellSize = 1;
        }
        uint256 originX = BINARY_BG_X + (BINARY_BG_WIDTH - columns * cellSize) / 2;
        uint256 originY = BINARY_BG_Y + (BINARY_BG_HEIGHT - rows * cellSize) / 2;
        uint256 radius =
            (cellSize * BINARY_BG_DOT_RADIUS_NUMERATOR + BINARY_BG_DOT_RADIUS_DENOMINATOR - 1)
                / BINARY_BG_DOT_RADIUS_DENOMINATOR;
        output = abi.encodePacked(
            output,
            ' data-grid-columns="',
            _toString(columns),
            '" data-grid-rows="',
            _toString(rows),
            '" data-cell-size="',
            _toString(cellSize),
            '" data-origin-x="',
            _toString(originX),
            '" data-origin-y="',
            _toString(originY),
            '" data-dot-radius="',
            _toString(radius),
            '" data-zero="hollow-circle">'
        );

        for (uint256 bitOffset = 0; bitOffset < totalBits; bitOffset++) {
            uint256 column = bitOffset % columns;
            uint256 row = bitOffset / columns;
            bool isOne = _binarySourceIsOne(promptData, agentData, bitOffset);
            output = abi.encodePacked(
                output,
                '<circle cx="',
                _toString(originX + column * cellSize + cellSize / 2),
                '" cy="',
                _toString(originY + row * cellSize + cellSize / 2),
                '" r="',
                _toString(radius),
                isOne ? '"/>' : '" fill="none" stroke="#006100" stroke-width="1"/>'
            );
        }

        return string(abi.encodePacked(output, "</g>"));
    }

    function _binaryGridColumns(uint256 totalBits) private pure returns (uint256) {
        uint256 columns = _sqrtCeil((totalBits * BINARY_BG_WIDTH + BINARY_BG_HEIGHT - 1) / BINARY_BG_HEIGHT);
        uint256 rows = (totalBits + columns - 1) / columns;
        if (rows <= BINARY_BG_ROWS) {
            return columns;
        }
        return (totalBits + BINARY_BG_ROWS - 1) / BINARY_BG_ROWS;
    }

    function _sqrtCeil(uint256 value) private pure returns (uint256) {
        uint256 root = 1;
        while (root * root < value) {
            root++;
        }
        return root;
    }

    function _binarySourceIsOne(bytes memory promptData, bytes memory agentData, uint256 bitOffset)
        private
        pure
        returns (bool)
    {
        uint256 byteOffset = bitOffset / 8;
        uint256 bitIndex = bitOffset % 8;
        uint8 value;
        if (byteOffset < promptData.length) {
            value = uint8(promptData[byteOffset]);
        } else {
            value = uint8(agentData[byteOffset - promptData.length]);
        }
        return ((uint256(value) >> (7 - bitIndex)) & 1) == 1;
    }

    function _svgTextLine(
        uint256 x,
        uint256 y,
        uint256 targetWidth,
        uint256 fontSize,
        string memory fill,
        string memory value,
        bool squeezed
    ) private pure returns (string memory) {
        return string.concat(
            '<text x="',
            _toString(x),
            '" y="',
            _toString(y),
            '" text-anchor="middle" dominant-baseline="middle" font-family="',
            FONT_STACK,
            '" font-size="',
            _toString(fontSize),
            '" fill="',
            fill,
            '"',
            squeezed
                ? string.concat(
                    ' textLength="',
                    _toString(targetWidth),
                    '" lengthAdjust="spacingAndGlyphs"'
                )
                : "",
            ">",
            _xmlEscape(value),
            "</text>"
        );
    }

    function _fontSize(
        DisplayKind kind,
        uint256 displayUnits,
        uint256 targetWidth,
        uint256 baseFont,
        uint256 minFont
    )
        private
        pure
        returns (uint256 size, bool squeezed)
    {
        uint256 fit = (targetWidth * 10) / displayUnits;
        if (fit >= baseFont) {
            return (baseFont, false);
        }
        if (fit < minFont) {
            revert DisplayLineTooWide(kind, displayUnits, targetWidth);
        }
        return (fit, true);
    }

    function _validateDisplayLine(string memory value, DisplayKind kind)
        private
        pure
        returns (DisplayMeasure memory measure)
    {
        bytes memory data = bytes(value);
        uint256 maxBytes = kind == DisplayKind.Prompt ? PROMPT_MAX_BYTES : AGENT_MAX_BYTES;
        uint256 maxUnits = kind == DisplayKind.Prompt ? PROMPT_MAX_UNITS : AGENT_MAX_UNITS;

        if (data.length == 0) {
            revert DisplayLineEmpty(kind);
        }
        if (data.length > maxBytes) {
            revert DisplayLineTooLarge(kind, data.length, maxBytes);
        }

        uint256 i = 0;
        bool previousWasSpace = false;
        while (i < data.length) {
            (uint256 codepoint, uint256 next) = _decodeUtf8(data, i, kind);
            if (codepoint == 0x20) {
                if (i == 0 || next == data.length || previousWasSpace) {
                    revert InvalidDisplaySpacing(kind);
                }
                previousWasSpace = true;
                measure.displayUnits += 4;
            } else {
                previousWasSpace = false;
                _validateCodepoint(codepoint, kind);
                measure.displayUnits += _displayUnits(codepoint);
            }
            i = next;
        }

        if (measure.displayUnits > maxUnits) {
            revert DisplayLineTooWide(kind, measure.displayUnits, maxUnits);
        }
        measure.byteLength = data.length;
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
            codepoint = ((uint256(b0) & 0x0F) << 12) | ((uint256(b1) & 0x3F) << 6)
                | (uint256(uint8(data[i + 2])) & 0x3F);
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
        if (_isRejectedSpace(codepoint) || _isInvisibleControl(codepoint)) {
            revert InvalidDisplayCharacter(kind, codepoint);
        }

        if (kind == DisplayKind.Prompt && codepoint >= 0x41 && codepoint <= 0x5A) {
            revert InvalidAsciiCase(kind, bytes1(uint8(codepoint)));
        }
        if (kind == DisplayKind.Agent && codepoint >= 0x61 && codepoint <= 0x7A) {
            revert InvalidAsciiCase(kind, bytes1(uint8(codepoint)));
        }
    }

    function _isRejectedSpace(uint256 codepoint) private pure returns (bool) {
        return codepoint == 0x00A0 || codepoint == 0x1680 || codepoint == 0x180E
            || (codepoint >= 0x2000 && codepoint <= 0x200A) || codepoint == 0x2028 || codepoint == 0x2029
            || codepoint == 0x202F || codepoint == 0x205F || codepoint == 0x3000;
    }

    function _isInvisibleControl(uint256 codepoint) private pure returns (bool) {
        return (codepoint >= 0x200B && codepoint <= 0x200F) || (codepoint >= 0x202A && codepoint <= 0x202E)
            || (codepoint >= 0x2060 && codepoint <= 0x206F) || codepoint == 0xFEFF;
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

    function _workHash(bytes32 promptLineHash, bytes32 agentLineHash) internal pure returns (bytes32) {
        return keccak256(abi.encode(WORK_DOMAIN, RENDER_DOMAIN, promptLineHash, agentLineHash));
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

        try IERC721ReceiverV2(to).onERC721Received(msg.sender, from, tokenId, data) returns (bytes4 retval) {
            return retval == IERC721ReceiverV2.onERC721Received.selector;
        } catch {
            return false;
        }
    }

    function _requireMinted(uint256 tokenId) private view {
        if (_ownerOf[tokenId] == address(0)) {
            revert NonexistentToken();
        }
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
            } else {
                output[cursor++] = input[i];
            }
        }

        return string(output);
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
