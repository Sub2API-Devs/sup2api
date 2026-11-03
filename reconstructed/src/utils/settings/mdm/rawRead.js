/**
 * utils/settings/mdm/rawRead.ts
 *
 * 原始 MDM 读取：reg query HKLM/HKCU 的 Settings 值（macOS 为 plutil 读 plist），返回原始输出与结果分类。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/mdm/rawRead.ts
 * pieces: chunk-qrhwndg8.js (10)
 * attribution: sole-consumer 2, affinity 1, callgraph-fingerprint 1, layout 2, facade-exports 3, fingerprint 1
 */
import { execFile } from "child_process";
import {
  REG_QUERY_TIMEOUT_MS,
  REG_KEY_NOT_FOUND_TEXT,
  isWsl,
  WSL_REG_EXE_PATH,
  REG_QUERY_MAX_BUFFER,
} from "./wslRegistry.js";
import { SETTINGS, WINDOWS_REGISTRY_KEY_PATH_HKLM, WINDOWS_REGISTRY_KEY_PATH_HKCU } from "./constants.js";

//@ chunk-qrhwndg8.js:297-395 sole-consumer
class RawReadRunner {
  promise = null;
  start() {
    if (this.promise) return;
    this.promise = fireRawRead();
  }
  reset() {
    this.promise = null;
  }
}
//@ chunk-qrhwndg8.js:395-407 sole-consumer
var rawReadRunner = new RawReadRunner();
//@ chunk-qrhwndg8.js:407-870 affinity
function classifyExecResult(e) {
  if (!e)
    return {
      status: "ok",
      exitCode: 0,
      errno: null,
      signal: null,
    };
  let t = e;
  let signal = typeof t.signal === "string" && t.signal ? t.signal : null;
  if (typeof t.code === "string")
    return {
      status: "spawn_error",
      exitCode: null,
      errno: t.code,
      signal: null,
    };
  if (t.killed === true)
    return {
      status: "timeout",
      exitCode: null,
      errno: null,
      signal,
    };
  if (signal)
    return {
      status: "killed",
      exitCode: null,
      errno: null,
      signal,
    };
  return {
    status: "exited",
    exitCode: typeof t.code === "number" ? t.code : null,
    errno: null,
    signal: null,
  };
}
//@ chunk-qrhwndg8.js:870-1244 callgraph-fingerprint = execFilePromise (0.388)
function execFilePromise(cmd, args, n) {
  let now = Date.now();
  return new Promise((resolve) => {
    try {
      execFile(
        cmd,
        args,
        {
          encoding: "utf-8",
          timeout: REG_QUERY_TIMEOUT_MS,
          windowsHide: true,
          ...(n !== undefined && {
            maxBuffer: n,
          }),
        },
        (u, stdout, l) => {
          resolve({
            stdout: stdout ?? "",
            stderr: l ?? "",
            ...classifyExecResult(u),
            durationMs: Date.now() - now,
          });
        },
      );
    } catch (error) {
      let code = error.code;
      resolve({
        stdout: "",
        stderr: "",
        status: "spawn_error",
        exitCode: null,
        errno: typeof code === "string" ? code : null,
        signal: null,
        durationMs: Date.now() - now,
      });
    }
  });
}
//@ chunk-qrhwndg8.js:1244-1442 layout
function summarizeRegQueryOutcome(e) {
  return {
    status: e.status,
    exitCode: e.exitCode,
    errno: e.errno,
    signal: e.signal,
    durationMs: e.durationMs,
    answered:
      e.status === "ok" ||
      (e.status === "exited" && e.exitCode === 1 && e.stderr.includes(REG_KEY_NOT_FOUND_TEXT)),
  };
}
//@ chunk-qrhwndg8.js:1442-1535 layout
function isStdioMaxBufferError(e) {
  return e.status === "spawn_error" && e.errno === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER";
}
//@ chunk-qrhwndg8.js:1535-1683 facade-exports = consumeRawReadResult (0.602)
/**
 * Windows：并行 reg query HKLM 与 HKCU 的 Settings 值，返回原始输出与每次调用的结果分类。
 */
function fireRawRead() {
  return (async () => {
    if (isWsl()) return fireRawRead_2(WSL_REG_EXE_PATH);
    return {
      plistStdouts: null,
      hklmStdout: null,
      hkcuStdout: null,
      outcomes: {
        hklm: null,
        hkcu: null,
      },
    };
  })();
}
//@ chunk-qrhwndg8.js:1683-1991 fingerprint = fireRawRead (0.419)
async function fireRawRead_2(cmd) {
  let t = (o) => execFilePromise(cmd, ["query", o, "/v", SETTINGS], REG_QUERY_MAX_BUFFER);
  let [n, s] = await Promise.all([t(WINDOWS_REGISTRY_KEY_PATH_HKLM), t(WINDOWS_REGISTRY_KEY_PATH_HKCU)]);
  return {
    plistStdouts: null,
    hklmStdout: n.status === "ok" ? n.stdout : null,
    ...(isStdioMaxBufferError(n) && {
      hklmUnreadReason: `the value exceeds ${REG_QUERY_MAX_BUFFER / 1048576} MiB`,
    }),
    hkcuStdout: s.status === "ok" ? s.stdout : null,
    outcomes: {
      hklm: summarizeRegQueryOutcome(n),
      hkcu: summarizeRegQueryOutcome(s),
    },
  };
}
//@ chunk-qrhwndg8.js:1991-2016 facade-exports
function startMdmRawRead() {
  rawReadRunner.start();
}
//@ chunk-qrhwndg8.js:2016-2048 facade-exports
function getMdmRawReadPromise() {
  return rawReadRunner.promise;
}
export { startMdmRawRead, getMdmRawReadPromise, fireRawRead };
