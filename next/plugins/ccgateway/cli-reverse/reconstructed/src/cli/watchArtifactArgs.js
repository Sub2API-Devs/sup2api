/**
 * cli/watchArtifactArgs.ts
 *
 * 2.1.316 新增：--watch-artifact 参数解析与待处理 artifact 关注状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3dr5qarj.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { claudeAiEnvironment } from "../constants/claudeAiOrigin.js";
import { decodeBase58Uuid } from "../utils/messages.js";
import { artifactViewerUrlFor } from "../tools/ArtifactTool/artifactUrls.js";
import { ARTIFACT_SLUG_RE, parseArtifactUrlAnyCase } from "../tools/ArtifactTool/constants.js";
import { getReplConfigArgv, setReplConfigArgv } from "../bootstrap/state.js";
import { syncRespawnFlag } from "../services/daemon/jobState.js";

//@ chunk-3dr5qarj.js:316-752 placement
/**
 * 解析 --watch-artifact 的值（artifact id 或 claude.ai URL），校验与当前登录环境一致。
 */
function parseWatchArtifactArg(arg) {
  let trimmed = arg.trim();
  let env = claudeAiEnvironment();
  let uuid = decodeBase58Uuid(trimmed);
  if (uuid !== null)
    return {
      slug: uuid,
      url: artifactViewerUrlFor({
        slug: uuid,
        env,
      }),
    };
  let lower = trimmed.toLowerCase();
  if (ARTIFACT_SLUG_RE.test(lower))
    return {
      slug: lower,
      url: artifactViewerUrlFor({
        slug: lower,
        env,
      }),
    };
  let artifactUrlAnyCase = parseArtifactUrlAnyCase(trimmed);
  if (artifactUrlAnyCase === null)
    return {
      error: "Error: --watch-artifact expects an artifact id or a claude.ai artifact URL",
    };
  if (artifactUrlAnyCase.env !== env)
    return {
      error: `Error: --watch-artifact got a ${artifactUrlAnyCase.env} artifact URL, but this session is signed in to ${env}`,
    };
  return {
    slug: artifactUrlAnyCase.slug,
    url: artifactViewerUrlFor(artifactUrlAnyCase),
  };
}
//@ chunk-3dr5qarj.js:752-763 placement
var pendingWatchArtifact = null;
//@ chunk-3dr5qarj.js:763-783 placement
function setPendingWatchArtifact(value) {
  pendingWatchArtifact = value;
}
//@ chunk-3dr5qarj.js:783-822 placement
function takePendingWatchArtifact() {
  let pending = pendingWatchArtifact;
  pendingWatchArtifact = null;
  return pending;
}
//@ chunk-3dr5qarj.js:822-846 placement
function peekPendingWatchArtifact() {
  return pendingWatchArtifact;
}
//@ chunk-3dr5qarj.js:846-1100 placement
function stripWatchArtifactArgs(replConfigArgv) {
  let kept = [];
  for (let i = 0; i < replConfigArgv.length; i++) {
    let arg = replConfigArgv[i];
    if (arg === "--watch-artifact" || arg === "--watch-artifact-no-autoreact") {
      i++;
      continue;
    }
    if (arg.startsWith("--watch-artifact=") || arg.startsWith("--watch-artifact-no-autoreact=")) continue;
    kept.push(arg);
  }
  return kept;
}
//@ chunk-3dr5qarj.js:1100-1466 placement
function hasWatchArtifactArg(argv, storageV5) {
  argv = argv.toLowerCase();
  let flagNames = ["--watch-artifact", "--watch-artifact-no-autoreact"];
  let replConfigArgv = getReplConfigArgv();
  let rest = [];
  let found = false;
  for (let index = 0; index < replConfigArgv.length; index++) {
    let arg = replConfigArgv[index];
    if (
      flagNames.some(
        (value) =>
          (arg === value && replConfigArgv[index + 1]?.toLowerCase() === argv) ||
          arg.toLowerCase() === `${value}=${argv}`,
      )
    ) {
      if (arg.indexOf("=") === -1) index++;
      found = true;
      continue;
    }
    rest.push(arg);
  }
  if (found) {
    setReplConfigArgv(rest);
    syncRespawnFlag("--watch-artifact", ["--watch-artifact-no-autoreact"], null, undefined, storageV5);
  }
}
//@ chunk-3dr5qarj.js:1466-1825 placement
function getWatchArtifactNoAutoreact(storageV5) {
  let replConfigArgv = getReplConfigArgv();
  let flag;
  for (let i = 0; i < replConfigArgv.length; i++) {
    let arg = replConfigArgv[i];
    if (arg === "--watch-artifact" && replConfigArgv[i + 1] !== undefined)
      flag = replConfigArgv[i + 1].toLowerCase();
    else if (arg.startsWith("--watch-artifact=")) flag = arg.slice(17).toLowerCase();
  }
  if (flag === undefined) return false;
  setReplConfigArgv([...stripWatchArtifactArgs(getReplConfigArgv()), "--watch-artifact-no-autoreact", flag]);
  syncRespawnFlag("--watch-artifact-no-autoreact", ["--watch-artifact"], flag, undefined, storageV5);
  return true;
}
export {
  getWatchArtifactNoAutoreact,
  parseWatchArtifactArg,
  setPendingWatchArtifact,
  stripWatchArtifactArgs,
  peekPendingWatchArtifact,
  takePendingWatchArtifact,
  hasWatchArtifactArg,
};
