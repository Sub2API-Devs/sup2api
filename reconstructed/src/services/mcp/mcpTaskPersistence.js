/**
 * services/mcp/mcpTaskPersistence.ts
 *
 * 2.1.316 新增：MCP 任务持久化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mzh22y2k.js (10)
 * attribution: placement 10
 */
import { deleteMcpTaskMetadata, listTaskMetadata } from "./mcpTasks.js";
import { logForDebugging } from "../../utils/debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create_16, create, create_2, create_25 } from "../../../vendor/zod/lib/index.mjs";
import {
  MAX_PERSIST_BYTES,
  persistBinaryContent,
  TRUNCATED_UNSAVED_TEXT,
  binaryNotSavedNotice,
  getBinaryBlobSavedMessage,
} from "../../utils/mcpOutputStorage.js";
import { truncateMcpContentIfNeeded, getMaxMcpOutputChars } from "../../utils/mcpValidation.js";
import {
  escapeXml_2 as escapeXml,
  truncateBeforeEscape,
  escapeXmlTruncated,
} from "../../utils/confusables.js";
import { toolResultStoreOrNull } from "../../utils/toolResultStorage.js";
import { getPlatform } from "../../utils/platform.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { sanitizeTaskLabel, LABEL_PATTERN, shortTaskLabel } from "./mcpTaskCapability.js";
import { mcpTaskKey } from "../../tasks/McpTask/mcpTaskState.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { isMcpTasksEnabled } from "./mcpTaskWorker.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isSingleShotPrintSession } from "../../bootstrap/state.js";
import { describeErrorBrief } from "./auth.js";

//@ chunk-mzh22y2k.js:12107-12214 placement
async function removeTaskMetadataSafe(taskId, storageV5) {
  try {
    await (storageV5 ? deleteMcpTaskMetadata(taskId, storageV5) : deleteMcpTaskMetadata(taskId));
  } catch (error) {
    logForDebugging(`removeMcpTaskMetadata failed: ${String(error)}`);
  }
}
//@ chunk-mzh22y2k.js:12214-12551 placement
/**
 * MCP 任务结果内容块的 schema：二进制块、文本资源与资源链接。
 */
var binaryBlockSchema = DoctorLazy(() =>
  create_16([
    create({
      data: create_2(),
      mimeType: create_2().optional(),
    }),
    create({
      source: create({
        type: create_25("base64"),
        data: create_2(),
        media_type: create_2().optional(),
      }),
    }),
    create({
      resource: create({
        blob: create_2(),
        mimeType: create_2().optional(),
      }),
    }),
  ]),
);
var textResourceSchema = DoctorLazy(() =>
  create({
    resource: create({
      uri: create_2().optional(),
      text: create_2(),
    }),
  }),
);
var resourceLinkSchema = DoctorLazy(() =>
  create({
    type: create_25("resource_link"),
    name: create_2(),
    uri: create_2(),
    description: create_2().optional(),
  }),
);
//@ chunk-mzh22y2k.js:12551-13685 placement
/**
 * 把 MCP 任务结果内容转成通知文本：二进制块先落盘，文本过长时截断，并把完整内容另存为文件、附上读取方法提示（行太长时建议用 python 按字符范围切片）。
 */
async function mcpContentToNotificationText(
  content,
  storageV5,
  serverName,
  persistBudget = MAX_PERSIST_BYTES,
) {
  let text;
  if (typeof content === "string") text = content;
  else {
    let d = [];
    for (let o of content ?? []) {
      let { text, bytesPersisted } = await blockToNotificationText(o, persistBudget, storageV5);
      persistBudget -= bytesPersisted;
      d.push(text);
    }
    text = d.join(`
`);
  }
  try {
    let d = await truncateMcpContentIfNeeded(text, serverName);
    let o = typeof d === "string" ? d : text;
    let maxMcpOutputChars = getMaxMcpOutputChars();
    if (o === text && (text.length > maxMcpOutputChars || escapeXml(text).length > maxMcpOutputChars))
      o = truncateBeforeEscape(text, maxMcpOutputChars);
    if (o === text)
      return {
        text,
      };
    if (text.length > persistBudget)
      return {
        text: o,
        savedHint: "[The portion truncated above was not saved: the per-result persist budget is exhausted.]",
      };
    let c = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let l = await persistBinaryContent(Buffer.from(text, "utf8"), "text/plain", c, undefined, storageV5);
    if ("error" in l) {
      if (toolResultStoreOrNull() !== undefined)
        return {
          text: o,
          savedHint: TRUNCATED_UNSAVED_TEXT,
        };
      return {
        text: o,
      };
    }
    persistBudget -= l.size;
    let u = getPlatform() === "windows" ? "python" : "python3";
    let replaced = l.filepath.replaceAll("\\", "/").replaceAll("'", "'\\''");
    let k = hasReadableLines(text)
      ? "use Read to retrieve the portion truncated above"
      : `its lines are too long for Read's offset/limit \u2014 slice by character range via Bash instead, e.g. ${u} -c 'print(open("${replaced}").read()[A:B])' in ~${MAX_SLICE_CHARS.toLocaleString()}-char spans`;
    return {
      text: o,
      savedHint: `[The complete ${text.length}-character output was saved to ${l.filepath}; ${k}.]`,
    };
  } catch {
    return {
      text: truncateToLength(text, getMaxMcpOutputChars()),
    };
  }
}
//@ chunk-mzh22y2k.js:13685-13697 placement
/**
 * 按字符切片时允许的最大跨度（80000）。
 */
