/**
 * utils/sessionPathsCache.ts
 *
 * 2.1.316 新增：会话路径缓存（临时目录、技能根、草稿目录等）；取当前宿主的会话路径缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0eqe9we3.js (4)
 * attribution: placement 4
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-0eqe9we3.js:927-2229 placement
/**
 * 会话路径缓存（临时目录、技能根、草稿目录等）。
 */
class SessionPathsCache {
  claudeTempDir = undefined;
  childProcessTmpDir = undefined;
  bundledSkillsRoot = undefined;
  scratchpadDirBySessionId = new Map();
  resolvedWorkingDirPaths = new Map();
  workingDirPathsHeldAsNamed = new Set();
  compiledPatternsByRules = new WeakMap();
  physicalTwinsByPattern = new Map();
  composedRepoRules = {};
  giveUpProbes = new WeakMap();
  reportedGiveUps = new Set();
  reportedSecondRootMountMatches = new Set();
  reportedSecondRootMountFlagThrow = false;
  eventsLoggedOnce = new Set();
  trustedSymlinkEquivalences = undefined;
  userSkillsBaseSpellingsFolded = undefined;
  resolvedSandboxConfigPaths = new Map();
  canonicalHomedirByHome = new Map();
  foldedSegmentsBySpelling = new Map();
  settingsFileLinks = undefined;
  reset() {
    delete this.composedRepoRules.native;
    delete this.composedRepoRules.upload;
    this.claudeTempDir = undefined;
    this.childProcessTmpDir = undefined;
    this.bundledSkillsRoot = undefined;
    this.scratchpadDirBySessionId.clear();
    this.resolvedWorkingDirPaths.clear();
    this.workingDirPathsHeldAsNamed.clear();
    this.trustedSymlinkEquivalences = undefined;
    this.userSkillsBaseSpellingsFolded = undefined;
    this.resolvedSandboxConfigPaths.clear();
    this.canonicalHomedirByHome.clear();
    this.foldedSegmentsBySpelling.clear();
    this.physicalTwinsByPattern.clear();
    this.reportedGiveUps.clear();
    this.reportedSecondRootMountMatches.clear();
    this.reportedSecondRootMountFlagThrow = false;
    this.eventsLoggedOnce.clear();
    this.settingsFileLinks = undefined;
  }
}
//@ chunk-0eqe9we3.js:2229-2252 placement
var sessionPathsCacheSlot; // deferred: uses SessionPathsCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0eqe9we3.js:2229", () => {
  sessionPathsCacheSlot = new HostScoped(() => new SessionPathsCache());
});
//@ chunk-0eqe9we3.js:2252-2288 placement
/**
 * 取当前宿主的会话路径缓存。
 */
function getSessionPathsCache() {
  return sessionPathsCacheSlot.of(getRootSession().host);
}
//@ chunk-0eqe9we3.js:2288-2325 placement
/**
 * sessionClock：根会话的时钟。
 */
function sessionClock() {
  return getRootSession().host.clock;
}
export { getSessionPathsCache, sessionClock };
