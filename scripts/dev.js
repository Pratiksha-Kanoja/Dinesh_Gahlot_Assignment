import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [
  { name: "server", args: ["--workspace", "server", "run", "dev"] },
  { name: "client", args: ["--workspace", "client", "run", "dev"] }
];

let shuttingDown = false;

function prefixOutput(name, stream, chunk) {
  const lines = chunk.toString().split(/\r?\n/);
  for (const line of lines) {
    if (line.trim()) {
      stream.write(`[${name}] ${line}\n`);
    }
  }
}

const children = processes.map(({ name, args }) => {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => prefixOutput(name, process.stdout, chunk));
  child.stderr.on("data", (chunk) => prefixOutput(name, process.stderr, chunk));
  child.on("exit", (code) => {
    if (!shuttingDown && code !== 0) {
      shutdown(code ?? 1);
    }
  });

  return child;
});

function shutdown(code = 0) {
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
  setTimeout(() => process.exit(code), 200);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
