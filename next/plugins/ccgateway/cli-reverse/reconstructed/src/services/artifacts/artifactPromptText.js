/**
 * services/artifacts/artifactPromptText.ts
 *
 * 2.1.316 新增：Artifact 相关提示词文本：各种类文件布局、编辑与发布步骤、addon 动词说明。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-95pbtx8d.js (39)
 * attribution: placement 39
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { fetchBoot } from "./boot.js";
import { frameApi } from "./frameRelay.js";
import { buildFrameHeaders } from "./frameApi.js";
import { isCancel } from "../../../vendor/axios/dist/esm/axios.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { jsonStringifyRaw, jsonStringify } from "../../utils/slowOperations.js";
import { isArtifactCommentsEnabled } from "./comments/commentsGate.js";
import { isArtifactDbEnabled, isArtifactDbStrReplaceEnabled } from "./artifactDb.js";
import { isArtifactPreviewEnabled } from "../artifactPreview/browserDiscovery.js";
import { isArtifactToolsetSplit, isArtifactToolRegistered } from "./artifactToolGates.js";
import {
  getArtifactPublishStubDir,
  ARTIFACT_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_CHECK_TOOL_NAME,
} from "../../tools/ArtifactTool/constants.js";
import { isLegacyArtifactAction, ADDON_OF_LEGACY_ACTION, DB_WRITE_OPS } from "./artifactToolActions.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { capitalize } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-95pbtx8d.js:1732-1850 placement
/**
 * Artifact 校验（verify，读查看者运行时诊断）是否开启：远程环境下关闭；否则看 CLAUDE_CODE_ARTIFACT_VERIFY，未设置时看 tengu_osier_pylon_trace 开关。
 */
function isArtifactVerifyEnabled() {
  if (env.CLAUDE_CODE_REMOTE) return false;
  return (
    env.CLAUDE_CODE_ARTIFACT_VERIFY ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_osier_pylon_trace", false)
  );
}
//@ chunk-95pbtx8d.js:1850-1863 placement
var MAX_CONTENT_HALF_BYTES = 65536;
//@ chunk-95pbtx8d.js:1863-3149 placement
async function readArtifactDiagnostics(artifact, signal, credentials) {
  let boot = await fetchBoot(
    {
      slug: artifact.slug,
      env: artifact.env,
    },
    "artifact_verify_read",
    signal,
    {
      credentials,
    },
  );
  if (boot.err !== null)
    return {
      err: boot.err,
      ...(boot.status !== undefined && {
        status: boot.status,
      }),
    };
  let response;
  try {
    response = await frameApi.get(`/api/frame/diag/${artifact.slug}/${boot.ver}`, {
      refreshOAuth: true,
      credentials,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: 2 * MAX_CONTENT_HALF_BYTES,
      signal,
    });
  } catch (error) {
    if (isCancel(error)) throw error;
    logFeatureBad("artifact_verify_read", "diag_request_error");
    return {
      err: "artifact diagnostics read failed (network error)",
    };
  }
  if (!response.ok) {
    logFeatureBad("artifact_verify_read", response.reason.replace(/-/g, "_"));
    return {
      err: `artifact diagnostics unavailable: ${response.reason}`,
    };
  }
  if (response.status === 404) {
    logFeatureOk("artifact_verify_read");
    return {
      err: null,
      state: "no_row",
      ver: boot.ver,
    };
  }
  if (response.status < 200 || response.status >= 300) {
    logFeatureBad("artifact_verify_read", "diag_failed");
    return {
      err: `artifact diagnostics unavailable right now (HTTP ${response.status})`,
      status: response.status,
    };
  }
  let body = response.data ?? {};
  if (!Array.isArray(body.entries)) {
    logFeatureBad("artifact_verify_read", "diag_incomplete");
    return {
      err: "artifact diagnostics read failed: incomplete diagnostics response",
    };
  }
  let entries = body.entries;
  let lines = [];
  let count = 0;
  for (let entry of entries) {
    let item;
    try {
      item = Buffer.byteLength(jsonStringifyRaw(entry) ?? "", "utf8");
    } catch {
      continue;
    }
    if (count + item > MAX_CONTENT_HALF_BYTES) continue;
    lines.push(entry);
    count += item;
  }
  logFeatureOk("artifact_verify_read");
  return {
    err: null,
    state: "loaded",
    ver: boot.ver,
    entries: lines,
    truncated: body.truncated === true,
    dropped: entries.length - lines.length,
  };
}
//@ chunk-95pbtx8d.js:3149-3259 placement
function isAddonEnabled(action) {
  switch (action) {
    case "comments":
      return isArtifactCommentsEnabled();
    case "data":
      return isArtifactDbEnabled();
    case "check":
      return isArtifactVerifyEnabled() || isArtifactPreviewEnabled();
  }
}
//@ chunk-95pbtx8d.js:3259-3313 placement
/**
 * 导出函数 `hasArtifactAddon`：参数 e，返回 ( isArtifactToolsetSplit() && isArtifactToolRegistered() && getArtifactPublishStubDir() === null && isAddonEna…。
 */
