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
import { randomBytes } from "crypto";
import { mkdirSync, openSync, constants, writeSync, closeSync } from "fs";
import { dirname } from "path";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import {
  displayField,
  replaceLineBreaks,
  uniqueLabels,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { Blockquote } from "../../Blockquote.js";
import {
  getAutoModeSectionColor,
  getAutoModeRuleCategoryLabel,
  describeRuleSource,
  validateRuleText,
  AUTO_MODE_RULE_SECTIONS,
  classifyAutoModeRuleSource,
  collectAutoModeRuleEntries,
  ruleTextProblem,
  saveEnvironmentDocument,
  readUserEnvironmentEntries,
  normalizeRuleText,
  updateAutoModeRule,
  addAutoModeRule,
  AUTO_MODE_RULE_EDIT_ERRORS,
  sortRuleEntries,
  deleteAutoModeRule,
  ruleKey,
} from "./autoModeRuleEdits.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { useKeybinding, useGlobalExitKeybindings } from "../../../keybindings/useKeybinding.js";
import { AgentNavigationFooter } from "../../agents/AgentNavigationFooter.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { UltrareviewOverageDialog, openRulesInEditor, toBulletLine } from "./openRulesInEditor.js";
import { ShutdownRequestDisplay } from "../../messages/ShutdownMessage.js";
import { isAutoModeSetupNotOverridden } from "../../../commands/auto-mode-setup/index.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { useIsFullscreen } from "../../../ink/renderModeContext.js";
import {
  getDefaultExternalAutoModeRules,
  sessionSidecarFilePath,
} from "../../../utils/permissions/yoloClassifier.js";
import { truncateToLength } from "../../../utils/stringUtils.js";
import { getShortEditorName, resolveEditorCommand } from "../../../utils/editor.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";
import { Byline } from "../../design-system/Byline.js";
import { init_react_production, y, R, P, zt } from "../../../../vendor/react/cjs/react.production.js";
import { AUTO_MODE_ENV_EDIT } from "../../../utils/teleport/autoModeDumps.js";
import { editFileInEditor } from "../../../utils/promptEditor.js";
import { Dialog } from "../../design-system/Dialog.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { supportsShiftEnter } from "../../../commands/terminalSetup/terminalSetup.js";
import { Newline } from "../../../ink/components/Input.js";
import { TextInput } from "../../TextInput.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { consentRowLabel } from "../consentRows.js";
import {
  permissionRuleSourceDisplayString,
  getAllowRules,
  getDenyRules,
  getAskRules,
  deletePermissionRule,
} from "../../../utils/permissions/permissions.js";
import { quotedReason, RecentDenialsTab } from "./RecentDenialsTab.js";
import { truncateToWidth } from "../../../utils/format.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";
import { PermissionRuleDescription } from "./PermissionRuleDescription.js";
import { useTabsWidth, useTabHeaderFocus, Tab, Tabs } from "../../design-system/Tabs.js";
import { useFocusOnMount } from "../../../hooks/useFocusOnMount.js";
import { SearchBox } from "../../SearchBox.js";
import { useTheme_2, useTheme } from "../../design-system/ThemeProvider.js";
import { statusSnapshot, statusRowTexts } from "../../Spinner/spinnerStatus.js";
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
import { alwaysTrueFlag } from "../../../utils/permissions/serverClassifier/arbiter.js";
import { count } from "../../../utils/collections.js";
import { PermissionRuleInput } from "./PermissionRuleInput.js";
import { AddPermissionRules } from "./AddPermissionRules.js";
import {
  applyValidatedPermissionUpdate,
  persistValidatedPermissionUpdate,
} from "../../../utils/permissions/PermissionUpdate.js";
import { stripInvisibleChars } from "../../../utils/invisibleChars.js";
import { AddWorkspaceDirectory } from "./AddWorkspaceDirectory.js";
import { RemoveWorkspaceDirectory } from "./RemoveWorkspaceDirectory.js";
import { AgentsMenu } from "../../agents/AgentsMenu.js";
import { WorkspaceTab } from "./WorkspaceTab.js";
import { Pane } from "../../design-system/Pane.js";

//@ chunk-p2qwpk2k.js:51445-52517 sole-consumer
/**
 * auto 模式规则详情头：规则文本（引用块）+ 分类标签（按分类着色）+ "rule/section header for auto mode · From 来源"。
 */
function AutoModeRuleSummary(props) {
  let m = w(25);
  let { entry } = props;
  let a;
  if (m[0] !== entry.text) {
    a = displayField(entry.text);
    m[0] = entry.text;
    m[1] = a;
  } else a = m[1];
  let f = a;
  let children;
  if (m[2] !== f.text) {
    children = jsxProd_default(Text, {
      bold: true,
      wrap: "wrap-trim",
      children: f.text,
    });
    m[2] = f.text;
    m[3] = children;
  } else children = m[3];
  let v;
  if (m[4] !== f.needsGutter || m[5] !== children) {
    v = jsxProd_default(Blockquote, {
      multiline: f.needsGutter,
      children,
    });
    m[4] = f.needsGutter;
    m[5] = children;
    m[6] = v;
  } else v = m[6];
  let color;
  if (m[7] !== entry.section) {
    color = getAutoModeSectionColor(entry.section);
    m[7] = entry.section;
    m[8] = color;
  } else color = m[8];
  let children_2;
  if (m[9] !== entry.section) {
    children_2 = getAutoModeRuleCategoryLabel(entry.section);
    m[9] = entry.section;
    m[10] = children_2;
  } else children_2 = m[10];
  let c;
  if (m[11] !== color || m[12] !== children_2) {
    c = jsxProd_default(Text, {
      color,
      children: children_2,
    });
    m[11] = color;
    m[12] = children_2;
    m[13] = c;
  } else c = m[13];
  const M = entry.structure ? "section header" : "rule";
  let b;
  if (m[14] !== entry.source) {
    b = describeRuleSource(entry.source);
    m[14] = entry.source;
    m[15] = b;
  } else b = m[15];
  let T;
  if (m[16] !== M || m[17] !== b) {
    T = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", M, " for auto mode \xB7 From", " ", b],
    });
    m[16] = M;
    m[17] = b;
    m[18] = T;
  } else T = m[18];
  let E;
  if (m[19] !== c || m[20] !== T) {
    E = jsxProd_default_2(Text, {
      children: [c, T],
    });
    m[19] = c;
    m[20] = T;
    m[21] = E;
  } else E = m[21];
  let D;
  if (m[22] !== E || m[23] !== v) {
    D = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginX: 2,
      children: [v, E],
    });
    m[22] = E;
    m[23] = v;
    m[24] = D;
  } else D = m[24];
  return D;
}
//@ chunk-p2qwpk2k.js:52517-57241 sole-consumer
/**
 * auto 模式规则详情页：旧版 autoMode.deny、环境分节标题、托管设置、--settings 来源等只读情况给出说明，用户规则提供编辑/删除。
 */
function AutoModeRuleDetails(props) {
  let g = w(78);
  let { entry, onEdit, onDelete, onCancel } = props;
  let v;
  if (g[0] === MEMO_CACHE_SENTINEL) {
    v = {
      context: "Confirmation",
    };
    g[0] = v;
  } else v = g[0];
  useKeybinding("confirm:no", onCancel, v);
  let x;
  if (g[1] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Box, {
      marginLeft: 3,
      children: jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      }),
    });
    g[1] = x;
  } else x = g[1];
  let C = x;
  if (entry.legacy) {
    let c;
    if (g[2] !== entry) {
      c = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      g[2] = entry;
      g[3] = c;
    } else c = g[3];
    const M =
      entry.source === "userSettings"
        ? "This editor writes only the modern keys \u2014 move the rule to autoMode.soft_deny in your settings file to manage it here."
        : "It is delivered by " + describeRuleSource(entry.source) + " and cannot be modified here.";
    let b;
    if (g[4] !== M) {
      b = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "",
          "This rule comes from the legacy autoMode.deny key, which auto mode still enforces as a soft deny.",
          " ",
          M,
        ],
      });
      g[4] = M;
      g[5] = b;
    } else b = g[5];
    let T;
    if (g[6] !== entry || g[7] !== onCancel) {
      T = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      g[6] = entry;
      g[7] = onCancel;
      g[8] = T;
    } else T = g[8];
    let E;
    if (g[9] !== c || g[10] !== b || g[11] !== T) {
      E = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [c, b, T],
          }),
          C,
        ],
      });
      g[9] = c;
      g[10] = b;
      g[11] = T;
      g[12] = E;
    } else E = g[12];
    return E;
  }
  if (entry.structure) {
    let c;
    if (g[13] !== entry) {
      c = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      g[13] = entry;
      g[14] = c;
    } else c = g[14];
    let M;
    if (g[15] !== entry.source) {
      M =
        entry.source !== "userSettings"
          ? `It is delivered by ${describeRuleSource(entry.source)} and cannot be modified here.`
          : isAutoModeSetupNotOverridden()
            ? "Re-run /auto-mode-setup to restructure, or edit your settings file directly."
            : "Edit your settings file directly to restructure.";
      g[15] = entry.source;
      g[16] = M;
    } else M = g[16];
    let b;
    if (g[17] !== M) {
      b = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "A section header that organizes the environment entries below it; auto mode reads it as written.",
          " ",
          M,
        ],
      });
      g[17] = M;
      g[18] = b;
    } else b = g[18];
    let T;
    if (g[19] !== entry || g[20] !== onCancel) {
      T = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      g[19] = entry;
      g[20] = onCancel;
      g[21] = T;
    } else T = g[21];
    let E;
    if (g[22] !== c || g[23] !== b || g[24] !== T) {
      E = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [c, b, T],
          }),
          C,
        ],
      });
      g[22] = c;
      g[23] = b;
      g[24] = T;
      g[25] = E;
    } else E = g[25];
    return E;
  }
  if (entry.source === "policySettings") {
    let c;
    if (g[26] !== entry) {
      c = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      g[26] = entry;
      g[27] = c;
    } else c = g[27];
    let M;
    if (g[28] === MEMO_CACHE_SENTINEL) {
      M = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "This rule is configured by managed settings and cannot be modified.",
          `
`,
          "Contact your system administrator for more information.",
        ],
      });
      g[28] = M;
    } else M = g[28];
    let b;
    if (g[29] !== entry || g[30] !== onCancel) {
      b = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      g[29] = entry;
      g[30] = onCancel;
      g[31] = b;
    } else b = g[31];
    let T;
    if (g[32] !== c || g[33] !== b) {
      T = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [c, M, b],
          }),
          C,
        ],
      });
      g[32] = c;
      g[33] = b;
      g[34] = T;
    } else T = g[34];
    return T;
  }
  if (entry.source === "flagSettings") {
    let c;
    if (g[35] !== entry) {
      c = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      g[35] = entry;
      g[36] = c;
    } else c = g[36];
    let M;
    if (g[37] === MEMO_CACHE_SENTINEL) {
      M = jsxProd_default(Text, {
        italic: true,
        children:
          "This rule comes from a read-only source (the --settings flag) and cannot be modified here.",
      });
      g[37] = M;
    } else M = g[37];
    let b;
    if (g[38] !== entry || g[39] !== onCancel) {
      b = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      g[38] = entry;
      g[39] = onCancel;
      g[40] = b;
    } else b = g[40];
    let T;
    if (g[41] !== c || g[42] !== b) {
      T = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [c, M, b],
          }),
          C,
        ],
      });
      g[41] = c;
      g[42] = b;
      g[43] = T;
    } else T = g[43];
    return T;
  }
  let c;
  if (g[44] !== entry.section || g[45] !== entry.text) {
    c = validateRuleText(entry.section, entry.text);
    g[44] = entry.section;
    g[45] = entry.text;
    g[46] = c;
  } else c = g[46];
  let D = c;
  if (D !== null) {
    let M;
    if (g[47] !== entry) {
      M = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      g[47] = entry;
      g[48] = M;
    } else M = g[48];
    let b;
    if (g[49] !== D) {
      b = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "This rule cannot be edited here: ",
          D,
          `
`,
          "Edit it in your settings file, or delete it here.",
        ],
      });
      g[49] = D;
      g[50] = b;
    } else b = g[50];
    let options;
    if (g[51] === MEMO_CACHE_SENTINEL) {
      options = [
        {
          label: "Delete",
          value: "delete",
        },
        {
          label: "Cancel",
          value: "cancel",
        },
      ];
      g[51] = options;
    } else options = g[51];
    let onChange;
    if (g[52] !== onCancel || g[53] !== onDelete) {
      onChange = (k) => {
        if (k === "delete") onDelete();
        else onCancel();
      };
      g[52] = onCancel;
      g[53] = onDelete;
      g[54] = onChange;
    } else onChange = g[54];
    let V;
    if (g[55] !== onCancel || g[56] !== onChange) {
      V = jsxProd_default(ModelSelector, {
        options,
        onChange,
        onCancel,
      });
      g[55] = onCancel;
      g[56] = onChange;
      g[57] = V;
    } else V = g[57];
    let L;
    if (g[58] !== M || g[59] !== b || g[60] !== V) {
      L = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [M, b, V],
          }),
          C,
        ],
      });
      g[58] = M;
      g[59] = b;
      g[60] = V;
      g[61] = L;
    } else L = g[61];
    return L;
  }
  let M;
  if (g[62] !== entry) {
    M = jsxProd_default(AutoModeRuleSummary, {
      entry,
    });
    g[62] = entry;
    g[63] = M;
  } else M = g[63];
  let b;
  if (g[64] !== entry.section) {
    b =
      entry.section === "environment" &&
      jsxProd_default_2(Text, {
        italic: true,
        children: [
          "Environment entries describe this machine and project for auto mode.",
          isAutoModeSetupNotOverridden() ? " Re-run /auto-mode-setup to rebuild them from scratch." : "",
        ],
      });
    g[64] = entry.section;
    g[65] = b;
  } else b = g[65];
  let options;
  if (g[66] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Edit",
        value: "edit",
      },
      {
        label: "Delete",
        value: "delete",
      },
      {
        label: "Cancel",
        value: "cancel",
      },
    ];
    g[66] = options;
  } else options = g[66];
  let onChange;
  if (g[67] !== onCancel || g[68] !== onDelete || g[69] !== onEdit) {
    onChange = (B) => {
      if (B === "edit") onEdit();
      else if (B === "delete") onDelete();
      else onCancel();
    };
    g[67] = onCancel;
    g[68] = onDelete;
    g[69] = onEdit;
    g[70] = onChange;
  } else onChange = g[70];
  let V;
  if (g[71] !== onCancel || g[72] !== onChange) {
    V = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
    });
    g[71] = onCancel;
    g[72] = onChange;
    g[73] = V;
  } else V = g[73];
  let L;
  if (g[74] !== M || g[75] !== b || g[76] !== V) {
    L = jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default_2(ShutdownRequestDisplay, {
          color: "permission",
          title: "Rule details",
          children: [M, b, V],
        }),
        C,
      ],
    });
    g[74] = M;
    g[75] = b;
    g[76] = V;
    g[77] = L;
  } else L = g[77];
  return L;
}
//@ chunk-p2qwpk2k.js:57241-57253 sole-consumer
var DEFAULT_LIST_HEIGHT = 3200;
//@ chunk-p2qwpk2k.js:57253-57305 sole-consumer
function listHeight(isFullscreen) {
  return isFullscreen ? Number.POSITIVE_INFINITY : DEFAULT_LIST_HEIGHT;
}
//@ chunk-p2qwpk2k.js:57305-61446 sole-consumer
/**
 * 显示某分类的内置 auto 模式规则（按终端高度截取，单条超长截断）、是否生效、是否可切换，以及在编辑器中查看全文。
 */
