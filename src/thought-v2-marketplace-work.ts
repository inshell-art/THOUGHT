export const thoughtV2MarketplaceWorkHref = (tokenId: number): string => {
  if (!Number.isSafeInteger(tokenId) || tokenId < 1) {
    throw new Error("marketplace work detail requires a positive token ID");
  }
  return `/thought-v2-marketplace-work.html?token=${tokenId}`;
};

export const parseThoughtV2MarketplaceWorkTokenId = (search: string): number => {
  const raw = new URLSearchParams(search).get("token")?.trim() ?? "";
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new Error("marketplace work detail URL requires a positive ?token= ID");
  }
  const tokenId = Number(raw);
  if (!Number.isSafeInteger(tokenId)) {
    throw new Error("marketplace work token ID exceeds the safe integer range");
  }
  return tokenId;
};