function hasArtifactAddon(action) {
  return (
    isArtifactToolsetSplit() &&
    isArtifactToolRegistered() &&
    getArtifactPublishStubDir() === null &&
    isAddonEnabled(action)
  );
}
//@ chunk-95pbtx8d.js:3313-3440 placement
function isLegacyVerbOffered(verb) {
  if (!isLegacyArtifactAction(verb)) return false;
  if (!hasArtifactAddon(ADDON_OF_LEGACY_ACTION[verb])) return false;
  if (verb === "verify") return isArtifactVerifyEnabled();
  if (verb === "preview") return isArtifactPreviewEnabled();
  return true;
}
//@ chunk-95pbtx8d.js:3440-3522 placement
function frozenDbStrReplace() {
  let liveState = getLiveState();
  liveState.frozenDbStrReplace ??= isArtifactDbStrReplaceEnabled();
  return liveState.frozenDbStrReplace;
}
//@ chunk-95pbtx8d.js:3522-4296 placement
/**
 * 说明某个 addon 的旧动作在拆分后工具集里的写法（read_db/write_db → ArtifactData、watch/status/unwatch → ArtifactComments、verify/preview → ArtifactCheck）。
 */
function describeAddonSpelling(spelling) {
  switch (spelling) {
    case "data":
      return `the \`${ARTIFACT_TOOL_NAME}\` tool's \`action: "read_db"\` / \`"write_db"\` with a \`db_op\` are the \`${ARTIFACT_DATA_TOOL_NAME}\` tool, whose \`action\` is that \`db_op\` ("get", "list", "query", "set", "update",${frozenDbStrReplace() ? ' "str_replace",' : ""} "delete", "batch") with the other fields unchanged`;
    case "comments":
      return `the \`${ARTIFACT_TOOL_NAME}\` tool's \`action: "watch"\` / \`"status"\` / \`"unwatch"\` and its comment verbs are the \`${ARTIFACT_COMMENTS_TOOL_NAME}\` tool (\`action: "watch"\` with the \`url\`; with no \`url\` it lists this session's watches; \`on: false\` stops one; \`"comments"\` is its \`action: "read"\`)`;
    case "check": {
      let filtered = ["verify", "preview"].filter(isLegacyVerbOffered);
      return `the \`${ARTIFACT_TOOL_NAME}\` tool's ${filtered.map((action) => `\`action: "${action}"\``).join(" / ")} ${filtered.length === 1 ? "is" : "are"} the \`${ARTIFACT_CHECK_TOOL_NAME}\` tool's`;
    }
  }
}
//@ chunk-95pbtx8d.js:4296-4546 placement
/**
 * 工具集拆分时生成"本会话的工具写法"提示行：列出相关 addon 旧动作对应的新工具，并提醒首次使用时用 ToolSearch 加载；未拆分或没有启用的 addon 时返回空串。
 */