function BuiltinRulesSection(props) {
  let v = w(83);
  let { section, state, onToggle, onCancel } = props;
  let isFullscreen = useIsFullscreen();
  let x;
  if (v[0] === MEMO_CACHE_SENTINEL) {
    x = {
      context: "Settings",
    };
    v[0] = x;
  } else x = v[0];
  useKeybinding("confirm:no", onCancel, x);
  let [C, c] = openRulesInEditor(section);
  let M;
  let b;
  let T;
  let E;
  let D;
  let k;
  let flexDirection;
  let marginX;
  let marginY;
  let gap;
  let color;
  let title;
  let le;
  if (v[1] !== isFullscreen || v[2] !== section || v[3] !== state.control || v[4] !== state.enabled) {
    D = getDefaultExternalAutoModeRules()[section] ?? [];
    let J;
    if (v[18] === MEMO_CACHE_SENTINEL) {
      J = jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "esc",
          action: "cancel",
        }),
      });
      v[18] = J;
    } else J = v[18];
    E = J;
    T = state.control === "user";
    b = ShutdownRequestDisplay;
    color = "permission";
    title = "Built-in rules";
    let color_2;
    if (v[19] !== section) {
      color_2 = getAutoModeSectionColor(section);
      v[19] = section;
      v[20] = color_2;
    } else color_2 = v[20];
    let children;
    if (v[21] !== section) {
      children = getAutoModeRuleCategoryLabel(section);
      v[21] = section;
      v[22] = children;
    } else children = v[22];
    let ue;
    if (v[23] !== color_2 || v[24] !== children) {
      ue = jsxProd_default(Text, {
        color: color_2,
        children,
      });
      v[23] = color_2;
      v[24] = children;
      v[25] = ue;
    } else ue = v[25];
    const ee = `${D.length} built-in ${D.length === 1 ? "rule" : "rules"} \xB7 ${state.enabled ? "in effect" : "switched off"}`;
    let ce;
    if (v[26] !== ee) {
      ce = jsxProd_default_2(Text, {
        dimColor: true,
        children: [" ", "\xB7", " ", ee],
      });
      v[26] = ee;
      v[27] = ce;
    } else ce = v[27];
    if (v[28] !== ue || v[29] !== ce) {
      le = jsxProd_default_2(Text, {
        children: [ue, ce],
      });
      v[28] = ue;
      v[29] = ce;
      v[30] = le;
    } else le = v[30];
    M = Box;
    flexDirection = "column";
    marginX = 2;
    marginY = 1;
    gap = 1;
    let te = listHeight(isFullscreen);
    k = [];
    let Se = 0;
    for (const de of D) {
      if (Se + de.length > te && k.length > 0) {
        break;
      }
      k.push(de);
      Se = Se + de.length;
    }
    if (k.length === 1 && k[0].length > te) {
      let X = k[0].length - te;
      k[0] = `${truncateToLength(k[0], te)}\u2026 +${X} more characters \u2014 View in editor for the full text.`;
    }
    v[1] = isFullscreen;
    v[2] = section;
    v[3] = state.control;
    v[4] = state.enabled;
    v[5] = M;
    v[6] = b;
    v[7] = T;
    v[8] = E;
    v[9] = D;
    v[10] = k;
    v[11] = flexDirection;
    v[12] = marginX;
    v[13] = marginY;
    v[14] = gap;
    v[15] = color;
    v[16] = title;
    v[17] = le;
  } else {
    M = v[5];
    b = v[6];
    T = v[7];
    E = v[8];
    D = v[9];
    k = v[10];
    flexDirection = v[11];
    marginX = v[12];
    marginY = v[13];
    gap = v[14];
    color = v[15];
    title = v[16];
    le = v[17];
  }
  let Ve = D.length - k.length;
  let J;
  if (v[31] !== k || v[32] !== state.enabled) {
    J = k.map((Le, vt) =>
      jsxProd_default_2(
        Text,
        {
          dimColor: true,
          strikethrough: !state.enabled,
          wrap: "wrap-trim",
          children: ["- ", Le],
        },
        vt,
      ),
    );
    v[31] = k;
    v[32] = state.enabled;
    v[33] = J;
  } else J = v[33];
  let K;
  if (v[34] !== Ve) {
    K =
      Ve > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        italic: true,
        children: [
          "\u2026 +",
          Ve,
          " more ",
          Ve === 1 ? "rule" : "rules",
          " \u2014 run `claude auto-mode defaults` to print the full set.",
        ],
      });
    v[34] = Ve;
    v[35] = K;
  } else K = v[35];
  let ye;
  if (v[36] !== K || v[37] !== J) {
    ye = jsxProd_default_2(Fragment, {
      children: [J, K],
    });
    v[36] = K;
    v[37] = J;
    v[38] = ye;
  } else ye = v[38];
  const children = ye;
  let ee;
  if (
    v[39] !== M ||
    v[40] !== children ||
    v[41] !== flexDirection ||
    v[42] !== marginX ||
    v[43] !== marginY ||
    v[44] !== gap
  ) {
    ee = jsxProd_default(M, {
      flexDirection,
      marginX,
      marginY,
      gap,
      children,
    });
    v[39] = M;
    v[40] = children;
    v[41] = flexDirection;
    v[42] = marginX;
    v[43] = marginY;
    v[44] = gap;
    v[45] = ee;
  } else ee = v[45];
  let ce;
  if (v[46] !== state.control) {
    ce =
      state.control === "empty" &&
      jsxProd_default(Text, {
        italic: true,
        children: "This section has no configured rules, so the built-ins apply. Add a rule to customize it.",
      });
    v[46] = state.control;
    v[47] = ce;
  } else ce = v[47];
  let $e;
  if (v[48] !== state.control || v[49] !== state.enabled || v[50] !== state.source) {
    $e =
      state.control === "otherSource" &&
      jsxProd_default(Text, {
        italic: true,
        children: state.enabled
          ? `Kept on by ${describeRuleSource(state.source ?? "policySettings")} \u2014 it cannot be switched off here.`
          : `Replaced by rules from ${describeRuleSource(state.source ?? "policySettings")}. This control follows that configuration; add your own rules to customize the section.`,
      });
    v[48] = state.control;
    v[49] = state.enabled;
    v[50] = state.source;
    v[51] = $e;
  } else $e = v[51];
  let ze;
  if (v[52] !== T || v[53] !== state.enabled) {
    ze = T
      ? [
          {
            label: state.enabled
              ? "Disable built-in rules for this section"
              : "Enable built-in rules for this section",
            value: "toggle",
          },
        ]
      : [];
    v[52] = T;
    v[53] = state.enabled;
    v[54] = ze;
  } else ze = v[54];
  let Ge;
  let ot;
  if (v[55] === MEMO_CACHE_SENTINEL) {
    Ge = {
      label: `View in editor${getShortEditorName() ? ` (${getShortEditorName()})` : ""}`,
      value: "editor",
    };
    ot = {
      label: "Cancel",
      value: "cancel",
    };
    v[55] = Ge;
    v[56] = ot;
  } else {
    Ge = v[55];
    ot = v[56];
  }
  let options;
  if (v[57] !== ze) {
    options = [...ze, Ge, ot];
    v[57] = ze;
    v[58] = options;
  } else options = v[58];
  let onChange;
  if (v[59] !== c || v[60] !== onCancel || v[61] !== onToggle || v[62] !== D) {
    onChange = (je) => {
      if (je === "toggle") onToggle();
      else if (je === "editor")
        c(
          D.map(toBulletLine).join(`

`),
        );
      else onCancel();
    };
    v[59] = c;
    v[60] = onCancel;
    v[61] = onToggle;
    v[62] = D;
    v[63] = onChange;
  } else onChange = v[63];
  let bt;
  if (v[64] !== onCancel || v[65] !== options || v[66] !== onChange) {
    bt = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
    });
    v[64] = onCancel;
    v[65] = options;
    v[66] = onChange;
    v[67] = bt;
  } else bt = v[67];
  let Te;
  if (v[68] !== C) {
    Te =
      C !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: C,
      });
    v[68] = C;
    v[69] = Te;
  } else Te = v[69];
  let et;
  if (
    v[70] !== b ||
    v[71] !== ee ||
    v[72] !== ce ||
    v[73] !== $e ||
    v[74] !== bt ||
    v[75] !== Te ||
    v[76] !== color ||
    v[77] !== title ||
    v[78] !== le
  ) {
    et = jsxProd_default_2(b, {
      color,
      title,
      children: [le, ee, ce, $e, bt, Te],
    });
    v[70] = b;
    v[71] = ee;
    v[72] = ce;
    v[73] = $e;
    v[74] = bt;
    v[75] = Te;
    v[76] = color;
    v[77] = title;
    v[78] = le;
    v[79] = et;
  } else et = v[79];
  let rt;
  if (v[80] !== E || v[81] !== et) {
    rt = jsxProd_default_2(Fragment, {
      children: [et, E],
    });
    v[80] = E;
    v[81] = et;
    v[82] = rt;
  } else rt = v[82];
  return rt;
}
//@ chunk-p2qwpk2k.js:61446-62726 sole-consumer
/**
 * 删除 auto 模式规则的确认框；删除的是该分类最后一条用户规则时提示将只剩内置规则。
 */
