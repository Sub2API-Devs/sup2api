/**
 * utils/transcript/transcriptRepair.ts
 *
 * 2.1.316 新增：转录修复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (25)
 * attribution: placement 25
 */
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import { logForDebugging } from "../debug.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { plural } from "../stringUtils.js";
import {
  isFiniteNumber_2,
  normalizeHookSummary,
  HOOK_SUMMARY_FIELDS,
  getValidStringArray,
} from "../collapseHookSummaries.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:331756-332732 placement
/**
 * 返回逐行修复函数与收尾函数：system 行按子类型修补字段；user/assistant 行去掉非法内容块（字符串内容包装为文本块）， 无法修复的行丢弃并记录，收尾时把指向被丢弃行的 parentUuid 重接到其祖先，返回各类计数。
 */
function createRowRepairer() {
  let seenById = new Map();
  let cleanedRows = 0;
  let droppedBlocks = 0;
  let wrappedRows = 0;
  let droppedRows = 0;
  let stopHookRepairs = 0;
  let otherSystemRepairs = 0;
  function admit(row, droppedUuids) {
    try {
      let rowType = row.type;
      if (rowType === "system") {
        let repair = planSystemRowRepair(row);
        if (repair === "keep") return true;
        applyFieldEdits(repair.target, repair.edits);
        if (repair.subtype === "stop_hook_summary") stopHookRepairs++;
        else otherSystemRepairs++;
        return true;
      }
      if (!isMessageRole(rowType)) return true;
      let repaired = repairMessageContent(rowType, row.message);
      if (repaired === "keep") return true;
      if (repaired !== "drop") {
        repaired.message.content = repaired.content;
        droppedBlocks += repaired.droppedBlocks;
        if (repaired.wrapped) wrappedRows++;
        else cleanedRows++;
        return true;
      }
      droppedRows++;
      if (!droppedUuids.has(row.uuid)) seenById.set(row.uuid, row.parentUuid);
      return false;
    } catch {
      return true;
    }
  }
  function finish(byUuid) {
    try {
      if (seenById.size > 0)
        for (let row of byUuid.values()) {
          let parentUuid = row.parentUuid;
          if (parentUuid !== null && !byUuid.has(parentUuid) && seenById.has(parentUuid))
            row.parentUuid = nearestPresentAncestor(parentUuid, byUuid);
        }
      let stats = {
        droppedBlocks,
        cleanedRows,
        wrappedRows,
        droppedRows,
        stopHookSummariesRepaired: stopHookRepairs,
        otherSystemRowsRepaired: otherSystemRepairs,
      };
      if (isRepairNoop(stats)) return;
      logRowRepair("transcript_load", stats);
    } catch {}
  }
  function nearestPresentAncestor(parentUuid, byUuid) {
    let visited = new Set();
    let ancestorUuid = parentUuid;
    while (ancestorUuid !== null && !byUuid.has(ancestorUuid) && seenById.has(ancestorUuid)) {
      if (visited.has(ancestorUuid)) {
        ancestorUuid = null;
        break;
      }
      visited.add(ancestorUuid);
      ancestorUuid = seenById.get(ancestorUuid) ?? null;
    }
    for (let uuid of visited) seenById.set(uuid, ancestorUuid);
    return ancestorUuid;
  }
  return {
    admit,
    finish,
  };
}
//@ chunk-e6aww6q8.js:332732-333133 placement
/**
 * 消息内容修复：keep/drop 或过滤后的内容块。
 */
