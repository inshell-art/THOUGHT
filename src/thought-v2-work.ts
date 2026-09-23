export type ThoughtProvenanceLeaf = {
  path: string;
  value: string;
};

const scalarText = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

export const thoughtWorkDetailHref = (tokenId: number): string => {
  if (!Number.isSafeInteger(tokenId) || tokenId < 1) {
    throw new Error("work detail token ID must be a positive safe integer");
  }
  return `/thought-v2-work.html?token=${tokenId}`;
};

export const parseThoughtWorkTokenId = (search: string): number => {
  const raw = new URLSearchParams(search).get("token")?.trim() ?? "";
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new Error("work detail URL requires a positive ?token= ID");
  }
  const tokenId = Number(raw);
  if (!Number.isSafeInteger(tokenId)) {
    throw new Error("work detail token ID exceeds the safe integer range");
  }
  return tokenId;
};

export const flattenThoughtProvenance = (
  value: unknown,
  path = "provenance",
): ThoughtProvenanceLeaf[] => {
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      flattenThoughtProvenance(entry, `${path}[${index}]`),
    );
  }
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) =>
      flattenThoughtProvenance(entry, `${path}.${key}`),
    );
  }
  return [{ path, value: scalarText(value) }];
};

export const provenanceSectionTitle = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replaceAll("_", " ").toUpperCase();
