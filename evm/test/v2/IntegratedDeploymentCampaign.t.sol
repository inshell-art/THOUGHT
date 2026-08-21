// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ContractCodeStorage} from "../../src/ContractCodeStorage.sol";
import {ThoughtSpecRegistry} from "../../src/ThoughtSpecRegistry.sol";
import {ThoughtSpecRegistryV2} from "../../src/ThoughtSpecRegistryV2.sol";
import {CreationAttestationVerifierV2} from "../../src/v2/CreationAttestationVerifierV2.sol";
import {ThoughtNFTV2} from "../../src/v2/ThoughtNFTV2.sol";
import {ThoughtRendererV2} from "../../src/v2/ThoughtRendererV2.sol";

interface VmIntegratedCampaign {
    function readFileBinary(string calldata path) external view returns (bytes memory data);
}

contract PhaseAPathFixture {
    error ThoughtAddressMismatch(address expected, address supplied);

    address public thoughtMinter;
    uint32 public thoughtQuota;
    bool public thoughtFrozen;

    function phaseBConfigureAndFreeze(address expectedThoughtNft, address suppliedThoughtNft) external {
        if (expectedThoughtNft == address(0) || suppliedThoughtNft != expectedThoughtNft) {
            revert ThoughtAddressMismatch(expectedThoughtNft, suppliedThoughtNft);
        }
        thoughtMinter = suppliedThoughtNft;
        thoughtQuota = 1;
        thoughtFrozen = true;
    }

    function consumeUnit(uint256, bytes32, address, uint256, bytes calldata) external pure returns (uint32) {
        return 1;
    }
}

contract IntegratedDeploymentCampaignTest {
    VmIntegratedCampaign private constant VM =
        VmIntegratedCampaign(address(uint160(uint256(keccak256("hevm cheat code")))));

    function testPhaseAToThoughtToPhaseBUsesExactReceiptAddressAndBoundary() public {
        PhaseAPathFixture pathNft = new PhaseAPathFixture();
        require(pathNft.thoughtMinter() == address(0), "Phase A THOUGHT minter must be unset");
        require(pathNft.thoughtQuota() == 0, "Phase A THOUGHT quota must be zero");
        require(!pathNft.thoughtFrozen(), "Phase A THOUGHT movement must be unfrozen");

        bytes memory specBytes = VM.readFileBinary("../protocol/current/v2/THOUGHT.v2.md");
        ThoughtSpecRegistry specRegistry = new ThoughtSpecRegistry(address(this));
        (bytes32 specId, bytes32 specHash,) = specRegistry.registerThoughtSpec(
            "THOUGHT.v2.md",
            "thought-v2-canonical-portable-release-20260807-r2/protocol/current/v2/THOUGHT.v2.md",
            specBytes
        );
        require(specRegistry.validateThoughtSpec(specId, specHash), "exact spec registration failed");
        require(keccak256(specRegistry.thoughtSpecBytes(specId)) == keccak256(specBytes), "spec readback drift");

        bytes memory releaseManifest = VM.readFileBinary(
            "../artifacts/thought-v2-contract-release/releases/thought-v2-canonical-portable-release-20260807-r2/manifest.json"
        );
        ThoughtSpecRegistryV2 protocolRegistry = new ThoughtSpecRegistryV2(address(this));
        bytes32 manifestHash = keccak256(releaseManifest);
        bytes32 releaseId = protocolRegistry.registerRelease(
            manifestHash, "ipfs://example-immutable-thought-v2-r2-manifest"
        );
        require(protocolRegistry.isRegistered(releaseId), "release registration failed");

        address glyphPointer = ContractCodeStorage.write(
            VM.readFileBinary("../protocol/current/v2/renderer/mono-76.im76.bin")
        );
        ThoughtRendererV2 renderer = new ThoughtRendererV2(glyphPointer);
        CreationAttestationVerifierV2 verifier =
            new CreationAttestationVerifierV2(address(this), address(0xA11CE));
        ThoughtNFTV2 thoughtNft = new ThoughtNFTV2(
            address(pathNft),
            address(specRegistry),
            address(renderer),
            address(protocolRegistry),
            releaseId,
            address(verifier)
        );

        require(thoughtNft.pathNft() == address(pathNft), "PATH receipt address not bound");
        require(thoughtNft.thoughtSpecRegistry() == address(specRegistry), "spec registry not bound");
        require(thoughtNft.protocolRegistry() == address(protocolRegistry), "protocol registry not bound");
        require(thoughtNft.thoughtRenderer() == address(renderer), "renderer not bound");
        require(thoughtNft.creationAttestationVerifier() == address(verifier), "verifier not bound");
        require(thoughtNft.protocolReleaseId() == releaseId, "release not bound");
        require(renderer.glyphDefinitionsPointer1() == glyphPointer, "glyph pointer not bound");
        require(pathNft.thoughtMinter() == address(0) && !pathNft.thoughtFrozen(), "THOUGHT phase mutated PATH");

        pathNft.phaseBConfigureAndFreeze(address(thoughtNft), address(thoughtNft));
        require(pathNft.thoughtMinter() == address(thoughtNft), "Phase B ThoughtNFT mismatch");
        require(pathNft.thoughtQuota() == 1 && pathNft.thoughtFrozen(), "Phase B movement not finalized");
    }

    function testPhaseBRejectsWrongThoughtReceiptAddressBeforeFreeze() public {
        PhaseAPathFixture pathNft = new PhaseAPathFixture();
        address expectedThoughtNft = address(0x1234);
        try pathNft.phaseBConfigureAndFreeze(expectedThoughtNft, address(0x5678)) {
            revert("wrong ThoughtNFT was accepted");
        } catch (bytes memory reason) {
            require(
                bytes4(reason) == PhaseAPathFixture.ThoughtAddressMismatch.selector,
                "unexpected wrong-address rejection"
            );
        }
        require(pathNft.thoughtMinter() == address(0), "wrong address changed minter");
        require(!pathNft.thoughtFrozen(), "wrong address froze movement");
    }
}