function buildToolSpellingNote(toolName, fallback = "Read the steps below with that substitution.") {
  if (!isArtifactToolsetSplit()) return "";
  let filtered = toolName.filter(hasArtifactAddon);
  if (filtered.length === 0) return "";
  return `> Tool spelling in this session: ${filtered.map(describeAddonSpelling).join("; ")} \u2014 load it with ${TOOL_SEARCH_TOOL_NAME} when you first need it. ${fallback}

`;
}
//@ chunk-95pbtx8d.js:4546-4823 placement
/**
 * 识别文本中旧 Artifact 动作引用的正则：action: "<动作>" 形式或数据库子操作名、ArtifactData 工具名、其他 addon 关键字。
 */
var ADDON_ORDER; // deferred: uses ADVANCED_ACTIONS (./artifactToolActions.js) of its import cycle while loading; runs once the cycle is complete
var LEGACY_VERBS;
var DATA_LEGACY_VERBS;
var LEGACY_ACTION_RE;
var DATA_TOOL_NAME_RE;
var ADDON_KEYWORD_RE;
deferInit("chunk-95pbtx8d.js:4546", () => {
  ADDON_ORDER = ["data", "comments", "check"];
  LEGACY_VERBS = Object.keys(ADDON_OF_LEGACY_ACTION);
  DATA_LEGACY_VERBS = LEGACY_VERBS.filter((verb) => ADDON_OF_LEGACY_ACTION[verb] === "data");
  LEGACY_ACTION_RE = new RegExp(
    `\\baction["'\`]?\\s*:\\s*["'\`](${LEGACY_VERBS.join("|")})["'\`]|["'\`](${DATA_LEGACY_VERBS.join("|")})["'\`]`,
    "g",
  );
  DATA_TOOL_NAME_RE = new RegExp(`["'\`]${ARTIFACT_DATA_TOOL_NAME}["'\`]`);
  ADDON_KEYWORD_RE = new RegExp(`["'\`](${DB_WRITE_OPS.join("|")})["'\`]`);
});
//@ chunk-95pbtx8d.js:4823-4893 placement
function usesWriteDb(text) {
  return (
    referencedAddonActions(text).has("write_db") ||
    (DATA_TOOL_NAME_RE.test(text) && ADDON_KEYWORD_RE.test(text))
  );
}
//@ chunk-95pbtx8d.js:4893-5009 placement
function referencedAddonActions(text) {
  let actions = new Set();
  for (let match of text.matchAll(LEGACY_ACTION_RE)) {
    let action = match[1] ?? match[2];
    if (action !== undefined && isLegacyArtifactAction(action)) actions.add(action);
  }
  return actions;
}
//@ chunk-95pbtx8d.js:5009-5209 placement
/**
 * 找出一段文本（如类型说明）引用到的旧 Artifact 动作，为其中仍提供的 addon 生成工具写法提示。
 */
function buildSpellingNoteForText(text) {
  if (!isArtifactToolsetSplit()) return "";
  let addons = new Set();
  for (let action of referencedAddonActions(text))
    if (isLegacyVerbOffered(action)) addons.add(ADDON_OF_LEGACY_ACTION[action]);
  return buildToolSpellingNote(
    ADDON_ORDER.filter((addon) => addons.has(addon)),
    "Where the text below names those calls, that is the spelling it means.",
  );
}
//@ chunk-95pbtx8d.js:5209-5286 placement
class ArtifactGatesSlot {
  gates = () => ({
    dbVerbsOn: false,
    runScriptOn: false,
  });
  register(gates) {
    this.gates = gates;
  }
}
//@ chunk-95pbtx8d.js:5286-5301 placement
/**
 * 导出常量或表 `artifactGatesSlot`：值为 new xe()。
 */
var artifactGatesSlot; // deferred: uses ArtifactGatesSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-95pbtx8d.js:5286", () => {
  artifactGatesSlot = new ArtifactGatesSlot();
});
//@ chunk-95pbtx8d.js:5301-5388 placement
/**
 * 导出函数 `storeRouteMode`：返回 getStoreRoute(s && dbVerbsOn, s && runScriptOn)。
 */
