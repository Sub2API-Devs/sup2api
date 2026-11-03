/**
 * components/permissions/rules/PermissionRuleList.tsx
 *
 * /permissions 主界面：Recent/Allow/Ask/Deny/Workspace 标签页，规则列表、详情、删除与添加。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/PermissionRuleList.tsx
 * pieces: chunk-p2qwpk2k.js (37)
 * attribution: sole-consumer 13, file-local 2, layout 15, fingerprint 7
 */
import { randomBytes, randomBytes as randomBytes_2 } from "crypto";
import { mkdirSync, openSync, constants, constants as constants_2, writeSync, closeSync } from "fs";
import { dirname } from "path";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import {
  displayField,
  replaceLineBreaks,
  uniqueLabels,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import {
  getAutoModeSectionColor,
  getAutoModeRuleCategoryLabel,
  describeRuleSource,
  bo,
  Ye,
  classifyAutoModeRuleSource,
  collectAutoModeRuleEntries,
  us,
  saveEnvironmentDocument,
  readUserEnvironmentEntries,
  Xt,
  fs,
  ps,
  AUTO_MODE_RULE_EDIT_ERRORS,
  sortRuleEntries,
  hs,
  Mt,
} from "./autoModeRuleEdits.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../../keybindings/useKeybinding.js";
import { AgentNavigationFooter } from "../../agents/AgentNavigationFooter.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { UltrareviewOverageDialog, openRulesInEditor, tp } from "./openRulesInEditor.js";
import { ShutdownRequestDisplay } from "../../messages/ShutdownMessage.js";
import { isAutoModeSetupNotOverridden } from "../../../commands/auto-mode-setup/index.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { useIsFullscreen } from "../../../ink/renderModeContext.js";
import { getDefaultExternalAutoModeRules, s5s } from "../../../utils/permissions/yoloClassifier.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { C5, wM } from "../../../utils/editor.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";
import { Byline } from "../../design-system/Byline.js";
import { j, y, R, P, zt } from "../../../../vendor/react/cjs/react.production.js";
import { AUTO_MODE_ENV_EDIT } from "../../../utils/teleport/autoModeDumps.js";
import { editFileInEditor } from "../../../utils/promptEditor.js";
import { Dialog } from "../../design-system/Dialog.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { supportsShiftEnter } from "../../../commands/terminalSetup/terminalSetup.js";
import { Newline } from "../../../ink/components/Input.js";
import { TextInput } from "../../TextInput.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { consentRowLabel } from "../consentRows.js";
import {
  permissionRuleSourceDisplayString,
  getAllowRules,
  getDenyRules,
  getAskRules,
  deletePermissionRule,
} from "../../../utils/permissions/permissions.js";
import { Cn, RecentDenialsTab } from "./RecentDenialsTab.js";
import { truncateToWidth } from "../../../utils/format.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";
import { PermissionRuleDescription } from "./PermissionRuleDescription.js";
import { useTabsWidth, useTabHeaderFocus, Tab, Tabs } from "../../design-system/Tabs.js";
import { useFocusOnMount } from "../../../hooks/useFocusOnMount.js";
import { SearchBox } from "../../SearchBox.js";
import { Me, useTheme } from "../../design-system/ThemeProvider.js";
import { UWe, $nn } from "../../Spinner/spinnerStatus.js";
import { useAppState, useSetAppState } from "../../../state/AppState.js";
import { useTerminalFocus } from "../../../ink/hooks/use-terminal-focus.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useScrollViewportSize } from "../../ScrollViewportContext.js";
import { useSearchInput } from "../../../hooks/useSearchInput.js";
import { sequential } from "../../../utils/sequential.js";
import { color } from "../../design-system/color.js";
import { announce } from "../../../utils/accessibility/screenReader.js";
import { logError } from "../../../utils/log.js";
import { logForDebugging } from "../../../utils/debug.js";
import { yse } from "../../../utils/permissions/serverClassifier/arbiter.js";
import { count } from "../../../utils/collections.js";
import { PermissionRuleInput } from "./PermissionRuleInput.js";
import { AddPermissionRules } from "./AddPermissionRules.js";
import {
  applyValidatedPermissionUpdate,
  persistValidatedPermissionUpdate,
} from "../../../utils/permissions/PermissionUpdate.js";
import { hr } from "../../../utils/invisibleChars.js";
import { AddWorkspaceDirectory } from "./AddWorkspaceDirectory.js";
import { RemoveWorkspaceDirectory } from "./RemoveWorkspaceDirectory.js";
import { AgentsMenu } from "../../agents/AgentsMenu.js";
import { WorkspaceTab } from "./WorkspaceTab.js";
import { Pane } from "../../design-system/Pane.js";

/**
 * auto 模式规则详情头：规则文本（引用块）+ 分类标签（按分类着色）+ "rule/section header for auto mode · From 来源"。
 */
//@ chunk-p2qwpk2k.js:51445-52517 sole-consumer
function AutoModeRuleSummary(h) {
  let m = w(25),
    { entry: entry } = h,
    a;
  if (m[0] !== entry.text) ((a = displayField(entry.text)), (m[0] = entry.text), (m[1] = a));
  else a = m[1];
  let f = a,
    g;
  if (m[2] !== f.text)
    ((g = e(Text, { bold: !0, wrap: "wrap-trim", children: f.text })), (m[2] = f.text), (m[3] = g));
  else g = m[3];
  let v;
  if (m[4] !== f.needsGutter || m[5] !== g)
    ((v = e(Blockquote, { multiline: f.needsGutter, children: g })),
      (m[4] = f.needsGutter),
      (m[5] = g),
      (m[6] = v));
  else v = m[6];
  let x;
  if (m[7] !== entry.section)
    ((x = getAutoModeSectionColor(entry.section)), (m[7] = entry.section), (m[8] = x));
  else x = m[8];
  let C;
  if (m[9] !== entry.section)
    ((C = getAutoModeRuleCategoryLabel(entry.section)), (m[9] = entry.section), (m[10] = C));
  else C = m[10];
  let c;
  if (m[11] !== x || m[12] !== C)
    ((c = e(Text, { color: x, children: C })), (m[11] = x), (m[12] = C), (m[13] = c));
  else c = m[13];
  const M = entry.structure ? "section header" : "rule";
  let b;
  if (m[14] !== entry.source) ((b = describeRuleSource(entry.source)), (m[14] = entry.source), (m[15] = b));
  else b = m[15];
  let T;
  if (m[16] !== M || m[17] !== b)
    ((T = r(Text, { dimColor: !0, children: [" ", M, " for auto mode \xB7 From", " ", b] })),
      (m[16] = M),
      (m[17] = b),
      (m[18] = T));
  else T = m[18];
  let E;
  if (m[19] !== c || m[20] !== T)
    ((E = r(Text, { children: [c, T] })), (m[19] = c), (m[20] = T), (m[21] = E));
  else E = m[21];
  let D;
  if (m[22] !== E || m[23] !== v)
    ((D = r(Box, { flexDirection: "column", marginX: 2, children: [v, E] })),
      (m[22] = E),
      (m[23] = v),
      (m[24] = D));
  else D = m[24];
  return D;
}
/**
 * auto 模式规则详情页：旧版 autoMode.deny、环境分节标题、托管设置、--settings 来源等只读情况给出说明，用户规则提供编辑/删除。
 */
//@ chunk-p2qwpk2k.js:52517-57241 sole-consumer
function AutoModeRuleDetails(h) {
  let g = w(78),
    { entry: entry, onEdit: onEdit, onDelete: onDelete, onCancel: onCancel } = h,
    v;
  if (g[0] === MEMO_CACHE_SENTINEL) ((v = { context: "Confirmation" }), (g[0] = v));
  else v = g[0];
  useKeybinding("confirm:no", onCancel, v);
  let x;
  if (g[1] === MEMO_CACHE_SENTINEL)
    ((x = e(Box, {
      marginLeft: 3,
      children: e(AgentNavigationFooter, {
        children: e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
      }),
    })),
      (g[1] = x));
  else x = g[1];
  let C = x;
  if (entry.legacy) {
    let c;
    if (g[2] !== entry) ((c = e(AutoModeRuleSummary, { entry: entry })), (g[2] = entry), (g[3] = c));
    else c = g[3];
    const M =
      entry.source === "userSettings"
        ? "This editor writes only the modern keys \u2014 move the rule to autoMode.soft_deny in your settings file to manage it here."
        : "It is delivered by " + describeRuleSource(entry.source) + " and cannot be modified here.";
    let b;
    if (g[4] !== M)
      ((b = r(Text, {
        italic: !0,
        children: [
          "",
          "This rule comes from the legacy autoMode.deny key, which auto mode still enforces as a soft deny.",
          " ",
          M,
        ],
      })),
        (g[4] = M),
        (g[5] = b));
    else b = g[5];
    let T;
    if (g[6] !== entry || g[7] !== onCancel)
      ((T = e(UltrareviewOverageDialog, { entry: entry, onCancel: onCancel })),
        (g[6] = entry),
        (g[7] = onCancel),
        (g[8] = T));
    else T = g[8];
    let E;
    if (g[9] !== c || g[10] !== b || g[11] !== T)
      ((E = r(Fragment, {
        children: [
          r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [c, b, T] }),
          C,
        ],
      })),
        (g[9] = c),
        (g[10] = b),
        (g[11] = T),
        (g[12] = E));
    else E = g[12];
    return E;
  }
  if (entry.structure) {
    let c;
    if (g[13] !== entry) ((c = e(AutoModeRuleSummary, { entry: entry })), (g[13] = entry), (g[14] = c));
    else c = g[14];
    let M;
    if (g[15] !== entry.source)
      ((M =
        entry.source !== "userSettings"
          ? `It is delivered by ${describeRuleSource(entry.source)} and cannot be modified here.`
          : isAutoModeSetupNotOverridden()
            ? "Re-run /auto-mode-setup to restructure, or edit your settings file directly."
            : "Edit your settings file directly to restructure."),
        (g[15] = entry.source),
        (g[16] = M));
    else M = g[16];
    let b;
    if (g[17] !== M)
      ((b = r(Text, {
        italic: !0,
        children: [
          "A section header that organizes the environment entries below it; auto mode reads it as written.",
          " ",
          M,
        ],
      })),
        (g[17] = M),
        (g[18] = b));
    else b = g[18];
    let T;
    if (g[19] !== entry || g[20] !== onCancel)
      ((T = e(UltrareviewOverageDialog, { entry: entry, onCancel: onCancel })),
        (g[19] = entry),
        (g[20] = onCancel),
        (g[21] = T));
    else T = g[21];
    let E;
    if (g[22] !== c || g[23] !== b || g[24] !== T)
      ((E = r(Fragment, {
        children: [
          r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [c, b, T] }),
          C,
        ],
      })),
        (g[22] = c),
        (g[23] = b),
        (g[24] = T),
        (g[25] = E));
    else E = g[25];
    return E;
  }
  if (entry.source === "policySettings") {
    let c;
    if (g[26] !== entry) ((c = e(AutoModeRuleSummary, { entry: entry })), (g[26] = entry), (g[27] = c));
    else c = g[27];
    let M;
    if (g[28] === MEMO_CACHE_SENTINEL)
      ((M = r(Text, {
        italic: !0,
        children: [
          "This rule is configured by managed settings and cannot be modified.",
          `
`,
          "Contact your system administrator for more information.",
        ],
      })),
        (g[28] = M));
    else M = g[28];
    let b;
    if (g[29] !== entry || g[30] !== onCancel)
      ((b = e(UltrareviewOverageDialog, { entry: entry, onCancel: onCancel })),
        (g[29] = entry),
        (g[30] = onCancel),
        (g[31] = b));
    else b = g[31];
    let T;
    if (g[32] !== c || g[33] !== b)
      ((T = r(Fragment, {
        children: [
          r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [c, M, b] }),
          C,
        ],
      })),
        (g[32] = c),
        (g[33] = b),
        (g[34] = T));
    else T = g[34];
    return T;
  }
  if (entry.source === "flagSettings") {
    let c;
    if (g[35] !== entry) ((c = e(AutoModeRuleSummary, { entry: entry })), (g[35] = entry), (g[36] = c));
    else c = g[36];
    let M;
    if (g[37] === MEMO_CACHE_SENTINEL)
      ((M = e(Text, {
        italic: !0,
        children:
          "This rule comes from a read-only source (the --settings flag) and cannot be modified here.",
      })),
        (g[37] = M));
    else M = g[37];
    let b;
    if (g[38] !== entry || g[39] !== onCancel)
      ((b = e(UltrareviewOverageDialog, { entry: entry, onCancel: onCancel })),
        (g[38] = entry),
        (g[39] = onCancel),
        (g[40] = b));
    else b = g[40];
    let T;
    if (g[41] !== c || g[42] !== b)
      ((T = r(Fragment, {
        children: [
          r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [c, M, b] }),
          C,
        ],
      })),
        (g[41] = c),
        (g[42] = b),
        (g[43] = T));
    else T = g[43];
    return T;
  }
  let c;
  if (g[44] !== entry.section || g[45] !== entry.text)
    ((c = bo(entry.section, entry.text)), (g[44] = entry.section), (g[45] = entry.text), (g[46] = c));
  else c = g[46];
  let D = c;
  if (D !== null) {
    let M;
    if (g[47] !== entry) ((M = e(AutoModeRuleSummary, { entry: entry })), (g[47] = entry), (g[48] = M));
    else M = g[48];
    let b;
    if (g[49] !== D)
      ((b = r(Text, {
        italic: !0,
        children: [
          "This rule cannot be edited here: ",
          D,
          `
`,
          "Edit it in your settings file, or delete it here.",
        ],
      })),
        (g[49] = D),
        (g[50] = b));
    else b = g[50];
    let T;
    if (g[51] === MEMO_CACHE_SENTINEL)
      ((T = [
        { label: "Delete", value: "delete" },
        { label: "Cancel", value: "cancel" },
      ]),
        (g[51] = T));
    else T = g[51];
    let E;
    if (g[52] !== onCancel || g[53] !== onDelete)
      ((E = (k) => {
        if (k === "delete") onDelete();
        else onCancel();
      }),
        (g[52] = onCancel),
        (g[53] = onDelete),
        (g[54] = E));
    else E = g[54];
    let V;
    if (g[55] !== onCancel || g[56] !== E)
      ((V = e(ModelSelector, { options: T, onChange: E, onCancel: onCancel })),
        (g[55] = onCancel),
        (g[56] = E),
        (g[57] = V));
    else V = g[57];
    let L;
    if (g[58] !== M || g[59] !== b || g[60] !== V)
      ((L = r(Fragment, {
        children: [
          r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [M, b, V] }),
          C,
        ],
      })),
        (g[58] = M),
        (g[59] = b),
        (g[60] = V),
        (g[61] = L));
    else L = g[61];
    return L;
  }
  let M;
  if (g[62] !== entry) ((M = e(AutoModeRuleSummary, { entry: entry })), (g[62] = entry), (g[63] = M));
  else M = g[63];
  let b;
  if (g[64] !== entry.section)
    ((b =
      entry.section === "environment" &&
      r(Text, {
        italic: !0,
        children: [
          "Environment entries describe this machine and project for auto mode.",
          isAutoModeSetupNotOverridden() ? " Re-run /auto-mode-setup to rebuild them from scratch." : "",
        ],
      })),
      (g[64] = entry.section),
      (g[65] = b));
  else b = g[65];
  let T;
  if (g[66] === MEMO_CACHE_SENTINEL)
    ((T = [
      { label: "Edit", value: "edit" },
      { label: "Delete", value: "delete" },
      { label: "Cancel", value: "cancel" },
    ]),
      (g[66] = T));
  else T = g[66];
  let E;
  if (g[67] !== onCancel || g[68] !== onDelete || g[69] !== onEdit)
    ((E = (B) => {
      if (B === "edit") onEdit();
      else if (B === "delete") onDelete();
      else onCancel();
    }),
      (g[67] = onCancel),
      (g[68] = onDelete),
      (g[69] = onEdit),
      (g[70] = E));
  else E = g[70];
  let V;
  if (g[71] !== onCancel || g[72] !== E)
    ((V = e(ModelSelector, { options: T, onChange: E, onCancel: onCancel })),
      (g[71] = onCancel),
      (g[72] = E),
      (g[73] = V));
  else V = g[73];
  let L;
  if (g[74] !== M || g[75] !== b || g[76] !== V)
    ((L = r(Fragment, {
      children: [
        r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [M, b, V] }),
        C,
      ],
    })),
      (g[74] = M),
      (g[75] = b),
      (g[76] = V),
      (g[77] = L));
  else L = g[77];
  return L;
}
//@ chunk-p2qwpk2k.js:57241-57253 sole-consumer
var Wm = 3200;
//@ chunk-p2qwpk2k.js:57253-57305 sole-consumer
function ba(h) {
  return h ? Number.POSITIVE_INFINITY : Wm;
}
/**
 * 显示某分类的内置 auto 模式规则（按终端高度截取，单条超长截断）、是否生效、是否可切换，以及在编辑器中查看全文。
 */
