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
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";

//@ chunk-e6aww6q8.js:331756-332732 placement
/**
 * 返回逐行修复函数与收尾函数：system 行按子类型修补字段；user/assistant 行去掉非法内容块（字符串内容包装为文本块）， 无法修复的行丢弃并记录，收尾时把指向被丢弃行的 parentUuid 重接到其祖先，返回各类计数。
 */
function createRowRepairer() {
  let e = new Map();
  let n = 0;
  let droppedBlocks = 0;
  let s = 0;
  let h = 0;
  let y = 0;
  let S = 0;
  function w(q, Z) {
    try {
      let Se = q.type;
      if (Se === "system") {
        let we = planSystemRowRepair(q);
        if (we === "keep") return true;
        applyFieldEdits(we.target, we.edits);
        if (we.subtype === "stop_hook_summary") y++;
        else S++;
        return true;
      }
      if (!isMessageRole(Se)) return true;
      let ke = repairMessageContent(Se, q.message);
      if (ke === "keep") return true;
      if (ke !== "drop") {
        ke.message.content = ke.content;
        droppedBlocks += ke.droppedBlocks;
        if (ke.wrapped) s++;
        else n++;
        return true;
      }
      h++;
      if (!Z.has(q.uuid)) e.set(q.uuid, q.parentUuid);
      return false;
    } catch {
      return true;
    }
  }
  function L(q) {
    try {
      if (e.size > 0)
        for (let Se of q.values()) {
          let parentUuid = Se.parentUuid;
          if (parentUuid !== null && !q.has(parentUuid) && e.has(parentUuid))
            Se.parentUuid = G(parentUuid, q);
        }
      let Z = {
        droppedBlocks,
        cleanedRows: n,
        wrappedRows: s,
        droppedRows: h,
        stopHookSummariesRepaired: y,
        otherSystemRowsRepaired: S,
      };
      if (isRepairNoop(Z)) return;
      logRowRepair("transcript_load", Z);
    } catch {}
  }
  function G(parentUuid, Z) {
    let Se = new Set();
    let ke = parentUuid;
    while (ke !== null && !Z.has(ke) && e.has(ke)) {
      if (Se.has(ke)) {
        ke = null;
        break;
      }
      Se.add(ke);
      ke = e.get(ke) ?? null;
    }
    for (let we of Se) e.set(we, ke);
    return ke;
  }
  return {
    admit: w,
    finish: L,
  };
}
//@ chunk-e6aww6q8.js:332732-333133 placement
/**
 * 消息内容修复：keep/drop 或过滤后的内容块。
 */
