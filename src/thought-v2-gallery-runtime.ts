import { ethers } from "ethers";

export type ThoughtGalleryRuntimeConfig = {
  rpcUrl: string;
  chainId: number;
  thought?: { address?: string };
  thoughtNft?: { address?: string };
  protocolRelease?: { status?: string };
  gallery?: {
    fixtureSource?: string;
    sourceFixtureCount?: number;
    fixtureCount?: number;
    mintedSupply?: number;
    omittedDuplicates?: unknown[];
  };
};

export const THOUGHT_GALLERY_RUNTIME_CONFIG_PATH = "/thought-v2-gallery.anvil.json";

export const fetchThoughtGalleryRuntimeConfig = async () => {
  const response = await fetch(THOUGHT_GALLERY_RUNTIME_CONFIG_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      `gallery runtime config is unavailable (${response.status}); run npm run devnode:gallery`,
    );
  }

  const config = (await response.json()) as ThoughtGalleryRuntimeConfig;
  const thoughtAddress = config.thoughtNft?.address ?? config.thought?.address;
  if (!config.rpcUrl || !Number.isInteger(config.chainId) || !thoughtAddress) {
    throw new Error("gallery runtime config is incomplete");
  }
  if (!ethers.isAddress(thoughtAddress)) {
    throw new Error("gallery THOUGHT address is invalid");
  }

  return { config, thoughtAddress };
};
