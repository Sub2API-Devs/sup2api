/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/linux-violation-monitor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { mkdtempSync, rmSync } from "fs";
import { join, posix } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import { createServer as createServer_5 } from "net";
import { createInterface } from "readline";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";
import { decodeSandboxedCommand, MAX_ENCODED_COMMAND_BYTES } from "./sandbox-utils.js";
import { shouldIgnoreViolation } from "./sandbox-violation-store.js";

//@ chunk-qg41pqt6.js:777822-779316 esm-fingerprint
function startLinuxSandboxViolationMonitor(callback, opts) {
  let { allowWritePaths, denyWritePaths, ignoreViolations, resolveCommandText } = opts;
  let sockDir = mkdtempSync(join(tmpdir(), "srt-obs-"));
  let sockPath = join(sockDir, `s${randomBytes(4).toString("hex")}.sock`);
  let underPrefix = (p, prefix) => p === prefix || p.startsWith(prefix.endsWith("/") ? prefix : prefix + "/");
  let isDenied = (p) => {
    if (denyWritePaths.some((d) => underPrefix(p, d))) return true;
    return !allowWritePaths.some((a) => underPrefix(p, a));
  };
  let handleEvent = (ev, encodedCommand) => {
    if (ev.observe_init_error) {
      logForDebugging_2(`[Sandbox Linux Monitor] observe filter not installed: ${ev.observe_init_error}`);
      return;
    }
    if (typeof ev.path !== "string") return;
    if (!ev.path.startsWith("/")) return;
    let observedPath = posix.normalize(ev.path);
    if (!isDenied(observedPath)) return;
    let command;
    if (encodedCommand)
      try {
        command = resolveCommandText(decodeSandboxedCommand(encodedCommand));
      } catch {}
    if (shouldIgnoreViolation(observedPath, command, ignoreViolations)) return;
    let violation = {
      line: `deny ${ev.syscall ?? "syscall"} ${observedPath}`,
      command,
      encodedCommand,
      timestamp: new Date(),
    };
    callback(violation);
  };
  let resolveReady;
  let ready = new Promise((res) => {
    resolveReady = res;
  });
  let observeSocketPath = sockPath;
  let server = createServer_5((conn) => {
    let encodedCommand;
    let rl = createInterface({
      input: conn,
    });
    rl.on("line", (raw) => {
      if (!raw) return;
      let ev;
      try {
        ev = JSON.parse(raw);
      } catch {
        return;
      }
      let attribution =
        ev.encodedCommand !== undefined && Buffer.byteLength(ev.encodedCommand) <= MAX_ENCODED_COMMAND_BYTES
          ? ev.encodedCommand
          : undefined;
      if (attribution && encodedCommand === undefined) encodedCommand = attribution;
      handleEvent(ev, encodedCommand ?? attribution);
    });
    conn.on("error", () => rl.close());
    conn.on("close", () => rl.close());
  });
  server.on("error", (err) => {
    logForDebugging_2(
      `[Sandbox Linux Monitor] listen failed: ${err.message} - violation monitoring disabled`,
      {
        level: "warn",
      },
    );
    observeSocketPath = undefined;
    resolveReady();
  });
  server.listen(sockPath, () => resolveReady());
  let sockets = new Set();
  server.on("connection", (s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });
  return {
    get observeSocketPath() {
      return observeSocketPath;
    },
    ready,
    stop: () => {
      logForDebugging_2("[Sandbox Linux Monitor] stopping");
      for (let s of sockets) s.destroy();
      server.close();
      try {
        rmSync(sockDir, {
          recursive: true,
          force: true,
        });
      } catch {}
    },
  };
}
export { startLinuxSandboxViolationMonitor };
