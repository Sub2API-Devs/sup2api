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
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
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
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "../../../../vendor/react/cjs/react.production.js";
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
  let $ = useMemoCache(25);
  let { entry } = props;
  let field;
  if ($[0] !== entry.text) {
    field = displayField(entry.text);
    $[0] = entry.text;
    $[1] = field;
  } else field = $[1];
  let ruleField = field;
  let children;
  if ($[2] !== ruleField.text) {
    children = jsxProd_default(Text, {
      bold: true,
      wrap: "wrap-trim",
      children: ruleField.text,
    });
    $[2] = ruleField.text;
    $[3] = children;
  } else children = $[3];
  let blockquoteElement;
  if ($[4] !== ruleField.needsGutter || $[5] !== children) {
    blockquoteElement = jsxProd_default(Blockquote, {
      multiline: ruleField.needsGutter,
      children,
    });
    $[4] = ruleField.needsGutter;
    $[5] = children;
    $[6] = blockquoteElement;
  } else blockquoteElement = $[6];
  let color;
  if ($[7] !== entry.section) {
    color = getAutoModeSectionColor(entry.section);
    $[7] = entry.section;
    $[8] = color;
  } else color = $[8];
  let children_2;
  if ($[9] !== entry.section) {
    children_2 = getAutoModeRuleCategoryLabel(entry.section);
    $[9] = entry.section;
    $[10] = children_2;
  } else children_2 = $[10];
  let ruleElement;
  if ($[11] !== color || $[12] !== children_2) {
    ruleElement = jsxProd_default(Text, {
      color,
      children: children_2,
    });
    $[11] = color;
    $[12] = children_2;
    $[13] = ruleElement;
  } else ruleElement = $[13];
  const entryKind = entry.structure ? "section header" : "rule";
  let sourceLabel;
  if ($[14] !== entry.source) {
    sourceLabel = describeRuleSource(entry.source);
    $[14] = entry.source;
    $[15] = sourceLabel;
  } else sourceLabel = $[15];
  let sourceLine;
  if ($[16] !== entryKind || $[17] !== sourceLabel) {
    sourceLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", entryKind, " for auto mode \xB7 From", " ", sourceLabel],
    });
    $[16] = entryKind;
    $[17] = sourceLabel;
    $[18] = sourceLine;
  } else sourceLine = $[18];
  let rowElement;
  if ($[19] !== ruleElement || $[20] !== sourceLine) {
    rowElement = jsxProd_default_2(Text, {
      children: [ruleElement, sourceLine],
    });
    $[19] = ruleElement;
    $[20] = sourceLine;
    $[21] = rowElement;
  } else rowElement = $[21];
  let boxElement;
  if ($[22] !== rowElement || $[23] !== blockquoteElement) {
    boxElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginX: 2,
      children: [blockquoteElement, rowElement],
    });
    $[22] = rowElement;
    $[23] = blockquoteElement;
    $[24] = boxElement;
  } else boxElement = $[24];
  return boxElement;
}
//@ chunk-p2qwpk2k.js:52517-57241 sole-consumer
/**
 * auto 模式规则详情页：旧版 autoMode.deny、环境分节标题、托管设置、--settings 来源等只读情况给出说明，用户规则提供编辑/删除。
 */
