/**
 * services/artifacts/artifactPromptText.ts
 *
 * 2.1.316 新增：Artifact 相关提示词文本：各种类文件布局、编辑与发布步骤、addon 动词说明。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w08rdxhd.js (39)
 * attribution: placement 39
 */
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { fetchArtifactBootWithProbe } from "./boot.js";
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
import { P1t, ADDON_OF_LEGACY_ACTION, aNo } from "./artifactToolActions.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { capitalize } from "../../utils/stringUtils.js";

/**
 * Artifact 校验（verify，读查看者运行时诊断）是否开启：远程环境下关闭；否则看 CLAUDE_CODE_ARTIFACT_VERIFY，未设置时看 tengu_osier_pylon_trace 开关。
 */
//@ chunk-w08rdxhd.js:1698-1816 placement
function isArtifactVerifyEnabled() {
  if (env.CLAUDE_CODE_REMOTE) return !1;
  return (
    env.CLAUDE_CODE_ARTIFACT_VERIFY ?? getFeatureValue_CACHED_MAY_BE_STALE("tengu_osier_pylon_trace", !1)
  );
}
//@ chunk-w08rdxhd.js:1816-1829 placement
var Re = 65536;
//@ chunk-w08rdxhd.js:1829-3115 placement
async function readArtifactDiagnostics(e, r, s) {
  let n = await fetchArtifactBootWithProbe({ slug: e.slug, env: e.env }, "artifact_verify_read", r, {
    credentials: s,
  });
  if (n.err !== null) return { err: n.err, ...(n.status !== void 0 && { status: n.status }) };
  let a;
  try {
    a = await frameApi.get(`/api/frame/diag/${e.slug}/${n.ver}`, {
      refreshOAuth: !0,
      credentials: s,
      headers: buildFrameHeaders(),
      timeout: 15000,
      maxContentLength: 2 * Re,
      signal: r,
    });
  } catch (error) {
    if (isCancel(error)) throw error;
    return (
      logFeatureBad("artifact_verify_read", "diag_request_error"),
      { err: "artifact diagnostics read failed (network error)" }
    );
  }
  if (!a.ok)
    return (
      logFeatureBad("artifact_verify_read", a.reason.replace(/-/g, "_")),
      { err: `artifact diagnostics unavailable: ${a.reason}` }
    );
  if (a.status === 404)
    return (logFeatureOk("artifact_verify_read"), { err: null, state: "no_row", ver: n.ver });
  if (a.status < 200 || a.status >= 300)
    return (
      logFeatureBad("artifact_verify_read", "diag_failed"),
      { err: `artifact diagnostics unavailable right now (HTTP ${a.status})`, status: a.status }
    );
  let l = a.data ?? {};
  if (!Array.isArray(l.entries))
    return (
      logFeatureBad("artifact_verify_read", "diag_incomplete"),
      { err: "artifact diagnostics read failed: incomplete diagnostics response" }
    );
  let entries = l.entries,
    S = [],
    x = 0;
  for (let w of entries) {
    let k;
    try {
      k = Buffer.byteLength(jsonStringifyRaw(w) ?? "", "utf8");
    } catch {
      continue;
    }
    if (x + k > Re) continue;
    (S.push(w), (x += k));
  }
  return (
    logFeatureOk("artifact_verify_read"),
    {
      err: null,
      state: "loaded",
      ver: n.ver,
      entries: S,
      truncated: l.truncated === !0,
      dropped: entries.length - S.length,
    }
  );
}
//@ chunk-w08rdxhd.js:3115-3225 placement
function isAddonEnabled(e) {
  switch (e) {
    case "comments":
      return isArtifactCommentsEnabled();
    case "data":
      return isArtifactDbEnabled();
    case "check":
      return isArtifactVerifyEnabled() || isArtifactPreviewEnabled();
  }
}
//@ chunk-w08rdxhd.js:3225-3279 placement
function vZe(e) {
  return (
    isArtifactToolsetSplit() &&
    isArtifactToolRegistered() &&
    getArtifactPublishStubDir() === null &&
    isAddonEnabled(e)
  );
}
//@ chunk-w08rdxhd.js:3279-3406 placement
function isLegacyVerbOffered(e) {
  if (!P1t(e)) return !1;
  if (!vZe(ADDON_OF_LEGACY_ACTION[e])) return !1;
  if (e === "verify") return isArtifactVerifyEnabled();
  if (e === "preview") return isArtifactPreviewEnabled();
  return !0;
}
//@ chunk-w08rdxhd.js:3406-3488 placement
function Xe() {
  let e = getLiveState();
  return ((e.frozenDbStrReplace ??= isArtifactDbStrReplaceEnabled()), e.frozenDbStrReplace);
}
/**
 * 说明某个 addon 的旧动作在拆分后工具集里的写法（read_db/write_db → ArtifactData、watch/status/unwatch → ArtifactComments、verify/preview → ArtifactCheck）。
 */
