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
import { u, literal, string, array } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  fitsLabelLimit,
  hasVisibleText,
  hasSuspiciousText,
  listLabel,
  MAX_RAW_DISPLAY_CHARS,
  MAX_DISPLAY_UNITS,
  uniqueLabels,
  displayField,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { wrapAnsi } from "../../ink/wrapAnsi.js";
import { countCharInString, plural } from "../../utils/stringUtils.js";
import { uniq } from "../../utils/collections.js";
import { normalizePlanPath, hasGlobChars } from "../mcp/designPlanGate.js";
import { STANDALONE_DESIGN_CLOSING_NOTICE } from "../../tools/DesignSyncTool/DesignSyncTool.js";

//@ chunk-98n6ge4d.js:9063-9550 placement
/**
 * Design 同步审批对话框的提示文字、宽度上限，以及 finalize_plan 与 create_project 的输入结构。
 */
var REVIEW_UPLOAD_NOTE = "Review what will be uploaded or deleted before continuing.";
var NEW_PROJECT_NOTE = "This creates a new project on your claude.ai account.";
var WRITE_GRANT_NOTE = "Approving also grants Claude ongoing write access to your design projects.";
var UNSHOWABLE_NAME = "(can't be shown here)";
var UNLISTED_FILES_HINT = "To see the files not listed here, answer No and ask Claude.";
var MAX_DIALOG_WIDTH = 720;
var FINALIZE_PLAN_INPUT_SCHEMA = DoctorLazy(() =>
  u({
    method: literal("finalize_plan"),
    projectId: string(),
    localDir: string().default("."),
    writes: array(string()).default([]),
    deletes: array(string()).default([]),
  }),
);
var CREATE_PROJECT_INPUT_SCHEMA = DoctorLazy(() =>
  u({
    method: literal("create_project"),
    name: string(),
  }),
);
//@ chunk-98n6ge4d.js:9550-9637 placement
/**
 * 把文本整理成可展示的标签（长度、可见字符、可疑内容都过关才返回）。
 */
function labelIfShowable(e, n) {
  if (!fitsLabelLimit(e) || !hasVisibleText(e) || hasSuspiciousText(e)) return;
  let s = listLabel(e);
  return bunStringWidth(s) <= n ? s : undefined;
}
//@ chunk-98n6ge4d.js:9637-9791 placement
function revealWhitespace(e) {
  return e.replace(/[\s\u2423\u2039]/gu, (n) =>
    n === " " ? "\u2423" : `\u2039U+${n.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}\u203A`,
  );
}
//@ chunk-98n6ge4d.js:9791-9844 placement
/**
 * 先去长度上限再走 q 的版本。
 */
function labelIfShowableLong(e, n) {
  return e.length > MAX_RAW_DISPLAY_CHARS ? undefined : labelIfShowable(revealWhitespace(e), n);
}
//@ chunk-98n6ge4d.js:9844-10130 placement
function formatPathList(paths) {
  let joined = paths.join(", ");
  if (joined.length > MAX_DISPLAY_UNITS || bunStringWidth(joined) > MAX_DIALOG_WIDTH) return;
  let filtered = paths.map(revealWhitespace).filter((i) => labelIfShowable(i, 1 / 0) !== undefined);
  let r = paths.length - filtered.length;
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
  let mapped = lines.map((line) => displayField(line).text);
  if (
    lines.some((line) => line.length > MAX_DISPLAY_UNITS) ||
    bunStringWidth(mapped.join("")) > MAX_DIALOG_WIDTH
  )
    return false;
  let max = Math.max(...mapped.map((a) => bunStringWidth(a)));
  for (let a = n; a <= Math.max(n, max); a++) {
    let joined = mapped.map((l) =>
      wrapAnsi(l, a, {
        trim: true,
        hard: true,
      }),
    ).join(`
`);
    if (
      countCharInString(
        joined,
        `
`,
      ) >= s
    )
      return false;
  }
  return true;
}
//@ chunk-98n6ge4d.js:10422-10438 placement
/**
 * 审批对话框的最小列数（34）。
 */
