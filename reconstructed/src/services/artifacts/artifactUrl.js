/**
 * services/artifacts/artifactUrl.ts
 *
 * 2.1.316 新增：claude.ai 链接解析与非 artifact 链接的说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jv307fw4.js (9)
 * attribution: placement 9
 */
import {
  canonicalizeArtifactUrlInput,
  claudeAiWebEnvOf,
  ARTIFACT_SLUG_RE,
  ARTIFACT_TOOL_NAME,
  artifactLinkShapeHint,
} from "../../tools/ArtifactTool/constants.js";
import { decodeBase58Uuid } from "../../utils/messages.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { isNonWslUncPath, isNetworkMountPath, classifyHomeMount } from "../../utils/networkPaths.js";
import { getPathsForNetworkScreen } from "../../utils/fsOperations.js";
import { VERSION_MAX_ENTRIES } from "./publishInstanceFiles.js";

//@ chunk-jv307fw4.js:1750-2215 placement
/**
 * claude.ai 链接族的分类表：chat/share/task/cowork/project/design/settings/api 各自是否需要 id，以及族到展示名的映射。
 */
var CLAUDE_AI_URL_FAMILIES = {
  chat: {
    family: "chat",
    needsId: true,
  },
  share: {
    family: "share",
    needsId: true,
  },
  task: {
    family: "task",
    needsId: true,
  },
  cowork: {
    family: "cowork",
    needsId: true,
  },
  "cowork-artifact": {
    family: "cowork_artifact",
    needsId: true,
  },
  project: {
    family: "project",
    needsId: true,
  },
  design: {
    family: "design",
    needsId: false,
  },
  settings: {
    family: "settings",
    needsId: false,
  },
  api: {
    family: "api",
    needsId: false,
  },
};
var FAMILY_DISPLAY_NAMES = {
  chat: "chat",
  share: "shared chat",
  task: "task",
  cowork: "task",
  code_session: "session",
  epitaxy: "session",
  project: "project",
};
//@ chunk-jv307fw4.js:2215-2856 placement
function classifyClaudeAiPath(e) {
  let [n, r, s] = e;
  if (n === undefined) return "other";
  if (n === "artifact") return r === undefined ? "artifact_bare" : "artifact";
  if (n === "artifacts") return r === undefined || r === "design" ? "artifacts_gallery" : "chat_artifact";
  if (n === "public" && r === "artifacts") return "chat_artifact";
  if (n === "code") {
    if (r === "artifact" || r === "frame") return s === undefined ? "artifact_bare" : "artifact";
    if (r === "artifacts") return "artifacts_gallery";
    return r === undefined ? "other" : "code_session";
  }
  if (n === "epitaxy") {
    if (r === "artifact") return "epitaxy_artifact";
    return r === undefined ? "other" : "epitaxy";
  }
  let a = Object.hasOwn(CLAUDE_AI_URL_FAMILIES, n) ? CLAUDE_AI_URL_FAMILIES[n] : undefined;
  if (a === undefined || (a.needsId && r === undefined)) return "other";
  return a.family;
}
//@ chunk-jv307fw4.js:2856-3186 placement
/**
 * 解析 claude.ai 链接，识别 artifact/frame 参数、环境与链接族（chat/share/project/design…）。
 */
function parseArtifactUrl(e) {
  let n = canonicalizeArtifactUrlInput(e);
  let r = claudeAiWebEnvOf(n);
  if (r === null) return null;
  let s;
  try {
    s = new URL(n);
  } catch {
    return null;
  }
  let a = s.searchParams.get("artifact") || s.searchParams.get("frame");
  let l = null;
  if (a !== null) {
    let lower = a.toLowerCase();
    l = ARTIFACT_SLUG_RE.test(lower) ? lower : decodeBase58Uuid(a);
  }
  return {
    family: classifyClaudeAiPath(s.pathname.split("/").filter((d) => d !== "")),
    env: r,
    artifact:
      l === null
        ? null
        : {
            slug: l,
          },
  };
}
//@ chunk-jv307fw4.js:3186-4752 placement
/**
 * 用户传入的不是 artifact URL 时，生成说明（是哪种 claude.ai 链接、该如何改用 artifact 自身 URL）。
 */
