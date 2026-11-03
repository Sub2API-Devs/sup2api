/**
 * tasks/McpTask/mcpTaskNotifications.ts
 *
 * 2.1.316 新增：MCP 任务通知：内容转文本、恢复任务、状态消息。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ta5f9qat.js (10)
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

//@ chunk-ta5f9qat.js:12063-12170 placement
async function removeMcpTaskMetadataSafe(taskId, storageV5) {
  try {
    await (storageV5 ? deleteMcpTaskMetadata(taskId, storageV5) : deleteMcpTaskMetadata(taskId));
  } catch (error) {
    logForDebugging(`removeMcpTaskMetadata failed: ${String(error)}`);
  }
}
//@ chunk-ta5f9qat.js:12170-12507 placement
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
//@ chunk-ta5f9qat.js:12507-13641 placement
async function mcpContentToNotificationText(e, r, a, n = MAX_PERSIST_BYTES) {
  let s;
  if (typeof e === "string") s = e;
  else {
    let c = [];
    for (let o of e ?? []) {
      let { text, bytesPersisted } = await contentBlockToText(o, n, r);
      n -= bytesPersisted;
      c.push(text);
    }
    s = c.join(`
`);
  }
  try {
    let c = await truncateMcpContentIfNeeded(s, a);
    let o = typeof c === "string" ? c : s;
    let maxMcpOutputChars = getMaxMcpOutputChars();
    if (o === s && (s.length > maxMcpOutputChars || escapeXml(s).length > maxMcpOutputChars))
      o = truncateBeforeEscape(s, maxMcpOutputChars);
    if (o === s)
      return {
        text: s,
      };
    if (s.length > n)
      return {
        text: o,
        savedHint: "[The portion truncated above was not saved: the per-result persist budget is exhausted.]",
      };
    let d = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let l = await persistBinaryContent(Buffer.from(s, "utf8"), "text/plain", d, undefined, r);
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
    n -= l.size;
    let u = getPlatform() === "windows" ? "python" : "python3";
    let replaced = l.filepath.replaceAll("\\", "/").replaceAll("'", "'\\''");
    let k = isMultiLineWithinWidth(s)
      ? "use Read to retrieve the portion truncated above"
      : `its lines are too long for Read's offset/limit \u2014 slice by character range via Bash instead, e.g. ${u} -c 'print(open("${replaced}").read()[A:B])' in ~${MAX_MCP_EVENT_CHARS.toLocaleString()}-char spans`;
    return {
      text: o,
      savedHint: `[The complete ${s.length}-character output was saved to ${l.filepath}; ${k}.]`,
    };
  } catch {
    return {
      text: truncateToLength(s, getMaxMcpOutputChars()),
    };
  }
}
//@ chunk-ta5f9qat.js:13641-13653 placement
/**
 * 单条 MCP 事件文本上限。
 */
var MAX_MCP_EVENT_CHARS = 80000;
//@ chunk-ta5f9qat.js:13653-13778 placement
function isMultiLineWithinWidth(e) {
  let r = 0;
  let a = 0;
  for (;;) {
    let index = e.indexOf(
      `
`,
      r,
    );
    if ((index === -1 ? e.length : index) - r > MAX_MCP_EVENT_CHARS) return false;
    if (index === -1) return a > 0;
    a++;
    r = index + 1;
  }
}
//@ chunk-ta5f9qat.js:13778-15441 placement
/**
 * 把 MCP 任务结果中的一个内容块转为通知文本：文本原样，资源/资源链接给出描述，图片等二进制块按预算解码后写入磁盘并返回保存说明（过大、超预算、非法 base64 或写盘失败时返回对应提示）；同时返回写入字节数。
 */
