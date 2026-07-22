export const thoughtChatWorkDetailHref = (tokenId: number): string => {
  if (!Number.isSafeInteger(tokenId) || tokenId < 1) {
    throw new Error("chat work detail requires a positive token ID");
  }
  return `/thought-v2-chat-work.html?token=${tokenId}`;
};

export const parseThoughtChatWorkTokenId = (search: string): number => {
  const raw = new URLSearchParams(search).get("token")?.trim() ?? "";
  if (!/^[1-9][0-9]*$/.test(raw)) {
    throw new Error("chat work detail URL requires a positive ?token= ID");
  }
  const tokenId = Number(raw);
  if (!Number.isSafeInteger(tokenId)) throw new Error("chat work token ID exceeds the safe integer range");
  return tokenId;
};
