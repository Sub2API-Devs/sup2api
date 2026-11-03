/**
 * services/conversationImport/importConversations.ts
 *
 * 2.1.316 新增：导入 claude.ai 导出的对话（CLAUDE_IMPORT_CONVERSATIONS）：解析导出包、转换为转录、导入附件与 Artifact
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sdzpqjn8.js (40)
 * attribution: placement 39, layout 1
 */
import { writeFile, mkdir, stat, readFile } from "fs/promises";
import { dirname, join, basename } from "path";
import { A, oe, o, u, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { normalizeCaseForComparison, DANGEROUS_FILES_LOWER } from "../../utils/permissions/filesystem.js";
import { zje, isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
import { INSTRUCTION_FILE_NAMES } from "../agentImport/importItemOrder.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";
import { truncateToLength, fenceCodeBlock, getFirstLine } from "../../utils/stringUtils.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { getDefaultAppState_2 } from "../../state/AppStateStore.js";
import { forkRootSessionWithProject } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { LE, hashAgentId } from "../../utils/agentId.js";
import { applyPermissionRulesToPermissionContext } from "../../utils/permissions/permissions.js";
import { loadAllPermissionRulesFromDisk } from "../../utils/permissions/permissionsLoader.js";
import { mg } from "../../utils/messageQueueManager.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { TOOL_CATALOG } from "../../tools.js";
import { query } from "../../query.js";
import { nv, ZC } from "../../utils/remoteFileState.js";
import { InstanceRegistry } from "../../utils/instanceRegistry.js";
import { freeze_2, Uht, Bht } from "../artifacts/artifactReadConsent.js";
import { u2 } from "../../tasks/taskLoopRegistry.js";
import { NOOP_FUNCTION_HOOK_REGISTRY } from "../../utils/hooks/functionHookNoop.js";
import { NOOP_NOTIFICATION_DRAIN } from "../queuedNotifications/queuedNotifications.js";
import { artifactReadObservationIn } from "../artifacts/readObservation.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../../utils/agentNameRegistry.js";
import { kW } from "../../utils/attachments/fileAttachments.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { generateFileAttachment } from "../../utils/attachments.js";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../../utils/debug.js";
import { Ph } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { maybeResizeAndDownsampleImageBlock } from "../../utils/imageResizer.js";
import { IMAGE_LIMITS } from "../../utils/truncateGraphemes.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { slugifyTaskName } from "../../components/daemon/DaemonScheduledTaskDetail.js";
import { unzipFile } from "../../utils/dxt/zip.js";
import { safeParseJSON } from "../../utils/json.js";
import { getProjectDir, canonicalizePath } from "../../utils/sessionStoragePortable.js";
import { getTranscriptStorageKey, getRealPathOptions } from "../../utils/sessionStorage.js";
import { env } from "../../utils/env.js";
import { cliError } from "../../cli/exit.js";
import { logError } from "../../utils/log.js";
import { setBgExitCause } from "../../utils/bgExitSidecars.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";

//@ chunk-sdzpqjn8.js:16789-16911 placement
var CLAUDE_AI_EXPORT_NAMESPACE = "5f3a2c5e-6b8f-4b27-9c0e-2d7f1a9b3c44",
  wt = /^[a-zA-Z0-9_-]+$/,
  Ot = /\.(mp3|m4a|mp4|wav|ogg|oga|opus|flac|aac|webm)$/i;
/**
 * 宽松数组 schema：非数组视为空，元素逐个校验，丢弃不合法的。
 */
//@ chunk-sdzpqjn8.js:16911-17034 placement
function lenientArrayOf(e) {
  return A(oe())
    .catch([])
    .transform((n) =>
      n.flatMap((s) => {
        let safeParse = e.safeParse(s);
        return safeParse.success ? [safeParse.data] : [];
      }),
    );
}
//@ chunk-sdzpqjn8.js:17034-18087 placement
var optionalString = DoctorLazy(() =>
    o()
      .optional()
      .catch(void 0),
  ),
  Et = DoctorLazy(() => u({ file_uuid: o(), file_name: optionalString() })),
  Pt = DoctorLazy(() =>
    u({
      id: optionalString(),
      command: optionalString(),
      content: optionalString(),
      old_str: optionalString(),
      new_str: optionalString(),
      title: optionalString(),
      type: optionalString(),
      language: optionalString(),
      path: optionalString(),
      file_text: optionalString(),
    })
      .optional()
      .catch(void 0),
  ),
  Ft = DoctorLazy(() =>
    u({
      uuid: o(),
      parent_message_uuid: o().nullish().catch(null),
      sender: o().catch("assistant"),
      text: o().catch(""),
      content: lenientArrayOf(u({ type: o(), text: optionalString(), name: optionalString(), input: Pt() })),
      created_at: o().catch(""),
      attachments: lenientArrayOf(u({ file_name: o().catch(""), extracted_content: o() })),
      files: lenientArrayOf(Et()),
    }),
  ),
  zt = DoctorLazy(() =>
    u({
      uuid: o(),
      name: o().catch(""),
      created_at: optionalString(),
      updated_at: optionalString(),
      project_uuid: o().nullish().catch(null),
      chat_messages: lenientArrayOf(Ft()),
    }),
  ),
  Nt = DoctorLazy(() =>
    u({
      uuid: o(),
      name: o().catch(""),
      prompt_template: optionalString(),
      docs: lenientArrayOf(u({ filename: optionalString(), content: o() })),
      files: lenientArrayOf(Et()),
    }),
  ),
  pt = DoctorLazy(() =>
    u({
      manifest: oe().optional(),
      conversations: lenientArrayOf(zt()),
      projects: lenientArrayOf(Nt()),
    }).catch({ manifest: void 0, conversations: [], projects: [] }),
  ),
  Ut = DoctorLazy(() =>
    u({
      account_uuid: o().catch("unknown"),
      conversations: A(u({ uuid: o().catch(""), message_count: E() })),
      projects: A(u({ uuid: o().catch(""), doc_count: E() })),
    }),
  );
//@ chunk-sdzpqjn8.js:18087-18144 placement
function dt(e) {
  return e.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
//@ chunk-sdzpqjn8.js:18144-18193 placement
function at(e) {
  return dt(e).slice(0, 128) || "file";
}
//@ chunk-sdzpqjn8.js:18193-18516 placement
function PROJECT_DOC_NAMES(e) {
  let replaced = normalizeCaseForComparison(e).replace(zje, "");
  return replaced === "claude.md" ||
    replaced === "claude.local.md" ||
    replaced === "architecture.md" ||
    replaced === ".git" ||
    replaced === "project-instructions.md" ||
    replaced.startsWith(".claude") ||
    INSTRUCTION_FILE_NAMES.has(replaced) ||
    replaced === ".windsurfrules" ||
    replaced === ".clinerules" ||
    replaced === ".gemini" ||
    replaced === ".cursor" ||
    DANGEROUS_FILES_LOWER.has(replaced) ||
    replaced === ".worktreeinclude" ||
    isReservedDeviceName(replaced)
    ? `imported-${e}`
    : e;
}
//@ chunk-sdzpqjn8.js:18516-18586 placement
function St(e, n) {
  return typeof n === "string" && n !== "" ? `${e}-${at(n)}` : e;
}
//@ chunk-sdzpqjn8.js:18586-18703 placement = tryCreateExclusive (1)
async function tryCreateExclusive(e, n) {
  return writeFile(e, n, { mode: 384, flag: "wx" }).then(
    () => !0,
    (s) => {
      if (s.code !== "EEXIST") throw s;
      return !1;
    },
  );
}
//@ chunk-sdzpqjn8.js:18703-18774 placement
async function $t(e, n) {
  if (n) return;
  await mkdir(e, { recursive: !0, mode: 448 });
}
//@ chunk-sdzpqjn8.js:18774-18913 placement
async function pathExists(e, n) {
  if (n) {
    let statMeta = await n.backend.statMeta(n.key);
    return statMeta.ok || statMeta.error.code !== "NotFound";
  }
  return stat(e).then(
    () => !0,
    () => !1,
  );
}
//@ chunk-sdzpqjn8.js:18913-19384 placement
async function appendImportedTranscript(e, n, s) {
  if (s && n.length > 0) {
    if (await pathExists(e, s)) return !1;
    let append = await s.backend.append(
      s.key,
      n.map((g) => ({
        data:
          jsonStringify(g) +
          `
`,
      })),
    );
    if (append.ok) return !0;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `transcript import append failed: ${append.error.code}`,
        "transcript import append failed",
      ),
      { cause: append.error },
    );
  }
  if (s) await mkdir(dirname(e), { recursive: !0, mode: 448 });
  let r =
    n.map((a) => jsonStringify(a)).join(`
`) +
    (n.length
      ? `
`
      : "");
  return writeFile(e, r, { mode: 384, flag: "wx" }).then(
    () => !0,
    (a) => {
      if (a.code !== "EEXIST") throw a;
      return !1;
    },
  );
}
//@ chunk-sdzpqjn8.js:19384-19474 placement
function Rt(e) {
  return e.content.find((n) => n.type === "text" && n.text !== void 0)?.text ?? e.text;
}
//@ chunk-sdzpqjn8.js:19474-19646 placement
function exportMessageText(e, n) {
  let s = Rt(e),
    joined = e.attachments
      .map(
        (attachment) => `

<file name="${attachment.file_name}">
${attachment.extracted_content}
</file>`,
      )
      .join("");
  return (
    (n.length > 0
      ? `${n.join(`
`)}
`
      : "") +
    s +
    joined
  );
}
//@ chunk-sdzpqjn8.js:19646-19761 placement
var ARTIFACTS = "artifacts",
  CREATE_FILE = "create_file",
  STR_REPLACE = "str_replace",
  Wt = 1000,
  lt = 67108864,
  Gt = 4 * lt,
  Yt = 4096,
  Ht = 64,
  qt = 100,
  Zt = 200,
  vt = 64;
//@ chunk-sdzpqjn8.js:19761-19919 placement
function replaceFirstText(e, n, s) {
  if (s === void 0) return;
  if (e === void 0) return s;
  if (n === void 0) return;
  let r = e.includes(n) ? n : n.trim();
  if (r === "") return;
  return e.replace(r, () => s);
}
//@ chunk-sdzpqjn8.js:19919-20093 placement
function replaceUniqueText(e, n, s) {
  if (e === void 0 || n === void 0 || n === "") return;
  let index = e.indexOf(n);
  if (index === -1 || e.indexOf(n, index + n.length) !== -1) return;
  return e.slice(0, index) + (s ?? "") + e.slice(index + n.length);
}
/**
 * 代码块语言名到文件扩展名的映射（导入对话时给代码工件取文件名），Qt 是这些扩展名加纯文本类扩展名的集合。
 */
//@ chunk-sdzpqjn8.js:20093-20603 placement = EXTENSION_TO_LANGUAGE (0.346)
var CODE_LANGUAGE_EXTENSIONS = new Map(
    Object.entries({
      python: ".py",
      py: ".py",
      javascript: ".js",
      js: ".js",
      typescript: ".ts",
      ts: ".ts",
      jsx: ".jsx",
      tsx: ".tsx",
      html: ".html",
      css: ".css",
      json: ".json",
      yaml: ".yaml",
      yml: ".yml",
      toml: ".toml",
      xml: ".xml",
      markdown: ".md",
      md: ".md",
      bash: ".sh",
      sh: ".sh",
      shell: ".sh",
      sql: ".sql",
      java: ".java",
      c: ".c",
      cpp: ".cpp",
      "c++": ".cpp",
      csharp: ".cs",
      "c#": ".cs",
      go: ".go",
      rust: ".rs",
      ruby: ".rb",
      php: ".php",
      swift: ".swift",
      kotlin: ".kt",
      r: ".r",
      svg: ".svg",
      mermaid: ".mmd",
    }),
  ),
  TEXT_ARTIFACT_EXTENSIONS = new Set([...CODE_LANGUAGE_EXTENSIONS.values(), ".txt", ".csv", ".tsv", ".log"]);
/**
 * Artifact 类型对应的文件扩展名（html、jsx、md、svg、mmd，代码按语言，默认 .txt）。
 */
//@ chunk-sdzpqjn8.js:20603-20916 layout
function artifactExtension(e, n) {
  switch (e) {
    case "text/html":
      return ".html";
    case "application/vnd.ant.react":
      return ".jsx";
    case "text/markdown":
      return ".md";
    case "image/svg+xml":
      return ".svg";
    case "application/vnd.ant.mermaid":
      return ".mmd";
    case "application/vnd.ant.code":
      return CODE_LANGUAGE_EXTENSIONS.get(n.trim().toLowerCase()) ?? ".txt";
    default:
      return ".txt";
  }
}
//@ chunk-sdzpqjn8.js:20916-21044 placement
function splitFileExtension(e) {
  let index = e.lastIndexOf(".");
  return index > 0 && index < e.length - 1
    ? { stem: e.slice(0, index), extension: e.slice(index) }
    : { stem: e, extension: "" };
}
//@ chunk-sdzpqjn8.js:21044-21431 placement
function fileNameForArtifact(e) {
  let replaced = e.title.replace(zje, ""),
    { stem: stem, extension: extension } =
      e.kind === "file"
        ? splitFileExtension(replaced)
        : { stem: replaced, extension: artifactExtension(e.type, e.language) };
  if (e.kind === "file") {
    if (((extension = dt(extension)), !TEXT_ARTIFACT_EXTENSIONS.has(extension.toLowerCase())))
      ((stem += extension), (extension = extension === "" ? "" : ".txt"));
  } else if (stem.length > extension.length && stem.toLowerCase().endsWith(extension))
    stem = stem.slice(0, -extension.length);
  return (
    (stem = at(stem).replace(/^\.+/, "").replace(zje, "")),
    { stem: /[a-zA-Z0-9]/.test(stem) ? stem : e.kind, extension: extension }
  );
}
//@ chunk-sdzpqjn8.js:21431-21742 placement
function MIME_TYPE_EXTENSIONS(e, n) {
  switch (e) {
    case "text/markdown":
      return;
    case "application/vnd.ant.code":
      return truncateToLength(n.trim(), vt);
    case "text/html":
      return "html";
    case "application/vnd.ant.react":
      return "jsx";
    case "image/svg+xml":
      return "svg";
    case "application/vnd.ant.mermaid":
      return "mermaid";
    case "text/plain":
      return "text";
    default:
      return "";
  }
}
//@ chunk-sdzpqjn8.js:21742-21854 placement
function artifactHeading(e) {
  return `**${e.kind === "file" ? "File" : "Artifact"}: ${e.title}**${e.version > 1 ? ` (v${e.version})` : ""}`;
}
//@ chunk-sdzpqjn8.js:21854-22102 placement
function formatArtifactBlock(e) {
  let n = artifactHeading(e),
    s =
      e.kind === "file"
        ? truncateToLength(splitFileExtension(e.title).extension.slice(1).toLowerCase(), vt)
        : MIME_TYPE_EXTENSIONS(e.type, e.language);
  if (s === void 0)
    return `${n}

${e.content}`;
  let r = e.content.endsWith(`
`)
    ? e.content.slice(0, -1)
    : e.content;
  return `${n}

${fenceCodeBlock(r, s)}`;
}
//@ chunk-sdzpqjn8.js:22102-22171 placement
function re(e) {
  return `${artifactHeading(e)} \u2014 updated; final version below.`;
}
//@ chunk-sdzpqjn8.js:22171-22249 placement
var ce = "_Artifact content from this point on was not imported (size limit)._";
//@ chunk-sdzpqjn8.js:22249-22289 placement
function kt(e = Gt) {
  return { spent: 0, cap: e };
}
/**
 * 把导出的消息树（parent_message_uuid）线性化并转换为转录消息，含 Artifact 更新。
 */
//@ chunk-sdzpqjn8.js:22289-24883 placement
function convertExportMessages(e, n = lt, s = kt()) {
  let r = new Map();
  e.forEach((m, h) => {
    if (!r.has(m.uuid)) r.set(m.uuid, h);
  });
  let a = (m) => {
      let parent_message_uuid = e[m].parent_message_uuid,
        v = typeof parent_message_uuid === "string" ? r.get(parent_message_uuid) : void 0;
      return v === void 0 || v === m ? void 0 : v;
    },
    g = new Map(),
    S = [];
  e.forEach((m, h) => {
    let v = a(h);
    if (v === void 0) {
      S.push(h);
      return;
    }
    let O = g.get(v);
    if (O) O.push(h);
    else g.set(v, [h]);
  });
  let y = e.length - 1;
  for (let m = 0; m < e.length; m++) {
    let h = g.get(y);
    if (h === void 0 || h.length === 0) break;
    y = h.at(-1);
  }
  let X = new Map(),
    T = 0,
    mapped = e.map((m) =>
      m.content.map(() => {
        return;
      }),
    ),
    b = new Set(),
    w = 0,
    P = (m) => {
      ((w += m), (s.spent += m));
    },
    f = () => w > n || s.spent > s.cap,
    x = [],
    M = (m, h, v) => {
      let O = e[m],
        L = v;
      if (O.sender === "human") return { state: h, marked: L };
      let N;
      return (
        O.content.forEach((D, V) => {
          let input = D.input;
          if (D.type !== "tool_use" || input === void 0) return;
          let I = D.name === ARTIFACTS,
            G = D.name === CREATE_FILE || D.name === STR_REPLACE,
            j =
              I && input.id !== void 0
                ? `artifact:${input.id}`
                : G && input.path !== void 0
                  ? `file:${input.path}`
                  : void 0;
          if (j === void 0) return;
          if (f()) {
            if (!L) (x.push({ i: m, b: V }), (L = !0));
            return;
          }
          let F = (N ?? h).get(j),
            Y = F?.content.length ?? 0,
            K =
              (I && input.command === "update" && !input.content) || D.name === STR_REPLACE
                ? Math.ceil((Y * (input.old_str?.length ?? 0)) / qt)
                : 0;
          if ((P(Math.max(Yt, input.content?.length ?? 0, input.file_text?.length ?? 0, Y) + K), f())) {
            if (!L) (x.push({ i: m, b: V }), (L = !0));
            return;
          }
          let H;
          if (I)
            H =
              input.command === "create" || input.command === "rewrite"
                ? input.content?.trimStart()
                : input.command === "update"
                  ? input.content
                    ? input.content
                    : replaceFirstText(F?.content, input.old_str, input.new_str)
                  : void 0;
          else if (D.name === CREATE_FILE) H = input.file_text;
          else if (
            ((H = replaceUniqueText(F?.content, input.old_str, input.new_str)), H === void 0 && F !== void 0)
          )
            T += 1;
          if (H === void 0) return;
          let it = {
            kind: F?.kind ?? (I ? "artifact" : "file"),
            title:
              F?.title ??
              (sanitizeDisplayText(
                I ? (input.title ?? "") : ((input.path ?? "").split(/[/\\]/).pop() ?? ""),
                { drop: /`/g, maxCodeUnits: Zt },
              ) ||
                "Untitled"),
            type: F?.type ?? (I ? (input.type ?? "") : ""),
            language: F?.language ?? (I ? (input.language ?? "") : ""),
            content: H,
            version: (F?.version ?? 0) + 1,
            final: !1,
          };
          if (N === void 0) (P(h.size * Ht), (N = new Map(h)));
          (N.set(j, it), (mapped[m][V] = it));
        }),
        { state: N ?? h, marked: L }
      );
    },
    weakSet = new WeakSet(),
    k = (m) => {
      let h = [{ i: m, inherited: new Map(), marked: !1 }];
      while (h.length > 0) {
        let { i: v, inherited: inherited, marked: marked } = h.pop();
        if (b.has(v)) continue;
        b.add(v);
        let { state: state, marked: marked_2 } = M(v, inherited, marked);
        if (v === y) X = state;
        let V = g.get(v) ?? [];
        if (V.every((c) => b.has(c)) && !weakSet.has(state)) {
          weakSet.add(state);
          for (let c of state.values()) c.final = !0;
        }
        for (let c = V.length - 1; c >= 0; c--) h.push({ i: V[c], inherited: state, marked: marked_2 });
      }
    };
  (S.forEach(k),
    e.forEach((m, h) => {
      if (b.has(h)) return;
      let v = new Set(),
        O = h;
      while (!v.has(O)) {
        v.add(O);
        let L = a(O);
        if (L === void 0 || b.has(L)) break;
        O = L;
      }
      k(O);
    }));
  let J = new Set(X.values()),
    R = [],
    mapped_2 = mapped.map((m, h) =>
      m.map((v, O) => {
        if (v === void 0) return;
        if (!v.final) return re(v);
        if (J.has(v)) R.push({ messageIndex: h, blockIndex: O, artifact: v });
        return formatArtifactBlock(v);
      }),
    );
  for (let m of x) mapped_2[m.i][m.b] = ce;
  return { texts: mapped_2, kept: R, editsFailed: T };
}
/**
 * 导入导出包中的 Artifact 内容（功能关闭时跳过）。
 */
//@ chunk-sdzpqjn8.js:24883-26453 placement
function importArtifactContent(e, n, s) {
  let r = [],
    a = getDefaultAppState_2(),
    g = forkRootSessionWithProject({
      host: getRootSession().host,
      id: LE(e),
      project: { originalCwd: n, projectRoot: n, cwd: n },
    }),
    S = applyPermissionRulesToPermissionContext(a.toolPermissionContext, loadAllPermissionRulesFromDisk()),
    y = { ...a, toolPermissionContext: S };
  return {
    messageQueue: mg(),
    session: g,
    agentContext: mainAgentContext(),
    options: {
      commands: [],
      debug: !1,
      mainLoopModel: getMainLoopModel(),
      tools: r,
      toolCatalog: TOOL_CATALOG,
      verbose: !1,
      thinkingConfig: { type: "disabled", mechanical: !0 },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: !0,
      runQuery: query,
      agentDefinitions: { activeAgents: [], allAgents: [] },
      autoCompactWindow: y.autoCompactWindow,
      fastMode: y.fastMode,
      cacheBreakerPhrase: y.cacheBreakerPhrase,
    },
    abortController: new AbortController(),
    readFileState: nv(ZC),
    toolState: new InstanceRegistry(),
    toolDecisions: new Map(),
    permissionRelays: freeze_2,
    getAppState: () => y,
    setAppState: () => {},
    getAdvisorSetting: () => y.advisorModel,
    getMcp: () => y.mcp,
    getProactivityLevel: () => y.proactivityLevel,
    getWebBrowser: () => y.webBrowser,
    setToolPermissionContext: () => {},
    setSessionToolPermissionContext: () => {},
    taskRegistry: u2,
    sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
    queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
    setWebBrowserSlice: () => {},
    setArtifactReadVersion: () => {},
    getArtifactReadObservation: artifactReadObservationIn(() => y),
    artifactRegistries: Uht(),
    setArtifactContractTarget: () => {},
    getArtifactContractTarget: () => ({ targetSlug: void 0, pins: {} }),
    enqueuePendingMemoryUpdate: () => {},
    agentLifecycle: NOOP_AGENT_NAME_REGISTRY,
    teammateColors: Bht,
    rootToolSurface: { tools: r, mainLoopModel: getMainLoopModel() },
    messages: [],
    turnStartIndex: 0,
    getFileHistoryState: () => {
      return;
    },
    applyFileHistoryOp: () => {},
    applyAttributionOp: () => {},
    markPrResolvedThisSession: () => {},
    isUltrareviewOverageConfirmed: () => !1,
    markUltrareviewOverageConfirmed: () => {},
    storageV5: s,
  };
}
//@ chunk-sdzpqjn8.js:26453-26692 placement
function redactAttachmentPaths(e, n) {
  if (typeof e.filename === "string") e.filename = n;
  if (typeof e.displayPath === "string") e.displayPath = n;
  let content = e.content,
    r = content?.file;
  if (r && typeof r.filePath === "string") r.filePath = n;
  if (content?.type === "pdf" && r && "base64" in r) delete r.base64;
}
//@ chunk-sdzpqjn8.js:26692-27042 placement
async function logImportAttachment(e, n, s, r, a, g) {
  try {
    if (kW(s, getToolPermissionContext(e))) return null;
    let S = await generateFileAttachment(
      join(n, s),
      e,
      "tengu_import_attachment_success",
      "tengu_import_attachment_error",
      "at-mention",
    );
    if (!S) return null;
    return (
      redactAttachmentPaths(S, s),
      createAttachmentMessage(S, {
        now: () => g,
        uuid: () => hashAgentId(`${r}:${a}:attachment`, CLAUDE_AI_EXPORT_NAMESPACE),
      })
    );
  } catch (error) {
    return (
      logForDebugging(`import attachment enrichment failed: ${String(error)}`, { level: "error" }),
      null
    );
  }
}
//@ chunk-sdzpqjn8.js:27042-27362 placement
function buildToolResultMessage(e, n, s) {
  return {
    type: "user",
    uuid: hashAgentId(`${n}:${e.toolUseId}:result`, CLAUDE_AI_EXPORT_NAMESPACE),
    timestamp: s,
    message: {
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: e.toolUseId, content: `File created successfully at: ${e.path}` },
      ],
    },
    toolUseResult: {
      type: "create",
      filePath: e.path,
      content: e.content,
      structuredPatch: [],
      originalFile: null,
    },
  };
}
/**
 * 转换一条导出消息（文本、附件、工具调用）为转录行。
 */
//@ chunk-sdzpqjn8.js:27362-29147 placement
async function convertExportMessage(e, n, s, r, a, g, S, y, X) {
  let T = {
    parentUuid: e.parent_message_uuid ?? null,
    isSidechain: !1,
    uuid: e.uuid,
    timestamp: e.created_at,
    cwd: n,
    userType: "external",
    sessionId: s,
    version: "claude-export-import",
  };
  if (e.sender === "human") {
    let w = [],
      P = [],
      f = (R) => dt(a[R.file_uuid] ?? "").length <= 128,
      x = (R) => `files/${St(R.file_uuid, a[R.file_uuid])}`,
      M = (R) => {
        let U = x(R);
        if ((g.set(R.file_uuid, U), !S.some((m) => m.fileUuid === R.file_uuid)))
          S.push({ fileUuid: R.file_uuid, rel: U, attachable: f(R) });
        return `@"${U}"`;
      },
      W = new Set();
    for (let file of e.files) {
      if (W.has(file.file_uuid)) continue;
      W.add(file.file_uuid);
      let U = r[file.file_uuid];
      if (!U) continue;
      let m = Ph(Buffer.from(U));
      if (m)
        try {
          let { block: block } = await maybeResizeAndDownsampleImageBlock({
            data: Buffer.from(U),
            mediaType: m,
            limits: IMAGE_LIMITS,
          });
          if (block.type === "image") w.push(block);
          else P.push(M(file));
        } catch {
          P.push(M(file));
        }
      else P.push(M(file));
    }
    let k = exportMessageText(e, P),
      J = w.length > 0 ? (k.trim().length > 0 ? [...w, { type: "text", text: k }] : w) : k;
    return { ...T, type: "user", message: { role: "user", content: J } };
  }
  let flattened = e.content.flatMap((w, P) => {
    let f = w.type === "text" && w.text !== void 0 && w.text.trim() !== "" ? w.text : y[P];
    return f !== void 0 ? [{ type: "text", text: f, citations: [] }] : [];
  });
  for (let w of X)
    flattened.push({
      type: "tool_use",
      id: w.toolUseId,
      name: FILE_WRITE_TOOL_NAME,
      input: { file_path: w.path, content: w.content },
    });
  let b = Rt(e);
  return {
    ...T,
    type: "assistant",
    requestId: void 0,
    message: {
      diagnostics: null,
      id: e.uuid,
      type: "message",
      role: "assistant",
      model: "claude-export-import",
      content:
        flattened.length > 0
          ? flattened
          : [{ type: "text", text: b.trim() ? b : NO_CONTENT_MESSAGE, citations: [] }],
      container: null,
      context_management: null,
      stop_details: null,
      stop_reason: X.length > 0 ? "tool_use" : "end_turn",
      stop_sequence: null,
      usage: {
        output_tokens_details: null,
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cache_creation: null,
        server_tool_use: null,
        service_tier: null,
        inference_geo: null,
        iterations: null,
        speed: null,
        fallback_credit: null,
      },
    },
  };
}
//@ chunk-sdzpqjn8.js:29147-29236 placement
function ht(e) {
  let n = typeof e === "string" ? Date.parse(e) : NaN;
  return Number.isNaN(n) ? null : n;
}
//@ chunk-sdzpqjn8.js:29236-29335 placement
function It(e) {
  let n = `${slugifyTaskName(e.name) || "project"}-${e.uuid}`;
  return wt.test(n) && n.length <= 200 ? n : null;
}
//@ chunk-sdzpqjn8.js:29335-29620 placement
function exportSummary(e, n, s, r) {
  let safeParse = Ut().safeParse(e);
  if (safeParse.success) return safeParse.data;
  return {
    account_uuid: typeof r === "string" ? r : "unknown",
    conversations: n.map((g) => ({ uuid: g.uuid, message_count: g.chat_messages.length })),
    projects: s.flatMap((g) => (It(g) !== null ? [{ uuid: g.uuid, doc_count: g.docs.length }] : [])),
  };
}
//@ chunk-sdzpqjn8.js:29620-30157 placement
function formatImportSummary(e, n) {
  let s = [];
  if (e.conversations.length !== n.conversations + n.skipped)
    s.push(`conversations: manifest=${e.conversations.length} imported=${n.conversations + n.skipped}`);
  let reduced = e.conversations.reduce((g, S) => g + S.message_count, 0);
  if (reduced !== n.messages) s.push(`messages: manifest=${reduced} imported=${n.messages}`);
  if (e.projects.length !== n.projects)
    s.push(`projects: manifest=${e.projects.length} imported=${n.projects}`);
  let reduced_2 = e.projects.reduce((g, S) => g + S.doc_count, 0);
  if (reduced_2 !== n.docs) s.push(`docs: manifest=${reduced_2} imported=${n.docs}`);
  return s;
}
//@ chunk-sdzpqjn8.js:30157-30175 placement
var he = 1073741824;
//@ chunk-sdzpqjn8.js:30175-31263 placement
async function readExportFile(e) {
  let { size: size } = await stat(e);
  if (size > he) throw Error("export file exceeds MAX_EXPORT_BYTES");
  if (!e.endsWith(".zip")) {
    let b = await readFile(e, "utf8"),
      w;
    try {
      w = jsonParse(b);
    } catch {
      throw Error("export file is not valid JSON");
    }
    let { manifest: manifest, conversations: conversations, projects: projects } = pt().parse(w);
    return {
      manifest: exportSummary(manifest, conversations, projects, void 0),
      conversations: conversations,
      projects: projects,
      files: Object.create(null),
    };
  }
  let s = await unzipFile(await readFile(e)),
    textDecoder = new TextDecoder(),
    a = (b) => {
      let w = s[b];
      return w ? (safeParseJSON(textDecoder.decode(w), !1) ?? void 0) : void 0;
    },
    g;
  try {
    let b = s["conversations.json"];
    g = b ? jsonParse(textDecoder.decode(b)) : void 0;
  } catch {
    throw Error("export conversations.json is not valid JSON");
  }
  let S =
      a("projects.json") ??
      Object.keys(s).flatMap((b) => (b.startsWith("projects/") && b.endsWith(".json") ? [a(b)].flat() : [])),
    { conversations: conversations, projects: projects } = pt().parse({ conversations: g, projects: S }),
    T = exportSummary(
      a("manifest.json"),
      conversations,
      projects,
      lenientArrayOf(u({ uuid: o() })).parse(a("users.json"))[0]?.uuid,
    ),
    create = Object.create(null);
  for (let [b, w] of Object.entries(s)) {
    if (!b.startsWith("files/") || b.endsWith("/")) continue;
    let P = basename(b);
    if (P.length === 0 || !wt.test(P)) continue;
    create[P] = w;
  }
  return { manifest: T, conversations: conversations, projects: projects, files: create };
}
/**
 * 读取导出文件、写入 projects/ 下的转录与 files/ 附件。
 */
//@ chunk-sdzpqjn8.js:31263-35092 placement
async function importConversations(e, n) {
  let s = await readExportFile(e),
    r = getProjectDir(n.cwd),
    a = kt(),
    storageV5 = n.storageV5,
    S = getTranscriptStorageKey(join(r, "00000000-0000-0000-0000-000000000000.jsonl"), storageV5) !== void 0,
    flattened = s.projects.flatMap((project) => {
      let x = It(project);
      return x === null ? [] : [{ project: project, dirName: x }];
    }),
    conversations = s.conversations,
    T = {
      conversations: 0,
      skipped: 0,
      messages: 0,
      projects: 0,
      docs: 0,
      files: 0,
      artifacts: 0,
      fileEditsFailed: 0,
      manifestDiff: [],
      jsonlPaths: [],
      titles: [],
      createdAts: [],
      updatedAts: [],
      projectList: flattened.map(({ project: project, dirName: dirName }) => ({
        uuid: project.uuid,
        name: project.name,
        dirName: dirName,
      })),
      conversationProjects: {},
      attachmentFiles: {},
    };
  if (!n.dryRun)
    (await $t(r, S ? storageV5 : void 0),
      await mkdir(join(n.cwd, "projects"), { recursive: !0, mode: 448 }),
      await mkdir(join(n.cwd, "files"), { recursive: !0, mode: 448 }));
  let Z = (f) => {
      let trimmed = f.name.trim();
      if (trimmed && trimmed !== "New conversation") return trimmed;
      let M = f.chat_messages.find((chat_message) => chat_message.sender === "human")?.text ?? "";
      return truncateToLength(M.trim(), 60) || "Untitled";
    },
    create = Object.create(null);
  for (let f of conversations)
    for (let chat_message of f.chat_messages)
      for (let file of chat_message.files) create[file.file_uuid] = file.file_name;
  let w = new Set();
  for (let { project: project, dirName: dirName } of flattened) {
    let M = join(n.cwd, "projects", dirName);
    if (!n.dryRun) await mkdir(M, { recursive: !0, mode: 448 });
    let W = project.prompt_template?.trim();
    if (W && !n.dryRun) await tryCreateExclusive(join(M, "project-instructions.md"), W);
    for (let doc of project.docs) {
      let J = doc.filename ? at(doc.filename) : "",
        R = PROJECT_DOC_NAMES(/[a-zA-Z0-9]/.test(J) ? J : "untitled.md");
      if (((T.docs += 1), !n.dryRun)) await tryCreateExclusive(join(M, R), doc.content);
    }
    for (let file of project.files) {
      let J = s.files[file.file_uuid];
      if (!J) continue;
      (w.add(file.file_uuid), (T.files += 1));
      let R = file.file_name ? at(file.file_name) : "",
        U = PROJECT_DOC_NAMES(/[a-zA-Z0-9]/.test(R) ? R : file.file_uuid);
      if (!n.dryRun) await tryCreateExclusive(join(M, U), J);
    }
    T.projects += 1;
  }
  for (let [f, x] of Object.entries(s.files)) {
    if (w.has(f)) continue;
    let M = St(f, create[f]);
    if (!n.dryRun) await tryCreateExclusive(join(n.cwd, "files", M), x);
    T.files += 1;
  }
  let P = new Map();
  for (let f of conversations) {
    let x = hashAgentId(f.uuid, CLAUDE_AI_EXPORT_NAMESPACE),
      M = new Map(),
      W = [],
      mapped = f.chat_messages.map(() => []),
      J = async (c) => {
        let { stem: stem, extension: extension } = fileNameForArtifact(c),
          lower = `${stem}${extension}`.toLowerCase();
        for (let F = 0; F < Wt; F++) {
          let Y = (P.get(lower) ?? 0) + 1;
          P.set(lower, Y);
          let tt = PROJECT_DOC_NAMES(Y === 1 ? `${stem}${extension}` : `${stem}-${Y}${extension}`);
          if (n.dryRun || (await tryCreateExclusive(join(n.cwd, "files", tt), c.content)))
            return `files/${tt}`;
        }
        return;
      },
      R = importArtifactContent(x, n.cwd, storageV5),
      mapped_2 = f.chat_messages.map(() => []),
      m = join(r, `${x}.jsonl`),
      h = getTranscriptStorageKey(m, storageV5),
      v = n.dryRun ? !1 : await pathExists(m, h),
      O = v
        ? { texts: f.chat_messages.map(() => []), kept: [], editsFailed: 0 }
        : convertExportMessages(f.chat_messages, lt, a),
      texts = O.texts;
    T.fileEditsFailed += O.editsFailed;
    for (let { messageIndex: messageIndex, blockIndex: blockIndex, artifact: artifact } of O.kept) {
      let j = await J(artifact);
      if (j === void 0) continue;
      (W.push(j),
        (texts[messageIndex][blockIndex] += `

_Saved to ${j}_`));
      let uuid = f.chat_messages[messageIndex].uuid;
      mapped[messageIndex].push({
        toolUseId: `toolu_${hashAgentId(`${uuid}:${j}`, CLAUDE_AI_EXPORT_NAMESPACE).replaceAll("-", "")}`,
        path: j,
        content: artifact.content,
      });
    }
    T.artifacts += W.length;
    let results = await Promise.all(
        f.chat_messages.map((chat_message, I) =>
          convertExportMessage(chat_message, n.cwd, x, s.files, create, M, mapped_2[I], texts[I], mapped[I]),
        ),
      ),
      D = results;
    if (!n.dryRun && !v) {
      let c = new Map(),
        I = new Map();
      D = [];
      for (let G = 0; G < results.length; G++) {
        let j = results[G],
          F = j.parentUuid ? c.get(j.parentUuid) : void 0;
        D.push(F ? { ...j, parentUuid: F } : j);
        let uuid = j.uuid;
        for (let K of mapped[G]) {
          let H = buildToolResultMessage(K, j.uuid, j.timestamp);
          (D.push({
            ...H,
            parentUuid: uuid,
            isSidechain: !1,
            cwd: n.cwd,
            userType: "external",
            sessionId: x,
            version: "claude-export-import",
          }),
            (uuid = H.uuid));
        }
        let tt = new Set((j.parentUuid && I.get(j.parentUuid)) || []);
        for (let { fileUuid: fileUuid, rel: rel, attachable: attachable } of mapped_2[G]) {
          if (!attachable || w.has(fileUuid) || Ot.test(rel)) continue;
          if (!tt.has(fileUuid)) R.readFileState.delete(join(n.cwd, rel));
          let ct = await logImportAttachment(R, n.cwd, rel, j.uuid, fileUuid, j.timestamp);
          if (!ct) continue;
          (tt.add(fileUuid),
            D.push({
              ...ct,
              parentUuid: uuid,
              isSidechain: !1,
              cwd: n.cwd,
              userType: "external",
              sessionId: x,
              version: "claude-export-import",
            }),
            (uuid = ct.uuid));
        }
        if ((I.set(j.uuid, tt), uuid !== j.uuid)) c.set(j.uuid, uuid);
      }
    }
    (T.jsonlPaths.push(m),
      T.titles.push(Z(f)),
      T.createdAts.push(ht(f.created_at)),
      T.updatedAts.push(ht(f.updated_at)),
      (T.conversationProjects[x] = f.project_uuid ?? null));
    let sorted = [...M]
      .filter(([c]) => !w.has(c))
      .map(([, c]) => c)
      .concat(W)
      .sort();
    if (sorted.length > 0) T.attachmentFiles[x] = sorted;
    if (((T.messages += results.length), !n.dryRun)) {
      if (!(await appendImportedTranscript(m, D, h))) {
        T.skipped += 1;
        continue;
      }
    }
    T.conversations += 1;
  }
  return ((T.manifestDiff = formatImportSummary(s.manifest, T)), T);
}
/**
 * 子命令入口（需 CLAUDE_IMPORT_CONVERSATIONS、--cwd、大小上限）。
 */
//@ chunk-sdzpqjn8.js:35092-36785 placement
async function importConversationsCommand(e, n, s) {
  if (!env.CLAUDE_IMPORT_CONVERSATIONS) return cliError("import-conversations is not enabled");
  if (!n.cwd) return cliError("--cwd is required");
  let r, a;
  try {
    ((r = await canonicalizePath(n.cwd, getRealPathOptions(s))),
      (a = await importConversations(e, { cwd: r, dryRun: n.dryRun, storageV5: s })));
  } catch (error) {
    logError(error);
    let y = errorMessage(error),
      X =
        y.startsWith("export file exceeds MAX_EXPORT_BYTES") ||
        y.startsWith("Archive total size is too large") ||
        y.startsWith("Suspicious compression ratio detected") ||
        y.startsWith("Archive contains too many files") ||
        (y.startsWith('File "') && y.includes("is too large:"));
    (setBgExitCause("cli_error"),
      await new Promise((T) =>
        process.stderr.write(
          `import-conversations failed: ${truncateToLength(stripControlChars(getFirstLine(y)), 400)}
` +
            (X
              ? `Import failed: the export exceeds the import size limit (IMPORT_TOO_LARGE)
`
              : `Import failed (IMPORT_ERROR)
`),
          T,
        ),
      ),
      process.exit(1));
  }
  let g = n.dryRun ? "[dry-run] " : "";
  if (
    (process.stdout
      .write(`${g}imported: conversations=${a.conversations} skipped=${a.skipped} messages=${a.messages} projects=${a.projects} docs=${a.docs} files=${a.files} artifacts=${a.artifacts}
`),
    await new Promise((S) =>
      process.stdout.write(
        jsonStringify({
          sessionIds: a.jsonlPaths.map((jsonlPath) => basename(jsonlPath, ".jsonl")),
          titles: a.titles,
          jsonlPaths: a.jsonlPaths,
          createdAts: a.createdAts,
          updatedAts: a.updatedAts,
          cwd: r,
          projects: a.projectList,
          conversationProjects: a.conversationProjects,
          attachmentFiles: a.attachmentFiles,
          counts: {
            conversations: a.conversations,
            projects: a.projects,
            files: a.files,
            docs: a.docs,
            artifacts: a.artifacts,
            fileEditsFailed: a.fileEditsFailed,
            skipped: a.skipped,
          },
        }) +
          `
`,
        S,
      ),
    ),
    a.manifestDiff.length > 0)
  )
    (setBgExitCause("cli_error"),
      await new Promise((S) =>
        process.stderr.write(
          `manifest mismatch:
  ` +
            a.manifestDiff.join(`
  `) +
            `
Import completed with mismatches (IMPORT_MANIFEST_MISMATCH)
`,
          S,
        ),
      ),
      process.exit(1));
  process.exit(0);
}
