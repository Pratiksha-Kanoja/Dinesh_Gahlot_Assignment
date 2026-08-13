import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const distIndex = join(rootDir, "client", "dist", "index.html");

if (!existsSync(distIndex)) {
  console.info("client/dist missing — building frontend before start...");
  const build = spawnSync("npm", ["run", "build"], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env
  });

  if (build.status !== 0) {
    process.exit(build.status ?? 1);
  }
}

const server = spawnSync("npm", ["--workspace", "server", "run", "start"], {
  cwd: rootDir,
  stdio: "inherit",
  env: process.env
});

process.exit(server.status ?? 1);