//@ chunk-w08rdxhd.js:3488-4262 placement
function describeAddonSpelling(e) {
  switch (e) {
    case "data":
      return `the \`${ARTIFACT_TOOL_NAME}\` tool's \`action: "read_db"\` / \`"write_db"\` with a \`db_op\` are the \`${ARTIFACT_DATA_TOOL_NAME}\` tool, whose \`action\` is that \`db_op\` ("get", "list", "query", "set", "update",${Xe() ? ' "str_replace",' : ""} "delete", "batch") with the other fields unchanged`;
    case "comments":
      return `the \`${ARTIFACT_TOOL_NAME}\` tool's \`action: "watch"\` / \`"status"\` / \`"unwatch"\` and its comment verbs are the \`${ARTIFACT_COMMENTS_TOOL_NAME}\` tool (\`action: "watch"\` with the \`url\`; with no \`url\` it lists this session's watches; \`on: false\` stops one; \`"comments"\` is its \`action: "read"\`)`;
    case "check": {
      let filtered = ["verify", "preview"].filter(isLegacyVerbOffered);
      return `the \`${ARTIFACT_TOOL_NAME}\` tool's ${filtered.map((s) => `\`action: "${s}"\``).join(" / ")} ${filtered.length === 1 ? "is" : "are"} the \`${ARTIFACT_CHECK_TOOL_NAME}\` tool's`;
    }
  }
}
/**
 * 工具集拆分时生成"本会话的工具写法"提示行：列出相关 addon 旧动作对应的新工具，并提醒首次使用时用 ToolSearch 加载；未拆分或没有启用的 addon 时返回空串。
 */
//@ chunk-w08rdxhd.js:4262-4512 placement
function buildToolSpellingNote(e, r = "Read the steps below with that substitution.") {
  if (!isArtifactToolsetSplit()) return "";
  let filtered = e.filter(vZe);
  if (filtered.length === 0) return "";
  return `> Tool spelling in this session: ${filtered.map(describeAddonSpelling).join("; ")} \u2014 load it with ${TOOL_SEARCH_TOOL_NAME} when you first need it. ${r}

`;
}
/**
 * 识别文本中旧 Artifact 动作引用的正则：action: "<动作>" 形式或数据库子操作名、ArtifactData 工具名、其他 addon 关键字。
 */
//@ chunk-w08rdxhd.js:4512-4789 placement
var ADDON_ORDER = ["data", "comments", "check"],
  LEGACY_VERBS = Object.keys(ADDON_OF_LEGACY_ACTION),
  DATA_LEGACY_VERBS = LEGACY_VERBS.filter((e) => ADDON_OF_LEGACY_ACTION[e] === "data"),
  LEGACY_ACTION_RE = new RegExp(
    `\\baction["'\`]?\\s*:\\s*["'\`](${LEGACY_VERBS.join("|")})["'\`]|["'\`](${DATA_LEGACY_VERBS.join("|")})["'\`]`,
    "g",
  ),
  DATA_TOOL_NAME_RE = new RegExp(`["'\`]${ARTIFACT_DATA_TOOL_NAME}["'\`]`),
  ADDON_KEYWORD_RE = new RegExp(`["'\`](${aNo.join("|")})["'\`]`);
