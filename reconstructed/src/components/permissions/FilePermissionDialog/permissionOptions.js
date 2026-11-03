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
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
} from "path";
import { homedir, homedir as homedir_2, homedir as homedir_3 } from "os";
import { expandPath } from "../../../utils/path.js";
import { getOriginalCwd } from "../../../bootstrap/state.js";
import { normalizeCaseForComparison } from "../../../utils/permissions/filesystem.js";
import { CONSENT_ROW_LIMITS, normalizeRulePath, consentRowLabel, Cpt } from "../consentRows.js";
import { FILE_READ_TOOL_NAME } from "../../../tools/FileReadTool/constants.js";
import {
  fitsLabelLimit,
  disambiguateLabels,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { uniq } from "../../../utils/collections.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../../ink/components/Text.js";
import { formatPathList } from "../shellPermissionHelpers.js";
import { getShortcutDisplay } from "../../../keybindings/shortcutFormat.js";
import { T$t } from "../permissionCardKinds.js";
import { extractDirectories } from "../PermissionDecisionDebugInfo.js";
import { handleAcceptSession } from "./usePermissionHandler.js";

//@ chunk-18hwfzwa.js:1367026-1367159 fingerprint = isInClaudeFolder (1)
function isInClaudeFolder(filePath) {
  let absolutePath = expandPath(filePath),
    claudeFolderPath = expandPath(`${getOriginalCwd()}/.claude`),
    normalizedAbsolutePath = normalizeCaseForComparison(absolutePath),
    normalizedClaudeFolderPath = normalizeCaseForComparison(claudeFolderPath);
  return (
    normalizedAbsolutePath.startsWith(normalizedClaudeFolderPath + sep_4.toLowerCase()) ||
    normalizedAbsolutePath.startsWith(normalizedClaudeFolderPath + "/")
  );
}
//@ chunk-18hwfzwa.js:1367159-1367291 fingerprint = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(filePath) {
  let absolutePath = expandPath(filePath),
    globalClaudeFolderPath = join_10(homedir_2(), ".claude"),
    normalizedAbsolutePath = normalizeCaseForComparison(absolutePath),
    normalizedGlobalClaudeFolderPath = normalizeCaseForComparison(globalClaudeFolderPath);
  return (
    normalizedAbsolutePath.startsWith(normalizedGlobalClaudeFolderPath + sep_4.toLowerCase()) ||
    normalizedAbsolutePath.startsWith(normalizedGlobalClaudeFolderPath + "/")
  );
}
//@ chunk-18hwfzwa.js:1367291-1367413 placement
var YES_ASK_AGAIN = "yes-ask-again",
  Cht = "and tell Claude what to do next",
  Tht = new Set(["addRules"]),
  jLo = "(file family: no shell tool)";
/**
 * 建议规则全是 Read 路径规则时生成 "Yes, allow reading from … during this session" 标签，过多或过长返回 null。
 */
//@ chunk-18hwfzwa.js:1367413-1367850 placement
function buildReadRuleConsentLabel(h) {
  let flattened = h.filter((ke) => ke.type === "addRules").flatMap((ke) => ke.rules);
  if (flattened.length === 0 || flattened.length > CONSENT_ROW_LIMITS) return null;
  let D = [];
  for (let ke of flattened) {
    if (
      ke.toolName !== FILE_READ_TOOL_NAME ||
      ke.ruleContent === void 0 ||
      !normalizeRulePath(ke.ruleContent) ||
      !fitsLabelLimit(ke.ruleContent)
    )
      return null;
    D.push(ke.ruleContent);
  }
  let L = uniq(D),
    ee = disambiguateLabels(L, (ke) => consentRowLabel(normalizeRulePath(ke)));
  if (bunStringWidth(ee.join(" and ")) > Cpt) return null;
  return r(Text, { children: ["Yes, allow reading from ", formatPathList(ee), " during this session"] });
}
/**
 * 文件权限选项：允许一次；本会话允许编辑（项目内 / ~/.claude / 项目 .claude 目录的不同文案，shift+tab 循环模式）；拒绝。
 */
//@ chunk-18hwfzwa.js:1369244-1370706 fingerprint = getFilePermissionOptions (0.687)
function getFilePermissionOptions({
  filePath: filePath,
  toolPermissionContext: toolPermissionContext,
  operationType: operationType = "write",
  onRejectFeedbackChange: onRejectFeedbackChange,
  onAcceptFeedbackChange: onAcceptFeedbackChange,
  yesInputMode: yesInputMode = !1,
  noInputMode: noInputMode = !1,
  standingRowVetoed: standingRowVetoed = !1,
  directoryGrantOnly: directoryGrantOnly = !1,
  offerBlockOutsideReads: offerBlockOutsideReads = !1,
  onAllowOnceFeedbackChange: onAllowOnceFeedbackChange,
  allowOnceInputMode: allowOnceInputMode = !1,
}) {
  let options = [],
    kt = getShortcutDisplay("confirm:cycleMode", "Confirmation", "shift+tab"),
    At = offerBlockOutsideReads ? T$t.allow : "Yes",
    It = offerBlockOutsideReads ? T$t.ask_again : "No";
  if (yesInputMode && onAcceptFeedbackChange)
    options.push({
      type: "input",
      label: At,
      value: "yes",
      placeholder: Cht,
      onChange: onAcceptFeedbackChange,
      allowEmptySubmitToCancel: !0,
      option: { type: "accept-once" },
    });
  else options.push({ label: At, value: "yes", option: { type: "accept-once" } });
  if (offerBlockOutsideReads)
    options.push({ label: T$t.block, value: "block-outside-reads", option: { type: "block-outside-reads" } });
  let Ot = offerBlockOutsideReads
    ? null
    : standingRowVetoed
      ? directoryGrantOnly
        ? extractDirectories(filePath, operationType, toolPermissionContext)
        : null
      : handleAcceptSession(filePath, operationType, toolPermissionContext);
  if (Ot !== null) {
    let Dt =
      Ot.value === "yes-session" && operationType !== "read"
        ? r(Text, { children: [Ot.row.node, " ", r(Text, { bold: !0, children: ["(", kt, ")"] })] })
        : Ot.row.node;
    options.push({ label: Dt, value: Ot.value, option: { type: "accept-session", row: Ot.row } });
  }
  if (noInputMode && onRejectFeedbackChange)
    options.push({
      type: "input",
      label: It,
      value: "no",
      placeholder: "and tell Claude what to do differently",
      onChange: onRejectFeedbackChange,
      allowEmptySubmitToCancel: !0,
      option: { type: "reject" },
    });
  else options.push({ label: It, value: "no", option: { type: "reject" } });
  if (offerBlockOutsideReads)
    if (allowOnceInputMode && onAllowOnceFeedbackChange)
      options.push({
        type: "input",
        label: T$t.allow_once,
        value: YES_ASK_AGAIN,
        placeholder: Cht,
        onChange: onAllowOnceFeedbackChange,
        allowEmptySubmitToCancel: !0,
        option: { type: "allow-outside-read-once" },
      });
    else
      options.push({
        label: T$t.allow_once,
        value: YES_ASK_AGAIN,
        option: { type: "allow-outside-read-once" },
      });
  return options;
}

export {
  isInClaudeFolder,
  isInGlobalClaudeFolder,
  Tht,
  jLo,
  buildReadRuleConsentLabel,
  YES_ASK_AGAIN,
  getFilePermissionOptions,
};