//@ chunk-p2qwpk2k.js:57305-61446 sole-consumer
function BuiltinRulesSection(h) {
  let v = w(83),
    { section: section, state: state, onToggle: onToggle, onCancel: onCancel } = h,
    g = useIsFullscreen(),
    x;
  if (v[0] === MEMO_CACHE_SENTINEL) ((x = { context: "Settings" }), (v[0] = x));
  else x = v[0];
  useKeybinding("confirm:no", onCancel, x);
  let [C, c] = openRulesInEditor(section),
    M,
    b,
    T,
    E,
    D,
    k,
    V,
    L,
    B,
    Y,
    se,
    Re,
    le;
  if (v[1] !== g || v[2] !== section || v[3] !== state.control || v[4] !== state.enabled) {
    D = getDefaultExternalAutoModeRules()[section] ?? [];
    let J;
    if (v[18] === MEMO_CACHE_SENTINEL)
      ((J = e(AgentNavigationFooter, {
        children: e(KeyboardShortcutHint, { chord: "esc", action: "cancel" }),
      })),
        (v[18] = J));
    else J = v[18];
    E = J;
    T = state.control === "user";
    b = ShutdownRequestDisplay;
    se = "permission";
    Re = "Built-in rules";
    let K;
    if (v[19] !== section) ((K = getAutoModeSectionColor(section)), (v[19] = section), (v[20] = K));
    else K = v[20];
    let ye;
    if (v[21] !== section) ((ye = getAutoModeRuleCategoryLabel(section)), (v[21] = section), (v[22] = ye));
    else ye = v[22];
    let ue;
    if (v[23] !== K || v[24] !== ye)
      ((ue = e(Text, { color: K, children: ye })), (v[23] = K), (v[24] = ye), (v[25] = ue));
    else ue = v[25];
    const ee = `${D.length} built-in ${D.length === 1 ? "rule" : "rules"} \xB7 ${state.enabled ? "in effect" : "switched off"}`;
    let ce;
    if (v[26] !== ee)
      ((ce = r(Text, { dimColor: !0, children: [" ", "\xB7", " ", ee] })), (v[26] = ee), (v[27] = ce));
    else ce = v[27];
    if (v[28] !== ue || v[29] !== ce)
      ((le = r(Text, { children: [ue, ce] })), (v[28] = ue), (v[29] = ce), (v[30] = le));
    else le = v[30];
    M = Box;
    V = "column";
    L = 2;
    B = 1;
    Y = 1;
    let te = ba(g);
    k = [];
    let Se = 0;
    for (const de of D) {
      if (Se + de.length > te && k.length > 0) {
        break;
      }
      (k.push(de), (Se = Se + de.length));
    }
    if (k.length === 1 && k[0].length > te) {
      let X = k[0].length - te;
      k[0] = `${truncateToLength(k[0], te)}\u2026 +${X} more characters \u2014 View in editor for the full text.`;
    }
    ((v[1] = g),
      (v[2] = section),
      (v[3] = state.control),
      (v[4] = state.enabled),
      (v[5] = M),
      (v[6] = b),
      (v[7] = T),
      (v[8] = E),
      (v[9] = D),
      (v[10] = k),
      (v[11] = V),
      (v[12] = L),
      (v[13] = B),
      (v[14] = Y),
      (v[15] = se),
      (v[16] = Re),
      (v[17] = le));
  } else
    ((M = v[5]),
      (b = v[6]),
      (T = v[7]),
      (E = v[8]),
      (D = v[9]),
      (k = v[10]),
      (V = v[11]),
      (L = v[12]),
      (B = v[13]),
      (Y = v[14]),
      (se = v[15]),
      (Re = v[16]),
      (le = v[17]));
  let Ve = D.length - k.length,
    J;
  if (v[31] !== k || v[32] !== state.enabled)
    ((J = k.map((Le, vt) =>
      r(Text, { dimColor: !0, strikethrough: !state.enabled, wrap: "wrap-trim", children: ["- ", Le] }, vt),
    )),
      (v[31] = k),
      (v[32] = state.enabled),
      (v[33] = J));
  else J = v[33];
  let K;
  if (v[34] !== Ve)
    ((K =
      Ve > 0 &&
      r(Text, {
        dimColor: !0,
        italic: !0,
        children: [
          "\u2026 +",
          Ve,
          " more ",
          Ve === 1 ? "rule" : "rules",
          " \u2014 run `claude auto-mode defaults` to print the full set.",
        ],
      })),
      (v[34] = Ve),
      (v[35] = K));
  else K = v[35];
  let ye;
  if (v[36] !== K || v[37] !== J)
    ((ye = r(Fragment, { children: [J, K] })), (v[36] = K), (v[37] = J), (v[38] = ye));
  else ye = v[38];
  const ue = ye;
  let ee;
  if (v[39] !== M || v[40] !== ue || v[41] !== V || v[42] !== L || v[43] !== B || v[44] !== Y)
    ((ee = e(M, { flexDirection: V, marginX: L, marginY: B, gap: Y, children: ue })),
      (v[39] = M),
      (v[40] = ue),
      (v[41] = V),
      (v[42] = L),
      (v[43] = B),
      (v[44] = Y),
      (v[45] = ee));
  else ee = v[45];
  let ce;
  if (v[46] !== state.control)
    ((ce =
      state.control === "empty" &&
      e(Text, {
        italic: !0,
        children: "This section has no configured rules, so the built-ins apply. Add a rule to customize it.",
      })),
      (v[46] = state.control),
      (v[47] = ce));
  else ce = v[47];
  let $e;
  if (v[48] !== state.control || v[49] !== state.enabled || v[50] !== state.source)
    (($e =
      state.control === "otherSource" &&
      e(Text, {
        italic: !0,
        children: state.enabled
          ? `Kept on by ${describeRuleSource(state.source ?? "policySettings")} \u2014 it cannot be switched off here.`
          : `Replaced by rules from ${describeRuleSource(state.source ?? "policySettings")}. This control follows that configuration; add your own rules to customize the section.`,
      })),
      (v[48] = state.control),
      (v[49] = state.enabled),
      (v[50] = state.source),
      (v[51] = $e));
  else $e = v[51];
  let ze;
  if (v[52] !== T || v[53] !== state.enabled)
    ((ze = T
      ? [
          {
            label: state.enabled
              ? "Disable built-in rules for this section"
              : "Enable built-in rules for this section",
            value: "toggle",
          },
        ]
      : []),
      (v[52] = T),
      (v[53] = state.enabled),
      (v[54] = ze));
  else ze = v[54];
  let Ge, ot;
  if (v[55] === MEMO_CACHE_SENTINEL)
    ((Ge = { label: `View in editor${C5() ? ` (${C5()})` : ""}`, value: "editor" }),
      (ot = { label: "Cancel", value: "cancel" }),
      (v[55] = Ge),
      (v[56] = ot));
  else ((Ge = v[55]), (ot = v[56]));
  let at;
  if (v[57] !== ze) ((at = [...ze, Ge, ot]), (v[57] = ze), (v[58] = at));
  else at = v[58];
  let Ze;
  if (v[59] !== c || v[60] !== onCancel || v[61] !== onToggle || v[62] !== D)
    ((Ze = (je) => {
      if (je === "toggle") onToggle();
      else if (je === "editor")
        c(
          D.map(tp).join(`

`),
        );
      else onCancel();
    }),
      (v[59] = c),
      (v[60] = onCancel),
      (v[61] = onToggle),
      (v[62] = D),
      (v[63] = Ze));
  else Ze = v[63];
  let bt;
  if (v[64] !== onCancel || v[65] !== at || v[66] !== Ze)
    ((bt = e(ModelSelector, { options: at, onChange: Ze, onCancel: onCancel })),
      (v[64] = onCancel),
      (v[65] = at),
      (v[66] = Ze),
      (v[67] = bt));
  else bt = v[67];
  let Te;
  if (v[68] !== C)
    ((Te = C !== null && e(Text, { dimColor: !0, wrap: "wrap-trim", children: C })),
      (v[68] = C),
      (v[69] = Te));
  else Te = v[69];
  let et;
  if (
    v[70] !== b ||
    v[71] !== ee ||
    v[72] !== ce ||
    v[73] !== $e ||
    v[74] !== bt ||
    v[75] !== Te ||
    v[76] !== se ||
    v[77] !== Re ||
    v[78] !== le
  )
    ((et = r(b, { color: se, title: Re, children: [le, ee, ce, $e, bt, Te] })),
      (v[70] = b),
      (v[71] = ee),
      (v[72] = ce),
      (v[73] = $e),
      (v[74] = bt),
      (v[75] = Te),
      (v[76] = se),
      (v[77] = Re),
      (v[78] = le),
      (v[79] = et));
  else et = v[79];
  let rt;
  if (v[80] !== E || v[81] !== et)
    ((rt = r(Fragment, { children: [et, E] })), (v[80] = E), (v[81] = et), (v[82] = rt));
  else rt = v[82];
  return rt;
}
/**
 * 删除 auto 模式规则的确认框；删除的是该分类最后一条用户规则时提示将只剩内置规则。
 */
