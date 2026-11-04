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
import {
  array,
  unknown,
  stringSchema,
  objectSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { NO_BRIDGE_CONSENT } from "../../screens/repl/bridgeChannelSlot.js";
import { UNLIMITED_RATE_LIMITER } from "../../tasks/taskLoopRegistry.js";
import { NOOP_FUNCTION_HOOK_REGISTRY } from "../../utils/hooks/functionHookNoop.js";
import { NOOP_NOTIFICATION_DRAIN } from "../queuedNotifications/queuedNotifications.js";
import { artifactReadObservationIn } from "../artifacts/readObservation.js";
import { createEmptyArtifactSessionStores } from "../artifacts/artifactReadConsent.js";
import { NOOP_AGENT_NAME_REGISTRY } from "../../utils/agentNameRegistry.js";
import { NO_OP_COLOR_ASSIGNER } from "../../tools/AgentTool/agentColorManager.js";
import { isAttachmentReadDeniedOrThrown } from "../../utils/attachments/fileAttachments.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { generateFileAttachment } from "../../utils/attachments.js";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../../utils/debug.js";
import { sniffImageMediaType } from "../../../vendor/@anthropic-ai/sdk/helpers/beta/mcp.mjs";
import { maybeResizeAndDownsampleImageBlock } from "../../utils/imageResizer.js";
import { IMAGE_LIMITS } from "../../utils/mediaLimits.js";
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
function lenientArrayOf(schema) {
  return array(unknown())
    .catch([])
    .transform((items) =>
      items.flatMap((item) => {
        let parsed = schema.safeParse(item);
        return parsed.success ? [parsed.data] : [];
      }),
    );
}
//@ chunk-sdzpqjn8.js:17034-18087 placement
/**
 * 导出摘要的 schema（账号、各对话/项目的条数）。
 */
var optionalString = DoctorLazy(() => stringSchema().optional().catch(undefined));
var userFileRefSchema = DoctorLazy(() =>
  objectSchema({
    file_uuid: stringSchema(),
    file_name: optionalString(),
  }),
);
var contentPartInputSchema = DoctorLazy(() =>
  objectSchema({
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
  objectSchema({
    uuid: stringSchema(),
    parent_message_uuid: stringSchema().nullish().catch(null),
    sender: stringSchema().catch("assistant"),
    text: stringSchema().catch(""),
    content: lenientArrayOf(
      objectSchema({
        type: stringSchema(),
        text: optionalString(),
        name: optionalString(),
        input: contentPartInputSchema(),
      }),
    ),
    created_at: stringSchema().catch(""),
    attachments: lenientArrayOf(
      objectSchema({
        file_name: stringSchema().catch(""),
        extracted_content: stringSchema(),
      }),
    ),
    files: lenientArrayOf(userFileRefSchema()),
  }),
);
var conversationSchema = DoctorLazy(() =>
  objectSchema({
    uuid: stringSchema(),
    name: stringSchema().catch(""),
    created_at: optionalString(),
    updated_at: optionalString(),
    project_uuid: stringSchema().nullish().catch(null),
    chat_messages: lenientArrayOf(chatMessageSchema()),
  }),
);
var projectDocSchema = DoctorLazy(() =>
  objectSchema({
    uuid: stringSchema(),
    name: stringSchema().catch(""),
    prompt_template: optionalString(),
    docs: lenientArrayOf(
      objectSchema({
        filename: optionalString(),
        content: stringSchema(),
      }),
    ),
    files: lenientArrayOf(userFileRefSchema()),
  }),
);
var exportBundleSchema = DoctorLazy(() =>
  objectSchema({
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
  objectSchema({
    account_uuid: stringSchema().catch("unknown"),
    conversations: array(
      objectSchema({
        uuid: stringSchema().catch(""),
        message_count: numberSchema(),
      }),
    ),
    projects: array(
      objectSchema({
        uuid: stringSchema().catch(""),
        doc_count: numberSchema(),
      }),
    ),
  }),
);
//@ chunk-sdzpqjn8.js:18087-18144 placement
/**
 * 把任意字符串清洗成安全文件名片段（非法字符换成 _）。
 */
function sanitizeFilenameSegment(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_");
}
//@ chunk-sdzpqjn8.js:18144-18193 placement
/**
 * 安全文件名片段，最多 128 字符，空时用 "file"。
 */
function safeFilenameSegment(name) {
  return sanitizeFilenameSegment(name).slice(0, 128) || "file";
}
//@ chunk-sdzpqjn8.js:18193-18516 placement
function PROJECT_DOC_NAMES(name) {
  let replaced = normalizeCaseForComparison(name).replace(TRAILING_DOTS_OR_SPACES_RE, "");
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
    ? `imported-${name}`
    : name;
}
//@ chunk-sdzpqjn8.js:18516-18586 placement
/**
 * 在文件名里拼上 file_uuid（有值时）。
 */
function fileUuidFilename(fileUuid, suffix) {
  return typeof suffix === "string" && suffix !== ""
    ? `${fileUuid}-${safeFilenameSegment(suffix)}`
    : fileUuid;
}
//@ chunk-sdzpqjn8.js:18586-18703 placement (2.1.88 match: tryCreateExclusive, 1)
async function tryCreateExclusive(path, content) {
  return writeFile(path, content, {
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
async function ensureDirUnlessDiskless(projectDir, diskless) {
  if (diskless) return;
  await mkdir(projectDir, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-sdzpqjn8.js:18774-18913 placement
async function pathExists(path, storageRef) {
  if (storageRef) {
    let statResult = await storageRef.backend.statMeta(storageRef.key);
    return statResult.ok || statResult.error.code !== "NotFound";
  }
  return stat(path).then(
    () => true,
    () => false,
  );
}
//@ chunk-sdzpqjn8.js:18913-19384 placement
async function appendImportedTranscript(dir, lines, storageRef) {
  if (storageRef && lines.length > 0) {
    if (await pathExists(dir, storageRef)) return false;
    let appended = await storageRef.backend.append(
      storageRef.key,
      lines.map((line) => ({
        data:
          jsonStringify(line) +
          `
`,
      })),
    );
    if (appended.ok) return true;
    throw Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `transcript import append failed: ${appended.error.code}`,
        "transcript import append failed",
      ),
      {
        cause: appended.error,
      },
    );
  }
  if (storageRef)
    await mkdir(dirname(dir), {
      recursive: true,
      mode: 448,
    });
  let body =
    lines.map((created) => jsonStringify(created)).join(`
`) +
    (lines.length
      ? `
`
      : "");
  return writeFile(dir, body, {
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
function messageText(content) {
  return (
    content.content.find((block) => block.type === "text" && block.text !== undefined)?.text ?? content.text
  );
}
//@ chunk-sdzpqjn8.js:19474-19646 placement
function exportMessageText(message, prefixLines) {
  let text = messageText(message);
  let joined = message.attachments
    .map(
      (attachment) => `

<file name="${attachment.file_name}">
${attachment.extracted_content}
</file>`,
    )
    .join("");
  return (
    (prefixLines.length > 0
      ? `${prefixLines.join(`
`)}
`
      : "") +
    text +
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
  let needle = content.includes(oldStr) ? oldStr : oldStr.trim();
  if (needle === "") return;
  return content.replace(needle, () => newStr);
}
//@ chunk-sdzpqjn8.js:19919-20093 placement
function replaceUniqueText(content, oldStr, newStr) {
  if (content === undefined || oldStr === undefined || oldStr === "") return;
  let index = content.indexOf(oldStr);
  if (index === -1 || content.indexOf(oldStr, index + oldStr.length) !== -1) return;
  return content.slice(0, index) + (newStr ?? "") + content.slice(index + oldStr.length);
}
//@ chunk-sdzpqjn8.js:20093-20603 placement (2.1.88 match: EXTENSION_TO_LANGUAGE, 0.346)
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
function splitFileExtension(name) {
  let index = name.lastIndexOf(".");
  return index > 0 && index < name.length - 1
    ? {
        stem: name.slice(0, index),
        extension: name.slice(index),
      }
    : {
        stem: name,
        extension: "",
      };
}
//@ chunk-sdzpqjn8.js:21044-21431 placement
function fileNameForArtifact(artifact) {
  let name = artifact.title.replace(TRAILING_DOTS_OR_SPACES_RE, "");
  let { stem, extension } =
    artifact.kind === "file"
      ? splitFileExtension(name)
      : {
          stem: name,
          extension: artifactExtension(artifact.type, artifact.language),
        };
  if (artifact.kind === "file") {
    extension = sanitizeFilenameSegment(extension);
    if (!TEXT_ARTIFACT_EXTENSIONS.has(extension.toLowerCase())) {
      stem += extension;
      extension = extension === "" ? "" : ".txt";
    }
  } else if (stem.length > extension.length && stem.toLowerCase().endsWith(extension))
    stem = stem.slice(0, -extension.length);
  stem = safeFilenameSegment(stem).replace(/^\.+/, "").replace(TRAILING_DOTS_OR_SPACES_RE, "");
  return {
    stem: /[a-zA-Z0-9]/.test(stem) ? stem : artifact.kind,
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
function artifactHeading(artifact) {
  return `**${artifact.kind === "file" ? "File" : "Artifact"}: ${artifact.title}**${artifact.version > 1 ? ` (v${artifact.version})` : ""}`;
}
//@ chunk-sdzpqjn8.js:21854-22102 placement
function formatArtifactBlock(artifact) {
  let heading = artifactHeading(artifact);
  let extension =
    artifact.kind === "file"
      ? truncateToLength(
          splitFileExtension(artifact.title).extension.slice(1).toLowerCase(),
          MAX_TITLE_EXTENSION_CHARS,
        )
      : MIME_TYPE_EXTENSIONS(artifact.type, artifact.language);
  if (extension === undefined)
    return `${heading}

${artifact.content}`;
  let artifactArg = artifact.content.endsWith(`
`)
    ? artifact.content.slice(0, -1)
    : artifact.content;
  return `${heading}

${fenceCodeBlock(artifactArg, extension)}`;
}
//@ chunk-sdzpqjn8.js:22102-22171 placement
/**
 * 生成 “Artifact 已更新，最终版本见下” 的说明文本。
 */
function artifactUpdatedText(artifact) {
  return `${artifactHeading(artifact)} \u2014 updated; final version below.`;
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
  charBudget = DEFAULT_MESSAGE_CHAR_BUDGET,
  importBudget = createImportBudget(),
) {
  let indexByUuid = new Map();
  chatMessages.forEach((message, index) => {
    if (!indexByUuid.has(message.uuid)) indexByUuid.set(message.uuid, index);
  });
  let parentIndex = (index) => {
    let parentMessageUuid = chatMessages[index].parent_message_uuid;
    let parentIndex = typeof parentMessageUuid === "string" ? indexByUuid.get(parentMessageUuid) : undefined;
    return parentIndex === undefined || parentIndex === index ? undefined : parentIndex;
  };
  let childrenByParent = new Map();
  let roots = [];
  chatMessages.forEach((message, index) => {
    let parent = parentIndex(index);
    if (parent === undefined) {
      roots.push(index);
      return;
    }
    let children = childrenByParent.get(parent);
    if (children) children.push(index);
    else childrenByParent.set(parent, [index]);
  });
  let leafIndex = chatMessages.length - 1;
  for (let j = 0; j < chatMessages.length; j++) {
    let children = childrenByParent.get(leafIndex);
    if (children === undefined || children.length === 0) break;
    leafIndex = children.at(-1);
  }
  let finalState = new Map();
  let editsFailed = 0;
  let mapped = chatMessages.map((message) =>
    message.content.map(() => {
      return;
    }),
  );
  let visited = new Set();
  let spentChars = 0;
  let spend = (cost) => {
    spentChars += cost;
    importBudget.spent += cost;
  };
  let overBudget = () => spentChars > charBudget || importBudget.spent > importBudget.cap;
  let omitted = [];
  let applyBlock = (messageIndex, inherited, marked) => {
    let message = chatMessages[messageIndex];
    let inheritedMarked = marked;
    if (message.sender === "human")
      return {
        state: inherited,
        marked: inheritedMarked,
      };
    let nextState;
    message.content.forEach((content, blockIndex) => {
      let input = content.input;
      if (content.type !== "tool_use" || input === undefined) return;
      let isArtifact = content.name === ARTIFACTS;
      let isFileWrite = content.name === CREATE_FILE || content.name === STR_REPLACE;
      let artifactKey =
        isArtifact && input.id !== undefined
          ? `artifact:${input.id}`
          : isFileWrite && input.path !== undefined
            ? `file:${input.path}`
            : undefined;
      if (artifactKey === undefined) return;
      if (overBudget()) {
        if (!inheritedMarked) {
          omitted.push({
            i: messageIndex,
            b: blockIndex,
          });
          inheritedMarked = true;
        }
        return;
      }
      let previousArtifact = (nextState ?? inherited).get(artifactKey);
      let previousLength = previousArtifact?.content.length ?? 0;
      let editPenalty =
        (isArtifact && input.command === "update" && !input.content) || content.name === STR_REPLACE
          ? Math.ceil((previousLength * (input.old_str?.length ?? 0)) / STR_REPLACE_PENALTY_DIVISOR)
          : 0;
      spend(
        Math.max(
          MIN_FILE_TEXT_CHARS,
          input.content?.length ?? 0,
          input.file_text?.length ?? 0,
          previousLength,
        ) + editPenalty,
      );
      if (overBudget()) {
        if (!inheritedMarked) {
          omitted.push({
            i: messageIndex,
            b: blockIndex,
          });
          inheritedMarked = true;
        }
        return;
      }
      let artifactContent;
      if (isArtifact)
        artifactContent =
          input.command === "create" || input.command === "rewrite"
            ? input.content?.trimStart()
            : input.command === "update"
              ? input.content
                ? input.content
                : replaceFirstText(previousArtifact?.content, input.old_str, input.new_str)
              : undefined;
      else if (content.name === CREATE_FILE) artifactContent = input.file_text;
      else {
        artifactContent = replaceUniqueText(previousArtifact?.content, input.old_str, input.new_str);
        if (artifactContent === undefined && previousArtifact !== undefined) editsFailed += 1;
      }
      if (artifactContent === undefined) return;
      let artifactState = {
        kind: previousArtifact?.kind ?? (isArtifact ? "artifact" : "file"),
        title:
          previousArtifact?.title ??
          (sanitizeDisplayText(
            isArtifact ? (input.title ?? "") : ((input.path ?? "").split(/[/\\]/).pop() ?? ""),
            {
              drop: /`/g,
              maxCodeUnits: MAX_CODE_UNITS_IN_DROP,
            },
          ) ||
            "Untitled"),
        type: previousArtifact?.type ?? (isArtifact ? (input.type ?? "") : ""),
        language: previousArtifact?.language ?? (isArtifact ? (input.language ?? "") : ""),
        content: artifactContent,
        version: (previousArtifact?.version ?? 0) + 1,
        final: false,
      };
      if (nextState === undefined) {
        spend(inherited.size * CHAR_TO_TOKEN_ESTIMATE);
        nextState = new Map(inherited);
      }
      nextState.set(artifactKey, artifactState);
      mapped[messageIndex][blockIndex] = artifactState;
    });
    return {
      state: nextState ?? inherited,
      marked: inheritedMarked,
    };
  };
  let weakSet = new WeakSet();
  let walk = (startIndex) => {
    let stack = [
      {
        i: startIndex,
        inherited: new Map(),
        marked: false,
      },
    ];
    while (stack.length > 0) {
      let { i: index, inherited, marked } = stack.pop();
      if (visited.has(index)) continue;
      visited.add(index);
      let { state, marked: marked_2 } = applyBlock(index, inherited, marked);
      if (index === leafIndex) finalState = state;
      let children = childrenByParent.get(index) ?? [];
      if (children.every((child) => visited.has(child)) && !weakSet.has(state)) {
        weakSet.add(state);
        for (let artifact of state.values()) artifact.final = true;
      }
      for (let j = children.length - 1; j >= 0; j--)
        stack.push({
          i: children[j],
          inherited: state,
          marked: marked_2,
        });
    }
  };
  roots.forEach(walk);
  chatMessages.forEach((message, index) => {
    if (visited.has(index)) return;
    let seen = new Set();
    let current = index;
    while (!seen.has(current)) {
      seen.add(current);
      let parent = parentIndex(current);
      if (parent === undefined || visited.has(parent)) break;
      current = parent;
    }
    walk(current);
  });
  let finalArtifacts = new Set(finalState.values());
  let kept = [];
  let mapped_2 = mapped.map((blocks, messageIndex) =>
    blocks.map((blockIndex, blockIndex_2) => {
      if (blockIndex === undefined) return;
      if (!blockIndex.final) return artifactUpdatedText(blockIndex);
      if (finalArtifacts.has(blockIndex))
        kept.push({
          messageIndex,
          blockIndex: blockIndex_2,
          artifact: blockIndex,
        });
      return formatArtifactBlock(blockIndex);
    }),
  );
  for (let omission of omitted) mapped_2[omission.i][omission.b] = ARTIFACT_CONTENT_OMITTED_TEXT;
  return {
    texts: mapped_2,
    kept,
    editsFailed,
  };
}
//@ chunk-sdzpqjn8.js:24883-26453 placement
/**
 * 导入导出包中的 Artifact 内容（功能关闭时跳过）。
 */
function importArtifactContent(file, cwd, storageV5) {
  let tools = [];
  let defaultAppState = getDefaultAppState_2();
  let session = forkRootSessionWithProject({
    host: getRootSession().host,
    id: identityAgentId(file),
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
  let fileArg = {
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
      autoCompactWindow: fileArg.autoCompactWindow,
      fastMode: fileArg.fastMode,
      cacheBreakerPhrase: fileArg.cacheBreakerPhrase,
    },
    abortController: new AbortController(),
    readFileState: createRemoteFileState(READ_FILE_STATE_CACHE_SIZE),
    toolState: new InstanceRegistry(),
    toolDecisions: new Map(),
    permissionRelays: NO_BRIDGE_CONSENT,
    getAppState: () => fileArg,
    setAppState: () => {},
    getAdvisorSetting: () => fileArg.advisorModel,
    getMcp: () => fileArg.mcp,
    getProactivityLevel: () => fileArg.proactivityLevel,
    getWebBrowser: () => fileArg.webBrowser,
    setToolPermissionContext: () => {},
    setSessionToolPermissionContext: () => {},
    taskRegistry: UNLIMITED_RATE_LIMITER,
    sessionHooksRegistry: NOOP_FUNCTION_HOOK_REGISTRY,
    queuedNotificationsRegistry: NOOP_NOTIFICATION_DRAIN,
    setWebBrowserSlice: () => {},
    setArtifactReadVersion: () => {},
    getArtifactReadObservation: artifactReadObservationIn(() => fileArg),
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
function redactAttachmentPaths(fileAttachment, placeholder) {
  if (typeof fileAttachment.filename === "string") fileAttachment.filename = placeholder;
  if (typeof fileAttachment.displayPath === "string") fileAttachment.displayPath = placeholder;
  let content = fileAttachment.content;
  let file = content?.file;
  if (file && typeof file.filePath === "string") file.filePath = placeholder;
  if (content?.type === "pdf" && file && "base64" in file) delete file.base64;
}
//@ chunk-sdzpqjn8.js:26692-27042 placement
async function logImportAttachment(toolUseContext, cwd, relPath, uuid, fileUuid, timestamp) {
  try {
    if (isAttachmentReadDeniedOrThrown(relPath, getToolPermissionContext(toolUseContext))) return null;
    let fileAttachment = await generateFileAttachment(
      join(cwd, relPath),
      toolUseContext,
      "tengu_import_attachment_success",
      "tengu_import_attachment_error",
      "at-mention",
    );
    if (!fileAttachment) return null;
    redactAttachmentPaths(fileAttachment, relPath);
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
function buildToolResultMessage(written, uuid, timestamp) {
  return {
    type: "user",
    uuid: hashAgentId(`${uuid}:${written.toolUseId}:result`, CLAUDE_AI_EXPORT_NAMESPACE),
    timestamp,
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: written.toolUseId,
          content: `File created successfully at: ${written.path}`,
        },
      ],
    },
    toolUseResult: {
      type: "create",
      filePath: written.path,
      content: written.content,
      structuredPatch: [],
      originalFile: null,
    },
  };
}
//@ chunk-sdzpqjn8.js:27362-29147 placement
/**
 * 转换一条导出消息（文本、附件、工具调用）为转录行。
 */
async function convertExportMessage(
  chatMessage,
  cwd,
  sessionId,
  files,
  fileNamesById,
  filePathsById,
  attachments,
  artifactTexts,
  fileWrites,
) {
  let base = {
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
    let imageBlocks = [];
    let fileRefs = [];
    let isAttachable = (fileUuid) =>
      sanitizeFilenameSegment(fileNamesById[fileUuid.file_uuid] ?? "").length <= 128;
    let relativePath = (fileRef) =>
      `files/${fileUuidFilename(fileRef.file_uuid, fileNamesById[fileRef.file_uuid])}`;
    let addFileRef = (file) => {
      let rel = relativePath(file);
      filePathsById.set(file.file_uuid, rel);
      if (!attachments.some((attachment) => attachment.fileUuid === file.file_uuid))
        attachments.push({
          fileUuid: file.file_uuid,
          rel,
          attachable: isAttachable(file),
        });
      return `@"${rel}"`;
    };
    let seenFileUuids = new Set();
    for (let file of chatMessage.files) {
      if (seenFileUuids.has(file.file_uuid)) continue;
      seenFileUuids.add(file.file_uuid);
      let fileBytes = files[file.file_uuid];
      if (!fileBytes) continue;
      let mediaType = sniffImageMediaType(Buffer.from(fileBytes));
      if (mediaType)
        try {
          let { block } = await maybeResizeAndDownsampleImageBlock({
            data: Buffer.from(fileBytes),
            mediaType,
            limits: IMAGE_LIMITS,
          });
          if (block.type === "image") imageBlocks.push(block);
          else fileRefs.push(addFileRef(file));
        } catch {
          fileRefs.push(addFileRef(file));
        }
      else fileRefs.push(addFileRef(file));
    }
    let text = exportMessageText(chatMessage, fileRefs);
    let content =
      imageBlocks.length > 0
        ? text.trim().length > 0
          ? [
              ...imageBlocks,
              {
                type: "text",
                text,
              },
            ]
          : imageBlocks
        : text;
    return {
      ...base,
      type: "user",
      message: {
        role: "user",
        content,
      },
    };
  }
  let flattened = chatMessage.content.flatMap((block, blockIndex) => {
    let blockText =
      block.type === "text" && block.text !== undefined && block.text.trim() !== ""
        ? block.text
        : artifactTexts[blockIndex];
    return blockText !== undefined
      ? [
          {
            type: "text",
            text: blockText,
            citations: [],
          },
        ]
      : [];
  });
  for (let fileWrite of fileWrites)
    flattened.push({
      type: "tool_use",
      id: fileWrite.toolUseId,
      name: FILE_WRITE_TOOL_NAME,
      input: {
        file_path: fileWrite.path,
        content: fileWrite.content,
      },
    });
  let text = messageText(chatMessage);
  return {
    ...base,
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
                text: text.trim() ? text : NO_CONTENT_MESSAGE,
                citations: [],
              },
            ],
      container: null,
      context_management: null,
      stop_details: null,
      stop_reason: fileWrites.length > 0 ? "tool_use" : "end_turn",
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
function parseTimestamp(value) {
  let ms = typeof value === "string" ? Date.parse(value) : NaN;
  return Number.isNaN(ms) ? null : ms;
}
//@ chunk-sdzpqjn8.js:29236-29335 placement
/**
 * 项目的存储 slug：名称 slug 加 uuid，校验不过返回 null。
 */
function projectSlugId(project) {
  let slug = `${slugifyTaskName(project.name) || "project"}-${project.uuid}`;
  return SAFE_ID_RE.test(slug) && slug.length <= 200 ? slug : null;
}
//@ chunk-sdzpqjn8.js:29335-29620 placement
function exportSummary(accountStats, conversations, projects, accountUuid) {
  let parsed = accountStatsSchema().safeParse(accountStats);
  if (parsed.success) return parsed.data;
  return {
    account_uuid: typeof accountUuid === "string" ? accountUuid : "unknown",
    conversations: conversations.map((conversation) => ({
      uuid: conversation.uuid,
      message_count: conversation.chat_messages.length,
    })),
    projects: projects.flatMap((project) =>
      projectSlugId(project) !== null
        ? [
            {
              uuid: project.uuid,
              doc_count: project.docs.length,
            },
          ]
        : [],
    ),
  };
}
//@ chunk-sdzpqjn8.js:29620-30157 placement
function formatImportSummary(manifest, summary) {
  let problems = [];
  if (manifest.conversations.length !== summary.conversations + summary.skipped)
    problems.push(
      `conversations: manifest=${manifest.conversations.length} imported=${summary.conversations + summary.skipped}`,
    );
  let reduced = manifest.conversations.reduce((acc, conversation) => acc + conversation.message_count, 0);
  if (reduced !== summary.messages)
    problems.push(`messages: manifest=${reduced} imported=${summary.messages}`);
  if (manifest.projects.length !== summary.projects)
    problems.push(`projects: manifest=${manifest.projects.length} imported=${summary.projects}`);
  let reduced_2 = manifest.projects.reduce((acc, project) => acc + project.doc_count, 0);
  if (reduced_2 !== summary.docs) problems.push(`docs: manifest=${reduced_2} imported=${summary.docs}`);
  return problems;
}
//@ chunk-sdzpqjn8.js:30157-30175 placement
/**
 * 导出文件的最大字节数（1 GiB）。
 */
var MAX_EXPORT_BYTES = 1073741824;
//@ chunk-sdzpqjn8.js:30175-31263 placement
async function readExportFile(exportPath) {
  let { size } = await stat(exportPath);
  if (size > MAX_EXPORT_BYTES) throw Error("export file exceeds MAX_EXPORT_BYTES");
  if (!exportPath.endsWith(".zip")) {
    let file = await readFile(exportPath, "utf8");
    let parsed;
    try {
      parsed = jsonParse(file);
    } catch {
      throw Error("export file is not valid JSON");
    }
    let { manifest, conversations, projects } = exportBundleSchema().parse(parsed);
    return {
      manifest: exportSummary(manifest, conversations, projects, undefined),
      conversations,
      projects,
      files: Object.create(null),
    };
  }
  let entries = await unzipFile(await readFile(exportPath));
  let textDecoder = new TextDecoder();
  let readEntry = (name) => {
    let data = entries[name];
    return data ? (safeParseJSON(textDecoder.decode(data), false) ?? undefined) : undefined;
  };
  let conversations;
  try {
    let conversationsData = entries["conversations.json"];
    conversations = conversationsData ? jsonParse(textDecoder.decode(conversationsData)) : undefined;
  } catch {
    throw Error("export conversations.json is not valid JSON");
  }
  let projects =
    readEntry("projects.json") ??
    Object.keys(entries).flatMap((key) =>
      key.startsWith("projects/") && key.endsWith(".json") ? [readEntry(key)].flat() : [],
    );
  let { conversations: conversations_2, projects: projects_2 } = exportBundleSchema().parse({
    conversations,
    projects,
  });
  let manifest = exportSummary(
    readEntry("manifest.json"),
    conversations_2,
    projects_2,
    lenientArrayOf(
      objectSchema({
        uuid: stringSchema(),
      }),
    ).parse(readEntry("users.json"))[0]?.uuid,
  );
  let files = Object.create(null);
  for (let [key, value] of Object.entries(entries)) {
    if (!key.startsWith("files/") || key.endsWith("/")) continue;
    let fileName = basename(key);
    if (fileName.length === 0 || !SAFE_ID_RE.test(fileName)) continue;
    files[fileName] = value;
  }
  return {
    manifest,
    conversations: conversations_2,
    projects: projects_2,
    files,
  };
}
//@ chunk-sdzpqjn8.js:31263-35092 placement
/**
 * 读取导出文件、写入 projects/ 下的转录与 files/ 附件。
 */
async function importConversations(exportPath, options) {
  let exportFile = await readExportFile(exportPath);
  let projectDir = getProjectDir(options.cwd);
  let importBudget = createImportBudget();
  let storageV5 = options.storageV5;
  let supportsStorage =
    getTranscriptStorageKey(join(projectDir, "00000000-0000-0000-0000-000000000000.jsonl"), storageV5) !==
    undefined;
  let flattened = exportFile.projects.flatMap((project) => {
    let dirName = projectSlugId(project);
    return dirName === null
      ? []
      : [
          {
            project,
            dirName,
          },
        ];
  });
  let conversations = exportFile.conversations;
  let report = {
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
  if (!options.dryRun) {
    await ensureDirUnlessDiskless(projectDir, supportsStorage ? storageV5 : undefined);
    await mkdir(join(options.cwd, "projects"), {
      recursive: true,
      mode: 448,
    });
    await mkdir(join(options.cwd, "files"), {
      recursive: true,
      mode: 448,
    });
  }
  let conversationTitle = (conversation) => {
    let trimmed = conversation.name.trim();
    if (trimmed && trimmed !== "New conversation") return trimmed;
    let text = conversation.chat_messages.find((chatMessage) => chatMessage.sender === "human")?.text ?? "";
    return truncateToLength(text.trim(), 60) || "Untitled";
  };
  let fileNameById = Object.create(null);
  for (let conversation of conversations)
    for (let chatMessage of conversation.chat_messages)
      for (let file of chatMessage.files) fileNameById[file.file_uuid] = file.file_name;
  let usedFileUuids = new Set();
  for (let { project, dirName } of flattened) {
    let projectDir = join(options.cwd, "projects", dirName);
    if (!options.dryRun)
      await mkdir(projectDir, {
        recursive: true,
        mode: 448,
      });
    let trimmed = project.prompt_template?.trim();
    if (trimmed && !options.dryRun)
      await tryCreateExclusive(join(projectDir, "project-instructions.md"), trimmed);
    for (let doc of project.docs) {
      let docName = doc.filename ? safeFilenameSegment(doc.filename) : "";
      let docFileName = PROJECT_DOC_NAMES(/[a-zA-Z0-9]/.test(docName) ? docName : "untitled.md");
      report.docs += 1;
      if (!options.dryRun) await tryCreateExclusive(join(projectDir, docFileName), doc.content);
    }
    for (let file of project.files) {
      let fileData = exportFile.files[file.file_uuid];
      if (!fileData) continue;
      usedFileUuids.add(file.file_uuid);
      report.files += 1;
      let fileName = file.file_name ? safeFilenameSegment(file.file_name) : "";
      let storedName = PROJECT_DOC_NAMES(/[a-zA-Z0-9]/.test(fileName) ? fileName : file.file_uuid);
      if (!options.dryRun) await tryCreateExclusive(join(projectDir, storedName), fileData);
    }
    report.projects += 1;
  }
  for (let [key, value] of Object.entries(exportFile.files)) {
    if (usedFileUuids.has(key)) continue;
    let storedName = fileUuidFilename(key, fileNameById[key]);
    if (!options.dryRun) await tryCreateExclusive(join(options.cwd, "files", storedName), value);
    report.files += 1;
  }
  let artifactNameCounts = new Map();
  for (let conversation of conversations) {
    let sessionId = hashAgentId(conversation.uuid, CLAUDE_AI_EXPORT_NAMESPACE);
    let attachmentRelByUuid = new Map();
    let savedArtifactPaths = [];
    let mapped = conversation.chat_messages.map(() => []);
    let writeArtifact = async (artifact) => {
      let { stem, extension } = fileNameForArtifact(artifact);
      let lower = `${stem}${extension}`.toLowerCase();
      for (let idx = 0; idx < MAX_ARTIFACT_UPDATE_ITEMS; idx++) {
        let nth = (artifactNameCounts.get(lower) ?? 0) + 1;
        artifactNameCounts.set(lower, nth);
        let candidateName = PROJECT_DOC_NAMES(
          nth === 1 ? `${stem}${extension}` : `${stem}-${nth}${extension}`,
        );
        if (
          options.dryRun ||
          (await tryCreateExclusive(join(options.cwd, "files", candidateName), artifact.content))
        )
          return `files/${candidateName}`;
      }
      return;
    };
    let importState = importArtifactContent(sessionId, options.cwd, storageV5);
    let mapped_2 = conversation.chat_messages.map(() => []);
    let transcriptPath = join(projectDir, `${sessionId}.jsonl`);
    let storageRef = getTranscriptStorageKey(transcriptPath, storageV5);
    let alreadyImported = options.dryRun ? false : await pathExists(transcriptPath, storageRef);
    let converted = alreadyImported
      ? {
          texts: conversation.chat_messages.map(() => []),
          kept: [],
          editsFailed: 0,
        }
      : convertExportMessages(conversation.chat_messages, DEFAULT_MESSAGE_CHAR_BUDGET, importBudget);
    let texts = converted.texts;
    report.fileEditsFailed += converted.editsFailed;
    for (let { messageIndex, blockIndex, artifact } of converted.kept) {
      let savedRel = await writeArtifact(artifact);
      if (savedRel === undefined) continue;
      savedArtifactPaths.push(savedRel);
      texts[messageIndex][blockIndex] += `

_Saved to ${savedRel}_`;
      let uuid = conversation.chat_messages[messageIndex].uuid;
      mapped[messageIndex].push({
        toolUseId: `toolu_${hashAgentId(`${uuid}:${savedRel}`, CLAUDE_AI_EXPORT_NAMESPACE).replaceAll("-", "")}`,
        path: savedRel,
        content: artifact.content,
      });
    }
    report.artifacts += savedArtifactPaths.length;
    let results = await Promise.all(
      conversation.chat_messages.map((chatMessage, messageIndex) =>
        convertExportMessage(
          chatMessage,
          options.cwd,
          sessionId,
          exportFile.files,
          fileNameById,
          attachmentRelByUuid,
          mapped_2[messageIndex],
          texts[messageIndex],
          mapped[messageIndex],
        ),
      ),
    );
    let transcriptMessages = results;
    if (!options.dryRun && !alreadyImported) {
      let uuidByOldUuid = new Map();
      let attachedByParent = new Map();
      transcriptMessages = [];
      for (let idx = 0; idx < results.length; idx++) {
        let convertedMessage = results[idx];
        let newParentUuid = convertedMessage.parentUuid
          ? uuidByOldUuid.get(convertedMessage.parentUuid)
          : undefined;
        transcriptMessages.push(
          newParentUuid
            ? {
                ...convertedMessage,
                parentUuid: newParentUuid,
              }
            : convertedMessage,
        );
        let uuid = convertedMessage.uuid;
        for (let fileWrite of mapped[idx]) {
          let toolResultMessage = buildToolResultMessage(
            fileWrite,
            convertedMessage.uuid,
            convertedMessage.timestamp,
          );
          transcriptMessages.push({
            ...toolResultMessage,
            parentUuid: uuid,
            isSidechain: false,
            cwd: options.cwd,
            userType: "external",
            sessionId,
            version: "claude-export-import",
          });
          uuid = toolResultMessage.uuid;
        }
        let attached = new Set(
          (convertedMessage.parentUuid && attachedByParent.get(convertedMessage.parentUuid)) || [],
        );
        for (let { fileUuid, rel, attachable } of mapped_2[idx]) {
          if (!attachable || usedFileUuids.has(fileUuid) || AUDIO_VIDEO_EXT_RE.test(rel)) continue;
          if (!attached.has(fileUuid)) importState.readFileState.delete(join(options.cwd, rel));
          let attachmentMessage = await logImportAttachment(
            importState,
            options.cwd,
            rel,
            convertedMessage.uuid,
            fileUuid,
            convertedMessage.timestamp,
          );
          if (!attachmentMessage) continue;
          attached.add(fileUuid);
          transcriptMessages.push({
            ...attachmentMessage,
            parentUuid: uuid,
            isSidechain: false,
            cwd: options.cwd,
            userType: "external",
            sessionId,
            version: "claude-export-import",
          });
          uuid = attachmentMessage.uuid;
        }
        attachedByParent.set(convertedMessage.uuid, attached);
        if (uuid !== convertedMessage.uuid) uuidByOldUuid.set(convertedMessage.uuid, uuid);
      }
    }
    report.jsonlPaths.push(transcriptPath);
    report.titles.push(conversationTitle(conversation));
    report.createdAts.push(parseTimestamp(conversation.created_at));
    report.updatedAts.push(parseTimestamp(conversation.updated_at));
    report.conversationProjects[sessionId] = conversation.project_uuid ?? null;
    let sorted = [...attachmentRelByUuid]
      .filter(([fileUuid]) => !usedFileUuids.has(fileUuid))
      .map(([, rel]) => rel)
      .concat(savedArtifactPaths)
      .sort();
    if (sorted.length > 0) report.attachmentFiles[sessionId] = sorted;
    report.messages += results.length;
    if (!options.dryRun) {
      if (!(await appendImportedTranscript(transcriptPath, transcriptMessages, storageRef))) {
        report.skipped += 1;
        continue;
      }
    }
    report.conversations += 1;
  }
  report.manifestDiff = formatImportSummary(exportFile.manifest, report);
  return report;
}
//@ chunk-sdzpqjn8.js:35092-36785 placement
/**
 * 子命令入口（需 CLAUDE_IMPORT_CONVERSATIONS、--cwd、大小上限）。
 */
async function importConversationsCommand(exportPath, opts, storageV5) {
  if (!env.CLAUDE_IMPORT_CONVERSATIONS) return cliError("import-conversations is not enabled");
  if (!opts.cwd) return cliError("--cwd is required");
  let cwd;
  let result;
  try {
    cwd = await canonicalizePath(opts.cwd, getRealPathOptions(storageV5));
    result = await importConversations(exportPath, {
      cwd,
      dryRun: opts.dryRun,
      storageV5,
    });
  } catch (error) {
    logError(error);
    let errorText = errorMessage(error);
    let tooLarge =
      errorText.startsWith("export file exceeds MAX_EXPORT_BYTES") ||
      errorText.startsWith("Archive total size is too large") ||
      errorText.startsWith("Suspicious compression ratio detected") ||
      errorText.startsWith("Archive contains too many files") ||
      (errorText.startsWith('File "') && errorText.includes("is too large:"));
    setBgExitCause("cli_error");
    await new Promise((resolve) =>
      process.stderr.write(
        `import-conversations failed: ${truncateToLength(stripControlChars(getFirstLine(errorText)), 400)}
` +
          (tooLarge
            ? `Import failed: the export exceeds the import size limit (IMPORT_TOO_LARGE)
`
            : `Import failed (IMPORT_ERROR)
`),
        resolve,
      ),
    );
    process.exit(1);
  }
  let prefix = opts.dryRun ? "[dry-run] " : "";
  process.stdout
    .write(`${prefix}imported: conversations=${result.conversations} skipped=${result.skipped} messages=${result.messages} projects=${result.projects} docs=${result.docs} files=${result.files} artifacts=${result.artifacts}
`);
  await new Promise((resolve) =>
    process.stdout.write(
      jsonStringify({
        sessionIds: result.jsonlPaths.map((jsonlPath) => basename(jsonlPath, ".jsonl")),
        titles: result.titles,
        jsonlPaths: result.jsonlPaths,
        createdAts: result.createdAts,
        updatedAts: result.updatedAts,
        cwd,
        projects: result.projectList,
        conversationProjects: result.conversationProjects,
        attachmentFiles: result.attachmentFiles,
        counts: {
          conversations: result.conversations,
          projects: result.projects,
          files: result.files,
          docs: result.docs,
          artifacts: result.artifacts,
          fileEditsFailed: result.fileEditsFailed,
          skipped: result.skipped,
        },
      }) +
        `
`,
      resolve,
    ),
  );
  if (result.manifestDiff.length > 0) {
    setBgExitCause("cli_error");
    await new Promise((resolve) =>
      process.stderr.write(
        `manifest mismatch:
  ` +
          result.manifestDiff.join(`
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
export { importConversationsCommand };
