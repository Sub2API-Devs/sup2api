/**
 * @modelcontextprotocol/client/dist/stdio.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-8t8n4kdh.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */
import Ro from "process";
import { PassThrough } from "stream";
import { Re } from "../../../../runtime/bun-runtime.js";
import { WSr } from "../../../cross-spawn/index.js";
import { iLo, SdkError, Ti, aLo } from "./src-D_zzAWoS.mjs";

//@ chunk-8t8n4kdh.js:16826-16845 esm-layout
var Hr = Re(WSr(), 1);
//@ chunk-8t8n4kdh.js:16907-17140 esm-fingerprint
var Zi =
  Ro.platform === "win32"
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
//@ chunk-8t8n4kdh.js:17140-17266 esm-fingerprint
function ko() {
  let e = {};
  for (let n of Zi) {
    let r = Ro.env[n];
    if (r === void 0) continue;
    if (r.startsWith("()")) continue;
    e[n] = r;
  }
  return e;
}
//@ chunk-8t8n4kdh.js:17266-19845 esm-fingerprint
var jr = class {
  _process;
  _readBuffer;
  _serverParams;
  _stderrStream = null;
  onclose;
  onerror;
  onmessage;
  constructor(e) {
    if (
      ((this._serverParams = e),
      (this._readBuffer = new iLo({ maxBufferSize: e.maxBufferSize })),
      e.stderr === "pipe" || e.stderr === "overlapped")
    )
      this._stderrStream = new PassThrough();
  }
  async start() {
    if (this._process)
      throw Error(
        "StdioClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    return new Promise((e, n) => {
      if (
        ((this._process = Hr.default(this._serverParams.command, this._serverParams.args ?? [], {
          env: { ...ko(), ...this._serverParams.env },
          stdio: ["pipe", "pipe", this._serverParams.stderr ?? "inherit"],
          shell: !1,
          windowsHide: Ro.platform === "win32",
          cwd: this._serverParams.cwd,
        })),
        this._process.on("error", (r) => {
          (n(r), this.onerror?.(r));
        }),
        this._process.on("spawn", () => {
          e();
        }),
        this._process.on("close", (r) => {
          ((this._process = void 0), this.onclose?.());
        }),
        this._process.stdin?.on("error", (r) => {
          this.onerror?.(r);
        }),
        this._process.stdout?.on("data", (r) => {
          try {
            (this._readBuffer.append(r), this.processReadBuffer());
          } catch (error) {
            (this.onerror?.(error), this.close().catch(() => {}));
          }
        }),
        this._process.stdout?.on("error", (r) => {
          this.onerror?.(r);
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
  async _dispose() {
    let _process = this._process;
    if (((this._process = void 0), _process && _process.exitCode === null && _process.signalCode === null)) {
      let promise = new Promise((r) => _process.once("exit", () => r()));
      try {
        _process.stdin?.end();
      } catch {}
      try {
        _process.kill("SIGTERM");
      } catch {}
      if (
        (await Promise.race([promise, new Promise((r) => setTimeout(r, 1000).unref())]),
        _process.exitCode === null && _process.signalCode === null)
      )
        try {
          _process.kill("SIGKILL");
        } catch {}
      await promise;
    }
    try {
      _process?.stdout?.destroy();
    } catch {}
    try {
      _process?.stdin?.destroy();
    } catch {}
    try {
      _process?.stderr?.destroy();
    } catch {}
    this._readBuffer.clear();
  }
  async close() {
    if (this._process) {
      let _process = this._process;
      this._process = void 0;
      let promise = new Promise((r) => {
        _process.once("close", () => {
          r();
        });
      });
      try {
        _process.stdin?.end();
      } catch {}
      if (
        (await Promise.race([promise, new Promise((r) => setTimeout(r, 2000).unref())]),
        _process.exitCode === null)
      ) {
        try {
          _process.kill("SIGTERM");
        } catch {}
        await Promise.race([promise, new Promise((r) => setTimeout(r, 2000).unref())]);
      }
      if (_process.exitCode === null)
        try {
          _process.kill("SIGKILL");
        } catch {}
    }
    this._readBuffer.clear();
  }
  send(e) {
    return new Promise((n) => {
      if (!this._process?.stdin) throw new SdkError(Ti.NotConnected, "Not connected");
      let r = aLo(e);
      if (this._process.stdin.write(r)) n();
      else this._process.stdin.once("drain", n);
    });
  }
};

export { ko, jr };
