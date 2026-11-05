/**
 * components/permissions/FilePermissionDialog/permissionOptions.tsx
 *
 * 文件权限选项：按是否在 .claude 目录/全局 .claude 目录决定 "本会话允许" 文案；本模块混入大量 isInGlobalClaudeFolder 副本（shared 指纹）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilePermissionDialog/permissionOptions.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-czq1j3j2.js (5)
 * attribution: fingerprint 3, layout 1, placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { join, sep } from "path";
import { homedir } from "os";
import { isDiskless, getProjectConfigRoot, getOriginalCwd } from "../../../bootstrap/state.js";
import { findGitRoot, findCanonicalGitRoot } from "../../../utils/git.js";
import { normalizePathForCompare } from "../../../utils/file.js";
import { expandPath } from "../../../utils/path.js";
import {
  normalizeCaseForComparison,
  normalizeCaseForComparison_2,
} from "../../../utils/permissions/filesystem.js";
import {
  CONSENT_ROW_LIMITS,
  normalizeRulePath,
  consentRowLabel,
  MAX_CONSENT_SUGGESTION_WIDTH,
} from "../consentRows.js";
import { READ } from "../../../tools/FileReadTool/constants.js";
import {
  fitsLabelLimit,
  disambiguateLabels,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { jsxProd_default_2 } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { formatPathList } from "../shellPermissionHelpers.js";
import { getShortcutDisplay } from "../../../keybindings/shortcutFormat.js";
import { OUTSIDE_READ_ACTION_LABELS } from "../permissionCardKinds.js";
import { extractDirectories } from "../PermissionDecisionDebugInfo.js";
import { handleAcceptSession } from "./usePermissionHandler.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:810802-811016 fingerprint (2.1.88 match: isInGlobalClaudeFolder, 1)
function isInGlobalClaudeFolder(projectDirs, subdir, cwd) {
  if (cwd === null || isDiskless() || getProjectConfigRoot() !== null) return;
  let absolutePath = findGitRoot(cwd);
  let normalizedAbsolutePath = findCanonicalGitRoot(cwd);
  if (!absolutePath || !normalizedAbsolutePath || normalizedAbsolutePath === absolutePath) return;
  let normalizedGlobalClaudeFolderPath = normalizePathForCompare(join(absolutePath, ".claude", subdir));
  if (projectDirs.some((dir) => normalizePathForCompare(dir) === normalizedGlobalClaudeFolderPath)) return;
  let canonicalClaudeDir = join(normalizedAbsolutePath, ".claude", subdir);
  if (!projectDirs.includes(canonicalClaudeDir)) projectDirs.push(canonicalClaudeDir);
}
//@ chunk-czq1j3j2.js:1389826-1389959 fingerprint (2.1.88 match: isInClaudeFolder, 1)
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
//@ chunk-czq1j3j2.js:1389959-1390091 layout (2.1.88 match: isInGlobalClaudeFolder, 1)
function isInGlobalClaudeFolder_2(filePath) {
  let absolutePath = expandPath(filePath);
  let globalClaudeFolderPath = join(homedir(), ".claude");
  let normalizedAbsolutePath = normalizeCaseForComparison(absolutePath);
  let normalizedGlobalClaudeFolderPath = normalizeCaseForComparison(globalClaudeFolderPath);
  return (
    normalizedAbsolutePath.startsWith(normalizedGlobalClaudeFolderPath + sep.toLowerCase()) ||
    normalizedAbsolutePath.startsWith(normalizedGlobalClaudeFolderPath + "/")
  );
}
//@ chunk-czq1j3j2.js:1390091-1390213 placement
var YES_ASK_AGAIN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ACCEPT_WITH_INSTRUCTIONS_PLACEHOLDER;
var FILE_RULE_UPDATE_TYPES;
var FILE_FAMILY_TOOLTIP;
deferInit("chunk-czq1j3j2.js:1390091", () => {
  YES_ASK_AGAIN = "yes-ask-again";
  ACCEPT_WITH_INSTRUCTIONS_PLACEHOLDER = "and tell Claude what to do next";
  FILE_RULE_UPDATE_TYPES = new Set(["addRules"]);
  FILE_FAMILY_TOOLTIP = "(file family: no shell tool)";
});
//@ chunk-czq1j3j2.js:1390213-1390650 placement
/**
 * 建议规则全是 Read 路径规则时生成 "Yes, allow reading from … during this session" 标签，过多或过长返回 null。
 */
function buildReadRuleConsentLabel(updates) {
  let flattened = updates.filter((update) => update.type === "addRules").flatMap((update) => update.rules);
  if (flattened.length === 0 || flattened.length > CONSENT_ROW_LIMITS) return null;
  let paths = [];
  for (let rule of flattened) {
    if (
      rule.toolName !== READ ||
      rule.ruleContent === undefined ||
      !normalizeRulePath(rule.ruleContent) ||
      !fitsLabelLimit(rule.ruleContent)
    )
      return null;
    paths.push(rule.ruleContent);
  }
  let uniquePaths = normalizeCaseForComparison_2(paths);
  let displayLabels = disambiguateLabels(uniquePaths, (path) => consentRowLabel(normalizeRulePath(path)));
  if (bunStringWidth(displayLabels.join(" and ")) > MAX_CONSENT_SUGGESTION_WIDTH) return null;
  return jsxProd_default_2(Text, {
    children: ["Yes, allow reading from ", formatPathList(displayLabels), " during this session"],
  });
}
//@ chunk-czq1j3j2.js:1392044-1393506 fingerprint (2.1.88 match: getFilePermissionOptions, 0.687)
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
  let sessionRow = offerBlockOutsideReads
    ? null
    : standingRowVetoed
      ? directoryGrantOnly
        ? extractDirectories(filePath, operationType, toolPermissionContext)
        : null
      : handleAcceptSession(filePath, operationType, toolPermissionContext);
  if (sessionRow !== null) {
    let label =
      sessionRow.value === "yes-session" && operationType !== "read"
        ? jsxProd_default_2(Text, {
            children: [
              sessionRow.row.node,
              " ",
              jsxProd_default_2(Text, {
                bold: true,
                children: ["(", shortcutDisplay, ")"],
              }),
            ],
          })
        : sessionRow.row.node;
    options.push({
      label,
      value: sessionRow.value,
      option: {
        type: "accept-session",
        row: sessionRow.row,
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
  isInGlobalClaudeFolder,
  isInClaudeFolder,
  isInGlobalClaudeFolder_2,
  FILE_RULE_UPDATE_TYPES,
  FILE_FAMILY_TOOLTIP,
  buildReadRuleConsentLabel,
  YES_ASK_AGAIN,
  getFilePermissionOptions,
};
