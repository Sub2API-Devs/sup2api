/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (10)
 * attribution: esm-layout 2, esm-fingerprint 8
 */
import { execSync, exec } from "child_process";
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
} from "os";
import {
  fileURLToPath,
  fileURLToPath as fileURLToPath_2,
  fileURLToPath as fileURLToPath_3,
  fileURLToPath as fileURLToPath_4,
} from "url";
import * as fsModule from "fs";
import * as fsModule_2 from "fs";
import * as fsModule_3 from "fs";
import * as fsModule_4 from "fs";
import * as fsModule_5 from "fs";
import * as fsModule_6 from "fs";
import * as fsModule_7 from "fs";
import { At } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:720057-720113 esm-layout
var sandboxRuntimeCache = new Map(),
  ma = null,
  Ff = null,
  BR = "npm root -g",
  UR = 5000;
//@ chunk-fq0cr76a.js:720113-720248 esm-fingerprint
function getSandboxRuntimeCandidatesSync() {
  if (ma) return ma;
  let e;
  try {
    e = execSync(BR, { encoding: "utf8", timeout: UR, stdio: ["pipe", "pipe", "ignore"] });
  } catch {}
  return ((ma = sandboxRuntimeCandidatePaths(e)), ma);
}
//@ chunk-fq0cr76a.js:720248-720474 esm-fingerprint
function getSandboxRuntimeCandidates() {
  if (ma) return Promise.resolve(ma);
  if (Ff) return Ff;
  return (
    (Ff = new Promise((e) => {
      try {
        exec(BR, { encoding: "utf8", timeout: UR }, (r, s) => e(r ? void 0 : s)).stdin?.end();
      } catch {
        e(void 0);
      }
    }).then((e) => (ma ?? (ma = sandboxRuntimeCandidatePaths(e)), (Ff = null), ma))),
    Ff
  );
}
//@ chunk-fq0cr76a.js:720474-720951 esm-fingerprint
function sandboxRuntimeCandidatePaths(e) {
  let n = [],
    r = e?.trim();
  if (r) n.push(join_7(r, "@anthropic-ai", "sandbox-runtime"));
  let s = homedir_2();
  return (
    n.push(
      join_7("/usr", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
      join_7("/usr", "local", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
      join_7("/opt", "homebrew", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
      join_7(s, ".npm", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
      join_7(s, ".npm-global", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
    ),
    n
  );
}
//@ chunk-fq0cr76a.js:720951-721408 esm-layout
function PE() {
  switch ("x64") {
    case "x64":
      return "x64";
    case "arm64":
      return "arm64";
    case "ia32":
      return (
        At(
          "[SeccompFilter] 32-bit x86 (ia32) is not currently supported due to missing socketcall() syscall blocking. The current seccomp filter only blocks socket(AF_UNIX, ...), but on 32-bit x86, socketcall() can be used to bypass this.",
          { level: "error" },
        ),
        null
      );
    default:
      return (At("[SeccompFilter] Unsupported architecture: x64. Only x64 and arm64 are supported."), null);
  }
}
//@ chunk-fq0cr76a.js:721408-721555 esm-fingerprint
function r8(e) {
  let n = PE();
  if (!n) return [];
  let r = dirname_5(fileURLToPath_2(import.meta.url)),
    s = join_7("vendor", "seccomp", n, e);
  return [join_7(r, s), join_7(r, "..", "..", s), join_7(r, "..", s)];
}
//@ chunk-fq0cr76a.js:721555-721670 esm-fingerprint
function vor(e) {
  let n = e ?? "";
  if (sandboxRuntimeCache.has(n)) return sandboxRuntimeCache.get(n);
  let r = MR(e),
    s = r !== void 0 ? r : $R(getSandboxRuntimeCandidatesSync());
  return (sandboxRuntimeCache.set(n, s), s);
}
//@ chunk-fq0cr76a.js:721670-721797 esm-fingerprint
async function B6r(e) {
  let n = e ?? "";
  if (sandboxRuntimeCache.has(n)) return sandboxRuntimeCache.get(n);
  let r = MR(e),
    s = r !== void 0 ? r : $R(await getSandboxRuntimeCandidates());
  return (sandboxRuntimeCache.set(n, s), s);
}
//@ chunk-fq0cr76a.js:721797-722314 esm-fingerprint
function MR(e) {
  if (e) {
    if (fsModule_5.existsSync(e))
      return (At(`[SeccompFilter] Using apply-seccomp binary from explicit path: ${e}`), e);
    At(`[SeccompFilter] Explicit path provided but file not found: ${e}`);
  }
  let n = PE();
  if (!n) return (At("[SeccompFilter] Cannot find apply-seccomp binary: unsupported architecture x64"), null);
  At(`[SeccompFilter] Looking for apply-seccomp binary for architecture: ${n}`);
  for (let r of r8("apply-seccomp"))
    if (fsModule_5.existsSync(r)) return (At(`[SeccompFilter] Found apply-seccomp binary: ${r} (${n})`), r);
  return;
}
//@ chunk-fq0cr76a.js:722314-722629 esm-fingerprint
function $R(e) {
  let n = PE();
  if (!n) return null;
  for (let r of e) {
    let s = join_7(r, "vendor", "seccomp", n, "apply-seccomp");
    if (fsModule_5.existsSync(s))
      return (At(`[SeccompFilter] Found apply-seccomp binary in global install: ${s} (${n})`), s);
  }
  return (At(`[SeccompFilter] apply-seccomp binary not found in any expected location (${n})`), null);
}

export { B6r, getSandboxRuntimeCandidates, vor };