//@ chunk-p2qwpk2k.js:61446-62726 sole-consumer
function DeleteAutoModeRuleConfirm(h) {
  let g = w(19),
    { entry: entry, isLastInSection: isLastInSection, onConfirm: onConfirm, onCancel: onCancel } = h,
    v;
  if (g[0] === MEMO_CACHE_SENTINEL) ((v = { context: "Confirmation" }), (g[0] = v));
  else v = g[0];
  useKeybinding("confirm:no", onCancel, v);
  let x;
  if (g[1] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, { bold: !0, color: "error", children: "Delete auto mode rule?" })), (g[1] = x));
  else x = g[1];
  let C;
  if (g[2] !== entry) ((C = e(AutoModeRuleSummary, { entry: entry })), (g[2] = entry), (g[3] = C));
  else C = g[3];
  let c;
  if (g[4] !== entry || g[5] !== isLastInSection)
    ((c =
      isLastInSection &&
      ` This is your last ${getAutoModeRuleCategoryLabel(entry.section).toLowerCase()} rule \u2014 without it, only the built-in rules apply for this section.`),
      (g[4] = entry),
      (g[5] = isLastInSection),
      (g[6] = c));
  else c = g[6];
  let M;
  if (g[7] !== c)
    ((M = r(Text, {
      children: [
        "Are you sure you want to delete this rule? Auto mode stops applying it on your next request.",
        c,
      ],
    })),
      (g[7] = c),
      (g[8] = M));
  else M = g[8];
  let b;
  if (g[9] !== onCancel || g[10] !== onConfirm)
    ((b = e(ConfirmSelect, { focus: "cancel", hideIndexes: !0, onConfirm: onConfirm, onCancel: onCancel })),
      (g[9] = onCancel),
      (g[10] = onConfirm),
      (g[11] = b));
  else b = g[11];
  let T;
  if (g[12] !== C || g[13] !== M || g[14] !== b)
    ((T = r(Box, {
      flexDirection: "column",
      gap: 1,
      borderStyle: "round",
      paddingLeft: 1,
      paddingRight: 1,
      borderColor: "error",
      children: [x, C, M, b],
    })),
      (g[12] = C),
      (g[13] = M),
      (g[14] = b),
      (g[15] = T));
  else T = g[15];
  let E;
  if (g[16] === MEMO_CACHE_SENTINEL)
    ((E = e(Box, {
      marginLeft: 3,
      children: e(AgentNavigationFooter, {
        children: r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
            e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
          ],
        }),
      }),
    })),
      (g[16] = E));
  else E = g[16];
  let D;
  if (g[17] !== T) ((D = r(Fragment, { children: [T, E] })), (g[17] = T), (g[18] = D));
  else D = g[18];
  return D;
}
//@ chunk-p2qwpk2k.js:62726-62730 sole-consumer
j();
//@ chunk-p2qwpk2k.js:62895-62974 sole-consumer
function xp(C) {
  return {
    label: getAutoModeRuleCategoryLabel(C),
    value: C,
    description: getAutoModeSectionDescription(C),
    dimDescription: !0,
  };
}
//@ chunk-p2qwpk2k.js:62974-63040 sole-consumer
function Ap($e) {
  return $e
    .replace(
      /\r\n/g,
      `
`,
    )
    .replace(
      /\r/g,
      `
`,
    );
}
/**
 * 返回 auto 模式规则分类（allow/soft_deny/hard_deny/environment）的说明文字。
 */
//@ chunk-p2qwpk2k.js:63040-63433 sole-consumer
function getAutoModeSectionDescription(h) {
  switch (h) {
    case "allow":
      return "Actions auto mode lets run without blocking";
    case "soft_deny":
      return "Actions auto mode blocks, unless a soft allow rule or your explicit direction applies";
    case "hard_deny":
      return "Actions auto mode always blocks \u2014 soft allow rules cannot override";
    case "environment":
      return "Facts about this machine or project auto mode should take into account";
  }
}
/**
 * 把环境条目写入临时文件（O_EXCL|O_NOFOLLOW，0600）并用编辑器打开，返回编辑后的内容（统一换行）或问题描述。
 */
