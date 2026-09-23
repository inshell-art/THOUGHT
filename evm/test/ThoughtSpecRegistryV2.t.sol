// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ThoughtSpecRegistryV2} from "../src/ThoughtSpecRegistryV2.sol";

interface VmRegistryV2 {
    function expectEmit(bool checkTopic1, bool checkTopic2, bool checkTopic3, bool checkData) external;
    function expectRevert(bytes calldata revertData) external;
    function prank(address msgSender) external;
}

contract ThoughtSpecRegistryV2Test {
    VmRegistryV2 private constant vm = VmRegistryV2(address(uint160(uint256(keccak256("hevm cheat code")))));

    event ReleaseRegistered(
        bytes32 indexed protocolReleaseId, bytes32 indexed manifestHash, address indexed registrar, string manifestURI
    );
    event GasProfile(string metric, uint256 gasUsed, uint256 responseBytes);

    ThoughtSpecRegistryV2 private registry;

    function setUp() public {
        registry = new ThoughtSpecRegistryV2(address(this));
    }

    function testRegistersPermanentExactRecordAndEvent() public {
        bytes32 manifestHash = keccak256("manifest bytes");
        string memory manifestURI = "https://inshell.art/protocol/thought/v2/release.manifest.json";
        bytes32 expectedId = keccak256(abi.encode(registry.RELEASE_ID_DOMAIN(), manifestHash));

        vm.expectEmit(true, true, true, true);
        emit ReleaseRegistered(expectedId, manifestHash, address(this), manifestURI);
        bytes32 releaseId = registry.registerRelease(manifestHash, manifestURI);

        require(releaseId == expectedId, "release ID mismatch");
        require(registry.deriveReleaseId(manifestHash) == expectedId, "derivation mismatch");
        require(registry.isRegistered(releaseId), "release not registered");

        ThoughtSpecRegistryV2.ReleaseRecord memory record = registry.getRelease(releaseId);
        require(record.manifestHash == manifestHash, "manifest hash mismatch");
        require(keccak256(bytes(record.manifestURI)) == keccak256(bytes(manifestURI)), "URI mismatch");
        require(record.registrar == address(this), "registrar mismatch");
        require(record.registeredAt == uint64(block.timestamp), "timestamp mismatch");
    }

    function testRejectsUnauthorizedZeroDuplicateAndInvalidUriLengths() public {
        bytes32 manifestHash = keccak256("manifest");
        address outsider = address(0xBEEF);

        vm.prank(outsider);
        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.NotRegistrar.selector));
        registry.registerRelease(manifestHash, "ipfs://manifest");

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.EmptyManifestHash.selector));
        registry.registerRelease(bytes32(0), "ipfs://manifest");

        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.InvalidManifestUriLength.selector, 0, 1, 200));
        registry.registerRelease(manifestHash, "");

        string memory longURI = _repeat("u", 201);
        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.InvalidManifestUriLength.selector, 201, 1, 200));
        registry.registerRelease(manifestHash, longURI);

        bytes32 releaseId = registry.registerRelease(manifestHash, "x");
        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.DuplicateRelease.selector, releaseId));
        registry.registerRelease(manifestHash, "different-uri-cannot-replace-record");
    }

    function testRejectsZeroOwnerAndUnknownRelease() public {
        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.RegistrarZeroAddress.selector));
        new ThoughtSpecRegistryV2(address(0));

        bytes32 missing = keccak256("missing");
        require(!registry.isRegistered(missing), "unknown release registered");
        vm.expectRevert(abi.encodeWithSelector(ThoughtSpecRegistryV2.ReleaseNotFound.selector, missing));
        registry.getRelease(missing);
    }

    function testGasAndRuntimeSizeGates() public {
        uint256 deployStart = gasleft();
        ThoughtSpecRegistryV2 measured = new ThoughtSpecRegistryV2(address(this));
        uint256 deploymentGas = deployStart - gasleft();
        require(deploymentGas <= 1_500_000, "registry deployment gas exceeds gate");
        require(address(measured).code.length < 24_576, "registry runtime exceeds EIP-170");

        uint256 registerStart = gasleft();
        measured.registerRelease(keccak256("representative manifest"), _repeat("u", 100));
        uint256 registrationGas = registerStart - gasleft();
        require(registrationGas <= 300_000, "release registration gas exceeds gate");
    }

    function testGasProfileManifestUriLengths() public {
        _profileRegistration("register.manifest-uri.1", keccak256("manifest-uri-1"), 1);
        _profileRegistration("register.manifest-uri.100", keccak256("manifest-uri-100"), 100);
        _profileRegistration("register.manifest-uri.200", keccak256("manifest-uri-200"), 200);
    }

    function _profileRegistration(string memory metric, bytes32 manifestHash, uint256 uriLength) private {
        string memory manifestURI = _repeat("u", uriLength);
        uint256 start = gasleft();
        registry.registerRelease(manifestHash, manifestURI);
        uint256 gasUsed = start - gasleft();
        emit GasProfile(metric, gasUsed, uriLength);
    }

    function _repeat(string memory unit, uint256 count) private pure returns (string memory) {
        bytes memory source = bytes(unit);
        bytes memory output = new bytes(source.length * count);
        for (uint256 i = 0; i < count; i++) {
            for (uint256 j = 0; j < source.length; j++) {
                output[i * source.length + j] = source[j];
            }
        }
        return string(output);
    }
}
