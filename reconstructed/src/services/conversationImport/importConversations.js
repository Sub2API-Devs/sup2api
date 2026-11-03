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
import { array, unknown, string, u, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { normalizeCaseForComparison, DANGEROUS_FILES_LOWER } from "../../utils/permissions/filesystem.js";
import { TRAILING_DOTS_OR_SPACES_RE, isReservedDeviceName } from "../../utils/windowsProfileFolders.js";
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
import { identityAgentId, hashAgentId } from "../../utils/agentId.js";
import { applyPermissionRulesToPermissionContext } from "../../utils/permissions/permissions.js";
import { loadAllPermissionRulesFromDisk } from "../../utils/permissions/permissionsLoader.js";
import { commandQueueManager } from "../../utils/messageQueueManager.js";
import { mainAgentContext } from "../../utils/agentContext.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { TOOL_CATALOG } from "../../tools.js";
import { query } from "../../query.js";
import { createRemoteFileState, READ_FILE_STATE_CACHE_SIZE } from "../../utils/remoteFileState.js";
import { InstanceRegistry } from "../../utils/instanceRegistry.js";
import {
  Jce,
  createEmptyArtifactSessionStores,
  NO_OP_COLOR_ASSIGNER,
} from "../artifacts/artifactReadConsent.js";
import { UNLIMITED_RATE_LIMITER } from "../../tasks/taskLoopRegistry.js";
import { NOOP_FUNCTION_HOOK_REGISTRY } from "../../utils/hooks/functionHookNoop.js";
import { NOOP_NOTIFICATION_DRAIN } from "../queuedNotifications/queuedNotifications.js";
import { artifactReadObservationIn } from "../artifacts/readObservation.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../../utils/agentNameRegistry.js";
import { isAttachmentReadDeniedOrThrown } from "../../utils/attachments/fileAttachments.js";
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
/**
 * 匹配音频/视频扩展名的正则（导入时不当作文本处理）。
 */
var CLAUDE_AI_EXPORT_NAMESPACE = "5f3a2c5e-6b8f-4b27-9c0e-2d7f1a9b3c44";
var SAFE_ID_RE = /^[a-zA-Z0-9_-]+$/;
var AUDIO_VIDEO_EXT_RE = /\.(mp3|m4a|mp4|wav|ogg|oga|opus|flac|aac|webm)$/i;
//@ chunk-sdzpqjn8.js:16911-17034 placement
/**
 * 宽松数组 schema：非数组视为空，元素逐个校验，丢弃不合法的。
 */
function lenientArrayOf(e) {
  return array(unknown())
    .catch([])
    .transform((n) =>
      n.flatMap((s) => {
        let r = e.safeParse(s);
        return r.success ? [r.data] : [];
      }),
    );
}
//@ chunk-sdzpqjn8.js:17034-18087 placement
/**
 * 导出摘要的 schema（账号、各对话/项目的条数）。
 */
var optionalString = DoctorLazy(() => string().optional().catch(undefined));
var userFileRefSchema = DoctorLazy(() =>
  u({
    file_uuid: string(),
    file_name: optionalString(),
  }),
);
var contentPartInputSchema = DoctorLazy(() =>
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
    .catch(undefined),
);
var chatMessageSchema = DoctorLazy(() =>
  u({
    uuid: string(),
    parent_message_uuid: string().nullish().catch(null),
    sender: string().catch("assistant"),
    text: string().catch(""),
    content: lenientArrayOf(
      u({
        type: string(),
        text: optionalString(),
        name: optionalString(),
        input: contentPartInputSchema(),
      }),
    ),
    created_at: string().catch(""),
    attachments: lenientArrayOf(
      u({
        file_name: string().catch(""),
        extracted_content: string(),
      }),
    ),
    files: lenientArrayOf(userFileRefSchema()),
  }),
);
var conversationSchema = DoctorLazy(() =>
  u({
    uuid: string(),
    name: string().catch(""),
    created_at: optionalString(),
    updated_at: optionalString(),
    project_uuid: string().nullish().catch(null),
    chat_messages: lenientArrayOf(chatMessageSchema()),
  }),
);
var projectDocSchema = DoctorLazy(() =>
  u({
    uuid: string(),
    name: string().catch(""),
    prompt_template: optionalString(),
    docs: lenientArrayOf(
      u({
        filename: optionalString(),
        content: string(),
      }),
    ),
    files: lenientArrayOf(userFileRefSchema()),
  }),
);
var exportBundleSchema = DoctorLazy(() =>
  u({
    manifest: unknown().optional(),
    conversations: lenientArrayOf(conversationSchema()),
    projects: lenientArrayOf(projectDocSchema()),
  }).catch({
    manifest: undefined,
    conversations: [],
    projects: [],
  }),
);
var accountStatsSchema = DoctorLazy(() =>
  u({
    account_uuid: string().catch("unknown"),
    conversations: array(
      u({
        uuid: string().catch(""),
        message_count: E(),
      }),
    ),
    projects: array(
      u({
        uuid: string().catch(""),
        doc_count: E(),
      }),
    ),
  }),
);
//@ chunk-sdzpqjn8.js:18087-18144 placement
/**
 * 把任意字符串清洗成安全文件名片段（非法字符换成 _）。
 */
function sanitizeFilenameSegment(e) {
  return e.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
//@ chunk-sdzpqjn8.js:18144-18193 placement
/**
 * 安全文件名片段，最多 128 字符，空时用 "file"。
 */
function safeFilenameSegment(e) {
  return sanitizeFilenameSegment(e).slice(0, 128) || "file";
}
//@ chunk-sdzpqjn8.js:18193-18516 placement
function PROJECT_DOC_NAMES(e) {
  let replaced = normalizeCaseForComparison(e).replace(TRAILING_DOTS_OR_SPACES_RE, "");
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
/**
 * 在文件名里拼上 file_uuid（有值时）。
 */
function fileUuidFilename(e, n) {
  return typeof n === "string" && n !== "" ? `${e}-${safeFilenameSegment(n)}` : e;
}
//@ chunk-sdzpqjn8.js:18586-18703 placement = tryCreateExclusive (1)
async function tryCreateExclusive(e, n) {
  return writeFile(e, n, {
    mode: 384,
    flag: "wx",
  }).then(
    () => true,
    (error) => {
      if (error.code !== "EEXIST") throw error;
      return false;
    },
  );
}
//@ chunk-sdzpqjn8.js:18703-18774 placement
/**
 * 非无盘会话时创建目录（权限 0700）。
 */
async function ensureDirUnlessDiskless(projectDir, n) {
  if (n) return;
  await mkdir(projectDir, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-sdzpqjn8.js:18774-18913 placement
async function pathExists(e, n) {
  if (n) {
    let s = await n.backend.statMeta(n.key);
    return s.ok || s.error.code !== "NotFound";
  }
  return stat(e).then(
    () => true,
    () => false,
  );
}
//@ chunk-sdzpqjn8.js:18913-19384 placement
async function appendImportedTranscript(e, n, transcriptStorageKey) {
  if (transcriptStorageKey && n.length > 0) {
    if (await pathExists(e, transcriptStorageKey)) return false;
    let a = await transcriptStorageKey.backend.append(
      transcriptStorageKey.key,
      n.map((g) => ({
        data:
          jsonStringify(g) +
          `
`,
      })),
    );
    if (a.ok) return true;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `transcript import append failed: ${a.error.code}`,
        "transcript import append failed",
      ),
      {
        cause: a.error,
      },
    );
  }
  if (transcriptStorageKey)
    await mkdir(dirname(e), {
      recursive: true,
      mode: 448,
    });
  let r =
    n.map((a) => jsonStringify(a)).join(`
`) +
    (n.length
      ? `
`
      : "");
  return writeFile(e, r, {
    mode: 384,
    flag: "wx",
  }).then(
    () => true,
    (error) => {
      if (error.code !== "EEXIST") throw error;
      return false;
    },
  );
}
//@ chunk-sdzpqjn8.js:19384-19474 placement
/**
 * 取消息的正文文本（优先 content 里的 text 块，否则 message.text）。
 */
function messageText(e) {
  return e.content.find((n) => n.type === "text" && n.text !== undefined)?.text ?? e.text;
}
//@ chunk-sdzpqjn8.js:19474-19646 placement
function exportMessageText(e, n) {
  let s = messageText(e);
  let joined = e.attachments
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
/**
 * 标题扩展名最多保留的字符数（64）。
 */
var ARTIFACTS = "artifacts";
var CREATE_FILE = "create_file";
var STR_REPLACE = "str_replace";
var MAX_ARTIFACT_UPDATE_ITEMS = 1000;
var DEFAULT_MESSAGE_CHAR_BUDGET = 67108864;
var DEFAULT_TOTAL_CHAR_CAP = 4 * DEFAULT_MESSAGE_CHAR_BUDGET;
var MIN_FILE_TEXT_CHARS = 4096;
var CHAR_TO_TOKEN_ESTIMATE = 64;
var STR_REPLACE_PENALTY_DIVISOR = 100;
var MAX_CODE_UNITS_IN_DROP = 200;
var MAX_TITLE_EXTENSION_CHARS = 64;
//@ chunk-sdzpqjn8.js:19761-19919 placement
function replaceFirstText(content, oldStr, newStr) {
  if (newStr === undefined) return;
  if (content === undefined) return newStr;
  if (oldStr === undefined) return;
  let r = content.includes(oldStr) ? oldStr : oldStr.trim();
  if (r === "") return;
  return content.replace(r, () => newStr);
}
//@ chunk-sdzpqjn8.js:19919-20093 placement
function replaceUniqueText(content, oldStr, newStr) {
  if (content === undefined || oldStr === undefined || oldStr === "") return;
  let index = content.indexOf(oldStr);
  if (index === -1 || content.indexOf(oldStr, index + oldStr.length) !== -1) return;
  return content.slice(0, index) + (newStr ?? "") + content.slice(index + oldStr.length);
}
//@ chunk-sdzpqjn8.js:20093-20603 placement = EXTENSION_TO_LANGUAGE (0.346)
/**
 * 代码块语言名到文件扩展名的映射（导入对话时给代码工件取文件名），Qt 是这些扩展名加纯文本类扩展名的集合。
 */
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
);
var TEXT_ARTIFACT_EXTENSIONS = new Set([
  ...CODE_LANGUAGE_EXTENSIONS.values(),
  ".txt",
  ".csv",
  ".tsv",
  ".log",
]);
//@ chunk-sdzpqjn8.js:20603-20916 layout
/**
 * Artifact 类型对应的文件扩展名（html、jsx、md、svg、mmd，代码按语言，默认 .txt）。
 */
function artifactExtension(type, language) {
  switch (type) {
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
      return CODE_LANGUAGE_EXTENSIONS.get(language.trim().toLowerCase()) ?? ".txt";
    default:
      return ".txt";
  }
}
//@ chunk-sdzpqjn8.js:20916-21044 placement
function splitFileExtension(e) {
  let index = e.lastIndexOf(".");
  return index > 0 && index < e.length - 1
    ? {
        stem: e.slice(0, index),
        extension: e.slice(index),
      }
    : {
        stem: e,
        extension: "",
      };
}
//@ chunk-sdzpqjn8.js:21044-21431 placement
function fileNameForArtifact(e) {
  let replaced = e.title.replace(TRAILING_DOTS_OR_SPACES_RE, "");
  let { stem, extension } =
    e.kind === "file"
      ? splitFileExtension(replaced)
      : {
          stem: replaced,
          extension: artifactExtension(e.type, e.language),
        };
  if (e.kind === "file") {
    extension = sanitizeFilenameSegment(extension);
    if (!TEXT_ARTIFACT_EXTENSIONS.has(extension.toLowerCase())) {
      stem += extension;
      extension = extension === "" ? "" : ".txt";
    }
  } else if (stem.length > extension.length && stem.toLowerCase().endsWith(extension))
    stem = stem.slice(0, -extension.length);
  stem = safeFilenameSegment(stem).replace(/^\.+/, "").replace(TRAILING_DOTS_OR_SPACES_RE, "");
  return {
    stem: /[a-zA-Z0-9]/.test(stem) ? stem : e.kind,
    extension,
  };
}
//@ chunk-sdzpqjn8.js:21431-21742 placement
function MIME_TYPE_EXTENSIONS(type, language) {
  switch (type) {
    case "text/markdown":
      return;
    case "application/vnd.ant.code":
      return truncateToLength(language.trim(), MAX_TITLE_EXTENSION_CHARS);
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
  let n = artifactHeading(e);
  let s =
    e.kind === "file"
      ? truncateToLength(
          splitFileExtension(e.title).extension.slice(1).toLowerCase(),
          MAX_TITLE_EXTENSION_CHARS,
        )
      : MIME_TYPE_EXTENSIONS(e.type, e.language);
  if (s === undefined)
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
/**
 * 生成 “Artifact 已更新，最终版本见下” 的说明文本。
 */
function artifactUpdatedText(e) {
  return `${artifactHeading(e)} \u2014 updated; final version below.`;
}
//@ chunk-sdzpqjn8.js:22171-22249 placement
/**
 * Artifact 内容因体积超限未导入时插入的说明。
 */
var ARTIFACT_CONTENT_OMITTED_TEXT = "_Artifact content from this point on was not imported (size limit)._";
//@ chunk-sdzpqjn8.js:22249-22289 placement
/**
 * 创建导入预算（已用字符与上限）。
 */
function createImportBudget(cap = DEFAULT_TOTAL_CHAR_CAP) {
  return {
    spent: 0,
    cap,
  };
}
//@ chunk-sdzpqjn8.js:22289-24883 placement
/**
 * 把导出的消息树（parent_message_uuid）线性化并转换为转录消息，含 Artifact 更新。
 */
function convertExportMessages(
  chatMessages,
  n = DEFAULT_MESSAGE_CHAR_BUDGET,
  importBudget = createImportBudget(),
) {
  let r = new Map();
  chatMessages.forEach((m, h) => {
    if (!r.has(m.uuid)) r.set(m.uuid, h);
  });
  let a = (m) => {
    let parentMessageUuid = chatMessages[m].parent_message_uuid;
    let v = typeof parentMessageUuid === "string" ? r.get(parentMessageUuid) : undefined;
    return v === undefined || v === m ? undefined : v;
  };
  let g = new Map();
  let S = [];
  chatMessages.forEach((m, h) => {
    let v = a(h);
    if (v === undefined) {
      S.push(h);
      return;
    }
    let O = g.get(v);
    if (O) O.push(h);
    else g.set(v, [h]);
  });
  let y = chatMessages.length - 1;
  for (let j = 0; j < chatMessages.length; j++) {
    let h = g.get(y);
    if (h === undefined || h.length === 0) break;
    y = h.at(-1);
  }
  let X = new Map();
  let editsFailed = 0;
  let mapped = chatMessages.map((m) =>
    m.content.map(() => {
      return;
    }),
  );
  let b = new Set();
  let w = 0;
  let P = (m) => {
    w += m;
    importBudget.spent += m;
  };
  let f = () => w > n || importBudget.spent > importBudget.cap;
  let x = [];
  let M = (m, inherited, marked) => {
    let O = chatMessages[m];
    let L = marked;
    if (O.sender === "human")
      return {
        state: inherited,
        marked: L,
      };
    let N;
    O.content.forEach((D, V) => {
      let input = D.input;
      if (D.type !== "tool_use" || input === undefined) return;
      let I = D.name === ARTIFACTS;
      let G = D.name === CREATE_FILE || D.name === STR_REPLACE;
      let j =
        I && input.id !== undefined
          ? `artifact:${input.id}`
          : G && input.path !== undefined
            ? `file:${input.path}`
            : undefined;
      if (j === undefined) return;
      if (f()) {
        if (!L) {
          x.push({
            i: m,
            b: V,
          });
          L = true;
        }
        return;
      }
      let F = (N ?? inherited).get(j);
      let Y = F?.content.length ?? 0;
      let K =
        (I && input.command === "update" && !input.content) || D.name === STR_REPLACE
          ? Math.ceil((Y * (input.old_str?.length ?? 0)) / STR_REPLACE_PENALTY_DIVISOR)
          : 0;
      P(Math.max(MIN_FILE_TEXT_CHARS, input.content?.length ?? 0, input.file_text?.length ?? 0, Y) + K);
      if (f()) {
        if (!L) {
          x.push({
            i: m,
            b: V,
          });
          L = true;
        }
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
              : undefined;
      else if (D.name === CREATE_FILE) H = input.file_text;
      else {
        H = replaceUniqueText(F?.content, input.old_str, input.new_str);
        if (H === undefined && F !== undefined) editsFailed += 1;
      }
      if (H === undefined) return;
      let it = {
        kind: F?.kind ?? (I ? "artifact" : "file"),
        title:
          F?.title ??
          (sanitizeDisplayText(I ? (input.title ?? "") : ((input.path ?? "").split(/[/\\]/).pop() ?? ""), {
            drop: /`/g,
            maxCodeUnits: MAX_CODE_UNITS_IN_DROP,
          }) ||
            "Untitled"),
        type: F?.type ?? (I ? (input.type ?? "") : ""),
        language: F?.language ?? (I ? (input.language ?? "") : ""),
        content: H,
        version: (F?.version ?? 0) + 1,
        final: false,
      };
      if (N === undefined) {
        P(inherited.size * CHAR_TO_TOKEN_ESTIMATE);
        N = new Map(inherited);
      }
      N.set(j, it);
      mapped[m][V] = it;
    });
    return {
      state: N ?? inherited,
      marked: L,
    };
  };
  let weakSet = new WeakSet();
  let k = (m) => {
    let h = [
      {
        i: m,
        inherited: new Map(),
        marked: false,
      },
    ];
    while (h.length > 0) {
      let { i: v, inherited, marked } = h.pop();
      if (b.has(v)) continue;
      b.add(v);
      let { state, marked: marked_2 } = M(v, inherited, marked);
      if (v === y) X = state;
      let V = g.get(v) ?? [];
      if (V.every((c) => b.has(c)) && !weakSet.has(state)) {
        weakSet.add(state);
        for (let c of state.values()) c.final = true;
      }
      for (let j = V.length - 1; j >= 0; j--)
        h.push({
          i: V[j],
          inherited: state,
          marked: marked_2,
        });
    }
  };
  S.forEach(k);
  chatMessages.forEach((m, h) => {
    if (b.has(h)) return;
    let v = new Set();
    let O = h;
    while (!v.has(O)) {
      v.add(O);
      let L = a(O);
      if (L === undefined || b.has(L)) break;
      O = L;
    }
    k(O);
  });
  let J = new Set(X.values());
  let R = [];
  let mapped_2 = mapped.map((m, messageIndex) =>
    m.map((v, blockIndex) => {
      if (v === undefined) return;
      if (!v.final) return artifactUpdatedText(v);
      if (J.has(v))
        R.push({
          messageIndex,
          blockIndex,
          artifact: v,
        });
      return formatArtifactBlock(v);
    }),
  );
  for (let m of x) mapped_2[m.i][m.b] = ARTIFACT_CONTENT_OMITTED_TEXT;
  return {
    texts: mapped_2,
    kept: R,
    editsFailed,
  };
}
//@ chunk-sdzpqjn8.js:24883-26453 placement
/**
 * 导入导出包中的 Artifact 内容（功能关闭时跳过）。
 */
function importArtifactContent(e, cwd, storageV5) {
  let tools = [];
  let defaultAppState = getDefaultAppState_2();
  let session = forkRootSessionWithProject({
    host: getRootSession().host,
    id: identityAgentId(e),
    project: {
      originalCwd: cwd,
      projectRoot: cwd,
      cwd,
    },
  });
  let toolPermissionContext = applyPermissionRulesToPermissionContext(
    defaultAppState.toolPermissionContext,
    loadAllPermissionRulesFromDisk(),
  );
  let y = {
    ...defaultAppState,
    toolPermissionContext,
  };
  return {
    messageQueue: commandQueueManager(),
    session,
    agentContext: mainAgentContext(),
    options: {
      commands: [],
      debug: false,
      mainLoopModel: getMainLoopModel(),
      tools,
      toolCatalog: TOOL_CATALOG,
      verbose: false,
      thinkingConfig: {
        type: "disabled",
        mechanical: true,
      },
      mcpClients: [],
      mcpResources: {},
      isNonInteractiveSession: true,
      runQuery: query,
      agentDefinitions: {
        activeAgents: [],
        allAgents: [],
      },
      autoCompactWindow: y.autoCompactWindow,
      fastMode: y.fastMode,
      cacheBreakerPhrase: y.cacheBreakerPhrase,
    },
    abortController: new AbortController(),
    readFileState: createRemoteFileState(READ_FILE_STATE_CACHE_SIZE),
    toolState: new InstanceRegistry(),
    toolDecisions: new Map(),
    permissionRelays: Jce,
    getAppState: () => y,
    setAppState: () => {},
    getAdvisorSetting: () => y.advisorModel,
    getMcp: () => y.mcp,
    getProactivityLevel: () => y.proactivityLevel,
    getWebBrowser: () => y.webBrowser,
    setToolPermissionContext: () => {},
    setSessionToolPermissionContext: () => {},
    taskRegistry: UNLIMITED_RATE_LIMITER,
    sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
    queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
    setWebBrowserSlice: () => {},
    setArtifactReadVersion: () => {},
    getArtifactReadObservation: artifactReadObservationIn(() => y),
    artifactRegistries: createEmptyArtifactSessionStores(),
    setArtifactContractTarget: () => {},
    getArtifactContractTarget: () => ({
      targetSlug: undefined,
      pins: {},
    }),
    enqueuePendingMemoryUpdate: () => {},
    agentLifecycle: NOOP_AGENT_NAME_REGISTRY,
    teammateColors: NO_OP_COLOR_ASSIGNER,
    rootToolSurface: {
      tools,
      mainLoopModel: getMainLoopModel(),
    },
    messages: [],
    turnStartIndex: 0,
    getFileHistoryState: () => {
      return;
    },
    applyFileHistoryOp: () => {},
    applyAttributionOp: () => {},
    markPrResolvedThisSession: () => {},
    isUltrareviewOverageConfirmed: () => false,
    markUltrareviewOverageConfirmed: () => {},
    storageV5,
  };
}
//@ chunk-sdzpqjn8.js:26453-26692 placement
function redactAttachmentPaths(fileAttachment, n) {
  if (typeof fileAttachment.filename === "string") fileAttachment.filename = n;
  if (typeof fileAttachment.displayPath === "string") fileAttachment.displayPath = n;
  let content = fileAttachment.content;
  let file = content?.file;
  if (file && typeof file.filePath === "string") file.filePath = n;
  if (content?.type === "pdf" && file && "base64" in file) delete file.base64;
}
//@ chunk-sdzpqjn8.js:26692-27042 placement
async function logImportAttachment(toolUseContext, cwd, s, uuid, fileUuid, timestamp) {
  try {
    if (isAttachmentReadDeniedOrThrown(s, getToolPermissionContext(toolUseContext))) return null;
    let fileAttachment = await generateFileAttachment(
      join(cwd, s),
      toolUseContext,
      "tengu_import_attachment_success",
      "tengu_import_attachment_error",
      "at-mention",
    );
    if (!fileAttachment) return null;
    redactAttachmentPaths(fileAttachment, s);
    return createAttachmentMessage(fileAttachment, {
      now: () => timestamp,
      uuid: () => hashAgentId(`${uuid}:${fileUuid}:attachment`, CLAUDE_AI_EXPORT_NAMESPACE),
    });
  } catch (error) {
    logForDebugging(`import attachment enrichment failed: ${String(error)}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-sdzpqjn8.js:27042-27362 placement
function buildToolResultMessage(e, uuid, timestamp) {
  return {
    type: "user",
    uuid: hashAgentId(`${uuid}:${e.toolUseId}:result`, CLAUDE_AI_EXPORT_NAMESPACE),
    timestamp,
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: e.toolUseId,
          content: `File created successfully at: ${e.path}`,
        },
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
//@ chunk-sdzpqjn8.js:27362-29147 placement
/**
 * 转换一条导出消息（文本、附件、工具调用）为转录行。
 */
async function convertExportMessage(chatMessage, cwd, sessionId, files, a, g, S, y, X) {
  let T = {
    parentUuid: chatMessage.parent_message_uuid ?? null,
    isSidechain: false,
    uuid: chatMessage.uuid,
    timestamp: chatMessage.created_at,
    cwd,
    userType: "external",
    sessionId,
    version: "claude-export-import",
  };
  if (chatMessage.sender === "human") {
    let w = [];
    let P = [];
    let f = (R) => sanitizeFilenameSegment(a[R.file_uuid] ?? "").length <= 128;
    let x = (R) => `files/${fileUuidFilename(R.file_uuid, a[R.file_uuid])}`;
    let M = (file) => {
      let U = x(file);
      g.set(file.file_uuid, U);
      if (!S.some((m) => m.fileUuid === file.file_uuid))
        S.push({
          fileUuid: file.file_uuid,
          rel: U,
          attachable: f(file),
        });
      return `@"${U}"`;
    };
    let W = new Set();
    for (let file of chatMessage.files) {
      if (W.has(file.file_uuid)) continue;
      W.add(file.file_uuid);
      let U = files[file.file_uuid];
      if (!U) continue;
      let m = Ph(Buffer.from(U));
      if (m)
        try {
          let { block } = await maybeResizeAndDownsampleImageBlock({
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
    let k = exportMessageText(chatMessage, P);
    let content =
      w.length > 0
        ? k.trim().length > 0
          ? [
              ...w,
              {
                type: "text",
                text: k,
              },
            ]
          : w
        : k;
    return {
      ...T,
      type: "user",
      message: {
        role: "user",
        content,
      },
    };
  }
  let flattened = chatMessage.content.flatMap((w, P) => {
    let f = w.type === "text" && w.text !== undefined && w.text.trim() !== "" ? w.text : y[P];
    return f !== undefined
      ? [
          {
            type: "text",
            text: f,
            citations: [],
          },
        ]
      : [];
  });
  for (let w of X)
    flattened.push({
      type: "tool_use",
      id: w.toolUseId,
      name: FILE_WRITE_TOOL_NAME,
      input: {
        file_path: w.path,
        content: w.content,
      },
    });
  let b = messageText(chatMessage);
  return {
    ...T,
    type: "assistant",
    requestId: undefined,
    message: {
      diagnostics: null,
      id: chatMessage.uuid,
      type: "message",
      role: "assistant",
      model: "claude-export-import",
      content:
        flattened.length > 0
          ? flattened
          : [
              {
                type: "text",
                text: b.trim() ? b : NO_CONTENT_MESSAGE,
                citations: [],
              },
            ],
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
/**
 * 解析时间戳字符串为毫秒数，非法返回 null。
 */
function parseTimestamp(e) {
  let n = typeof e === "string" ? Date.parse(e) : NaN;
  return Number.isNaN(n) ? null : n;
}
//@ chunk-sdzpqjn8.js:29236-29335 placement
/**
 * 项目的存储 slug：名称 slug 加 uuid，校验不过返回 null。
 */
function projectSlugId(e) {
  let n = `${slugifyTaskName(e.name) || "project"}-${e.uuid}`;
  return SAFE_ID_RE.test(n) && n.length <= 200 ? n : null;
}
//@ chunk-sdzpqjn8.js:29335-29620 placement
function exportSummary(e, conversations, projects, r) {
  let a = accountStatsSchema().safeParse(e);
  if (a.success) return a.data;
  return {
    account_uuid: typeof r === "string" ? r : "unknown",
    conversations: conversations.map((g) => ({
      uuid: g.uuid,
      message_count: g.chat_messages.length,
    })),
    projects: projects.flatMap((g) =>
      projectSlugId(g) !== null
        ? [
            {
              uuid: g.uuid,
              doc_count: g.docs.length,
            },
          ]
        : [],
    ),
  };
}
//@ chunk-sdzpqjn8.js:29620-30157 placement
function formatImportSummary(manifest, n) {
  let s = [];
  if (manifest.conversations.length !== n.conversations + n.skipped)
    s.push(
      `conversations: manifest=${manifest.conversations.length} imported=${n.conversations + n.skipped}`,
    );
  let reduced = manifest.conversations.reduce((acc, conversation) => acc + conversation.message_count, 0);
  if (reduced !== n.messages) s.push(`messages: manifest=${reduced} imported=${n.messages}`);
  if (manifest.projects.length !== n.projects)
    s.push(`projects: manifest=${manifest.projects.length} imported=${n.projects}`);
  let reduced_2 = manifest.projects.reduce((acc, project) => acc + project.doc_count, 0);
  if (reduced_2 !== n.docs) s.push(`docs: manifest=${reduced_2} imported=${n.docs}`);
  return s;
}
//@ chunk-sdzpqjn8.js:30157-30175 placement
/**
 * 导出文件的最大字节数（1 GiB）。
 */
var MAX_EXPORT_BYTES = 1073741824;
//@ chunk-sdzpqjn8.js:30175-31263 placement
async function readExportFile(e) {
  let { size } = await stat(e);
  if (size > MAX_EXPORT_BYTES) throw Error("export file exceeds MAX_EXPORT_BYTES");
  if (!e.endsWith(".zip")) {
    let file = await readFile(e, "utf8");
    let w;
    try {
      w = jsonParse(file);
    } catch {
      throw Error("export file is not valid JSON");
    }
    let { manifest, conversations, projects } = exportBundleSchema().parse(w);
    return {
      manifest: exportSummary(manifest, conversations, projects, undefined),
      conversations,
      projects,
      files: Object.create(null),
    };
  }
  let s = await unzipFile(await readFile(e));
  let textDecoder = new TextDecoder();
  let a = (b) => {
    let w = s[b];
    return w ? (safeParseJSON(textDecoder.decode(w), false) ?? undefined) : undefined;
  };
  let conversations;
  try {
    let b = s["conversations.json"];
    conversations = b ? jsonParse(textDecoder.decode(b)) : undefined;
  } catch {
    throw Error("export conversations.json is not valid JSON");
  }
  let projects =
    a("projects.json") ??
    Object.keys(s).flatMap((key) =>
      key.startsWith("projects/") && key.endsWith(".json") ? [a(key)].flat() : [],
    );
  let { conversations: conversations_2, projects: projects_2 } = exportBundleSchema().parse({
    conversations,
    projects,
  });
  let manifest = exportSummary(
    a("manifest.json"),
    conversations_2,
    projects_2,
    lenientArrayOf(
      u({
        uuid: string(),
      }),
    ).parse(a("users.json"))[0]?.uuid,
  );
  let Z = Object.create(null);
  for (let [key, value] of Object.entries(s)) {
    if (!key.startsWith("files/") || key.endsWith("/")) continue;
    let P = basename(key);
    if (P.length === 0 || !SAFE_ID_RE.test(P)) continue;
    Z[P] = value;
  }
  return {
    manifest,
    conversations: conversations_2,
    projects: projects_2,
    files: Z,
  };
}
//@ chunk-sdzpqjn8.js:31263-35092 placement
/**
 * 读取导出文件、写入 projects/ 下的转录与 files/ 附件。
 */
async function importConversations(e, n) {
  let exportFile = await readExportFile(e);
  let projectDir = getProjectDir(n.cwd);
  let importBudget = createImportBudget();
  let storageV5 = n.storageV5;
  let S =
    getTranscriptStorageKey(join(projectDir, "00000000-0000-0000-0000-000000000000.jsonl"), storageV5) !==
    undefined;
  let flattened = exportFile.projects.flatMap((project) => {
    let x = projectSlugId(project);
    return x === null
      ? []
      : [
          {
            project,
            dirName: x,
          },
        ];
  });
  let conversations = exportFile.conversations;
  let T = {
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
    projectList: flattened.map(({ project, dirName }) => ({
      uuid: project.uuid,
      name: project.name,
      dirName,
    })),
    conversationProjects: {},
    attachmentFiles: {},
  };
  if (!n.dryRun) {
    await ensureDirUnlessDiskless(projectDir, S ? storageV5 : undefined);
    await mkdir(join(n.cwd, "projects"), {
      recursive: true,
      mode: 448,
    });
    await mkdir(join(n.cwd, "files"), {
      recursive: true,
      mode: 448,
    });
  }
  let Z = (conversation) => {
    let trimmed = conversation.name.trim();
    if (trimmed && trimmed !== "New conversation") return trimmed;
    let text = conversation.chat_messages.find((chatMessage) => chatMessage.sender === "human")?.text ?? "";
    return truncateToLength(text.trim(), 60) || "Untitled";
  };
  let b = Object.create(null);
  for (let conversation of conversations)
    for (let chatMessage of conversation.chat_messages)
      for (let file of chatMessage.files) b[file.file_uuid] = file.file_name;
  let w = new Set();
  for (let { project, dirName } of flattened) {
    let M = join(n.cwd, "projects", dirName);
    if (!n.dryRun)
      await mkdir(M, {
        recursive: true,
        mode: 448,
      });
    let trimmed = project.prompt_template?.trim();
    if (trimmed && !n.dryRun) await tryCreateExclusive(join(M, "project-instructions.md"), trimmed);
    for (let doc of project.docs) {
      let J = doc.filename ? safeFilenameSegment(doc.filename) : "";
      let R = PROJECT_DOC_NAMES(/[a-zA-Z0-9]/.test(J) ? J : "untitled.md");
      T.docs += 1;
      if (!n.dryRun) await tryCreateExclusive(join(M, R), doc.content);
    }
    for (let file of project.files) {
      let J = exportFile.files[file.file_uuid];
      if (!J) continue;
      w.add(file.file_uuid);
      T.files += 1;
      let R = file.file_name ? safeFilenameSegment(file.file_name) : "";
      let U = PROJECT_DOC_NAMES(/[a-zA-Z0-9]/.test(R) ? R : file.file_uuid);
      if (!n.dryRun) await tryCreateExclusive(join(M, U), J);
    }
    T.projects += 1;
  }
  for (let [key, value] of Object.entries(exportFile.files)) {
    if (w.has(key)) continue;
    let M = fileUuidFilename(key, b[key]);
    if (!n.dryRun) await tryCreateExclusive(join(n.cwd, "files", M), value);
    T.files += 1;
  }
  let P = new Map();
  for (let conversation of conversations) {
    let sessionId = hashAgentId(conversation.uuid, CLAUDE_AI_EXPORT_NAMESPACE);
    let M = new Map();
    let W = [];
    let mapped = conversation.chat_messages.map(() => []);
    let J = async (artifact) => {
      let { stem, extension } = fileNameForArtifact(artifact);
      let lower = `${stem}${extension}`.toLowerCase();
      for (let idx = 0; idx < MAX_ARTIFACT_UPDATE_ITEMS; idx++) {
        let Y = (P.get(lower) ?? 0) + 1;
        P.set(lower, Y);
        let tt = PROJECT_DOC_NAMES(Y === 1 ? `${stem}${extension}` : `${stem}-${Y}${extension}`);
        if (n.dryRun || (await tryCreateExclusive(join(n.cwd, "files", tt), artifact.content)))
          return `files/${tt}`;
      }
      return;
    };
    let R = importArtifactContent(sessionId, n.cwd, storageV5);
    let mapped_2 = conversation.chat_messages.map(() => []);
    let m = join(projectDir, `${sessionId}.jsonl`);
    let transcriptStorageKey = getTranscriptStorageKey(m, storageV5);
    let v = n.dryRun ? false : await pathExists(m, transcriptStorageKey);
    let O = v
      ? {
          texts: conversation.chat_messages.map(() => []),
          kept: [],
          editsFailed: 0,
        }
      : convertExportMessages(conversation.chat_messages, DEFAULT_MESSAGE_CHAR_BUDGET, importBudget);
    let texts = O.texts;
    T.fileEditsFailed += O.editsFailed;
    for (let { messageIndex, blockIndex, artifact } of O.kept) {
      let j = await J(artifact);
      if (j === undefined) continue;
      W.push(j);
      texts[messageIndex][blockIndex] += `

_Saved to ${j}_`;
      let uuid = conversation.chat_messages[messageIndex].uuid;
      mapped[messageIndex].push({
        toolUseId: `toolu_${hashAgentId(`${uuid}:${j}`, CLAUDE_AI_EXPORT_NAMESPACE).replaceAll("-", "")}`,
        path: j,
        content: artifact.content,
      });
    }
    T.artifacts += W.length;
    let results = await Promise.all(
      conversation.chat_messages.map((chatMessage, I) =>
        convertExportMessage(
          chatMessage,
          n.cwd,
          sessionId,
          exportFile.files,
          b,
          M,
          mapped_2[I],
          texts[I],
          mapped[I],
        ),
      ),
    );
    let D = results;
    if (!n.dryRun && !v) {
      let c = new Map();
      let I = new Map();
      D = [];
      for (let idx = 0; idx < results.length; idx++) {
        let j = results[idx];
        let F = j.parentUuid ? c.get(j.parentUuid) : undefined;
        D.push(
          F
            ? {
                ...j,
                parentUuid: F,
              }
            : j,
        );
        let uuid = j.uuid;
        for (let K of mapped[idx]) {
          let toolResultMessage = buildToolResultMessage(K, j.uuid, j.timestamp);
          D.push({
            ...toolResultMessage,
            parentUuid: uuid,
            isSidechain: false,
            cwd: n.cwd,
            userType: "external",
            sessionId,
            version: "claude-export-import",
          });
          uuid = toolResultMessage.uuid;
        }
        let tt = new Set((j.parentUuid && I.get(j.parentUuid)) || []);
        for (let { fileUuid, rel, attachable } of mapped_2[idx]) {
          if (!attachable || w.has(fileUuid) || AUDIO_VIDEO_EXT_RE.test(rel)) continue;
          if (!tt.has(fileUuid)) R.readFileState.delete(join(n.cwd, rel));
          let ct = await logImportAttachment(R, n.cwd, rel, j.uuid, fileUuid, j.timestamp);
          if (!ct) continue;
          tt.add(fileUuid);
          D.push({
            ...ct,
            parentUuid: uuid,
            isSidechain: false,
            cwd: n.cwd,
            userType: "external",
            sessionId,
            version: "claude-export-import",
          });
          uuid = ct.uuid;
        }
        I.set(j.uuid, tt);
        if (uuid !== j.uuid) c.set(j.uuid, uuid);
      }
    }
    T.jsonlPaths.push(m);
    T.titles.push(Z(conversation));
    T.createdAts.push(parseTimestamp(conversation.created_at));
    T.updatedAts.push(parseTimestamp(conversation.updated_at));
    T.conversationProjects[sessionId] = conversation.project_uuid ?? null;
    let sorted = [...M]
      .filter(([c]) => !w.has(c))
      .map(([, c]) => c)
      .concat(W)
      .sort();
    if (sorted.length > 0) T.attachmentFiles[sessionId] = sorted;
    T.messages += results.length;
    if (!n.dryRun) {
      if (!(await appendImportedTranscript(m, D, transcriptStorageKey))) {
        T.skipped += 1;
        continue;
      }
    }
    T.conversations += 1;
  }
  T.manifestDiff = formatImportSummary(exportFile.manifest, T);
  return T;
}
//@ chunk-sdzpqjn8.js:35092-36785 placement
/**
 * 子命令入口（需 CLAUDE_IMPORT_CONVERSATIONS、--cwd、大小上限）。
 */
async function importConversationsCommand(e, n, s) {
  if (!env.CLAUDE_IMPORT_CONVERSATIONS) return cliError("import-conversations is not enabled");
  if (!n.cwd) return cliError("--cwd is required");
  let cwd;
  let a;
  try {
    cwd = await canonicalizePath(n.cwd, getRealPathOptions(s));
    a = await importConversations(e, {
      cwd,
      dryRun: n.dryRun,
      storageV5: s,
    });
  } catch (error) {
    logError(error);
    let y = errorMessage(error);
    let X =
      y.startsWith("export file exceeds MAX_EXPORT_BYTES") ||
      y.startsWith("Archive total size is too large") ||
      y.startsWith("Suspicious compression ratio detected") ||
      y.startsWith("Archive contains too many files") ||
      (y.startsWith('File "') && y.includes("is too large:"));
    setBgExitCause("cli_error");
    await new Promise((resolve) =>
      process.stderr.write(
        `import-conversations failed: ${truncateToLength(stripControlChars(getFirstLine(y)), 400)}
` +
          (X
            ? `Import failed: the export exceeds the import size limit (IMPORT_TOO_LARGE)
`
            : `Import failed (IMPORT_ERROR)
`),
        resolve,
      ),
    );
    process.exit(1);
  }
  let g = n.dryRun ? "[dry-run] " : "";
  process.stdout
    .write(`${g}imported: conversations=${a.conversations} skipped=${a.skipped} messages=${a.messages} projects=${a.projects} docs=${a.docs} files=${a.files} artifacts=${a.artifacts}
`);
  await new Promise((resolve) =>
    process.stdout.write(
      jsonStringify({
        sessionIds: a.jsonlPaths.map((jsonlPath) => basename(jsonlPath, ".jsonl")),
        titles: a.titles,
        jsonlPaths: a.jsonlPaths,
        createdAts: a.createdAts,
        updatedAts: a.updatedAts,
        cwd,
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
      resolve,
    ),
  );
  if (a.manifestDiff.length > 0) {
    setBgExitCause("cli_error");
    await new Promise((resolve) =>
      process.stderr.write(
        `manifest mismatch:
  ` +
          a.manifestDiff.join(`
  `) +
          `
Import completed with mismatches (IMPORT_MANIFEST_MISMATCH)
`,
        resolve,
      ),
    );
    process.exit(1);
  }
  process.exit(0);
}
