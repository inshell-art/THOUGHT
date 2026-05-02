import { execSync } from "node:child_process";

import { defineConfig } from "vite";

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
  define: {
    "import.meta.env.VITE_APP_BUILD": JSON.stringify(gitAppBuild()),
  },
});
