/**
 * components/permissions/rules/AddWorkspaceDirectory.tsx
 *
 * 添加工作目录：输入路径、选择"本会话"或"记住"。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/AddWorkspaceDirectory.tsx
 * pieces: chunk-0tbq6c3s.js (7), chunk-czq1j3j2.js (1)
 * attribution: placement 1, layout 2, fingerprint 4, callgraph-witnessed 1
 */
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { logEvent } from "../../../services/analytics/index.js";
import { fromEnum } from "../../../services/analytics/safeMetadata.js";
import { useOnFirstReveal } from "../PermissionRequestTitle.js";
import { useGlobalExitKeybindings, useKeybinding } from "../../../keybindings/useKeybinding.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { useRefusableAnswer } from "../../../hooks/useRefusableAnswer.js";
import { useInputClock, useDebouncedCallback } from "../../../ink/components/Input.js";
import { useMountTime, useRefusalTracker } from "../../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../../../hooks/useRecentInputGuard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { stableEmptyObject } from "../../../utils/stableEmptyObject.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { permissionModeIndicator } from "../../../utils/permissions/PermissionMode.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../ConfigurableShortcutHint.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { init_react_production, useState, useEffect } from "../../../../vendor/react/cjs/react.production.js";
import { TextInput } from "../../TextInput.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { PromptInputFooterSuggestions } from "../../PromptInput/PromptInputFooterSuggestions.js";
import { ErrorText } from "../../ErrorText.js";
import { useSession } from "../../../context/session.js";
import { getDirectoryCompletions } from "../../../utils/suggestions/directoryCompletion.js";
import { validateDirectoryForWorkspace, addDirHelpMessage } from "../../../commands/add-dir/validation.js";
import { Dialog } from "../../design-system/Dialog.js";
import { FocusColumn } from "../../design-system/FocusColumn.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1132361-1134643 callgraph-witnessed (2.1.88 match: _temp2, 0.155)
/**
 * 询问是否把 auto 模式设为默认权限模式的对话框；上报 tengu_auto_default_nudge_shown，带输入防抖拒绝。
 */