function storeRouteMode() {
  let { dbVerbsOn, runScriptOn } = artifactGatesSlot.gates();
  let registered = isArtifactToolRegistered();
  return getStoreRoute(registered && dbVerbsOn, registered && runScriptOn);
}
//@ chunk-95pbtx8d.js:5388-5490 placement
/**
 * 决定 artifact 存储内容走哪条路径：ArtifactData 工具可用为 data；未拆分且支持数据库为 write_db；否则能跑脚本为 run_script，都不行为 null。
 */
function getStoreRoute(typeSlug, options) {
  if (hasArtifactAddon("data")) return "data";
  if (!isArtifactToolsetSplit() && typeSlug) return "write_db";
  return options ? "run_script" : null;
}
//@ chunk-95pbtx8d.js:5490-9810 placement
/**
 * Artifact 种类（slides、design、migrated-design…）的文件布局说明：索引文件、每页文件、资源保存方式。
 */
var ARTIFACT_KIND_LAYOUTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-95pbtx8d.js:5490", () => {
  ARTIFACT_KIND_LAYOUTS = new Map([
    [
      "slides",
      {
        index: "project/deck.json",
        files:
          "one `project/slides/<id>.html` per slide, <id> being its entry in the index's `order`, each holding exactly one `<section id=\"<id>\">` in the slide format with, as that section's last child, one `<aside>` of plain-text speaker notes when the slide has any",
        filesInBrief: "one file per slide",
        uploads:
          " Images and font files stay uploaded assets, as the instructions say; a design system's `tokens.json`, where one is used, goes in as a file the way their reference for a deck kept as files says (`project/ds/<folder>/tokens.json` plus a record in the index's `designSystems` list).",
        indexKeys:
          '`"v": 4`, `title`, `order`: the slide ids in deck order, `sections`: the outline (an id \u2192 `{"description", "start": <slide id>}`), and `faces`: one entry per typeface, keyed by family-id (`{"family"}` plus a Google Fonts `href` or an uploaded `src`)',
        storeDocs:
          "`deck/meta`, `deck/design-systems`, `fonts/<family-id>`, `slides/<id>` or `notes/<id>` store documents",
        alsoAside:
          " about a store deck owning no files, about not creating `project/deck.json`, and about speaker notes going in `notes/<id>` rather than the slide's file (if their slide-file check rejects the `<aside>`, keep the `<aside>` anyway: that check predates notes in slide files)",
        indexEdits: "retitle the deck, reorder, add or remove slides, or change its sections or faces",
        firstPublish: {
          indexHolds: "its `order` already naming every slide you are about to write",
          first: "the cover slide's file",
          written: "those two",
          firstSent: "the cover slide's file by its `project/\u2026` path",
          firstInBrief: "the cover slide",
          rest: "the remaining slides",
          restInBrief: "the other slides",
          onlyOne: "a one-slide deck",
        },
      },
    ],
    [
      "design",
      {
        index: "project/canvas.json",
        files:
          "one `project/<name>` per artboard (`project/Main.dc.html`), <name> being its key in the index's `boards`, each holding that artboard's whole `.dc.html` source, and any support file an artboard links to by a relative path under `project/` beside it",
        filesInBrief: "one file per artboard",
        uploads:
          " Images and font files that no artboard links to by a relative path stay uploaded assets, as the instructions say; a design system, where one is used, goes in as files under `project/ds/<folder>/` plus a record in the index's `designSystems` list, the way their reference on design-system components says for a canvas kept as files.",
        indexKeys:
          '`"v": 3`, `title`, `boards`: one entry per artboard, keyed by its file name, holding its frame on the canvas (`x`, `y`, `w`, `h` in CSS px) and its options, `order`: those names back to front, and `notes`, `pages` and `launch` when the canvas has them',
        storeDocs:
          "`design/meta`, `design/design-systems`, `boards/<fid>`, `notes/<id>` or `files/<fid>` store documents",
        alsoAside: " about only the editor writing `project/canvas.json`",
        indexEdits:
          "add, remove, reorder, move or resize an artboard, retitle the canvas, or change its notes, pages or launch",
        firstPublish: {
          indexHolds: "its `boards` and `order` already holding every artboard you are about to write",
          first:
            "the entry artboard, `project/Main.dc.html`, and any support file it links to by a relative path",
          written: "those",
          firstSent: "those files by their `project/\u2026` paths",
          firstInBrief: "the entry artboard",
          rest: "the remaining artboards and support files",
          restInBrief: "the other artboards",
          onlyOne: "a one-artboard canvas",
        },
      },
    ],
    [
      "design-system",
      {
        index: "project/design-system.json",
        files:
          "each file of the instructions' table at `project/<its path>` (`project/README.md`, `project/tokens.json`, `project/components/<Name>/README.md`, and so on; never the generated `tokens.css`, `api/` cards or `manifest.json`), icons and images staying uploaded assets recorded in the index under `assetGroups.<Group>.files.<name>`, all as that section lays it out",
        filesInBrief: "every file of its table",
        uploads: "",
        indexKeys:
          '`"v": 3`, `"layout": "files"`, `title`, and the other keys listed in the instructions\' section on a system kept in files (`namespace`, `libraries`, `assetGroups`, and so on)',
        storeDocs: "`ds/meta`, `ds/tokens` or one-document-per-file store collections",
        alsoAside: " about writing `ds/meta` first so the page waits on the store",
        indexEdits: "change one of the index's own keys (its title, libraries or an asset record)",
        firstPublish: null,
      },
    ],
  ]);
});
//@ chunk-95pbtx8d.js:9810-9854 placement
function isKnownArtifactKind(kind) {
  return kind !== undefined && ARTIFACT_KIND_LAYOUTS.has(kind);
}
//@ chunk-95pbtx8d.js:9854-9890 placement
var DESIGN_TYPE_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-95pbtx8d.js:9854", () => {
  DESIGN_TYPE_NAMES = new Set(["slides", "design"]);
});
//@ chunk-95pbtx8d.js:9890-9935 placement
/**
 * 导出函数 `isDesignType`：参数 e，返回 e !== void 0 && rt.has(e)。
 */