var MAX_NAME_COLUMNS = 50;
var MIN_DIALOG_COLUMNS = 34;
//@ chunk-98n6ge4d.js:10438-10492 placement
/**
 * 多行内容能否放进审批对话框（最小列数、最多 11 行）。
 */
function fitsApprovalText(lines) {
  return fitsDialog(lines, {
    minColumns: MIN_DIALOG_COLUMNS,
    maxRows: 11,
  });
}
//@ chunk-98n6ge4d.js:10492-10639 placement
function uploadPlanTitle(e) {
  let n = (e.writes?.length ?? 0) > 0;
  let s = (e.deletes?.length ?? 0) > 0;
  return `${n && s ? "Upload and delete" : s ? "Delete" : "Upload"} design system files`;
}
//@ chunk-98n6ge4d.js:10639-10738 placement
/**
 * 生成 “From folder / To project” 两行。
 */
function buildSyncTargetLines(e) {
  return [
    `From folder: ${labelIfShowableLong(e.localDir, 1 / 0) ?? UNSHOWABLE_NAME}`,
    `To project: ${labelIfShowableLong(e.projectId, 48) ?? UNSHOWABLE_NAME}`,
  ];
}
//@ chunk-98n6ge4d.js:10738-11336 placement
/**
 * 为审批对话框生成文件变更描述的候选（按完整列表、匹配模式、仅计数逐级简化），每个候选标明是否列全。
 */
function describeFileChanges(verb, paths) {
  let filtered = uniq(paths.map(normalizePlanPath)).filter((f) => f !== "");
  let paths_2 = filtered.filter((f) => !hasGlobChars(f));
  let paths_3 = filtered.filter(hasGlobChars);
  let a = formatPathList(paths_2);
  let c = formatPathList(paths_3);
  let l = verb === "Delete" ? "project file" : "file";
  let h = paths_2.length > 0 ? [`${verb} ${paths_2.length} ${plural(paths_2.length, l)}`] : [];
  let g = paths_3.length > 0 ? [`${verb} ${l}s matching: ${c?.text}`] : [];
  return [
    ...(c !== undefined && a !== undefined
      ? [
          {
            lines: [...g, ...h.map((f) => `${f}: ${a.text}`)],
            whole: c.whole && a.whole,
          },
        ]
      : []),
    ...(c !== undefined && paths_3.length > 0 && paths_2.length > 0
      ? [
          {
            lines: [...g, ...h],
            whole: false,
          },
        ]
      : []),
    ...(filtered.length > 0
      ? [
          {
            lines: [
              [
                ...h,
                ...(paths_3.length > 0
                  ? [
                      `${paths_2.length > 0 ? "files" : `${verb} ${l}s`} matching ${paths_3.length} ${plural(paths_3.length, "pattern")}`,
                    ]
                  : []),
              ].join(" and "),
            ],
            whole: false,
          },
        ]
      : []),
  ];
}
//@ chunk-98n6ge4d.js:11336-11494 placement
function createProjectLines(name, n) {
  return [
    `Name: ${labelIfShowable(name, n) ?? labelIfShowableLong(name, 1 / 0) ?? UNSHOWABLE_NAME}`,
    "Everyone in your organization can see the new project. You can change that from its Share menu.",
    STANDALONE_DESIGN_CLOSING_NOTICE,
  ];
}
//@ chunk-98n6ge4d.js:11494-11554 placement
/**
 * 创建 Design 项目时询问用户的固定问题。
 */
var CREATE_PROJECT_QUESTION = "Create a design system project on claude.ai/design?";
//@ chunk-98n6ge4d.js:11554-11594 placement
/**
 * 名称是否足够短可以被展示。
 */
