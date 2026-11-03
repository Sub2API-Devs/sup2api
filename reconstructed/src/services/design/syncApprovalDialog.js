/**
 * services/design/syncApprovalDialog.ts
 *
 * 2.1.316 新增：Claude Design 同步审批对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-98n6ge4d.js (18)
 * attribution: placement 18
 */
import { isAbsolute } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, o, A } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  fitsLabelLimit,
  hasVisibleText,
  hasSuspiciousText,
  listLabel,
  HH,
  MAX_DISPLAY_UNITS,
  uniqueLabels,
  displayField,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { countCharInString, plural } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
import { XL, WBt } from "../mcp/designPlanGate.js";
import { STANDALONE_DESIGN_CLOSING_NOTICE } from "../../tools/DesignSyncTool/DesignSyncTool.js";

/**
 * Design 同步审批对话框的提示文字、宽度上限，以及 finalize_plan 与 create_project 的输入结构。
 */
//@ chunk-98n6ge4d.js:9063-9550 placement
var REVIEW_UPLOAD_NOTE = "Review what will be uploaded or deleted before continuing.",
  NEW_PROJECT_NOTE = "This creates a new project on your claude.ai account.",
  WRITE_GRANT_NOTE = "Approving also grants Claude ongoing write access to your design projects.",
  UNSHOWABLE_NAME = "(can't be shown here)",
  UNLISTED_FILES_HINT = "To see the files not listed here, answer No and ask Claude.",
  MAX_DIALOG_WIDTH = 720,
  FINALIZE_PLAN_INPUT_SCHEMA = DoctorLazy(() =>
    u({
      method: T("finalize_plan"),
      projectId: o(),
      localDir: o().default("."),
      writes: A(o()).default([]),
      deletes: A(o()).default([]),
    }),
  ),
  CREATE_PROJECT_INPUT_SCHEMA = DoctorLazy(() => u({ method: T("create_project"), name: o() }));
//@ chunk-98n6ge4d.js:9550-9637 placement
function q(e, n) {
  if (!fitsLabelLimit(e) || !hasVisibleText(e) || hasSuspiciousText(e)) return;
  let s = listLabel(e);
  return bunStringWidth(s) <= n ? s : void 0;
}
//@ chunk-98n6ge4d.js:9637-9791 placement
function revealWhitespace(e) {
  return e.replace(/[\s\u2423\u2039]/gu, (n) =>
    n === " " ? "\u2423" : `\u2039U+${n.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}\u203A`,
  );
}
//@ chunk-98n6ge4d.js:9791-9844 placement
function x(e, n) {
  return e.length > HH ? void 0 : q(revealWhitespace(e), n);
}
//@ chunk-98n6ge4d.js:9844-10130 placement
function formatPathList(paths) {
  let joined = paths.join(", ");
  if (joined.length > MAX_DISPLAY_UNITS || bunStringWidth(joined) > MAX_DIALOG_WIDTH) return;
  let filtered = paths.map(revealWhitespace).filter((i) => q(i, 1 / 0) !== void 0),
    r = paths.length - filtered.length;
  if (r > 0 && filtered.length === 0) return;
  return {
    text: [
      ...(filtered.length > 0 ? [uniqueLabels(filtered, listLabel).join(", ")] : []),
      ...(r > 0 ? [`${r} that can't be shown here`] : []),
    ].join(" and "),
    whole: r === 0,
  };
}
//@ chunk-98n6ge4d.js:10130-10422 placement
function fitsDialog(lines, { minColumns: n = 60, maxRows: s = 12 } = {}) {
  let mapped = lines.map((a) => displayField(a).text);
  if (lines.some((a) => a.length > MAX_DISPLAY_UNITS) || bunStringWidth(mapped.join("")) > MAX_DIALOG_WIDTH)
    return !1;
  let max = Math.max(...mapped.map((a) => bunStringWidth(a)));
  for (let a = n; a <= Math.max(n, max); a++) {
    let joined = mapped.map((l) => wrapAnsi(l, a, { trim: !0, hard: !0 })).join(`
`);
    if (
      countCharInString(
        joined,
        `
`,
      ) >= s
    )
      return !1;
  }
  return !0;
}
//@ chunk-98n6ge4d.js:10422-10438 placement
var Be = 50,
  Se = 34;
//@ chunk-98n6ge4d.js:10438-10492 placement
function We(e) {
  return fitsDialog(e, { minColumns: Se, maxRows: 11 });
}
//@ chunk-98n6ge4d.js:10492-10639 placement
function uploadPlanTitle(e) {
  let n = (e.writes?.length ?? 0) > 0,
    s = (e.deletes?.length ?? 0) > 0;
  return `${n && s ? "Upload and delete" : s ? "Delete" : "Upload"} design system files`;
}
//@ chunk-98n6ge4d.js:10639-10738 placement
function Z(e) {
  return [
    `From folder: ${x(e.localDir, 1 / 0) ?? UNSHOWABLE_NAME}`,
    `To project: ${x(e.projectId, 48) ?? UNSHOWABLE_NAME}`,
  ];
}
/**
 * 为审批对话框生成文件变更描述的候选（按完整列表、匹配模式、仅计数逐级简化），每个候选标明是否列全。
 */
