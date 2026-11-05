/**
 * services/design/syncApprovalDialog.ts
 *
 * 2.1.316 新增：Claude Design 同步审批对话框
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-zevfa8jm.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute } from "path";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, literal, stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { normalizePattern, hasGlobChars } from "../mcp/designPlanGate.js";
import { STANDALONE_DESIGN_CLOSING_NOTICE } from "../../tools/DesignSyncTool/DesignSyncTool.js";

//@ chunk-zevfa8jm.js:9686-10174 placement
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
  objectSchema({
    method: literal("finalize_plan"),
    projectId: stringSchema(),
    localDir: stringSchema().default("."),
    writes: array(stringSchema()).default([]),
    deletes: array(stringSchema()).default([]),
  }),
);
var CREATE_PROJECT_INPUT_SCHEMA = DoctorLazy(() =>
  objectSchema({
    method: literal("create_project"),
    name: stringSchema(),
  }),
);
//@ chunk-zevfa8jm.js:10174-10261 placement
/**
 * 把文本整理成可展示的标签（长度、可见字符、可疑内容都过关才返回）。
 */
function labelIfShowable(label, maxWidth) {
  if (!fitsLabelLimit(label) || !hasVisibleText(label) || hasSuspiciousText(label)) return;
  let display = listLabel(label);
  return bunStringWidth(display) <= maxWidth ? display : undefined;
}
//@ chunk-zevfa8jm.js:10261-10415 placement
function revealWhitespace(text) {
  return text.replace(/[\s\u2423\u2039]/gu, (char) =>
    char === " "
      ? "\u2423"
      : `\u2039U+${char.charCodeAt(0).toString(16).toUpperCase().padStart(4, "0")}\u203A`,
  );
}
//@ chunk-zevfa8jm.js:10415-10468 placement
/**
 * 先去长度上限再走 q 的版本。
 */