function isDesignType(kind) {
  return kind !== undefined && DESIGN_TYPE_NAMES.has(kind);
}
//@ chunk-95pbtx8d.js:9935-9971 placement
var MIGRATED_DESIGN_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-95pbtx8d.js:9935", () => {
  MIGRATED_DESIGN_TYPES = new Set(["migrated-design"]);
});
//@ chunk-95pbtx8d.js:9971-10016 placement
/**
 * 导出函数 `isMigratedDesignType`：参数 e，返回 e !== void 0 && it.has(e)。
 */
function isMigratedDesignType(kind) {
  return kind !== undefined && MIGRATED_DESIGN_TYPES.has(kind);
}
//@ chunk-95pbtx8d.js:10016-10073 placement
function artifactKindIndexFile(kind) {
  return kind === undefined ? undefined : ARTIFACT_KIND_LAYOUTS.get(kind)?.index;
}
//@ chunk-95pbtx8d.js:10073-10453 placement
/**
 * 生成"把每个改动文件保存在同一文件夹下对应路径，然后以 url/root/files 一次发布"的步骤文字。
 */
function buildRepublishFilesStep(url) {
  return `save each changed copy at its listed path under one folder in the working directory or your scratchpad directory, then publish with \`url\`: ${jsonStringify(url)}, \`root\`: that folder, \`file_path\`: the absolute path of one changed copy (not relative to \`root\`), and any other changed copies in \`files\` by their listed paths, so each is served at its listed path`;
}
//@ chunk-95pbtx8d.js:10453-10667 placement
function buildEditReadRule(read) {
  return `a file you wrote or read in this conversation and still see above is current until a publish is refused: edit it, no read first; read any other file you will change (${read}) before editing it.`;
}
//@ chunk-95pbtx8d.js:10667-10780 placement
var PUBLISH_REFUSED_HINT = "If a publish is refused, follow the refusal.";
var CREATED_ON_FILES_SNIPPET = '`"createdOnFiles": {"v": 1, "at": "<now, RFC 3339>"}`';
//@ chunk-95pbtx8d.js:10780-10901 placement
function describeNoStoreWrite(kind) {
  return kind === null
    ? "never write its store for its content"
    : `never write its store for its content (no ${kind})`;
}
//@ chunk-95pbtx8d.js:10901-11087 placement
function describeStoreDocsRedirect(layout, storeDescribed) {
  return storeDescribed
    ? ` Where the instructions below describe ${layout.storeDocs}, they mean this same content, which goes in these files instead; ignore what they say${layout.alsoAside}.`
    : "";
}
//@ chunk-95pbtx8d.js:11087-12359 placement
/**
 * 生成新 artifact 首次写文件并发布的步骤：所有文件写在同一文件夹下，按布局一次或分两次发布（先入口文件与 createdOnFiles，再其余文件）。
 */
