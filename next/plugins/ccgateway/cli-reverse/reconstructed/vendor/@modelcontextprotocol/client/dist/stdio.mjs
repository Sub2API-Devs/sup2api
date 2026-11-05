/**
 * @modelcontextprotocol/client/dist/stdio.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-sywnjtqb.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import Lo from "process";
import { PassThrough } from "stream";
import { __toESM } from "../../../../runtime/bun-runtime.js";
import { require_cross_spawn } from "../../../cross-spawn/index.js";
import { ReadBuffer, SdkError, SdkErrorCode, serializeMessage } from "./src-D_zzAWoS.mjs";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-sywnjtqb.js:18247-18266 esm-layout
var import_cross_spawn; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-sywnjtqb.js:18247", () => {
  import_cross_spawn = __toESM(require_cross_spawn(), 1);
});
//@ chunk-sywnjtqb.js:18328-18561 esm-fingerprint
var DEFAULT_INHERITED_ENV_VARS =
  Lo.platform === "win32"
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
//@ chunk-sywnjtqb.js:18561-18687 esm-fingerprint
function getDefaultEnvironment_2() {
  let env = {};
  for (let key of DEFAULT_INHERITED_ENV_VARS) {
    let value = Lo.env[key];
    if (value === undefined) continue;
    if (value.startsWith("()")) continue;
    env[key] = value;
  }
  return env;
}
//@ chunk-sywnjtqb.js:18687-21266 esm-fingerprint
var StdioClientTransport = class {
  _process;
  _readBuffer;
  _serverParams;
  _stderrStream = null;
  onclose;
  onerror;
  onmessage;
  constructor(server) {
    this._serverParams = server;
    this._readBuffer = new ReadBuffer({
      maxBufferSize: server.maxBufferSize,
    });
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
          ...getDefaultEnvironment_2(),
          ...this._serverParams.env,
        },
        stdio: ["pipe", "pipe", this._serverParams.stderr ?? "inherit"],
        shell: false,
        windowsHide: Lo.platform === "win32",
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
        try {
          this._readBuffer.append(chunk);
          this.processReadBuffer();
        } catch (error) {
          this.onerror?.(error);
          this.close().catch(() => {});
        }
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
  async _dispose() {
    let proc = this._process;
    this._process = undefined;
    if (proc && proc.exitCode === null && proc.signalCode === null) {
      let exited = new Promise((resolve) => proc.once("exit", () => resolve()));
      try {
        proc.stdin?.end();
      } catch {}
      try {
        proc.kill("SIGTERM");
      } catch {}
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1000).unref())]);
      if (proc.exitCode === null && proc.signalCode === null)
        try {
          proc.kill("SIGKILL");
        } catch {}
      await exited;
    }
    try {
      proc?.stdout?.destroy();
    } catch {}
    try {
      proc?.stdin?.destroy();
    } catch {}
    try {
      proc?.stderr?.destroy();
    } catch {}
    this._readBuffer.clear();
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
      if (!this._process?.stdin) throw new SdkError(SdkErrorCode.NotConnected, "Not connected");
      let json = serializeMessage(message);
      if (this._process.stdin.write(json)) resolve();
      else this._process.stdin.once("drain", resolve);
    });
  }
};
export { getDefaultEnvironment_2, StdioClientTransport };