function repairMessageContent(e, message) {
  if (!isPlainObject_5(message)) return "drop";
  let content = message.content;
  if (typeof content === "string") {
    if (e !== "assistant") return "keep";
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
function isTypedContentBlock(e) {
  return isPlainObject_5(e) && typeof e.type === "string";
}
//@ chunk-e6aww6q8.js:333187-333238 placement
function isMessageRole(e) {
  return e === "user" || e === "assistant";
}
//@ chunk-e6aww6q8.js:333238-333381 placement
function isRepairNoop(e) {
  return (
    e.cleanedRows === 0 &&
    e.wrappedRows === 0 &&
    e.droppedRows === 0 &&
    e.stopHookSummariesRepaired === 0 &&
    e.otherSystemRowsRepaired === 0
  );
}
//@ chunk-e6aww6q8.js:333381-333750 placement
/**
 * 记修复 warn 与 transcript_row_repair feature sad。
 */
function logRowRepair(e, n) {
  logForDebugging(repairMalformedContent(e === "transcript_load" ? "transcript load" : "resume", n), {
    level: "warn",
  });
  logFeatureSad("transcript_row_repair", "rows_repaired", {
    site: fromEnum(e),
    dropped_rows: n.droppedRows,
    cleaned_rows: n.cleanedRows,
    wrapped_rows: n.wrappedRows,
    dropped_blocks: n.droppedBlocks,
    stop_hook_summaries_repaired: n.stopHookSummariesRepaired,
    other_system_rows_repaired: n.otherSystemRowsRepaired,
  });
}
//@ chunk-e6aww6q8.js:333750-334378 placement
/**
 * 修复转录中格式错误的消息内容。
 */
function repairMalformedContent(e, n) {
  let {
    droppedBlocks,
    cleanedRows,
    wrappedRows,
    droppedRows,
    stopHookSummariesRepaired,
    otherSystemRowsRepaired,
  } = n;
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
  ].filter((G) => G !== undefined);
  return `${e}: ${filtered.join(", ")}`;
}
//@ chunk-e6aww6q8.js:334378-335072 placement
function filterStopHookSummariesOnResume(e) {
  let n = {
    droppedBlocks: 0,
    cleanedRows: 0,
    wrappedRows: 0,
    droppedRows: 0,
    stopHookSummariesRepaired: 0,
    otherSystemRowsRepaired: 0,
  };
  let flattened = e.flatMap((s) => {
    try {
      let h = s.type;
      if (h === "system") {
        let S = planSystemRowRepair(s);
        if (S === "keep") return [s];
        let w = {
          ...s,
        };
        let L = w;
        if (isPlainObject_5(L)) applyFieldEdits(L, S.edits);
        if (S.subtype === "stop_hook_summary") n.stopHookSummariesRepaired++;
        else n.otherSystemRowsRepaired++;
        return [w];
      }
      if (!isMessageRole(h)) return [s];
      let y = repairMessageContent(h, s.message);
      if (y === "keep") return [s];
      if (y === "drop") {
        n.droppedRows++;
        return [];
      }
      n.droppedBlocks += y.droppedBlocks;
      if (y.wrapped) n.wrappedRows++;
      else n.cleanedRows++;
      return [
        {
          ...s,
          message: {
            ...y.message,
            content: y.content,
          },
        },
      ];
    } catch {
      return [s];
    }
  });
  if (isRepairNoop(n)) return e;
  try {
    logRowRepair("resume", n);
  } catch {}
  return flattened;
}
//@ chunk-e6aww6q8.js:335072-335225 placement
function planSystemRowRepair(e) {
  let n = e;
  if (!isPlainObject_5(n)) return "keep";
  let { subtype } = n;
  let s = [...ensureStringField(n, "content"), ...systemRowEdits(n)];
  return s.length === 0
    ? "keep"
    : {
        target: n,
        subtype,
        edits: s,
      };
}
//@ chunk-e6aww6q8.js:335225-336178 placement
/**
 * 按子类型列出 system 行字段修补操作。
 */
function systemRowEdits(e) {
  switch (e.subtype) {
    case "stop_hook_summary":
      return hookSummaryEdits(e);
    case "informational":
      return ensureFieldEdit(e, "content");
    case "memory_saved":
      return [
        ...ensureStringArrayField(e, "writtenPaths", "required"),
        ...remove(e, "verb"),
        ...removeInvalidCountFields(e, ["teamCount"]),
      ];
    case "permission_retry":
      return ensureStringArrayField(e, "commands", "required");
    case "model_refusal_fallback":
      return [
        ...ensureFieldEdit(e, "content"),
        ...ensureStringArrayField(e, "retractedMessageUuids", "optional"),
        ...ensureStringField(e, "fallbackModel", "fill"),
        ...ensureStringField(e, "originalModel", "fill"),
      ];
    case "compact_boundary":
      return repairCompactMetadata(e);
    case "scheduled_task_fire":
      return [
        ...ensureStringArrayField(e, "foldedUuids", "optional"),
        ...removeInvalidCountFields(e, ["noOpStreak"]),
        ...remove(e, "streakStartedAt"),
      ];
    case "local_command":
      return [
        ...ensureFieldEdit(e, "content"),
        ...removeIfSchemaInvalid(e, "commandRun", COMMAND_RUN_SCHEMA()),
      ];
    case "turn_duration":
      return [
        ...(isNonNegativeNumber(e.durationMs)
          ? []
          : [
              {
                kind: "set",
                key: "durationMs",
                value: 0,
              },
            ]),
        ...((isNonNegativeNumber(e.budgetTokens) && isNonNegativeNumber(e.budgetLimit)) ||
        BUDGET_COUNT_FIELDS.every((n) => e[n] === undefined)
          ? removeInvalidCountFields(e, ["budgetNudges"])
          : BUDGET_COUNT_FIELDS.flatMap((n) =>
              e[n] === undefined
                ? []
                : [
                    {
                      kind: "remove",
                      key: n,
                    },
                  ],
            )),
        ...removeInvalidCountFields(e, TURN_DURATION_COUNT_FIELDS),
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
function removeInvalidCountFields(e, n) {
  return n.flatMap((r) =>
    e[r] === undefined || isNonNegativeSafeInteger(e[r])
      ? []
      : [
          {
            kind: "remove",
            key: r,
          },
        ],
  );
}
//@ chunk-e6aww6q8.js:336417-336509 placement = remove (0.814)
/**
 * 不是非负数的字段生成 remove 修复操作。
 */
function removeInvalidNumberFields(compactMetadata, n) {
  return n.flatMap((r) =>
    compactMetadata[r] === undefined || isNonNegativeNumber(compactMetadata[r])
      ? []
      : [
          {
            kind: "remove",
            key: r,
          },
        ],
  );
}
//@ chunk-e6aww6q8.js:336509-336583 placement
/**
 * 非负安全整数判断。
 */
function isNonNegativeSafeInteger(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0;
}
//@ chunk-e6aww6q8.js:336583-336618 placement
/**
 * 非负有限数判断。
 */
function isNonNegativeNumber(e) {
  return isFiniteNumber_2(e) && e >= 0;
}
//@ chunk-e6aww6q8.js:336618-336739 placement
/**
 * 压缩元数据修复用：commandRun schema 与可选数字字段列表（postTokens/cumulativeDroppedTokens/durationMs）。
 */
var COMMAND_RUN_SCHEMA = DoctorLazy(() =>
  u({
    command: string(),
    args: string(),
    plugin: string().optional(),
  }),
);
var OPTIONAL_COMPACT_NUMBER_FIELDS = ["postTokens", "cumulativeDroppedTokens", "durationMs"];
//@ chunk-e6aww6q8.js:336739-337431 placement
/**
 * 校验 compact_boundary 的 compactMetadata，生成 set/remove 修复操作（trigger 缺省 auto、preTokens 缺省 0 等）。
 */
function repairCompactMetadata(e) {
  let compactMetadata = e.compactMetadata;
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
  let r = [
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
  let h =
    r.every((S) => S.key !== "preservedMessages") && isPlainObject_5(preservedMessages)
      ? ensureStringArrayField(preservedMessages, "allUuids", "optional")
      : [];
  if (r.length === 0 && h.length === 0) return [];
  let y = {
    ...compactMetadata,
  };
  applyFieldEdits(y, r);
  if (h.length > 0 && isPlainObject_5(preservedMessages)) {
    let S = {
      ...preservedMessages,
    };
    applyFieldEdits(S, h);
    y.preservedMessages = S;
  }
  return [
    {
      kind: "set",
      key: "compactMetadata",
      value: y,
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
function removeIfSchemaInvalid(e, n, r) {
  let s = e[n];
  return s === undefined || r.safeParse(s).success
    ? []
    : [
        {
          kind: "remove",
          key: n,
        },
      ];
}
//@ chunk-e6aww6q8.js:337666-337934 placement
function hookSummaryEdits(e) {
  let n = normalizeHookSummary(e);
  return HOOK_SUMMARY_FIELDS.flatMap((r) => {
    let s = e[r];
    if (!(r in n))
      return s === undefined
        ? []
        : [
            {
              kind: "remove",
              key: r,
            },
          ];
    let h = n[r];
    if (s === undefined)
      return r === "hookInfos" || r === "hookErrors"
        ? [
            {
              kind: "set",
              key: r,
              value: h,
            },
          ]
        : [];
    return s === h
      ? []
      : [
          {
            kind: "set",
            key: r,
            value: h,
          },
        ];
  });
}
//@ chunk-e6aww6q8.js:337934-338069 placement
function ensureStringField(e, n, r = "leave") {
  let s = e[n];
  if (typeof s === "string") return [];
  return s === undefined && r === "leave"
    ? []
    : [
        {
          kind: "set",
          key: n,
          value: "",
        },
      ];
}
//@ chunk-e6aww6q8.js:338069-338141 placement
function ensureFieldEdit(e, n) {
  return e[n] === undefined
    ? [
        {
          kind: "set",
          key: n,
          value: "",
        },
      ]
    : [];
}
//@ chunk-e6aww6q8.js:338141-338236 placement = remove (0.814)
function remove(e, n) {
  let r = e[n];
  return r === undefined || typeof r === "string"
    ? []
    : [
        {
          kind: "remove",
          key: n,
        },
      ];
}
//@ chunk-e6aww6q8.js:338236-338459 placement
function ensureStringArrayField(e, n, r) {
  let s = e[n];
  if (s === undefined)
    return r === "required"
      ? [
          {
            kind: "set",
            key: n,
            value: [],
          },
        ]
      : [];
  let validStringArray = getValidStringArray(s);
  if (validStringArray === s) return [];
  return Array.isArray(s) || r === "required"
    ? [
        {
          kind: "set",
          key: n,
          value: validStringArray,
        },
      ]
    : [
        {
          kind: "remove",
          key: n,
        },
      ];
}
//@ chunk-e6aww6q8.js:338459-338564 placement
function applyFieldEdits(e, edits) {
  for (let r of edits)
    if (r.kind === "set") e[r.key] = r.value;
    else Reflect.deleteProperty(e, r.key);
}
export { createRowRepairer, filterStopHookSummariesOnResume };