function AutoModeRuleDetails(props) {
  let $ = useMemoCache(78);
  let { entry, onEdit, onDelete, onCancel } = props;
  let keyOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keyOptions = {
      context: "Confirmation",
    };
    $[0] = keyOptions;
  } else keyOptions = $[0];
  useKeybinding("confirm:no", onCancel, keyOptions);
  let escHintBox;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    escHintBox = jsxProd_default(Box, {
      marginLeft: 3,
      children: jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      }),
    });
    $[1] = escHintBox;
  } else escHintBox = $[1];
  let escHint = escHintBox;
  if (entry.legacy) {
    let summary;
    if ($[2] !== entry) {
      summary = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      $[2] = entry;
      $[3] = summary;
    } else summary = $[3];
    const reason =
      entry.source === "userSettings"
        ? "This editor writes only the modern keys \u2014 move the rule to autoMode.soft_deny in your settings file to manage it here."
        : "It is delivered by " + describeRuleSource(entry.source) + " and cannot be modified here.";
    let reasonText;
    if ($[4] !== reason) {
      reasonText = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "",
          "This rule comes from the legacy autoMode.deny key, which auto mode still enforces as a soft deny.",
          " ",
          reason,
        ],
      });
      $[4] = reason;
      $[5] = reasonText;
    } else reasonText = $[5];
    let actions;
    if ($[6] !== entry || $[7] !== onCancel) {
      actions = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      $[6] = entry;
      $[7] = onCancel;
      $[8] = actions;
    } else actions = $[8];
    let content;
    if ($[9] !== summary || $[10] !== reasonText || $[11] !== actions) {
      content = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [summary, reasonText, actions],
          }),
          escHint,
        ],
      });
      $[9] = summary;
      $[10] = reasonText;
      $[11] = actions;
      $[12] = content;
    } else content = $[12];
    return content;
  }
  if (entry.structure) {
    let summary;
    if ($[13] !== entry) {
      summary = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      $[13] = entry;
      $[14] = summary;
    } else summary = $[14];
    let reason;
    if ($[15] !== entry.source) {
      reason =
        entry.source !== "userSettings"
          ? `It is delivered by ${describeRuleSource(entry.source)} and cannot be modified here.`
          : isAutoModeSetupNotOverridden()
            ? "Re-run /auto-mode-setup to restructure, or edit your settings file directly."
            : "Edit your settings file directly to restructure.";
      $[15] = entry.source;
      $[16] = reason;
    } else reason = $[16];
    let reasonText;
    if ($[17] !== reason) {
      reasonText = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "A section header that organizes the environment entries below it; auto mode reads it as written.",
          " ",
          reason,
        ],
      });
      $[17] = reason;
      $[18] = reasonText;
    } else reasonText = $[18];
    let actions;
    if ($[19] !== entry || $[20] !== onCancel) {
      actions = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      $[19] = entry;
      $[20] = onCancel;
      $[21] = actions;
    } else actions = $[21];
    let content;
    if ($[22] !== summary || $[23] !== reasonText || $[24] !== actions) {
      content = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [summary, reasonText, actions],
          }),
          escHint,
        ],
      });
      $[22] = summary;
      $[23] = reasonText;
      $[24] = actions;
      $[25] = content;
    } else content = $[25];
    return content;
  }
  if (entry.source === "policySettings") {
    let summary;
    if ($[26] !== entry) {
      summary = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      $[26] = entry;
      $[27] = summary;
    } else summary = $[27];
    let reasonText;
    if ($[28] === MEMO_CACHE_SENTINEL) {
      reasonText = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "This rule is configured by managed settings and cannot be modified.",
          `
`,
          "Contact your system administrator for more information.",
        ],
      });
      $[28] = reasonText;
    } else reasonText = $[28];
    let actions;
    if ($[29] !== entry || $[30] !== onCancel) {
      actions = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      $[29] = entry;
      $[30] = onCancel;
      $[31] = actions;
    } else actions = $[31];
    let content;
    if ($[32] !== summary || $[33] !== actions) {
      content = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [summary, reasonText, actions],
          }),
          escHint,
        ],
      });
      $[32] = summary;
      $[33] = actions;
      $[34] = content;
    } else content = $[34];
    return content;
  }
  if (entry.source === "flagSettings") {
    let summary;
    if ($[35] !== entry) {
      summary = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      $[35] = entry;
      $[36] = summary;
    } else summary = $[36];
    let reasonText;
    if ($[37] === MEMO_CACHE_SENTINEL) {
      reasonText = jsxProd_default(Text, {
        italic: true,
        children:
          "This rule comes from a read-only source (the --settings flag) and cannot be modified here.",
      });
      $[37] = reasonText;
    } else reasonText = $[37];
    let actions;
    if ($[38] !== entry || $[39] !== onCancel) {
      actions = jsxProd_default(UltrareviewOverageDialog, {
        entry,
        onCancel,
      });
      $[38] = entry;
      $[39] = onCancel;
      $[40] = actions;
    } else actions = $[40];
    let content;
    if ($[41] !== summary || $[42] !== actions) {
      content = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [summary, reasonText, actions],
          }),
          escHint,
        ],
      });
      $[41] = summary;
      $[42] = actions;
      $[43] = content;
    } else content = $[43];
    return content;
  }
  let validationError;
  if ($[44] !== entry.section || $[45] !== entry.text) {
    validationError = validateRuleText(entry.section, entry.text);
    $[44] = entry.section;
    $[45] = entry.text;
    $[46] = validationError;
  } else validationError = $[46];
  let validationError_2 = validationError;
  if (validationError_2 !== null) {
    let summary;
    if ($[47] !== entry) {
      summary = jsxProd_default(AutoModeRuleSummary, {
        entry,
      });
      $[47] = entry;
      $[48] = summary;
    } else summary = $[48];
    let reasonText;
    if ($[49] !== validationError_2) {
      reasonText = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "This rule cannot be edited here: ",
          validationError_2,
          `
`,
          "Edit it in your settings file, or delete it here.",
        ],
      });
      $[49] = validationError_2;
      $[50] = reasonText;
    } else reasonText = $[50];
    let options;
    if ($[51] === MEMO_CACHE_SENTINEL) {
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
      $[51] = options;
    } else options = $[51];
    let onChange;
    if ($[52] !== onCancel || $[53] !== onDelete) {
      onChange = (value) => {
        if (value === "delete") onDelete();
        else onCancel();
      };
      $[52] = onCancel;
      $[53] = onDelete;
      $[54] = onChange;
    } else onChange = $[54];
    let selector;
    if ($[55] !== onCancel || $[56] !== onChange) {
      selector = jsxProd_default(ModelSelector, {
        options,
        onChange,
        onCancel,
      });
      $[55] = onCancel;
      $[56] = onChange;
      $[57] = selector;
    } else selector = $[57];
    let content;
    if ($[58] !== summary || $[59] !== reasonText || $[60] !== selector) {
      content = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [summary, reasonText, selector],
          }),
          escHint,
        ],
      });
      $[58] = summary;
      $[59] = reasonText;
      $[60] = selector;
      $[61] = content;
    } else content = $[61];
    return content;
  }
  let summary;
  if ($[62] !== entry) {
    summary = jsxProd_default(AutoModeRuleSummary, {
      entry,
    });
    $[62] = entry;
    $[63] = summary;
  } else summary = $[63];
  let environmentNote;
  if ($[64] !== entry.section) {
    environmentNote =
      entry.section === "environment" &&
      jsxProd_default_2(Text, {
        italic: true,
        children: [
          "Environment entries describe this machine and project for auto mode.",
          isAutoModeSetupNotOverridden() ? " Re-run /auto-mode-setup to rebuild them from scratch." : "",
        ],
      });
    $[64] = entry.section;
    $[65] = environmentNote;
  } else environmentNote = $[65];
  let options;
  if ($[66] === MEMO_CACHE_SENTINEL) {
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
    $[66] = options;
  } else options = $[66];
  let onChange;
  if ($[67] !== onCancel || $[68] !== onDelete || $[69] !== onEdit) {
    onChange = (value) => {
      if (value === "edit") onEdit();
      else if (value === "delete") onDelete();
      else onCancel();
    };
    $[67] = onCancel;
    $[68] = onDelete;
    $[69] = onEdit;
    $[70] = onChange;
  } else onChange = $[70];
  let selector;
  if ($[71] !== onCancel || $[72] !== onChange) {
    selector = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
    });
    $[71] = onCancel;
    $[72] = onChange;
    $[73] = selector;
  } else selector = $[73];
  let content;
  if ($[74] !== summary || $[75] !== environmentNote || $[76] !== selector) {
    content = jsxProd_default_2(Fragment, {
      children: [
        jsxProd_default_2(ShutdownRequestDisplay, {
          color: "permission",
          title: "Rule details",
          children: [summary, environmentNote, selector],
        }),
        escHint,
      ],
    });
    $[74] = summary;
    $[75] = environmentNote;
    $[76] = selector;
    $[77] = content;
  } else content = $[77];
  return content;
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
  let $ = useMemoCache(83);
  let { section, state, onToggle, onCancel } = props;
  let isFullscreen = useIsFullscreen();
  let keyOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keyOptions = {
      context: "Settings",
    };
    $[0] = keyOptions;
  } else keyOptions = $[0];
  useKeybinding("confirm:no", onCancel, keyOptions);
  let [editorNotice, openInEditor] = openRulesInEditor(section);
  let BoxComponent;
  let DialogComponent;
  let isUserControlled;
  let footerHint;
  let defaultRules;
  let shownRules;
  let flexDirection;
  let marginX;
  let marginY;
  let gap;
  let color;
  let title;
  let titleText;
  if ($[1] !== isFullscreen || $[2] !== section || $[3] !== state.control || $[4] !== state.enabled) {
    defaultRules = getDefaultExternalAutoModeRules()[section] ?? [];
    let escHint;
    if ($[18] === MEMO_CACHE_SENTINEL) {
      escHint = jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "esc",
          action: "cancel",
        }),
      });
      $[18] = escHint;
    } else escHint = $[18];
    footerHint = escHint;
    isUserControlled = state.control === "user";
    DialogComponent = ShutdownRequestDisplay;
    color = "permission";
    title = "Built-in rules";
    let color_2;
    if ($[19] !== section) {
      color_2 = getAutoModeSectionColor(section);
      $[19] = section;
      $[20] = color_2;
    } else color_2 = $[20];
    let children;
    if ($[21] !== section) {
      children = getAutoModeRuleCategoryLabel(section);
      $[21] = section;
      $[22] = children;
    } else children = $[22];
    let labelText;
    if ($[23] !== color_2 || $[24] !== children) {
      labelText = jsxProd_default(Text, {
        color: color_2,
        children,
      });
      $[23] = color_2;
      $[24] = children;
      $[25] = labelText;
    } else labelText = $[25];
    const summaryText = `${defaultRules.length} built-in ${defaultRules.length === 1 ? "rule" : "rules"} \xB7 ${state.enabled ? "in effect" : "switched off"}`;
    let summarySuffix;
    if ($[26] !== summaryText) {
      summarySuffix = jsxProd_default_2(Text, {
        dimColor: true,
        children: [" ", "\xB7", " ", summaryText],
      });
      $[26] = summaryText;
      $[27] = summarySuffix;
    } else summarySuffix = $[27];
    if ($[28] !== labelText || $[29] !== summarySuffix) {
      titleText = jsxProd_default_2(Text, {
        children: [labelText, summarySuffix],
      });
      $[28] = labelText;
      $[29] = summarySuffix;
      $[30] = titleText;
    } else titleText = $[30];
    BoxComponent = Box;
    flexDirection = "column";
    marginX = 2;
    marginY = 1;
    gap = 1;
    let maxChars = listHeight(isFullscreen);
    shownRules = [];
    let usedChars = 0;
    for (const ruleText of defaultRules) {
      if (usedChars + ruleText.length > maxChars && shownRules.length > 0) {
        break;
      }
      shownRules.push(ruleText);
      usedChars = usedChars + ruleText.length;
    }
    if (shownRules.length === 1 && shownRules[0].length > maxChars) {
      let excessChars = shownRules[0].length - maxChars;
      shownRules[0] = `${truncateToLength(shownRules[0], maxChars)}\u2026 +${excessChars} more characters \u2014 View in editor for the full text.`;
    }
    $[1] = isFullscreen;
    $[2] = section;
    $[3] = state.control;
    $[4] = state.enabled;
    $[5] = BoxComponent;
    $[6] = DialogComponent;
    $[7] = isUserControlled;
    $[8] = footerHint;
    $[9] = defaultRules;
    $[10] = shownRules;
    $[11] = flexDirection;
    $[12] = marginX;
    $[13] = marginY;
    $[14] = gap;
    $[15] = color;
    $[16] = title;
    $[17] = titleText;
  } else {
    BoxComponent = $[5];
    DialogComponent = $[6];
    isUserControlled = $[7];
    footerHint = $[8];
    defaultRules = $[9];
    shownRules = $[10];
    flexDirection = $[11];
    marginX = $[12];
    marginY = $[13];
    gap = $[14];
    color = $[15];
    title = $[16];
    titleText = $[17];
  }
  let hiddenRuleCount = defaultRules.length - shownRules.length;
  let ruleElements;
  if ($[31] !== shownRules || $[32] !== state.enabled) {
    ruleElements = shownRules.map((ruleText, index) =>
      jsxProd_default_2(
        Text,
        {
          dimColor: true,
          strikethrough: !state.enabled,
          wrap: "wrap-trim",
          children: ["- ", ruleText],
        },
        index,
      ),
    );
    $[31] = shownRules;
    $[32] = state.enabled;
    $[33] = ruleElements;
  } else ruleElements = $[33];
  let moreRules;
  if ($[34] !== hiddenRuleCount) {
    moreRules =
      hiddenRuleCount > 0 &&
      jsxProd_default_2(Text, {
        dimColor: true,
        italic: true,
        children: [
          "\u2026 +",
          hiddenRuleCount,
          " more ",
          hiddenRuleCount === 1 ? "rule" : "rules",
          " \u2014 run `claude auto-mode defaults` to print the full set.",
        ],
      });
    $[34] = hiddenRuleCount;
    $[35] = moreRules;
  } else moreRules = $[35];
  let ruleLines;
  if ($[36] !== moreRules || $[37] !== ruleElements) {
    ruleLines = jsxProd_default_2(Fragment, {
      children: [ruleElements, moreRules],
    });
    $[36] = moreRules;
    $[37] = ruleElements;
    $[38] = ruleLines;
  } else ruleLines = $[38];
  const children = ruleLines;
  let rulesBox;
  if (
    $[39] !== BoxComponent ||
    $[40] !== children ||
    $[41] !== flexDirection ||
    $[42] !== marginX ||
    $[43] !== marginY ||
    $[44] !== gap
  ) {
    rulesBox = jsxProd_default(BoxComponent, {
      flexDirection,
      marginX,
      marginY,
      gap,
      children,
    });
    $[39] = BoxComponent;
    $[40] = children;
    $[41] = flexDirection;
    $[42] = marginX;
    $[43] = marginY;
    $[44] = gap;
    $[45] = rulesBox;
  } else rulesBox = $[45];
  let emptyNote;
  if ($[46] !== state.control) {
    emptyNote =
      state.control === "empty" &&
      jsxProd_default(Text, {
        italic: true,
        children: "This section has no configured rules, so the built-ins apply. Add a rule to customize it.",
      });
    $[46] = state.control;
    $[47] = emptyNote;
  } else emptyNote = $[47];
  let otherSourceNote;
  if ($[48] !== state.control || $[49] !== state.enabled || $[50] !== state.source) {
    otherSourceNote =
      state.control === "otherSource" &&
      jsxProd_default(Text, {
        italic: true,
        children: state.enabled
          ? `Kept on by ${describeRuleSource(state.source ?? "policySettings")} \u2014 it cannot be switched off here.`
          : `Replaced by rules from ${describeRuleSource(state.source ?? "policySettings")}. This control follows that configuration; add your own rules to customize the section.`,
      });
    $[48] = state.control;
    $[49] = state.enabled;
    $[50] = state.source;
    $[51] = otherSourceNote;
  } else otherSourceNote = $[51];
  let toggleOptions;
  if ($[52] !== isUserControlled || $[53] !== state.enabled) {
    toggleOptions = isUserControlled
      ? [
          {
            label: state.enabled
              ? "Disable built-in rules for this section"
              : "Enable built-in rules for this section",
            value: "toggle",
          },
        ]
      : [];
    $[52] = isUserControlled;
    $[53] = state.enabled;
    $[54] = toggleOptions;
  } else toggleOptions = $[54];
  let editorOption;
  let cancelOption;
  if ($[55] === MEMO_CACHE_SENTINEL) {
    editorOption = {
      label: `View in editor${getShortEditorName() ? ` (${getShortEditorName()})` : ""}`,
      value: "editor",
    };
    cancelOption = {
      label: "Cancel",
      value: "cancel",
    };
    $[55] = editorOption;
    $[56] = cancelOption;
  } else {
    editorOption = $[55];
    cancelOption = $[56];
  }
  let options;
  if ($[57] !== toggleOptions) {
    options = [...toggleOptions, editorOption, cancelOption];
    $[57] = toggleOptions;
    $[58] = options;
  } else options = $[58];
  let onChange;
  if ($[59] !== openInEditor || $[60] !== onCancel || $[61] !== onToggle || $[62] !== defaultRules) {
    onChange = (value) => {
      if (value === "toggle") onToggle();
      else if (value === "editor")
        openInEditor(
          defaultRules.map(toBulletLine).join(`

`),
        );
      else onCancel();
    };
    $[59] = openInEditor;
    $[60] = onCancel;
    $[61] = onToggle;
    $[62] = defaultRules;
    $[63] = onChange;
  } else onChange = $[63];
  let selector;
  if ($[64] !== onCancel || $[65] !== options || $[66] !== onChange) {
    selector = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
    });
    $[64] = onCancel;
    $[65] = options;
    $[66] = onChange;
    $[67] = selector;
  } else selector = $[67];
  let editorError;
  if ($[68] !== editorNotice) {
    editorError =
      editorNotice !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: editorNotice,
      });
    $[68] = editorNotice;
    $[69] = editorError;
  } else editorError = $[69];
  let dialog;
  if (
    $[70] !== DialogComponent ||
    $[71] !== rulesBox ||
    $[72] !== emptyNote ||
    $[73] !== otherSourceNote ||
    $[74] !== selector ||
    $[75] !== editorError ||
    $[76] !== color ||
    $[77] !== title ||
    $[78] !== titleText
  ) {
    dialog = jsxProd_default_2(DialogComponent, {
      color,
      title,
      children: [titleText, rulesBox, emptyNote, otherSourceNote, selector, editorError],
    });
    $[70] = DialogComponent;
    $[71] = rulesBox;
    $[72] = emptyNote;
    $[73] = otherSourceNote;
    $[74] = selector;
    $[75] = editorError;
    $[76] = color;
    $[77] = title;
    $[78] = titleText;
    $[79] = dialog;
  } else dialog = $[79];
  let content;
  if ($[80] !== footerHint || $[81] !== dialog) {
    content = jsxProd_default_2(Fragment, {
      children: [dialog, footerHint],
    });
    $[80] = footerHint;
    $[81] = dialog;
    $[82] = content;
  } else content = $[82];
  return content;
}
//@ chunk-p2qwpk2k.js:61446-62726 sole-consumer
/**
 * 删除 auto 模式规则的确认框；删除的是该分类最后一条用户规则时提示将只剩内置规则。
 */