//@ chunk-p2qwpk2k.js:63433-64080 sole-consumer
function editEnvironmentInEditor(h) {
  let i = s5s(`${AUTO_MODE_ENV_EDIT}${randomBytes_2(8).toString("hex")}.md`);
  if (i === null) return { content: null, problem: null };
  try {
    mkdirSync(dirname(i), { recursive: !0, mode: 448 });
    let a = openSync(
      i,
      constants_2.O_WRONLY | constants_2.O_CREAT | constants_2.O_EXCL | constants_2.O_NOFOLLOW,
      384,
    );
    try {
      writeSync(
        a,
        h.join(`
`),
        null,
        "utf8",
      );
    } finally {
      closeSync(a);
    }
  } catch (error) {
    return {
      content: null,
      problem: `could not write the file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  let m = editFileInEditor(i);
  if (m.error !== void 0) return { content: null, problem: m.error };
  if (m.content === null)
    return { content: null, problem: "the editor returned no content \u2014 reopen to try again." };
  return {
    content:
      m.content === null
        ? null
        : m.content
            .replace(
              /\r\n/g,
              `
`,
            )
            .replace(
              /\r/g,
              `
`,
            ),
    problem: null,
  };
}
/**
 * "这是哪类规则？"选择对话框：列出规则分区选项，选择后回调 onPick，取消时回调 onCancel。
 */
//@ chunk-p2qwpk2k.js:64080-64569 sole-consumer
function PickRuleSectionDialog(h) {
  let a = w(8),
    { onCancel: onCancel, onPick: onPick } = h,
    f;
  if (a[0] === MEMO_CACHE_SENTINEL)
    ((f = e(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: e(Text, { children: "What kind of rule is this?" }),
    })),
      (a[0] = f));
  else f = a[0];
  let g;
  if (a[1] === MEMO_CACHE_SENTINEL) ((g = Ye.map(xp)), (a[1] = g));
  else g = a[1];
  let v;
  if (a[2] !== onCancel || a[3] !== onPick)
    ((v = e(ModelSelector, { options: g, onChange: onPick, onCancel: onCancel })),
      (a[2] = onCancel),
      (a[3] = onPick),
      (a[4] = v));
  else v = a[4];
  let x;
  if (a[5] !== onCancel || a[6] !== v)
    ((x = r(Dialog, {
      title: "Add auto mode rule",
      onCancel: onCancel,
      color: "permission",
      children: [f, v],
    })),
      (a[5] = onCancel),
      (a[6] = v),
      (a[7] = x));
  else x = a[7];
  return x;
}
/**
 * 添加/编辑 auto 模式规则的输入对话框：多行输入、校验失败显示错误、提示保存到用户设置。
 */
//@ chunk-p2qwpk2k.js:64569-66742 sole-consumer
function AutoModeRuleInput(h) {
  let b = w(28),
    { section: section, initialValue: initialValue, onCancel: onCancel, onSubmit: onSubmit } = h,
    [g, v] = y(initialValue ?? ""),
    [x, C] = y(initialValue ? initialValue.length : 0),
    [c, M] = y(null),
    T;
  if (b[0] === MEMO_CACHE_SENTINEL) ((T = { context: "Settings" }), (b[0] = T));
  else T = b[0];
  useKeybinding("confirm:no", onCancel, T);
  let { columns: columns } = useTerminalSize(),
    D = columns - 6,
    k;
  if (b[1] !== onSubmit || b[2] !== section)
    ((k = (V) => {
      let trimmed = V.trim();
      if (trimmed.length === 0) {
        return;
      }
      let B = bo(section, trimmed);
      if (B !== null) {
        M(B);
        return;
      }
      onSubmit(trimmed);
    }),
      (b[1] = onSubmit),
      (b[2] = section),
      (b[3] = k));
  else k = b[3];
  let Y = k,
    se = initialValue !== void 0,
    Re =
      section === "environment"
        ? "Deploys from this machine only reach the staging cluster."
        : "Database Writes: UPDATE statements against the local dev database.",
    le;
  if (b[4] !== section)
    ((le = getAutoModeRuleCategoryLabel(section).toLowerCase()), (b[4] = section), (b[5] = le));
  else le = b[5];
  const J = `${se ? "Edit" : "Add"} ${le} rule`;
  let K;
  if (b[6] === MEMO_CACHE_SENTINEL)
    ((K = e(KeyboardShortcutHint, { chord: "enter", action: "save" })), (b[6] = K));
  else K = b[6];
  const ye = supportsShiftEnter() ? "shift+enter" : "ctrl+j";
  let ue;
  if (b[7] === MEMO_CACHE_SENTINEL)
    ((ue = r(Byline, {
      children: [
        K,
        e(KeyboardShortcutHint, { chord: ye, action: "new line" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
      ],
    })),
      (b[7] = ue));
  else ue = b[7];
  let ee;
  if (b[8] === MEMO_CACHE_SENTINEL) ((ee = e(Newline, {})), (b[8] = ee));
  else ee = b[8];
  let ce;
  if (b[9] !== Re)
    ((ce = r(Text, {
      children: [
        "Write the rule as a plain sentence. A short label up front helps, e.g.,",
        ee,
        e(Text, { bold: !0, children: Re }),
      ],
    })),
      (b[9] = Re),
      (b[10] = ce));
  else ce = b[10];
  let te;
  if (b[11] === MEMO_CACHE_SENTINEL)
    ((te = (Se) => {
      (M(null), v(Se));
    }),
      (b[11] = te));
  else te = b[11];
  let de;
  if (b[12] !== x || b[13] !== Y || b[14] !== g || b[15] !== D)
    ((de = e(Box, {
      borderDimColor: !0,
      borderStyle: "round",
      marginY: 1,
      paddingLeft: 1,
      children: e(TextInput, {
        showCursor: !0,
        focus: !0,
        multiline: !0,
        disableBackslashReturn: !0,
        maxVisibleLines: 8,
        inputFilter: Ap,
        value: g,
        onChange: te,
        onSubmit: Y,
        placeholder: `Enter rule${re.ellipsis}`,
        columns: D,
        cursorOffset: x,
        onChangeCursorOffset: C,
      }),
    })),
      (b[12] = x),
      (b[13] = Y),
      (b[14] = g),
      (b[15] = D),
      (b[16] = de));
  else de = b[16];
  let X;
  if (b[17] !== c)
    ((X = c !== null && e(Text, { color: "error", wrap: "wrap-trim", children: c })),
      (b[17] = c),
      (b[18] = X));
  else X = b[18];
  let Ve;
  if (b[19] === MEMO_CACHE_SENTINEL)
    ((Ve = e(Text, { dimColor: !0, children: "Saved to your user settings file" })), (b[19] = Ve));
  else Ve = b[19];
  let Le;
  if (b[20] !== de || b[21] !== X || b[22] !== ce)
    ((Le = r(Box, { flexDirection: "column", children: [ce, de, X, Ve] })),
      (b[20] = de),
      (b[21] = X),
      (b[22] = ce),
      (b[23] = Le));
  else Le = b[23];
  let vt;
  if (b[24] !== onCancel || b[25] !== Le || b[26] !== J)
    ((vt = e(Dialog, {
      title: J,
      onCancel: onCancel,
      color: "permission",
      isCancelActive: !1,
      inputGuide: ue,
      children: Le,
    })),
      (b[24] = onCancel),
      (b[25] = Le),
      (b[26] = J),
      (b[27] = vt));
  else vt = b[27];
  return vt;
}
//@ chunk-p2qwpk2k.js:66742-66790 file-local
function kh(s) {
  return s.toolPermissionContext;
}
//@ chunk-p2qwpk2k.js:66790-66816 layout
function Dh() {
  return classifyAutoModeRuleSource();
}
//@ chunk-p2qwpk2k.js:66816-66842 layout
function Ph() {
  return collectAutoModeRuleEntries();
}
//@ chunk-p2qwpk2k.js:66842-66875 layout
function Nh(Ju) {
  return [jsonStringify(Ju), Ju];
}
//@ chunk-p2qwpk2k.js:66875-66918 layout
function Oh(Fy) {
  return new Map(Fy.map(Nh));
}
//@ chunk-p2qwpk2k.js:66918-66955 layout
function Fh($y) {
  return $y.ruleString;
}
//@ chunk-p2qwpk2k.js:66955-66985 layout
function $h(By) {
  return consentRowLabel(By);
}
//@ chunk-p2qwpk2k.js:66985-67020 layout
function Bh(_y) {
  return _y !== void 0;
}
//@ chunk-p2qwpk2k.js:67020-67069 fingerprint = _temp5 (1)
function _h(opt) {
  return opt.value !== "add-new-rule";
}
//@ chunk-p2qwpk2k.js:67069-67101 file-local
function Vh(opt_0) {
  return opt_0.value;
}
//@ chunk-p2qwpk2k.js:67101-67146 layout
function Lh(Iy) {
  return Iy.replace(/\n+$/, "");
}
//@ chunk-p2qwpk2k.js:67146-67196 layout
function Ih(Ny) {
  return Ny.section !== "environment";
}
//@ chunk-p2qwpk2k.js:67196-67408 fingerprint = RuleSourceText (1)
function RuleSourceText(t0) {
  let $ = w(4),
    { rule: rule } = t0,
    a;
  if ($[0] !== rule.source)
    ((a = permissionRuleSourceDisplayString(rule.source)), ($[0] = rule.source), ($[1] = a));
  else a = $[1];
  const t2 = `From ${a}`;
  let g;
  if ($[2] !== t2) ((g = e(Text, { dimColor: !0, children: t2 })), ($[2] = t2), ($[3] = g));
  else g = $[3];
  return g;
}
//@ chunk-p2qwpk2k.js:67408-67469 layout
var Ep = /(?! )[\p{C}\p{Z}\p{Default_Ignorable_Code_Point}]/gu;
//@ chunk-p2qwpk2k.js:67469-67590 layout
function escapeAsUnicode(h) {
  return Array.from(
    { length: h.length },
    (i, m) => `\\u${h.charCodeAt(m).toString(16).padStart(4, "0")}`,
  ).join("");
}
/**
 * 生成"只批准这些精确命令/调用"的消息，列出 JSON 字符串化的命令，并说明不覆盖其他调用或附加选项（关沙箱、网络、后台）。
 */
//@ chunk-p2qwpk2k.js:67590-68151 layout
function buildExactRetryGrantMessage(h, i) {
  let mapped = h.map((v) =>
      jsonStringify(v.command ?? v.rawInput ?? Cn(v, i).text).replace(Ep, escapeAsUnicode),
    ),
    a = h.every((v) => v.command !== void 0) ? "command" : "call",
    f = h.length === 1,
    g = f ? `this exact ${a}` : `these exact ${a}s`;
  return `Permission granted for ${g} only, ${f ? "as one whole string" : "each as one whole string"}: ${mapped.join(", ")}. This does not approve any other ${a}, any part of ${f ? "this one" : "these"}, or running ${f ? "it" : "them"} with added options such as turning off the sandbox, extra network access, or running in the background. You may now retry ${g} if you would like.`;
}
//@ chunk-p2qwpk2k.js:68151-68162 layout
var kp = 200;
//@ chunk-p2qwpk2k.js:68162-68257 layout
function jn(h, i) {
  return h.map((m) =>
    truncateToWidth(replaceLineBreaks(displayField(m.command?.trim() ?? Cn(m, i).text.trim()).text), kp),
  );
}
//@ chunk-p2qwpk2k.js:68257-68321 layout
function $a(h) {
  return /[[\]]/.test(h) && !h.startsWith('"') ? jsonStringify(h) : h;
}
//@ chunk-p2qwpk2k.js:68321-68423 fingerprint = getRuleBehaviorLabel (1)
function getRuleBehaviorLabel(ruleBehavior) {
  switch (ruleBehavior) {
    case "allow":
      return "allowed";
    case "deny":
      return "denied";
    case "ask":
      return "ask";
  }
}
//@ chunk-p2qwpk2k.js:68423-70911 fingerprint = RuleDetails (0.466)
function RuleDetails(t0) {
  let $ = w(37),
    { rule: rule, onDelete: onDelete, onCancel: onCancel } = t0,
    g;
  if ($[0] === MEMO_CACHE_SENTINEL) ((g = { context: "Confirmation" }), ($[0] = g));
  else g = $[0];
  useKeybinding("confirm:no", onCancel, g);
  let v;
  if ($[1] !== rule.ruleValue)
    ((v = consentRowLabel(formatPermissionRule(rule.ruleValue))), ($[1] = rule.ruleValue), ($[2] = v));
  else v = $[2];
  let x;
  if ($[3] !== v) ((x = e(Text, { bold: !0, children: v })), ($[3] = v), ($[4] = x));
  else x = $[4];
  let C;
  if ($[5] !== rule.ruleValue)
    ((C = e(PermissionRuleDescription, { ruleValue: rule.ruleValue })), ($[5] = rule.ruleValue), ($[6] = C));
  else C = $[6];
  let c;
  if ($[7] !== rule) ((c = e(RuleSourceText, { rule: rule })), ($[7] = rule), ($[8] = c));
  else c = $[8];
  let M;
  if ($[9] !== x || $[10] !== C || $[11] !== c)
    ((M = r(Box, { flexDirection: "column", marginX: 2, children: [x, C, c] })),
      ($[9] = x),
      ($[10] = C),
      ($[11] = c),
      ($[12] = M));
  else M = $[12];
  let b = M,
    T;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((T = e(Box, {
      marginLeft: 3,
      children: e(AgentNavigationFooter, {
        children: e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
      }),
    })),
      ($[13] = T));
  else T = $[13];
  let E = T;
  if (rule.source === "policySettings") {
    let D;
    if ($[14] === MEMO_CACHE_SENTINEL)
      ((D = r(Text, {
        italic: !0,
        children: [
          "This rule is configured by managed settings and cannot be modified.",
          `
`,
          "Contact your system administrator for more information.",
        ],
      })),
        ($[14] = D));
    else D = $[14];
    let k;
    if ($[15] !== b)
      ((k = r(Fragment, {
        children: [
          r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [b, D] }),
          E,
        ],
      })),
        ($[15] = b),
        ($[16] = k));
    else k = $[16];
    return k;
  }
  if (rule.source === "flagSettings" || rule.source === "command") {
    const D = rule.source === "flagSettings" ? "the --settings flag" : "a slash command";
    let k;
    if ($[17] !== D)
      ((k = r(Text, {
        italic: !0,
        children: ["This rule comes from a read-only source (", D, ") and cannot be modified here."],
      })),
        ($[17] = D),
        ($[18] = k));
    else k = $[18];
    let V;
    if ($[19] !== b || $[20] !== k)
      ((V = r(Fragment, {
        children: [
          r(ShutdownRequestDisplay, { color: "permission", title: "Rule details", children: [b, k] }),
          E,
        ],
      })),
        ($[19] = b),
        ($[20] = k),
        ($[21] = V));
    else V = $[21];
    return V;
  }
  let D;
  if ($[22] !== rule.ruleBehavior)
    ((D = getRuleBehaviorLabel(rule.ruleBehavior)), ($[22] = rule.ruleBehavior), ($[23] = D));
  else D = $[23];
  let k;
  if ($[24] !== D)
    ((k = r(Text, { bold: !0, color: "error", children: ["Delete ", D, " tool?"] })),
      ($[24] = D),
      ($[25] = k));
  else k = $[25];
  let V;
  if ($[26] === MEMO_CACHE_SENTINEL)
    ((V = e(Text, { children: "Are you sure you want to delete this permission rule?" })), ($[26] = V));
  else V = $[26];
  let L;
  if ($[27] !== onCancel || $[28] !== onDelete)
    ((L = e(ConfirmSelect, { focus: "cancel", hideIndexes: !0, onConfirm: onDelete, onCancel: onCancel })),
      ($[27] = onCancel),
      ($[28] = onDelete),
      ($[29] = L));
  else L = $[29];
  let B;
  if ($[30] !== b || $[31] !== L || $[32] !== k)
    ((B = r(Box, {
      flexDirection: "column",
      gap: 1,
      borderStyle: "round",
      paddingLeft: 1,
      paddingRight: 1,
      borderColor: "error",
      children: [k, b, V, L],
    })),
      ($[30] = b),
      ($[31] = L),
      ($[32] = k),
      ($[33] = B));
  else B = $[33];
  let Y;
  if ($[34] === MEMO_CACHE_SENTINEL)
    ((Y = e(Box, {
      marginLeft: 3,
      children: e(AgentNavigationFooter, {
        children: r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
            e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
          ],
        }),
      }),
    })),
      ($[34] = Y));
  else Y = $[34];
  let se;
  if ($[35] !== B) ((se = r(Fragment, { children: [B, Y] })), ($[35] = B), ($[36] = se));
  else se = $[36];
  return se;
}
//@ chunk-p2qwpk2k.js:70911-72535 fingerprint = RulesTabContent (0.883)
function RulesTabContent(props) {
  let $ = w(37),
    {
      options: options,
      searchQuery: searchQuery,
      isSearchMode: isSearchMode,
      isFocused: isFocused,
      onSelect: onSelect,
      onCancel: onCancel,
      lastFocusedRuleKey: lastFocusedRuleKey,
      cursorOffset: cursorOffset,
      onHeaderFocusChange: onHeaderFocusChange,
    } = props,
    tabWidth = useTabsWidth(),
    { headerFocused: headerFocused, focusHeader: focusHeader, blurHeader: blurHeader } = useTabHeaderFocus(),
    D = R(null),
    V,
    L;
  if ($[0] !== blurHeader || $[1] !== headerFocused || $[2] !== isSearchMode)
    ((V = () => {
      if (isSearchMode && headerFocused) blurHeader(D.current);
    }),
      (L = [isSearchMode, headerFocused, blurHeader]),
      ($[0] = blurHeader),
      ($[1] = headerFocused),
      ($[2] = isSearchMode),
      ($[3] = V),
      ($[4] = L));
  else ((V = $[3]), (L = $[4]));
  (P(V, L), useFocusOnMount(D, isSearchMode));
  let B = headerFocused && !isSearchMode,
    Y,
    se;
  if ($[5] !== B || $[6] !== onHeaderFocusChange)
    ((Y = () => {
      onHeaderFocusChange(B);
    }),
      (se = [B, onHeaderFocusChange]),
      ($[5] = B),
      ($[6] = onHeaderFocusChange),
      ($[7] = Y),
      ($[8] = se));
  else ((Y = $[7]), (se = $[8]));
  P(Y, se);
  const Re = isSearchMode ? 0 : void 0;
  let le;
  if ($[9] !== blurHeader || $[10] !== isSearchMode)
    ((le = isSearchMode ? () => blurHeader(D.current) : void 0),
      ($[9] = blurHeader),
      ($[10] = isSearchMode),
      ($[11] = le));
  else le = $[11];
  const J = isSearchMode && !headerFocused;
  let K;
  if (
    $[12] !== cursorOffset ||
    $[13] !== isFocused ||
    $[14] !== searchQuery ||
    $[15] !== J ||
    $[16] !== tabWidth
  )
    ((K = e(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: e(SearchBox, {
        query: searchQuery,
        isFocused: J,
        isTerminalFocused: isFocused,
        width: tabWidth,
        cursorOffset: cursorOffset,
      }),
    })),
      ($[12] = cursorOffset),
      ($[13] = isFocused),
      ($[14] = searchQuery),
      ($[15] = J),
      ($[16] = tabWidth),
      ($[17] = K));
  else K = $[17];
  let ye;
  if ($[18] !== blurHeader || $[19] !== headerFocused || $[20] !== onHeaderFocusChange || $[21] !== onSelect)
    ((ye = (ue) => {
      if (headerFocused) (blurHeader(), onHeaderFocusChange(!1));
      onSelect(ue);
    }),
      ($[18] = blurHeader),
      ($[19] = headerFocused),
      ($[20] = onHeaderFocusChange),
      ($[21] = onSelect),
      ($[22] = ye));
  else ye = $[22];
  const t6 = Math.min(10, options.length),
    ce = isSearchMode || headerFocused,
    te = !isSearchMode;
  let Se;
  if (
    $[23] !== focusHeader ||
    $[24] !== lastFocusedRuleKey ||
    $[25] !== onCancel ||
    $[26] !== options ||
    $[27] !== ce ||
    $[28] !== te ||
    $[29] !== ye ||
    $[30] !== t6
  )
    ((Se = e(ModelSelector, {
      options: options,
      onChange: ye,
      onCancel: onCancel,
      visibleOptionCount: t6,
      isDisabled: ce,
      hidePromptWhileDisabled: !0,
      pointerWhileDisabled: te,
      defaultFocusValue: lastFocusedRuleKey,
      onUpFromFirstItem: focusHeader,
    })),
      ($[23] = focusHeader),
      ($[24] = lastFocusedRuleKey),
      ($[25] = onCancel),
      ($[26] = options),
      ($[27] = ce),
      ($[28] = te),
      ($[29] = ye),
      ($[30] = t6),
      ($[31] = Se));
  else Se = $[31];
  let de;
  if ($[32] !== Se || $[33] !== Re || $[34] !== le || $[35] !== K)
    ((de = r(Box, { ref: D, flexDirection: "column", tabIndex: Re, onFocus: le, children: [K, Se] })),
      ($[32] = Se),
      ($[33] = Re),
      ($[34] = le),
      ($[35] = K),
      ($[36] = de));
  else de = $[36];
  return de;
}
//@ chunk-p2qwpk2k.js:72535-73563 fingerprint = PermissionRulesTab (0.911)
function PermissionRulesTab(t0) {
  let $ = w(23),
    m,
    a,
    f,
    g;
  if ($[0] !== t0)
    (({ tab: g, getRulesOptions: m, handleToolSelect: a, ...f } = t0),
      ($[0] = t0),
      ($[1] = m),
      ($[2] = a),
      ($[3] = f),
      ($[4] = g));
  else ((m = $[1]), (a = $[2]), (f = $[3]), (g = $[4]));
  const v = g === "allow" ? 0 : void 0;
  let x;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((x = {
      allow: "Claude Code won't ask before using allowed tools.",
      ask: "Claude Code will always ask for confirmation before using these tools.",
      deny: "Claude Code will always reject requests to use denied tools.",
    }),
      ($[5] = x));
  else x = $[5];
  const C = x[g];
  let c;
  if ($[6] !== C) ((c = e(Text, { children: C })), ($[6] = C), ($[7] = c));
  else c = $[7];
  let M;
  if ($[8] !== m || $[9] !== f.searchQuery || $[10] !== g)
    ((M = m(g, f.searchQuery)), ($[8] = m), ($[9] = f.searchQuery), ($[10] = g), ($[11] = M));
  else M = $[11];
  let b;
  if ($[12] !== a || $[13] !== g) ((b = (T) => a(T, g)), ($[12] = a), ($[13] = g), ($[14] = b));
  else b = $[14];
  let E;
  if ($[15] !== f || $[16] !== M.options || $[17] !== b)
    ((E = e(RulesTabContent, { options: M.options, onSelect: b, ...f })),
      ($[15] = f),
      ($[16] = M.options),
      ($[17] = b),
      ($[18] = E));
  else E = $[18];
  let D;
  if ($[19] !== v || $[20] !== c || $[21] !== E)
    ((D = r(Box, { flexDirection: "column", flexShrink: v, children: [c, E] })),
      ($[19] = v),
      ($[20] = c),
      ($[21] = E),
      ($[22] = D));
  else D = $[22];
  return D;
}
/**
 * /permissions 界面：Recent（auto 模式拦截）/Allow/Ask/Deny/Workspace 标签，规则按来源显示，可查看详情、删除（policySettings 不可删）、新增规则与目录。
 */
//@ chunk-p2qwpk2k.js:73563-93185 fingerprint = PermissionRuleList (0.52)
function PermissionRuleList(t0) {
  let $ = w(241),
    { onExit: onExit, initialTab: initialTab, onRetryDenials: onRetryDenials, isMidTurn: isMidTurn } = t0,
    { storageV5: storageV5 } = Me(),
    { getDenials: getDenials, removeDenial: removeDenial } = UWe(),
    C = $nn(),
    M;
  if ($[0] !== getDenials) ((M = getDenials()), ($[0] = getDenials), ($[1] = M));
  else M = $[1];
  let b = M.length > 0,
    T = initialTab ?? (b ? "recent" : "allow"),
    [E, D] = y(T),
    k;
  if ($[2] === MEMO_CACHE_SENTINEL) ((k = []), ($[2] = k));
  else k = $[2];
  let [V, L] = y(k),
    toolPermissionContext = useAppState(kh),
    setAppState = useSetAppState(),
    isTerminalFocused = useTerminalFocus(),
    [Re] = useTheme(),
    le = R(!1),
    J;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((J = { approved: new Set(), retry: new Set(), denials: [], canMark: !0 }), ($[3] = J));
  else J = $[3];
  let denialStateRef = R(J),
    [ye, ue] = y(),
    [ee, ce] = y(!0),
    te;
  if ($[4] !== isMidTurn)
    ((te = (s_0) => {
      ((denialStateRef.current = s_0),
        ue(
          s_0.retry.size > 0
            ? isMidTurn
              ? "Esc to tell Claude next prompt"
              : `Esc to retry ${s_0.retry.size} blocked`
            : s_0.approved.size > 0
              ? `Esc to approve ${s_0.approved.size} blocked`
              : void 0,
        ),
        ce(s_0.canMark));
    }),
      ($[4] = isMidTurn),
      ($[5] = te));
  else te = $[5];
  let de = te,
    [X, Ve] = y(),
    [Le, vt] = y(),
    [$e, ze] = y(null),
    [Ge, ot] = y(null),
    [at, Ze] = y(!1),
    [je, bt] = y(null),
    [Te, et] = y(!1),
    rt = useIsScreenReaderEnabled(),
    { rows: rows, columns: columns } = useScrollViewportSize(useTerminalSize()),
    no;
  if ($[6] !== columns || $[7] !== rows)
    ((no = { rows: rows, columns: columns }), ($[6] = columns), ($[7] = rows), ($[8] = no));
  else no = $[8];
  let Ht = R(no),
    ko;
  if ($[9] !== columns || $[10] !== de || $[11] !== rt || $[12] !== rows)
    ((ko = () => {
      let fr = rows < Ht.current.rows || columns < Ht.current.columns;
      if (((Ht.current = { rows: rows, columns: columns }), fr && !rt))
        de({ ...denialStateRef.current, approved: new Set(), retry: new Set() });
    }),
      ($[9] = columns),
      ($[10] = de),
      ($[11] = rt),
      ($[12] = rows),
      ($[13] = ko));
  else ko = $[13];
  zt(ko);
  let [Do, Ut] = y(),
    [W, N] = y(Dh),
    [ae, ge] = y(Ph),
    [ke, me] = y(null),
    [Wt, yr] = y(!b),
    gr;
  if ($[14] === MEMO_CACHE_SENTINEL)
    ((gr = (focused) => {
      yr(focused);
    }),
      ($[14] = gr));
  else gr = $[14];
  let Po = gr,
    rn = Oh,
    sn;
  if ($[15] !== toolPermissionContext)
    ((sn = rn(getAllowRules(toolPermissionContext))), ($[15] = toolPermissionContext), ($[16] = sn));
  else sn = $[16];
  let Oo;
  if ($[17] !== toolPermissionContext)
    ((Oo = rn(getDenyRules(toolPermissionContext))), ($[17] = toolPermissionContext), ($[18] = Oo));
  else Oo = $[18];
  let ro;
  if ($[19] !== toolPermissionContext)
    ((ro = rn(getAskRules(toolPermissionContext))), ($[19] = toolPermissionContext), ($[20] = ro));
  else ro = $[20];
  let br;
  if ($[21] !== ro || $[22] !== sn || $[23] !== Oo)
    ((br = { allow: sn, deny: Oo, ask: ro }), ($[21] = ro), ($[22] = sn), ($[23] = Oo), ($[24] = br));
  else br = $[24];
  let Cr = br,
    wr;
  if ($[25] !== Cr)
    ((wr = (tab, t7) => {
      let $t = t7 === void 0 ? "" : t7;
      let Fo = tab === "allow" || tab === "deny" || tab === "ask" ? Cr[tab] : new Map();
      let Rr = [];
      if (tab !== "workspace" && tab !== "recent" && tab !== "automode" && !$t)
        Rr.push({ label: `Add a new rule${re.ellipsis}`, value: "add-new-rule" });
      let sortedRuleKeys = Array.from(Fo.keys()).sort((Su, ln) => {
        let ruleA = Fo.get(Su);
        let ruleB = Fo.get(ln);
        if (ruleA && ruleB) {
          let ruleAString = formatPermissionRule(ruleA.ruleValue).toLowerCase();
          let ruleBString = formatPermissionRule(ruleB.ruleValue).toLowerCase();
          return ruleAString.localeCompare(ruleBString);
        }
        return 0;
      });
      let lowerQuery = $t.toLowerCase();
      let lo = [];
      for (const ruleKey of sortedRuleKeys) {
        let rule_2 = Fo.get(ruleKey);
        if (rule_2) {
          let ruleString = formatPermissionRule(rule_2.ruleValue);
          if ($t && !ruleString.toLowerCase().includes(lowerQuery)) {
            continue;
          }
          lo.push({ ruleKey: ruleKey, ruleString: ruleString });
        }
      }
      let xr = uniqueLabels(lo.map(Fh), $h);
      for (const [Ar, Mr] of lo.entries()) Rr.push({ label: xr[Ar], value: Mr.ruleKey });
      return { options: Rr, rulesByKey: Fo };
    }),
      ($[25] = Cr),
      ($[26] = wr));
  else wr = $[26];
  let st = wr,
    Bt = !X && !$e && !Ge && !at && !je && !ke;
  const qe = Bt && Te;
  let $i;
  if ($[27] === MEMO_CACHE_SENTINEL)
    (($i = () => {
      et(!1);
    }),
      ($[27] = $i));
  else $i = $[27];
  let Er;
  if ($[28] !== qe) ((Er = { isActive: qe, onExit: $i }), ($[28] = qe), ($[29] = Er));
  else Er = $[29];
  let {
      query: searchQuery,
      setQuery: setSearchQuery,
      cursorOffset: searchCursorOffset,
      handleKeyDown: handleKeyDown,
      handlePaste: handlePaste,
    } = useSearchInput(Er),
    Bi;
  if ($[30] !== Te || $[31] !== Bt || $[32] !== handleKeyDown || $[33] !== E || $[34] !== setSearchQuery)
    ((Bi = (Ne) => {
      if (!Bt) {
        return;
      }
      if (Te) {
        handleKeyDown(Ne);
        return;
      }
      if (Ne.ctrl || Ne.meta) {
        return;
      }
      if (E === "recent" || E === "workspace") {
        return;
      }
      if (Ne.key === "/") (Ne.preventDefault(), et(!0), setSearchQuery(""));
      else if (
        !Ne.defaultPrevented &&
        Ne.key.length === 1 &&
        Ne.key !== "j" &&
        Ne.key !== "k" &&
        Ne.key !== "m" &&
        Ne.key !== "i" &&
        Ne.key !== "r" &&
        Ne.key !== " "
      )
        (Ne.preventDefault(), et(!0), setSearchQuery(Ne.key));
    }),
      ($[30] = Te),
      ($[31] = Bt),
      ($[32] = handleKeyDown),
      ($[33] = E),
      ($[34] = setSearchQuery),
      ($[35] = Bi));
  else Bi = $[35];
  let kr = Bi,
    mo;
  if ($[36] !== st)
    ((mo = (selectedValue, tab_0) => {
      let { rulesByKey: rulesByKey_0 } = st(tab_0);
      if (selectedValue === "add-new-rule") {
        ze(tab_0);
        return;
      } else {
        Ve(rulesByKey_0.get(selectedValue));
        return;
      }
    }),
      ($[36] = st),
      ($[37] = mo));
  else mo = $[37];
  let Pr = mo,
    Vi;
  if ($[38] === MEMO_CACHE_SENTINEL)
    ((Vi = () => {
      ze(null);
    }),
      ($[38] = Vi));
  else Vi = $[38];
  let Hh = Vi,
    Mu;
  if ($[39] === MEMO_CACHE_SENTINEL)
    ((Mu = (ruleValue, ruleBehavior) => {
      (ot({ ruleValue: ruleValue, ruleBehavior: ruleBehavior }), ze(null));
    }),
      ($[39] = Mu));
  else Mu = $[39];
  let Kh = Mu,
    Eu;
  if ($[40] !== Re)
    ((Eu = (rules, unreachable) => {
      ot(null);
      for (const rule_3 of rules)
        L((prev) => [
          ...prev,
          `Added ${rule_3.ruleBehavior} rule ${sequential.bold(consentRowLabel(formatPermissionRule(rule_3.ruleValue)))}`,
        ]);
      for (const Or of unreachable) {
        let qh = Or.shadowType === "deny" ? "blocked" : "shadowed";
        L((prev_0) => [
          ...prev_0,
          color(
            "warning",
            Re,
          )(`${re.warning} Warning: ${consentRowLabel(formatPermissionRule(Or.rule.ruleValue))} is ${qh}`),
          sequential.dim(`  ${Or.reason}`),
          sequential.dim(`  Fix: ${Or.fix}`),
        ]);
      }
    }),
      ($[40] = Re),
      ($[41] = Eu));
  else Eu = $[41];
  let Ii = Eu,
    ku;
  if ($[42] === MEMO_CACHE_SENTINEL)
    ((ku = () => {
      ot(null);
    }),
      ($[42] = ku));
  else ku = $[42];
  let Yh = ku,
    Du;
  if ($[43] === MEMO_CACHE_SENTINEL) ((Du = () => Ze(!0)), ($[43] = Du));
  else Du = $[43];
  let Gh = Du,
    Pu;
  if ($[44] === MEMO_CACHE_SENTINEL) ((Pu = (path) => bt(path)), ($[44] = Pu));
  else Pu = $[44];
  let Zh = Pu,
    Ou;
  if ($[45] !== V || $[46] !== onExit || $[47] !== onRetryDenials || $[48] !== removeDenial || $[49] !== C)
    ((Ou = () => {
      if (le.current) {
        return;
      }
      le.current = !0;
      let s_1 = denialStateRef.current;
      let denialsFor = (set) =>
        Array.from(set)
          .map((idx) => s_1.denials[idx])
          .filter(Bh);
      let retryDenials = denialsFor(s_1.retry);
      if (retryDenials.length > 0) {
        (onRetryDenials(jn(retryDenials, C), V),
          onExit(void 0, {
            shouldQuery: !0,
            metaMessages: [buildExactRetryGrantMessage(retryDenials, C)],
            metaMessagesOrigin: { kind: "auto-continuation" },
          }));
        return;
      }
      let approvedDenials = denialsFor(s_1.approved);
      if (approvedDenials.length > 0 || V.length > 0) {
        for (const oy of approvedDenials) removeDenial(oy);
        if (approvedDenials.length > 0) onRetryDenials(jn(approvedDenials, C), []);
        onExit(
          V.join(`
`),
          approvedDenials.length > 0
            ? {
                metaMessages: [buildExactRetryGrantMessage(approvedDenials, C)],
                metaMessagesOrigin: { kind: "auto-continuation" },
              }
            : void 0,
        );
      } else onExit("Permissions dialog dismissed", { display: "system" });
    }),
      ($[45] = V),
      ($[46] = onExit),
      ($[47] = onRetryDenials),
      ($[48] = removeDenial),
      ($[49] = C),
      ($[50] = Ou));
  else Ou = $[50];
  let Ct = Ou;
  const Ki = Bt && !Te;
  let $u;
  if ($[51] !== Ki) (($u = { context: "Settings", isActive: Ki }), ($[51] = Ki), ($[52] = $u));
  else $u = $[52];
  useKeybinding("confirm:no", Ct, $u);
  let Bu;
  if ($[53] !== V || $[54] !== onExit)
    ((Bu = () => {
      if (le.current) {
        return;
      }
      if (((le.current = !0), V.length > 0)) {
        onExit(
          V.join(`
`),
        );
        return;
      }
      onExit("Permissions dialog dismissed", { display: "system" });
    }),
      ($[53] = V),
      ($[54] = onExit),
      ($[55] = Bu));
  else Bu = $[55];
  let Vo = useGlobalExitKeybindings(Bu, void 0, Bt),
    _u;
  if (
    $[56] !== st ||
    $[57] !== X ||
    $[58] !== setAppState ||
    $[59] !== storageV5 ||
    $[60] !== toolPermissionContext
  )
    ((_u = () => {
      if (!X) {
        return;
      }
      let { options: options_0 } = st(X.ruleBehavior);
      let selectedKey = jsonStringify(X);
      let ruleKeys = options_0.filter(_h).map(Vh);
      let currentIndex = ruleKeys.indexOf(selectedKey);
      let zi;
      if (currentIndex !== -1) {
        if (currentIndex < ruleKeys.length - 1) zi = ruleKeys[currentIndex + 1];
        else if (currentIndex > 0) zi = ruleKeys[currentIndex - 1];
      }
      vt(zi);
      let ji = consentRowLabel(formatPermissionRule(X.ruleValue));
      let ruleBehavior = X.ruleBehavior;
      let Lu = $a(ji);
      (deletePermissionRule({
        rule: X,
        initialContext: toolPermissionContext,
        setToolPermissionContext(sy) {
          setAppState((prev_1) => ({ ...prev_1, toolPermissionContext: sy }));
        },
        storageV5: storageV5,
      })
        .then(() => {
          (L((prev_2) => [...prev_2, `Deleted ${ruleBehavior} rule ${sequential.bold(ji)}`]),
            announce(`[Deleted ${ruleBehavior} rule ${Lu}]`));
        })
        .catch((ay) => {
          (logError(ay),
            L((uy) => [...uy, `Could not delete ${sequential.bold(ji)} \u2014 the rule is unchanged`]),
            announce(`[Could not delete ${Lu} \u2014 the rule is unchanged]`));
        }),
        Ve(void 0));
    }),
      ($[56] = st),
      ($[57] = X),
      ($[58] = setAppState),
      ($[59] = storageV5),
      ($[60] = toolPermissionContext),
      ($[61] = _u));
  else _u = $[61];
  let Qi = _u,
    Nu;
  if ($[62] !== storageV5)
    ((Nu = (Lo, po) => {
      if (wM() === void 0) {
        me({
          mode: "env-problem",
          problem:
            "No editor is configured \u2014 set $VISUAL or $EDITOR, then reopen /permissions to edit the environment.",
          draftLines: Lo,
          expected: po,
          canReopen: !1,
        });
        return;
      }
      let ho = editEnvironmentInEditor(Lo);
      if (ho.problem !== null) {
        me({ mode: "env-problem", problem: ho.problem, draftLines: Lo, expected: po, canReopen: !0 });
        return;
      }
      if (ho.content === null) {
        me({
          mode: "env-problem",
          problem:
            "The environment could not be opened for editing: this session has no session directory to hold the working file. Edit autoMode.environment in your settings file directly.",
          draftLines: Lo,
          expected: po,
          canReopen: !1,
        });
        return;
      }
      let Hu = Lh;
      if (
        Hu(ho.content) ===
        Hu(
          Lo.join(`
`),
        )
      ) {
        me({
          mode: "env-problem",
          problem:
            'No changes detected \u2014 nothing was saved. If your editor opened in a separate window without waiting, configure it to wait (for example "code --wait"), then reopen.',
          draftLines: Lo,
          expected: po,
          canReopen: !0,
        });
        return;
      }
      let Uu = us(ho.content);
      if (Uu !== null) {
        me({
          mode: "env-problem",
          problem: Uu,
          draftLines: ho.content.split(`
`),
          expected: po,
          canReopen: !0,
        });
        return;
      }
      (saveEnvironmentDocument(
        ho.content.split(`
`),
        po,
        storageV5,
      )
        .then(() => {
          (ge(collectAutoModeRuleEntries()),
            N(classifyAutoModeRuleSource()),
            L((dy) => [
              ...dy,
              po.length === 0
                ? "Replaced the built-in auto mode environment with your own document"
                : "Saved your auto mode environment document",
            ]));
        })
        .catch((qi) => {
          (logForDebugging(`auto mode env save failed: ${String(qi)}`, { level: "error" }),
            ge(collectAutoModeRuleEntries()),
            N(classifyAutoModeRuleSource()),
            L((cy) => [
              ...cy,
              `Could not save the environment \u2014 ${qi instanceof Error ? qi.message : "nothing was changed"}`,
            ]));
        }),
        me(null));
    }),
      ($[62] = storageV5),
      ($[63] = Nu));
  else Nu = $[63];
  let _t = Nu,
    Wu;
  if ($[64] !== _t)
    ((Wu = () => {
      let Xi = readUserEnvironmentEntries();
      if (Xi.length === 0 && classifyAutoModeRuleSource().environment.enabled)
        me({ mode: "env-first-confirm" });
      else _t(Xi, Xi);
    }),
      ($[64] = _t),
      ($[65] = Wu));
  else Wu = $[65];
  let Io = Wu;
  if (ke?.mode === "pick-section") {
    let I;
    if ($[66] === MEMO_CACHE_SENTINEL) ((I = () => me(null)), ($[66] = I));
    else I = $[66];
    let U;
    if ($[67] !== Io)
      ((U = e(PickRuleSectionDialog, {
        onCancel: I,
        onPick: (Ku) => {
          if (Ku === "environment" && yse()) {
            Io();
            return;
          }
          me({ mode: "input", section: Ku });
        },
      })),
        ($[67] = Io),
        ($[68] = U));
    else U = $[68];
    return U;
  }
  if (ke?.mode === "env-first-confirm") {
    let I, U;
    if ($[69] === MEMO_CACHE_SENTINEL)
      ((I = () => me(null)),
        (U = e(Text, {
          wrap: "wrap-trim",
          children:
            "Writing your own environment replaces the built-in default document \u2014 the auto mode context that defines trusted hosts, sensitive targets, and repository scope. The editor starts from the full default text so you can edit rather than rewrite; deleting all your environment entries later restores the default.",
        })),
        ($[69] = I),
        ($[70] = U));
    else ((I = $[69]), (U = $[70]));
    let z;
    if ($[71] !== _t)
      ((z = () => _t(getDefaultExternalAutoModeRules().environment ?? [], [])), ($[71] = _t), ($[72] = z));
    else z = $[72];
    let ve;
    if ($[73] === MEMO_CACHE_SENTINEL) ((ve = () => me(null)), ($[73] = ve));
    else ve = $[73];
    let Oe;
    if ($[74] !== z)
      ((Oe = r(Dialog, {
        title: "Replace the built-in environment?",
        color: "permission",
        onCancel: I,
        children: [U, e(ConfirmSelect, { focus: "cancel", hideIndexes: !0, onConfirm: z, onCancel: ve })],
      })),
        ($[74] = z),
        ($[75] = Oe));
    else Oe = $[75];
    return Oe;
  }
  if (ke?.mode === "env-problem") {
    let { problem: problem, draftLines: draftLines, expected: expected, canReopen: canReopen } = ke;
    let I;
    if ($[76] === MEMO_CACHE_SENTINEL) ((I = () => me(null)), ($[76] = I));
    else I = $[76];
    let U;
    if ($[77] !== problem)
      ((U = e(Text, { color: "error", wrap: "wrap-trim", children: problem })),
        ($[77] = problem),
        ($[78] = U));
    else U = $[78];
    let z;
    if ($[79] !== canReopen)
      ((z = canReopen ? [{ label: `Reopen in ${C5() ?? "your editor"}`, value: "reopen" }] : []),
        ($[79] = canReopen),
        ($[80] = z));
    else z = $[80];
    let ve;
    if ($[81] === MEMO_CACHE_SENTINEL) ((ve = { label: "Cancel", value: "cancel" }), ($[81] = ve));
    else ve = $[81];
    let Oe;
    if ($[82] !== z) ((Oe = [...z, ve]), ($[82] = z), ($[83] = Oe));
    else Oe = $[83];
    let mt;
    if ($[84] !== draftLines || $[85] !== expected || $[86] !== _t)
      ((mt = (toolPermissionContext_1) => {
        if (toolPermissionContext_1 === "reopen") _t(draftLines, expected);
        else me(null);
      }),
        ($[84] = draftLines),
        ($[85] = expected),
        ($[86] = _t),
        ($[87] = mt));
    else mt = $[87];
    let yo;
    if ($[88] === MEMO_CACHE_SENTINEL) ((yo = () => me(null)), ($[88] = yo));
    else yo = $[88];
    let go;
    if ($[89] !== Oe || $[90] !== mt)
      ((go = e(ModelSelector, { options: Oe, onChange: mt, onCancel: yo })),
        ($[89] = Oe),
        ($[90] = mt),
        ($[91] = go));
    else go = $[91];
    let vo;
    if ($[92] !== U || $[93] !== go)
      ((vo = r(Dialog, { title: "Edit environment", color: "permission", onCancel: I, children: [U, go] })),
        ($[92] = U),
        ($[93] = go),
        ($[94] = vo));
    else vo = $[94];
    return vo;
  }
  if (ke?.mode === "input") {
    let { section: section, editing: editing } = ke;
    let I;
    if ($[95] !== section)
      ((I = getAutoModeRuleCategoryLabel(section).toLowerCase()), ($[95] = section), ($[96] = I));
    else I = $[96];
    let $r = I;
    const U = editing?.text;
    let z;
    if ($[97] !== editing)
      ((z = () => me(editing ? { mode: "details", entry: editing } : null)), ($[97] = editing), ($[98] = z));
    else z = $[98];
    let ve;
    if ($[99] !== editing || $[100] !== $r || $[101] !== section || $[102] !== storageV5)
      ((ve = (prev_3) => {
        let No = Xt(prev_3);
        if (editing && No === editing.text) {
          me(null);
          return;
        }
        if (editing)
          fs(section, editing.index, editing.text, No, storageV5)
            .then(() => {
              (ge(collectAutoModeRuleEntries()),
                N(classifyAutoModeRuleSource()),
                L((fy) => [
                  ...fy,
                  `Updated auto mode ${$r} rule ${sequential.bold(replaceLineBreaks(displayField(No).text))}`,
                ]));
            })
            .catch((el) => {
              (logForDebugging(`auto mode rule update failed: ${String(el)}`, { level: "error" }),
                ge(collectAutoModeRuleEntries()),
                N(classifyAutoModeRuleSource()),
                L((hy) => [
                  ...hy,
                  `Could not update ${sequential.bold(replaceLineBreaks(displayField(editing.text).text))} \u2014 ${el instanceof Error ? el.message : "the rule is unchanged"}`,
                ]));
            });
        else
          ps(section, No, storageV5)
            .then(() => {
              (ge(collectAutoModeRuleEntries()),
                N(classifyAutoModeRuleSource()),
                L((yy) => [
                  ...yy,
                  `Added auto mode ${$r} rule ${sequential.bold(replaceLineBreaks(displayField(No).text))}`,
                ]));
            })
            .catch((tl) => {
              (logForDebugging(`auto mode rule add failed: ${String(tl)}`, { level: "error" }),
                ge(collectAutoModeRuleEntries()),
                N(classifyAutoModeRuleSource()),
                L((gy) => [
                  ...gy,
                  `Could not add ${sequential.bold(replaceLineBreaks(displayField(No).text))} \u2014 ${tl instanceof Error ? tl.message : "nothing was saved"}`,
                ]));
            });
        me(null);
      }),
        ($[99] = editing),
        ($[100] = $r),
        ($[101] = section),
        ($[102] = storageV5),
        ($[103] = ve));
    else ve = $[103];
    let Oe;
    if ($[104] !== section || $[105] !== U || $[106] !== z || $[107] !== ve)
      ((Oe = e(AutoModeRuleInput, { section: section, initialValue: U, onCancel: z, onSubmit: ve })),
        ($[104] = section),
        ($[105] = U),
        ($[106] = z),
        ($[107] = ve),
        ($[108] = Oe));
    else Oe = $[108];
    return Oe;
  }
  if (ke?.mode === "builtins") {
    let section = ke.section;
    let Ho = W[section];
    let I;
    if ($[109] !== section || $[110] !== Ho.enabled || $[111] !== storageV5)
      ((I = () => {
        let ol = !Ho.enabled;
        (AUTO_MODE_RULE_EDIT_ERRORS(section, ol, storageV5)
          .then(() => {
            (ge(collectAutoModeRuleEntries()),
              N(classifyAutoModeRuleSource()),
              L((vy) => [
                ...vy,
                `${ol ? "Enabled" : "Disabled"} the built-in auto mode ${getAutoModeRuleCategoryLabel(section).toLowerCase()} rules`,
              ]));
          })
          .catch((nl) => {
            (logForDebugging(`auto mode builtins toggle failed: ${String(nl)}`, { level: "error" }),
              ge(collectAutoModeRuleEntries()),
              N(classifyAutoModeRuleSource()),
              L((by) => [
                ...by,
                `Could not ${ol ? "enable" : "disable"} the built-in ${getAutoModeRuleCategoryLabel(section).toLowerCase()} rules \u2014 ${nl instanceof Error ? nl.message : "nothing was changed"}`,
              ]));
          }),
          me(null));
      }),
        ($[109] = section),
        ($[110] = Ho.enabled),
        ($[111] = storageV5),
        ($[112] = I));
    else I = $[112];
    let U;
    if ($[113] === MEMO_CACHE_SENTINEL) ((U = () => me(null)), ($[113] = U));
    else U = $[113];
    let z;
    if ($[114] !== section || $[115] !== Ho || $[116] !== I)
      ((z = e(BuiltinRulesSection, { section: section, state: Ho, onToggle: I, onCancel: U })),
        ($[114] = section),
        ($[115] = Ho),
        ($[116] = I),
        ($[117] = z));
    else z = $[117];
    return z;
  }
  if (ke?.mode === "details") {
    let { entry: entry } = ke;
    let I, U;
    if ($[118] !== entry)
      ((I = () => {
        me({ mode: "input", section: entry.section, editing: entry });
      }),
        (U = () => me({ mode: "delete", entry: entry })),
        ($[118] = entry),
        ($[119] = I),
        ($[120] = U));
    else ((I = $[119]), (U = $[120]));
    let z;
    if ($[121] === MEMO_CACHE_SENTINEL) ((z = () => me(null)), ($[121] = z));
    else z = $[121];
    let ve;
    if ($[122] !== entry || $[123] !== I || $[124] !== U)
      ((ve = e(AutoModeRuleDetails, { entry: entry, onEdit: I, onDelete: U, onCancel: z })),
        ($[122] = entry),
        ($[123] = I),
        ($[124] = U),
        ($[125] = ve));
    else ve = $[125];
    return ve;
  }
  if (ke?.mode === "delete") {
    let { entry: entry } = ke;
    let I;
    if ($[126] !== entry.section)
      ((I = (rl) => rl.section === entry.section && !(rl.structure && rl.source === "userSettings")),
        ($[126] = entry.section),
        ($[127] = I));
    else I = $[127];
    let U;
    if ($[128] !== ae || $[129] !== I) ((U = count(ae, I)), ($[128] = ae), ($[129] = I), ($[130] = U));
    else U = $[130];
    const z = U === 1;
    let ve;
    if ($[131] !== ae || $[132] !== entry || $[133] !== storageV5)
      ((ve = () => {
        let index = sortRuleEntries(ae).indexOf(entry);
        (hs(entry.section, entry.index, entry.text, storageV5)
          .then(() => {
            let sl = collectAutoModeRuleEntries();
            (ge(sl), N(classifyAutoModeRuleSource()));
            let wy = yse() ? sl.filter(Ih) : sl;
            let zu = sortRuleEntries(wy);
            let ju = zu[Math.min(Math.max(index, 0), zu.length - 1)];
            (Ut(ju ? Mt(ju) : void 0),
              L((Ry) => [
                ...Ry,
                `Deleted auto mode ${getAutoModeRuleCategoryLabel(entry.section).toLowerCase()} rule ${sequential.bold(replaceLineBreaks(displayField(entry.text).text))}`,
              ]));
          })
          .catch((il) => {
            (logForDebugging(`auto mode rule delete failed: ${String(il)}`, { level: "error" }),
              ge(collectAutoModeRuleEntries()),
              N(classifyAutoModeRuleSource()),
              L((Sy) => [
                ...Sy,
                `Could not delete ${sequential.bold(replaceLineBreaks(displayField(entry.text).text))} \u2014 ${il instanceof Error ? il.message : "the rule is unchanged"}`,
              ]));
          }),
          me(null));
      }),
        ($[131] = ae),
        ($[132] = entry),
        ($[133] = storageV5),
        ($[134] = ve));
    else ve = $[134];
    let Oe;
    if ($[135] !== entry)
      ((Oe = () => me({ mode: "details", entry: entry })), ($[135] = entry), ($[136] = Oe));
    else Oe = $[136];
    let mt;
    if ($[137] !== entry || $[138] !== z || $[139] !== ve || $[140] !== Oe)
      ((mt = e(DeleteAutoModeRuleConfirm, { entry: entry, isLastInSection: z, onConfirm: ve, onCancel: Oe })),
        ($[137] = entry),
        ($[138] = z),
        ($[139] = ve),
        ($[140] = Oe),
        ($[141] = mt));
    else mt = $[141];
    return mt;
  }
  if (X) {
    let I;
    if ($[142] === MEMO_CACHE_SENTINEL) ((I = () => Ve(void 0)), ($[142] = I));
    else I = $[142];
    let U;
    if ($[143] !== Qi || $[144] !== X)
      ((U = e(RuleDetails, { rule: X, onDelete: Qi, onCancel: I })),
        ($[143] = Qi),
        ($[144] = X),
        ($[145] = U));
    else U = $[145];
    return U;
  }
  if ($e && $e !== "workspace" && $e !== "recent" && $e !== "automode") {
    let I;
    if ($[146] !== $e)
      ((I = e(PermissionRuleInput, { onCancel: Hh, onSubmit: Kh, ruleBehavior: $e })),
        ($[146] = $e),
        ($[147] = I));
    else I = $[147];
    return I;
  }
  if (Ge) {
    let I;
    if ($[148] !== Ge.ruleValue) ((I = [Ge.ruleValue]), ($[148] = Ge.ruleValue), ($[149] = I));
    else I = $[149];
    let U;
    if ($[150] !== setAppState)
      ((U = (xy) => {
        setAppState((Ay) => ({ ...Ay, toolPermissionContext: xy }));
      }),
        ($[150] = setAppState),
        ($[151] = U));
    else U = $[151];
    let z;
    if (
      $[152] !== Ii ||
      $[153] !== I ||
      $[154] !== U ||
      $[155] !== toolPermissionContext ||
      $[156] !== Ge.ruleBehavior
    )
      ((z = e(AddPermissionRules, {
        onAddRules: Ii,
        onCancel: Yh,
        ruleValues: I,
        ruleBehavior: Ge.ruleBehavior,
        initialContext: toolPermissionContext,
        setToolPermissionContext: U,
      })),
        ($[152] = Ii),
        ($[153] = I),
        ($[154] = U),
        ($[155] = toolPermissionContext),
        ($[156] = Ge.ruleBehavior),
        ($[157] = z));
    else z = $[157];
    return z;
  }
  if (at) {
    let I;
    if ($[158] !== setAppState || $[159] !== storageV5 || $[160] !== toolPermissionContext)
      ((I = (path_0, remember) => {
        let permissionUpdate = {
          type: "addDirectories",
          directories: [path_0],
          destination: remember ? "localSettings" : "session",
        };
        let updatedContext = applyValidatedPermissionUpdate(toolPermissionContext, permissionUpdate);
        if ((setAppState((prev_4) => ({ ...prev_4, toolPermissionContext: updatedContext })), remember))
          persistValidatedPermissionUpdate(permissionUpdate, storageV5).catch(logError);
        (L((prev_5) => [
          ...prev_5,
          `Added directory ${sequential.bold(hr(path_0))} to workspace${remember ? " and saved to local settings" : " for this session"}`,
        ]),
          Ze(!1));
      }),
        ($[158] = setAppState),
        ($[159] = storageV5),
        ($[160] = toolPermissionContext),
        ($[161] = I));
    else I = $[161];
    let U;
    if ($[162] === MEMO_CACHE_SENTINEL) ((U = () => Ze(!1)), ($[162] = U));
    else U = $[162];
    let z;
    if ($[163] !== I || $[164] !== toolPermissionContext)
      ((z = e(AddWorkspaceDirectory, {
        onAddDirectory: I,
        onCancel: U,
        permissionContext: toolPermissionContext,
      })),
        ($[163] = I),
        ($[164] = toolPermissionContext),
        ($[165] = z));
    else z = $[165];
    return z;
  }
  if (je) {
    let I;
    if ($[166] !== je)
      ((I = () => {
        (L((prev_6) => [...prev_6, `Removed directory ${sequential.bold(je)} from workspace`]), bt(null));
      }),
        ($[166] = je),
        ($[167] = I));
    else I = $[167];
    let U;
    if ($[168] === MEMO_CACHE_SENTINEL) ((U = () => bt(null)), ($[168] = U));
    else U = $[168];
    let z;
    if ($[169] !== setAppState)
      ((z = (toolPermissionContext_2) => {
        setAppState((prev_7) => ({ ...prev_7, toolPermissionContext: toolPermissionContext_2 }));
      }),
        ($[169] = setAppState),
        ($[170] = z));
    else z = $[170];
    let ve;
    if ($[171] !== je || $[172] !== I || $[173] !== z || $[174] !== toolPermissionContext)
      ((ve = e(RemoveWorkspaceDirectory, {
        directoryPath: je,
        onRemove: I,
        onCancel: U,
        permissionContext: toolPermissionContext,
        setPermissionContext: z,
      })),
        ($[171] = je),
        ($[172] = I),
        ($[173] = z),
        ($[174] = toolPermissionContext),
        ($[175] = ve));
    else ve = $[175];
    return ve;
  }
  let I;
  if (
    $[176] !== st ||
    $[177] !== Ct ||
    $[178] !== Pr ||
    $[179] !== Te ||
    $[180] !== isTerminalFocused ||
    $[181] !== Le ||
    $[182] !== searchCursorOffset ||
    $[183] !== searchQuery
  )
    ((I = {
      searchQuery: searchQuery,
      isSearchMode: Te,
      isFocused: isTerminalFocused,
      onCancel: Ct,
      lastFocusedRuleKey: Le,
      cursorOffset: searchCursorOffset,
      getRulesOptions: st,
      handleToolSelect: Pr,
      onHeaderFocusChange: Po,
    }),
      ($[176] = st),
      ($[177] = Ct),
      ($[178] = Pr),
      ($[179] = Te),
      ($[180] = isTerminalFocused),
      ($[181] = Le),
      ($[182] = searchCursorOffset),
      ($[183] = searchQuery),
      ($[184] = I));
  else I = $[184];
  let Lt = I,
    al = !Bt,
    ul = E === "recent" && b;
  const t23 = !Te;
  let z;
  if ($[185] !== de || $[186] !== isMidTurn)
    ((z = e(
      Tab,
      {
        id: "recent",
        title: "Recently blocked",
        children: e(RecentDenialsTab, { onHeaderFocusChange: Po, onStateChange: de, isMidTurn: isMidTurn }),
      },
      "recent",
    )),
      ($[185] = de),
      ($[186] = isMidTurn),
      ($[187] = z));
  else z = $[187];
  let ve;
  if ($[188] !== Lt)
    ((ve = e(
      Tab,
      { id: "allow", title: "Allow", children: e(PermissionRulesTab, { tab: "allow", ...Lt }) },
      "allow",
    )),
      ($[188] = Lt),
      ($[189] = ve));
  else ve = $[189];
  let Oe;
  if ($[190] !== Lt)
    ((Oe = e(
      Tab,
      { id: "ask", title: "Ask", children: e(PermissionRulesTab, { tab: "ask", ...Lt }) },
      "ask",
    )),
      ($[190] = Lt),
      ($[191] = Oe));
  else Oe = $[191];
  let mt;
  if ($[192] !== Lt)
    ((mt = e(
      Tab,
      { id: "deny", title: "Deny", children: e(PermissionRulesTab, { tab: "deny", ...Lt }) },
      "deny",
    )),
      ($[192] = Lt),
      ($[193] = mt));
  else mt = $[193];
  let yo;
  if (
    $[194] !== W ||
    $[195] !== ae ||
    $[196] !== Ct ||
    $[197] !== Te ||
    $[198] !== isTerminalFocused ||
    $[199] !== Do ||
    $[200] !== searchCursorOffset ||
    $[201] !== searchQuery ||
    $[202] !== Io ||
    $[203] !== toolPermissionContext.isAutoModeAvailable
  )
    ((yo =
      toolPermissionContext.isAutoModeAvailable !== !1
        ? [
            e(
              Tab,
              {
                id: "automode",
                title: "Auto mode",
                children: e(AgentsMenu, {
                  entries: ae,
                  searchQuery: searchQuery,
                  isSearchMode: Te,
                  isFocused: isTerminalFocused,
                  cursorOffset: searchCursorOffset,
                  defaultFocusValue: Do,
                  builtinsState: W,
                  onSelectBuiltins: (Xu) => {
                    (Ut(`builtins:${Xu}`), me({ mode: "builtins", section: Xu }));
                  },
                  onAddNew: () => me({ mode: "pick-section" }),
                  onSelectEntry: (Yu) => {
                    (Ut(Mt(Yu)), me({ mode: "details", entry: Yu }));
                  },
                  onSelectEnvironment: () => {
                    (Ut("environment-document"), Io());
                  },
                  onCancel: Ct,
                  onHeaderFocusChange: Po,
                }),
              },
              "automode",
            ),
          ]
        : []),
      ($[194] = W),
      ($[195] = ae),
      ($[196] = Ct),
      ($[197] = Te),
      ($[198] = isTerminalFocused),
      ($[199] = Do),
      ($[200] = searchCursorOffset),
      ($[201] = searchQuery),
      ($[202] = Io),
      ($[203] = toolPermissionContext.isAutoModeAvailable),
      ($[204] = yo));
  else yo = $[204];
  let go;
  if ($[205] === MEMO_CACHE_SENTINEL)
    ((go = e(Text, {
      wrap: "wrap-trim",
      children: "Claude Code can read files in the workspace, and make edits when auto-accept edits is on.",
    })),
      ($[205] = go));
  else go = $[205];
  let vo;
  if ($[206] !== Ct || $[207] !== toolPermissionContext)
    ((vo = e(
      Tab,
      {
        id: "workspace",
        title: "Workspace",
        children: r(Box, {
          flexDirection: "column",
          children: [
            go,
            e(WorkspaceTab, {
              onCancel: Ct,
              toolPermissionContext: toolPermissionContext,
              onRequestAddDirectory: Gh,
              onRequestRemoveDirectory: Zh,
              onHeaderFocusChange: Po,
            }),
          ],
        }),
      },
      "workspace",
    )),
      ($[206] = Ct),
      ($[207] = toolPermissionContext),
      ($[208] = vo));
  else vo = $[208];
  let Br;
  if ($[209] !== z || $[210] !== ve || $[211] !== Oe || $[212] !== mt || $[213] !== yo || $[214] !== vo)
    ((Br = [z, ve, Oe, mt, ...yo, vo]),
      ($[209] = z),
      ($[210] = ve),
      ($[211] = Oe),
      ($[212] = mt),
      ($[213] = yo),
      ($[214] = vo),
      ($[215] = Br));
  else Br = $[215];
  let _r;
  if ($[216] !== T || $[217] !== Wt || $[218] !== al || $[219] !== E || $[220] !== t23 || $[221] !== Br)
    ((_r = e(Tabs, {
      title: "Permissions",
      color: "permission",
      defaultTab: T,
      selectedTab: E,
      onTabChange: D,
      hidden: al,
      initialHeaderFocused: Wt,
      navFromContent: t23,
      children: Br,
    })),
      ($[216] = T),
      ($[217] = Wt),
      ($[218] = al),
      ($[219] = E),
      ($[220] = t23),
      ($[221] = Br),
      ($[222] = _r));
  else _r = $[222];
  let Vr;
  if (
    $[223] !== ee ||
    $[224] !== Vo.keyName ||
    $[225] !== Vo.pending ||
    $[226] !== Wt ||
    $[227] !== ul ||
    $[228] !== rt ||
    $[229] !== Te ||
    $[230] !== ye
  )
    ((Vr = Vo.pending
      ? `Press ${Vo.keyName} again to cancel`
      : Wt
        ? r(Fragment, {
            children: ["\u2190/\u2192 to switch \xB7 \u2193 to select \xB7 ", ye ?? "Esc to cancel"],
          })
        : Te
          ? e(Fragment, {
              children: "Type to filter \xB7 Enter/\u2193 to select \xB7 \u2191 to tabs \xB7 Esc to clear",
            })
          : ul
            ? r(Fragment, {
                children: [
                  ee && "Enter to approve \xB7 r to retry \xB7 ",
                  ye ?? `${rt ? "" : "\u2191/\u2193 to navigate \xB7 "}Esc to close`,
                ],
              })
            : r(Fragment, {
                children: [
                  rt ? "" : "\u2191/\u2193 to navigate \xB7 Enter to select \xB7 ",
                  "\u2190/\u2192 to switch \xB7 ",
                  ye ?? "Esc to cancel",
                ],
              })),
      ($[223] = ee),
      ($[224] = Vo.keyName),
      ($[225] = Vo.pending),
      ($[226] = Wt),
      ($[227] = ul),
      ($[228] = rt),
      ($[229] = Te),
      ($[230] = ye),
      ($[231] = Vr));
  else Vr = $[231];
  let Lr;
  if ($[232] !== Vr)
    ((Lr = e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: Vr }) })),
      ($[232] = Vr),
      ($[233] = Lr));
  else Lr = $[233];
  let Ir;
  if ($[234] !== _r || $[235] !== Lr)
    ((Ir = r(Pane, { color: "permission", children: [_r, Lr] })),
      ($[234] = _r),
      ($[235] = Lr),
      ($[236] = Ir));
  else Ir = $[236];
  let Gu;
  if ($[237] !== kr || $[238] !== handlePaste || $[239] !== Ir)
    ((Gu = e(Box, { flexDirection: "column", onKeyDown: kr, onPaste: handlePaste, children: Ir })),
      ($[237] = kr),
      ($[238] = handlePaste),
      ($[239] = Ir),
      ($[240] = Gu));
  else Gu = $[240];
  return Gu;
}

export { PermissionRuleList };