function repairMessageContent(site, message) {
  if (!isPlainObject_5(message)) return "drop";
  let content = message.content;
  if (typeof content === "string") {
    if (site !== "assistant") return "keep";
    if (content.trim() === "") return "drop";
    return {
      message,
      content: [
        {
          type: "text",
          text: content,
        },
      ],
      droppedBlocks: 0,
      wrapped: true,
    };
  }
  if (!Array.isArray(content)) return "drop";
  if (content.every(isTypedContentBlock)) return "keep";
  let filtered = content.filter(isTypedContentBlock);
  if (filtered.length === 0) return "drop";
  return {
    message,
    content: filtered,
    droppedBlocks: content.length - filtered.length,
    wrapped: false,
  };
}
//@ chunk-e6aww6q8.js:333133-333187 placement
function isTypedContentBlock(block) {
  return isPlainObject_5(block) && typeof block.type === "string";
}
//@ chunk-e6aww6q8.js:333187-333238 placement
function isMessageRole(role) {
  return role === "user" || role === "assistant";
}
//@ chunk-e6aww6q8.js:333238-333381 placement
function isRepairNoop(stats) {
  return (
    stats.cleanedRows === 0 &&
    stats.wrappedRows === 0 &&
    stats.droppedRows === 0 &&
    stats.stopHookSummariesRepaired === 0 &&
    stats.otherSystemRowsRepaired === 0
  );
}
//@ chunk-e6aww6q8.js:333381-333750 placement
/**
 * 记修复 warn 与 transcript_row_repair feature sad。
 */
function logRowRepair(site, stats) {
  logForDebugging(repairMalformedContent(site === "transcript_load" ? "transcript load" : "resume", stats), {
    level: "warn",
  });
  logFeatureSad("transcript_row_repair", "rows_repaired", {
    site: fromEnum(site),
    dropped_rows: stats.droppedRows,
    cleaned_rows: stats.cleanedRows,
    wrapped_rows: stats.wrappedRows,
    dropped_blocks: stats.droppedBlocks,
    stop_hook_summaries_repaired: stats.stopHookSummariesRepaired,
    other_system_rows_repaired: stats.otherSystemRowsRepaired,
  });
}
//@ chunk-e6aww6q8.js:333750-334378 placement
/**
 * 修复转录中格式错误的消息内容。
 */
function repairMalformedContent(site, extra) {
  let {
    droppedBlocks,
    cleanedRows,
    wrappedRows,
    droppedRows,
    stopHookSummariesRepaired,
    otherSystemRowsRepaired,
  } = extra;
  let filtered = [
    cleanedRows > 0
      ? `removed ${droppedBlocks} malformed content ${plural(droppedBlocks, "block")} from ${cleanedRows} ${plural(cleanedRows, "row")}`
      : undefined,
    wrappedRows > 0
      ? `wrapped the string content of ${wrappedRows} assistant ${plural(wrappedRows, "row")} in a text block`
      : undefined,
    droppedRows > 0 ? `dropped ${droppedRows} unreadable ${plural(droppedRows, "row")}` : undefined,
    stopHookSummariesRepaired > 0
      ? `repaired the fields of ${stopHookSummariesRepaired} stop hook ${plural(stopHookSummariesRepaired, "summary", "summaries")} not in the shape this build writes`
      : undefined,
    otherSystemRowsRepaired > 0
      ? `repaired malformed fields on ${otherSystemRowsRepaired} system ${plural(otherSystemRowsRepaired, "row")} (not stop hook summaries)`
      : undefined,
  ].filter((part) => part !== undefined);
  return `${site}: ${filtered.join(", ")}`;
}
//@ chunk-e6aww6q8.js:334378-335072 placement
function filterStopHookSummariesOnResume(messages) {
  let stats = {
    droppedBlocks: 0,
    cleanedRows: 0,
    wrappedRows: 0,
    droppedRows: 0,
    stopHookSummariesRepaired: 0,
    otherSystemRowsRepaired: 0,
  };
  let flattened = messages.flatMap((row) => {
    try {
      let rowType = row.type;
      if (rowType === "system") {
        let repair = planSystemRowRepair(row);
        if (repair === "keep") return [row];
        let repairedRow = {
          ...row,
        };
        let target = repairedRow;
        if (isPlainObject_5(target)) applyFieldEdits(target, repair.edits);
        if (repair.subtype === "stop_hook_summary") stats.stopHookSummariesRepaired++;
        else stats.otherSystemRowsRepaired++;
        return [repairedRow];
      }
      if (!isMessageRole(rowType)) return [row];
      let repaired = repairMessageContent(rowType, row.message);
      if (repaired === "keep") return [row];
      if (repaired === "drop") {
        stats.droppedRows++;
        return [];
      }
      stats.droppedBlocks += repaired.droppedBlocks;
      if (repaired.wrapped) stats.wrappedRows++;
      else stats.cleanedRows++;
      return [
        {
          ...row,
          message: {
            ...repaired.message,
            content: repaired.content,
          },
        },
      ];
    } catch {
      return [row];
    }
  });
  if (isRepairNoop(stats)) return messages;
  try {
    logRowRepair("resume", stats);
  } catch {}
  return flattened;
}
//@ chunk-e6aww6q8.js:335072-335225 placement
function planSystemRowRepair(row) {
  let target = row;
  if (!isPlainObject_5(target)) return "keep";
  let { subtype } = target;
  let edits = [...ensureStringField(target, "content"), ...systemRowEdits(target)];
  return edits.length === 0
    ? "keep"
    : {
        target,
        subtype,
        edits,
      };
}
//@ chunk-e6aww6q8.js:335225-336178 placement
/**
 * 按子类型列出 system 行字段修补操作。
 */