function AutoModeDefaultNudgeDialog(exitState) {
  let $ = useMemoCache(32);
  let { currentMode, onDone } = exitState;
  let logImpression;
  if ($[0] !== currentMode) {
    logImpression = () => {
      logEvent("tengu_auto_default_nudge_shown", {
        current_mode: fromEnum(currentMode),
      });
    };
    $[0] = currentMode;
    $[1] = logImpression;
  } else logImpression = $[1];
  useOnFirstReveal("impression", logImpression);
  let globalExitKeybindings = useGlobalExitKeybindings();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let refusableAnswer = useRefusableAnswer(onDone);
  let inputClock = useInputClock();
  let mountTime = useMountTime();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let shouldRefuse;
  if ($[2] !== inputClock || $[3] !== noteRefused || $[4] !== mountTime || $[5] !== refusedWithin) {
    shouldRefuse = () => {
      if (isWithinRecentInput(inputClock, mountTime()) || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[2] = inputClock;
    $[3] = noteRefused;
    $[4] = mountTime;
    $[5] = refusedWithin;
    $[6] = shouldRefuse;
  } else shouldRefuse = $[6];
  let shouldRefuse_2 = shouldRefuse;
  let handleAnswer;
  if ($[7] !== shouldRefuse_2 || $[8] !== refusableAnswer) {
    handleAnswer = function handleAnswer(value) {
      if (shouldRefuse_2()) {
        refusableAnswer.refuse(value);
        return;
      }
      refusableAnswer.answer(value);
    };
    $[7] = shouldRefuse_2;
    $[8] = refusableAnswer;
    $[9] = handleAnswer;
  } else handleAnswer = $[9];
  let choose = handleAnswer;
  let emptyHintProps;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    emptyHintProps = stableEmptyObject(false);
    $[10] = emptyHintProps;
  } else emptyHintProps = $[10];
  let emptyHintProps_2 = emptyHintProps;
  let explainerBox;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    explainerBox = jsxProd_default(Box, {
      marginBottom: 1,
      flexDirection: "column",
      children: jsxProd_default(Text, {
        children:
          "Auto mode lets Claude handle permission prompts automatically. Claude checks each tool call for risky actions and prompt injection before executing, runs the ones it assesses as lower-risk, and blocks the rest.",
      }),
    });
    $[11] = explainerBox;
  } else explainerBox = $[11];
  const attempts = refusableAnswer.attempts;
  const defaultFocusValue = refusableAnswer.refused ?? undefined;
  let acceptOption;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    acceptOption = {
      label: "Yes, set auto mode as my default permission mode",
      value: "accept",
    };
    $[12] = acceptOption;
  } else acceptOption = $[12];
  let modeLabel;
  if ($[13] !== currentMode) {
    modeLabel = permissionModeIndicator(currentMode);
    $[13] = currentMode;
    $[14] = modeLabel;
  } else modeLabel = $[14];
  const label = `No, keep ${modeLabel}`;
  let options;
  if ($[15] !== label) {
    options = [
      acceptOption,
      {
        label,
        value: "decline",
      },
    ];
    $[15] = label;
    $[16] = options;
  } else options = $[16];
  let onCancel;
  if ($[17] !== choose) {
    onCancel = () => choose("decline");
    $[17] = choose;
    $[18] = onCancel;
  } else onCancel = $[18];
  let selectorBox;
  if (
    $[19] !== choose ||
    $[20] !== shouldRefuse_2 ||
    $[21] !== refusableAnswer.attempts ||
    $[22] !== options ||
    $[23] !== onCancel ||
    $[24] !== defaultFocusValue
  ) {
    selectorBox = jsxProd_default(Box, {
      children: jsxProd_default(
        ModelSelector,
        {
          defaultFocusValue,
          hideIndexes: true,
          refuseInput: shouldRefuse_2,
          options,
          onChange: choose,
          onCancel,
        },
        attempts,
      ),
    });
    $[19] = choose;
    $[20] = shouldRefuse_2;
    $[21] = refusableAnswer.attempts;
    $[22] = options;
    $[23] = onCancel;
    $[24] = defaultFocusValue;
    $[25] = selectorBox;
  } else selectorBox = $[25];
  let exitHint;
  if ($[26] !== globalExitKeybindings || $[27] !== isScreenReaderEnabled) {
    exitHint =
      false &&
      (!isScreenReaderEnabled || globalExitKeybindings.pending) &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Text, {
          dimColor: true,
          italic: true,
          children: globalExitKeybindings.pending
            ? `Press ${globalExitKeybindings.keyName} again to exit`
            : jsxProd_default_2(Byline, {
                children: [
                  jsxProd_default(KeyboardShortcutHint, {
                    chord: "enter",
                    action: "confirm",
                    ...emptyHintProps_2,
                  }),
                  jsxProd_default(ConfigurableShortcutHint, {
                    action: "select:cancel",
                    context: "Select",
                    fallback: "Esc",
                    description: "cancel",
                    ...emptyHintProps_2,
                  }),
                ],
              }),
        }),
      });
    $[26] = globalExitKeybindings;
    $[27] = isScreenReaderEnabled;
    $[28] = exitHint;
  } else exitHint = $[28];
  let dialog;
  if ($[29] !== selectorBox || $[30] !== exitHint) {
    dialog = jsxProd_default(PermissionDialog_2, {
      title: "Make auto mode your default permission mode?",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: false ? 0 : 2,
        paddingTop: 1,
        paddingBottom: false ? 0 : 1,
        children: [explainerBox, selectorBox, exitHint],
      }),
    });
    $[29] = selectorBox;
    $[30] = exitHint;
    $[31] = dialog;
  } else dialog = $[31];
  return dialog;
}
//@ chunk-0tbq6c3s.js:889-893 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0tbq6c3s.js:889", () => {
  init_react_production();
});
//@ chunk-0tbq6c3s.js:893-939 layout
function stripLineBreaks(text) {
  return text.replace(/[\r\n]/g, "");
}
//@ chunk-0tbq6c3s.js:939-1087 fingerprint (2.1.88 match: REMEMBER_DIRECTORY_OPTIONS, 1)
var REMEMBER_DIRECTORY_OPTIONS = [
  {
    value: "yes-session",
    label: "Yes, for this session",
  },
  {
    value: "yes-remember",
    label: "Yes, and remember this directory",
  },
  {
    value: "no",
    label: "No",
  },
];
//@ chunk-0tbq6c3s.js:1087-1287 layout
function WorkspaceDirectoryHint() {
  let $ = useMemoCache(1);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Claude Code will be able to read files in this directory and make edits when auto-accept edits is on.",
    });
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
//@ chunk-0tbq6c3s.js:1287-1555 fingerprint (2.1.88 match: DirectoryDisplay, 0.522)
function DirectoryDisplay(props) {
  let $ = useMemoCache(5);
  let { path } = props;
  let t1;
  if ($[0] !== path) {
    t1 = jsxProd_default(Text, {
      color: "permission",
      children: path,
    });
    $[0] = path;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default(WorkspaceDirectoryHint, {});
    $[2] = t2;
  } else t2 = $[2];
  let t3;
  if ($[3] !== t1) {
    t3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [t1, t2],
    });
    $[3] = t1;
    $[4] = t3;
  } else t3 = $[4];
  return t3;
}
//@ chunk-0tbq6c3s.js:1555-2553 fingerprint (2.1.88 match: DirectoryInput, 0.739)
function DirectoryInput(props) {
  let $ = useMemoCache(16);
  let {
    value,
    onChange,
    cursorOffset,
    onChangeCursorOffset,
    onSubmit,
    error,
    suggestions,
    selectedSuggestion,
  } = props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      children: "Enter the path to the directory:",
    });
    $[0] = t1;
  } else t1 = $[0];
  let t2;
  if (
    $[1] !== cursorOffset ||
    $[2] !== onChange ||
    $[3] !== onChangeCursorOffset ||
    $[4] !== onSubmit ||
    $[5] !== value
  ) {
    t2 = jsxProd_default(Box, {
      borderDimColor: true,
      borderStyle: "round",
      marginTop: 1,
      paddingLeft: 1,
      children: jsxProd_default(TextInput, {
        showCursor: true,
        focus: true,
        placeholder: `Directory path${figures_default.ellipsis}`,
        value,
        onChange,
        onSubmit,
        columns: 80,
        cursorOffset,
        onChangeCursorOffset,
        inputFilter: stripLineBreaks,
        disableCursorMovementForUpDownKeys: true,
      }),
    });
    $[1] = cursorOffset;
    $[2] = onChange;
    $[3] = onChangeCursorOffset;
    $[4] = onSubmit;
    $[5] = value;
    $[6] = t2;
  } else t2 = $[6];
  let t3;
  if ($[7] !== selectedSuggestion || $[8] !== suggestions) {
    t3 =
      suggestions.length > 0 &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(PromptInputFooterSuggestions, {
          suggestions,
          selectedSuggestion,
          noPad: true,
        }),
      });
    $[7] = selectedSuggestion;
    $[8] = suggestions;
    $[9] = t3;
  } else t3 = $[9];
  let t4;
  if ($[10] !== error) {
    t4 = jsxProd_default(ErrorText, {
      error,
    });
    $[10] = error;
    $[11] = t4;
  } else t4 = $[11];
  let t5;
  if ($[12] !== t2 || $[13] !== t3 || $[14] !== t4) {
    t5 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t1, t2, t3, t4],
    });
    $[12] = t2;
    $[13] = t3;
    $[14] = t4;
    $[15] = t5;
  } else t5 = $[15];
  return t5;
}
//@ chunk-0tbq6c3s.js:2553-5100 fingerprint (2.1.88 match: AddWorkspaceDirectory, 0.727)
function AddWorkspaceDirectory(props) {
  let $ = useMemoCache(38);
  let { onAddDirectory, onAlreadyAccessible, onCancel, permissionContext, directoryPath } = props;
  let session = useSession();
  let [directoryInput, setDirectoryInput] = useState("");
  let [step, setStep] = useState(0);
  let [error, setError] = useState(null);
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [];
    $[0] = t1;
  } else t1 = $[0];
  let [suggestions, setSuggestions] = useState(t1);
  let [selectedSuggestion, setSelectedSuggestion] = useState(0);
  let submit;
  if ($[1] !== session) {
    submit = async (path) => {
      if (!path) {
        setSuggestions([]);
        setSelectedSuggestion(0);
        return;
      }
      let completions = await getDirectoryCompletions(session, path);
      setSuggestions(completions);
      setSelectedSuggestion(0);
    };
    $[1] = session;
    $[2] = submit;
  } else submit = $[2];
  let debouncedFetchSuggestions = useDebouncedCallback(submit, 100);
  let handleSubmit;
  let t4;
  if ($[3] !== debouncedFetchSuggestions || $[4] !== directoryInput) {
    handleSubmit = () => {
      debouncedFetchSuggestions(directoryInput);
    };
    t4 = [directoryInput, debouncedFetchSuggestions];
    $[3] = debouncedFetchSuggestions;
    $[4] = directoryInput;
    $[5] = handleSubmit;
    $[6] = t4;
  } else {
    handleSubmit = $[5];
    t4 = $[6];
  }
  useEffect(handleSubmit, t4);
  let t5;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    t5 = (suggestion) => {
      let newPath = suggestion.id + "/";
      setDirectoryInput(newPath);
      setStep(newPath.length);
      setError(null);
    };
    $[7] = t5;
  } else t5 = $[7];
  let applySuggestion = t5;
  let t6;
  if ($[8] !== onAddDirectory || $[9] !== onAlreadyAccessible || $[10] !== permissionContext) {
    t6 = async (newPath) => {
      let result = await validateDirectoryForWorkspace(newPath, permissionContext);
      if (result.resultType === "success") {
        onAddDirectory(result.absolutePath, false);
        return;
      }
      if (
        result.resultType === "alreadyInWorkingDirectory" &&
        !result.isExactMatch &&
        onAlreadyAccessible?.(result)
      ) {
        return;
      }
      setError(addDirHelpMessage(result));
    };
    $[8] = onAddDirectory;
    $[9] = onAlreadyAccessible;
    $[10] = permissionContext;
    $[11] = t6;
  } else t6 = $[11];
  let handleSubmit_2 = t6;
  let t7;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    t7 = {
      context: "Settings",
    };
    $[12] = t7;
  } else t7 = $[12];
  useKeybinding("confirm:no", onCancel, t7);
  let suggestionKeyHandler;
  if ($[13] !== selectedSuggestion || $[14] !== suggestions) {
    suggestionKeyHandler = (e) => {
      if (suggestions.length > 0) {
        if (e.name === "tab") {
          e.preventDefault();
          let suggestion = suggestions[selectedSuggestion];
          if (suggestion) applySuggestion(suggestion);
          return;
        }
        if (e.name === "up" || (e.ctrl && e.name === "p")) {
          e.preventDefault();
          setSelectedSuggestion((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
          return;
        }
        if (e.name === "down" || (e.ctrl && e.name === "n")) {
          e.preventDefault();
          setSelectedSuggestion((prev) => (prev >= suggestions.length - 1 ? 0 : prev + 1));
          return;
        }
      }
    };
    $[13] = selectedSuggestion;
    $[14] = suggestions;
    $[15] = suggestionKeyHandler;
  } else suggestionKeyHandler = $[15];
  let handleKeyDown = suggestionKeyHandler;
  let t9;
  if ($[16] !== directoryPath || $[17] !== onAddDirectory || $[18] !== onCancel) {
    t9 = (value) => {
      if (!directoryPath) {
        return;
      }
      kt: switch (value) {
        case "yes-session": {
          onAddDirectory(directoryPath, false);
          break kt;
        }
        case "yes-remember": {
          onAddDirectory(directoryPath, true);
          break kt;
        }
        case "no": {
          onCancel();
        }
      }
    };
    $[16] = directoryPath;
    $[17] = onAddDirectory;
    $[18] = onCancel;
    $[19] = t9;
  } else t9 = $[19];
  let handleSelect = t9;
  let inputGuide;
  if ($[20] !== directoryPath) {
    inputGuide = directoryPath
      ? undefined
      : jsxProd_default_2(Byline, {
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "tab",
              action: "complete",
            }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: "add",
            }),
            jsxProd_default(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
            }),
          ],
        });
    $[20] = directoryPath;
    $[21] = inputGuide;
  } else inputGuide = $[21];
  let children;
  if (
    $[22] !== step ||
    $[23] !== directoryInput ||
    $[24] !== directoryPath ||
    $[25] !== error ||
    $[26] !== handleSelect ||
    $[27] !== handleSubmit_2 ||
    $[28] !== selectedSuggestion ||
    $[29] !== suggestions
  ) {
    children = directoryPath
      ? jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            jsxProd_default(DirectoryDisplay, {
              path: directoryPath,
            }),
            jsxProd_default(ModelSelector, {
              options: REMEMBER_DIRECTORY_OPTIONS,
              onChange: handleSelect,
              onCancel: () => handleSelect("no"),
            }),
          ],
        })
      : jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            jsxProd_default(WorkspaceDirectoryHint, {}),
            jsxProd_default(DirectoryInput, {
              value: directoryInput,
              onChange: setDirectoryInput,
              cursorOffset: step,
              onChangeCursorOffset: setStep,
              onSubmit: handleSubmit_2,
              error,
              suggestions,
              selectedSuggestion,
            }),
          ],
        });
    $[22] = step;
    $[23] = directoryInput;
    $[24] = directoryPath;
    $[25] = error;
    $[26] = handleSelect;
    $[27] = handleSubmit_2;
    $[28] = selectedSuggestion;
    $[29] = suggestions;
    $[30] = children;
  } else children = $[30];
  let children_2;
  if ($[31] !== onCancel || $[32] !== inputGuide || $[33] !== children) {
    children_2 = jsxProd_default(Dialog, {
      title: "Add directory to workspace",
      onCancel,
      color: "permission",
      isCancelActive: false,
      inputGuide,
      children,
    });
    $[31] = onCancel;
    $[32] = inputGuide;
    $[33] = children;
    $[34] = children_2;
  } else children_2 = $[34];
  let t13;
  if ($[35] !== handleKeyDown || $[36] !== children_2) {
    t13 = jsxProd_default(FocusColumn, {
      onKeyDown: handleKeyDown,
      children: children_2,
    });
    $[35] = handleKeyDown;
    $[36] = children_2;
    $[37] = t13;
  } else t13 = $[37];
  return t13;
}
export { AddWorkspaceDirectory, AutoModeDefaultNudgeDialog };
