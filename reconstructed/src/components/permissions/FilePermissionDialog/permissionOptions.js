/**
 * components/permissions/FilePermissionDialog/permissionOptions.tsx
 *
 * 文件权限选项：按是否在 .claude 目录/全局 .claude 目录决定 "本会话允许" 文案；本模块混入大量 isInGlobalClaudeFolder 副本（shared 指纹）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilePermissionDialog/permissionOptions.tsx
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: fingerprint 3, placement 2
 */
import { sep, join } from "path";
import { homedir } from "os";
import { expandPath } from "../../../utils/path.js";
import { getOriginalCwd } from "../../../bootstrap/state.js";
import { normalizeCaseForComparison } from "../../../utils/permissions/filesystem.js";
import {
  CONSENT_ROW_LIMITS,
  normalizeRulePath,
  consentRowLabel,
  MAX_CONSENT_SUGGESTION_WIDTH,
} from "../consentRows.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import {
  fitsLabelLimit,
  disambiguateLabels,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { uniq } from "../../../utils/collections.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { jsxProd_default_2 } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { formatPathList } from "../shellPermissionHelpers.js";
import { getShortcutDisplay } from "../../../keybindings/shortcutFormat.js";
import { OUTSIDE_READ_ACTION_LABELS } from "../permissionCardKinds.js";
import { extractDirectories } from "../PermissionDecisionDebugInfo.js";
import { handleAcceptSession } from "./usePermissionHandler.js";

//@ chunk-18hwfzwa.js:1367026-1367159 fingerprint = isInClaudeFolder (1)
function isInClaudeFolder(filePath) {
  let absolutePath = expandPath(filePath);
  let claudeFolderPath = expandPath(`${getOriginalCwd()}/.claude`);
  let normalizedAbsolutePath = normalizeCaseForComparison(absolutePath);
  let normalizedClaudeFolderPath = normalizeCaseForComparison(claudeFolderPath);
  return (
    normalizedAbsolutePath.startsWith(normalizedClaudeFolderPath + sep.toLowerCase()) ||
    normalizedAbsolutePath.startsWith(normalizedClaudeFolderPath + "/")
  );
}
//@ chunk-18hwfzwa.js:1367159-1367291 fingerprint = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(filePath) {
  let absolutePath = expandPath(filePath);
  let globalClaudeFolderPath = join(homedir(), ".claude");
  let normalizedAbsolutePath = normalizeCaseForComparison(absolutePath);
  let normalizedGlobalClaudeFolderPath = normalizeCaseForComparison(globalClaudeFolderPath);
  return (
    normalizedAbsolutePath.startsWith(normalizedGlobalClaudeFolderPath + sep.toLowerCase()) ||
    normalizedAbsolutePath.startsWith(normalizedGlobalClaudeFolderPath + "/")
  );
}
//@ chunk-18hwfzwa.js:1367291-1367413 placement
var YES_ASK_AGAIN = "yes-ask-again";
var ACCEPT_WITH_INSTRUCTIONS_PLACEHOLDER = "and tell Claude what to do next";
var FILE_RULE_UPDATE_TYPES = new Set(["addRules"]);
var FILE_FAMILY_TOOLTIP = "(file family: no shell tool)";
//@ chunk-18hwfzwa.js:1367413-1367850 placement
/**
 * 建议规则全是 Read 路径规则时生成 "Yes, allow reading from … during this session" 标签，过多或过长返回 null。
 */
function buildReadRuleConsentLabel(h) {
  let flattened = h.filter((ke) => ke.type === "addRules").flatMap((ke) => ke.rules);
  if (flattened.length === 0 || flattened.length > CONSENT_ROW_LIMITS) return null;
  let D = [];
  for (let ke of flattened) {
    if (
      ke.toolName !== FILE_READ_TOOL_NAME ||
      ke.ruleContent === undefined ||
      !normalizeRulePath(ke.ruleContent) ||
      !fitsLabelLimit(ke.ruleContent)
    )
      return null;
    D.push(ke.ruleContent);
  }
  let L = uniq(D);
  let ee = disambiguateLabels(L, (ke) => consentRowLabel(normalizeRulePath(ke)));
  if (bunStringWidth(ee.join(" and ")) > MAX_CONSENT_SUGGESTION_WIDTH) return null;
  return jsxProd_default_2(Text, {
    children: ["Yes, allow reading from ", formatPathList(ee), " during this session"],
  });
}
//@ chunk-18hwfzwa.js:1369244-1370706 fingerprint = getFilePermissionOptions (0.687)
/**
 * 文件权限选项：允许一次；本会话允许编辑（项目内 / ~/.claude / 项目 .claude 目录的不同文案，shift+tab 循环模式）；拒绝。
 */