//@ chunk-w08rdxhd.js:4789-4859 placement
function usesWriteDb(e) {
  return referencedAddonActions(e).has("write_db") || (DATA_TOOL_NAME_RE.test(e) && ADDON_KEYWORD_RE.test(e));
}
//@ chunk-w08rdxhd.js:4859-4975 placement
function referencedAddonActions(e) {
  let r = new Set();
  for (let s of e.matchAll(LEGACY_ACTION_RE)) {
    let n = s[1] ?? s[2];
    if (n !== void 0 && P1t(n)) r.add(n);
  }
  return r;
}
/**
 * 找出一段文本（如类型说明）引用到的旧 Artifact 动作，为其中仍提供的 addon 生成工具写法提示。
 */
//@ chunk-w08rdxhd.js:4975-5175 placement
function buildSpellingNoteForText(e) {
  if (!isArtifactToolsetSplit()) return "";
  let r = new Set();
  for (let s of referencedAddonActions(e)) if (isLegacyVerbOffered(s)) r.add(ADDON_OF_LEGACY_ACTION[s]);
  return buildToolSpellingNote(
    ADDON_ORDER.filter((s) => r.has(s)),
    "Where the text below names those calls, that is the spelling it means.",
  );
}
//@ chunk-w08rdxhd.js:5175-5252 placement
class xe {
  gates = () => ({ dbVerbsOn: !1, runScriptOn: !1 });
  register(e) {
    this.gates = e;
  }
}
//@ chunk-w08rdxhd.js:5252-5267 placement
var kLo = new xe();
//@ chunk-w08rdxhd.js:5267-5354 placement
function TLo() {
  let { dbVerbsOn: dbVerbsOn, runScriptOn: runScriptOn } = kLo.gates(),
    s = isArtifactToolRegistered();
  return getStoreRoute(s && dbVerbsOn, s && runScriptOn);
}
/**
 * 决定 artifact 存储内容走哪条路径：ArtifactData 工具可用为 data；未拆分且支持数据库为 write_db；否则能跑脚本为 run_script，都不行为 null。
 */
//@ chunk-w08rdxhd.js:5354-5456 placement
function getStoreRoute(e, r) {
  if (vZe("data")) return "data";
  if (!isArtifactToolsetSplit() && e) return "write_db";
  return r ? "run_script" : null;
}
/**
 * Artifact 种类（slides、design、migrated-design…）的文件布局说明：索引文件、每页文件、资源保存方式。
 */