var MAX_SLICE_CHARS = 80000;
//@ chunk-mzh22y2k.js:13697-13822 placement
function hasReadableLines(text) {
  let a = 0;
  let i = 0;
  for (;;) {
    let index = text.indexOf(
      `
`,
      a,
    );
    if ((index === -1 ? text.length : index) - a > MAX_SLICE_CHARS) return false;
    if (index === -1) return i > 0;
    i++;
    a = index + 1;
  }
}
//@ chunk-mzh22y2k.js:13822-15485 placement
/**
 * 把一个 MCP 内容块转成文本：文本直接返回；文本资源与资源链接给出简述；图片/文档等 base64 数据在预算内保存成文件并返回保存说明。
 */
async function blockToNotificationText(block, budget, storageV5) {
  if (block.type === "text" && typeof block.text === "string")
    return {
      text: block.text,
      bytesPersisted: 0,
    };
  let parsed = binaryBlockSchema().safeParse(block);
  if (!parsed.success) {
    let n = textResourceSchema().safeParse(block);
    if (n.success) {
      let { uri, text } = n.data.resource;
      return {
        text: uri ? `[Resource at ${uri}] ${text}` : text,
        bytesPersisted: 0,
      };
    }
    let c = resourceLinkSchema().safeParse(block);
    if (c.success) {
      let { name: l, uri, description } = c.data;
      return {
        text: `[Resource link: ${l}] ${uri}${description ? ` (${description})` : ""}`,
        bytesPersisted: 0,
      };
    }
    return {
      text: `[${block.type}]`,
      bytesPersisted: 0,
    };
  }
  let binary =
    "source" in parsed.data
      ? {
          data: parsed.data.source.data,
          mimeType: parsed.data.source.media_type,
        }
      : "resource" in parsed.data
        ? {
            data: parsed.data.resource.blob,
            mimeType: parsed.data.resource.mimeType,
          }
        : {
            data: parsed.data.data,
            mimeType: parsed.data.mimeType,
          };
  let approxBytes = (binary.data.length * 3) / 4;
  if (approxBytes > MAX_PERSIST_BYTES)
    return {
      text: `[${block.type} content too large to save]`,
      bytesPersisted: 0,
    };
  if (approxBytes > budget)
    return {
      text: `[${block.type} content skipped: per-result persist budget exhausted]`,
      bytesPersisted: 0,
    };
  let decoded;
  try {
    decoded = atob(binary.data);
  } catch {
    logForDebugging("MCP task result block is not valid base64", {
      level: "error",
    });
    return {
      text: `[${block.type} content not saved: the server sent data that is not valid base64]`,
      bytesPersisted: 0,
    };
  }
  try {
    let n = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let c = await persistBinaryContent(
      Buffer.from(decoded, "latin1"),
      binary.mimeType,
      n,
      undefined,
      storageV5,
    );
    if ("error" in c) {
      if (toolResultStoreOrNull() !== undefined)
        return {
          text: binaryNotSavedNotice(binary.mimeType, decoded.length),
          bytesPersisted: 0,
        };
      return {
        text: `[${block.type} content (${binary.mimeType ?? "unknown type"}) could not be saved to disk: ${c.error}]`,
        bytesPersisted: 0,
      };
    }
    return {
      text: getBinaryBlobSavedMessage(c.filepath, binary.mimeType, c.size, `[${block.type} result] `),
      bytesPersisted: c.size,
    };
  } catch (error) {
    logForDebugging(`persisting MCP task result block failed: ${String(error)}`, {
      level: "error",
    });
    return {
      text: `[${block.type}]`,
      bytesPersisted: 0,
    };
  }
}
//@ chunk-mzh22y2k.js:15485-15557 placement
/**
 * 匹配控制/格式字符与变体选择符的正则。
 */