function getFilePermissionOptions({
  filePath,
  toolPermissionContext,
  operationType = "write",
  onRejectFeedbackChange,
  onAcceptFeedbackChange,
  yesInputMode = false,
  noInputMode = false,
  standingRowVetoed = false,
  directoryGrantOnly = false,
  offerBlockOutsideReads = false,
  onAllowOnceFeedbackChange,
  allowOnceInputMode = false,
}) {
  let options = [];
  let shortcutDisplay = getShortcutDisplay("confirm:cycleMode", "Confirmation", "shift+tab");
  let label = offerBlockOutsideReads ? OUTSIDE_READ_ACTION_LABELS.allow : "Yes";
  let label_2 = offerBlockOutsideReads ? OUTSIDE_READ_ACTION_LABELS.ask_again : "No";
  if (yesInputMode && onAcceptFeedbackChange)
    options.push({
      type: "input",
      label,
      value: "yes",
      placeholder: ACCEPT_WITH_INSTRUCTIONS_PLACEHOLDER,
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: true,
      option: {
        type: "accept-once",
      },
    });
  else
    options.push({
      label,
      value: "yes",
      option: {
        type: "accept-once",
      },
    });
  if (offerBlockOutsideReads)
    options.push({
      label: OUTSIDE_READ_ACTION_LABELS.block,
      value: "block-outside-reads",
      option: {
        type: "block-outside-reads",
      },
    });
  let Ot = offerBlockOutsideReads
    ? null
    : standingRowVetoed
      ? directoryGrantOnly
        ? extractDirectories(filePath, operationType, toolPermissionContext)
        : null
      : handleAcceptSession(filePath, operationType, toolPermissionContext);
  if (Ot !== null) {
    let label =
      Ot.value === "yes-session" && operationType !== "read"
        ? jsxProd_default_2(Text, {
            children: [
              Ot.row.node,
              " ",
              jsxProd_default_2(Text, {
                bold: true,
                children: ["(", shortcutDisplay, ")"],
              }),
            ],
          })
        : Ot.row.node;
    options.push({
      label,
      value: Ot.value,
      option: {
        type: "accept-session",
        row: Ot.row,
      },
    });
  }
  if (noInputMode && onRejectFeedbackChange)
    options.push({
      type: "input",
      label: label_2,
      value: "no",
      placeholder: "and tell Claude what to do differently",
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: true,
      option: {
        type: "reject",
      },
    });
  else
    options.push({
      label: label_2,
      value: "no",
      option: {
        type: "reject",
      },
    });
  if (offerBlockOutsideReads)
    if (allowOnceInputMode && onAllowOnceFeedbackChange)
      options.push({
        type: "input",
        label: OUTSIDE_READ_ACTION_LABELS.allow_once,
        value: YES_ASK_AGAIN,
        placeholder: ACCEPT_WITH_INSTRUCTIONS_PLACEHOLDER,
        onChange: onAllowOnceFeedbackChange,
        allowEmptySubmitToCancel: true,
        option: {
          type: "allow-outside-read-once",
        },
      });
    else
      options.push({
        label: OUTSIDE_READ_ACTION_LABELS.allow_once,
        value: YES_ASK_AGAIN,
        option: {
          type: "allow-outside-read-once",
        },
      });
  return options;
}
export {
  isInClaudeFolder,
  isInGlobalClaudeFolder,
  FILE_RULE_UPDATE_TYPES,
  FILE_FAMILY_TOOLTIP,
  buildReadRuleConsentLabel,
  YES_ASK_AGAIN,
  getFilePermissionOptions,
};
