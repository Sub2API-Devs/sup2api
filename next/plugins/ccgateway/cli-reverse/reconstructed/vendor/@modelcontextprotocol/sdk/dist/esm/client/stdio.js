/**
 * @modelcontextprotocol/sdk/dist/esm/client/stdio.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-h44h5gdv.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import oo from "process";
import { PassThrough } from "stream";
import { __toESM } from "../../../../../../runtime/bun-runtime.js";
import { require_cross_spawn } from "../../../../../cross-spawn/index.js";
import { ReadBuffer, serializeMessage } from "../shared/stdio.js";
import { deferInit } from "../../../../../../runtime/deferred-init.js";

//@ chunk-h44h5gdv.js:33240-33259 esm-layout
var import_cross_spawn; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-h44h5gdv.js:33240", () => {
  import_cross_spawn = __toESM(require_cross_spawn(), 1);
});
//@ chunk-h44h5gdv.js:33321-33554 esm-fingerprint
var DEFAULT_INHERITED_ENV_VARS =
  oo.platform === "win32"
    ? [
        "APPDATA",
        "HOMEDRIVE",
        "HOMEPATH",
        "LOCALAPPDATA",
        "PATH",
        "PROCESSOR_ARCHITECTURE",
        "SYSTEMDRIVE",
        "SYSTEMROOT",
        "TEMP",
        "USERNAME",
        "USERPROFILE",
        "PROGRAMFILES",
      ]
    : ["HOME", "LOGNAME", "PATH", "SHELL", "TERM", "USER"];
//@ chunk-h44h5gdv.js:33554-33680 esm-fingerprint
function getDefaultEnvironment() {
  let env = {};
  for (let key of DEFAULT_INHERITED_ENV_VARS) {
    let value = oo.env[key];
    if (value === undefined) continue;
    if (value.startsWith("()")) continue;
    env[key] = value;
  }
  return env;
}
//@ chunk-h44h5gdv.js:33680-35615 esm-fingerprint
class StdioClientTransport {
  constructor(server) {
    this._readBuffer = new ReadBuffer();
    this._stderrStream = null;
    this._serverParams = server;
    if (server.stderr === "pipe" || server.stderr === "overlapped") this._stderrStream = new PassThrough();
  }
  async start() {
    if (this._process)
      throw Error(
        "StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    return new Promise((resolve, reject) => {
      this._process = import_cross_spawn.default(this._serverParams.command, this._serverParams.args ?? [], {
        env: {
          ...getDefaultEnvironment(),
          ...this._serverParams.env,
        },
        stdio: ["pipe", "pipe", this._serverParams.stderr ?? "inherit"],
        shell: false,
        windowsHide: oo.platform === "win32",
        cwd: this._serverParams.cwd,
      });
      this._process.on("error", (error) => {
        reject(error);
        this.onerror?.(error);
      });
      this._process.on("spawn", () => {
        resolve();
      });
      this._process.on("close", (_code) => {
        this._process = undefined;
        this.onclose?.();
      });
      this._process.stdin?.on("error", (error) => {
        this.onerror?.(error);
      });
      this._process.stdout?.on("data", (chunk) => {
        this._readBuffer.append(chunk);
        this.processReadBuffer();
      });
      this._process.stdout?.on("error", (error) => {
        this.onerror?.(error);
      });
      if (this._stderrStream && this._process.stderr) this._process.stderr.pipe(this._stderrStream);
    });
  }
  get stderr() {
    if (this._stderrStream) return this._stderrStream;
    return this._process?.stderr ?? null;
  }
  get pid() {
    return this._process?.pid ?? null;
  }
  processReadBuffer() {
    while (true)
      try {
        let message = this._readBuffer.readMessage();
        if (message === null) break;
        this.onmessage?.(message);
      } catch (error) {
        this.onerror?.(error);
      }
  }
  async close() {
    if (this._process) {
      let processToClose = this._process;
      this._process = undefined;
      let closePromise = new Promise((resolve) => {
        processToClose.once("close", () => {
          resolve();
        });
      });
      try {
        processToClose.stdin?.end();
      } catch {}
      await Promise.race([closePromise, new Promise((resolve) => setTimeout(resolve, 2000).unref())]);
      if (processToClose.exitCode === null) {
        try {
          processToClose.kill("SIGTERM");
        } catch {}
        await Promise.race([closePromise, new Promise((resolve) => setTimeout(resolve, 2000).unref())]);
      }
      if (processToClose.exitCode === null)
        try {
          processToClose.kill("SIGKILL");
        } catch {}
    }
    this._readBuffer.clear();
  }
  send(message) {
    return new Promise((resolve) => {
      if (!this._process?.stdin) throw Error("Not connected");
      let json = serializeMessage(message);
      if (this._process.stdin.write(json)) resolve();
      else this._process.stdin.once("drain", resolve);
    });
  }
}
export { getDefaultEnvironment, StdioClientTransport };