function buildFirstPublishSteps(layout, url) {
  let layoutInfo = `\`url\`: ${jsonStringify(url)}, \`root\`: that folder, \`file_path\`: the absolute path of \`${layout.index}\` in it, \`files\`:`;
  let firstPublish = layout.firstPublish;
  if (firstPublish === null)
    return `Write the files at those relative paths under one folder in your scratchpad directory (or the working directory) and publish them in ONE call: ${layoutInfo} every other file by its \`project/\u2026\` path.`;
  return `Write the files at those relative paths under one folder in your scratchpad directory (or the working directory), each written directly with your file-writing tool (it creates the folders: no shell step first, never a script that generates the files), in this order: \`${layout.index}\` FIRST, complete, ${firstPublish.indexHolds} (and its \`designSystems\` record where a design system is used), then ${firstPublish.first}, and publish ${firstPublish.written} right away, in one call: ${layoutInfo} ${firstPublish.firstSent}, plus any design-system files. Then, without pausing for the user, write ${firstPublish.rest} and publish them with the same \`url\` and \`root\` \u2014 all in one more call, or a few files per call as you go (\`file_path\`: one new file's absolute path, \`files\`: the other new ones) \u2014 each call carrying only files no earlier call sent (each publish keeps the files earlier calls sent); ${firstPublish.onlyOne} is done after the first call.`;
}
//@ chunk-95pbtx8d.js:12359-12637 placement
function summarizeFirstPublish(summary) {
  let firstPublish = summary.firstPublish;
  return firstPublish === null
    ? `\`${summary.index}\` with its \`createdOnFiles\` object, and ${summary.filesInBrief}, in one publish`
    : `\`${summary.index}\` with its \`createdOnFiles\` object and ${firstPublish.firstInBrief} in a first publish, then ${firstPublish.restInBrief}, ${summary.filesInBrief}`;
}
//@ chunk-95pbtx8d.js:12637-13854 placement
/**
 * 说明这类新 artifact 把内容放在自己 project/ 下的文件里而不是存储：入口文件、文件说明与首次发布步骤。未知类型返回空串。
 */