var MAX_STATUS_MESSAGE_CHARS = 1e4;
var CONTROL_CHARS_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu;
//@ chunk-mzh22y2k.js:15557-15712 placement
/**
 * 规范化 MCP 任务状态消息：去控制字符、压缩空格，过长截断。
 */
function boundMcpStatusMessage(statusMessage) {
  if (statusMessage === undefined) return;
  let trimmed = statusMessage.replace(CONTROL_CHARS_RE, " ").replace(/ {2,}/g, " ").trim();
  if (trimmed === "") return;
  return trimmed.length > MAX_STATUS_MESSAGE_CHARS
    ? `${truncateToLength(trimmed, MAX_STATUS_MESSAGE_CHARS)}\u2026 [truncated]`
    : trimmed;
}
//@ chunk-mzh22y2k.js:15712-16202 placement
/**
 * 生成 MCP 任务完成/失败/取消时的任务通知（摘要与带结果或原因的正文，转义并截断）。
 */
function buildMcpTaskNotification(e) {
  let a = sanitizeTaskLabel(e.mcpTaskId);
  let s = `MCP task ${LABEL_PATTERN.test(a) ? a : shortTaskLabel(e.mcpTaskId)} (${mcpTaskKey(e.serverName, e.toolName)}) ${e.status}.`;
  let r = boundMcpStatusMessage(e.statusMessage) ?? "no detail";
  let d =
    e.status === "completed"
      ? (e.resultText ?? "")
      : e.status === "failed"
        ? `Task failed: ${r}`
        : e.statusMessage !== undefined
          ? `Task cancelled: ${r}`
          : "Task was cancelled by the server.";
  let o = e.resultHint
    ? `

${escapeXml(e.resultHint)}`
    : "";
  return formatTaskNotification({
    taskId: e.registryId,
    status: e.status,
    summary: escapeXml(s),
    body: `
<result>
${escapeXmlTruncated(d, getMaxMcpOutputChars() - o.length)}${o}
</result>`,
  });
}
//@ chunk-mzh22y2k.js:16202-17282 placement
/**
 * 会话恢复时还原 MCP 任务：sep2663 协议的任务交给 restoreSep2663Tasks 重新绑定并继续驱动；旧版 2025-11-25 tasks 协议的恢复记录直接删除（不取消服务端任务）。
 */
async function restoreMcpTasks(ctx) {
  if (!isMcpTasksEnabled()) return;
  let metas;
  try {
    metas = await listTaskMetadata(ctx.storageV5);
  } catch (error) {
    logFeatureBad("mcp_task_restore", "list_failed");
    logForDebugging(`restoreMcpTasks list failed: ${String(error)}`);
    return;
  }
  let filtered = metas.filter((s) => s.protocol === "sep2663");
  if (filtered.length > 0 && !isSingleShotPrintSession()) {
    let { requestDialog } = ctx;
    let { createSep2663TaskBinding } = require("./chunk-8t8n4kdh.js");
    let { restoreSep2663Tasks } = require("./chunk-g25jqyhb.js");
    restoreSep2663Tasks({
      metas: filtered,
      taskRegistry: ctx.taskRegistry,
      getMcpClients: ctx.getMcpClients,
      bindingFactory: (o, taskId) =>
        createSep2663TaskBinding(o, {
          taskId,
          requestDialog,
        }),
      storageV5: ctx.storageV5,
      credentials: ctx.credentials,
    }).catch((error) => logForDebugging(`restoreSep2663Tasks: ${describeErrorBrief(error)}`));
  }
  for (let s of metas) {
    if (s.protocol === "sep2663") continue;
    if (s.protocol !== undefined) {
      logForDebugging(`restoreMcpTasks: sidecar ${s.taskId} has unknown protocol '${s.protocol}'; parked`, {
        level: "error",
      });
      continue;
    }
    logForDebugging(
      `restoreMcpTasks: deleting the resume record for MCP task ${s.taskId} (server '${s.serverName}', server task ${shortTaskLabel(s.mcpTaskId)}): it used the 2025-11-25 tasks protocol, which this version no longer supports; the task was not cancelled on the server`,
    );
    removeTaskMetadataSafe(s.taskId, ctx.storageV5);
  }
  logFeatureOk("mcp_task_restore");
}
