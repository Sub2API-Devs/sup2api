/**
 * utils/platform.ts
 *
 * 平台检测（macos/windows/wsl/linux，linux 构建固化 platform=linux 再看 /proc/version）、WSL 版本、VCS 探测。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/platform.ts
 * pieces: chunk-4m46mxx9.js (2), chunk-9m6032j0.js (1), chunk-qchp9vrd.js (1), chunk-znrryf4y.js (15)
 * attribution: fingerprint 5, shared-adjacent 1, placement 1, sole-consumer 1, affinity 1, layout 10
 */
import { readFile, readdir } from "fs/promises";
import { release } from "os";
import { ge } from "./identity.js";
import { getFsImplementation } from "./fsOperations.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { uniqueArray } from "../plugins/bundled/telemetry/environment.js";

//@ chunk-znrryf4y.js:418-457 sole-consumer
var d = ge({ value: !1 }, (e) => {
  e.value = !1;
});
//@ chunk-znrryf4y.js:457-485 affinity
function c() {
  return d.value;
}
//@ chunk-znrryf4y.js:485-606 fingerprint = getWslVersion (0.646)
function getWslVersion_2() {
  if (c()) return;
  try {
    return getFsImplementation().readFileSync("/proc/version", { encoding: "utf8" }).toLowerCase();
  } catch {
    return;
  }
}
//@ chunk-znrryf4y.js:606-630 layout = SUPPORTED_PLATFORMS (1)
var SUPPORTED_PLATFORMS_2 = ["macos", "wsl"];
//@ chunk-znrryf4y.js:630-2923 fingerprint = getPlatform (0.361)
class PlatformDetector {
  sources;
  primedProcVersion;
  fallbackProcVersion;
  fallbackProcVersionRead = !1;
  platform;
  wslVersion = null;
  macOSMajorVersion = null;
  linuxDistroInfo;
  constructor(e) {
    this.sources = e;
  }
  kernelString() {
    if (this.primedProcVersion !== void 0) return this.primedProcVersion;
    if (!this.fallbackProcVersionRead)
      ((this.fallbackProcVersion = this.sources.readProcVersionSync()), (this.fallbackProcVersionRead = !0));
    return this.fallbackProcVersion;
  }
  getPlatform() {
    if (this.platform !== void 0) return this.platform;
    try {
      if (this.sources.platform === "darwin") this.platform = "macos";
      else if (this.sources.platform === "win32") this.platform = "windows";
      else if (this.sources.platform === "linux")
        if (this.sources.env.WSL_DISTRO_NAME || this.sources.env.WSL_INTEROP) this.platform = "wsl";
        else {
          let kernelString = this.kernelString();
          this.platform = kernelString !== void 0 && oDt(kernelString) ? "wsl" : "linux";
        }
      else this.platform = "unknown";
    } catch (error) {
      (logError(error), (this.platform = "unknown"));
    }
    return this.platform;
  }
  getWslVersion() {
    if (this.wslVersion !== null) return this.wslVersion;
    if (this.sources.platform !== "linux") {
      this.wslVersion = void 0;
      return;
    }
    let kernelString = this.kernelString();
    if (kernelString === void 0) {
      this.wslVersion = void 0;
      return;
    }
    let match = kernelString.match(/wsl(\d+)/);
    if (match && match[1]) this.wslVersion = match[1];
    else if (kernelString.includes("microsoft")) this.wslVersion = "1";
    else this.wslVersion = void 0;
    return this.wslVersion;
  }
  getMacOSMajorVersion() {
    if (this.macOSMajorVersion !== null) return this.macOSMajorVersion;
    if (this.sources.platform !== "darwin") {
      this.macOSMajorVersion = void 0;
      return;
    }
    let match = this.sources.osRelease().match(/^(\d+)\./);
    return (
      (this.macOSMajorVersion = match && match[1] ? parseInt(match[1], 10) - 9 : void 0),
      this.macOSMajorVersion
    );
  }
  getLinuxDistroInfo() {
    return (this.linuxDistroInfo ??= this.readLinuxDistroInfo());
  }
  async readLinuxDistroInfo() {
    if (this.sources.platform !== "linux") return;
    let e = { linuxKernel: this.sources.osRelease() };
    try {
      let osRelease = await this.sources.readOsRelease();
      for (let s of osRelease.split(`
`)) {
        let match = s.match(/^(ID|VERSION_ID)=(.*)$/);
        if (match && match[1] && match[2]) {
          let replaced = match[2].replace(/^"|"$/g, "");
          if (match[1] === "ID") e.linuxDistroId = replaced;
          else e.linuxDistroVersion = replaced;
        }
      }
    } catch {}
    return e;
  }
  async prime() {
    if (this.primedProcVersion !== void 0 || this.sources.platform !== "linux") return;
    try {
      let procVersion = await this.sources.readProcVersion();
      this.primedProcVersion = procVersion.toLowerCase();
    } catch (error) {
      logForDebugging(`Failed to read /proc/version for WSL detection: ${error}`, { level: "error" });
      return;
    }
    ((this.platform = void 0), (this.wslVersion = null));
  }
}
//@ chunk-znrryf4y.js:2923-2929 layout
var h;
//@ chunk-znrryf4y.js:2929-3134 layout
function getPlatformDetector() {
  return (h ??= new PlatformDetector({
    platform: "linux",
    env: process.env,
    readProcVersionSync: getWslVersion_2,
    readProcVersion: () => readFile("/proc/version", { encoding: "utf8" }),
    osRelease: release,
    readOsRelease: () => readFile("/etc/os-release", "utf8"),
  }));
}
//@ chunk-znrryf4y.js:3134-3168 layout
function XMi() {
  return getPlatformDetector().prime();
}
/**
 * 当前平台：macos / windows / wsl / linux（linux 构建在检测器里固化 platform=linux，再按 /proc/version 判 WSL）。
 */