function DeleteAutoModeRuleConfirm(props) {
  let g = w(19);
  let { entry, isLastInSection, onConfirm, onCancel } = props;
  let v;
  if (g[0] === MEMO_CACHE_SENTINEL) {
    v = {
      context: "Confirmation",
    };
    g[0] = v;
  } else v = g[0];
  useKeybinding("confirm:no", onCancel, v);
  let x;
  if (g[1] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Text, {
      bold: true,
      color: "error",
      children: "Delete auto mode rule?",
    });
    g[1] = x;
  } else x = g[1];
  let C;
  if (g[2] !== entry) {
    C = jsxProd_default(AutoModeRuleSummary, {
      entry,
    });
    g[2] = entry;
    g[3] = C;
  } else C = g[3];
  let c;
  if (g[4] !== entry || g[5] !== isLastInSection) {
    c =
      isLastInSection &&
      ` This is your last ${getAutoModeRuleCategoryLabel(entry.section).toLowerCase()} rule \u2014 without it, only the built-in rules apply for this section.`;
    g[4] = entry;
    g[5] = isLastInSection;
    g[6] = c;
  } else c = g[6];
  let M;
  if (g[7] !== c) {
    M = jsxProd_default_2(Text, {
      children: [
        "Are you sure you want to delete this rule? Auto mode stops applying it on your next request.",
        c,
      ],
    });
    g[7] = c;
    g[8] = M;
  } else M = g[8];
  let b;
  if (g[9] !== onCancel || g[10] !== onConfirm) {
    b = jsxProd_default(ConfirmSelect, {
      focus: "cancel",
      hideIndexes: true,
      onConfirm,
      onCancel,
    });
    g[9] = onCancel;
    g[10] = onConfirm;
    g[11] = b;
  } else b = g[11];
  let T;
  if (g[12] !== C || g[13] !== M || g[14] !== b) {
    T = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      borderStyle: "round",
      paddingLeft: 1,
      paddingRight: 1,
      borderColor: "error",
      children: [x, C, M, b],
    });
    g[12] = C;
    g[13] = M;
    g[14] = b;
    g[15] = T;
  } else T = g[15];
  let E;
  if (g[16] === MEMO_CACHE_SENTINEL) {
    E = jsxProd_default(Box, {
      marginLeft: 3,
      children: jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "confirm",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
            }),
          ],
        }),
      }),
    });
    g[16] = E;
  } else E = g[16];
  let D;
  if (g[17] !== T) {
    D = jsxProd_default_2(Fragment, {
      children: [T, E],
    });
    g[17] = T;
    g[18] = D;
  } else D = g[18];
  return D;
}
//@ chunk-p2qwpk2k.js:62726-62730 sole-consumer
init_react_production();
//@ chunk-p2qwpk2k.js:62895-62974 sole-consumer
function toRuleListOption(C) {
  return {
    label: getAutoModeRuleCategoryLabel(C),
    value: C,
    description: getAutoModeSectionDescription(C),
    dimDescription: true,
  };
}
//@ chunk-p2qwpk2k.js:62974-63040 sole-consumer
function normalizeCrlf($e) {
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
//@ chunk-p2qwpk2k.js:63040-63433 sole-consumer
/**
 * 返回 auto 模式规则分类（allow/soft_deny/hard_deny/environment）的说明文字。
 */
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
//@ chunk-p2qwpk2k.js:63433-64080 sole-consumer
/**
 * 把环境条目写入临时文件（O_EXCL|O_NOFOLLOW，0600）并用编辑器打开，返回编辑后的内容（统一换行）或问题描述。
 */
function editEnvironmentInEditor(h) {
  let i = sessionSidecarFilePath(`${AUTO_MODE_ENV_EDIT}${randomBytes(8).toString("hex")}.md`);
  if (i === null)
    return {
      content: null,
      problem: null,
    };
  try {
    mkdirSync(dirname(i), {
      recursive: true,
      mode: 448,
    });
    let a = openSync(
      i,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
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
  if (m.error !== undefined)
    return {
      content: null,
      problem: m.error,
    };
  if (m.content === null)
    return {
      content: null,
      problem: "the editor returned no content \u2014 reopen to try again.",
    };
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
//@ chunk-p2qwpk2k.js:64080-64569 sole-consumer
/**
 * "这是哪类规则？"选择对话框：列出规则分区选项，选择后回调 onPick，取消时回调 onCancel。
 */
function PickRuleSectionDialog(props) {
  let a = w(8);
  let { onCancel, onPick } = props;
  let f;
  if (a[0] === MEMO_CACHE_SENTINEL) {
    f = jsxProd_default(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children: "What kind of rule is this?",
      }),
    });
    a[0] = f;
  } else f = a[0];
  let options;
  if (a[1] === MEMO_CACHE_SENTINEL) {
    options = AUTO_MODE_RULE_SECTIONS.map(toRuleListOption);
    a[1] = options;
  } else options = a[1];
  let v;
  if (a[2] !== onCancel || a[3] !== onPick) {
    v = jsxProd_default(ModelSelector, {
      options,
      onChange: onPick,
      onCancel,
    });
    a[2] = onCancel;
    a[3] = onPick;
    a[4] = v;
  } else v = a[4];
  let x;
  if (a[5] !== onCancel || a[6] !== v) {
    x = jsxProd_default_2(Dialog, {
      title: "Add auto mode rule",
      onCancel,
      color: "permission",
      children: [f, v],
    });
    a[5] = onCancel;
    a[6] = v;
    a[7] = x;
  } else x = a[7];
  return x;
}
//@ chunk-p2qwpk2k.js:64569-66742 sole-consumer
/**
 * 添加/编辑 auto 模式规则的输入对话框：多行输入、校验失败显示错误、提示保存到用户设置。
 */
function AutoModeRuleInput(props) {
  let b = w(28);
  let { section, initialValue, onCancel, onSubmit } = props;
  let [g, v] = y(initialValue ?? "");
  let [x, C] = y(initialValue ? initialValue.length : 0);
  let [c, M] = y(null);
  let T;
  if (b[0] === MEMO_CACHE_SENTINEL) {
    T = {
      context: "Settings",
    };
    b[0] = T;
  } else T = b[0];
  useKeybinding("confirm:no", onCancel, T);
  let { columns } = useTerminalSize();
  let columns_2 = columns - 6;
  let k;
  if (b[1] !== onSubmit || b[2] !== section) {
    k = (V) => {
      let trimmed = V.trim();
      if (trimmed.length === 0) {
        return;
      }
      let B = validateRuleText(section, trimmed);
      if (B !== null) {
        M(B);
        return;
      }
      onSubmit(trimmed);
    };
    b[1] = onSubmit;
    b[2] = section;
    b[3] = k;
  } else k = b[3];
  let onSubmit_2 = k;
  let se = initialValue !== undefined;
  let children =
    section === "environment"
      ? "Deploys from this machine only reach the staging cluster."
      : "Database Writes: UPDATE statements against the local dev database.";
  let le;
  if (b[4] !== section) {
    le = getAutoModeRuleCategoryLabel(section).toLowerCase();
    b[4] = section;
    b[5] = le;
  } else le = b[5];
  const title = `${se ? "Edit" : "Add"} ${le} rule`;
  let K;
  if (b[6] === MEMO_CACHE_SENTINEL) {
    K = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "save",
    });
    b[6] = K;
  } else K = b[6];
  const chord = supportsShiftEnter() ? "shift+enter" : "ctrl+j";
  let inputGuide;
  if (b[7] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        K,
        jsxProd_default(KeyboardShortcutHint, {
          chord,
          action: "new line",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      ],
    });
    b[7] = inputGuide;
  } else inputGuide = b[7];
  let ee;
  if (b[8] === MEMO_CACHE_SENTINEL) {
    ee = jsxProd_default(Newline, {});
    b[8] = ee;
  } else ee = b[8];
  let ce;
  if (b[9] !== children) {
    ce = jsxProd_default_2(Text, {
      children: [
        "Write the rule as a plain sentence. A short label up front helps, e.g.,",
        ee,
        jsxProd_default(Text, {
          bold: true,
          children,
        }),
      ],
    });
    b[9] = children;
    b[10] = ce;
  } else ce = b[10];
  let onChange;
  if (b[11] === MEMO_CACHE_SENTINEL) {
    onChange = (Se) => {
      M(null);
      v(Se);
    };
    b[11] = onChange;
  } else onChange = b[11];
  let de;
  if (b[12] !== x || b[13] !== onSubmit_2 || b[14] !== g || b[15] !== columns_2) {
    de = jsxProd_default(Box, {
      borderDimColor: true,
      borderStyle: "round",
      marginY: 1,
      paddingLeft: 1,
      children: jsxProd_default(TextInput, {
        showCursor: true,
        focus: true,
        multiline: true,
        disableBackslashReturn: true,
        maxVisibleLines: 8,
        inputFilter: normalizeCrlf,
        value: g,
        onChange,
        onSubmit: onSubmit_2,
        placeholder: `Enter rule${figures_default.ellipsis}`,
        columns: columns_2,
        cursorOffset: x,
        onChangeCursorOffset: C,
      }),
    });
    b[12] = x;
    b[13] = onSubmit_2;
    b[14] = g;
    b[15] = columns_2;
    b[16] = de;
  } else de = b[16];
  let X;
  if (b[17] !== c) {
    X =
      c !== null &&
      jsxProd_default(Text, {
        color: "error",
        wrap: "wrap-trim",
        children: c,
      });
    b[17] = c;
    b[18] = X;
  } else X = b[18];
  let Ve;
  if (b[19] === MEMO_CACHE_SENTINEL) {
    Ve = jsxProd_default(Text, {
      dimColor: true,
      children: "Saved to your user settings file",
    });
    b[19] = Ve;
  } else Ve = b[19];
  let children_2;
  if (b[20] !== de || b[21] !== X || b[22] !== ce) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [ce, de, X, Ve],
    });
    b[20] = de;
    b[21] = X;
    b[22] = ce;
    b[23] = children_2;
  } else children_2 = b[23];
  let vt;
  if (b[24] !== onCancel || b[25] !== children_2 || b[26] !== title) {
    vt = jsxProd_default(Dialog, {
      title,
      onCancel,
      color: "permission",
      isCancelActive: false,
      inputGuide,
      children: children_2,
    });
    b[24] = onCancel;
    b[25] = children_2;
    b[26] = title;
    b[27] = vt;
  } else vt = b[27];
  return vt;
}
//@ chunk-p2qwpk2k.js:66742-66790 file-local
function selectToolPermissionContext(s) {
  return s.toolPermissionContext;
}
//@ chunk-p2qwpk2k.js:66790-66816 layout
function selectMode() {
  return classifyAutoModeRuleSource();
}
//@ chunk-p2qwpk2k.js:66816-66842 layout
function selectWorkspaceDirs() {
  return collectAutoModeRuleEntries();
}
//@ chunk-p2qwpk2k.js:66842-66875 layout
function ruleStringPair(Ju) {
  return [jsonStringify(Ju), Ju];
}
//@ chunk-p2qwpk2k.js:66875-66918 layout
function rulesBySourceMap(Fy) {
  return new Map(Fy.map(ruleStringPair));
}
//@ chunk-p2qwpk2k.js:66918-66955 layout
function ruleStringOf($y) {
  return $y.ruleString;
}
//@ chunk-p2qwpk2k.js:66955-66985 layout
function describeRule(By) {
  return consentRowLabel(By);
}
//@ chunk-p2qwpk2k.js:66985-67020 layout
function isDefined(_y) {
  return _y !== undefined;
}
//@ chunk-p2qwpk2k.js:67020-67069 fingerprint = _temp5 (1)
function isNotAddNewRule(opt) {
  return opt.value !== "add-new-rule";
}
//@ chunk-p2qwpk2k.js:67069-67101 file-local
function optionValue(opt) {
  return opt.value;
}
//@ chunk-p2qwpk2k.js:67101-67146 layout
function trimTrailingNewlines(Iy) {
  return Iy.replace(/\n+$/, "");
}
//@ chunk-p2qwpk2k.js:67146-67196 layout
function isNotEnvSection(Ny) {
  return Ny.section !== "environment";
}
//@ chunk-p2qwpk2k.js:67196-67408 fingerprint = RuleSourceText (1)
function RuleSourceText(props) {
  let $ = w(4);
  let { rule } = props;
  let t1;
  if ($[0] !== rule.source) {
    t1 = permissionRuleSourceDisplayString(rule.source);
    $[0] = rule.source;
    $[1] = t1;
  } else t1 = $[1];
  const children = `From ${t1}`;
  let t3;
  if ($[2] !== children) {
    t3 = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[2] = children;
    $[3] = t3;
  } else t3 = $[3];
  return t3;
}
//@ chunk-p2qwpk2k.js:67408-67469 layout
var INVISIBLE_CHAR_RE = /(?! )[\p{C}\p{Z}\p{Default_Ignorable_Code_Point}]/gu;
//@ chunk-p2qwpk2k.js:67469-67590 layout
function escapeAsUnicode(h) {
  return Array.from(
    {
      length: h.length,
    },
    (i, m) => `\\u${h.charCodeAt(m).toString(16).padStart(4, "0")}`,
  ).join("");
}
//@ chunk-p2qwpk2k.js:67590-68151 layout
/**
 * 生成"只批准这些精确命令/调用"的消息，列出 JSON 字符串化的命令，并说明不覆盖其他调用或附加选项（关沙箱、网络、后台）。
 */