function describeNewArtifactFiles(kind, url, routeInfo) {
  let layout = kind === undefined ? undefined : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (layout === undefined) return "";
  return `This type keeps a new Artifact's content in the Artifact's own files under \`project/\`${routeInfo.storeDescribed ? `, never in its store${routeInfo.storeCall === null ? "" : ` (no ${routeInfo.storeCall} for its content)`}` : ""}. The files: \`${layout.index}\`, the index, a JSON object with ${layout.indexKeys}, plus ${CREATED_ON_FILES_SNIPPET}; and ${layout.files}.${layout.uploads}${describeStoreDocsRedirect(layout, routeInfo.storeDescribed)} ${buildFirstPublishSteps(layout, url)} Later changes: ${routeInfo.pinned ? `${buildEditReadRule(routeInfo.read)} Publish only the changed files the same way (the same \`url\`; \`root\`: the folder that holds them at their served paths; \`file_path\`: one changed file's absolute path; \`files\`: the other changed ones); send the index only when you ${layout.indexEdits}, keeping every other key and its \`createdOnFiles\` object as you last wrote or read it. ${PUBLISH_REFUSED_HINT}` : `read each file you will change (${routeInfo.read}) and publish only those the same way (the same \`url\`; \`root\`: the folder that holds them at their served paths; \`file_path\`: one changed file's absolute path); send the index only when you ${layout.indexEdits}, keeping every other key and its \`createdOnFiles\` object as read.`} Never publish index.html, SKILL.md or anything under \`artifact-type/\`.`;
}
//@ chunk-95pbtx8d.js:13854-14147 placement
/**
 * 读完类型说明后追加的提醒：新 artifact 内容放在 project/ 文件里（而非类型说明里可能提到的存储文档）。
 */
function buildNewArtifactReminder(kind, url, saved) {
  let layout = kind === undefined ? undefined : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (layout === undefined || !saved) return "";
  return `

[Now that you have read the type's instructions: this new Artifact's content goes in files under \`project/\` as described before them (${summarizeFirstPublish(layout)}), not in any store document they may describe: ${describeNoStoreWrite(url)}.]`;
}
//@ chunk-95pbtx8d.js:14147-14882 placement
/**
 * 说明一个还没有自身文件的 artifact：已发布的都是类型文件；若可能有旧存储内容，说明如何读取后迁移到文件。
 */
function describeEmptyArtifact(kind, url, routeInfo) {
  let layout = kind === undefined ? undefined : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (layout === undefined) return "";
  let typeFilesNote = `every file published to it so far is the type's (${routeInfo.typeFiles})`;
  if (!routeInfo.olderStore)
    return `It is new and still empty \u2014 ${typeFilesNote} and it holds no content of its own, so there is no file or document of its own to list or read before writing. ${describeNewArtifactFiles(kind, url, routeInfo)}`;
  let storeRead = describeStoreReadCall(routeInfo.storeRoute);
  return `It has no file of its own yet \u2014 ${typeFilesNote}, so there is no file of its own to list or read before writing. ${describeNewArtifactFiles(kind, url, routeInfo)} If the user says this Artifact already has content, it may be in its older store, as ${layout.storeDocs}: ${storeRead === null ? "this session has no call that reads that store, so ask them what it held" : `read those first (${storeRead})`} and carry that into these files.`;
}
//@ chunk-95pbtx8d.js:14882-15093 placement
function describeStoreReadCall(storeRoute) {
  switch (storeRoute) {
    case "data":
      return `the \`${ARTIFACT_DATA_TOOL_NAME}\` tool, \`action: "list"\` or \`"get"\``;
    case "write_db":
      return '`action: "read_db"` with `db_op: "list"` or `"get"`';
    case "run_script":
    case null:
      return null;
  }
}
//@ chunk-95pbtx8d.js:15093-16796 placement
/**
 * 说明已有 artifact 的编辑流程：先列文件，内容在 project/ 下的文件里，入口文件是哪个，改完如何重新发布。
 */
