import {
  THOUGHT_CREATION_ATTESTATION_PROFILE_ID,
  THOUGHT_CREATION_ATTESTATION_STATUSES,
  THOUGHT_V2_ATTRIBUTE_ORDER,
} from "./thought-v2-protocol";

export type ThoughtTokenAttribute = {
  trait_type: string;
  value: string | number;
};

export type ThoughtTokenMetadata = {
  name: string;
  description?: string;
  image: string;
  attributes: ThoughtTokenAttribute[];
  properties: Record<string, unknown>;
  thought: Record<string, unknown> & {
    creationAttestation: string;
    declaredAgent: string;
    declaredModel: string;
    provenance: string;
  };
};

export type ThoughtGalleryToken = {
  tokenId: number;
  metadata: ThoughtTokenMetadata;
};

export type ThoughtGallerySort =
  | "token-asc"
  | "token-desc"
  | "loom-desc"
  | "loom-asc";

export type ThoughtGalleryFilterState = {
  query: string;
  selectedTraits: Readonly<Record<string, readonly string[]>>;
  sort: ThoughtGallerySort;
};

export type ThoughtGalleryFilterOption = {
  value: string;
  count: number;
};

export type ThoughtGalleryFilterGroup = {
  traitType: string;
  options: ThoughtGalleryFilterOption[];
};

export type ThoughtProvenanceFile = {
  filename: string;
  dataUri: string;
  byteLength: number;
};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const attributeValueText = (value: ThoughtTokenAttribute["value"]) => String(value);

const tokenAttributeMap = (token: ThoughtGalleryToken) =>
  new Map(
    token.metadata.attributes.map((attribute) => [
      attribute.trait_type,
      attributeValueText(attribute.value),
    ]),
  );

const tokenSearchText = (token: ThoughtGalleryToken) => {
  const pathId = token.metadata.thought.pathId;
  return [
    token.metadata.name,
    `token ${token.tokenId}`,
    `#${token.tokenId}`,
    pathId === undefined ? "" : `path ${String(pathId)}`,
    ...token.metadata.attributes.flatMap((attribute) => [
      attribute.trait_type,
      attributeValueText(attribute.value),
    ]),
  ]
    .join("\n")
    .toLocaleLowerCase();
};

const loomWeightOf = (token: ThoughtGalleryToken) => {
  const value = token.metadata.properties.loomWeight;
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
};

