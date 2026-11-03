/**
 * @modelcontextprotocol/sdk/dist/esm/client/stdio.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-z1n5m6nf.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import Qt from "process";
import { PassThrough } from "stream";
import { Re } from "../../../../../../runtime/bun-runtime.js";
import { WSr } from "../../../../../cross-spawn/index.js";
import { zsn, AGn } from "../shared/stdio.js";

//@ chunk-z1n5m6nf.js:31818-31837 esm-layout
var ko = Re(WSr(), 1);
//@ chunk-z1n5m6nf.js:31899-32132 esm-fingerprint
var Ur =
  Qt.platform === "win32"
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
//@ chunk-z1n5m6nf.js:32132-32258 esm-fingerprint
function eo() {
  let e = {};
  for (let r of Ur) {
    let n = Qt.env[r];
    if (n === void 0) continue;
    if (n.startsWith("()")) continue;
    e[r] = n;
  }
  return e;
}
//@ chunk-z1n5m6nf.js:32258-34193 esm-fingerprint
class to {
  constructor(e) {
    if (
      ((this._readBuffer = new zsn()),
      (this._stderrStream = null),
      (this._serverParams = e),
      e.stderr === "pipe" || e.stderr === "overlapped")
    )
      this._stderrStream = new PassThrough();
  }
  async start() {
    if (this._process)
      throw Error(
        "StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    return new Promise((e, r) => {
      if (
        ((this._process = ko.default(this._serverParams.command, this._serverParams.args ?? [], {
          env: { ...eo(), ...this._serverParams.env },
          stdio: ["pipe", "pipe", this._serverParams.stderr ?? "inherit"],
          shell: !1,
          windowsHide: Qt.platform === "win32",
          cwd: this._serverParams.cwd,
        })),
        this._process.on("error", (n) => {
          (r(n), this.onerror?.(n));
        }),
        this._process.on("spawn", () => {
          e();
        }),
        this._process.on("close", (n) => {
          ((this._process = void 0), this.onclose?.());
        }),
        this._process.stdin?.on("error", (n) => {
          this.onerror?.(n);
        }),
        this._process.stdout?.on("data", (n) => {
          (this._readBuffer.append(n), this.processReadBuffer());
        }),
        this._process.stdout?.on("error", (n) => {
          this.onerror?.(n);
        }),
        this._stderrStream && this._process.stderr)
      )
        this._process.stderr.pipe(this._stderrStream);
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
    while (!0)
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
      let _process = this._process;
      this._process = void 0;
      let promise = new Promise((n) => {
        _process.once("close", () => {
          n();
        });
      });
      try {
        _process.stdin?.end();
      } catch {}
      if (
        (await Promise.race([promise, new Promise((n) => setTimeout(n, 2000).unref())]),
        _process.exitCode === null)
      ) {
        try {
          _process.kill("SIGTERM");
        } catch {}
        await Promise.race([promise, new Promise((n) => setTimeout(n, 2000).unref())]);
      }
      if (_process.exitCode === null)
        try {
          _process.kill("SIGKILL");
        } catch {}
    }
    this._readBuffer.clear();
  }
  send(e) {
    return new Promise((r) => {
      if (!this._process?.stdin) throw Error("Not connected");
      let n = AGn(e);
      if (this._process.stdin.write(n)) r();
      else this._process.stdin.once("drain", r);
    });
  }
}

export { eo, to };
