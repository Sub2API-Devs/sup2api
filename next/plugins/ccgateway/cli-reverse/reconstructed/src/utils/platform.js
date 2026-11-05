/**
 * utils/platform.ts
 *
 * 平台检测（macos/windows/wsl/linux，linux 构建固化 platform=linux 再看 /proc/version）、WSL 版本、VCS 探测。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/platform.ts
 * pieces: chunk-08q4d92p.js (2), chunk-af1hzzme.js (1), chunk-bb1a67wr.js (15), chunk-j9w0w3wz.js (1)
 * attribution: fingerprint 4, shared-adjacent 1, placement 2, sole-consumer 1, affinity 1, layout 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readFile, readdir } from "fs/promises";
import { release } from "os";
import { identity } from "./identity.js";
import { getFsImplementation } from "./fsOperations.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import { uniqueArray } from "../plugins/bundled/telemetry/environment.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-j9w0w3wz.js:191-257 placement
/**
 * looksLikeWslVersion：版本串像 WSL。
 */
function looksLikeWslVersion(kernelString) {
  return kernelString.includes("microsoft") || kernelString.includes("wsl");
}
//@ chunk-bb1a67wr.js:418-457 sole-consumer
var platformOverride; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bb1a67wr.js:418", () => {
  platformOverride = identity(
    {
      value: false,
    },
    (state) => {
      state.value = false;
    },
  );
});
//@ chunk-bb1a67wr.js:457-485 affinity
function platformOverrideValue() {
  return platformOverride.value;
}
//@ chunk-bb1a67wr.js:485-606 fingerprint (2.1.88 match: getWslVersion, 0.645)
function getWslVersion_2() {
  if (platformOverrideValue()) return;
  try {
    return getFsImplementation()
      .readFileSync("/proc/version", {
        encoding: "utf8",
      })
      .toLowerCase();
  } catch {
    return;
  }
}
//@ chunk-bb1a67wr.js:606-630 layout (2.1.88 match: SUPPORTED_PLATFORMS, 1)
var SUPPORTED_PLATFORMS = ["macos", "wsl"];
//@ chunk-bb1a67wr.js:630-2923 fingerprint (2.1.88 match: getPlatform, 0.361)
class PlatformDetector {
  sources;
  primedProcVersion;
  fallbackProcVersion;
  fallbackProcVersionRead = false;
  platform;
  wslVersion = null;
  macOSMajorVersion = null;
  linuxDistroInfo;
  constructor(sources) {
    this.sources = sources;
  }
  kernelString() {
    if (this.primedProcVersion !== undefined) return this.primedProcVersion;
    if (!this.fallbackProcVersionRead) {
      this.fallbackProcVersion = this.sources.readProcVersionSync();
      this.fallbackProcVersionRead = true;
    }
    return this.fallbackProcVersion;
  }
  getPlatform() {
    if (this.platform !== undefined) return this.platform;
    try {
      if (this.sources.platform === "darwin") this.platform = "macos";
      else if (this.sources.platform === "win32") this.platform = "windows";
      else if (this.sources.platform === "linux") {
        if (this.sources.env.WSL_DISTRO_NAME || this.sources.env.WSL_INTEROP) this.platform = "wsl";
        else {
          let kernelString = this.kernelString();
          this.platform = kernelString !== undefined && looksLikeWslVersion(kernelString) ? "wsl" : "linux";
        }
      } else this.platform = "unknown";
    } catch (error) {
      logError(error);
      this.platform = "unknown";
    }
    return this.platform;
  }
  getWslVersion() {
    if (this.wslVersion !== null) return this.wslVersion;
    if (this.sources.platform !== "linux") {
      this.wslVersion = undefined;
      return;
    }
    let kernelString = this.kernelString();
    if (kernelString === undefined) {
      this.wslVersion = undefined;
      return;
    }
    let match = kernelString.match(/wsl(\d+)/);
    if (match && match[1]) this.wslVersion = match[1];
    else if (kernelString.includes("microsoft")) this.wslVersion = "1";
    else this.wslVersion = undefined;
    return this.wslVersion;
  }
  getMacOSMajorVersion() {
    if (this.macOSMajorVersion !== null) return this.macOSMajorVersion;
    if (this.sources.platform !== "darwin") {
      this.macOSMajorVersion = undefined;
      return;
    }
    let match = this.sources.osRelease().match(/^(\d+)\./);
    this.macOSMajorVersion = match && match[1] ? parseInt(match[1], 10) - 9 : undefined;
    return this.macOSMajorVersion;
  }
  getLinuxDistroInfo() {
    return (this.linuxDistroInfo ??= this.readLinuxDistroInfo());
  }
  async readLinuxDistroInfo() {
    if (this.sources.platform !== "linux") return;
    let result = {
      linuxKernel: this.sources.osRelease(),
    };
    try {
      let content = await this.sources.readOsRelease();
      for (let line of content.split(`
`)) {
        let match = line.match(/^(ID|VERSION_ID)=(.*)$/);
        if (match && match[1] && match[2]) {
          let value = match[2].replace(/^"|"$/g, "");
          if (match[1] === "ID") result.linuxDistroId = value;
          else result.linuxDistroVersion = value;
        }
      }
    } catch {}
    return result;
  }
  async prime() {
    if (this.primedProcVersion !== undefined || this.sources.platform !== "linux") return;
    try {
      let procVersion = await this.sources.readProcVersion();
      this.primedProcVersion = procVersion.toLowerCase();
    } catch (error) {
      logForDebugging(`Failed to read /proc/version for WSL detection: ${error}`, {
        level: "error",
      });
      return;
    }
    this.platform = undefined;
    this.wslVersion = null;
  }
}
//@ chunk-bb1a67wr.js:2923-2929 layout
var platformDetectorCache;
//@ chunk-bb1a67wr.js:2929-3134 layout
function getPlatformDetector() {
  return (platformDetectorCache ??= new PlatformDetector({
    platform: "linux",
    env: process.env,
    readProcVersionSync: getWslVersion_2,
    readProcVersion: () =>
      readFile("/proc/version", {
        encoding: "utf8",
      }),
    osRelease: release,
    readOsRelease: () => readFile("/etc/os-release", "utf8"),
  }));
}
//@ chunk-bb1a67wr.js:3134-3168 layout
/**
 * primePlatform：预取平台信息。
 */