export const buildThoughtGalleryFilterGroups = (
  tokens: readonly ThoughtGalleryToken[],
): ThoughtGalleryFilterGroup[] =>
  THOUGHT_V2_ATTRIBUTE_ORDER.map((traitType) => {
    const counts = new Map<string, number>();
    for (const token of tokens) {
      const attribute = token.metadata.attributes.find(
        (candidate) => candidate.trait_type === traitType,
      );
      if (!attribute) continue;
      const value = attributeValueText(attribute.value);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return {
      traitType,
      options: [...counts.entries()]
        .map(([value, count]) => ({ value, count }))
        .sort((left, right) =>
          right.count - left.count ||
          left.value.localeCompare(right.value, "en", { numeric: true, sensitivity: "base" }),
        ),
    };
  });

export const filterAndSortThoughtGalleryTokens = (
  tokens: readonly ThoughtGalleryToken[],
  state: ThoughtGalleryFilterState,
): ThoughtGalleryToken[] => {
  const query = state.query.trim().toLocaleLowerCase();
  const selectedTraits = Object.entries(state.selectedTraits).filter(
    ([, selectedValues]) => selectedValues.length > 0,
  );
  const filtered = tokens.filter((token) => {
    if (query && !tokenSearchText(token).includes(query)) return false;
    if (selectedTraits.length === 0) return true;
    const attributes = tokenAttributeMap(token);
    return selectedTraits.every(([traitType, selectedValues]) => {
      const tokenValue = attributes.get(traitType);
      return tokenValue !== undefined && selectedValues.includes(tokenValue);
    });
  });

  return [...filtered].sort((left, right) => {
    switch (state.sort) {
      case "token-desc":
        return right.tokenId - left.tokenId;
      case "loom-desc":
        return loomWeightOf(right) - loomWeightOf(left) || left.tokenId - right.tokenId;
      case "loom-asc":
        return loomWeightOf(left) - loomWeightOf(right) || left.tokenId - right.tokenId;
      case "token-asc":
      default:
        return left.tokenId - right.tokenId;
    }
  });
};

export const decodeDataUriText = (uri: string, expectedMediaType: string) => {
  if (!uri.startsWith("data:")) throw new Error("value is not a data URI");
  const separator = uri.indexOf(",");
  if (separator === -1) throw new Error("data URI is missing its payload separator");
  const metadata = uri.slice(5, separator).split(";");
  if (metadata[0]?.toLowerCase() !== expectedMediaType.toLowerCase()) {
    throw new Error(`expected ${expectedMediaType} data URI`);
  }
  const payload = uri.slice(separator + 1);
  if (metadata.includes("base64")) {
    let binary: string;
    try {
      binary = globalThis.atob(payload);
    } catch {
      throw new Error("data URI contains invalid base64");
    }
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  }
  try {
    return decodeURIComponent(payload);
  } catch {
    throw new Error("data URI contains invalid percent encoding");
  }
};

export const provenanceFileForToken = (
  tokenId: number,
  metadata: ThoughtTokenMetadata,
): ThoughtProvenanceFile => {
  if (!Number.isSafeInteger(tokenId) || tokenId < 1) {
    throw new Error("provenance file token ID must be a positive safe integer");
  }

  const provenance = metadata.thought.provenance;
  return {
    filename: `THOUGHT-${tokenId}.provenance.json`,
    dataUri: `data:application/json;charset=utf-8,${encodeURIComponent(provenance)}`,
    byteLength: new TextEncoder().encode(provenance).byteLength,
  };
};

export const loomSupportingText = (properties: Record<string, unknown>): string => {
  const loomWeight = properties.loomWeight;
  if (!Number.isInteger(loomWeight) || Number(loomWeight) < 0 || Number(loomWeight) > 1_024) {
    throw new Error("invalid THOUGHT tokenURI: loomWeight is missing or out of range");
  }
  return `Loom: ${loomWeight} / 1,024 underlying cells filled`;
};

export const parseThoughtTokenUri = (tokenUri: string): ThoughtTokenMetadata => {
  let value: unknown;
  try {
    value = JSON.parse(decodeDataUriText(tokenUri, "application/json"));
  } catch (error) {
    throw new Error(`invalid THOUGHT tokenURI: ${(error as Error).message}`);
  }
  if (!record(value)) throw new Error("invalid THOUGHT tokenURI: metadata must be an object");
  if (typeof value.name !== "string" || value.name.length === 0) {
    throw new Error("invalid THOUGHT tokenURI: name is missing");
  }
  if (
    typeof value.image !== "string" ||
    !value.image.startsWith("data:image/svg+xml;base64,")
  ) {
    throw new Error("invalid THOUGHT tokenURI: embedded SVG image is missing");
  }
  if (!Array.isArray(value.attributes) || value.attributes.length === 0) {
    throw new Error("invalid THOUGHT tokenURI: attributes are missing");
  }
  const attributes = value.attributes.map((attribute, index) => {
    if (
      !record(attribute) ||
      typeof attribute.trait_type !== "string" ||
      attribute.trait_type.length === 0 ||
      (typeof attribute.value !== "string" && typeof attribute.value !== "number")
    ) {
      throw new Error(`invalid THOUGHT tokenURI: attribute ${index + 1} is malformed`);
    }
    return { trait_type: attribute.trait_type, value: attribute.value };
  });
  const attributeOrder = attributes.map((attribute) => attribute.trait_type);
  if (
    attributes.length !== THOUGHT_V2_ATTRIBUTE_ORDER.length ||
    attributeOrder.some(
      (traitType, index) => traitType !== THOUGHT_V2_ATTRIBUTE_ORDER[index],
    )
  ) {
    throw new Error(
      `invalid THOUGHT tokenURI: canonical attribute order mismatch (expected ${THOUGHT_V2_ATTRIBUTE_ORDER.join(
        " / ",
      )}; received ${attributeOrder.join(" / ")})`,
    );
  }
  if (
    typeof attributes[5]!.value !== "string" ||
    !["Open", "Balanced", "Dense"].includes(attributes[5]!.value)
  ) {
    throw new Error("invalid THOUGHT tokenURI: Texture Density is invalid");
  }
  if (
    typeof attributes[4]!.value !== "string" ||
    !(THOUGHT_CREATION_ATTESTATION_STATUSES as readonly string[]).includes(attributes[4]!.value)
  ) {
    throw new Error("invalid THOUGHT tokenURI: Creation Attestation is invalid");
  }
  if (!record(value.properties)) {
    throw new Error("invalid THOUGHT tokenURI: properties are missing");
  }
  const thought = value.thought;
  if (!record(thought)) {
    throw new Error("invalid THOUGHT tokenURI: thought payload is missing");
  }
  if (typeof thought.provenance !== "string" || thought.provenance.length === 0) {
    throw new Error("invalid THOUGHT tokenURI: provenance is missing");
  }
  if (typeof thought.declaredModel !== "string" || thought.declaredModel.length === 0) {
    throw new Error("invalid THOUGHT tokenURI: declared model is missing");
  }
  if (typeof thought.declaredAgent !== "string" || thought.declaredAgent.length === 0) {
    throw new Error("invalid THOUGHT tokenURI: declared Agent is missing");
  }
  if (typeof thought.creationAttestation !== "string") {
    throw new Error("invalid THOUGHT tokenURI: creation attestation status is missing");
  }
  if (attributes[2]!.value !== thought.declaredAgent) {
    throw new Error("invalid THOUGHT tokenURI: declared Agent trait mismatch");
  }
  if (attributes[3]!.value !== thought.declaredModel) {
    throw new Error("invalid THOUGHT tokenURI: declared model trait mismatch");
  }
  if (attributes[4]!.value !== thought.creationAttestation) {
    throw new Error("invalid THOUGHT tokenURI: creation attestation trait mismatch");
  }
  const digest = value.properties.creationAttestationDigest;
  if (typeof digest !== "string" || !/^0x[0-9a-f]{64}$/.test(digest)) {
    throw new Error("invalid THOUGHT tokenURI: creation attestation digest is invalid");
  }
  if (value.properties.creationAttestationProfileId !== THOUGHT_CREATION_ATTESTATION_PROFILE_ID) {
    throw new Error("invalid THOUGHT tokenURI: creation attestation profile is invalid");
  }
  if (
    typeof value.properties.creationAttestationVerifier !== "string" ||
    !/^0x[0-9a-f]{40}$/.test(value.properties.creationAttestationVerifier)
  ) {
    throw new Error("invalid THOUGHT tokenURI: creation attestation verifier is invalid");
  }
  const expectedStatus = digest === `0x${"00".repeat(32)}` ? "Unattested" : "Inshell THOUGHT App";
  if (thought.creationAttestation !== expectedStatus) {
    throw new Error("invalid THOUGHT tokenURI: creation attestation status/digest mismatch");
  }

  return {
    name: value.name,
    ...(typeof value.description === "string" ? { description: value.description } : {}),
    image: value.image,
    attributes,
    properties: value.properties,
    thought: {
      ...thought,
      creationAttestation: thought.creationAttestation,
      declaredAgent: thought.declaredAgent,
      declaredModel: thought.declaredModel,
      provenance: thought.provenance,
    },
  };
};