function systemRowEdits(row) {
  switch (row.subtype) {
    case "stop_hook_summary":
      return hookSummaryEdits(row);
    case "informational":
      return ensureFieldEdit(row, "content");
    case "memory_saved":
      return [
        ...ensureStringArrayField(row, "writtenPaths", "required"),
        ...remove(row, "verb"),
        ...removeInvalidCountFields(row, ["teamCount"]),
      ];
    case "permission_retry":
      return ensureStringArrayField(row, "commands", "required");
    case "model_refusal_fallback":
      return [
        ...ensureFieldEdit(row, "content"),
        ...ensureStringArrayField(row, "retractedMessageUuids", "optional"),
        ...ensureStringField(row, "fallbackModel", "fill"),
        ...ensureStringField(row, "originalModel", "fill"),
      ];
    case "compact_boundary":
      return repairCompactMetadata(row);
    case "scheduled_task_fire":
      return [
        ...ensureStringArrayField(row, "foldedUuids", "optional"),
        ...removeInvalidCountFields(row, ["noOpStreak"]),
        ...remove(row, "streakStartedAt"),
      ];
    case "local_command":
      return [
        ...ensureFieldEdit(row, "content"),
        ...removeIfSchemaInvalid(row, "commandRun", COMMAND_RUN_SCHEMA()),
      ];
    case "turn_duration":
      return [
        ...(isNonNegativeNumber(row.durationMs)
          ? []
          : [
              {
                kind: "set",
                key: "durationMs",
                value: 0,
              },
            ]),
        ...((isNonNegativeNumber(row.budgetTokens) && isNonNegativeNumber(row.budgetLimit)) ||
        BUDGET_COUNT_FIELDS.every((field) => row[field] === undefined)
          ? removeInvalidCountFields(row, ["budgetNudges"])
          : BUDGET_COUNT_FIELDS.flatMap((field) =>
              row[field] === undefined
                ? []
                : [
                    {
                      kind: "remove",
                      key: field,
                    },
                  ],
            )),
        ...removeInvalidCountFields(row, TURN_DURATION_COUNT_FIELDS),
      ];
    default:
      return [];
  }
}
//@ chunk-e6aww6q8.js:336178-336325 placement
var BUDGET_COUNT_FIELDS = ["budgetTokens", "budgetLimit", "budgetNudges"];
var TURN_DURATION_COUNT_FIELDS = [
  "messageCount",
  "pendingBackgroundAgentCount",
  "pendingWorkflowCount",
  "briefHiddenCount",
];
//@ chunk-e6aww6q8.js:336325-336417 placement = remove (0.814)
/**
 * 不是非负安全整数的字段生成 remove 修复操作。旧版名 remove 为错配。
 */
