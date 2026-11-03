/**
 * components/permissions/rules/AddWorkspaceDirectory.tsx
 *
 * 添加工作目录：输入路径、选择"本会话"或"记住"。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/AddWorkspaceDirectory.tsx
 * pieces: chunk-j1c0t4gs.js (7)
 * attribution: placement 1, layout 2, fingerprint 4
 */
import { init_react_production, y, P } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { TextInput } from "../../TextInput.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { PromptInputFooterSuggestions } from "../../PromptInput/PromptInputFooterSuggestions.js";
import { ErrorText } from "../../ErrorText.js";
import { useSession } from "../../../context/session.js";
import { getDirectoryCompletions } from "../../../utils/suggestions/directoryCompletion.js";
import { useDebouncedCallback } from "../../../ink/components/Input.js";
import { validateDirectoryForWorkspace, addDirHelpMessage } from "../../../commands/add-dir/validation.js";
import { useKeybinding } from "../../../keybindings/useKeybinding.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../ConfigurableShortcutHint.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { Dialog } from "../../design-system/Dialog.js";
import { FocusColumn } from "../../design-system/FocusColumn.js";

//@ chunk-j1c0t4gs.js:889-893 placement
init_react_production();
//@ chunk-j1c0t4gs.js:893-939 layout
function stripLineBreaks(l) {
  return l.replace(/[\r\n]/g, "");
}
//@ chunk-j1c0t4gs.js:939-1087 fingerprint = REMEMBER_DIRECTORY_OPTIONS (1)
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
//@ chunk-j1c0t4gs.js:1087-1287 layout
function WorkspaceDirectoryHint() {
  let $ = w(1);
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
//@ chunk-j1c0t4gs.js:1287-1555 fingerprint = DirectoryDisplay (0.521)
function DirectoryDisplay(props) {
  let $ = w(5);
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
//@ chunk-j1c0t4gs.js:1555-2553 fingerprint = DirectoryInput (0.739)
function DirectoryInput(props) {
  let $ = w(16);
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
//@ chunk-j1c0t4gs.js:2553-5100 fingerprint = AddWorkspaceDirectory (0.726)
function AddWorkspaceDirectory(props) {
  let $ = w(38);
  let { onAddDirectory, onAlreadyAccessible, onCancel, permissionContext, directoryPath } = props;
  let session = useSession();
  let [directoryInput, setDirectoryInput] = y("");
  let [m, E] = y(0);
  let [error, setError] = y(null);
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = [];
    $[0] = t1;
  } else t1 = $[0];
  let [suggestions, setSuggestions] = y(t1);
  let [selectedSuggestion, setSelectedSuggestion] = y(0);
  let de;
  if ($[1] !== session) {
    de = async (path) => {
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
    $[2] = de;
  } else de = $[2];
  let debouncedFetchSuggestions = useDebouncedCallback(de, 100);
  let me;
  let t4;
  if ($[3] !== debouncedFetchSuggestions || $[4] !== directoryInput) {
    me = () => {
      debouncedFetchSuggestions(directoryInput);
    };
    t4 = [directoryInput, debouncedFetchSuggestions];
    $[3] = debouncedFetchSuggestions;
    $[4] = directoryInput;
    $[5] = me;
    $[6] = t4;
  } else {
    me = $[5];
    t4 = $[6];
  }
  P(me, t4);
  let t5;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    t5 = (suggestion) => {
      let newPath = suggestion.id + "/";
      setDirectoryInput(newPath);
      E(newPath.length);
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
  let handleSubmit = t6;
  let t7;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    t7 = {
      context: "Settings",
    };
    $[12] = t7;
  } else t7 = $[12];
  useKeybinding("confirm:no", onCancel, t7);
  let Ce;
  if ($[13] !== selectedSuggestion || $[14] !== suggestions) {
    Ce = (e) => {
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
    $[15] = Ce;
  } else Ce = $[15];
  let handleKeyDown = Ce;
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
    $[22] !== m ||
    $[23] !== directoryInput ||
    $[24] !== directoryPath ||
    $[25] !== error ||
    $[26] !== handleSelect ||
    $[27] !== handleSubmit ||
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
              cursorOffset: m,
              onChangeCursorOffset: E,
              onSubmit: handleSubmit,
              error,
              suggestions,
              selectedSuggestion,
            }),
          ],
        });
    $[22] = m;
    $[23] = directoryInput;
    $[24] = directoryPath;
    $[25] = error;
    $[26] = handleSelect;
    $[27] = handleSubmit;
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
export { AddWorkspaceDirectory };
