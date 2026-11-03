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
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { logForDebugging } from "../debug.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { plural } from "../stringUtils.js";
import {
  isFiniteNumber,
  normalizeHookSummary,
  HOOK_SUMMARY_FIELDS,
  getValidStringArray,
} from "../collapseHookSummaries.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";

/**
 * 返回逐行修复函数与收尾函数：system 行按子类型修补字段；user/assistant 行去掉非法内容块（字符串内容包装为文本块）， 无法修复的行丢弃并记录，收尾时把指向被丢弃行的 parentUuid 重接到其祖先，返回各类计数。
 */
//@ chunk-e6aww6q8.js:331756-332732 placement
function createRowRepairer() {
  let e = new Map(),
    n = 0,
    r = 0,
    s = 0,
    h = 0,
    y = 0,
    S = 0;
  function w(q, Z) {
    try {
      let Se = q.type;
      if (Se === "system") {
        let we = planSystemRowRepair(q);
        if (we === "keep") return !0;
        if ((applyFieldEdits(we.target, we.edits), we.subtype === "stop_hook_summary")) y++;
        else S++;
        return !0;
      }
      if (!zPt(Se)) return !0;
      let ke = repairMessageContent(Se, q.message);
      if (ke === "keep") return !0;
      if (ke !== "drop") {
        if (((ke.message.content = ke.content), (r += ke.droppedBlocks), ke.wrapped)) s++;
        else n++;
        return !0;
      }
      if ((h++, !Z.has(q.uuid))) e.set(q.uuid, q.parentUuid);
      return !1;
    } catch {
      return !0;
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
        droppedBlocks: r,
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
  function G(q, Z) {
    let Se = new Set(),
      ke = q;
    while (ke !== null && !Z.has(ke) && e.has(ke)) {
      if (Se.has(ke)) {
        ke = null;
        break;
      }
      (Se.add(ke), (ke = e.get(ke) ?? null));
    }
    for (let we of Se) e.set(we, ke);
    return ke;
  }
  return { admit: w, finish: L };
}
/**
 * 消息内容修复：keep/drop 或过滤后的内容块。
 */
//@ chunk-e6aww6q8.js:332732-333133 placement
function repairMessageContent(e, n) {
  if (!isPlainObject_4(n)) return "drop";
  let content = n.content;
  if (typeof content === "string") {
    if (e !== "assistant") return "keep";
    if (content.trim() === "") return "drop";
    return { message: n, content: [{ type: "text", text: content }], droppedBlocks: 0, wrapped: !0 };
  }
  if (!Array.isArray(content)) return "drop";
  if (content.every(BPt)) return "keep";
  let filtered = content.filter(BPt);
  if (filtered.length === 0) return "drop";
  return { message: n, content: filtered, droppedBlocks: content.length - filtered.length, wrapped: !1 };
}
//@ chunk-e6aww6q8.js:333133-333187 placement
function BPt(e) {
  return isPlainObject_4(e) && typeof e.type === "string";
}
//@ chunk-e6aww6q8.js:333187-333238 placement
function zPt(e) {
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
/**
 * 记修复 warn 与 transcript_row_repair feature sad。
 */
//@ chunk-e6aww6q8.js:333381-333750 placement
function logRowRepair(e, n) {
  (logForDebugging(repairMalformedContent(e === "transcript_load" ? "transcript load" : "resume", n), {
    level: "warn",
  }),
    logFeatureSad("transcript_row_repair", "rows_repaired", {
      site: fromEnum(e),
      dropped_rows: n.droppedRows,
      cleaned_rows: n.cleanedRows,
      wrapped_rows: n.wrappedRows,
      dropped_blocks: n.droppedBlocks,
      stop_hook_summaries_repaired: n.stopHookSummariesRepaired,
      other_system_rows_repaired: n.otherSystemRowsRepaired,
    }));
}
/**
 * 修复转录中格式错误的消息内容。
 */
//@ chunk-e6aww6q8.js:333750-334378 placement
function repairMalformedContent(e, n) {
  let {
      droppedBlocks: droppedBlocks,
      cleanedRows: cleanedRows,
      wrappedRows: wrappedRows,
      droppedRows: droppedRows,
      stopHookSummariesRepaired: stopHookSummariesRepaired,
      otherSystemRowsRepaired: otherSystemRowsRepaired,
    } = n,
    filtered = [
      cleanedRows > 0
        ? `removed ${droppedBlocks} malformed content ${plural(droppedBlocks, "block")} from ${cleanedRows} ${plural(cleanedRows, "row")}`
        : void 0,
      wrappedRows > 0
        ? `wrapped the string content of ${wrappedRows} assistant ${plural(wrappedRows, "row")} in a text block`
        : void 0,
      droppedRows > 0 ? `dropped ${droppedRows} unreadable ${plural(droppedRows, "row")}` : void 0,
      stopHookSummariesRepaired > 0
        ? `repaired the fields of ${stopHookSummariesRepaired} stop hook ${plural(stopHookSummariesRepaired, "summary", "summaries")} not in the shape this build writes`
        : void 0,
      otherSystemRowsRepaired > 0
        ? `repaired malformed fields on ${otherSystemRowsRepaired} system ${plural(otherSystemRowsRepaired, "row")} (not stop hook summaries)`
        : void 0,
    ].filter((G) => G !== void 0);
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
    },
    flattened = e.flatMap((s) => {
      try {
        let h = s.type;
        if (h === "system") {
          let S = planSystemRowRepair(s);
          if (S === "keep") return [s];
          let w = { ...s },
            L = w;
          if (isPlainObject_4(L)) applyFieldEdits(L, S.edits);
          if (S.subtype === "stop_hook_summary") n.stopHookSummariesRepaired++;
          else n.otherSystemRowsRepaired++;
          return [w];
        }
        if (!zPt(h)) return [s];
        let y = repairMessageContent(h, s.message);
        if (y === "keep") return [s];
        if (y === "drop") return (n.droppedRows++, []);
        if (((n.droppedBlocks += y.droppedBlocks), y.wrapped)) n.wrappedRows++;
        else n.cleanedRows++;
        return [{ ...s, message: { ...y.message, content: y.content } }];
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
  if (!isPlainObject_4(n)) return "keep";
  let { subtype: subtype } = n,
    s = [...ensureStringField(n, "content"), ...systemRowEdits(n)];
  return s.length === 0 ? "keep" : { target: n, subtype: subtype, edits: s };
}
/**
 * 按子类型列出 system 行字段修补操作。
 */
//@ chunk-e6aww6q8.js:335225-336178 placement
function systemRowEdits(e) {
  switch (e.subtype) {
    case "stop_hook_summary":
      return hookSummaryEdits(e);
    case "informational":
      return GHe(e, "content");
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
        ...GHe(e, "content"),
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
      return [...GHe(e, "content"), ...removeIfSchemaInvalid(e, "commandRun", COMMAND_RUN_SCHEMA())];
    case "turn_duration":
      return [
        ...(isNonNegativeNumber(e.durationMs) ? [] : [{ kind: "set", key: "durationMs", value: 0 }]),
        ...((isNonNegativeNumber(e.budgetTokens) && isNonNegativeNumber(e.budgetLimit)) ||
        BUDGET_COUNT_FIELDS.every((n) => e[n] === void 0)
          ? removeInvalidCountFields(e, ["budgetNudges"])
          : BUDGET_COUNT_FIELDS.flatMap((n) => (e[n] === void 0 ? [] : [{ kind: "remove", key: n }]))),
        ...removeInvalidCountFields(e, TURN_DURATION_COUNT_FIELDS),
      ];
    default:
      return [];
  }
}
//@ chunk-e6aww6q8.js:336178-336325 placement
var BUDGET_COUNT_FIELDS = ["budgetTokens", "budgetLimit", "budgetNudges"],
  TURN_DURATION_COUNT_FIELDS = [
    "messageCount",
    "pendingBackgroundAgentCount",
    "pendingWorkflowCount",
    "briefHiddenCount",
  ];
/**
 * 不是非负安全整数的字段生成 remove 修复操作。旧版名 remove 为错配。
 */
//@ chunk-e6aww6q8.js:336325-336417 placement = remove (0.814)
function removeInvalidCountFields(e, n) {
  return n.flatMap((r) =>
    e[r] === void 0 || isNonNegativeSafeInteger(e[r]) ? [] : [{ kind: "remove", key: r }],
  );
}
/**
 * 不是非负数的字段生成 remove 修复操作。
 */
//@ chunk-e6aww6q8.js:336417-336509 placement = remove (0.814)
function removeInvalidNumberFields(e, n) {
  return n.flatMap((r) => (e[r] === void 0 || isNonNegativeNumber(e[r]) ? [] : [{ kind: "remove", key: r }]));
}
/**
 * 非负安全整数判断。
 */
//@ chunk-e6aww6q8.js:336509-336583 placement
function isNonNegativeSafeInteger(e) {
  return typeof e === "number" && Number.isSafeInteger(e) && e >= 0;
}
/**
 * 非负有限数判断。
 */
//@ chunk-e6aww6q8.js:336583-336618 placement
function isNonNegativeNumber(e) {
  return isFiniteNumber(e) && e >= 0;
}
/**
 * 压缩元数据修复用：commandRun schema 与可选数字字段列表（postTokens/cumulativeDroppedTokens/durationMs）。
 */
//@ chunk-e6aww6q8.js:336618-336739 placement
var COMMAND_RUN_SCHEMA = DoctorLazy(() => u({ command: o(), args: o(), plugin: o().optional() })),
  OPTIONAL_COMPACT_NUMBER_FIELDS = ["postTokens", "cumulativeDroppedTokens", "durationMs"];
/**
 * 校验 compact_boundary 的 compactMetadata，生成 set/remove 修复操作（trigger 缺省 auto、preTokens 缺省 0 等）。
 */
//@ chunk-e6aww6q8.js:336739-337431 placement
function repairCompactMetadata(e) {
  let compactMetadata = e.compactMetadata;
  if (compactMetadata === void 0) return [];
  if (!isPlainObject_4(compactMetadata))
    return [{ kind: "set", key: "compactMetadata", value: { trigger: "auto", preTokens: 0 } }];
  let r = [
      ...(compactMetadata.trigger === "auto" || compactMetadata.trigger === "manual"
        ? []
        : [{ kind: "set", key: "trigger", value: "auto" }]),
      ...(isNonNegativeNumber(compactMetadata.preTokens)
        ? []
        : [{ kind: "set", key: "preTokens", value: 0 }]),
      ...removeInvalidNumberFields(compactMetadata, OPTIONAL_COMPACT_NUMBER_FIELDS),
      ...removeInvalidCountFields(compactMetadata, ["messagesSummarized"]),
      ...repairPreservedMessages(compactMetadata),
      ...ensureStringArrayField(compactMetadata, "preCompactDiscoveredTools", "optional"),
    ],
    preservedMessages = compactMetadata.preservedMessages,
    h =
      r.every((S) => S.key !== "preservedMessages") && isPlainObject_4(preservedMessages)
        ? ensureStringArrayField(preservedMessages, "allUuids", "optional")
        : [];
  if (r.length === 0 && h.length === 0) return [];
  let y = { ...compactMetadata };
  if ((applyFieldEdits(y, r), h.length > 0 && isPlainObject_4(preservedMessages))) {
    let S = { ...preservedMessages };
    (applyFieldEdits(S, h), (y.preservedMessages = S));
  }
  return [{ kind: "set", key: "compactMetadata", value: y }];
}
/**
 * preservedMessages 不是 {uuids:[]} 形状时移除。旧版名 removeByFilter 为错配。
 */
//@ chunk-e6aww6q8.js:337431-337566 placement
function repairPreservedMessages(e) {
  let preservedMessages = e.preservedMessages;
  return preservedMessages === void 0 ||
    (isPlainObject_4(preservedMessages) && Array.isArray(preservedMessages.uuids))
    ? []
    : [{ kind: "remove", key: "preservedMessages" }];
}
/**
 * 字段不符合 schema 时生成 remove 操作。旧版名 remove 为错配。
 */
//@ chunk-e6aww6q8.js:337566-337666 placement = remove (0.814)
function removeIfSchemaInvalid(e, n, r) {
  let s = e[n];
  return s === void 0 || r.safeParse(s).success ? [] : [{ kind: "remove", key: n }];
}
//@ chunk-e6aww6q8.js:337666-337934 placement
function hookSummaryEdits(e) {
  let n = normalizeHookSummary(e);
  return HOOK_SUMMARY_FIELDS.flatMap((r) => {
    let s = e[r];
    if (!(r in n)) return s === void 0 ? [] : [{ kind: "remove", key: r }];
    let h = n[r];
    if (s === void 0)
      return r === "hookInfos" || r === "hookErrors" ? [{ kind: "set", key: r, value: h }] : [];
    return s === h ? [] : [{ kind: "set", key: r, value: h }];
  });
}
//@ chunk-e6aww6q8.js:337934-338069 placement
function ensureStringField(e, n, r = "leave") {
  let s = e[n];
  if (typeof s === "string") return [];
  return s === void 0 && r === "leave" ? [] : [{ kind: "set", key: n, value: "" }];
}
//@ chunk-e6aww6q8.js:338069-338141 placement
function GHe(e, n) {
  return e[n] === void 0 ? [{ kind: "set", key: n, value: "" }] : [];
}
//@ chunk-e6aww6q8.js:338141-338236 placement = remove (0.814)
function remove(e, n) {
  let r = e[n];
  return r === void 0 || typeof r === "string" ? [] : [{ kind: "remove", key: n }];
}
//@ chunk-e6aww6q8.js:338236-338459 placement
function ensureStringArrayField(e, n, r) {
  let s = e[n];
  if (s === void 0) return r === "required" ? [{ kind: "set", key: n, value: [] }] : [];
  let h = getValidStringArray(s);
  if (h === s) return [];
  return Array.isArray(s) || r === "required"
    ? [{ kind: "set", key: n, value: h }]
    : [{ kind: "remove", key: n }];
}
//@ chunk-e6aww6q8.js:338459-338564 placement
function applyFieldEdits(e, n) {
  for (let r of n)
    if (r.kind === "set") e[r.key] = r.value;
    else Reflect.deleteProperty(e, r.key);
}

export { createRowRepairer, filterStopHookSummariesOnResume };