//@ chunk-w08rdxhd.js:5456-9776 placement
var ARTIFACT_KIND_LAYOUTS = new Map([
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
//@ chunk-w08rdxhd.js:9776-9820 placement
function isKnownArtifactKind(e) {
  return e !== void 0 && ARTIFACT_KIND_LAYOUTS.has(e);
}
//@ chunk-w08rdxhd.js:9820-9856 placement
var rt = new Set(["slides", "design"]);
//@ chunk-w08rdxhd.js:9856-9901 placement
function RYn(e) {
  return e !== void 0 && rt.has(e);
}
//@ chunk-w08rdxhd.js:9901-9937 placement
var it = new Set(["migrated-design"]);
//@ chunk-w08rdxhd.js:9937-9982 placement
function Dzs(e) {
  return e !== void 0 && it.has(e);
}
//@ chunk-w08rdxhd.js:9982-10039 placement
function artifactKindIndexFile(e) {
  return e === void 0 ? void 0 : ARTIFACT_KIND_LAYOUTS.get(e)?.index;
}
/**
 * 生成"把每个改动文件保存在同一文件夹下对应路径，然后以 url/root/files 一次发布"的步骤文字。
 */
//@ chunk-w08rdxhd.js:10039-10419 placement
function buildRepublishFilesStep(e) {
  return `save each changed copy at its listed path under one folder in the working directory or your scratchpad directory, then publish with \`url\`: ${jsonStringify(e)}, \`root\`: that folder, \`file_path\`: the absolute path of one changed copy (not relative to \`root\`), and any other changed copies in \`files\` by their listed paths, so each is served at its listed path`;
}
//@ chunk-w08rdxhd.js:10419-10633 placement
function buildEditReadRule(e) {
  return `a file you wrote or read in this conversation and still see above is current until a publish is refused: edit it, no read first; read any other file you will change (${e}) before editing it.`;
}
//@ chunk-w08rdxhd.js:10633-10746 placement
var PUBLISH_REFUSED_HINT = "If a publish is refused, follow the refusal.",
  CREATED_ON_FILES_SNIPPET = '`"createdOnFiles": {"v": 1, "at": "<now, RFC 3339>"}`';
//@ chunk-w08rdxhd.js:10746-10867 placement
function describeNoStoreWrite(e) {
  return e === null
    ? "never write its store for its content"
    : `never write its store for its content (no ${e})`;
}
//@ chunk-w08rdxhd.js:10867-11053 placement
function describeStoreDocsRedirect(e, r) {
  return r
    ? ` Where the instructions below describe ${e.storeDocs}, they mean this same content, which goes in these files instead; ignore what they say${e.alsoAside}.`
    : "";
}
/**
 * 生成新 artifact 首次写文件并发布的步骤：所有文件写在同一文件夹下，按布局一次或分两次发布（先入口文件与 createdOnFiles，再其余文件）。
 */
//@ chunk-w08rdxhd.js:11053-12325 placement
function buildFirstPublishSteps(layout, url) {
  let n = `\`url\`: ${jsonStringify(url)}, \`root\`: that folder, \`file_path\`: the absolute path of \`${layout.index}\` in it, \`files\`:`,
    firstPublish = layout.firstPublish;
  if (firstPublish === null)
    return `Write the files at those relative paths under one folder in your scratchpad directory (or the working directory) and publish them in ONE call: ${n} every other file by its \`project/\u2026\` path.`;
  return `Write the files at those relative paths under one folder in your scratchpad directory (or the working directory), each written directly with your file-writing tool (it creates the folders: no shell step first, never a script that generates the files), in this order: \`${layout.index}\` FIRST, complete, ${firstPublish.indexHolds} (and its \`designSystems\` record where a design system is used), then ${firstPublish.first}, and publish ${firstPublish.written} right away, in one call: ${n} ${firstPublish.firstSent}, plus any design-system files. Then, without pausing for the user, write ${firstPublish.rest} and publish them with the same \`url\` and \`root\` \u2014 all in one more call, or a few files per call as you go (\`file_path\`: one new file's absolute path, \`files\`: the other new ones) \u2014 each call carrying only files no earlier call sent (each publish keeps the files earlier calls sent); ${firstPublish.onlyOne} is done after the first call.`;
}
//@ chunk-w08rdxhd.js:12325-12603 placement
function summarizeFirstPublish(e) {
  let firstPublish = e.firstPublish;
  return firstPublish === null
    ? `\`${e.index}\` with its \`createdOnFiles\` object, and ${e.filesInBrief}, in one publish`
    : `\`${e.index}\` with its \`createdOnFiles\` object and ${firstPublish.firstInBrief} in a first publish, then ${firstPublish.restInBrief}, ${e.filesInBrief}`;
}
/**
 * 说明这类新 artifact 把内容放在自己 project/ 下的文件里而不是存储：入口文件、文件说明与首次发布步骤。未知类型返回空串。
 */
//@ chunk-w08rdxhd.js:12603-13820 placement
function describeNewArtifactFiles(kind, url, routeInfo) {
  let layout = kind === void 0 ? void 0 : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (layout === void 0) return "";
  return `This type keeps a new Artifact's content in the Artifact's own files under \`project/\`${routeInfo.storeDescribed ? `, never in its store${routeInfo.storeCall === null ? "" : ` (no ${routeInfo.storeCall} for its content)`}` : ""}. The files: \`${layout.index}\`, the index, a JSON object with ${layout.indexKeys}, plus ${CREATED_ON_FILES_SNIPPET}; and ${layout.files}.${layout.uploads}${describeStoreDocsRedirect(layout, routeInfo.storeDescribed)} ${buildFirstPublishSteps(layout, url)} Later changes: ${routeInfo.pinned ? `${buildEditReadRule(routeInfo.read)} Publish only the changed files the same way (the same \`url\`; \`root\`: the folder that holds them at their served paths; \`file_path\`: one changed file's absolute path; \`files\`: the other changed ones); send the index only when you ${layout.indexEdits}, keeping every other key and its \`createdOnFiles\` object as you last wrote or read it. ${PUBLISH_REFUSED_HINT}` : `read each file you will change (${routeInfo.read}) and publish only those the same way (the same \`url\`; \`root\`: the folder that holds them at their served paths; \`file_path\`: one changed file's absolute path); send the index only when you ${layout.indexEdits}, keeping every other key and its \`createdOnFiles\` object as read.`} Never publish index.html, SKILL.md or anything under \`artifact-type/\`.`;
}
/**
 * 读完类型说明后追加的提醒：新 artifact 内容放在 project/ 文件里（而非类型说明里可能提到的存储文档）。
 */
//@ chunk-w08rdxhd.js:13820-14113 placement
function buildNewArtifactReminder(e, r, s) {
  let n = e === void 0 ? void 0 : ARTIFACT_KIND_LAYOUTS.get(e);
  if (n === void 0 || !s) return "";
  return `

[Now that you have read the type's instructions: this new Artifact's content goes in files under \`project/\` as described before them (${summarizeFirstPublish(n)}), not in any store document they may describe: ${describeNoStoreWrite(r)}.]`;
}
/**
 * 说明一个还没有自身文件的 artifact：已发布的都是类型文件；若可能有旧存储内容，说明如何读取后迁移到文件。
 */
//@ chunk-w08rdxhd.js:14113-14848 placement
function describeEmptyArtifact(kind, url, routeInfo) {
  let n = kind === void 0 ? void 0 : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (n === void 0) return "";
  let a = `every file published to it so far is the type's (${routeInfo.typeFiles})`;
  if (!routeInfo.olderStore)
    return `It is new and still empty \u2014 ${a} and it holds no content of its own, so there is no file or document of its own to list or read before writing. ${describeNewArtifactFiles(kind, url, routeInfo)}`;
  let l = describeStoreReadCall(routeInfo.storeRoute);
  return `It has no file of its own yet \u2014 ${a}, so there is no file of its own to list or read before writing. ${describeNewArtifactFiles(kind, url, routeInfo)} If the user says this Artifact already has content, it may be in its older store, as ${n.storeDocs}: ${l === null ? "this session has no call that reads that store, so ask them what it held" : `read those first (${l})`} and carry that into these files.`;
}
//@ chunk-w08rdxhd.js:14848-15059 placement
function describeStoreReadCall(e) {
  switch (e) {
    case "data":
      return `the \`${ARTIFACT_DATA_TOOL_NAME}\` tool, \`action: "list"\` or \`"get"\``;
    case "write_db":
      return '`action: "read_db"` with `db_op: "list"` or `"get"`';
    case "run_script":
    case null:
      return null;
  }
}
/**
 * 说明已有 artifact 的编辑流程：先列文件，内容在 project/ 下的文件里，入口文件是哪个，改完如何重新发布。
 */
//@ chunk-w08rdxhd.js:15059-16762 placement
function describeExistingArtifactFiles(kind, url, routeInfo) {
  let layout = kind === void 0 ? void 0 : ARTIFACT_KIND_LAYOUTS.get(kind);
  if (layout === void 0) return "";
  return `List its files first, before any other call (${routeInfo.list}). This Artifact's content lives in its own files under \`project/\`${routeInfo.storeDescribed ? ", never in its store" : ""}: \`${layout.index}\` is the index, a JSON object with ${layout.indexKeys}, plus a \`createdOnFiles\` or \`convertedFrom\` object; and ${layout.files}.${describeStoreDocsRedirect(layout, routeInfo.storeDescribed)} ${routeInfo.ownFilesSeen ? `${capitalize(buildEditReadRule(routeInfo.read))} Then ${buildRepublishFilesStep(url)}. ${PUBLISH_REFUSED_HINT}` : `Read each file you will change (${routeInfo.read}) and ${buildRepublishFilesStep(url)}.`} Send the index only when you ${layout.indexEdits}, keeping every other key and its \`createdOnFiles\` or \`convertedFrom\` object as ${routeInfo.ownFilesSeen ? "you last wrote or read it" : "read"}${routeInfo.storeDescribed ? `; ${describeNoStoreWrite(routeInfo.storeCall)}${routeInfo.storeCall === null ? "" : " \u2014 reading what its old store holds, to see what was there, is fine"}. If no \`${layout.index}\` is listed, this Artifact has not been started on files: start it on files now as you would a new one, writing the index, with ${CREATED_ON_FILES_SNIPPET}, and every content file under one folder and publishing them to it in ONE call (\`url\`: ${jsonStringify(url)}, \`root\`: that folder, \`file_path\`: the index's absolute path, \`files\`: the rest by their \`project/\u2026\` paths), and tell the user whether its earlier content was carried over; from then on its page shows only those files, nothing from its old store` : `. If no \`${layout.index}\` is listed, this Artifact has no files content yet: write the index, with ${CREATED_ON_FILES_SNIPPET}, and every content file as for a new one, under one folder, and publish them to it in ONE call (\`url\`: ${jsonStringify(url)}, \`root\`: that folder, \`file_path\`: the index's absolute path, \`files\`: the rest by their \`project/\u2026\` paths)`}`;
}
/**
 * 读完类型说明后追加的提醒：此 artifact 内容在 project/ 文件里，先列文件，不要写存储文档。
 */
//@ chunk-w08rdxhd.js:16762-17191 placement
function buildExistingArtifactReminder(e, r, s, n) {
  let a = e === void 0 ? void 0 : ARTIFACT_KIND_LAYOUTS.get(e);
  if (a === void 0 || !s) return "";
  return `

[Now that you have read the type's instructions: this Artifact's content lives in files under \`project/\` as described before them, not in any store document they may describe: list its files (${n.list}), then edit and publish them as described there, and if no \`${a.index}\` is listed yet, start it on files as said there; ${describeNoStoreWrite(r)}.]`;
}
/**
 * 说明"写存储"的调用形式：ArtifactData 写入或 write_db 动作；脚本或无路由时为 null。
 */
//@ chunk-w08rdxhd.js:17191-17343 placement
function describeStoreWriteCall(e) {
  switch (e) {
    case "data":
      return `\`${ARTIFACT_DATA_TOOL_NAME}\` writes`;
    case "write_db":
      return '`action: "write_db"` calls';
    case "run_script":
    case null:
      return null;
  }
}
/**
 * 说明怎么写存储：用 ArtifactData 工具（未加载先用 ToolSearch）或 write_db 动作，传入该 artifact 的 url。
 */
//@ chunk-w08rdxhd.js:17343-17563 placement
function describeStoreWriteHow(e, r) {
  switch (e) {
    case "data":
      return `with the \`${ARTIFACT_DATA_TOOL_NAME}\` tool (load it with ${TOOL_SEARCH_TOOL_NAME} if it is not loaded yet), passing \`url\`: ${jsonStringify(r)}`;
    case "write_db":
      return `with \`action: "write_db"\`, passing \`url\`: ${jsonStringify(r)}`;
  }
}

export {
  buildSpellingNoteForText,
  TLo,
  describeStoreWriteCall,
  usesWriteDb,
  describeEmptyArtifact,
  describeExistingArtifactFiles,
  artifactKindIndexFile,
  buildRepublishFilesStep,
  isKnownArtifactKind,
  referencedAddonActions,
  buildNewArtifactReminder,
  buildExistingArtifactReminder,
  describeStoreWriteHow,
  RYn,
  vZe,
  Dzs,
  getStoreRoute,
  describeNewArtifactFiles,
  readArtifactDiagnostics,
  isArtifactVerifyEnabled,
  kLo,
  buildToolSpellingNote,
};