function removeInvalidCountFields(row, fields) {
  return fields.flatMap((field) =>
    row[field] === undefined || isNonNegativeSafeInteger(row[field])
      ? []
      : [
          {
            kind: "remove",
            key: field,
          },
        ],
  );
}
//@ chunk-e6aww6q8.js:336417-336509 placement = remove (0.814)
/**
 * 不是非负数的字段生成 remove 修复操作。
 */
function removeInvalidNumberFields(compactMetadata, row) {
  return row.flatMap((field) =>
    compactMetadata[field] === undefined || isNonNegativeNumber(compactMetadata[field])
      ? []
      : [
          {
            kind: "remove",
            key: field,
          },
        ],
  );
}
//@ chunk-e6aww6q8.js:336509-336583 placement
/**
 * 非负安全整数判断。
 */
function isNonNegativeSafeInteger(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
//@ chunk-e6aww6q8.js:336583-336618 placement
/**
 * 非负有限数判断。
 */
function isNonNegativeNumber(value) {
  return isFiniteNumber_2(value) && value >= 0;
}
//@ chunk-e6aww6q8.js:336618-336739 placement
/**
 * 压缩元数据修复用：commandRun schema 与可选数字字段列表（postTokens/cumulativeDroppedTokens/durationMs）。
 */
var COMMAND_RUN_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var OPTIONAL_COMPACT_NUMBER_FIELDS;
deferInit("chunk-e6aww6q8.js:336618", () => {
  COMMAND_RUN_SCHEMA = DoctorLazy(() =>
    objectSchema({
      command: stringSchema(),
      args: stringSchema(),
      plugin: stringSchema().optional(),
    }),
  );
  OPTIONAL_COMPACT_NUMBER_FIELDS = ["postTokens", "cumulativeDroppedTokens", "durationMs"];
});
//@ chunk-e6aww6q8.js:336739-337431 placement
/**
 * 校验 compact_boundary 的 compactMetadata，生成 set/remove 修复操作（trigger 缺省 auto、preTokens 缺省 0 等）。
 */
function repairCompactMetadata(row) {
  let compactMetadata = row.compactMetadata;
  if (compactMetadata === undefined) return [];
  if (!isPlainObject_5(compactMetadata))
    return [
      {
        kind: "set",
        key: "compactMetadata",
        value: {
          trigger: "auto",
          preTokens: 0,
        },
      },
    ];
  let triggerEdits = [
    ...(compactMetadata.trigger === "auto" || compactMetadata.trigger === "manual"
      ? []
      : [
          {
            kind: "set",
            key: "trigger",
            value: "auto",
          },
        ]),
    ...(isNonNegativeNumber(compactMetadata.preTokens)
      ? []
      : [
          {
            kind: "set",
            key: "preTokens",
            value: 0,
          },
        ]),
    ...removeInvalidNumberFields(compactMetadata, OPTIONAL_COMPACT_NUMBER_FIELDS),
    ...removeInvalidCountFields(compactMetadata, ["messagesSummarized"]),
    ...repairPreservedMessages(compactMetadata),
    ...ensureStringArrayField(compactMetadata, "preCompactDiscoveredTools", "optional"),
  ];
  let preservedMessages = compactMetadata.preservedMessages;
  let preservedEdits =
    triggerEdits.every((edit) => edit.key !== "preservedMessages") && isPlainObject_5(preservedMessages)
      ? ensureStringArrayField(preservedMessages, "allUuids", "optional")
      : [];
  if (triggerEdits.length === 0 && preservedEdits.length === 0) return [];
  let nextMetadata = {
    ...compactMetadata,
  };
  applyFieldEdits(nextMetadata, triggerEdits);
  if (preservedEdits.length > 0 && isPlainObject_5(preservedMessages)) {
    let nextPreserved = {
      ...preservedMessages,
    };
    applyFieldEdits(nextPreserved, preservedEdits);
    nextMetadata.preservedMessages = nextPreserved;
  }
  return [
    {
      kind: "set",
      key: "compactMetadata",
      value: nextMetadata,
    },
  ];
}
//@ chunk-e6aww6q8.js:337431-337566 placement
/**
 * preservedMessages 不是 {uuids:[]} 形状时移除。旧版名 removeByFilter 为错配。
 */
function repairPreservedMessages(compactMetadata) {
  let preservedMessages = compactMetadata.preservedMessages;
  return preservedMessages === undefined ||
    (isPlainObject_5(preservedMessages) && Array.isArray(preservedMessages.uuids))
    ? []
    : [
        {
          kind: "remove",
          key: "preservedMessages",
        },
      ];
}
//@ chunk-e6aww6q8.js:337566-337666 placement = remove (0.814)
/**
 * 字段不符合 schema 时生成 remove 操作。旧版名 remove 为错配。
 */
function removeIfSchemaInvalid(row, field, schema) {
  let value = row[field];
  return value === undefined || schema.safeParse(value).success
    ? []
    : [
        {
          kind: "remove",
          key: field,
        },
      ];
}
//@ chunk-e6aww6q8.js:337666-337934 placement
function hookSummaryEdits(row) {
  let normalized = normalizeHookSummary(row);
  return HOOK_SUMMARY_FIELDS.flatMap((field) => {
    let currentValue = row[field];
    if (!(field in normalized))
      return currentValue === undefined
        ? []
        : [
            {
              kind: "remove",
              key: field,
            },
          ];
    let normalizedValue = normalized[field];
    if (currentValue === undefined)
      return field === "hookInfos" || field === "hookErrors"
        ? [
            {
              kind: "set",
              key: field,
              value: normalizedValue,
            },
          ]
        : [];
    return currentValue === normalizedValue
      ? []
      : [
          {
            kind: "set",
            key: field,
            value: normalizedValue,
          },
        ];
  });
}
//@ chunk-e6aww6q8.js:337934-338069 placement
function ensureStringField(row, field, onMissing = "leave") {
  let value = row[field];
  if (typeof value === "string") return [];
  return value === undefined && onMissing === "leave"
    ? []
    : [
        {
          kind: "set",
          key: field,
          value: "",
        },
      ];
}
//@ chunk-e6aww6q8.js:338069-338141 placement
function ensureFieldEdit(row, field) {
  return row[field] === undefined
    ? [
        {
          kind: "set",
          key: field,
          value: "",
        },
      ]
    : [];
}
//@ chunk-e6aww6q8.js:338141-338236 placement = remove (0.814)
function remove(row, field) {
  let value = row[field];
  return value === undefined || typeof value === "string"
    ? []
    : [
        {
          kind: "remove",
          key: field,
        },
      ];
}
//@ chunk-e6aww6q8.js:338236-338459 placement
function ensureStringArrayField(row, field, value) {
  let current = row[field];
  if (current === undefined)
    return value === "required"
      ? [
          {
            kind: "set",
            key: field,
            value: [],
          },
        ]
      : [];
  let validStringArray = getValidStringArray(current);
  if (validStringArray === current) return [];
  return Array.isArray(current) || value === "required"
    ? [
        {
          kind: "set",
          key: field,
          value: validStringArray,
        },
      ]
    : [
        {
          kind: "remove",
          key: field,
        },
      ];
}
//@ chunk-e6aww6q8.js:338459-338564 placement
function applyFieldEdits(row, edits) {
  for (let edit of edits)
    if (edit.kind === "set") row[edit.key] = edit.value;
    else Reflect.deleteProperty(row, edit.key);
}
export { createRowRepairer, filterStopHookSummariesOnResume };