function labelIfShowableLong(label, maxWidth) {
  return label.length > MAX_RAW_DISPLAY_CHARS
    ? undefined
    : labelIfShowable(revealWhitespace(label), maxWidth);
}
//@ chunk-zevfa8jm.js:10468-10754 placement
function formatPathList(paths) {
  let joined = paths.join(", ");
  if (joined.length > MAX_DISPLAY_UNITS || bunStringWidth(joined) > MAX_DIALOG_WIDTH) return;
  let filtered = paths.map(revealWhitespace).filter((label) => labelIfShowable(label, 1 / 0) !== undefined);
  let hiddenCount = paths.length - filtered.length;
  if (hiddenCount > 0 && filtered.length === 0) return;
  return {
    text: [
      ...(filtered.length > 0 ? [uniqueLabels(filtered, listLabel).join(", ")] : []),
      ...(hiddenCount > 0 ? [`${hiddenCount} that can't be shown here`] : []),
    ].join(" and "),
    whole: hiddenCount === 0,
  };
}
//@ chunk-zevfa8jm.js:10754-11046 placement
function fitsDialog(lines, { minColumns = 60, maxRows = 12 } = {}) {
  let mapped = lines.map((line) => displayField(line).text);
  if (
    lines.some((line) => line.length > MAX_DISPLAY_UNITS) ||
    bunStringWidth(mapped.join("")) > MAX_DIALOG_WIDTH
  )
    return false;
  let max = Math.max(...mapped.map((text) => bunStringWidth(text)));
  for (let columns = minColumns; columns <= Math.max(minColumns, max); columns++) {
    let joined = mapped.map((text) =>
      wrapAnsi(text, columns, {
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
      ) >= maxRows
    )
      return false;
  }
  return true;
}
//@ chunk-zevfa8jm.js:11046-11062 placement
/**
 * 审批对话框的最小列数（34）。
 */
var MAX_NAME_COLUMNS = 50;
var MIN_DIALOG_COLUMNS = 34;
//@ chunk-zevfa8jm.js:11062-11116 placement
/**
 * 多行内容能否放进审批对话框（最小列数、最多 11 行）。
 */
function fitsApprovalText(lines) {
  return fitsDialog(lines, {
    minColumns: MIN_DIALOG_COLUMNS,
    maxRows: 11,
  });
}
//@ chunk-zevfa8jm.js:11116-11264 placement
function uploadPlanTitle(plan) {
  let hasWrites = (plan.writes?.length ?? 0) > 0;
  let hasDeletes = (plan.deletes?.length ?? 0) > 0;
  return `${hasWrites && hasDeletes ? "Upload and delete" : hasDeletes ? "Delete" : "Upload"} design system files`;
}
//@ chunk-zevfa8jm.js:11264-11364 placement
/**
 * 生成 “From folder / To project” 两行。
 */
function buildSyncTargetLines(target) {
  return [
    `From folder: ${labelIfShowableLong(target.localDir, 1 / 0) ?? UNSHOWABLE_NAME}`,
    `To project: ${labelIfShowableLong(target.projectId, 48) ?? UNSHOWABLE_NAME}`,
  ];
}
//@ chunk-zevfa8jm.js:11364-11963 placement
/**
 * 为审批对话框生成文件变更描述的候选（按完整列表、匹配模式、仅计数逐级简化），每个候选标明是否列全。
 */
function describeFileChanges(verb, paths) {
  let filtered = normalizeCaseForComparison_2(paths.map(normalizePattern)).filter((path) => path !== "");
  let paths_2 = filtered.filter((path) => !hasGlobChars(path));
  let paths_3 = filtered.filter(hasGlobChars);
  let literalList = formatPathList(paths_2);
  let globList = formatPathList(paths_3);
  let noun = verb === "Delete" ? "project file" : "file";
  let literalLines = paths_2.length > 0 ? [`${verb} ${paths_2.length} ${plural(paths_2.length, noun)}`] : [];
  let globLines = paths_3.length > 0 ? [`${verb} ${noun}s matching: ${globList?.text}`] : [];
  return [
    ...(globList !== undefined && literalList !== undefined
      ? [
          {
            lines: [...globLines, ...literalLines.map((line) => `${line}: ${literalList.text}`)],
            whole: globList.whole && literalList.whole,
          },
        ]
      : []),
    ...(globList !== undefined && paths_3.length > 0 && paths_2.length > 0
      ? [
          {
            lines: [...globLines, ...literalLines],
            whole: false,
          },
        ]
      : []),
    ...(filtered.length > 0
      ? [
          {
            lines: [
              [
                ...literalLines,
                ...(paths_3.length > 0
                  ? [
                      `${paths_2.length > 0 ? "files" : `${verb} ${noun}s`} matching ${paths_3.length} ${plural(paths_3.length, "pattern")}`,
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
//@ chunk-zevfa8jm.js:11963-12121 placement
function createProjectLines(projectSummary, maxWidth) {
  return [
    `Name: ${labelIfShowable(projectSummary, maxWidth) ?? labelIfShowableLong(projectSummary, 1 / 0) ?? UNSHOWABLE_NAME}`,
    "Everyone in your organization can see the new project. You can change that from its Share menu.",
    STANDALONE_DESIGN_CLOSING_NOTICE,
  ];
}
//@ chunk-zevfa8jm.js:12121-12181 placement
/**
 * 创建 Design 项目时询问用户的固定问题。
 */
var CREATE_PROJECT_QUESTION = "Create a design system project on claude.ai/design?";
//@ chunk-zevfa8jm.js:12181-12221 placement
/**
 * 名称是否足够短可以被展示。
 */
function isShowableName(name) {
  return labelIfShowableLong(name, 1 / 0) !== undefined;
}
//@ chunk-zevfa8jm.js:12221-12918 placement
/**
 * 为 Claude Design 同步构造审批问题：finalize_plan 列出上传/删除的文件（选能放进对话框的最详细版本），create_project 显示项目名与可见性说明；放不下时返回 undefined。
 */
function buildSyncApprovalQuestion(input, notice) {
  let noticeLines = notice === WRITE_GRANT_NOTE ? [notice] : [];
  let plan = FINALIZE_PLAN_INPUT_SCHEMA().safeParse(input).data;
  if (
    plan !== undefined &&
    isAbsolute(plan.localDir) &&
    (noticeLines.length > 0 || notice === REVIEW_UPLOAD_NOTE)
  ) {
    let question = `${uploadPlanTitle(plan)} ${plan.deletes.length === 0 ? "to" : plan.writes.length === 0 ? "from" : "on"} claude.ai/design?`;
    let uploadChanges = describeFileChanges("Upload", plan.writes);
    let flattened = describeFileChanges("Delete", plan.deletes).flatMap((deleteChange) =>
      uploadChanges.map((uploadChange) => [
        ...deleteChange.lines,
        ...uploadChange.lines,
        ...(deleteChange.whole && uploadChange.whole ? [] : [UNLISTED_FILES_HINT]),
      ]),
    );
    let targetLines = [...noticeLines, ...buildSyncTargetLines(plan)];
    let found = flattened.find((changeLines) => fitsDialog([question, ...targetLines, ...changeLines]));
    return found === undefined || !fitsApprovalText([question, ...targetLines])
      ? undefined
      : {
          question,
          lines: [...targetLines, ...found],
          values: [],
        };
  }
  let createInput = CREATE_PROJECT_INPUT_SCHEMA().safeParse(input).data;
  if (createInput !== undefined && (noticeLines.length > 0 || notice === NEW_PROJECT_NOTE)) {
    let lines = [...noticeLines, ...createProjectLines(createInput.name, 28)];
    return fitsDialog([CREATE_PROJECT_QUESTION, ...lines]) &&
      (bunStringWidth(
        labelIfShowable(createInput.name, 28) ?? labelIfShowableLong(createInput.name, 1 / 0) ?? "",
      ) <= MAX_NAME_COLUMNS ||
        fitsDialog([CREATE_PROJECT_QUESTION, ...lines], {
          minColumns: MIN_DIALOG_COLUMNS,
        }))
      ? {
          question: CREATE_PROJECT_QUESTION,
          lines,
          values: [],
        }
      : undefined;
  }
  return;
}
//@ chunk-zevfa8jm.js:12918-13176 placement
function syncApprovalSummary(input) {
  let plan = FINALIZE_PLAN_INPUT_SCHEMA().safeParse(input).data;
  if (plan !== undefined)
    return [
      ...buildSyncTargetLines(plan),
      "Files aren't listed here. To see them, answer No and ask Claude.",
    ].join("; ");
  let createInput = CREATE_PROJECT_INPUT_SCHEMA().safeParse(input).data;
  if (createInput !== undefined) {
    let [firstLine, ...restLines] = createProjectLines(createInput.name, 0);
    return `${firstLine}; ${restLines.join(" ")}`;
  }
  return;
}
//@ chunk-zevfa8jm.js:13176-13342 placement
function syncApprovalLines(plan) {
  let [deleteChanges, uploadChanges] = [
    describeFileChanges("Delete", plan.deletes)[0],
    describeFileChanges("Upload", plan.writes)[0],
  ];
  return [
    ...buildSyncTargetLines(plan),
    ...(deleteChanges?.lines ?? []),
    ...(uploadChanges?.lines ?? []),
    ...((deleteChanges?.whole ?? true) && (uploadChanges?.whole ?? true) ? [] : [UNLISTED_FILES_HINT]),
  ];
}
//@ chunk-zevfa8jm.js:13342-13379 placement
/**
 * 创建项目问题的完整正文（问题 + 项目信息行）。
 */
function buildCreateProjectQuestionLines(projectName) {
  return [CREATE_PROJECT_QUESTION, ...createProjectLines(projectName, 28)];
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
