/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (10)
 * attribution: esm-layout 2, esm-fingerprint 8
 */
import { execSync, exec } from "child_process";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";
import "fs";
import * as fsModule_2 from "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import "fs";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:720057-720113 esm-layout
var sandboxRuntimeCache = new Map();
var cachedGlobalNpmPaths = null;
var pendingGlobalNpmPaths = null;
var NPM_ROOT_COMMAND = "npm root -g";
var NPM_ROOT_TIMEOUT_MS = 5000;
//@ chunk-fq0cr76a.js:720113-720248 esm-fingerprint
function getSandboxRuntimeCandidatesSync() {
  if (cachedGlobalNpmPaths) return cachedGlobalNpmPaths;
  let npmRoot;
  try {
    npmRoot = execSync(NPM_ROOT_COMMAND, {
      encoding: "utf8",
      timeout: NPM_ROOT_TIMEOUT_MS,
      stdio: ["pipe", "pipe", "ignore"],
    });
  } catch {}
  cachedGlobalNpmPaths = sandboxRuntimeCandidatePaths(npmRoot);
  return cachedGlobalNpmPaths;
}
//@ chunk-fq0cr76a.js:720248-720474 esm-fingerprint
function getSandboxRuntimeCandidates() {
  if (cachedGlobalNpmPaths) return Promise.resolve(cachedGlobalNpmPaths);
  if (pendingGlobalNpmPaths) return pendingGlobalNpmPaths;
  pendingGlobalNpmPaths = new Promise((resolve) => {
    try {
      exec(
        NPM_ROOT_COMMAND,
        {
          encoding: "utf8",
          timeout: NPM_ROOT_TIMEOUT_MS,
        },
        (err, stderr) => resolve(err ? undefined : stderr),
      ).stdin?.end();
    } catch {
      resolve(undefined);
    }
  }).then((npmRoot) => {
    cachedGlobalNpmPaths ?? (cachedGlobalNpmPaths = sandboxRuntimeCandidatePaths(npmRoot));
    pendingGlobalNpmPaths = null;
    return cachedGlobalNpmPaths;
  });
  return pendingGlobalNpmPaths;
}
//@ chunk-fq0cr76a.js:720474-720951 esm-fingerprint
function sandboxRuntimeCandidatePaths(npmRootOutput) {
  let paths = [];
  let npmRoot = npmRootOutput?.trim();
  if (npmRoot) paths.push(join(npmRoot, "@anthropic-ai", "sandbox-runtime"));
  let home = homedir();
  paths.push(
    join("/usr", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
    join("/usr", "local", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
    join("/opt", "homebrew", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
    join(home, ".npm", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
    join(home, ".npm-global", "lib", "node_modules", "@anthropic-ai", "sandbox-runtime"),
  );
  return paths;
}
//@ chunk-fq0cr76a.js:720951-721408 esm-layout
function getVendorArchitecture() {
  switch ("x64") {
    case "x64":
      return "x64";
    case "arm64":
      return "arm64";
    case "ia32":
      logForDebugging_2(
        "[SeccompFilter] 32-bit x86 (ia32) is not currently supported due to missing socketcall() syscall blocking. The current seccomp filter only blocks socket(AF_UNIX, ...), but on 32-bit x86, socketcall() can be used to bypass this.",
        {
          level: "error",
        },
      );
      return null;
    default:
      logForDebugging_2("[SeccompFilter] Unsupported architecture: x64. Only x64 and arm64 are supported.");
      return null;
  }
}
//@ chunk-fq0cr76a.js:721408-721555 esm-fingerprint
function getLocalSeccompPaths(filename) {
  let arch = getVendorArchitecture();
  if (!arch) return [];
  let baseDir = dirname(fileURLToPath(import.meta.url));
  let relativePath = join("vendor", "seccomp", arch, filename);
  return [
    join(baseDir, relativePath),
    join(baseDir, "..", "..", relativePath),
    join(baseDir, "..", relativePath),
  ];
}
//@ chunk-fq0cr76a.js:721555-721670 esm-fingerprint
function getApplySeccompBinaryPath(seccompBinaryPath) {
  let cacheKey = seccompBinaryPath ?? "";
  if (sandboxRuntimeCache.has(cacheKey)) return sandboxRuntimeCache.get(cacheKey);
  let local = findLocalApplySeccompPath(seccompBinaryPath);
  let result = local !== undefined ? local : findGlobalApplySeccompPath(getSandboxRuntimeCandidatesSync());
  sandboxRuntimeCache.set(cacheKey, result);
  return result;
}
//@ chunk-fq0cr76a.js:721670-721797 esm-fingerprint
async function getApplySeccompBinaryPath_2(seccompBinaryPath) {
  let cacheKey = seccompBinaryPath ?? "";
  if (sandboxRuntimeCache.has(cacheKey)) return sandboxRuntimeCache.get(cacheKey);
  let local = findLocalApplySeccompPath(seccompBinaryPath);
  let result = local !== undefined ? local : findGlobalApplySeccompPath(await getSandboxRuntimeCandidates());
  sandboxRuntimeCache.set(cacheKey, result);
  return result;
}
//@ chunk-fq0cr76a.js:721797-722314 esm-fingerprint
function findLocalApplySeccompPath(seccompBinaryPath) {
  if (seccompBinaryPath) {
    if (fsModule_2.existsSync(seccompBinaryPath)) {
      logForDebugging_2(
        `[SeccompFilter] Using apply-seccomp binary from explicit path: ${seccompBinaryPath}`,
      );
      return seccompBinaryPath;
    }
    logForDebugging_2(`[SeccompFilter] Explicit path provided but file not found: ${seccompBinaryPath}`);
  }
  let arch = getVendorArchitecture();
  if (!arch) {
    logForDebugging_2("[SeccompFilter] Cannot find apply-seccomp binary: unsupported architecture x64");
    return null;
  }
  logForDebugging_2(`[SeccompFilter] Looking for apply-seccomp binary for architecture: ${arch}`);
  for (let binaryPath of getLocalSeccompPaths("apply-seccomp"))
    if (fsModule_2.existsSync(binaryPath)) {
      logForDebugging_2(`[SeccompFilter] Found apply-seccomp binary: ${binaryPath} (${arch})`);
      return binaryPath;
    }
  return;
}
//@ chunk-fq0cr76a.js:722314-722629 esm-fingerprint
function findGlobalApplySeccompPath(globalBases) {
  let arch = getVendorArchitecture();
  if (!arch) return null;
  for (let globalBase of globalBases) {
    let binaryPath = join(globalBase, "vendor", "seccomp", arch, "apply-seccomp");
    if (fsModule_2.existsSync(binaryPath)) {
      logForDebugging_2(
        `[SeccompFilter] Found apply-seccomp binary in global install: ${binaryPath} (${arch})`,
      );
      return binaryPath;
    }
  }
  logForDebugging_2(`[SeccompFilter] apply-seccomp binary not found in any expected location (${arch})`);
  return null;
}
export { getApplySeccompBinaryPath_2, getSandboxRuntimeCandidates, getApplySeccompBinaryPath };