async function contentBlockToText(block, r, a) {
  if (block.type === "text" && typeof block.text === "string")
    return {
      text: block.text,
      bytesPersisted: 0,
    };
  let n = binaryContentBlockSchema().safeParse(block);
  if (!n.success) {
    let i = embeddedTextResourceSchema().safeParse(block);
    if (i.success) {
      let { uri, text } = i.data.resource;
      return {
        text: uri ? `[Resource at ${uri}] ${text}` : text,
        bytesPersisted: 0,
      };
    }
    let d = resourceLinkSchema().safeParse(block);
    if (d.success) {
      let { name: l, uri, description } = d.data;
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
  let s =
    "source" in n.data
      ? {
          data: n.data.source.data,
          mimeType: n.data.source.media_type,
        }
      : "resource" in n.data
        ? {
            data: n.data.resource.blob,
            mimeType: n.data.resource.mimeType,
          }
        : {
            data: n.data.data,
            mimeType: n.data.mimeType,
          };
  let c = (s.data.length * 3) / 4;
  if (c > MAX_PERSIST_BYTES)
    return {
      text: `[${block.type} content too large to save]`,
      bytesPersisted: 0,
    };
  if (c > r)
    return {
      text: `[${block.type} content skipped: per-result persist budget exhausted]`,
      bytesPersisted: 0,
    };
  let o;
  try {
    o = atob(s.data);
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
    let i = `mcp-task-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let d = await persistBinaryContent(Buffer.from(o, "latin1"), s.mimeType, i, undefined, a);
    if ("error" in d) {
      if (toolResultStoreOrNull() !== undefined)
        return {
          text: binaryNotSavedNotice(s.mimeType, o.length),
          bytesPersisted: 0,
        };
      return {
        text: `[${block.type} content (${s.mimeType ?? "unknown type"}) could not be saved to disk: ${d.error}]`,
        bytesPersisted: 0,
      };
    }
    return {
      text: getBinaryBlobSavedMessage(d.filepath, s.mimeType, d.size, `[${block.type} result] `),
      bytesPersisted: d.size,
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
//@ chunk-ta5f9qat.js:15441-15513 placement
/**
 * MCP 状态消息长度上限与不可见字符清理。
 */
var MAX_MCP_STATUS_CHARS = 1e4;
var INVISIBLE_CHARS_RUN_REGEX = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}\p{Variation_Selector}]+/gu;
//@ chunk-ta5f9qat.js:15513-15668 placement
function boundMcpStatusMessage(statusMessage) {
  if (statusMessage === undefined) return;
  let trimmed = statusMessage.replace(INVISIBLE_CHARS_RUN_REGEX, " ").replace(/ {2,}/g, " ").trim();
  if (trimmed === "") return;
  return trimmed.length > MAX_MCP_STATUS_CHARS
    ? `${truncateToLength(trimmed, MAX_MCP_STATUS_CHARS)}\u2026 [truncated]`
    : trimmed;
}
//@ chunk-ta5f9qat.js:15668-16158 placement
function buildMcpTaskNotification(e) {
  let r = sanitizeTaskLabel(e.mcpTaskId);
  let n = `MCP task ${LABEL_PATTERN.test(r) ? r : shortTaskLabel(e.mcpTaskId)} (${mcpTaskKey(e.serverName, e.toolName)}) ${e.status}.`;
  let s = boundMcpStatusMessage(e.statusMessage) ?? "no detail";
  let c =
    e.status === "completed"
      ? (e.resultText ?? "")
      : e.status === "failed"
        ? `Task failed: ${s}`
        : e.statusMessage !== undefined
          ? `Task cancelled: ${s}`
          : "Task was cancelled by the server.";
  let o = e.resultHint
    ? `

${escapeXml(e.resultHint)}`
    : "";
  return formatTaskNotification({
    taskId: e.registryId,
    status: e.status,
    summary: escapeXml(n),
    body: `
<result>
${escapeXmlTruncated(c, getMaxMcpOutputChars() - o.length)}${o}
</result>`,
  });
}
//@ chunk-ta5f9qat.js:16158-16894 placement
async function restoreMcpTasks(e) {
  if (!isMcpTasksEnabled()) return;
  let r;
  try {
    r = await listTaskMetadata(e.storageV5);
  } catch (error) {
    logFeatureBad("mcp_task_restore", "list_failed");
    logForDebugging(`restoreMcpTasks list failed: ${String(error)}`);
    return;
  }
  for (let a of r) {
    if (a.protocol === "sep2663") {
      logForDebugging(`restoreMcpTasks: sep2663 sidecar ${a.taskId} needs the v2 runtime; parked`);
      continue;
    }
    if (a.protocol !== undefined) {
      logForDebugging(`restoreMcpTasks: sidecar ${a.taskId} has unknown protocol '${a.protocol}'; parked`, {
        level: "error",
      });
      continue;
    }
    logForDebugging(
      `restoreMcpTasks: deleting the resume record for MCP task ${a.taskId} (server '${a.serverName}', server task ${shortTaskLabel(a.mcpTaskId)}): it used the 2025-11-25 tasks protocol, which this version no longer supports; the task was not cancelled on the server`,
    );
    removeMcpTaskMetadataSafe(a.taskId, e.storageV5);
  }
  logFeatureOk("mcp_task_restore");
}