//@ chunk-znrryf4y.js:3168-3206 layout
function getPlatform() {
  return getPlatformDetector().getPlatform();
}
//@ chunk-znrryf4y.js:3206-3331 layout
function getPlatformDisplayName(e) {
  switch (e) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return e;
  }
}
//@ chunk-znrryf4y.js:3331-3373 layout
function getWslVersion() {
  return getPlatformDetector().getWslVersion();
}
//@ chunk-znrryf4y.js:3373-3420 layout
function Iwr() {
  return getPlatformDetector().getLinuxDistroInfo();
}
//@ chunk-znrryf4y.js:3420-3469 layout
function JMi() {
  return getPlatformDetector().getMacOSMajorVersion();
}
//@ chunk-znrryf4y.js:3469-3618 layout = VCS_MARKERS (1)
var VCS_MARKERS_2 = [
  [".git", "git"],
  [".hg", "mercurial"],
  [".svn", "svn"],
  [".p4config", "perforce"],
  ["$tf", "tfs"],
  [".tfvc", "tfs"],
  [".jj", "jujutsu"],
  [".sl", "sapling"],
];
//@ chunk-znrryf4y.js:3618-3798 fingerprint = detectVcs (1)
async function detectVcs(dir) {
  let detected = new Set();
  if (process.env.P4PORT) detected.add("perforce");
  try {
    let targetDir = dir ?? getFsImplementation().cwd(),
      entries = new Set(await readdir(targetDir));
    for (let [i, a] of VCS_MARKERS_2) if (entries.has(i)) detected.add(a);
  } catch {}
  return [...detected];
}
//@ chunk-4m46mxx9.js:18087-18237 fingerprint = VCS_MARKERS (1)
var VCS_MARKERS = [
  [".git", "git"],
  [".hg", "mercurial"],
  [".svn", "svn"],
  [".p4config", "perforce"],
  ["$tf", "tfs"],
  [".tfvc", "tfs"],
  [".jj", "jujutsu"],
  [".sl", "sapling"],
];
//@ chunk-4m46mxx9.js:18237-18436 shared-adjacent = detectVcs (0.773)
async function detectVcs_2(e, t, r) {
  let i;
  try {
    i = await e(t);
  } catch {
    i = [];
  }
  let entries = new Set(i.map((o) => o.name)),
    a = uniqueArray([
      ...(r ? ["perforce"] : []),
      ...VCS_MARKERS.flatMap(([o, c]) => (entries.has(o) ? [c] : [])),
    ]);
  return a.length > 0 ? a.join(",") : void 0;
}
//@ chunk-9m6032j0.js:191-257 placement
function oDt(n) {
  return n.includes("microsoft") || n.includes("wsl");
}
//@ chunk-qchp9vrd.js:201680-201749 fingerprint = SUPPORTED_PLATFORMS (1)
function SUPPORTED_PLATFORMS() {
  let e = getPlatform();
  return e === "macos" || e === "windows" || e === "wsl";
}

export {
  getPlatform,
  getPlatformDisplayName,
  Iwr,
  detectVcs,
  getWslVersion,
  SUPPORTED_PLATFORMS_2,
  VCS_MARKERS,
  detectVcs_2,
  JMi,
  XMi,
  getWslVersion_2,
  oDt,
  SUPPORTED_PLATFORMS,
};