function DeleteAutoModeRuleConfirm(props) {
  let $ = useMemoCache(19);
  let { entry, isLastInSection, onConfirm, onCancel } = props;
  let keybindingOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "Confirmation",
    };
    $[0] = keybindingOptions;
  } else keybindingOptions = $[0];
  useKeybinding("confirm:no", onCancel, keybindingOptions);
  let titleText;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    titleText = jsxProd_default(Text, {
      bold: true,
      color: "error",
      children: "Delete auto mode rule?",
    });
    $[1] = titleText;
  } else titleText = $[1];
  let autoModeRuleSummaryElement;
  if ($[2] !== entry) {
    autoModeRuleSummaryElement = jsxProd_default(AutoModeRuleSummary, {
      entry,
    });
    $[2] = entry;
    $[3] = autoModeRuleSummaryElement;
  } else autoModeRuleSummaryElement = $[3];
  let lastSectionNote;
  if ($[4] !== entry || $[5] !== isLastInSection) {
    lastSectionNote =
      isLastInSection &&
      ` This is your last ${getAutoModeRuleCategoryLabel(entry.section).toLowerCase()} rule \u2014 without it, only the built-in rules apply for this section.`;
    $[4] = entry;
    $[5] = isLastInSection;
    $[6] = lastSectionNote;
  } else lastSectionNote = $[6];
  let questionText;
  if ($[7] !== lastSectionNote) {
    questionText = jsxProd_default_2(Text, {
      children: [
        "Are you sure you want to delete this rule? Auto mode stops applying it on your next request.",
        lastSectionNote,
      ],
    });
    $[7] = lastSectionNote;
    $[8] = questionText;
  } else questionText = $[8];
  let confirmSelectElement;
  if ($[9] !== onCancel || $[10] !== onConfirm) {
    confirmSelectElement = jsxProd_default(ConfirmSelect, {
      focus: "cancel",
      hideIndexes: true,
      onConfirm,
      onCancel,
    });
    $[9] = onCancel;
    $[10] = onConfirm;
    $[11] = confirmSelectElement;
  } else confirmSelectElement = $[11];
  let confirmBox;
  if ($[12] !== autoModeRuleSummaryElement || $[13] !== questionText || $[14] !== confirmSelectElement) {
    confirmBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      borderStyle: "round",
      paddingLeft: 1,
      paddingRight: 1,
      borderColor: "error",
      children: [titleText, autoModeRuleSummaryElement, questionText, confirmSelectElement],
    });
    $[12] = autoModeRuleSummaryElement;
    $[13] = questionText;
    $[14] = confirmSelectElement;
    $[15] = confirmBox;
  } else confirmBox = $[15];
  let footerBoxElement;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    footerBoxElement = jsxProd_default(Box, {
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
    $[16] = footerBoxElement;
  } else footerBoxElement = $[16];
  let fragmentElement;
  if ($[17] !== confirmBox) {
    fragmentElement = jsxProd_default_2(Fragment, {
      children: [confirmBox, footerBoxElement],
    });
    $[17] = confirmBox;
    $[18] = fragmentElement;
  } else fragmentElement = $[18];
  return fragmentElement;
}
//@ chunk-p2qwpk2k.js:62726-62730 sole-consumer
init_react_production();
//@ chunk-p2qwpk2k.js:62895-62974 sole-consumer
function toRuleListOption(section) {
  return {
    label: getAutoModeRuleCategoryLabel(section),
    value: section,
    description: getAutoModeSectionDescription(section),
    dimDescription: true,
  };
}
//@ chunk-p2qwpk2k.js:62974-63040 sole-consumer
function normalizeCrlf(text) {
  return text
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
function getAutoModeSectionDescription(section) {
  switch (section) {
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
function editEnvironmentInEditor(env) {
  let filePath = sessionSidecarFilePath(`${AUTO_MODE_ENV_EDIT}${randomBytes(8).toString("hex")}.md`);
  if (filePath === null)
    return {
      content: null,
      problem: null,
    };
  try {
    mkdirSync(dirname(filePath), {
      recursive: true,
      mode: 448,
    });
    let entries = openSync(
      filePath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      384,
    );
    try {
      writeSync(
        entries,
        env.join(`
`),
        null,
        "utf8",
      );
    } finally {
      closeSync(entries);
    }
  } catch (error) {
    return {
      content: null,
      problem: `could not write the file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  let edited = editFileInEditor(filePath);
  if (edited.error !== undefined)
    return {
      content: null,
      problem: edited.error,
    };
  if (edited.content === null)
    return {
      content: null,
      problem: "the editor returned no content \u2014 reopen to try again.",
    };
  return {
    content:
      edited.content === null
        ? null
        : edited.content
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
  let $ = useMemoCache(8);
  let { onCancel, onPick } = props;
  let boxElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    boxElement = jsxProd_default(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children: "What kind of rule is this?",
      }),
    });
    $[0] = boxElement;
  } else boxElement = $[0];
  let options;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    options = AUTO_MODE_RULE_SECTIONS.map(toRuleListOption);
    $[1] = options;
  } else options = $[1];
  let modelSelectorElement;
  if ($[2] !== onCancel || $[3] !== onPick) {
    modelSelectorElement = jsxProd_default(ModelSelector, {
      options,
      onChange: onPick,
      onCancel,
    });
    $[2] = onCancel;
    $[3] = onPick;
    $[4] = modelSelectorElement;
  } else modelSelectorElement = $[4];
  let dialogElement;
  if ($[5] !== onCancel || $[6] !== modelSelectorElement) {
    dialogElement = jsxProd_default_2(Dialog, {
      title: "Add auto mode rule",
      onCancel,
      color: "permission",
      children: [boxElement, modelSelectorElement],
    });
    $[5] = onCancel;
    $[6] = modelSelectorElement;
    $[7] = dialogElement;
  } else dialogElement = $[7];
  return dialogElement;
}
//@ chunk-p2qwpk2k.js:64569-66742 sole-consumer
/**
 * 添加/编辑 auto 模式规则的输入对话框：多行输入、校验失败显示错误、提示保存到用户设置。
 */
function AutoModeRuleInput(props) {
  let $ = useMemoCache(28);
  let { section, initialValue, onCancel, onSubmit } = props;
  let [value, setValue] = useState(initialValue ?? "");
  let [cursorOffset, setCursorOffset] = useState(initialValue ? initialValue.length : 0);
  let [validationError, setValidationError] = useState(null);
  let keyOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keyOptions = {
      context: "Settings",
    };
    $[0] = keyOptions;
  } else keyOptions = $[0];
  useKeybinding("confirm:no", onCancel, keyOptions);
  let { columns } = useTerminalSize();
  let columns_2 = columns - 6;
  let onSubmitValue;
  if ($[1] !== onSubmit || $[2] !== section) {
    onSubmitValue = (rawText) => {
      let ruleText = rawText.trim();
      if (ruleText.length === 0) {
        return;
      }
      let error = validateRuleText(section, ruleText);
      if (error !== null) {
        setValidationError(error);
        return;
      }
      onSubmit(ruleText);
    };
    $[1] = onSubmit;
    $[2] = section;
    $[3] = onSubmitValue;
  } else onSubmitValue = $[3];
  let onSubmit_2 = onSubmitValue;
  let isEditing = initialValue !== undefined;
  let children =
    section === "environment"
      ? "Deploys from this machine only reach the staging cluster."
      : "Database Writes: UPDATE statements against the local dev database.";
  let sectionLabel;
  if ($[4] !== section) {
    sectionLabel = getAutoModeRuleCategoryLabel(section).toLowerCase();
    $[4] = section;
    $[5] = sectionLabel;
  } else sectionLabel = $[5];
  const title = `${isEditing ? "Edit" : "Add"} ${sectionLabel} rule`;
  let saveHint;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    saveHint = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "save",
    });
    $[6] = saveHint;
  } else saveHint = $[6];
  const chord = supportsShiftEnter() ? "shift+enter" : "ctrl+j";
  let inputGuide;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        saveHint,
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
    $[7] = inputGuide;
  } else inputGuide = $[7];
  let newlineHint;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    newlineHint = jsxProd_default(Newline, {});
    $[8] = newlineHint;
  } else newlineHint = $[8];
  let helpText;
  if ($[9] !== children) {
    helpText = jsxProd_default_2(Text, {
      children: [
        "Write the rule as a plain sentence. A short label up front helps, e.g.,",
        newlineHint,
        jsxProd_default(Text, {
          bold: true,
          children,
        }),
      ],
    });
    $[9] = children;
    $[10] = helpText;
  } else helpText = $[10];
  let onChange;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    onChange = (nextValue) => {
      setValidationError(null);
      setValue(nextValue);
    };
    $[11] = onChange;
  } else onChange = $[11];
  let inputBox;
  if ($[12] !== cursorOffset || $[13] !== onSubmit_2 || $[14] !== value || $[15] !== columns_2) {
    inputBox = jsxProd_default(Box, {
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
        value,
        onChange,
        onSubmit: onSubmit_2,
        placeholder: `Enter rule${figures_default.ellipsis}`,
        columns: columns_2,
        cursorOffset,
        onChangeCursorOffset: setCursorOffset,
      }),
    });
    $[12] = cursorOffset;
    $[13] = onSubmit_2;
    $[14] = value;
    $[15] = columns_2;
    $[16] = inputBox;
  } else inputBox = $[16];
  let errorText;
  if ($[17] !== validationError) {
    errorText =
      validationError !== null &&
      jsxProd_default(Text, {
        color: "error",
        wrap: "wrap-trim",
        children: validationError,
      });
    $[17] = validationError;
    $[18] = errorText;
  } else errorText = $[18];
  let savedHint;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    savedHint = jsxProd_default(Text, {
      dimColor: true,
      children: "Saved to your user settings file",
    });
    $[19] = savedHint;
  } else savedHint = $[19];
  let children_2;
  if ($[20] !== inputBox || $[21] !== errorText || $[22] !== helpText) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [helpText, inputBox, errorText, savedHint],
    });
    $[20] = inputBox;
    $[21] = errorText;
    $[22] = helpText;
    $[23] = children_2;
  } else children_2 = $[23];
  let dialog;
  if ($[24] !== onCancel || $[25] !== children_2 || $[26] !== title) {
    dialog = jsxProd_default(Dialog, {
      title,
      onCancel,
      color: "permission",
      isCancelActive: false,
      inputGuide,
      children: children_2,
    });
    $[24] = onCancel;
    $[25] = children_2;
    $[26] = title;
    $[27] = dialog;
  } else dialog = $[27];
  return dialog;
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
function ruleStringPair(rule) {
  return [jsonStringify(rule), rule];
}
//@ chunk-p2qwpk2k.js:66875-66918 layout
function rulesBySourceMap(rules) {
  return new Map(rules.map(ruleStringPair));
}
//@ chunk-p2qwpk2k.js:66918-66955 layout
function ruleStringOf(rule) {
  return rule.ruleString;
}
//@ chunk-p2qwpk2k.js:66955-66985 layout
function describeRule(rule) {
  return consentRowLabel(rule);
}
//@ chunk-p2qwpk2k.js:66985-67020 layout
function isDefined(value) {
  return value !== undefined;
}
//@ chunk-p2qwpk2k.js:67020-67069 fingerprint (2.1.88 match: _temp5, 1)
function isNotAddNewRule(opt) {
  return opt.value !== "add-new-rule";
}
//@ chunk-p2qwpk2k.js:67069-67101 file-local
function optionValue(opt) {
  return opt.value;
}
//@ chunk-p2qwpk2k.js:67101-67146 layout
function trimTrailingNewlines(text) {
  return text.replace(/\n+$/, "");
}
//@ chunk-p2qwpk2k.js:67146-67196 layout
function isNotEnvSection(rule) {
  return rule.section !== "environment";
}
//@ chunk-p2qwpk2k.js:67196-67408 fingerprint (2.1.88 match: RuleSourceText, 1)
function RuleSourceText(props) {
  let $ = useMemoCache(4);
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
function escapeAsUnicode(text) {
  return Array.from(
    {
      length: text.length,
    },
    (unused, index) => `\\u${text.charCodeAt(index).toString(16).padStart(4, "0")}`,
  ).join("");
}
//@ chunk-p2qwpk2k.js:67590-68151 layout
/**
 * 生成"只批准这些精确命令/调用"的消息，列出 JSON 字符串化的命令，并说明不覆盖其他调用或附加选项（关沙箱、网络、后台）。
 */
function buildExactRetryGrantMessage(rows, index) {
  let mapped = rows.map((row) =>
    jsonStringify(row.command ?? row.rawInput ?? quotedReason(row, index).text).replace(
      INVISIBLE_CHAR_RE,
      escapeAsUnicode,
    ),
  );
  let targetWord = rows.every((state) => state.command !== undefined) ? "command" : "call";
  let label = rows.length === 1;
  let targetPhrase = label ? `this exact ${targetWord}` : `these exact ${targetWord}s`;
  return `Permission granted for ${targetPhrase} only, ${label ? "as one whole string" : "each as one whole string"}: ${mapped.join(", ")}. This does not approve any other ${targetWord}, any part of ${label ? "this one" : "these"}, or running ${label ? "it" : "them"} with added options such as turning off the sandbox, extra network access, or running in the background. You may now retry ${targetPhrase} if you would like.`;
}
//@ chunk-p2qwpk2k.js:68151-68162 layout
var MAX_COMMAND_TEXT = 200;
//@ chunk-p2qwpk2k.js:68162-68257 layout
function ruleCommandTexts(rows, source) {
  return rows.map((row) =>
    truncateToWidth(
      replaceLineBreaks(displayField(row.command?.trim() ?? quotedReason(row, source).text.trim()).text),
      MAX_COMMAND_TEXT,
    ),
  );
}
//@ chunk-p2qwpk2k.js:68257-68321 layout
function quoteRuleIfBracketed(ruleText) {
  return /[[\]]/.test(ruleText) && !ruleText.startsWith('"') ? jsonStringify(ruleText) : ruleText;
}
//@ chunk-p2qwpk2k.js:68321-68423 fingerprint (2.1.88 match: getRuleBehaviorLabel, 1)
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
//@ chunk-p2qwpk2k.js:68423-70911 fingerprint (2.1.88 match: RuleDetails, 0.466)
function RuleDetails(props) {
  let $ = useMemoCache(37);
  let { rule, onDelete, onCancel } = props;
  let keybindingOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    keybindingOptions = {
      context: "Confirmation",
    };
    $[0] = keybindingOptions;
  } else keybindingOptions = $[0];
  useKeybinding("confirm:no", onCancel, keybindingOptions);
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
  let ruleTextElement = t6;
  let infoBox;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    infoBox = jsxProd_default(Box, {
      marginLeft: 3,
      children: jsxProd_default(AgentNavigationFooter, {
        children: jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "cancel",
        }),
      }),
    });
    $[13] = infoBox;
  } else infoBox = $[13];
  let infoBoxValue = infoBox;
  if (rule.source === "policySettings") {
    let policyNote;
    if ($[14] === MEMO_CACHE_SENTINEL) {
      policyNote = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "This rule is configured by managed settings and cannot be modified.",
          `
`,
          "Contact your system administrator for more information.",
        ],
      });
      $[14] = policyNote;
    } else policyNote = $[14];
    let policyView;
    if ($[15] !== ruleTextElement) {
      policyView = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [ruleTextElement, policyNote],
          }),
          infoBoxValue,
        ],
      });
      $[15] = ruleTextElement;
      $[16] = policyView;
    } else policyView = $[16];
    return policyView;
  }
  if (rule.source === "flagSettings" || rule.source === "command") {
    const readOnlySource = rule.source === "flagSettings" ? "the --settings flag" : "a slash command";
    let readOnlyNote;
    if ($[17] !== readOnlySource) {
      readOnlyNote = jsxProd_default_2(Text, {
        italic: true,
        children: [
          "This rule comes from a read-only source (",
          readOnlySource,
          ") and cannot be modified here.",
        ],
      });
      $[17] = readOnlySource;
      $[18] = readOnlyNote;
    } else readOnlyNote = $[18];
    let t11;
    if ($[19] !== ruleTextElement || $[20] !== readOnlyNote) {
      t11 = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(ShutdownRequestDisplay, {
            color: "permission",
            title: "Rule details",
            children: [ruleTextElement, readOnlyNote],
          }),
          infoBoxValue,
        ],
      });
      $[19] = ruleTextElement;
      $[20] = readOnlyNote;
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
  let confirmSelectElement;
  if ($[27] !== onCancel || $[28] !== onDelete) {
    confirmSelectElement = jsxProd_default(ConfirmSelect, {
      focus: "cancel",
      hideIndexes: true,
      onConfirm: onDelete,
      onCancel,
    });
    $[27] = onCancel;
    $[28] = onDelete;
    $[29] = confirmSelectElement;
  } else confirmSelectElement = $[29];
  let deleteBox;
  if ($[30] !== ruleTextElement || $[31] !== confirmSelectElement || $[32] !== t9) {
    deleteBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      borderStyle: "round",
      paddingLeft: 1,
      paddingRight: 1,
      borderColor: "error",
      children: [t9, ruleTextElement, t10, confirmSelectElement],
    });
    $[30] = ruleTextElement;
    $[31] = confirmSelectElement;
    $[32] = t9;
    $[33] = deleteBox;
  } else deleteBox = $[33];
  let marginBox;
  if ($[34] === MEMO_CACHE_SENTINEL) {
    marginBox = jsxProd_default(Box, {
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
    $[34] = marginBox;
  } else marginBox = $[34];
  let result;
  if ($[35] !== deleteBox) {
    result = jsxProd_default_2(Fragment, {
      children: [deleteBox, marginBox],
    });
    $[35] = deleteBox;
    $[36] = result;
  } else result = $[36];
  return result;
}
//@ chunk-p2qwpk2k.js:70911-72535 fingerprint (2.1.88 match: RulesTabContent, 0.883)
function RulesTabContent(props) {
  let $ = useMemoCache(37);
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
  let headerRef = useRef(null);
  let t0;
  let t1;
  if ($[0] !== blurHeader || $[1] !== headerFocused || $[2] !== isSearchMode) {
    t0 = () => {
      if (isSearchMode && headerFocused) blurHeader(headerRef.current);
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
  useEffect(t0, t1);
  useFocusOnMount(headerRef, isSearchMode);
  let effect = headerFocused && !isSearchMode;
  let effectDeps;
  let t3;
  if ($[5] !== effect || $[6] !== onHeaderFocusChange) {
    effectDeps = () => {
      onHeaderFocusChange(effect);
    };
    t3 = [effect, onHeaderFocusChange];
    $[5] = effect;
    $[6] = onHeaderFocusChange;
    $[7] = effectDeps;
    $[8] = t3;
  } else {
    effectDeps = $[7];
    t3 = $[8];
  }
  useEffect(effectDeps, t3);
  const tabIndex = isSearchMode ? 0 : undefined;
  let onFocus;
  if ($[9] !== blurHeader || $[10] !== isSearchMode) {
    onFocus = isSearchMode ? () => blurHeader(headerRef.current) : undefined;
    $[9] = blurHeader;
    $[10] = isSearchMode;
    $[11] = onFocus;
  } else onFocus = $[11];
  const isFocused_2 = isSearchMode && !headerFocused;
  let boxElement;
  if (
    $[12] !== cursorOffset ||
    $[13] !== isFocused ||
    $[14] !== searchQuery ||
    $[15] !== isFocused_2 ||
    $[16] !== tabWidth
  ) {
    boxElement = jsxProd_default(Box, {
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
    $[17] = boxElement;
  } else boxElement = $[17];
  let onChange;
  if (
    $[18] !== blurHeader ||
    $[19] !== headerFocused ||
    $[20] !== onHeaderFocusChange ||
    $[21] !== onSelect
  ) {
    onChange = (listElement) => {
      if (headerFocused) {
        blurHeader();
        onHeaderFocusChange(false);
      }
      onSelect(listElement);
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
  let modelSelectorElement;
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
    modelSelectorElement = jsxProd_default(ModelSelector, {
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
    $[31] = modelSelectorElement;
  } else modelSelectorElement = $[31];
  let t9;
  if ($[32] !== modelSelectorElement || $[33] !== tabIndex || $[34] !== onFocus || $[35] !== boxElement) {
    t9 = jsxProd_default_2(Box, {
      ref: headerRef,
      flexDirection: "column",
      tabIndex,
      onFocus,
      children: [boxElement, modelSelectorElement],
    });
    $[32] = modelSelectorElement;
    $[33] = tabIndex;
    $[34] = onFocus;
    $[35] = boxElement;
    $[36] = t9;
  } else t9 = $[36];
  return t9;
}
//@ chunk-p2qwpk2k.js:72535-73563 fingerprint (2.1.88 match: PermissionRulesTab, 0.911)
function PermissionRulesTab(t0) {
  let $ = useMemoCache(23);
  let header;
  let rows;
  let footer;
  let activeTab;
  if ($[0] !== t0) {
    ({ tab: activeTab, getRulesOptions: header, handleToolSelect: rows, ...footer } = t0);
    $[0] = t0;
    $[1] = header;
    $[2] = rows;
    $[3] = footer;
    $[4] = activeTab;
  } else {
    header = $[1];
    rows = $[2];
    footer = $[3];
    activeTab = $[4];
  }
  const flexShrink = activeTab === "allow" ? 0 : undefined;
  let t8;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t8 = {
      allow: "Claude Code won't ask before using allowed tools.",
      ask: "Claude Code will always ask for confirmation before using these tools.",
      deny: "Claude Code will always reject requests to use denied tools.",
    };
    $[5] = t8;
  } else t8 = $[5];
  const children = t8[activeTab];
  let textElement;
  if ($[6] !== children) {
    textElement = jsxProd_default(Text, {
      children,
    });
    $[6] = children;
    $[7] = textElement;
  } else textElement = $[7];
  let headerText;
  if ($[8] !== header || $[9] !== footer.searchQuery || $[10] !== activeTab) {
    headerText = header(activeTab, footer.searchQuery);
    $[8] = header;
    $[9] = footer.searchQuery;
    $[10] = activeTab;
    $[11] = headerText;
  } else headerText = $[11];
  let onSelect;
  if ($[12] !== rows || $[13] !== activeTab) {
    onSelect = (v) => rows(v, activeTab);
    $[12] = rows;
    $[13] = activeTab;
    $[14] = onSelect;
  } else onSelect = $[14];
  let rulesTabContentElement;
  if ($[15] !== footer || $[16] !== headerText.options || $[17] !== onSelect) {
    rulesTabContentElement = jsxProd_default(RulesTabContent, {
      options: headerText.options,
      onSelect,
      ...footer,
    });
    $[15] = footer;
    $[16] = headerText.options;
    $[17] = onSelect;
    $[18] = rulesTabContentElement;
  } else rulesTabContentElement = $[18];
  let t7;
  if ($[19] !== flexShrink || $[20] !== textElement || $[21] !== rulesTabContentElement) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink,
      children: [textElement, rulesTabContentElement],
    });
    $[19] = flexShrink;
    $[20] = textElement;
    $[21] = rulesTabContentElement;
    $[22] = t7;
  } else t7 = $[22];
  return t7;
}
//@ chunk-p2qwpk2k.js:73563-93185 fingerprint (2.1.88 match: PermissionRuleList, 0.52)
/**
 * /permissions 界面：Recent（auto 模式拦截）/Allow/Ask/Deny/Workspace 标签，规则按来源显示，可查看详情、删除（policySettings 不可删）、新增规则与目录。
 */
function PermissionRuleList(props) {
  let $ = useMemoCache(241);
  let { onExit, initialTab, onRetryDenials, isMidTurn } = props;
  let { storageV5 } = useTheme_2();
  let { getDenials, removeDenial } = statusSnapshot();
  let rowTexts = statusRowTexts();
  let denials;
  if ($[0] !== getDenials) {
    denials = getDenials();
    $[0] = getDenials;
    $[1] = denials;
  } else denials = $[1];
  let hasDenials = denials.length > 0;
  let initialTab_2 = initialTab ?? (hasDenials ? "recent" : "allow");
  let [activeTab, setActiveTab] = useState(initialTab_2);
  let emptyList;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    emptyList = [];
    $[2] = emptyList;
  } else emptyList = $[2];
  let [messages, pushMessage] = useState(emptyList);
  let toolPermissionContext = useAppState(selectToolPermissionContext);
  let setAppState = useSetAppState();
  let isTerminalFocused = useTerminalFocus();
  let [themeColor] = useTheme();
  let exitingRef = useRef(false);
  let initialDenialState;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    initialDenialState = {
      approved: new Set(),
      retry: new Set(),
      denials: [],
      canMark: true,
    };
    $[3] = initialDenialState;
  } else initialDenialState = $[3];
  let denialStateRef = useRef(initialDenialState);
  let [escapeHint, setEscapeHint] = useState();
  let [canMark, setCanMark] = useState(true);
  let onDenialStateChange;
  if ($[4] !== isMidTurn) {
    onDenialStateChange = (s_0) => {
      denialStateRef.current = s_0;
      setEscapeHint(
        s_0.retry.size > 0
          ? isMidTurn
            ? "Esc to tell Claude next prompt"
            : `Esc to retry ${s_0.retry.size} blocked`
          : s_0.approved.size > 0
            ? `Esc to approve ${s_0.approved.size} blocked`
            : undefined,
      );
      setCanMark(s_0.canMark);
    };
    $[4] = isMidTurn;
    $[5] = onDenialStateChange;
  } else onDenialStateChange = $[5];
  let onDenialStateChangeStable = onDenialStateChange;
  let [selectedRule, setSelectedRule] = useState();
  let [lastFocusedRuleKey, setLastFocusedRuleKey] = useState();
  let [addingRuleToTab, setAddingRuleToTab] = useState(null);
  let [validatedRule, setValidatedRule] = useState(null);
  let [isAddingWorkspaceDirectory, setIsAddingWorkspaceDirectory] = useState(false);
  let [removingDirectory, setRemovingDirectory] = useState(null);
  let [isSearchMode, setIsSearchMode] = useState(false);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let { rows, columns } = useScrollViewportSize(useTerminalSize());
  let currentSize;
  if ($[6] !== columns || $[7] !== rows) {
    currentSize = {
      rows,
      columns,
    };
    $[6] = columns;
    $[7] = rows;
    $[8] = currentSize;
  } else currentSize = $[8];
  let sizeRef = useRef(currentSize);
  let shrinkEffect;
  if (
    $[9] !== columns ||
    $[10] !== onDenialStateChangeStable ||
    $[11] !== isScreenReaderEnabled ||
    $[12] !== rows
  ) {
    shrinkEffect = () => {
      let didShrink = rows < sizeRef.current.rows || columns < sizeRef.current.columns;
      sizeRef.current = {
        rows,
        columns,
      };
      if (didShrink && !isScreenReaderEnabled)
        onDenialStateChangeStable({
          ...denialStateRef.current,
          approved: new Set(),
          retry: new Set(),
        });
    };
    $[9] = columns;
    $[10] = onDenialStateChangeStable;
    $[11] = isScreenReaderEnabled;
    $[12] = rows;
    $[13] = shrinkEffect;
  } else shrinkEffect = $[13];
  useLayoutEffect(shrinkEffect);
  let [autoModeFocusKey, setAutoModeFocusKey] = useState();
  let [builtinRulesState, setBuiltinRulesState] = useState(selectMode);
  let [autoModeEntries, setAutoModeEntries] = useState(selectWorkspaceDirs);
  let [dialogState, setDialogState] = useState(null);
  let [headerFocused, setHeaderFocused] = useState(!hasDenials);
  let handleHeaderFocusChange;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    handleHeaderFocusChange = (focused) => {
      setHeaderFocused(focused);
    };
    $[14] = handleHeaderFocusChange;
  } else handleHeaderFocusChange = $[14];
  let handleHeaderFocusChange_2 = handleHeaderFocusChange;
  let groupRules = rulesBySourceMap;
  let allow;
  if ($[15] !== toolPermissionContext) {
    allow = groupRules(getAllowRules(toolPermissionContext));
    $[15] = toolPermissionContext;
    $[16] = allow;
  } else allow = $[16];
  let deny;
  if ($[17] !== toolPermissionContext) {
    deny = groupRules(getDenyRules(toolPermissionContext));
    $[17] = toolPermissionContext;
    $[18] = deny;
  } else deny = $[18];
  let ask;
  if ($[19] !== toolPermissionContext) {
    ask = groupRules(getAskRules(toolPermissionContext));
    $[19] = toolPermissionContext;
    $[20] = ask;
  } else ask = $[20];
  let rulesByTab;
  if ($[21] !== ask || $[22] !== allow || $[23] !== deny) {
    rulesByTab = {
      allow,
      deny,
      ask,
    };
    $[21] = ask;
    $[22] = allow;
    $[23] = deny;
    $[24] = rulesByTab;
  } else rulesByTab = $[24];
  let rulesByTab_2 = rulesByTab;
  let getRulesOptions;
  if ($[25] !== rulesByTab_2) {
    getRulesOptions = (tab, t7) => {
      let query = t7 === undefined ? "" : t7;
      let rulesByKey = tab === "allow" || tab === "deny" || tab === "ask" ? rulesByTab_2[tab] : new Map();
      let options = [];
      if (tab !== "workspace" && tab !== "recent" && tab !== "automode" && !query)
        options.push({
          label: `Add a new rule${figures_default.ellipsis}`,
          value: "add-new-rule",
        });
      let sortedRuleKeys = Array.from(rulesByKey.keys()).sort((keyA, keyB) => {
        let ruleA = rulesByKey.get(keyA);
        let ruleB = rulesByKey.get(keyB);
        if (ruleA && ruleB) {
          let ruleAString = formatPermissionRule(ruleA.ruleValue).toLowerCase();
          let ruleBString = formatPermissionRule(ruleB.ruleValue).toLowerCase();
          return ruleAString.localeCompare(ruleBString);
        }
        return 0;
      });
      let lowerQuery = query.toLowerCase();
      let matchedRules = [];
      for (const ruleKey of sortedRuleKeys) {
        let rule = rulesByKey.get(ruleKey);
        if (rule) {
          let ruleString = formatPermissionRule(rule.ruleValue);
          if (query && !ruleString.toLowerCase().includes(lowerQuery)) {
            continue;
          }
          matchedRules.push({
            ruleKey,
            ruleString,
          });
        }
      }
      let labels = uniqueLabels(matchedRules.map(ruleStringOf), describeRule);
      for (const [index, entry] of matchedRules.entries())
        options.push({
          label: labels[index],
          value: entry.ruleKey,
        });
      return {
        options,
        rulesByKey,
      };
    };
    $[25] = rulesByTab_2;
    $[26] = getRulesOptions;
  } else getRulesOptions = $[26];
  let getRulesOptionsStable = getRulesOptions;
  let canInteract =
    !selectedRule &&
    !addingRuleToTab &&
    !validatedRule &&
    !isAddingWorkspaceDirectory &&
    !removingDirectory &&
    !dialogState;
  const isActive = canInteract && isSearchMode;
  let onExit_2;
  if ($[27] === MEMO_CACHE_SENTINEL) {
    onExit_2 = () => {
      setIsSearchMode(false);
    };
    $[27] = onExit_2;
  } else onExit_2 = $[27];
  let searchOptions;
  if ($[28] !== isActive) {
    searchOptions = {
      isActive,
      onExit: onExit_2,
    };
    $[28] = isActive;
    $[29] = searchOptions;
  } else searchOptions = $[29];
  let {
    query: searchQuery,
    setQuery: setSearchQuery,
    cursorOffset: searchCursorOffset,
    handleKeyDown,
    handlePaste,
  } = useSearchInput(searchOptions);
  let onKeyDown;
  if (
    $[30] !== isSearchMode ||
    $[31] !== canInteract ||
    $[32] !== handleKeyDown ||
    $[33] !== activeTab ||
    $[34] !== setSearchQuery
  ) {
    onKeyDown = (e) => {
      if (!canInteract) {
        return;
      }
      if (isSearchMode) {
        handleKeyDown(e);
        return;
      }
      if (e.ctrl || e.meta) {
        return;
      }
      if (activeTab === "recent" || activeTab === "workspace") {
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
    $[31] = canInteract;
    $[32] = handleKeyDown;
    $[33] = activeTab;
    $[34] = setSearchQuery;
    $[35] = onKeyDown;
  } else onKeyDown = $[35];
  let onKeyDown_2 = onKeyDown;
  let handleToolSelect;
  if ($[36] !== getRulesOptionsStable) {
    handleToolSelect = (selectedValue, tab) => {
      let { rulesByKey } = getRulesOptionsStable(tab);
      if (selectedValue === "add-new-rule") {
        setAddingRuleToTab(tab);
        return;
      } else {
        setSelectedRule(rulesByKey.get(selectedValue));
        return;
      }
    };
    $[36] = getRulesOptionsStable;
    $[37] = handleToolSelect;
  } else handleToolSelect = $[37];
  let handleToolSelect_2 = handleToolSelect;
  let onCancelAddRule;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    onCancelAddRule = () => {
      setAddingRuleToTab(null);
    };
    $[38] = onCancelAddRule;
  } else onCancelAddRule = $[38];
  let onCancel = onCancelAddRule;
  let onSubmitRule;
  if ($[39] === MEMO_CACHE_SENTINEL) {
    onSubmitRule = (ruleValue, ruleBehavior) => {
      setValidatedRule({
        ruleValue,
        ruleBehavior,
      });
      setAddingRuleToTab(null);
    };
    $[39] = onSubmitRule;
  } else onSubmitRule = $[39];
  let onSubmit = onSubmitRule;
  let onAddRules;
  if ($[40] !== themeColor) {
    onAddRules = (rules, unreachable) => {
      setValidatedRule(null);
      for (const rule of rules)
        pushMessage((prev) => [
          ...prev,
          `Added ${rule.ruleBehavior} rule ${sequential.bold(consentRowLabel(formatPermissionRule(rule.ruleValue)))}`,
        ]);
      for (const shadow of unreachable) {
        let severity = shadow.shadowType === "deny" ? "blocked" : "shadowed";
        pushMessage((prev) => [
          ...prev,
          color(
            "warning",
            themeColor,
          )(
            `${figures_default.warning} Warning: ${consentRowLabel(formatPermissionRule(shadow.rule.ruleValue))} is ${severity}`,
          ),
          sequential.dim(`  ${shadow.reason}`),
          sequential.dim(`  Fix: ${shadow.fix}`),
        ]);
      }
    };
    $[40] = themeColor;
    $[41] = onAddRules;
  } else onAddRules = $[41];
  let onAddRules_2 = onAddRules;
  let onCancelValidated;
  if ($[42] === MEMO_CACHE_SENTINEL) {
    onCancelValidated = () => {
      setValidatedRule(null);
    };
    $[42] = onCancelValidated;
  } else onCancelValidated = $[42];
  let onCancel_2 = onCancelValidated;
  let onRequestAddDirectory;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    onRequestAddDirectory = () => setIsAddingWorkspaceDirectory(true);
    $[43] = onRequestAddDirectory;
  } else onRequestAddDirectory = $[43];
  let onRequestAddDirectory_2 = onRequestAddDirectory;
  let onRequestRemoveDirectory;
  if ($[44] === MEMO_CACHE_SENTINEL) {
    onRequestRemoveDirectory = (path) => setRemovingDirectory(path);
    $[44] = onRequestRemoveDirectory;
  } else onRequestRemoveDirectory = $[44];
  let onRequestRemoveDirectory_2 = onRequestRemoveDirectory;
  let onExitHandler;
  if (
    $[45] !== messages ||
    $[46] !== onExit ||
    $[47] !== onRetryDenials ||
    $[48] !== removeDenial ||
    $[49] !== rowTexts
  ) {
    onExitHandler = () => {
      if (exitingRef.current) {
        return;
      }
      exitingRef.current = true;
      let s_1 = denialStateRef.current;
      let denialsFor = (set) =>
        Array.from(set)
          .map((idx) => s_1.denials[idx])
          .filter(isDefined);
      let retryDenials = denialsFor(s_1.retry);
      if (retryDenials.length > 0) {
        onRetryDenials(ruleCommandTexts(retryDenials, rowTexts), messages);
        onExit(undefined, {
          shouldQuery: true,
          metaMessages: [buildExactRetryGrantMessage(retryDenials, rowTexts)],
          metaMessagesOrigin: {
            kind: "auto-continuation",
          },
        });
        return;
      }
      let approvedDenials = denialsFor(s_1.approved);
      if (approvedDenials.length > 0 || messages.length > 0) {
        for (const approvedDenial of approvedDenials) removeDenial(approvedDenial);
        if (approvedDenials.length > 0) onRetryDenials(ruleCommandTexts(approvedDenials, rowTexts), []);
        onExit(
          messages.join(`
`),
          approvedDenials.length > 0
            ? {
                metaMessages: [buildExactRetryGrantMessage(approvedDenials, rowTexts)],
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
    $[45] = messages;
    $[46] = onExit;
    $[47] = onRetryDenials;
    $[48] = removeDenial;
    $[49] = rowTexts;
    $[50] = onExitHandler;
  } else onExitHandler = $[50];
  let exitHandler = onExitHandler;
  const isActive_2 = canInteract && !isSearchMode;
  let exitKeyOptions;
  if ($[51] !== isActive_2) {
    exitKeyOptions = {
      context: "Settings",
      isActive: isActive_2,
    };
    $[51] = isActive_2;
    $[52] = exitKeyOptions;
  } else exitKeyOptions = $[52];
  useKeybinding("confirm:no", exitHandler, exitKeyOptions);
  let globalExitHandler;
  if ($[53] !== messages || $[54] !== onExit) {
    globalExitHandler = () => {
      if (exitingRef.current) {
        return;
      }
      exitingRef.current = true;
      if (messages.length > 0) {
        onExit(
          messages.join(`
`),
        );
        return;
      }
      onExit("Permissions dialog dismissed", {
        display: "system",
      });
    };
    $[53] = messages;
    $[54] = onExit;
    $[55] = globalExitHandler;
  } else globalExitHandler = $[55];
  let globalExitKeybindings = useGlobalExitKeybindings(globalExitHandler, undefined, canInteract);
  let onDelete;
  if (
    $[56] !== getRulesOptionsStable ||
    $[57] !== selectedRule ||
    $[58] !== setAppState ||
    $[59] !== storageV5 ||
    $[60] !== toolPermissionContext
  ) {
    onDelete = () => {
      if (!selectedRule) {
        return;
      }
      let { options } = getRulesOptionsStable(selectedRule.ruleBehavior);
      let selectedKey = jsonStringify(selectedRule);
      let ruleKeys = options.filter(isNotAddNewRule).map(optionValue);
      let currentIndex = ruleKeys.indexOf(selectedKey);
      let nextFocusKey;
      if (currentIndex !== -1) {
        if (currentIndex < ruleKeys.length - 1) nextFocusKey = ruleKeys[currentIndex + 1];
        else if (currentIndex > 0) nextFocusKey = ruleKeys[currentIndex - 1];
      }
      setLastFocusedRuleKey(nextFocusKey);
      let ruleLabel = consentRowLabel(formatPermissionRule(selectedRule.ruleValue));
      let ruleBehavior = selectedRule.ruleBehavior;
      let quotedLabel = quoteRuleIfBracketed(ruleLabel);
      deletePermissionRule({
        rule: selectedRule,
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
          pushMessage((prev) => [...prev, `Deleted ${ruleBehavior} rule ${sequential.bold(ruleLabel)}`]);
          announce(`[Deleted ${ruleBehavior} rule ${quotedLabel}]`);
        })
        .catch((error) => {
          logError(error);
          pushMessage((prev) => [
            ...prev,
            `Could not delete ${sequential.bold(ruleLabel)} \u2014 the rule is unchanged`,
          ]);
          announce(`[Could not delete ${quotedLabel} \u2014 the rule is unchanged]`);
        });
      setSelectedRule(undefined);
    };
    $[56] = getRulesOptionsStable;
    $[57] = selectedRule;
    $[58] = setAppState;
    $[59] = storageV5;
    $[60] = toolPermissionContext;
    $[61] = onDelete;
  } else onDelete = $[61];
  let onDelete_2 = onDelete;
  let editEnvironment;
  if ($[62] !== storageV5) {
    editEnvironment = (draftLines, expected) => {
      if (resolveEditorCommand() === undefined) {
        setDialogState({
          mode: "env-problem",
          problem:
            "No editor is configured \u2014 set $VISUAL or $EDITOR, then reopen /permissions to edit the environment.",
          draftLines,
          expected,
          canReopen: false,
        });
        return;
      }
      let editResult = editEnvironmentInEditor(draftLines);
      if (editResult.problem !== null) {
        setDialogState({
          mode: "env-problem",
          problem: editResult.problem,
          draftLines,
          expected,
          canReopen: true,
        });
        return;
      }
      if (editResult.content === null) {
        setDialogState({
          mode: "env-problem",
          problem:
            "The environment could not be opened for editing: this session has no session directory to hold the working file. Edit autoMode.environment in your settings file directly.",
          draftLines,
          expected,
          canReopen: false,
        });
        return;
      }
      let trimTrailing = trimTrailingNewlines;
      if (
        trimTrailing(editResult.content) ===
        trimTrailing(
          draftLines.join(`
`),
        )
      ) {
        setDialogState({
          mode: "env-problem",
          problem:
            'No changes detected \u2014 nothing was saved. If your editor opened in a separate window without waiting, configure it to wait (for example "code --wait"), then reopen.',
          draftLines,
          expected,
          canReopen: true,
        });
        return;
      }
      let ruleProblem = ruleTextProblem(editResult.content);
      if (ruleProblem !== null) {
        setDialogState({
          mode: "env-problem",
          problem: ruleProblem,
          draftLines: editResult.content.split(`
`),
          expected,
          canReopen: true,
        });
        return;
      }
      saveEnvironmentDocument(
        editResult.content.split(`
`),
        expected,
        storageV5,
      )
        .then(() => {
          setAutoModeEntries(collectAutoModeRuleEntries());
          setBuiltinRulesState(classifyAutoModeRuleSource());
          pushMessage((messages) => [
            ...messages,
            expected.length === 0
              ? "Replaced the built-in auto mode environment with your own document"
              : "Saved your auto mode environment document",
          ]);
        })
        .catch((error) => {
          logForDebugging(`auto mode env save failed: ${String(error)}`, {
            level: "error",
          });
          setAutoModeEntries(collectAutoModeRuleEntries());
          setBuiltinRulesState(classifyAutoModeRuleSource());
          pushMessage((messages) => [
            ...messages,
            `Could not save the environment \u2014 ${error instanceof Error ? error.message : "nothing was changed"}`,
          ]);
        });
      setDialogState(null);
    };
    $[62] = storageV5;
    $[63] = editEnvironment;
  } else editEnvironment = $[63];
  let editEnvironmentStable = editEnvironment;
  let onEditEnvironment;
  if ($[64] !== editEnvironmentStable) {
    onEditEnvironment = () => {
      let userEnvironmentEntries = readUserEnvironmentEntries();
      if (userEnvironmentEntries.length === 0 && classifyAutoModeRuleSource().environment.enabled)
        setDialogState({
          mode: "env-first-confirm",
        });
      else editEnvironmentStable(userEnvironmentEntries, userEnvironmentEntries);
    };
    $[64] = editEnvironmentStable;
    $[65] = onEditEnvironment;
  } else onEditEnvironment = $[65];
  let startEditEnvironment = onEditEnvironment;
  if (dialogState?.mode === "pick-section") {
    let onCancel;
    if ($[66] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setDialogState(null);
      $[66] = onCancel;
    } else onCancel = $[66];
    let pickSectionDialog;
    if ($[67] !== startEditEnvironment) {
      pickSectionDialog = jsxProd_default(PickRuleSectionDialog, {
        onCancel,
        onPick: (section) => {
          if (section === "environment" && alwaysTrueFlag()) {
            startEditEnvironment();
            return;
          }
          setDialogState({
            mode: "input",
            section,
          });
        },
      });
      $[67] = startEditEnvironment;
      $[68] = pickSectionDialog;
    } else pickSectionDialog = $[68];
    return pickSectionDialog;
  }
  if (dialogState?.mode === "env-first-confirm") {
    let onCancel;
    let replaceWarning;
    if ($[69] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setDialogState(null);
      replaceWarning = jsxProd_default(Text, {
        wrap: "wrap-trim",
        children:
          "Writing your own environment replaces the built-in default document \u2014 the auto mode context that defines trusted hosts, sensitive targets, and repository scope. The editor starts from the full default text so you can edit rather than rewrite; deleting all your environment entries later restores the default.",
      });
      $[69] = onCancel;
      $[70] = replaceWarning;
    } else {
      onCancel = $[69];
      replaceWarning = $[70];
    }
    let onConfirm;
    if ($[71] !== editEnvironmentStable) {
      onConfirm = () => editEnvironmentStable(getDefaultExternalAutoModeRules().environment ?? [], []);
      $[71] = editEnvironmentStable;
      $[72] = onConfirm;
    } else onConfirm = $[72];
    let onCancel_2;
    if ($[73] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => setDialogState(null);
      $[73] = onCancel_2;
    } else onCancel_2 = $[73];
    let replaceDialog;
    if ($[74] !== onConfirm) {
      replaceDialog = jsxProd_default_2(Dialog, {
        title: "Replace the built-in environment?",
        color: "permission",
        onCancel,
        children: [
          replaceWarning,
          jsxProd_default(ConfirmSelect, {
            focus: "cancel",
            hideIndexes: true,
            onConfirm,
            onCancel: onCancel_2,
          }),
        ],
      });
      $[74] = onConfirm;
      $[75] = replaceDialog;
    } else replaceDialog = $[75];
    return replaceDialog;
  }
  if (dialogState?.mode === "env-problem") {
    let { problem, draftLines, expected, canReopen } = dialogState;
    let onCancel;
    if ($[76] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setDialogState(null);
      $[76] = onCancel;
    } else onCancel = $[76];
    let problemText;
    if ($[77] !== problem) {
      problemText = jsxProd_default(Text, {
        color: "error",
        wrap: "wrap-trim",
        children: problem,
      });
      $[77] = problem;
      $[78] = problemText;
    } else problemText = $[78];
    let reopenOptions;
    if ($[79] !== canReopen) {
      reopenOptions = canReopen
        ? [
            {
              label: `Reopen in ${getShortEditorName() ?? "your editor"}`,
              value: "reopen",
            },
          ]
        : [];
      $[79] = canReopen;
      $[80] = reopenOptions;
    } else reopenOptions = $[80];
    let cancelOption;
    if ($[81] === MEMO_CACHE_SENTINEL) {
      cancelOption = {
        label: "Cancel",
        value: "cancel",
      };
      $[81] = cancelOption;
    } else cancelOption = $[81];
    let options;
    if ($[82] !== reopenOptions) {
      options = [...reopenOptions, cancelOption];
      $[82] = reopenOptions;
      $[83] = options;
    } else options = $[83];
    let onChange;
    if ($[84] !== draftLines || $[85] !== expected || $[86] !== editEnvironmentStable) {
      onChange = (toolPermissionContext_1) => {
        if (toolPermissionContext_1 === "reopen") editEnvironmentStable(draftLines, expected);
        else setDialogState(null);
      };
      $[84] = draftLines;
      $[85] = expected;
      $[86] = editEnvironmentStable;
      $[87] = onChange;
    } else onChange = $[87];
    let onCancel_2;
    if ($[88] === MEMO_CACHE_SENTINEL) {
      onCancel_2 = () => setDialogState(null);
      $[88] = onCancel_2;
    } else onCancel_2 = $[88];
    let problemSelector;
    if ($[89] !== options || $[90] !== onChange) {
      problemSelector = jsxProd_default(ModelSelector, {
        options,
        onChange,
        onCancel: onCancel_2,
      });
      $[89] = options;
      $[90] = onChange;
      $[91] = problemSelector;
    } else problemSelector = $[91];
    let problemDialog;
    if ($[92] !== problemText || $[93] !== problemSelector) {
      problemDialog = jsxProd_default_2(Dialog, {
        title: "Edit environment",
        color: "permission",
        onCancel,
        children: [problemText, problemSelector],
      });
      $[92] = problemText;
      $[93] = problemSelector;
      $[94] = problemDialog;
    } else problemDialog = $[94];
    return problemDialog;
  }
  if (dialogState?.mode === "input") {
    let { section, editing } = dialogState;
    let sectionLabel;
    if ($[95] !== section) {
      sectionLabel = getAutoModeRuleCategoryLabel(section).toLowerCase();
      $[95] = section;
      $[96] = sectionLabel;
    } else sectionLabel = $[96];
    let sectionLabel_2 = sectionLabel;
    const initialValue = editing?.text;
    let onCancel;
    if ($[97] !== editing) {
      onCancel = () =>
        setDialogState(
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
    if ($[99] !== editing || $[100] !== sectionLabel_2 || $[101] !== section || $[102] !== storageV5) {
      onSubmit = (prev_3) => {
        let normalizedText = normalizeRuleText(prev_3);
        if (editing && normalizedText === editing.text) {
          setDialogState(null);
          return;
        }
        if (editing)
          updateAutoModeRule(section, editing.index, editing.text, normalizedText, storageV5)
            .then(() => {
              setAutoModeEntries(collectAutoModeRuleEntries());
              setBuiltinRulesState(classifyAutoModeRuleSource());
              pushMessage((messages) => [
                ...messages,
                `Updated auto mode ${sectionLabel_2} rule ${sequential.bold(replaceLineBreaks(displayField(normalizedText).text))}`,
              ]);
            })
            .catch((error) => {
              logForDebugging(`auto mode rule update failed: ${String(error)}`, {
                level: "error",
              });
              setAutoModeEntries(collectAutoModeRuleEntries());
              setBuiltinRulesState(classifyAutoModeRuleSource());
              pushMessage((messages) => [
                ...messages,
                `Could not update ${sequential.bold(replaceLineBreaks(displayField(editing.text).text))} \u2014 ${error instanceof Error ? error.message : "the rule is unchanged"}`,
              ]);
            });
        else
          addAutoModeRule(section, normalizedText, storageV5)
            .then(() => {
              setAutoModeEntries(collectAutoModeRuleEntries());
              setBuiltinRulesState(classifyAutoModeRuleSource());
              pushMessage((messages) => [
                ...messages,
                `Added auto mode ${sectionLabel_2} rule ${sequential.bold(replaceLineBreaks(displayField(normalizedText).text))}`,
              ]);
            })
            .catch((error) => {
              logForDebugging(`auto mode rule add failed: ${String(error)}`, {
                level: "error",
              });
              setAutoModeEntries(collectAutoModeRuleEntries());
              setBuiltinRulesState(classifyAutoModeRuleSource());
              pushMessage((messages) => [
                ...messages,
                `Could not add ${sequential.bold(replaceLineBreaks(displayField(normalizedText).text))} \u2014 ${error instanceof Error ? error.message : "nothing was saved"}`,
              ]);
            });
        setDialogState(null);
      };
      $[99] = editing;
      $[100] = sectionLabel_2;
      $[101] = section;
      $[102] = storageV5;
      $[103] = onSubmit;
    } else onSubmit = $[103];
    let ruleInput;
    if ($[104] !== section || $[105] !== initialValue || $[106] !== onCancel || $[107] !== onSubmit) {
      ruleInput = jsxProd_default(AutoModeRuleInput, {
        section,
        initialValue,
        onCancel,
        onSubmit,
      });
      $[104] = section;
      $[105] = initialValue;
      $[106] = onCancel;
      $[107] = onSubmit;
      $[108] = ruleInput;
    } else ruleInput = $[108];
    return ruleInput;
  }
  if (dialogState?.mode === "builtins") {
    let section = dialogState.section;
    let builtinState = builtinRulesState[section];
    let onToggle;
    if ($[109] !== section || $[110] !== builtinState.enabled || $[111] !== storageV5) {
      onToggle = () => {
        let nextEnabled = !builtinState.enabled;
        AUTO_MODE_RULE_EDIT_ERRORS(section, nextEnabled, storageV5)
          .then(() => {
            setAutoModeEntries(collectAutoModeRuleEntries());
            setBuiltinRulesState(classifyAutoModeRuleSource());
            pushMessage((messages) => [
              ...messages,
              `${nextEnabled ? "Enabled" : "Disabled"} the built-in auto mode ${getAutoModeRuleCategoryLabel(section).toLowerCase()} rules`,
            ]);
          })
          .catch((error) => {
            logForDebugging(`auto mode builtins toggle failed: ${String(error)}`, {
              level: "error",
            });
            setAutoModeEntries(collectAutoModeRuleEntries());
            setBuiltinRulesState(classifyAutoModeRuleSource());
            pushMessage((messages) => [
              ...messages,
              `Could not ${nextEnabled ? "enable" : "disable"} the built-in ${getAutoModeRuleCategoryLabel(section).toLowerCase()} rules \u2014 ${error instanceof Error ? error.message : "nothing was changed"}`,
            ]);
          });
        setDialogState(null);
      };
      $[109] = section;
      $[110] = builtinState.enabled;
      $[111] = storageV5;
      $[112] = onToggle;
    } else onToggle = $[112];
    let onCancel;
    if ($[113] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setDialogState(null);
      $[113] = onCancel;
    } else onCancel = $[113];
    let builtinSection;
    if ($[114] !== section || $[115] !== builtinState || $[116] !== onToggle) {
      builtinSection = jsxProd_default(BuiltinRulesSection, {
        section,
        state: builtinState,
        onToggle,
        onCancel,
      });
      $[114] = section;
      $[115] = builtinState;
      $[116] = onToggle;
      $[117] = builtinSection;
    } else builtinSection = $[117];
    return builtinSection;
  }
  if (dialogState?.mode === "details") {
    let { entry } = dialogState;
    let onEdit;
    let onDelete;
    if ($[118] !== entry) {
      onEdit = () => {
        setDialogState({
          mode: "input",
          section: entry.section,
          editing: entry,
        });
      };
      onDelete = () =>
        setDialogState({
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
      onCancel = () => setDialogState(null);
      $[121] = onCancel;
    } else onCancel = $[121];
    let detailsDialog;
    if ($[122] !== entry || $[123] !== onEdit || $[124] !== onDelete) {
      detailsDialog = jsxProd_default(AutoModeRuleDetails, {
        entry,
        onEdit,
        onDelete,
        onCancel,
      });
      $[122] = entry;
      $[123] = onEdit;
      $[124] = onDelete;
      $[125] = detailsDialog;
    } else detailsDialog = $[125];
    return detailsDialog;
  }
  if (dialogState?.mode === "delete") {
    let { entry } = dialogState;
    let isInSection;
    if ($[126] !== entry.section) {
      isInSection = (candidate) =>
        candidate.section === entry.section && !(candidate.structure && candidate.source === "userSettings");
      $[126] = entry.section;
      $[127] = isInSection;
    } else isInSection = $[127];
    let sectionCount;
    if ($[128] !== autoModeEntries || $[129] !== isInSection) {
      sectionCount = count(autoModeEntries, isInSection);
      $[128] = autoModeEntries;
      $[129] = isInSection;
      $[130] = sectionCount;
    } else sectionCount = $[130];
    const isLastInSection = sectionCount === 1;
    let onConfirm;
    if ($[131] !== autoModeEntries || $[132] !== entry || $[133] !== storageV5) {
      onConfirm = () => {
        let index = sortRuleEntries(autoModeEntries).indexOf(entry);
        deleteAutoModeRule(entry.section, entry.index, entry.text, storageV5)
          .then(() => {
            let autoModeRuleEntries = collectAutoModeRuleEntries();
            setAutoModeEntries(autoModeRuleEntries);
            setBuiltinRulesState(classifyAutoModeRuleSource());
            let visibleEntries = alwaysTrueFlag()
              ? autoModeRuleEntries.filter(isNotEnvSection)
              : autoModeRuleEntries;
            let sortedEntries = sortRuleEntries(visibleEntries);
            let nextEntry = sortedEntries[Math.min(Math.max(index, 0), sortedEntries.length - 1)];
            setAutoModeFocusKey(nextEntry ? ruleKey(nextEntry) : undefined);
            pushMessage((messages) => [
              ...messages,
              `Deleted auto mode ${getAutoModeRuleCategoryLabel(entry.section).toLowerCase()} rule ${sequential.bold(replaceLineBreaks(displayField(entry.text).text))}`,
            ]);
          })
          .catch((error) => {
            logForDebugging(`auto mode rule delete failed: ${String(error)}`, {
              level: "error",
            });
            setAutoModeEntries(collectAutoModeRuleEntries());
            setBuiltinRulesState(classifyAutoModeRuleSource());
            pushMessage((messages) => [
              ...messages,
              `Could not delete ${sequential.bold(replaceLineBreaks(displayField(entry.text).text))} \u2014 ${error instanceof Error ? error.message : "the rule is unchanged"}`,
            ]);
          });
        setDialogState(null);
      };
      $[131] = autoModeEntries;
      $[132] = entry;
      $[133] = storageV5;
      $[134] = onConfirm;
    } else onConfirm = $[134];
    let onCancel;
    if ($[135] !== entry) {
      onCancel = () =>
        setDialogState({
          mode: "details",
          entry,
        });
      $[135] = entry;
      $[136] = onCancel;
    } else onCancel = $[136];
    let deleteDialog;
    if ($[137] !== entry || $[138] !== isLastInSection || $[139] !== onConfirm || $[140] !== onCancel) {
      deleteDialog = jsxProd_default(DeleteAutoModeRuleConfirm, {
        entry,
        isLastInSection,
        onConfirm,
        onCancel,
      });
      $[137] = entry;
      $[138] = isLastInSection;
      $[139] = onConfirm;
      $[140] = onCancel;
      $[141] = deleteDialog;
    } else deleteDialog = $[141];
    return deleteDialog;
  }
  if (selectedRule) {
    let onCancel;
    if ($[142] === MEMO_CACHE_SENTINEL) {
      onCancel = () => setSelectedRule(undefined);
      $[142] = onCancel;
    } else onCancel = $[142];
    let ruleDetails;
    if ($[143] !== onDelete_2 || $[144] !== selectedRule) {
      ruleDetails = jsxProd_default(RuleDetails, {
        rule: selectedRule,
        onDelete: onDelete_2,
        onCancel,
      });
      $[143] = onDelete_2;
      $[144] = selectedRule;
      $[145] = ruleDetails;
    } else ruleDetails = $[145];
    return ruleDetails;
  }
  if (
    addingRuleToTab &&
    addingRuleToTab !== "workspace" &&
    addingRuleToTab !== "recent" &&
    addingRuleToTab !== "automode"
  ) {
    let ruleInput_2;
    if ($[146] !== addingRuleToTab) {
      ruleInput_2 = jsxProd_default(PermissionRuleInput, {
        onCancel,
        onSubmit,
        ruleBehavior: addingRuleToTab,
      });
      $[146] = addingRuleToTab;
      $[147] = ruleInput_2;
    } else ruleInput_2 = $[147];
    return ruleInput_2;
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
    let addRulesDialog;
    if (
      $[152] !== onAddRules_2 ||
      $[153] !== ruleValues ||
      $[154] !== setToolPermissionContext ||
      $[155] !== toolPermissionContext ||
      $[156] !== validatedRule.ruleBehavior
    ) {
      addRulesDialog = jsxProd_default(AddPermissionRules, {
        onAddRules: onAddRules_2,
        onCancel: onCancel_2,
        ruleValues,
        ruleBehavior: validatedRule.ruleBehavior,
        initialContext: toolPermissionContext,
        setToolPermissionContext,
      });
      $[152] = onAddRules_2;
      $[153] = ruleValues;
      $[154] = setToolPermissionContext;
      $[155] = toolPermissionContext;
      $[156] = validatedRule.ruleBehavior;
      $[157] = addRulesDialog;
    } else addRulesDialog = $[157];
    return addRulesDialog;
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
        pushMessage((prev) => [
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
    let addDirectoryDialog;
    if ($[163] !== onAddDirectory || $[164] !== toolPermissionContext) {
      addDirectoryDialog = jsxProd_default(AddWorkspaceDirectory, {
        onAddDirectory,
        onCancel,
        permissionContext: toolPermissionContext,
      });
      $[163] = onAddDirectory;
      $[164] = toolPermissionContext;
      $[165] = addDirectoryDialog;
    } else addDirectoryDialog = $[165];
    return addDirectoryDialog;
  }
  if (removingDirectory) {
    let onRemove;
    if ($[166] !== removingDirectory) {
      onRemove = () => {
        pushMessage((prev) => [
          ...prev,
          `Removed directory ${sequential.bold(removingDirectory)} from workspace`,
        ]);
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
    let removeDirectoryDialog;
    if (
      $[171] !== removingDirectory ||
      $[172] !== onRemove ||
      $[173] !== setPermissionContext ||
      $[174] !== toolPermissionContext
    ) {
      removeDirectoryDialog = jsxProd_default(RemoveWorkspaceDirectory, {
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
      $[175] = removeDirectoryDialog;
    } else removeDirectoryDialog = $[175];
    return removeDirectoryDialog;
  }
  let sharedRulesProps;
  if (
    $[176] !== getRulesOptionsStable ||
    $[177] !== exitHandler ||
    $[178] !== handleToolSelect_2 ||
    $[179] !== isSearchMode ||
    $[180] !== isTerminalFocused ||
    $[181] !== lastFocusedRuleKey ||
    $[182] !== searchCursorOffset ||
    $[183] !== searchQuery
  ) {
    sharedRulesProps = {
      searchQuery,
      isSearchMode,
      isFocused: isTerminalFocused,
      onCancel: exitHandler,
      lastFocusedRuleKey,
      cursorOffset: searchCursorOffset,
      getRulesOptions: getRulesOptionsStable,
      handleToolSelect: handleToolSelect_2,
      onHeaderFocusChange: handleHeaderFocusChange_2,
    };
    $[176] = getRulesOptionsStable;
    $[177] = exitHandler;
    $[178] = handleToolSelect_2;
    $[179] = isSearchMode;
    $[180] = isTerminalFocused;
    $[181] = lastFocusedRuleKey;
    $[182] = searchCursorOffset;
    $[183] = searchQuery;
    $[184] = sharedRulesProps;
  } else sharedRulesProps = $[184];
  let sharedRulesProps_2 = sharedRulesProps;
  let hidden = !canInteract;
  let isRecentTab = activeTab === "recent" && hasDenials;
  const navFromContent = !isSearchMode;
  let recentTab;
  if ($[185] !== onDenialStateChangeStable || $[186] !== isMidTurn) {
    recentTab = jsxProd_default(
      Tab,
      {
        id: "recent",
        title: "Recently blocked",
        children: jsxProd_default(RecentDenialsTab, {
          onHeaderFocusChange: handleHeaderFocusChange_2,
          onStateChange: onDenialStateChangeStable,
          isMidTurn,
        }),
      },
      "recent",
    );
    $[185] = onDenialStateChangeStable;
    $[186] = isMidTurn;
    $[187] = recentTab;
  } else recentTab = $[187];
  let allowTab;
  if ($[188] !== sharedRulesProps_2) {
    allowTab = jsxProd_default(
      Tab,
      {
        id: "allow",
        title: "Allow",
        children: jsxProd_default(PermissionRulesTab, {
          tab: "allow",
          ...sharedRulesProps_2,
        }),
      },
      "allow",
    );
    $[188] = sharedRulesProps_2;
    $[189] = allowTab;
  } else allowTab = $[189];
  let askTab;
  if ($[190] !== sharedRulesProps_2) {
    askTab = jsxProd_default(
      Tab,
      {
        id: "ask",
        title: "Ask",
        children: jsxProd_default(PermissionRulesTab, {
          tab: "ask",
          ...sharedRulesProps_2,
        }),
      },
      "ask",
    );
    $[190] = sharedRulesProps_2;
    $[191] = askTab;
  } else askTab = $[191];
  let denyTab;
  if ($[192] !== sharedRulesProps_2) {
    denyTab = jsxProd_default(
      Tab,
      {
        id: "deny",
        title: "Deny",
        children: jsxProd_default(PermissionRulesTab, {
          tab: "deny",
          ...sharedRulesProps_2,
        }),
      },
      "deny",
    );
    $[192] = sharedRulesProps_2;
    $[193] = denyTab;
  } else denyTab = $[193];
  let autoModeTabs;
  if (
    $[194] !== builtinRulesState ||
    $[195] !== autoModeEntries ||
    $[196] !== exitHandler ||
    $[197] !== isSearchMode ||
    $[198] !== isTerminalFocused ||
    $[199] !== autoModeFocusKey ||
    $[200] !== searchCursorOffset ||
    $[201] !== searchQuery ||
    $[202] !== startEditEnvironment ||
    $[203] !== toolPermissionContext.isAutoModeAvailable
  ) {
    autoModeTabs =
      toolPermissionContext.isAutoModeAvailable !== false
        ? [
            jsxProd_default(
              Tab,
              {
                id: "automode",
                title: "Auto mode",
                children: jsxProd_default(AgentsMenu, {
                  entries: autoModeEntries,
                  searchQuery,
                  isSearchMode,
                  isFocused: isTerminalFocused,
                  cursorOffset: searchCursorOffset,
                  defaultFocusValue: autoModeFocusKey,
                  builtinsState: builtinRulesState,
                  onSelectBuiltins: (section) => {
                    setAutoModeFocusKey(`builtins:${section}`);
                    setDialogState({
                      mode: "builtins",
                      section,
                    });
                  },
                  onAddNew: () =>
                    setDialogState({
                      mode: "pick-section",
                    }),
                  onSelectEntry: (entry) => {
                    setAutoModeFocusKey(ruleKey(entry));
                    setDialogState({
                      mode: "details",
                      entry,
                    });
                  },
                  onSelectEnvironment: () => {
                    setAutoModeFocusKey("environment-document");
                    startEditEnvironment();
                  },
                  onCancel: exitHandler,
                  onHeaderFocusChange: handleHeaderFocusChange_2,
                }),
              },
              "automode",
            ),
          ]
        : [];
    $[194] = builtinRulesState;
    $[195] = autoModeEntries;
    $[196] = exitHandler;
    $[197] = isSearchMode;
    $[198] = isTerminalFocused;
    $[199] = autoModeFocusKey;
    $[200] = searchCursorOffset;
    $[201] = searchQuery;
    $[202] = startEditEnvironment;
    $[203] = toolPermissionContext.isAutoModeAvailable;
    $[204] = autoModeTabs;
  } else autoModeTabs = $[204];
  let workspaceNote;
  if ($[205] === MEMO_CACHE_SENTINEL) {
    workspaceNote = jsxProd_default(Text, {
      wrap: "wrap-trim",
      children: "Claude Code can read files in the workspace, and make edits when auto-accept edits is on.",
    });
    $[205] = workspaceNote;
  } else workspaceNote = $[205];
  let workspaceTab;
  if ($[206] !== exitHandler || $[207] !== toolPermissionContext) {
    workspaceTab = jsxProd_default(
      Tab,
      {
        id: "workspace",
        title: "Workspace",
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            workspaceNote,
            jsxProd_default(WorkspaceTab, {
              onCancel: exitHandler,
              toolPermissionContext,
              onRequestAddDirectory: onRequestAddDirectory_2,
              onRequestRemoveDirectory: onRequestRemoveDirectory_2,
              onHeaderFocusChange: handleHeaderFocusChange_2,
            }),
          ],
        }),
      },
      "workspace",
    );
    $[206] = exitHandler;
    $[207] = toolPermissionContext;
    $[208] = workspaceTab;
  } else workspaceTab = $[208];
  let children;
  if (
    $[209] !== recentTab ||
    $[210] !== allowTab ||
    $[211] !== askTab ||
    $[212] !== denyTab ||
    $[213] !== autoModeTabs ||
    $[214] !== workspaceTab
  ) {
    children = [recentTab, allowTab, askTab, denyTab, ...autoModeTabs, workspaceTab];
    $[209] = recentTab;
    $[210] = allowTab;
    $[211] = askTab;
    $[212] = denyTab;
    $[213] = autoModeTabs;
    $[214] = workspaceTab;
    $[215] = children;
  } else children = $[215];
  let tabsElement;
  if (
    $[216] !== initialTab_2 ||
    $[217] !== headerFocused ||
    $[218] !== hidden ||
    $[219] !== activeTab ||
    $[220] !== navFromContent ||
    $[221] !== children
  ) {
    tabsElement = jsxProd_default(Tabs, {
      title: "Permissions",
      color: "permission",
      defaultTab: initialTab_2,
      selectedTab: activeTab,
      onTabChange: setActiveTab,
      hidden,
      initialHeaderFocused: headerFocused,
      navFromContent,
      children,
    });
    $[216] = initialTab_2;
    $[217] = headerFocused;
    $[218] = hidden;
    $[219] = activeTab;
    $[220] = navFromContent;
    $[221] = children;
    $[222] = tabsElement;
  } else tabsElement = $[222];
  let children_2;
  if (
    $[223] !== canMark ||
    $[224] !== globalExitKeybindings.keyName ||
    $[225] !== globalExitKeybindings.pending ||
    $[226] !== headerFocused ||
    $[227] !== isRecentTab ||
    $[228] !== isScreenReaderEnabled ||
    $[229] !== isSearchMode ||
    $[230] !== escapeHint
  ) {
    children_2 = globalExitKeybindings.pending
      ? `Press ${globalExitKeybindings.keyName} again to cancel`
      : headerFocused
        ? jsxProd_default_2(Fragment, {
            children: ["\u2190/\u2192 to switch \xB7 \u2193 to select \xB7 ", escapeHint ?? "Esc to cancel"],
          })
        : isSearchMode
          ? jsxProd_default(Fragment, {
              children: "Type to filter \xB7 Enter/\u2193 to select \xB7 \u2191 to tabs \xB7 Esc to clear",
            })
          : isRecentTab
            ? jsxProd_default_2(Fragment, {
                children: [
                  canMark && "Enter to approve \xB7 r to retry \xB7 ",
                  escapeHint ??
                    `${isScreenReaderEnabled ? "" : "\u2191/\u2193 to navigate \xB7 "}Esc to close`,
                ],
              })
            : jsxProd_default_2(Fragment, {
                children: [
                  isScreenReaderEnabled ? "" : "\u2191/\u2193 to navigate \xB7 Enter to select \xB7 ",
                  "\u2190/\u2192 to switch \xB7 ",
                  escapeHint ?? "Esc to cancel",
                ],
              });
    $[223] = canMark;
    $[224] = globalExitKeybindings.keyName;
    $[225] = globalExitKeybindings.pending;
    $[226] = headerFocused;
    $[227] = isRecentTab;
    $[228] = isScreenReaderEnabled;
    $[229] = isSearchMode;
    $[230] = escapeHint;
    $[231] = children_2;
  } else children_2 = $[231];
  let hintBox;
  if ($[232] !== children_2) {
    hintBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: children_2,
      }),
    });
    $[232] = children_2;
    $[233] = hintBox;
  } else hintBox = $[233];
  let children_3;
  if ($[234] !== tabsElement || $[235] !== hintBox) {
    children_3 = jsxProd_default_2(Pane, {
      color: "permission",
      children: [tabsElement, hintBox],
    });
    $[234] = tabsElement;
    $[235] = hintBox;
    $[236] = children_3;
  } else children_3 = $[236];
  let content;
  if ($[237] !== onKeyDown_2 || $[238] !== handlePaste || $[239] !== children_3) {
    content = jsxProd_default(Box, {
      flexDirection: "column",
      onKeyDown: onKeyDown_2,
      onPaste: handlePaste,
      children: children_3,
    });
    $[237] = onKeyDown_2;
    $[238] = handlePaste;
    $[239] = children_3;
    $[240] = content;
  } else content = $[240];
  return content;
}
export { PermissionRuleList };