//@ chunk-98n6ge4d.js:10738-11336 placement
function describeFileChanges(verb, paths) {
  let filtered = uniq(paths.map(XL)).filter((f) => f !== ""),
    filtered_2 = filtered.filter((f) => !WBt(f)),
    filtered_3 = filtered.filter(WBt),
    a = formatPathList(filtered_2),
    c = formatPathList(filtered_3),
    l = verb === "Delete" ? "project file" : "file",
    h = filtered_2.length > 0 ? [`${verb} ${filtered_2.length} ${plural(filtered_2.length, l)}`] : [],
    g = filtered_3.length > 0 ? [`${verb} ${l}s matching: ${c?.text}`] : [];
  return [
    ...(c !== void 0 && a !== void 0
      ? [{ lines: [...g, ...h.map((f) => `${f}: ${a.text}`)], whole: c.whole && a.whole }]
      : []),
    ...(c !== void 0 && filtered_3.length > 0 && filtered_2.length > 0
      ? [{ lines: [...g, ...h], whole: !1 }]
      : []),
    ...(filtered.length > 0
      ? [
          {
            lines: [
              [
                ...h,
                ...(filtered_3.length > 0
                  ? [
                      `${filtered_2.length > 0 ? "files" : `${verb} ${l}s`} matching ${filtered_3.length} ${plural(filtered_3.length, "pattern")}`,
                    ]
                  : []),
              ].join(" and "),
            ],
            whole: !1,
          },
        ]
      : []),
  ];
}
//@ chunk-98n6ge4d.js:11336-11494 placement
function createProjectLines(e, n) {
  return [
    `Name: ${q(e, n) ?? x(e, 1 / 0) ?? UNSHOWABLE_NAME}`,
    "Everyone in your organization can see the new project. You can change that from its Share menu.",
    STANDALONE_DESIGN_CLOSING_NOTICE,
  ];
}
//@ chunk-98n6ge4d.js:11494-11554 placement
var B = "Create a design system project on claude.ai/design?";
//@ chunk-98n6ge4d.js:11554-11594 placement
function Ie(e) {
  return x(e, 1 / 0) !== void 0;
}
/**
 * 为 Claude Design 同步构造审批问题：finalize_plan 列出上传/删除的文件（选能放进对话框的最详细版本），create_project 显示项目名与可见性说明；放不下时返回 undefined。
 */
//@ chunk-98n6ge4d.js:11594-12288 placement
function buildSyncApprovalQuestion(input, notice) {
  let s = notice === WRITE_GRANT_NOTE ? [notice] : [],
    r = FINALIZE_PLAN_INPUT_SCHEMA().safeParse(input).data;
  if (r !== void 0 && isAbsolute(r.localDir) && (s.length > 0 || notice === REVIEW_UPLOAD_NOTE)) {
    let a = `${uploadPlanTitle(r)} ${r.deletes.length === 0 ? "to" : r.writes.length === 0 ? "from" : "on"} claude.ai/design?`,
      c = describeFileChanges("Upload", r.writes),
      flattened = describeFileChanges("Delete", r.deletes).flatMap((f) =>
        c.map((m) => [...f.lines, ...m.lines, ...(f.whole && m.whole ? [] : [UNLISTED_FILES_HINT])]),
      ),
      h = [...s, ...Z(r)],
      found = flattened.find((f) => fitsDialog([a, ...h, ...f]));
    return found === void 0 || !We([a, ...h]) ? void 0 : { question: a, lines: [...h, ...found], values: [] };
  }
  let i = CREATE_PROJECT_INPUT_SCHEMA().safeParse(input).data;
  if (i !== void 0 && (s.length > 0 || notice === NEW_PROJECT_NOTE)) {
    let a = [...s, ...createProjectLines(i.name, 28)];
    return fitsDialog([B, ...a]) &&
      (bunStringWidth(q(i.name, 28) ?? x(i.name, 1 / 0) ?? "") <= Be ||
        fitsDialog([B, ...a], { minColumns: Se }))
      ? { question: B, lines: a, values: [] }
      : void 0;
  }
  return;
}
//@ chunk-98n6ge4d.js:12288-12545 placement
function syncApprovalSummary(e) {
  let n = FINALIZE_PLAN_INPUT_SCHEMA().safeParse(e).data;
  if (n !== void 0)
    return [...Z(n), "Files aren't listed here. To see them, answer No and ask Claude."].join("; ");
  let s = CREATE_PROJECT_INPUT_SCHEMA().safeParse(e).data;
  if (s !== void 0) {
    let [r, ...i] = createProjectLines(s.name, 0);
    return `${r}; ${i.join(" ")}`;
  }
  return;
}
//@ chunk-98n6ge4d.js:12545-12710 placement
function syncApprovalLines(e) {
  let [n, s] = [describeFileChanges("Delete", e.deletes)[0], describeFileChanges("Upload", e.writes)[0]];
  return [
    ...Z(e),
    ...(n?.lines ?? []),
    ...(s?.lines ?? []),
    ...((n?.whole ?? !0) && (s?.whole ?? !0) ? [] : [UNLISTED_FILES_HINT]),
  ];
}
//@ chunk-98n6ge4d.js:12710-12747 placement
function Ee(e) {
  return [B, ...createProjectLines(e, 28)];
}

export {
  uploadPlanTitle,
  syncApprovalSummary,
  buildSyncApprovalQuestion,
  Ie,
  syncApprovalLines,
  WRITE_GRANT_NOTE,
  REVIEW_UPLOAD_NOTE,
  Ee,
  NEW_PROJECT_NOTE,
};
