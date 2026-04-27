// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractCodeStorage} from "./ContractCodeStorage.sol";

contract ThoughtSpecRegistry {
    error InvalidThoughtSpecPointer(address pointer);
    error NotOwner();
    error ThoughtSpecAlreadyExists(bytes32 specId);
    error ThoughtSpecEmpty();
    error ThoughtSpecHashMismatch(bytes32 expected, bytes32 actual);
    error ThoughtSpecNotFound(bytes32 specId);

    event ActiveThoughtSpecSet(bytes32 indexed specId);
    event ThoughtSpecRegistered(
        bytes32 indexed specId,
        bytes32 specHash,
        string ref,
        address pointer,
        uint32 byteLength,
        uint64 registeredAt
    );

    struct ThoughtSpec {
        bytes32 specId;
        bytes32 specHash;
        string ref;
        address pointer;
        uint32 byteLength;
        uint64 registeredAt;
        bool exists;
    }

    address public immutable owner;
    bytes32 public activeSpecId;

    mapping(bytes32 specId => ThoughtSpec spec) private _specs;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner();
        }
        _;
    }

    function registerSpec(bytes32 specId, string calldata ref, bytes calldata specData, bool setActive)
        external
        onlyOwner
        returns (address pointer)
    {
        if (_specs[specId].exists) {
            revert ThoughtSpecAlreadyExists(specId);
        }
        if (specId == bytes32(0) || specData.length == 0) {
            revert ThoughtSpecEmpty();
        }
        if (specData.length > type(uint32).max) {
            revert ThoughtSpecEmpty();
        }

        bytes32 specHash = keccak256(specData);
        pointer = ContractCodeStorage.write(specData);
        bytes32 storedHash = keccak256(ContractCodeStorage.read(pointer));
        if (storedHash != specHash) {
            revert ThoughtSpecHashMismatch(specHash, storedHash);
        }

        uint64 registeredAt = uint64(block.timestamp);
        uint32 byteLength = uint32(specData.length);
        _specs[specId] = ThoughtSpec({
            specId: specId,
            specHash: specHash,
            ref: ref,
            pointer: pointer,
            byteLength: byteLength,
            registeredAt: registeredAt,
            exists: true
        });

        emit ThoughtSpecRegistered(specId, specHash, ref, pointer, byteLength, registeredAt);

        if (setActive) {
            activeSpecId = specId;
            emit ActiveThoughtSpecSet(specId);
        }
    }

    function specMeta(bytes32 specId)
        public
        view
        returns (
            bytes32 specHash,
            string memory ref,
            address pointer,
            uint32 byteLength,
            uint64 registeredAt,
            bool exists
        )
    {
        ThoughtSpec storage spec = _specs[specId];
        return (spec.specHash, spec.ref, spec.pointer, spec.byteLength, spec.registeredAt, spec.exists);
    }

    function specBytes(bytes32 specId) public view returns (bytes memory) {
        ThoughtSpec storage spec = _requireSpec(specId);
        bytes memory data = ContractCodeStorage.read(spec.pointer);
        bytes32 actualHash = keccak256(data);
        if (actualHash != spec.specHash) {
            revert ThoughtSpecHashMismatch(spec.specHash, actualHash);
        }
        return data;
    }

    function specText(bytes32 specId) external view returns (string memory) {
        return string(specBytes(specId));
    }

    function activeSpecMeta()
        external
        view
        returns (
            bytes32 specId,
            bytes32 specHash,
            string memory ref,
            address pointer,
            uint32 byteLength,
            uint64 registeredAt,
            bool exists
        )
    {
        bytes32 specId_ = activeSpecId;
        (
            bytes32 specHash_,
            string memory ref_,
            address pointer_,
            uint32 byteLength_,
            uint64 registeredAt_,
            bool exists_
        ) =
            specMeta(specId_);
        return (specId_, specHash_, ref_, pointer_, byteLength_, registeredAt_, exists_);
    }

    function activeSpecBytes() external view returns (bytes memory) {
        return specBytes(_requireActiveSpecId());
    }

    function activeSpecText() external view returns (string memory) {
        return string(specBytes(_requireActiveSpecId()));
    }

    function validateSpec(bytes32 specId) external view returns (bool) {
        ThoughtSpec storage spec = _specs[specId];
        if (!spec.exists || spec.pointer == address(0)) {
            return false;
        }

        bytes memory data = ContractCodeStorage.read(spec.pointer);
        return keccak256(data) == spec.specHash && data.length == spec.byteLength;
    }

    function _requireSpec(bytes32 specId) private view returns (ThoughtSpec storage spec) {
        spec = _specs[specId];
        if (!spec.exists) {
            revert ThoughtSpecNotFound(specId);
        }
        if (spec.pointer == address(0)) {
            revert InvalidThoughtSpecPointer(spec.pointer);
        }
    }

    function _requireActiveSpecId() private view returns (bytes32 specId) {
        specId = activeSpecId;
        if (!_specs[specId].exists) {
            revert ThoughtSpecNotFound(specId);
        }
    }
}