function isShowableName(name) {
  return labelIfShowableLong(name, 1 / 0) !== undefined;
}
//@ chunk-98n6ge4d.js:11594-12288 placement
/**
 * 为 Claude Design 同步构造审批问题：finalize_plan 列出上传/删除的文件（选能放进对话框的最详细版本），create_project 显示项目名与可见性说明；放不下时返回 undefined。
 */
function buildSyncApprovalQuestion(input, notice) {
  let s = notice === WRITE_GRANT_NOTE ? [notice] : [];
  let r = FINALIZE_PLAN_INPUT_SCHEMA().safeParse(input).data;
  if (r !== undefined && isAbsolute(r.localDir) && (s.length > 0 || notice === REVIEW_UPLOAD_NOTE)) {
    let a = `${uploadPlanTitle(r)} ${r.deletes.length === 0 ? "to" : r.writes.length === 0 ? "from" : "on"} claude.ai/design?`;
    let c = describeFileChanges("Upload", r.writes);
    let flattened = describeFileChanges("Delete", r.deletes).flatMap((f) =>
      c.map((m) => [...f.lines, ...m.lines, ...(f.whole && m.whole ? [] : [UNLISTED_FILES_HINT])]),
    );
    let h = [...s, ...buildSyncTargetLines(r)];
    let found = flattened.find((f) => fitsDialog([a, ...h, ...f]));
    return found === undefined || !fitsApprovalText([a, ...h])
      ? undefined
      : {
          question: a,
          lines: [...h, ...found],
          values: [],
        };
  }
  let i = CREATE_PROJECT_INPUT_SCHEMA().safeParse(input).data;
  if (i !== undefined && (s.length > 0 || notice === NEW_PROJECT_NOTE)) {
    let a = [...s, ...createProjectLines(i.name, 28)];
    return fitsDialog([CREATE_PROJECT_QUESTION, ...a]) &&
      (bunStringWidth(labelIfShowable(i.name, 28) ?? labelIfShowableLong(i.name, 1 / 0) ?? "") <=
        MAX_NAME_COLUMNS ||
        fitsDialog([CREATE_PROJECT_QUESTION, ...a], {
          minColumns: MIN_DIALOG_COLUMNS,
        }))
      ? {
          question: CREATE_PROJECT_QUESTION,
          lines: a,
          values: [],
        }
      : undefined;
  }
  return;
}
//@ chunk-98n6ge4d.js:12288-12545 placement
function syncApprovalSummary(e) {
  let n = FINALIZE_PLAN_INPUT_SCHEMA().safeParse(e).data;
  if (n !== undefined)
    return [
      ...buildSyncTargetLines(n),
      "Files aren't listed here. To see them, answer No and ask Claude.",
    ].join("; ");
  let s = CREATE_PROJECT_INPUT_SCHEMA().safeParse(e).data;
  if (s !== undefined) {
    let [r, ...i] = createProjectLines(s.name, 0);
    return `${r}; ${i.join(" ")}`;
  }
  return;
}
//@ chunk-98n6ge4d.js:12545-12710 placement
function syncApprovalLines(e) {
  let [n, s] = [describeFileChanges("Delete", e.deletes)[0], describeFileChanges("Upload", e.writes)[0]];
  return [
    ...buildSyncTargetLines(e),
    ...(n?.lines ?? []),
    ...(s?.lines ?? []),
    ...((n?.whole ?? true) && (s?.whole ?? true) ? [] : [UNLISTED_FILES_HINT]),
  ];
}
//@ chunk-98n6ge4d.js:12710-12747 placement
/**
 * 创建项目问题的完整正文（问题 + 项目信息行）。
 */
function buildCreateProjectQuestionLines(e) {
  return [CREATE_PROJECT_QUESTION, ...createProjectLines(e, 28)];
}
export {
  uploadPlanTitle,
  syncApprovalSummary,
  buildSyncApprovalQuestion,
  isShowableName,
  syncApprovalLines,
  WRITE_GRANT_NOTE,
  REVIEW_UPLOAD_NOTE,
  buildCreateProjectQuestionLines,
  NEW_PROJECT_NOTE,
};
