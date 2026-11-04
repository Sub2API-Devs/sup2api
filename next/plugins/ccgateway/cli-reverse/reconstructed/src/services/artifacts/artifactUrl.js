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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function classifyClaudeAiPath(parts) {
  let [family, sub, rest] = parts;
  if (family === undefined) return "other";
  if (family === "artifact") return sub === undefined ? "artifact_bare" : "artifact";
  if (family === "artifacts")
    return sub === undefined || sub === "design" ? "artifacts_gallery" : "chat_artifact";
  if (family === "public" && sub === "artifacts") return "chat_artifact";
  if (family === "code") {
    if (sub === "artifact" || sub === "frame") return rest === undefined ? "artifact_bare" : "artifact";
    if (sub === "artifacts") return "artifacts_gallery";
    return sub === undefined ? "other" : "code_session";
  }
  if (family === "epitaxy") {
    if (sub === "artifact") return "epitaxy_artifact";
    return sub === undefined ? "other" : "epitaxy";
  }
  let urlFamily = Object.hasOwn(CLAUDE_AI_URL_FAMILIES, family) ? CLAUDE_AI_URL_FAMILIES[family] : undefined;
  if (urlFamily === undefined || (urlFamily.needsId && sub === undefined)) return "other";
  return urlFamily.family;
}
//@ chunk-jv307fw4.js:2856-3186 placement
/**
 * 解析 claude.ai 链接，识别 artifact/frame 参数、环境与链接族（chat/share/project/design…）。
 */
function parseArtifactUrl(input) {
  let canonical = canonicalizeArtifactUrlInput(input);
  let env = claudeAiWebEnvOf(canonical);
  if (env === null) return null;
  let url;
  try {
    url = new URL(canonical);
  } catch {
    return null;
  }
  let artifactParam = url.searchParams.get("artifact") || url.searchParams.get("frame");
  let out = null;
  if (artifactParam !== null) {
    let lower = artifactParam.toLowerCase();
    out = ARTIFACT_SLUG_RE.test(lower) ? lower : decodeBase58Uuid(artifactParam);
  }
  return {
    family: classifyClaudeAiPath(url.pathname.split("/").filter((segment) => segment !== "")),
    env,
    artifact:
      out === null
        ? null
        : {
            slug: out,
          },
  };
}
//@ chunk-jv307fw4.js:3186-4752 placement
/**
 * 用户传入的不是 artifact URL 时，生成说明（是哪种 claude.ai 链接、该如何改用 artifact 自身 URL）。
 */
function explainNonArtifactUrl(input, options = {}) {
  let lead = `not an artifact URL: ${input} \u2014`;
  let artifactUrl = parseArtifactUrl(input);
  let familyName = artifactUrl === null ? undefined : FAMILY_DISPLAY_NAMES[artifactUrl.family];
  if (artifactUrl !== null && familyName !== undefined && artifactUrl.artifact !== null) {
    let viewerUrl = artifactViewerUrlFor({
      slug: artifactUrl.artifact.slug,
      env: artifactUrl.env,
    });
    return `${lead} that is a claude.ai ${familyName} link; pass the artifact's own URL (${viewerUrl}) as \`${options.field ?? "url"}\`.`;
  }
  if (artifactUrl?.family === "design") {
    let toolHint = options.designToolName === undefined ? "" : `; use the ${options.designToolName} tool`;
    return `${lead} that is a Claude Design link, which the ${ARTIFACT_TOOL_NAME} tool cannot open${toolHint}.`;
  }
  if (
    artifactUrl?.family === "chat_artifact" ||
    /^https:\/\/(?:www\.)?claude\.site(?:[/?#]|$)/.test(canonicalizeArtifactUrlInput(input.trim()))
  )
    return `${lead} that is an artifact from a claude.ai chat (the chat's artifact panel or its public page), which is separate from artifacts published with this tool and has no ${artifactLinkShapeHint()} link, so this tool cannot read it. If the user wants its content used here, ask them to paste it or save it to a file in this session; if they meant one of their published artifacts, action: "list" shows those.`;
  if (familyName !== undefined)
    return `${lead} that is a claude.ai ${familyName} link, not a published artifact, and this tool cannot read a ${familyName}. If the user meant an artifact shown in that ${familyName}, ask them for the artifact's own ${artifactLinkShapeHint()} link or find it with action: "list"; otherwise ask them to paste the content they want used.`;
  let trimmed = input.trim();
  let slugOk = ARTIFACT_SLUG_RE.test(trimmed.toLowerCase())
    ? trimmed.toLowerCase()
    : decodeBase58Uuid(trimmed);
  if (artifactUrl === null && slugOk !== null)
    return `${lead} that looks like an artifact id on its own; if it is one, pass the full link ${artifactViewerUrlFor(
      {
        slug: slugOk,
        env: claudeAiEnvironment(),
      },
    )} as \`${options.field ?? "url"}\`.`;
  return `${lead} pass the artifact's ${artifactLinkShapeHint()} link (action: "list" shows them).`;
}
//@ chunk-jv307fw4.js:4841-5012 placement
async function readExactBytes(stream, length) {
  let buffer = Buffer.alloc(length + 1);
  let offset = 0;
  while (offset < buffer.length) {
    let { bytesRead } = await stream.read(buffer, offset, buffer.length - offset, offset);
    if (bytesRead === 0) break;
    offset += bytesRead;
  }
  return offset === length ? buffer.subarray(0, length) : null;
}
//@ chunk-jv307fw4.js:5143-5186 placement
function isProtectedPath(path) {
  return isNonWslUncPath(path) || isNetworkMountPath(path) || classifyHomeMount(path);
}
//@ chunk-jv307fw4.js:5186-5270 placement
function pathTouchesProtected(url) {
  if (isProtectedPath(url)) return true;
  let { paths, vetted } = getPathsForNetworkScreen(url);
  return !vetted || paths.some(isProtectedPath);
}
//@ chunk-jv307fw4.js:5270-5312 placement
function classifyArtifactUrl(url) {
  return isNonWslUncPath(url) || isNetworkMountPath(url) || classifyHomeMount(url);
}
//@ chunk-jv307fw4.js:5312-5349 placement
/**
 * 发布路径长度上限 512 与单个 URL 段 255 字符。
 */
var MAX_PUBLISHED_PATH_LENGTH; // deferred: uses XML_CONTENT_TYPES (./publishInstanceFiles.js) of its import cycle while loading; runs once the cycle is complete
var MAX_URL_SEGMENT_CHARS;
var MAX_VERSION_INDEX;
var MAX_SEGMENT_WITH_SLASH;
deferInit("chunk-jv307fw4.js:5312", () => {
  MAX_PUBLISHED_PATH_LENGTH = 512;
  MAX_URL_SEGMENT_CHARS = 255;
  MAX_VERSION_INDEX = VERSION_MAX_ENTRIES - 1;
  MAX_SEGMENT_WITH_SLASH = MAX_URL_SEGMENT_CHARS + 1;
});
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
