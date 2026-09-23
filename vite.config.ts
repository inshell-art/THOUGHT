import { execSync } from "node:child_process";

import { defineConfig, type Plugin } from "vite";

const thoughtChatGreenSync = (): Plugin => {
  let greenChannel = 0xba;
  const readChannel = (payload: unknown): number | null => {
    if (!payload || typeof payload !== "object" || !("greenChannel" in payload)) return null;
    const candidate = (payload as { greenChannel?: unknown }).greenChannel;
    return Number.isInteger(candidate) && Number(candidate) >= 0x61 && Number(candidate) <= 0xff
      ? Number(candidate)
      : null;
  };

  return {
    name: "thought-chat-green-sync",
    configureServer(server) {
      server.ws.on("thought-chat:green:get", (_payload, client) => {
        client.send("thought-chat:green:update", { greenChannel });
      });
      server.ws.on("thought-chat:green:set", (payload) => {
        const nextChannel = readChannel(payload);
        if (nextChannel === null) return;
        greenChannel = nextChannel;
        server.ws.send("thought-chat:green:update", { greenChannel });
      });
    },
  };
};

const gitAppBuild = () => {
  if (process.env.VITE_APP_BUILD?.trim()) {
    return process.env.VITE_APP_BUILD.trim();
  }

  if (process.env.NODE_ENV !== "production") {
    return "dev";
  }

  try {
    const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
    const dirty = execSync("git status --porcelain", { encoding: "utf8" }).trim();
    return `git:${commit}${dirty ? "+dirty" : ""}`;
  } catch {
    return "git:unknown";
  }
};

export default defineConfig({
  plugins: [thoughtChatGreenSync()],
  define: {
    "import.meta.env.VITE_APP_BUILD": JSON.stringify(gitAppBuild()),
  },
});
