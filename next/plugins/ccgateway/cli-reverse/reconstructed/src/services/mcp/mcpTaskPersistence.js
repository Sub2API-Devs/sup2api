/**
 * services/mcp/mcpTaskPersistence.ts
 *
 * 2.1.316 新增：MCP 任务持久化
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-q4ggn8bm.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-q4ggn8bm.js:13254-13361 placement
async function removeTaskMetadataSafe(taskId, storageV5) {
  try {
    await (storageV5 ? deleteMcpTaskMetadata(taskId, storageV5) : deleteMcpTaskMetadata(taskId));
  } catch (error) {
    logForDebugging(`removeMcpTaskMetadata failed: ${String(error)}`);
  }
}
//@ chunk-q4ggn8bm.js:13361-13698 placement
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
//@ chunk-q4ggn8bm.js:13698-14831 placement
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
    let parts = [];
    for (let block of content ?? []) {
      let { text, bytesPersisted } = await blockToNotificationText(block, persistBudget, storageV5);
      persistBudget -= bytesPersisted;
      parts.push(text);
    }
    text = parts.join(`
`);
  }
  try {
    let truncated = await truncateMcpContentIfNeeded(text, serverName);
    let outputText = typeof truncated === "string" ? truncated : text;
    let maxMcpOutputChars = getMaxMcpOutputChars();
    if (
      outputText === text &&
      (text.length > maxMcpOutputChars || escapeXml(text).length > maxMcpOutputChars)
    )
      outputText = truncateBeforeEscape(text, maxMcpOutputChars);
    if (outputText === text)
      return {
        text,
      };
    if (text.length > persistBudget)
      return {
        text: outputText,
        savedHint: "[The portion truncated above was not saved: the per-result persist budget is exhausted.]",
      };
    let persistId = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let persistResult = await persistBinaryContent(
      Buffer.from(text, "utf8"),
      "text/plain",
      persistId,
      undefined,
      storageV5,
    );
    if ("error" in persistResult) {
      if (toolResultStoreOrNull() !== undefined)
        return {
          text: outputText,
          savedHint: TRUNCATED_UNSAVED_TEXT,
        };
      return {
        text: outputText,
      };
    }
    persistBudget -= persistResult.size;
    let pythonCommand = getPlatform() === "windows" ? "python" : "python3";
    let replaced = persistResult.filepath.replaceAll("\\", "/").replaceAll("'", "'\\''");
    let tailLines = hasReadableLines(text)
      ? "use Read to retrieve the portion truncated above"
      : `its lines are too long for Read's offset/limit \u2014 slice by character range via Bash instead, e.g. ${pythonCommand} -c 'print(open("${replaced}").read()[A:B])' in ~${MAX_SLICE_CHARS.toLocaleString()}-char spans`;
    return {
      text: outputText,
      savedHint: `[The complete ${text.length}-character output was saved to ${persistResult.filepath}; ${tailLines}.]`,
    };
  } catch {
    return {
      text: truncateToLength(text, getMaxMcpOutputChars()),
    };
  }
}
//@ chunk-q4ggn8bm.js:14831-14843 placement
/**
 * 按字符切片时允许的最大跨度（80000）。
 */
