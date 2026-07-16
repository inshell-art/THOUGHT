import { keccak256, toUtf8Bytes } from "ethers";

import {
  deriveThoughtTraits,
  RENDERER_ID_HASH,
  THOUGHT_RENDERER_ID,
  THOUGHT_WORK_PROFILE_ID,
  thoughtWorkHashes,
} from "./thought-v2-protocol";
import { buildThoughtV2Svg } from "./thought-v2-renderer";

export type ThoughtV2TokenUriInput = {
  tokenId: bigint;
  promptLine: string;
  agentLine: string;
  provenanceJson: string;
  protocolReleaseId: `0x${string}`;
  manifestKeccak256: `0x${string}`;
  rendererProfileKeccak256: `0x${string}`;
  workProfileKeccak256: `0x${string}`;
  thoughtSpecId: `0x${string}`;
  thoughtSpecHash: `0x${string}`;
  pathId: bigint;
  pathSerial: bigint;
  minter: `0x${string}`;
  mintedAt: bigint;
};

const encoder = new TextEncoder();
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const bytes32Pattern = /^0x[0-9a-f]{64}$/;
const addressPattern = /^0x[0-9a-f]{40}$/;

const base64 = (bytes: Uint8Array): string => {
  let output = "";
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index]!;
    const hasB = index + 1 < bytes.length;
    const hasC = index + 2 < bytes.length;
    const b = hasB ? bytes[index + 1]! : 0;
    const c = hasC ? bytes[index + 2]! : 0;
    const chunk = (a << 16) | (b << 8) | c;
    output += BASE64[(chunk >> 18) & 63];
    output += BASE64[(chunk >> 12) & 63];
    output += hasB ? BASE64[(chunk >> 6) & 63] : "=";
    output += hasC ? BASE64[chunk & 63] : "=";
  }
  return output;
};

const jsonString = (value: string): string => JSON.stringify(value);

const assertInput = (input: ThoughtV2TokenUriInput): void => {
  for (const [label, value] of [
    ["protocolReleaseId", input.protocolReleaseId],
    ["manifestKeccak256", input.manifestKeccak256],
    ["rendererProfileKeccak256", input.rendererProfileKeccak256],
    ["workProfileKeccak256", input.workProfileKeccak256],
    ["thoughtSpecId", input.thoughtSpecId],
    ["thoughtSpecHash", input.thoughtSpecHash],
  ] as const) {
    if (!bytes32Pattern.test(value)) throw new Error(`${label} must be lowercase bytes32`);
  }
  if (!addressPattern.test(input.minter)) throw new Error("minter must be a lowercase address");
};

export const buildThoughtV2Metadata = (input: ThoughtV2TokenUriInput): string => {
  assertInput(input);
  const svg = buildThoughtV2Svg(input);
  const svgDataUri = `data:image/svg+xml;base64,${base64(encoder.encode(svg))}`;
  const hashes = thoughtWorkHashes(input.promptLine, input.agentLine);
  const traits = deriveThoughtTraits(input.promptLine, input.agentLine);
  const provenanceHash = keccak256(toUtf8Bytes(input.provenanceJson));
  const attributes = `[{"trait_type":"Prompt","value":${jsonString(input.promptLine)}},{"trait_type":"Agent Response","value":${jsonString(input.agentLine)}},{"trait_type":"Texture Density","value":"${traits.textureDensity}"},{"trait_type":"Binary Contrast","value":"${traits.binaryContrast}"},{"trait_type":"Protocol","value":"V2"}]`;
  const properties = `{"promptBytes":${traits.promptBytes},"agentBytes":${traits.agentBytes},"promptWeight":${traits.promptWeight},"agentWeight":${traits.agentWeight},"loomWeight":${traits.loomWeight},"bitDistance":${traits.bitDistance},"protocolReleaseId":"${input.protocolReleaseId}","manifestKeccak256":"${input.manifestKeccak256}","rendererId":"${THOUGHT_RENDERER_ID}","rendererProfileKeccak256":"${input.rendererProfileKeccak256}","workProfileId":"${THOUGHT_WORK_PROFILE_ID}","workProfileKeccak256":"${input.workProfileKeccak256}","provenanceKeccak256":"${provenanceHash}"}`;
  const thought = `{"renderer":"${THOUGHT_RENDERER_ID}","protocolReleaseId":"${input.protocolReleaseId}","manifestKeccak256":"${input.manifestKeccak256}","promptLine":${jsonString(input.promptLine)},"agentLine":${jsonString(input.agentLine)},"binaryFieldPacked":"${hashes.binaryFieldPacked}","binaryFieldKeccak256":"${hashes.binaryFieldKeccak256}","promptLineKeccak256":"${hashes.promptLineKeccak256}","agentLineKeccak256":"${hashes.agentLineKeccak256}","agentIdentityHash":"${hashes.agentIdentityHash}","workHash":"${hashes.workHash}","provenanceHash":"${provenanceHash}","thoughtSpecId":"${input.thoughtSpecId}","thoughtSpecHash":"${input.thoughtSpecHash}","pathId":"${input.pathId}","pathSerial":"${input.pathSerial}","minter":"${input.minter}","mintedAt":"${input.mintedAt}","provenance":${jsonString(input.provenanceJson)}}`;
  return `{"name":"THOUGHT #${input.tokenId}","description":"A human prompt transformed by an Agent into a fully onchain work.","image":"${svgDataUri}","attributes":${attributes},"properties":${properties},"thought":${thought}}`;
};

export const buildThoughtV2TokenUri = (input: ThoughtV2TokenUriInput): string =>
  `data:application/json;base64,${base64(encoder.encode(buildThoughtV2Metadata(input)))}`;

export { RENDERER_ID_HASH };