function explainNonArtifactUrl(e, n = {}) {
  let r = `not an artifact URL: ${e} \u2014`;
  let artifactUrl = parseArtifactUrl(e);
  let a = artifactUrl === null ? undefined : FAMILY_DISPLAY_NAMES[artifactUrl.family];
  if (artifactUrl !== null && a !== undefined && artifactUrl.artifact !== null) {
    let b = artifactViewerUrlFor({
      slug: artifactUrl.artifact.slug,
      env: artifactUrl.env,
    });
    return `${r} that is a claude.ai ${a} link; pass the artifact's own URL (${b}) as \`${n.field ?? "url"}\`.`;
  }
  if (artifactUrl?.family === "design") {
    let b = n.designToolName === undefined ? "" : `; use the ${n.designToolName} tool`;
    return `${r} that is a Claude Design link, which the ${ARTIFACT_TOOL_NAME} tool cannot open${b}.`;
  }
  if (
    artifactUrl?.family === "chat_artifact" ||
    /^https:\/\/(?:www\.)?claude\.site(?:[/?#]|$)/.test(canonicalizeArtifactUrlInput(e.trim()))
  )
    return `${r} that is an artifact from a claude.ai chat (the chat's artifact panel or its public page), which is separate from artifacts published with this tool and has no ${artifactLinkShapeHint()} link, so this tool cannot read it. If the user wants its content used here, ask them to paste it or save it to a file in this session; if they meant one of their published artifacts, action: "list" shows those.`;
  if (a !== undefined)
    return `${r} that is a claude.ai ${a} link, not a published artifact, and this tool cannot read a ${a}. If the user meant an artifact shown in that ${a}, ask them for the artifact's own ${artifactLinkShapeHint()} link or find it with action: "list"; otherwise ask them to paste the content they want used.`;
  let trimmed = e.trim();
  let h = ARTIFACT_SLUG_RE.test(trimmed.toLowerCase()) ? trimmed.toLowerCase() : decodeBase58Uuid(trimmed);
  if (artifactUrl === null && h !== null)
    return `${r} that looks like an artifact id on its own; if it is one, pass the full link ${artifactViewerUrlFor(
      {
        slug: h,
        env: claudeAiEnvironment(),
      },
    )} as \`${n.field ?? "url"}\`.`;
  return `${r} pass the artifact's ${artifactLinkShapeHint()} link (action: "list" shows them).`;
}
//@ chunk-jv307fw4.js:4841-5012 placement
async function readExactBytes(e, n) {
  let r = Buffer.alloc(n + 1);
  let s = 0;
  while (s < r.length) {
    let { bytesRead } = await e.read(r, s, r.length - s, s);
    if (bytesRead === 0) break;
    s += bytesRead;
  }
  return s === n ? r.subarray(0, n) : null;
}
//@ chunk-jv307fw4.js:5143-5186 placement
function isProtectedPath(e) {
  return isNonWslUncPath(e) || isNetworkMountPath(e) || classifyHomeMount(e);
}
//@ chunk-jv307fw4.js:5186-5270 placement
function pathTouchesProtected(e) {
  if (isProtectedPath(e)) return true;
  let { paths, vetted } = getPathsForNetworkScreen(e);
  return !vetted || paths.some(isProtectedPath);
}
//@ chunk-jv307fw4.js:5270-5312 placement
function classifyArtifactUrl(e) {
  return isNonWslUncPath(e) || isNetworkMountPath(e) || classifyHomeMount(e);
}
//@ chunk-jv307fw4.js:5312-5349 placement
/**
 * 发布路径长度上限 512 与单个 URL 段 255 字符。
 */
var MAX_PUBLISHED_PATH_LENGTH = 512;
var MAX_URL_SEGMENT_CHARS = 255;
var MAX_VERSION_INDEX = VERSION_MAX_ENTRIES - 1;
var MAX_SEGMENT_WITH_SLASH = MAX_URL_SEGMENT_CHARS + 1;
export {
  MAX_PUBLISHED_PATH_LENGTH,
  MAX_URL_SEGMENT_CHARS,
  MAX_SEGMENT_WITH_SLASH,
  pathTouchesProtected,
  readExactBytes,
  isProtectedPath,
  parseArtifactUrl,
  MAX_VERSION_INDEX,
  explainNonArtifactUrl,
  classifyArtifactUrl,
};