function describeExistingArtifactFiles(kind, url, routeInfo) {
  let layout = kind === undefined ? undefined : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (layout === undefined) return "";
  return `List its files first, before any other call (${routeInfo.list}). This Artifact's content lives in its own files under \`project/\`${routeInfo.storeDescribed ? ", never in its store" : ""}: \`${layout.index}\` is the index, a JSON object with ${layout.indexKeys}, plus a \`createdOnFiles\` or \`convertedFrom\` object; and ${layout.files}.${describeStoreDocsRedirect(layout, routeInfo.storeDescribed)} ${routeInfo.ownFilesSeen ? `${capitalize(buildEditReadRule(routeInfo.read))} Then ${buildRepublishFilesStep(url)}. ${PUBLISH_REFUSED_HINT}` : `Read each file you will change (${routeInfo.read}) and ${buildRepublishFilesStep(url)}.`} Send the index only when you ${layout.indexEdits}, keeping every other key and its \`createdOnFiles\` or \`convertedFrom\` object as ${routeInfo.ownFilesSeen ? "you last wrote or read it" : "read"}${routeInfo.storeDescribed ? `; ${describeNoStoreWrite(routeInfo.storeCall)}${routeInfo.storeCall === null ? "" : " \u2014 reading what its old store holds, to see what was there, is fine"}. If no \`${layout.index}\` is listed, this Artifact has not been started on files: start it on files now as you would a new one, writing the index, with ${CREATED_ON_FILES_SNIPPET}, and every content file under one folder and publishing them to it in ONE call (\`url\`: ${jsonStringify(url)}, \`root\`: that folder, \`file_path\`: the index's absolute path, \`files\`: the rest by their \`project/\u2026\` paths), and tell the user whether its earlier content was carried over; from then on its page shows only those files, nothing from its old store` : `. If no \`${layout.index}\` is listed, this Artifact has no files content yet: write the index, with ${CREATED_ON_FILES_SNIPPET}, and every content file as for a new one, under one folder, and publish them to it in ONE call (\`url\`: ${jsonStringify(url)}, \`root\`: that folder, \`file_path\`: the index's absolute path, \`files\`: the rest by their \`project/\u2026\` paths)`}`;
}
//@ chunk-95pbtx8d.js:16796-17225 placement
/**
 * 读完类型说明后追加的提醒：此 artifact 内容在 project/ 文件里，先列文件，不要写存储文档。
 */
function buildExistingArtifactReminder(kind, url, saved, version) {
  let layout = kind === undefined ? undefined : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (layout === undefined || !saved) return "";
  return `

[Now that you have read the type's instructions: this Artifact's content lives in files under \`project/\` as described before them, not in any store document they may describe: list its files (${version.list}), then edit and publish them as described there, and if no \`${layout.index}\` is listed yet, start it on files as said there; ${describeNoStoreWrite(url)}.]`;
}
//@ chunk-95pbtx8d.js:17225-17377 placement
/**
 * 说明"写存储"的调用形式：ArtifactData 写入或 write_db 动作；脚本或无路由时为 null。
 */
function describeStoreWriteCall(call) {
  switch (call) {
    case "data":
      return `\`${ARTIFACT_DATA_TOOL_NAME}\` writes`;
    case "write_db":
      return '`action: "write_db"` calls';
    case "run_script":
    case null:
      return null;
  }
}
//@ chunk-95pbtx8d.js:17377-17597 placement
/**
 * 说明怎么写存储：用 ArtifactData 工具（未加载先用 ToolSearch）或 write_db 动作，传入该 artifact 的 url。
 */
function describeStoreWriteHow(call, options) {
  switch (call) {
    case "data":
      return `with the \`${ARTIFACT_DATA_TOOL_NAME}\` tool (load it with ${TOOL_SEARCH_TOOL_NAME} if it is not loaded yet), passing \`url\`: ${jsonStringify(options)}`;
    case "write_db":
      return `with \`action: "write_db"\`, passing \`url\`: ${jsonStringify(options)}`;
  }
}
export {
  hasArtifactAddon,
  isKnownArtifactKind,
  usesWriteDb,
  isMigratedDesignType,
  referencedAddonActions,
  getStoreRoute,
  describeNewArtifactFiles,
  describeStoreWriteCall,
  describeStoreWriteHow,
  buildNewArtifactReminder,
  readArtifactDiagnostics,
  isDesignType,
  buildSpellingNoteForText,
  isArtifactVerifyEnabled,
  artifactGatesSlot,
  buildToolSpellingNote,
  storeRouteMode,
  describeEmptyArtifact,
  describeExistingArtifactFiles,
  artifactKindIndexFile,
  buildRepublishFilesStep,
  buildExistingArtifactReminder,
};