function buildExactRetryGrantMessage(h, i) {
  let mapped = h.map((v) =>
    jsonStringify(v.command ?? v.rawInput ?? quotedReason(v, i).text).replace(
      INVISIBLE_CHAR_RE,
      escapeAsUnicode,
    ),
  );
  let a = h.every((v) => v.command !== undefined) ? "command" : "call";
  let f = h.length === 1;
  let g = f ? `this exact ${a}` : `these exact ${a}s`;
  return `Permission granted for ${g} only, ${f ? "as one whole string" : "each as one whole string"}: ${mapped.join(", ")}. This does not approve any other ${a}, any part of ${f ? "this one" : "these"}, or running ${f ? "it" : "them"} with added options such as turning off the sandbox, extra network access, or running in the background. You may now retry ${g} if you would like.`;
}
//@ chunk-p2qwpk2k.js:68151-68162 layout
var MAX_COMMAND_TEXT = 200;
//@ chunk-p2qwpk2k.js:68162-68257 layout
function ruleCommandTexts(h, i) {
  return h.map((m) =>
    truncateToWidth(
      replaceLineBreaks(displayField(m.command?.trim() ?? quotedReason(m, i).text.trim()).text),
      MAX_COMMAND_TEXT,
    ),
  );
}
//@ chunk-p2qwpk2k.js:68257-68321 layout
function quoteRuleIfBracketed(h) {
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
function RuleDetails(props) {
  let $ = w(37);
  let { rule, onDelete, onCancel } = props;
  let g;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    g = {
      context: "Confirmation",
    };
    $[0] = g;
  } else g = $[0];
  useKeybinding("confirm:no", onCancel, g);
  let children;
  if ($[1] !== rule.ruleValue) {
    children = consentRowLabel(formatPermissionRule(rule.ruleValue));
    $[1] = rule.ruleValue;
    $[2] = children;
  } else children = $[2];
  let t3;
  if ($[3] !== children) {
    t3 = jsxProd_default(Text, {
      bold: true,
      children,
    });
    $[3] = children;
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== rule.ruleValue) {
    t4 = jsxProd_default(PermissionRuleDescription, {
      ruleValue: rule.ruleValue,
    });
    $[5] = rule.ruleValue;
    $[6] = t4;
  } else t4 = $[6];
  let t5;
  if ($[7] !== rule) {
    t5 = jsxProd_default(RuleSourceText, {
      rule,
    });
    $[7] = rule;
    $[8] = t5;
  } else t5 = $[8];
  let t6;
  if ($[9] !== t3 || $[10] !== t4 || $[11] !== t5) {
    t6 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginX: 2,
      children: [t3, t4, t5],
    });
    $[9] = t3;
    $[10] = t4;
    $[11] = t5;
    $[12] = t6;
  } else t6 = $[12];
  let b = t6;
  let T;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default(Box, {
      marginLeft: 3,
      children: jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      }),
    });
    $[13] = T;
  } else T = $[13];
  let E = T;
  if (rule.source === "policySettings") {
    let D;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      D = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "This rule is configured by managed settings and cannot be modified.",
          `
`,
          "Contact your system administrator for more information.",
        ],
      });
      $[14] = D;
    } else D = $[14];
    let k;
    if ($[15] !== b) {
      k = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [b, D],
          }),
          E,
        ],
      });
      $[15] = b;
      $[16] = k;
    } else k = $[16];
    return k;
  }
  if (rule.source === "flagSettings" || rule.source === "command") {
    const D = rule.source === "flagSettings" ? "the --settings flag" : "a slash command";
    let k;
    if ($[17] !== D) {
      k = jsxProd_default_2(Text, {
        italic: true,
        children: ["This rule comes from a read-only source (", D, ") and cannot be modified here."],
      });
      $[17] = D;
      $[18] = k;
    } else k = $[18];
    let t11;
    if ($[19] !== b || $[20] !== k) {
      t11 = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [b, k],
          }),
          E,
        ],
      });
      $[19] = b;
      $[20] = k;
      $[21] = t11;
    } else t11 = $[21];
    return t11;
  }
  let t8;
  if ($[22] !== rule.ruleBehavior) {
    t8 = getRuleBehaviorLabel(rule.ruleBehavior);
    $[22] = rule.ruleBehavior;
    $[23] = t8;
  } else t8 = $[23];
  let t9;
  if ($[24] !== t8) {
    t9 = jsxProd_default_2(Text, {
      bold: true,
      color: "error",
      children: ["Delete ", t8, " tool?"],
    });
    $[24] = t8;
    $[25] = t9;
  } else t9 = $[25];
  let t10;
  if ($[26] === MEMO_CACHE_SENTINEL) {
    t10 = jsxProd_default(Text, {
      children: "Are you sure you want to delete this permission rule?",
    });
    $[26] = t10;
  } else t10 = $[26];
  let L;
  if ($[27] !== onCancel || $[28] !== onDelete) {
    L = jsxProd_default(ConfirmSelect, {
      focus: "cancel",
      hideIndexes: true,
      onConfirm: onDelete,
      onCancel,
    });
    $[27] = onCancel;
    $[28] = onDelete;
    $[29] = L;
  } else L = $[29];
  let B;
  if ($[30] !== b || $[31] !== L || $[32] !== t9) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      borderStyle: "round",
      paddingLeft: 1,
      paddingRight: 1,
      borderColor: "error",
      children: [t9, b, t10, L],
    });
    $[30] = b;
    $[31] = L;
    $[32] = t9;
    $[33] = B;
  } else B = $[33];
  let Y;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    Y = jsxProd_default(Box, {
      marginLeft: 3,
      children: jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "confirm",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: "cancel",
            }),
          ],
        }),
      }),
    });
    $[34] = Y;
  } else Y = $[34];
  let se;
  if ($[35] !== B) {
    se = jsxProd_default_2(Fragment, {
      children: [B, Y],
    });
    $[35] = B;
    $[36] = se;
  } else se = $[36];
  return se;
}
//@ chunk-p2qwpk2k.js:70911-72535 fingerprint = RulesTabContent (0.883)
function RulesTabContent(props) {
  let $ = w(37);
  let {
    options,
    searchQuery,
    isSearchMode,
    isFocused,
    onSelect,
    onCancel,
    lastFocusedRuleKey,
    cursorOffset,
    onHeaderFocusChange,
  } = props;
  let tabWidth = useTabsWidth();
  let { headerFocused, focusHeader, blurHeader } = useTabHeaderFocus();
  let D = R(null);
  let t0;
  let t1;
  if ($[0] !== blurHeader || $[1] !== headerFocused || $[2] !== isSearchMode) {
    t0 = () => {
      if (isSearchMode && headerFocused) blurHeader(D.current);
    };
    t1 = [isSearchMode, headerFocused, blurHeader];
    $[0] = blurHeader;
    $[1] = headerFocused;
    $[2] = isSearchMode;
    $[3] = t0;
    $[4] = t1;
  } else {
    t0 = $[3];
    t1 = $[4];
  }
  P(t0, t1);
  useFocusOnMount(D, isSearchMode);
  let B = headerFocused && !isSearchMode;
  let Y;
  let t3;
  if ($[5] !== B || $[6] !== onHeaderFocusChange) {
    Y = () => {
      onHeaderFocusChange(B);
    };
    t3 = [B, onHeaderFocusChange];
    $[5] = B;
    $[6] = onHeaderFocusChange;
    $[7] = Y;
    $[8] = t3;
  } else {
    Y = $[7];
    t3 = $[8];
  }
  P(Y, t3);
  const tabIndex = isSearchMode ? 0 : undefined;
  let onFocus;
  if ($[9] !== blurHeader || $[10] !== isSearchMode) {
    onFocus = isSearchMode ? () => blurHeader(D.current) : undefined;
    $[9] = blurHeader;
    $[10] = isSearchMode;
    $[11] = onFocus;
  } else onFocus = $[11];
  const isFocused_2 = isSearchMode && !headerFocused;
  let K;
  if (
    $[12] !== cursorOffset ||
    $[13] !== isFocused ||
    $[14] !== searchQuery ||
    $[15] !== isFocused_2 ||
    $[16] !== tabWidth
  ) {
    K = jsxProd_default(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: jsxProd_default(SearchBox, {
        query: searchQuery,
        isFocused: isFocused_2,
        isTerminalFocused: isFocused,
        width: tabWidth,
        cursorOffset,
      }),
    });
    $[12] = cursorOffset;
    $[13] = isFocused;
    $[14] = searchQuery;
    $[15] = isFocused_2;
    $[16] = tabWidth;
    $[17] = K;
  } else K = $[17];
  let onChange;
  if (
    $[18] !== blurHeader ||
    $[19] !== headerFocused ||
    $[20] !== onHeaderFocusChange ||
    $[21] !== onSelect
  ) {
    onChange = (ue) => {
      if (headerFocused) {
        blurHeader();
        onHeaderFocusChange(false);
      }
      onSelect(ue);
    };
    $[18] = blurHeader;
    $[19] = headerFocused;
    $[20] = onHeaderFocusChange;
    $[21] = onSelect;
    $[22] = onChange;
  } else onChange = $[22];
  const visibleOptionCount = Math.min(10, options.length);
  const isDisabled = isSearchMode || headerFocused;
  const pointerWhileDisabled = !isSearchMode;
  let Se;
  if (
    $[23] !== focusHeader ||
    $[24] !== lastFocusedRuleKey ||
    $[25] !== onCancel ||
    $[26] !== options ||
    $[27] !== isDisabled ||
    $[28] !== pointerWhileDisabled ||
    $[29] !== onChange ||
    $[30] !== visibleOptionCount
  ) {
    Se = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
      visibleOptionCount,
      isDisabled,
      hidePromptWhileDisabled: true,
      pointerWhileDisabled,
      defaultFocusValue: lastFocusedRuleKey,
      onUpFromFirstItem: focusHeader,
    });
    $[23] = focusHeader;
    $[24] = lastFocusedRuleKey;
    $[25] = onCancel;
    $[26] = options;
    $[27] = isDisabled;
    $[28] = pointerWhileDisabled;
    $[29] = onChange;
    $[30] = visibleOptionCount;
    $[31] = Se;
  } else Se = $[31];
  let t9;
  if ($[32] !== Se || $[33] !== tabIndex || $[34] !== onFocus || $[35] !== K) {
    t9 = jsxProd_default_2(Box, {
      ref: D,
      flexDirection: "column",
      tabIndex,
      onFocus,
      children: [K, Se],
    });
    $[32] = Se;
    $[33] = tabIndex;
    $[34] = onFocus;
    $[35] = K;
    $[36] = t9;
  } else t9 = $[36];
  return t9;
}
//@ chunk-p2qwpk2k.js:72535-73563 fingerprint = PermissionRulesTab (0.911)
function PermissionRulesTab(t0) {
  let $ = w(23);
  let m;
  let a;
  let f;
  let g;
  if ($[0] !== t0) {
    ({ tab: g, getRulesOptions: m, handleToolSelect: a, ...f } = t0);
    $[0] = t0;
    $[1] = m;
    $[2] = a;
    $[3] = f;
    $[4] = g;
  } else {
    m = $[1];
    a = $[2];
    f = $[3];
    g = $[4];
  }
  const flexShrink = g === "allow" ? 0 : undefined;
  let t8;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t8 = {
      allow: "Claude Code won't ask before using allowed tools.",
      ask: "Claude Code will always ask for confirmation before using these tools.",
      deny: "Claude Code will always reject requests to use denied tools.",
    };
    $[5] = t8;
  } else t8 = $[5];
  const children = t8[g];
  let c;
  if ($[6] !== children) {
    c = jsxProd_default(Text, {
      children,
    });
    $[6] = children;
    $[7] = c;
  } else c = $[7];
  let M;
  if ($[8] !== m || $[9] !== f.searchQuery || $[10] !== g) {
    M = m(g, f.searchQuery);
    $[8] = m;
    $[9] = f.searchQuery;
    $[10] = g;
    $[11] = M;
  } else M = $[11];
  let onSelect;
  if ($[12] !== a || $[13] !== g) {
    onSelect = (v) => a(v, g);
    $[12] = a;
    $[13] = g;
    $[14] = onSelect;
  } else onSelect = $[14];
  let E;
  if ($[15] !== f || $[16] !== M.options || $[17] !== onSelect) {
    E = jsxProd_default(RulesTabContent, {
      options: M.options,
      onSelect,
      ...f,
    });
    $[15] = f;
    $[16] = M.options;
    $[17] = onSelect;
    $[18] = E;
  } else E = $[18];
  let t7;
  if ($[19] !== flexShrink || $[20] !== c || $[21] !== E) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink,
      children: [c, E],
    });
    $[19] = flexShrink;
    $[20] = c;
    $[21] = E;
    $[22] = t7;
  } else t7 = $[22];
  return t7;
}
//@ chunk-p2qwpk2k.js:73563-93185 fingerprint = PermissionRuleList (0.52)
/**
 * /permissions 界面：Recent（auto 模式拦截）/Allow/Ask/Deny/Workspace 标签，规则按来源显示，可查看详情、删除（policySettings 不可删）、新增规则与目录。
 */
