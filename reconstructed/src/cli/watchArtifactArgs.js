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

/**
 * 解析 --watch-artifact 的值（artifact id 或 claude.ai URL），校验与当前登录环境一致。
 */
//@ chunk-mbd4s9s4.js:316-752 placement
function parseWatchArtifactArg(a) {
  let trimmed = a.trim(),
    r = claudeAiEnvironment(),
    t = decodeBase58Uuid(trimmed);
  if (t !== null) return { slug: t, url: artifactViewerUrlFor({ slug: t, env: r }) };
  let lower = trimmed.toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower))
    return { slug: lower, url: artifactViewerUrlFor({ slug: lower, env: r }) };
  let o = parseArtifactUrlAnyCase(trimmed);
  if (o === null)
    return { error: "Error: --watch-artifact expects an artifact id or a claude.ai artifact URL" };
  if (o.env !== r)
    return {
      error: `Error: --watch-artifact got a ${o.env} artifact URL, but this session is signed in to ${r}`,
    };
  return { slug: o.slug, url: artifactViewerUrlFor(o) };
}
//@ chunk-mbd4s9s4.js:752-763 placement
var s = null;
//@ chunk-mbd4s9s4.js:763-783 placement
function setPendingWatchArtifact(a) {
  s = a;
}
//@ chunk-mbd4s9s4.js:783-822 placement
function takePendingWatchArtifact() {
  let a = s;
  return ((s = null), a);
}
//@ chunk-mbd4s9s4.js:822-846 placement
function peekPendingWatchArtifact() {
  return s;
}
//@ chunk-mbd4s9s4.js:846-1100 placement
function stripWatchArtifactArgs(a) {
  let e = [];
  for (let r = 0; r < a.length; r++) {
    let t = a[r];
    if (t === "--watch-artifact" || t === "--watch-artifact-no-autoreact") {
      r++;
      continue;
    }
    if (t.startsWith("--watch-artifact=") || t.startsWith("--watch-artifact-no-autoreact=")) continue;
    e.push(t);
  }
  return e;
}
//@ chunk-mbd4s9s4.js:1100-1466 placement
function hasWatchArtifactArg(a, e) {
  a = a.toLowerCase();
  let r = ["--watch-artifact", "--watch-artifact-no-autoreact"],
    t = getReplConfigArgv(),
    n = [],
    o = !1;
  for (let i = 0; i < t.length; i++) {
    let c = t[i];
    if (r.some((u) => (c === u && t[i + 1]?.toLowerCase() === a) || c.toLowerCase() === `${u}=${a}`)) {
      if (c.indexOf("=") === -1) i++;
      o = !0;
      continue;
    }
    n.push(c);
  }
  if (o)
    (setReplConfigArgv(n),
      syncRespawnFlag("--watch-artifact", ["--watch-artifact-no-autoreact"], null, void 0, e));
}
//@ chunk-mbd4s9s4.js:1466-1825 placement
function getWatchArtifactNoAutoreact(a) {
  let e = getReplConfigArgv(),
    r;
  for (let t = 0; t < e.length; t++) {
    let n = e[t];
    if (n === "--watch-artifact" && e[t + 1] !== void 0) r = e[t + 1].toLowerCase();
    else if (n.startsWith("--watch-artifact=")) r = n.slice(17).toLowerCase();
  }
  if (r === void 0) return !1;
  return (
    setReplConfigArgv([...stripWatchArtifactArgs(getReplConfigArgv()), "--watch-artifact-no-autoreact", r]),
    syncRespawnFlag("--watch-artifact-no-autoreact", ["--watch-artifact"], r, void 0, a),
    !0
  );
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