var MAX_SLICE_CHARS = 80000;
//@ chunk-q4ggn8bm.js:14843-14968 placement
function hasReadableLines(text) {
  let lineStart = 0;
  let lineCount = 0;
  for (;;) {
    let index = text.indexOf(
      `
`,
      lineStart,
    );
    if ((index === -1 ? text.length : index) - lineStart > MAX_SLICE_CHARS) return false;
    if (index === -1) return lineCount > 0;
    lineCount++;
    lineStart = index + 1;
  }
}
//@ chunk-q4ggn8bm.js:14968-16631 placement
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
    let textResource = textResourceSchema().safeParse(block);
    if (textResource.success) {
      let { uri, text } = textResource.data.resource;
      return {
        text: uri ? `[Resource at ${uri}] ${text}` : text,
        bytesPersisted: 0,
      };
    }
    let resourceLink = resourceLinkSchema().safeParse(block);
    if (resourceLink.success) {
      let { name, uri, description } = resourceLink.data;
      return {
        text: `[Resource link: ${name}] ${uri}${description ? ` (${description})` : ""}`,
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
    let persistId = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let persistResult = await persistBinaryContent(
      Buffer.from(decoded, "latin1"),
      binary.mimeType,
      persistId,
      undefined,
      storageV5,
    );
    if ("error" in persistResult) {
      if (toolResultStoreOrNull() !== undefined)
        return {
          text: binaryNotSavedNotice(binary.mimeType, decoded.length),
          bytesPersisted: 0,
        };
      return {
        text: `[${block.type} content (${binary.mimeType ?? "unknown type"}) could not be saved to disk: ${persistResult.error}]`,
        bytesPersisted: 0,
      };
    }
    return {
      text: getBinaryBlobSavedMessage(
        persistResult.filepath,
        binary.mimeType,
        persistResult.size,
        `[${block.type} result] `,
      ),
      bytesPersisted: persistResult.size,
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
//@ chunk-q4ggn8bm.js:16631-16703 placement
/**
 * 匹配控制/格式字符与变体选择符的正则。
 */
var MAX_STATUS_MESSAGE_CHARS = 1e4;
var CONTROL_CHARS_RE = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu;
//@ chunk-q4ggn8bm.js:16703-16857 placement
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
//@ chunk-q4ggn8bm.js:16857-17347 placement
/**
 * 生成 MCP 任务完成/失败/取消时的任务通知（摘要与带结果或原因的正文，转义并截断）。
 */
function buildMcpTaskNotification(ending) {
  let taskLabel = sanitizeTaskLabel(ending.mcpTaskId);
  let summaryText = `MCP task ${LABEL_PATTERN.test(taskLabel) ? taskLabel : shortTaskLabel(ending.mcpTaskId)} (${mcpTaskKey(ending.serverName, ending.toolName)}) ${ending.status}.`;
  let detail = boundMcpStatusMessage(ending.statusMessage) ?? "no detail";
  let bodyText =
    ending.status === "completed"
      ? (ending.resultText ?? "")
      : ending.status === "failed"
        ? `Task failed: ${detail}`
        : ending.statusMessage !== undefined
          ? `Task cancelled: ${detail}`
          : "Task was cancelled by the server.";
  let hintText = ending.resultHint
    ? `

${escapeXml(ending.resultHint)}`
    : "";
  return formatTaskNotification({
    taskId: ending.registryId,
    status: ending.status,
    summary: escapeXml(summaryText),
    body: `
<result>
${escapeXmlTruncated(bodyText, getMaxMcpOutputChars() - hintText.length)}${hintText}
</result>`,
  });
}
//@ chunk-q4ggn8bm.js:17347-18427 placement
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
  let filtered = metas.filter((meta) => meta.protocol === "sep2663");
  if (filtered.length > 0 && !isSingleShotPrintSession()) {
    let { requestDialog } = ctx;
    let { createSep2663TaskBinding } = require("./ClaudeAiProxyBearerRejectedError.lazy.js");
    let { restoreSep2663Tasks } = require("./buildSep2663EndingNotice.lazy.js");
    restoreSep2663Tasks({
      metas: filtered,
      taskRegistry: ctx.taskRegistry,
      getMcpClients: ctx.getMcpClients,
      bindingFactory: (connection, taskId) =>
        createSep2663TaskBinding(connection, {
          taskId,
          requestDialog,
        }),
      storageV5: ctx.storageV5,
      credentials: ctx.credentials,
    }).catch((error) => logForDebugging(`restoreSep2663Tasks: ${describeErrorBrief(error)}`));
  }
  for (let meta of metas) {
    if (meta.protocol === "sep2663") continue;
    if (meta.protocol !== undefined) {
      logForDebugging(
        `restoreMcpTasks: sidecar ${meta.taskId} has unknown protocol '${meta.protocol}'; parked`,
        {
          level: "error",
        },
      );
      continue;
    }
    logForDebugging(
      `restoreMcpTasks: deleting the resume record for MCP task ${meta.taskId} (server '${meta.serverName}', server task ${shortTaskLabel(meta.mcpTaskId)}): it used the 2025-11-25 tasks protocol, which this version no longer supports; the task was not cancelled on the server`,
    );
    removeTaskMetadataSafe(meta.taskId, ctx.storageV5);
  }
  logFeatureOk("mcp_task_restore");
}
export { boundMcpStatusMessage, buildMcpTaskNotification, mcpContentToNotificationText, restoreMcpTasks };