function PermissionRuleList(props) {
  let $ = w(241);
  let { onExit, initialTab, onRetryDenials, isMidTurn } = props;
  let { storageV5 } = useTheme_2();
  let { getDenials, removeDenial } = statusSnapshot();
  let C = statusRowTexts();
  let M;
  if ($[0] !== getDenials) {
    M = getDenials();
    $[0] = getDenials;
    $[1] = M;
  } else M = $[1];
  let b = M.length > 0;
  let T = initialTab ?? (b ? "recent" : "allow");
  let [E, D] = y(T);
  let k;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    k = [];
    $[2] = k;
  } else k = $[2];
  let [V, L] = y(k);
  let toolPermissionContext = useAppState(selectToolPermissionContext);
  let setAppState = useSetAppState();
  let isTerminalFocused = useTerminalFocus();
  let [Re] = useTheme();
  let le = R(false);
  let J;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    J = {
      approved: new Set(),
      retry: new Set(),
      denials: [],
      canMark: true,
    };
    $[3] = J;
  } else J = $[3];
  let denialStateRef = R(J);
  let [ye, ue] = y();
  let [ee, ce] = y(true);
  let te;
  if ($[4] !== isMidTurn) {
    te = (s_0) => {
      denialStateRef.current = s_0;
      ue(
        s_0.retry.size > 0
          ? isMidTurn
            ? "Esc to tell Claude next prompt"
            : `Esc to retry ${s_0.retry.size} blocked`
          : s_0.approved.size > 0
            ? `Esc to approve ${s_0.approved.size} blocked`
            : undefined,
      );
      ce(s_0.canMark);
    };
    $[4] = isMidTurn;
    $[5] = te;
  } else te = $[5];
  let de = te;
  let [X, Ve] = y();
  let [lastFocusedRuleKey, setLastFocusedRuleKey] = y();
  let [addingRuleToTab, setAddingRuleToTab] = y(null);
  let [validatedRule, setValidatedRule] = y(null);
  let [isAddingWorkspaceDirectory, setIsAddingWorkspaceDirectory] = y(false);
  let [removingDirectory, setRemovingDirectory] = y(null);
  let [isSearchMode, setIsSearchMode] = y(false);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let no;
  if ($[6] !== columns || $[7] !== rows) {
    no = {
      rows,
      columns,
    };
    $[6] = columns;
    $[7] = rows;
    $[8] = no;
  } else no = $[8];
  let Ht = R(no);
  let ko;
  if ($[9] !== columns || $[10] !== de || $[11] !== isScreenReaderEnabled || $[12] !== rows) {
    ko = () => {
      let fr = rows < Ht.current.rows || columns < Ht.current.columns;
      Ht.current = {
        rows,
        columns,
      };
      if (fr && !isScreenReaderEnabled)
        de({
          ...denialStateRef.current,
          approved: new Set(),
          retry: new Set(),
        });
    };
    $[9] = columns;
    $[10] = de;
    $[11] = isScreenReaderEnabled;
    $[12] = rows;
    $[13] = ko;
  } else ko = $[13];
  zt(ko);
  let [Do, Ut] = y();
  let [W, N] = y(selectMode);
  let [ae, ge] = y(selectWorkspaceDirs);
  let [ke, me] = y(null);
  let [Wt, yr] = y(!b);
  let gr;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    gr = (focused) => {
      yr(focused);
    };
    $[14] = gr;
  } else gr = $[14];
  let handleHeaderFocusChange = gr;
  let rn = rulesBySourceMap;
  let allow;
  if ($[15] !== toolPermissionContext) {
    allow = rn(getAllowRules(toolPermissionContext));
    $[15] = toolPermissionContext;
    $[16] = allow;
  } else allow = $[16];
  let deny;
  if ($[17] !== toolPermissionContext) {
    deny = rn(getDenyRules(toolPermissionContext));
    $[17] = toolPermissionContext;
    $[18] = deny;
  } else deny = $[18];
  let ask;
  if ($[19] !== toolPermissionContext) {
    ask = rn(getAskRules(toolPermissionContext));
    $[19] = toolPermissionContext;
    $[20] = ask;
  } else ask = $[20];
  let br;
  if ($[21] !== ask || $[22] !== allow || $[23] !== deny) {
    br = {
      allow,
      deny,
      ask,
    };
    $[21] = ask;
    $[22] = allow;
    $[23] = deny;
    $[24] = br;
  } else br = $[24];
  let Cr = br;
  let wr;
  if ($[25] !== Cr) {
    wr = (tab, t7) => {
      let query = t7 === undefined ? "" : t7;
      let rulesByKey = tab === "allow" || tab === "deny" || tab === "ask" ? Cr[tab] : new Map();
      let options = [];
      if (tab !== "workspace" && tab !== "recent" && tab !== "automode" && !query)
        options.push({
          label: `Add a new rule${figures_default.ellipsis}`,
          value: "add-new-rule",
        });
      let sortedRuleKeys = Array.from(rulesByKey.keys()).sort((Su, ln) => {
        let ruleA = rulesByKey.get(Su);
        let ruleB = rulesByKey.get(ln);
        if (ruleA && ruleB) {
          let ruleAString = formatPermissionRule(ruleA.ruleValue).toLowerCase();
          let ruleBString = formatPermissionRule(ruleB.ruleValue).toLowerCase();
          return ruleAString.localeCompare(ruleBString);
        }
        return 0;
      });
      let lowerQuery = query.toLowerCase();
      let lo = [];
      for (const ruleKey of sortedRuleKeys) {
        let rule = rulesByKey.get(ruleKey);
        if (rule) {
          let ruleString = formatPermissionRule(rule.ruleValue);
          if (query && !ruleString.toLowerCase().includes(lowerQuery)) {
            continue;
          }
          lo.push({
            ruleKey,
            ruleString,
          });
        }
      }
      let xr = uniqueLabels(lo.map(ruleStringOf), describeRule);
      for (const [Ar, Mr] of lo.entries())
        options.push({
          label: xr[Ar],
          value: Mr.ruleKey,
        });
      return {
        options,
        rulesByKey,
      };
    };
    $[25] = Cr;
    $[26] = wr;
  } else wr = $[26];
  let st = wr;
  let Bt =
    !X && !addingRuleToTab && !validatedRule && !isAddingWorkspaceDirectory && !removingDirectory && !ke;
  const isActive = Bt && isSearchMode;
  let onExit_2;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    onExit_2 = () => {
      setIsSearchMode(false);
    };
    $[27] = onExit_2;
  } else onExit_2 = $[27];
  let Er;
  if ($[28] !== isActive) {
    Er = {
      isActive,
      onExit: onExit_2,
    };
    $[28] = isActive;
    $[29] = Er;
  } else Er = $[29];
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput(Er);
  let Bi;
  if (
    $[30] !== isSearchMode ||
    $[31] !== Bt ||
    $[32] !== handleKeyDown ||
    $[33] !== E ||
    $[34] !== setSearchQuery
  ) {
    Bi = (e) => {
      if (!Bt) {
        return;
      }
      if (isSearchMode) {
        handleKeyDown(e);
        return;
      }
      if (e.ctrl || e.meta) {
        return;
      }
      if (E === "recent" || E === "workspace") {
        return;
      }
      if (e.key === "/") {
        e.preventDefault();
        setIsSearchMode(true);
        setSearchQuery("");
      } else if (
        !e.defaultPrevented &&
        e.key.length === 1 &&
        e.key !== "j" &&
        e.key !== "k" &&
        e.key !== "m" &&
        e.key !== "i" &&
        e.key !== "r" &&
        e.key !== " "
      ) {
        e.preventDefault();
        setIsSearchMode(true);
        setSearchQuery(e.key);
      }
    };
    $[30] = isSearchMode;
    $[31] = Bt;
    $[32] = handleKeyDown;
    $[33] = E;
    $[34] = setSearchQuery;
    $[35] = Bi;
  } else Bi = $[35];
  let onKeyDown = Bi;
  let mo;
  if ($[36] !== st) {
    mo = (selectedValue, tab) => {
      let { rulesByKey } = st(tab);
      if (selectedValue === "add-new-rule") {
        setAddingRuleToTab(tab);
        return;
      } else {
        Ve(rulesByKey.get(selectedValue));
        return;
      }
    };
    $[36] = st;
    $[37] = mo;
  } else mo = $[37];
  let handleToolSelect = mo;
  let Vi;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    Vi = () => {
      setAddingRuleToTab(null);
    };
    $[38] = Vi;
  } else Vi = $[38];
  let onCancel = Vi;
  let Mu;
  if ($[39] === MEMO_CACHE_SENTINEL) {
    Mu = (ruleValue, ruleBehavior) => {
      setValidatedRule({
        ruleValue,
        ruleBehavior,
      });
      setAddingRuleToTab(null);
    };
    $[39] = Mu;
  } else Mu = $[39];
  let onSubmit = Mu;
  let Eu;
  if ($[40] !== Re) {
    Eu = (rules, unreachable) => {
      setValidatedRule(null);
      for (const rule of rules)
        L((prev) => [
          ...prev,
          `Added ${rule.ruleBehavior} rule ${sequential.bold(consentRowLabel(formatPermissionRule(rule.ruleValue)))}`,
        ]);
      for (const Or of unreachable) {
        let severity = Or.shadowType === "deny" ? "blocked" : "shadowed";
        L((prev) => [
          ...prev,
          color(
            "warning",
            Re,
          )(
            `${figures_default.warning} Warning: ${consentRowLabel(formatPermissionRule(Or.rule.ruleValue))} is ${severity}`,
          ),
          sequential.dim(`  ${Or.reason}`),
          sequential.dim(`  Fix: ${Or.fix}`),
        ]);
      }
    };
    $[40] = Re;
    $[41] = Eu;
  } else Eu = $[41];
  let onAddRules = Eu;
  let ku;
  if ($[42] === MEMO_CACHE_SENTINEL) {
    ku = () => {
      setValidatedRule(null);
    };
    $[42] = ku;
  } else ku = $[42];
  let onCancel_2 = ku;
  let Du;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    Du = () => setIsAddingWorkspaceDirectory(true);
    $[43] = Du;
  } else Du = $[43];
  let onRequestAddDirectory = Du;
  let Pu;
  if ($[44] === MEMO_CACHE_SENTINEL) {
    Pu = (path) => setRemovingDirectory(path);
    $[44] = Pu;
  } else Pu = $[44];
  let onRequestRemoveDirectory = Pu;
  let Ou;
  if ($[45] !== V || $[46] !== onExit || $[47] !== onRetryDenials || $[48] !== removeDenial || $[49] !== C) {
    Ou = () => {
      if (le.current) {
        return;
      }
      le.current = true;
      let s_1 = denialStateRef.current;
      let denialsFor = (set) =>
        Array.from(set)
          .map((idx) => s_1.denials[idx])
          .filter(isDefined);
      let retryDenials = denialsFor(s_1.retry);
      if (retryDenials.length > 0) {
        onRetryDenials(ruleCommandTexts(retryDenials, C), V);
        onExit(undefined, {
          shouldQuery: true,
          metaMessages: [buildExactRetryGrantMessage(retryDenials, C)],
          metaMessagesOrigin: {
            kind: "auto-continuation",
          },
        });
        return;
      }
      let approvedDenials = denialsFor(s_1.approved);
      if (approvedDenials.length > 0 || V.length > 0) {
        for (const approvedDenial of approvedDenials) removeDenial(approvedDenial);
        if (approvedDenials.length > 0) onRetryDenials(ruleCommandTexts(approvedDenials, C), []);
        onExit(
          V.join(`
`),
          approvedDenials.length > 0
            ? {
                metaMessages: [buildExactRetryGrantMessage(approvedDenials, C)],
                metaMessagesOrigin: {
                  kind: "auto-continuation",
                },
              }
            : undefined,
        );
      } else
        onExit("Permissions dialog dismissed", {
          display: "system",
        });
    };
    $[45] = V;
    $[46] = onExit;
    $[47] = onRetryDenials;
    $[48] = removeDenial;
    $[49] = C;
    $[50] = Ou;
  } else Ou = $[50];
  let Ct = Ou;
  const isActive_2 = Bt && !isSearchMode;
  let $u;
  if ($[51] !== isActive_2) {
    $u = {
      context: "Settings",
      isActive: isActive_2,
    };
    $[51] = isActive_2;
    $[52] = $u;
  } else $u = $[52];
  useKeybinding("confirm:no", Ct, $u);
  let Bu;
  if ($[53] !== V || $[54] !== onExit) {
    Bu = () => {
      if (le.current) {
        return;
      }
      le.current = true;
      if (V.length > 0) {
        onExit(
          V.join(`
`),
        );
        return;
      }
      onExit("Permissions dialog dismissed", {
        display: "system",
      });
    };
    $[53] = V;
    $[54] = onExit;
    $[55] = Bu;
  } else Bu = $[55];
  let globalExitKeybindings = useGlobalExitKeybindings(Bu, undefined, Bt);
  let _u;
  if (
    $[56] !== st ||
    $[57] !== X ||
    $[58] !== setAppState ||
    $[59] !== storageV5 ||
    $[60] !== toolPermissionContext
  ) {
    _u = () => {
      if (!X) {
        return;
      }
      let { options } = st(X.ruleBehavior);
      let selectedKey = jsonStringify(X);
      let ruleKeys = options.filter(isNotAddNewRule).map(optionValue);
      let currentIndex = ruleKeys.indexOf(selectedKey);
      let nextFocusKey;
      if (currentIndex !== -1) {
        if (currentIndex < ruleKeys.length - 1) nextFocusKey = ruleKeys[currentIndex + 1];
        else if (currentIndex > 0) nextFocusKey = ruleKeys[currentIndex - 1];
      }
      setLastFocusedRuleKey(nextFocusKey);
      let ji = consentRowLabel(formatPermissionRule(X.ruleValue));
      let ruleBehavior = X.ruleBehavior;
      let Lu = quoteRuleIfBracketed(ji);
      deletePermissionRule({
        rule: X,
        initialContext: toolPermissionContext,
        setToolPermissionContext(toolPermissionContext) {
          setAppState((prev) => ({
            ...prev,
            toolPermissionContext,
          }));
        },
        storageV5,
      })
        .then(() => {
          L((prev) => [...prev, `Deleted ${ruleBehavior} rule ${sequential.bold(ji)}`]);
          announce(`[Deleted ${ruleBehavior} rule ${Lu}]`);
        })
        .catch((error) => {
          logError(error);
          L((prev) => [...prev, `Could not delete ${sequential.bold(ji)} \u2014 the rule is unchanged`]);
          announce(`[Could not delete ${Lu} \u2014 the rule is unchanged]`);
        });
      Ve(undefined);
    };
    $[56] = st;
    $[57] = X;
    $[58] = setAppState;
    $[59] = storageV5;
    $[60] = toolPermissionContext;
    $[61] = _u;
  } else _u = $[61];
  let onDelete = _u;
  let Nu;
  if ($[62] !== storageV5) {
    Nu = (Lo, po) => {
      if (resolveEditorCommand() === undefined) {
        me({
          mode: "env-problem",
          problem:
            "No editor is configured \u2014 set $VISUAL or $EDITOR, then reopen /permissions to edit the environment.",
          draftLines: Lo,
          expected: po,
          canReopen: false,
        });
        return;
      }
      let ho = editEnvironmentInEditor(Lo);
      if (ho.problem !== null) {
        me({
          mode: "env-problem",
          problem: ho.problem,
          draftLines: Lo,
          expected: po,
          canReopen: true,
        });
        return;
      }
      if (ho.content === null) {
        me({
          mode: "env-problem",
          problem:
            "The environment could not be opened for editing: this session has no session directory to hold the working file. Edit autoMode.environment in your settings file directly.",
          draftLines: Lo,
          expected: po,
          canReopen: false,
        });
        return;
      }
      let Hu = trimTrailingNewlines;
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
          canReopen: true,
        });
        return;
      }
      let Uu = ruleTextProblem(ho.content);
      if (Uu !== null) {
        me({
          mode: "env-problem",
          problem: Uu,
          draftLines: ho.content.split(`
`),
          expected: po,
          canReopen: true,
        });
        return;
      }
      saveEnvironmentDocument(
        ho.content.split(`
`),
        po,
        storageV5,
      )
        .then(() => {
          ge(collectAutoModeRuleEntries());
          N(classifyAutoModeRuleSource());
          L((dy) => [
            ...dy,
            po.length === 0
              ? "Replaced the built-in auto mode environment with your own document"
              : "Saved your auto mode environment document",
          ]);
        })
        .catch((error) => {
          logForDebugging(`auto mode env save failed: ${String(error)}`, {
            level: "error",
          });
          ge(collectAutoModeRuleEntries());
          N(classifyAutoModeRuleSource());
          L((cy) => [
            ...cy,
            `Could not save the environment \u2014 ${error instanceof Error ? error.message : "nothing was changed"}`,
          ]);
        });
      me(null);
    };
    $[62] = storageV5;
    $[63] = Nu;
  } else Nu = $[63];
  let _t = Nu;
  let Wu;
  if ($[64] !== _t) {
    Wu = () => {
      let userEnvironmentEntries = readUserEnvironmentEntries();
      if (userEnvironmentEntries.length === 0 && classifyAutoModeRuleSource().environment.enabled)
        me({
          mode: "env-first-confirm",
        });
      else _t(userEnvironmentEntries, userEnvironmentEntries);
    };
    $[64] = _t;
    $[65] = Wu;
  } else Wu = $[65];
  let Io = Wu;
  if (ke?.mode === "pick-section") {
    let onCancel;
    if ($[66] === MEMO_CACHE_SENTINEL) {
      onCancel = () => me(null);
      $[66] = onCancel;
    } else onCancel = $[66];
    let U;
    if ($[67] !== Io) {
      U = jsxProd_default(PickRuleSectionDialog, {
        onCancel,
        onPick: (Ku) => {
          if (Ku === "environment" && alwaysTrueFlag()) {
            Io();
            return;
          }
          me({
            mode: "input",
            section: Ku,
          });
        },
      });
      $[67] = Io;
      $[68] = U;
    } else U = $[68];
    return U;
  }
  if (ke?.mode === "env-first-confirm") {
    let onCancel;
    let U;
    if ($[69] === MEMO_CACHE_SENTINEL) {
      onCancel = () => me(null);
      U = jsxProd_default(Text, {
        wrap: "wrap-trim",
        children:
          "Writing your own environment replaces the built-in default document \u2014 the auto mode context that defines trusted hosts, sensitive targets, and repository scope. The editor starts from the full default text so you can edit rather than rewrite; deleting all your environment entries later restores the default.",
      });
      $[69] = onCancel;
      $[70] = U;
    } else {
      onCancel = $[69];
      U = $[70];
    }
    let onConfirm;
    if ($[71] !== _t) {
      onConfirm = () => _t(getDefaultExternalAutoModeRules().environment ?? [], []);
      $[71] = _t;
      $[72] = onConfirm;
    } else onConfirm = $[72];
    let onCancel_2;
    if ($[73] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => me(null);
      $[73] = onCancel_2;
    } else onCancel_2 = $[73];
    let Oe;
    if ($[74] !== onConfirm) {
      Oe = jsxProd_default_2(Dialog, {
        title: "Replace the built-in environment?",
        color: "permission",
        onCancel,
        children: [
          U,
          jsxProd_default(ConfirmSelect, {
            focus: "cancel",
            hideIndexes: true,
            onConfirm,
            onCancel: onCancel_2,
          }),
        ],
      });
      $[74] = onConfirm;
      $[75] = Oe;
    } else Oe = $[75];
    return Oe;
  }
  if (ke?.mode === "env-problem") {
    let { problem, draftLines, expected, canReopen } = ke;
    let onCancel;
    if ($[76] === MEMO_CACHE_SENTINEL) {
      onCancel = () => me(null);
      $[76] = onCancel;
    } else onCancel = $[76];
    let U;
    if ($[77] !== problem) {
      U = jsxProd_default(Text, {
        color: "error",
        wrap: "wrap-trim",
        children: problem,
      });
      $[77] = problem;
      $[78] = U;
    } else U = $[78];
    let z;
    if ($[79] !== canReopen) {
      z = canReopen
        ? [
            {
              label: `Reopen in ${getShortEditorName() ?? "your editor"}`,
              value: "reopen",
            },
          ]
        : [];
      $[79] = canReopen;
      $[80] = z;
    } else z = $[80];
    let ve;
    if ($[81] === MEMO_CACHE_SENTINEL) {
      ve = {
        label: "Cancel",
        value: "cancel",
      };
      $[81] = ve;
    } else ve = $[81];
    let options;
    if ($[82] !== z) {
      options = [...z, ve];
      $[82] = z;
      $[83] = options;
    } else options = $[83];
    let onChange;
    if ($[84] !== draftLines || $[85] !== expected || $[86] !== _t) {
      onChange = (toolPermissionContext_1) => {
        if (toolPermissionContext_1 === "reopen") _t(draftLines, expected);
        else me(null);
      };
      $[84] = draftLines;
      $[85] = expected;
      $[86] = _t;
      $[87] = onChange;
    } else onChange = $[87];
    let onCancel_2;
    if ($[88] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => me(null);
      $[88] = onCancel_2;
    } else onCancel_2 = $[88];
    let go;
    if ($[89] !== options || $[90] !== onChange) {
      go = jsxProd_default(ModelSelector, {
        options,
        onChange,
        onCancel: onCancel_2,
      });
      $[89] = options;
      $[90] = onChange;
      $[91] = go;
    } else go = $[91];
    let vo;
    if ($[92] !== U || $[93] !== go) {
      vo = jsxProd_default_2(Dialog, {
        title: "Edit environment",
        color: "permission",
        onCancel,
        children: [U, go],
      });
      $[92] = U;
      $[93] = go;
      $[94] = vo;
    } else vo = $[94];
    return vo;
  }
  if (ke?.mode === "input") {
    let { section, editing } = ke;
    let I;
    if ($[95] !== section) {
      I = getAutoModeRuleCategoryLabel(section).toLowerCase();
      $[95] = section;
      $[96] = I;
    } else I = $[96];
    let $r = I;
    const initialValue = editing?.text;
    let onCancel;
    if ($[97] !== editing) {
      onCancel = () =>
        me(
          editing
            ? {
                mode: "details",
                entry: editing,
              }
            : null,
        );
      $[97] = editing;
      $[98] = onCancel;
    } else onCancel = $[98];
    let onSubmit;
    if ($[99] !== editing || $[100] !== $r || $[101] !== section || $[102] !== storageV5) {
      onSubmit = (prev_3) => {
        let No = normalizeRuleText(prev_3);
        if (editing && No === editing.text) {
          me(null);
          return;
        }
        if (editing)
          updateAutoModeRule(section, editing.index, editing.text, No, storageV5)
            .then(() => {
              ge(collectAutoModeRuleEntries());
              N(classifyAutoModeRuleSource());
              L((fy) => [
                ...fy,
                `Updated auto mode ${$r} rule ${sequential.bold(replaceLineBreaks(displayField(No).text))}`,
              ]);
            })
            .catch((error) => {
              logForDebugging(`auto mode rule update failed: ${String(error)}`, {
                level: "error",
              });
              ge(collectAutoModeRuleEntries());
              N(classifyAutoModeRuleSource());
              L((hy) => [
                ...hy,
                `Could not update ${sequential.bold(replaceLineBreaks(displayField(editing.text).text))} \u2014 ${error instanceof Error ? error.message : "the rule is unchanged"}`,
              ]);
            });
        else
          addAutoModeRule(section, No, storageV5)
            .then(() => {
              ge(collectAutoModeRuleEntries());
              N(classifyAutoModeRuleSource());
              L((yy) => [
                ...yy,
                `Added auto mode ${$r} rule ${sequential.bold(replaceLineBreaks(displayField(No).text))}`,
              ]);
            })
            .catch((error) => {
              logForDebugging(`auto mode rule add failed: ${String(error)}`, {
                level: "error",
              });
              ge(collectAutoModeRuleEntries());
              N(classifyAutoModeRuleSource());
              L((gy) => [
                ...gy,
                `Could not add ${sequential.bold(replaceLineBreaks(displayField(No).text))} \u2014 ${error instanceof Error ? error.message : "nothing was saved"}`,
              ]);
            });
        me(null);
      };
      $[99] = editing;
      $[100] = $r;
      $[101] = section;
      $[102] = storageV5;
      $[103] = onSubmit;
    } else onSubmit = $[103];
    let Oe;
    if ($[104] !== section || $[105] !== initialValue || $[106] !== onCancel || $[107] !== onSubmit) {
      Oe = jsxProd_default(AutoModeRuleInput, {
        section,
        initialValue,
        onCancel,
        onSubmit,
      });
      $[104] = section;
      $[105] = initialValue;
      $[106] = onCancel;
      $[107] = onSubmit;
      $[108] = Oe;
    } else Oe = $[108];
    return Oe;
  }
  if (ke?.mode === "builtins") {
    let section = ke.section;
    let Ho = W[section];
    let onToggle;
    if ($[109] !== section || $[110] !== Ho.enabled || $[111] !== storageV5) {
      onToggle = () => {
        let ol = !Ho.enabled;
        AUTO_MODE_RULE_EDIT_ERRORS(section, ol, storageV5)
          .then(() => {
            ge(collectAutoModeRuleEntries());
            N(classifyAutoModeRuleSource());
            L((vy) => [
              ...vy,
              `${ol ? "Enabled" : "Disabled"} the built-in auto mode ${getAutoModeRuleCategoryLabel(section).toLowerCase()} rules`,
            ]);
          })
          .catch((error) => {
            logForDebugging(`auto mode builtins toggle failed: ${String(error)}`, {
              level: "error",
            });
            ge(collectAutoModeRuleEntries());
            N(classifyAutoModeRuleSource());
            L((by) => [
              ...by,
              `Could not ${ol ? "enable" : "disable"} the built-in ${getAutoModeRuleCategoryLabel(section).toLowerCase()} rules \u2014 ${error instanceof Error ? error.message : "nothing was changed"}`,
            ]);
          });
        me(null);
      };
      $[109] = section;
      $[110] = Ho.enabled;
      $[111] = storageV5;
      $[112] = onToggle;
    } else onToggle = $[112];
    let onCancel;
    if ($[113] === MEMO_CACHE_SENTINEL) {
      onCancel = () => me(null);
      $[113] = onCancel;
    } else onCancel = $[113];
    let z;
    if ($[114] !== section || $[115] !== Ho || $[116] !== onToggle) {
      z = jsxProd_default(BuiltinRulesSection, {
        section,
        state: Ho,
        onToggle,
        onCancel,
      });
      $[114] = section;
      $[115] = Ho;
      $[116] = onToggle;
      $[117] = z;
    } else z = $[117];
    return z;
  }
  if (ke?.mode === "details") {
    let { entry } = ke;
    let onEdit;
    let onDelete;
    if ($[118] !== entry) {
      onEdit = () => {
        me({
          mode: "input",
          section: entry.section,
          editing: entry,
        });
      };
      onDelete = () =>
        me({
          mode: "delete",
          entry,
        });
      $[118] = entry;
      $[119] = onEdit;
      $[120] = onDelete;
    } else {
      onEdit = $[119];
      onDelete = $[120];
    }
    let onCancel;
    if ($[121] === MEMO_CACHE_SENTINEL) {
      onCancel = () => me(null);
      $[121] = onCancel;
    } else onCancel = $[121];
    let ve;
    if ($[122] !== entry || $[123] !== onEdit || $[124] !== onDelete) {
      ve = jsxProd_default(AutoModeRuleDetails, {
        entry,
        onEdit,
        onDelete,
        onCancel,
      });
      $[122] = entry;
      $[123] = onEdit;
      $[124] = onDelete;
      $[125] = ve;
    } else ve = $[125];
    return ve;
  }
  if (ke?.mode === "delete") {
    let { entry } = ke;
    let I;
    if ($[126] !== entry.section) {
      I = (rl) => rl.section === entry.section && !(rl.structure && rl.source === "userSettings");
      $[126] = entry.section;
      $[127] = I;
    } else I = $[127];
    let U;
    if ($[128] !== ae || $[129] !== I) {
      U = count(ae, I);
      $[128] = ae;
      $[129] = I;
      $[130] = U;
    } else U = $[130];
    const isLastInSection = U === 1;
    let onConfirm;
    if ($[131] !== ae || $[132] !== entry || $[133] !== storageV5) {
      onConfirm = () => {
        let index = sortRuleEntries(ae).indexOf(entry);
        deleteAutoModeRule(entry.section, entry.index, entry.text, storageV5)
          .then(() => {
            let autoModeRuleEntries = collectAutoModeRuleEntries();
            ge(autoModeRuleEntries);
            N(classifyAutoModeRuleSource());
            let wy = alwaysTrueFlag() ? autoModeRuleEntries.filter(isNotEnvSection) : autoModeRuleEntries;
            let zu = sortRuleEntries(wy);
            let ju = zu[Math.min(Math.max(index, 0), zu.length - 1)];
            Ut(ju ? ruleKey(ju) : undefined);
            L((Ry) => [
              ...Ry,
              `Deleted auto mode ${getAutoModeRuleCategoryLabel(entry.section).toLowerCase()} rule ${sequential.bold(replaceLineBreaks(displayField(entry.text).text))}`,
            ]);
          })
          .catch((error) => {
            logForDebugging(`auto mode rule delete failed: ${String(error)}`, {
              level: "error",
            });
            ge(collectAutoModeRuleEntries());
            N(classifyAutoModeRuleSource());
            L((Sy) => [
              ...Sy,
              `Could not delete ${sequential.bold(replaceLineBreaks(displayField(entry.text).text))} \u2014 ${error instanceof Error ? error.message : "the rule is unchanged"}`,
            ]);
          });
        me(null);
      };
      $[131] = ae;
      $[132] = entry;
      $[133] = storageV5;
      $[134] = onConfirm;
    } else onConfirm = $[134];
    let onCancel;
    if ($[135] !== entry) {
      onCancel = () =>
        me({
          mode: "details",
          entry,
        });
      $[135] = entry;
      $[136] = onCancel;
    } else onCancel = $[136];
    let mt;
    if ($[137] !== entry || $[138] !== isLastInSection || $[139] !== onConfirm || $[140] !== onCancel) {
      mt = jsxProd_default(DeleteAutoModeRuleConfirm, {
        entry,
        isLastInSection,
        onConfirm,
        onCancel,
      });
      $[137] = entry;
      $[138] = isLastInSection;
      $[139] = onConfirm;
      $[140] = onCancel;
      $[141] = mt;
    } else mt = $[141];
    return mt;
  }
  if (X) {
    let onCancel;
    if ($[142] === MEMO_CACHE_SENTINEL) {
      onCancel = () => Ve(undefined);
      $[142] = onCancel;
    } else onCancel = $[142];
    let U;
    if ($[143] !== onDelete || $[144] !== X) {
      U = jsxProd_default(RuleDetails, {
        rule: X,
        onDelete,
        onCancel,
      });
      $[143] = onDelete;
      $[144] = X;
      $[145] = U;
    } else U = $[145];
    return U;
  }
  if (
    addingRuleToTab &&
    addingRuleToTab !== "workspace" &&
    addingRuleToTab !== "recent" &&
    addingRuleToTab !== "automode"
  ) {
    let I;
    if ($[146] !== addingRuleToTab) {
      I = jsxProd_default(PermissionRuleInput, {
        onCancel,
        onSubmit,
        ruleBehavior: addingRuleToTab,
      });
      $[146] = addingRuleToTab;
      $[147] = I;
    } else I = $[147];
    return I;
  }
  if (validatedRule) {
    let ruleValues;
    if ($[148] !== validatedRule.ruleValue) {
      ruleValues = [validatedRule.ruleValue];
      $[148] = validatedRule.ruleValue;
      $[149] = ruleValues;
    } else ruleValues = $[149];
    let setToolPermissionContext;
    if ($[150] !== setAppState) {
      setToolPermissionContext = (toolPermissionContext) => {
        setAppState((prev) => ({
          ...prev,
          toolPermissionContext,
        }));
      };
      $[150] = setAppState;
      $[151] = setToolPermissionContext;
    } else setToolPermissionContext = $[151];
    let z;
    if (
      $[152] !== onAddRules ||
      $[153] !== ruleValues ||
      $[154] !== setToolPermissionContext ||
      $[155] !== toolPermissionContext ||
      $[156] !== validatedRule.ruleBehavior
    ) {
      z = jsxProd_default(AddPermissionRules, {
        onAddRules,
        onCancel: onCancel_2,
        ruleValues,
        ruleBehavior: validatedRule.ruleBehavior,
        initialContext: toolPermissionContext,
        setToolPermissionContext,
      });
      $[152] = onAddRules;
      $[153] = ruleValues;
      $[154] = setToolPermissionContext;
      $[155] = toolPermissionContext;
      $[156] = validatedRule.ruleBehavior;
      $[157] = z;
    } else z = $[157];
    return z;
  }
  if (isAddingWorkspaceDirectory) {
    let onAddDirectory;
    if ($[158] !== setAppState || $[159] !== storageV5 || $[160] !== toolPermissionContext) {
      onAddDirectory = (path, remember) => {
        let permissionUpdate = {
          type: "addDirectories",
          directories: [path],
          destination: remember ? "localSettings" : "session",
        };
        let updatedContext = applyValidatedPermissionUpdate(toolPermissionContext, permissionUpdate);
        setAppState((prev) => ({
          ...prev,
          toolPermissionContext: updatedContext,
        }));
        if (remember) persistValidatedPermissionUpdate(permissionUpdate, storageV5).catch(logError);
        L((prev) => [
          ...prev,
          `Added directory ${sequential.bold(stripInvisibleChars(path))} to workspace${remember ? " and saved to local settings" : " for this session"}`,
        ]);
        setIsAddingWorkspaceDirectory(false);
      };
      $[158] = setAppState;
      $[159] = storageV5;
      $[160] = toolPermissionContext;
      $[161] = onAddDirectory;
    } else onAddDirectory = $[161];
    let onCancel;
    if ($[162] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setIsAddingWorkspaceDirectory(false);
      $[162] = onCancel;
    } else onCancel = $[162];
    let z;
    if ($[163] !== onAddDirectory || $[164] !== toolPermissionContext) {
      z = jsxProd_default(AddWorkspaceDirectory, {
        onAddDirectory,
        onCancel,
        permissionContext: toolPermissionContext,
      });
      $[163] = onAddDirectory;
      $[164] = toolPermissionContext;
      $[165] = z;
    } else z = $[165];
    return z;
  }
  if (removingDirectory) {
    let onRemove;
    if ($[166] !== removingDirectory) {
      onRemove = () => {
        L((prev) => [...prev, `Removed directory ${sequential.bold(removingDirectory)} from workspace`]);
        setRemovingDirectory(null);
      };
      $[166] = removingDirectory;
      $[167] = onRemove;
    } else onRemove = $[167];
    let onCancel;
    if ($[168] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setRemovingDirectory(null);
      $[168] = onCancel;
    } else onCancel = $[168];
    let setPermissionContext;
    if ($[169] !== setAppState) {
      setPermissionContext = (toolPermissionContext) => {
        setAppState((prev) => ({
          ...prev,
          toolPermissionContext,
        }));
      };
      $[169] = setAppState;
      $[170] = setPermissionContext;
    } else setPermissionContext = $[170];
    let ve;
    if (
      $[171] !== removingDirectory ||
      $[172] !== onRemove ||
      $[173] !== setPermissionContext ||
      $[174] !== toolPermissionContext
    ) {
      ve = jsxProd_default(RemoveWorkspaceDirectory, {
        directoryPath: removingDirectory,
        onRemove,
        onCancel,
        permissionContext: toolPermissionContext,
        setPermissionContext,
      });
      $[171] = removingDirectory;
      $[172] = onRemove;
      $[173] = setPermissionContext;
      $[174] = toolPermissionContext;
      $[175] = ve;
    } else ve = $[175];
    return ve;
  }
  let I;
  if (
    $[176] !== st ||
    $[177] !== Ct ||
    $[178] !== handleToolSelect ||
    $[179] !== isSearchMode ||
    $[180] !== isTerminalFocused ||
    $[181] !== lastFocusedRuleKey ||
    $[182] !== searchCursorOffset ||
    $[183] !== searchQuery
  ) {
    I = {
      searchQuery,
      isSearchMode,
      isFocused: isTerminalFocused,
      onCancel: Ct,
      lastFocusedRuleKey,
      cursorOffset: searchCursorOffset,
      getRulesOptions: st,
      handleToolSelect,
      onHeaderFocusChange: handleHeaderFocusChange,
    };
    $[176] = st;
    $[177] = Ct;
    $[178] = handleToolSelect;
    $[179] = isSearchMode;
    $[180] = isTerminalFocused;
    $[181] = lastFocusedRuleKey;
    $[182] = searchCursorOffset;
    $[183] = searchQuery;
    $[184] = I;
  } else I = $[184];
  let sharedRulesProps = I;
  let hidden = !Bt;
  let ul = E === "recent" && b;
  const navFromContent = !isSearchMode;
  let z;
  if ($[185] !== de || $[186] !== isMidTurn) {
    z = jsxProd_default(
      Tab,
      {
        id: "recent",
        title: "Recently blocked",
        children: jsxProd_default(RecentDenialsTab, {
          onHeaderFocusChange: handleHeaderFocusChange,
          onStateChange: de,
          isMidTurn,
        }),
      },
      "recent",
    );
    $[185] = de;
    $[186] = isMidTurn;
    $[187] = z;
  } else z = $[187];
  let ve;
  if ($[188] !== sharedRulesProps) {
    ve = jsxProd_default(
      Tab,
      {
        id: "allow",
        title: "Allow",
        children: jsxProd_default(PermissionRulesTab, {
          tab: "allow",
          ...sharedRulesProps,
        }),
      },
      "allow",
    );
    $[188] = sharedRulesProps;
    $[189] = ve;
  } else ve = $[189];
  let Oe;
  if ($[190] !== sharedRulesProps) {
    Oe = jsxProd_default(
      Tab,
      {
        id: "ask",
        title: "Ask",
        children: jsxProd_default(PermissionRulesTab, {
          tab: "ask",
          ...sharedRulesProps,
        }),
      },
      "ask",
    );
    $[190] = sharedRulesProps;
    $[191] = Oe;
  } else Oe = $[191];
  let mt;
  if ($[192] !== sharedRulesProps) {
    mt = jsxProd_default(
      Tab,
      {
        id: "deny",
        title: "Deny",
        children: jsxProd_default(PermissionRulesTab, {
          tab: "deny",
          ...sharedRulesProps,
        }),
      },
      "deny",
    );
    $[192] = sharedRulesProps;
    $[193] = mt;
  } else mt = $[193];
  let yo;
  if (
    $[194] !== W ||
    $[195] !== ae ||
    $[196] !== Ct ||
    $[197] !== isSearchMode ||
    $[198] !== isTerminalFocused ||
    $[199] !== Do ||
    $[200] !== searchCursorOffset ||
    $[201] !== searchQuery ||
    $[202] !== Io ||
    $[203] !== toolPermissionContext.isAutoModeAvailable
  ) {
    yo =
      toolPermissionContext.isAutoModeAvailable !== false
        ? [
            jsxProd_default(
              Tab,
              {
                id: "automode",
                title: "Auto mode",
                children: jsxProd_default(AgentsMenu, {
                  entries: ae,
                  searchQuery,
                  isSearchMode,
                  isFocused: isTerminalFocused,
                  cursorOffset: searchCursorOffset,
                  defaultFocusValue: Do,
                  builtinsState: W,
                  onSelectBuiltins: (Xu) => {
                    Ut(`builtins:${Xu}`);
                    me({
                      mode: "builtins",
                      section: Xu,
                    });
                  },
                  onAddNew: () =>
                    me({
                      mode: "pick-section",
                    }),
                  onSelectEntry: (Yu) => {
                    Ut(ruleKey(Yu));
                    me({
                      mode: "details",
                      entry: Yu,
                    });
                  },
                  onSelectEnvironment: () => {
                    Ut("environment-document");
                    Io();
                  },
                  onCancel: Ct,
                  onHeaderFocusChange: handleHeaderFocusChange,
                }),
              },
              "automode",
            ),
          ]
        : [];
    $[194] = W;
    $[195] = ae;
    $[196] = Ct;
    $[197] = isSearchMode;
    $[198] = isTerminalFocused;
    $[199] = Do;
    $[200] = searchCursorOffset;
    $[201] = searchQuery;
    $[202] = Io;
    $[203] = toolPermissionContext.isAutoModeAvailable;
    $[204] = yo;
  } else yo = $[204];
  let go;
  if ($[205] === MEMO_CACHE_SENTINEL) {
    go = jsxProd_default(Text, {
      wrap: "wrap-trim",
      children: "Claude Code can read files in the workspace, and make edits when auto-accept edits is on.",
    });
    $[205] = go;
  } else go = $[205];
  let vo;
  if ($[206] !== Ct || $[207] !== toolPermissionContext) {
    vo = jsxProd_default(
      Tab,
      {
        id: "workspace",
        title: "Workspace",
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            go,
            jsxProd_default(WorkspaceTab, {
              onCancel: Ct,
              toolPermissionContext,
              onRequestAddDirectory,
              onRequestRemoveDirectory,
              onHeaderFocusChange: handleHeaderFocusChange,
            }),
          ],
        }),
      },
      "workspace",
    );
    $[206] = Ct;
    $[207] = toolPermissionContext;
    $[208] = vo;
  } else vo = $[208];
  let children;
  if ($[209] !== z || $[210] !== ve || $[211] !== Oe || $[212] !== mt || $[213] !== yo || $[214] !== vo) {
    children = [z, ve, Oe, mt, ...yo, vo];
    $[209] = z;
    $[210] = ve;
    $[211] = Oe;
    $[212] = mt;
    $[213] = yo;
    $[214] = vo;
    $[215] = children;
  } else children = $[215];
  let _r;
  if (
    $[216] !== T ||
    $[217] !== Wt ||
    $[218] !== hidden ||
    $[219] !== E ||
    $[220] !== navFromContent ||
    $[221] !== children
  ) {
    _r = jsxProd_default(Tabs, {
      title: "Permissions",
      color: "permission",
      defaultTab: T,
      selectedTab: E,
      onTabChange: D,
      hidden,
      initialHeaderFocused: Wt,
      navFromContent,
      children,
    });
    $[216] = T;
    $[217] = Wt;
    $[218] = hidden;
    $[219] = E;
    $[220] = navFromContent;
    $[221] = children;
    $[222] = _r;
  } else _r = $[222];
  let children_2;
  if (
    $[223] !== ee ||
    $[224] !== globalExitKeybindings.keyName ||
    $[225] !== globalExitKeybindings.pending ||
    $[226] !== Wt ||
    $[227] !== ul ||
    $[228] !== isScreenReaderEnabled ||
    $[229] !== isSearchMode ||
    $[230] !== ye
  ) {
    children_2 = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : Wt
        ? jsxProd_default_2(Fragment, {
            children: ["\u2190/\u2192 to switch \xB7 \u2193 to select \xB7 ", ye ?? "Esc to cancel"],
          })
        : isSearchMode
          ? jsxProd_default(Fragment, {
              children: "Type to filter \xB7 Enter/\u2193 to select \xB7 \u2191 to tabs \xB7 Esc to clear",
            })
          : ul
            ? jsxProd_default_2(Fragment, {
                children: [
                  ee && "Enter to approve \xB7 r to retry \xB7 ",
                  ye ?? `${isScreenReaderEnabled ? "" : "\u2191/\u2193 to navigate \xB7 "}Esc to close`,
                ],
              })
            : jsxProd_default_2(Fragment, {
                children: [
                  isScreenReaderEnabled ? "" : "\u2191/\u2193 to navigate \xB7 Enter to select \xB7 ",
                  "\u2190/\u2192 to switch \xB7 ",
                  ye ?? "Esc to cancel",
                ],
              });
    $[223] = ee;
    $[224] = globalExitKeybindings.keyName;
    $[225] = globalExitKeybindings.pending;
    $[226] = Wt;
    $[227] = ul;
    $[228] = isScreenReaderEnabled;
    $[229] = isSearchMode;
    $[230] = ye;
    $[231] = children_2;
  } else children_2 = $[231];
  let Lr;
  if ($[232] !== children_2) {
    Lr = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: children_2,
      }),
    });
    $[232] = children_2;
    $[233] = Lr;
  } else Lr = $[233];
  let children_3;
  if ($[234] !== _r || $[235] !== Lr) {
    children_3 = jsxProd_default_2(Pane, {
      color: "permission",
      children: [_r, Lr],
    });
    $[234] = _r;
    $[235] = Lr;
    $[236] = children_3;
  } else children_3 = $[236];
  let Gu;
  if ($[237] !== onKeyDown || $[238] !== handlePaste || $[239] !== children_3) {
    Gu = jsxProd_default(Box, {
      flexDirection: "column",
      onKeyDown,
      onPaste: handlePaste,
      children: children_3,
    });
    $[237] = onKeyDown;
    $[238] = handlePaste;
    $[239] = children_3;
    $[240] = Gu;
  } else Gu = $[240];
  return Gu;
}
export { PermissionRuleList };