function primePlatform() {
  return getPlatformDetector().prime();
}
//@ chunk-bb1a67wr.js:3168-3206 layout
function getPlatform() {
  return getPlatformDetector().getPlatform();
}
//@ chunk-bb1a67wr.js:3206-3331 layout
function getPlatformDisplayName(platformName) {
  switch (platformName) {
    case "darwin":
      return "macOS";
    case "win32":
      return "Windows";
    case "linux":
      return "Linux";
    default:
      return platformName;
  }
}
//@ chunk-bb1a67wr.js:3331-3373 layout
function getWslVersion() {
  return getPlatformDetector().getWslVersion();
}
//@ chunk-bb1a67wr.js:3373-3420 layout
/**
 * linuxDistroInfo：Linux 发行版信息。
 */
function linuxDistroInfo() {
  return getPlatformDetector().getLinuxDistroInfo();
}
//@ chunk-bb1a67wr.js:3420-3469 layout
/**
 * macOSMajorVersion：macOS 主版本号。
 */
function macOSMajorVersion() {
  return getPlatformDetector().getMacOSMajorVersion();
}
//@ chunk-bb1a67wr.js:3469-3618 layout (2.1.88 match: VCS_MARKERS, 1)
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
//@ chunk-bb1a67wr.js:3618-3798 fingerprint (2.1.88 match: detectVcs, 1)
async function detectVcs(dir) {
  let detected = new Set();
  if (process.env.P4PORT) detected.add("perforce");
  try {
    let targetDir = dir ?? getFsImplementation().cwd();
    let entries = new Set(await readdir(targetDir));
    for (let [marker, vcs] of VCS_MARKERS_2) if (entries.has(marker)) detected.add(vcs);
  } catch {}
  return [...detected];
}
//@ chunk-08q4d92p.js:18339-18489 fingerprint (2.1.88 match: VCS_MARKERS, 1)
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
//@ chunk-08q4d92p.js:18489-18688 shared-adjacent (2.1.88 match: detectVcs, 0.773)
async function detectVcs_2(list, directory, hasP4Port) {
  let entries;
  try {
    entries = await list(directory);
  } catch {
    entries = [];
  }
  let entries_2 = new Set(entries.map((entry) => entry.name));
  let vcsNames = uniqueArray([
    ...(hasP4Port ? ["perforce"] : []),
    ...VCS_MARKERS.flatMap(([markerFile, vcsName]) => (entries_2.has(markerFile) ? [vcsName] : [])),
  ]);
  return vcsNames.length > 0 ? vcsNames.join(",") : undefined;
}
//@ chunk-af1hzzme.js:203090-203159 placement
function isCaseInsensitivePlatform() {
  let platform = getPlatform();
  return platform === "macos" || platform === "windows" || platform === "wsl";
}
export {
  getPlatform,
  linuxDistroInfo,
  detectVcs,
  getWslVersion,
  VCS_MARKERS,
  detectVcs_2,
  macOSMajorVersion,
  looksLikeWslVersion,
  getPlatformDisplayName,
  isCaseInsensitivePlatform,
  primePlatform,
  SUPPORTED_PLATFORMS,
  getWslVersion_2,
};
