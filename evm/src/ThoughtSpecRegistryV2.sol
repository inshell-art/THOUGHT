// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtReleaseConstants} from "./ThoughtReleaseConstants.sol";

/// @notice Append-only compact commitments to complete THOUGHT protocol releases.
contract ThoughtSpecRegistryV2 {
    struct ReleaseRecord {
        bytes32 manifestHash;
        string manifestURI;
        address registrar;
        uint64 registeredAt;
    }

    error DuplicateRelease(bytes32 protocolReleaseId);
    error EmptyManifestHash();
    error InvalidManifestUriLength(uint256 actual, uint256 minimum, uint256 maximum);
    error NotRegistrar();
    error RegistrarZeroAddress();
    error ReleaseNotFound(bytes32 protocolReleaseId);

    event ReleaseRegistered(
        bytes32 indexed protocolReleaseId, bytes32 indexed manifestHash, address indexed registrar, string manifestURI
    );

    uint256 public constant MIN_MANIFEST_URI_BYTES = 1;
    uint256 public constant MAX_MANIFEST_URI_BYTES = 200;
    bytes32 public constant RELEASE_ID_DOMAIN = ThoughtReleaseConstants.RELEASE_ID_DOMAIN;

    address public immutable owner;

    mapping(bytes32 protocolReleaseId => ReleaseRecord record) private _releases;

    constructor(address owner_) {
        if (owner_ == address(0)) revert RegistrarZeroAddress();
        owner = owner_;
    }

    function registerRelease(bytes32 manifestHash, string calldata manifestURI)
        external
        returns (bytes32 protocolReleaseId)
    {
        if (msg.sender != owner) revert NotRegistrar();
        if (manifestHash == bytes32(0)) revert EmptyManifestHash();
        uint256 uriLength = bytes(manifestURI).length;
        if (uriLength < MIN_MANIFEST_URI_BYTES || uriLength > MAX_MANIFEST_URI_BYTES) {
            revert InvalidManifestUriLength(uriLength, MIN_MANIFEST_URI_BYTES, MAX_MANIFEST_URI_BYTES);
        }

        protocolReleaseId = deriveReleaseId(manifestHash);
        if (_releases[protocolReleaseId].manifestHash != bytes32(0)) {
            revert DuplicateRelease(protocolReleaseId);
        }

        _releases[protocolReleaseId] = ReleaseRecord({
            manifestHash: manifestHash,
            manifestURI: manifestURI,
            registrar: msg.sender,
            registeredAt: uint64(block.timestamp)
        });
        emit ReleaseRegistered(protocolReleaseId, manifestHash, msg.sender, manifestURI);
    }

    function deriveReleaseId(bytes32 manifestHash) public pure returns (bytes32) {
        return keccak256(abi.encode(RELEASE_ID_DOMAIN, manifestHash));
    }

    function isRegistered(bytes32 protocolReleaseId) public view returns (bool) {
        return _releases[protocolReleaseId].manifestHash != bytes32(0);
    }

    function getRelease(bytes32 protocolReleaseId) public view returns (ReleaseRecord memory) {
        ReleaseRecord memory record = _releases[protocolReleaseId];
        if (record.manifestHash == bytes32(0)) revert ReleaseNotFound(protocolReleaseId);
        return record;
    }
}
