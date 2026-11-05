/**
 * tasks/McpTask/mcpTaskNotifications.ts
 *
 * 2.1.316 新增：MCP 任务通知：内容转文本、恢复任务、状态消息。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-cddhernx.js (10)
 * attribution: placement 10
 */
import { deleteMcpTaskMetadata, listTaskMetadata } from "../../services/mcp/mcpTasks.js";
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
import { sanitizeTaskLabel, LABEL_PATTERN, shortTaskLabel } from "../../services/mcp/mcpTaskCapability.js";
import { mcpTaskKey } from "./mcpTaskState.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { isMcpTasksEnabled } from "../../services/mcp/mcpTaskWorker.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-cddhernx.js:13210-13317 placement
async function removeMcpTaskMetadataSafe(taskId, storageV5) {
  try {
    await (storageV5 ? deleteMcpTaskMetadata(taskId, storageV5) : deleteMcpTaskMetadata(taskId));
  } catch (error) {
    logForDebugging(`removeMcpTaskMetadata failed: ${String(error)}`);
  }
}
//@ chunk-cddhernx.js:13317-13654 placement
/**
 * MCP 任务二进制内容块的 schema：data、source（base64）或 resource.blob 三种形状。
 */
var binaryContentBlockSchema = DoctorLazy(() =>
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
var embeddedTextResourceSchema = DoctorLazy(() =>
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
//@ chunk-cddhernx.js:13654-14787 placement
async function mcpContentToNotificationText(
  content,
  session,
  truncateOptions,
  persistBudget = MAX_PERSIST_BYTES,
) {
  let text;
  if (typeof content === "string") text = content;
  else {
    let parts = [];
    for (let block of content ?? []) {
      let { text, bytesPersisted } = await contentBlockToText(block, persistBudget, session);
      persistBudget -= bytesPersisted;
      parts.push(text);
    }
    text = parts.join(`
`);
  }
  try {
    let truncatedText = await truncateMcpContentIfNeeded(text, truncateOptions);
    let displayText = typeof truncatedText === "string" ? truncatedText : text;
    let maxMcpOutputChars = getMaxMcpOutputChars();
    if (
      displayText === text &&
      (text.length > maxMcpOutputChars || escapeXml(text).length > maxMcpOutputChars)
    )
      displayText = truncateBeforeEscape(text, maxMcpOutputChars);
    if (displayText === text)
      return {
        text,
      };
    if (text.length > persistBudget)
      return {
        text: displayText,
        savedHint: "[The portion truncated above was not saved: the per-result persist budget is exhausted.]",
      };
    let persistKey = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let persisted = await persistBinaryContent(
      Buffer.from(text, "utf8"),
      "text/plain",
      persistKey,
      undefined,
      session,
    );
    if ("error" in persisted) {
      if (toolResultStoreOrNull() !== undefined)
        return {
          text: displayText,
          savedHint: TRUNCATED_UNSAVED_TEXT,
        };
      return {
        text: displayText,
      };
    }
    persistBudget -= persisted.size;
    let pythonBin = getPlatform() === "windows" ? "python" : "python3";
    let replaced = persisted.filepath.replaceAll("\\", "/").replaceAll("'", "'\\''");
    let readHint = isMultiLineWithinWidth(text)
      ? "use Read to retrieve the portion truncated above"
      : `its lines are too long for Read's offset/limit \u2014 slice by character range via Bash instead, e.g. ${pythonBin} -c 'print(open("${replaced}").read()[A:B])' in ~${MAX_MCP_EVENT_CHARS.toLocaleString()}-char spans`;
    return {
      text: displayText,
      savedHint: `[The complete ${text.length}-character output was saved to ${persisted.filepath}; ${readHint}.]`,
    };
  } catch {
    return {
      text: truncateToLength(text, getMaxMcpOutputChars()),
    };
  }
}
//@ chunk-cddhernx.js:14787-14799 placement
/**
 * 单条 MCP 事件文本上限。
 */
var MAX_MCP_EVENT_CHARS = 80000;
//@ chunk-cddhernx.js:14799-14924 placement
function isMultiLineWithinWidth(text) {
  let lineStart = 0;
  let lineCount = 0;
  for (;;) {
    let index = text.indexOf(
      `
`,
      lineStart,
    );
    if ((index === -1 ? text.length : index) - lineStart > MAX_MCP_EVENT_CHARS) return false;
    if (index === -1) return lineCount > 0;
    lineCount++;
    lineStart = index + 1;
  }
}
//@ chunk-cddhernx.js:14924-16587 placement
/**
 * 把 MCP 任务结果中的一个内容块转为通知文本：文本原样，资源/资源链接给出描述，图片等二进制块按预算解码后写入磁盘并返回保存说明（过大、超预算、非法 base64 或写盘失败时返回对应提示）；同时返回写入字节数。
 */
async function contentBlockToText(block, persistBudget, session) {
  if (block.type === "text" && typeof block.text === "string")
    return {
      text: block.text,
      bytesPersisted: 0,
    };
  let binaryParsed = binaryContentBlockSchema().safeParse(block);
  if (!binaryParsed.success) {
    let resourceParsed = embeddedTextResourceSchema().safeParse(block);
    if (resourceParsed.success) {
      let { uri, text } = resourceParsed.data.resource;
      return {
        text: uri ? `[Resource at ${uri}] ${text}` : text,
        bytesPersisted: 0,
      };
    }
    let linkParsed = resourceLinkSchema().safeParse(block);
    if (linkParsed.success) {
      let { name: linkName, uri, description } = linkParsed.data;
      return {
        text: `[Resource link: ${linkName}] ${uri}${description ? ` (${description})` : ""}`,
        bytesPersisted: 0,
      };
    }
    return {
      text: `[${block.type}]`,
      bytesPersisted: 0,
    };
  }
  let blob =
    "source" in binaryParsed.data
      ? {
          data: binaryParsed.data.source.data,
          mimeType: binaryParsed.data.source.media_type,
        }
      : "resource" in binaryParsed.data
        ? {
            data: binaryParsed.data.resource.blob,
            mimeType: binaryParsed.data.resource.mimeType,
          }
        : {
            data: binaryParsed.data.data,
            mimeType: binaryParsed.data.mimeType,
          };
  let estimatedBytes = (blob.data.length * 3) / 4;
  if (estimatedBytes > MAX_PERSIST_BYTES)
    return {
      text: `[${block.type} content too large to save]`,
      bytesPersisted: 0,
    };
  if (estimatedBytes > persistBudget)
    return {
      text: `[${block.type} content skipped: per-result persist budget exhausted]`,
      bytesPersisted: 0,
    };
  let decoded;
  try {
    decoded = atob(blob.data);
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
    let persistKey = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let persisted = await persistBinaryContent(
      Buffer.from(decoded, "latin1"),
      blob.mimeType,
      persistKey,
      undefined,
      session,
    );
    if ("error" in persisted) {
      if (toolResultStoreOrNull() !== undefined)
        return {
          text: binaryNotSavedNotice(blob.mimeType, decoded.length),
          bytesPersisted: 0,
        };
      return {
        text: `[${block.type} content (${blob.mimeType ?? "unknown type"}) could not be saved to disk: ${persisted.error}]`,
        bytesPersisted: 0,
      };
    }
    return {
      text: getBinaryBlobSavedMessage(
        persisted.filepath,
        blob.mimeType,
        persisted.size,
        `[${block.type} result] `,
      ),
      bytesPersisted: persisted.size,
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
//@ chunk-cddhernx.js:16587-16659 placement
/**
 * MCP 状态消息长度上限与不可见字符清理。
 */
var MAX_MCP_STATUS_CHARS = 1e4;
var INVISIBLE_CHARS_RUN_REGEX = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu;
//@ chunk-cddhernx.js:16659-16813 placement
function boundMcpStatusMessage(statusMessage) {
  if (statusMessage === undefined) return;
  let trimmed = statusMessage.replace(INVISIBLE_CHARS_RUN_REGEX, " ").replace(/ {2,}/g, " ").trim();
  if (trimmed === "") return;
  return trimmed.length > MAX_MCP_STATUS_CHARS
    ? `${truncateToLength(trimmed, MAX_MCP_STATUS_CHARS)}\u2026 [truncated]`
    : trimmed;
}
//@ chunk-cddhernx.js:16813-17303 placement
function buildMcpTaskNotification(event) {
  let labelText = sanitizeTaskLabel(event.mcpTaskId);
  let summary = `MCP task ${LABEL_PATTERN.test(labelText) ? labelText : shortTaskLabel(event.mcpTaskId)} (${mcpTaskKey(event.serverName, event.toolName)}) ${event.status}.`;
  let statusDetail = boundMcpStatusMessage(event.statusMessage) ?? "no detail";
  let body =
    event.status === "completed"
      ? (event.resultText ?? "")
      : event.status === "failed"
        ? `Task failed: ${statusDetail}`
        : event.statusMessage !== undefined
          ? `Task cancelled: ${statusDetail}`
          : "Task was cancelled by the server.";
  let hintBlock = event.resultHint
    ? `

${escapeXml(event.resultHint)}`
    : "";
  return formatTaskNotification({
    taskId: event.registryId,
    status: event.status,
    summary: escapeXml(summary),
    body: `
<result>
${escapeXmlTruncated(body, getMaxMcpOutputChars() - hintBlock.length)}${hintBlock}
</result>`,
  });
}
//@ chunk-cddhernx.js:17303-18039 placement
async function restoreMcpTasks(session) {
  if (!isMcpTasksEnabled()) return;
  let records;
  try {
    records = await listTaskMetadata(session.storageV5);
  } catch (error) {
    logFeatureBad("mcp_task_restore", "list_failed");
    logForDebugging(`restoreMcpTasks list failed: ${String(error)}`);
    return;
  }
  for (let record of records) {
    if (record.protocol === "sep2663") {
      logForDebugging(`restoreMcpTasks: sep2663 sidecar ${record.taskId} needs the v2 runtime; parked`);
      continue;
    }
    if (record.protocol !== undefined) {
      logForDebugging(
        `restoreMcpTasks: sidecar ${record.taskId} has unknown protocol '${record.protocol}'; parked`,
        {
          level: "error",
        },
      );
      continue;
    }
    logForDebugging(
      `restoreMcpTasks: deleting the resume record for MCP task ${record.taskId} (server '${record.serverName}', server task ${shortTaskLabel(record.mcpTaskId)}): it used the 2025-11-25 tasks protocol, which this version no longer supports; the task was not cancelled on the server`,
    );
    removeMcpTaskMetadataSafe(record.taskId, session.storageV5);
  }
  logFeatureOk("mcp_task_restore");
}
export { boundMcpStatusMessage, buildMcpTaskNotification, mcpContentToNotificationText, restoreMcpTasks };
