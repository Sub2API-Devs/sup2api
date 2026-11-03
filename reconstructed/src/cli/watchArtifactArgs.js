/**
 * cli/watchArtifactArgs.ts
 *
 * 2.1.316 新增：--watch-artifact 参数解析与待处理 artifact 关注状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mbd4s9s4.js (8)
 * attribution: placement 8
 */
import { claudeAiEnvironment } from "../constants/claudeAiOrigin.js";
import { decodeBase58Uuid } from "../utils/messages.js";
import { artifactViewerUrlFor } from "../tools/ArtifactTool/artifactUrls.js";
import { ARTIFACT_SLUG_RE, parseArtifactUrlAnyCase } from "../tools/ArtifactTool/constants.js";
import { getReplConfigArgv, setReplConfigArgv } from "../bootstrap/state.js";
import { syncRespawnFlag } from "../services/daemon/jobState.js";

//@ chunk-mbd4s9s4.js:316-752 placement
/**
 * 解析 --watch-artifact 的值（artifact id 或 claude.ai URL），校验与当前登录环境一致。
 */
function parseWatchArtifactArg(a) {
  let trimmed = a.trim();
  let r = claudeAiEnvironment();
  let t = decodeBase58Uuid(trimmed);
  if (t !== null)
    return {
      slug: t,
      url: artifactViewerUrlFor({
        slug: t,
        env: r,
      }),
    };
  let lower = trimmed.toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower))
    return {
      slug: lower,
      url: artifactViewerUrlFor({
        slug: lower,
        env: r,
      }),
    };
  let artifactUrlAnyCase = parseArtifactUrlAnyCase(trimmed);
  if (artifactUrlAnyCase === null)
    return {
      error: "Error: --watch-artifact expects an artifact id or a claude.ai artifact URL",
    };
  if (artifactUrlAnyCase.env !== r)
    return {
      error: `Error: --watch-artifact got a ${artifactUrlAnyCase.env} artifact URL, but this session is signed in to ${r}`,
    };
  return {
    slug: artifactUrlAnyCase.slug,
    url: artifactViewerUrlFor(artifactUrlAnyCase),
  };
}
//@ chunk-mbd4s9s4.js:752-763 placement
var pendingWatchArtifact = null;
//@ chunk-mbd4s9s4.js:763-783 placement
function setPendingWatchArtifact(a) {
  pendingWatchArtifact = a;
}
//@ chunk-mbd4s9s4.js:783-822 placement
function takePendingWatchArtifact() {
  let a = pendingWatchArtifact;
  pendingWatchArtifact = null;
  return a;
}
//@ chunk-mbd4s9s4.js:822-846 placement
function peekPendingWatchArtifact() {
  return pendingWatchArtifact;
}
//@ chunk-mbd4s9s4.js:846-1100 placement
function stripWatchArtifactArgs(replConfigArgv) {
  let e = [];
  for (let i = 0; i < replConfigArgv.length; i++) {
    let t = replConfigArgv[i];
    if (t === "--watch-artifact" || t === "--watch-artifact-no-autoreact") {
      i++;
      continue;
    }
    if (t.startsWith("--watch-artifact=") || t.startsWith("--watch-artifact-no-autoreact=")) continue;
    e.push(t);
  }
  return e;
}
//@ chunk-mbd4s9s4.js:1100-1466 placement
function hasWatchArtifactArg(a, storageV5) {
  a = a.toLowerCase();
  let r = ["--watch-artifact", "--watch-artifact-no-autoreact"];
  let replConfigArgv = getReplConfigArgv();
  let n = [];
  let o = false;
  for (let i = 0; i < replConfigArgv.length; i++) {
    let c = replConfigArgv[i];
    if (
      r.some(
        (u) => (c === u && replConfigArgv[i + 1]?.toLowerCase() === a) || c.toLowerCase() === `${u}=${a}`,
      )
    ) {
      if (c.indexOf("=") === -1) i++;
      o = true;
      continue;
    }
    n.push(c);
  }
  if (o) {
    setReplConfigArgv(n);
    syncRespawnFlag("--watch-artifact", ["--watch-artifact-no-autoreact"], null, undefined, storageV5);
  }
}
//@ chunk-mbd4s9s4.js:1466-1825 placement
function getWatchArtifactNoAutoreact(storageV5) {
  let replConfigArgv = getReplConfigArgv();
  let r;
  for (let i = 0; i < replConfigArgv.length; i++) {
    let n = replConfigArgv[i];
    if (n === "--watch-artifact" && replConfigArgv[i + 1] !== undefined)
      r = replConfigArgv[i + 1].toLowerCase();
    else if (n.startsWith("--watch-artifact=")) r = n.slice(17).toLowerCase();
  }
  if (r === undefined) return false;
  setReplConfigArgv([...stripWatchArtifactArgs(getReplConfigArgv()), "--watch-artifact-no-autoreact", r]);
  syncRespawnFlag("--watch-artifact-no-autoreact", ["--watch-artifact"], r, undefined, storageV5);
  return true;
}
export {
  stripWatchArtifactArgs,
  peekPendingWatchArtifact,
  takePendingWatchArtifact,
  parseWatchArtifactArg,
  setPendingWatchArtifact,
  getWatchArtifactNoAutoreact,
  hasWatchArtifactArg,
};
