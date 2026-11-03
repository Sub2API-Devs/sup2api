/**
 * utils/sessionPathsCache.ts
 *
 * 2.1.316 新增：会话路径缓存（临时目录、技能根、草稿目录等）；取当前宿主的会话路径缓存。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pqycqpxn.js (4)
 * attribution: placement 4
 */
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";

/**
 * 会话路径缓存（临时目录、技能根、草稿目录等）。
 */
//@ chunk-pqycqpxn.js:261-1563 placement
class SessionPathsCache {
  claudeTempDir = void 0;
  childProcessTmpDir = void 0;
  bundledSkillsRoot = void 0;
  scratchpadDirBySessionId = new Map();
  resolvedWorkingDirPaths = new Map();
  workingDirPathsHeldAsNamed = new Set();
  compiledPatternsByRules = new WeakMap();
  physicalTwinsByPattern = new Map();
  composedRepoRules = {};
  giveUpProbes = new WeakMap();
  reportedGiveUps = new Set();
  reportedSecondRootMountMatches = new Set();
  reportedSecondRootMountFlagThrow = !1;
  eventsLoggedOnce = new Set();
  trustedSymlinkEquivalences = void 0;
  userSkillsBaseSpellingsFolded = void 0;
  resolvedSandboxConfigPaths = new Map();
  canonicalHomedirByHome = new Map();
  foldedSegmentsBySpelling = new Map();
  settingsFileLinks = void 0;
  reset() {
    (delete this.composedRepoRules.native,
      delete this.composedRepoRules.upload,
      (this.claudeTempDir = void 0),
      (this.childProcessTmpDir = void 0),
      (this.bundledSkillsRoot = void 0),
      this.scratchpadDirBySessionId.clear(),
      this.resolvedWorkingDirPaths.clear(),
      this.workingDirPathsHeldAsNamed.clear(),
      (this.trustedSymlinkEquivalences = void 0),
      (this.userSkillsBaseSpellingsFolded = void 0),
      this.resolvedSandboxConfigPaths.clear(),
      this.canonicalHomedirByHome.clear(),
      this.foldedSegmentsBySpelling.clear(),
      this.physicalTwinsByPattern.clear(),
      this.reportedGiveUps.clear(),
      this.reportedSecondRootMountMatches.clear(),
      (this.reportedSecondRootMountFlagThrow = !1),
      this.eventsLoggedOnce.clear(),
      (this.settingsFileLinks = void 0));
  }
}
//@ chunk-pqycqpxn.js:1563-1586 placement
var n = new HostScoped(() => new SessionPathsCache());
/**
 * 取当前宿主的会话路径缓存。
 */
//@ chunk-pqycqpxn.js:1586-1622 placement
function getSessionPathsCache() {
  return n.of(getRootSession().host);
}
//@ chunk-pqycqpxn.js:1622-1659 placement
function Emi() {
  return getRootSession().host.clock;
}

export { getSessionPathsCache, Emi };
