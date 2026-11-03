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
import { j, y, P } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { TextInput } from "../../TextInput.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
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
j();
//@ chunk-j1c0t4gs.js:893-939 layout
function He(l) {
  return l.replace(/[\r\n]/g, "");
}
//@ chunk-j1c0t4gs.js:939-1087 fingerprint = REMEMBER_DIRECTORY_OPTIONS (1)
var REMEMBER_DIRECTORY_OPTIONS = [
  { value: "yes-session", label: "Yes, for this session" },
  { value: "yes-remember", label: "Yes, and remember this directory" },
  { value: "no", label: "No" },
];
//@ chunk-j1c0t4gs.js:1087-1287 layout
function WorkspaceDirectoryHint() {
  let $ = w(1),
    i;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((i = e(Text, {
      dimColor: !0,
      children:
        "Claude Code will be able to read files in this directory and make edits when auto-accept edits is on.",
    })),
      ($[0] = i));
  else i = $[0];
  return i;
}
//@ chunk-j1c0t4gs.js:1287-1555 fingerprint = DirectoryDisplay (0.521)
function DirectoryDisplay(t0) {
  let $ = w(5),
    { path: path } = t0,
    a;
  if ($[0] !== path) ((a = e(Text, { color: "permission", children: path })), ($[0] = path), ($[1] = a));
  else a = $[1];
  let p;
  if ($[2] === MEMO_CACHE_SENTINEL) ((p = e(WorkspaceDirectoryHint, {})), ($[2] = p));
  else p = $[2];
  let t;
  if ($[3] !== a)
    ((t = r(Box, { flexDirection: "column", gap: 1, children: [a, p] })), ($[3] = a), ($[4] = t));
  else t = $[4];
  return t;
}
//@ chunk-j1c0t4gs.js:1555-2553 fingerprint = DirectoryInput (0.739)
function DirectoryInput(t0) {
  let $ = w(16),
    {
      value: value,
      onChange: onChange,
      cursorOffset: cursorOffset,
      onChangeCursorOffset: onChangeCursorOffset,
      onSubmit: onSubmit,
      error: error,
      suggestions: suggestions,
      selectedSuggestion: selectedSuggestion,
    } = t0,
    E;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((E = e(Text, { children: "Enter the path to the directory:" })), ($[0] = E));
  else E = $[0];
  let f;
  if (
    $[1] !== cursorOffset ||
    $[2] !== onChange ||
    $[3] !== onChangeCursorOffset ||
    $[4] !== onSubmit ||
    $[5] !== value
  )
    ((f = e(Box, {
      borderDimColor: !0,
      borderStyle: "round",
      marginTop: 1,
      paddingLeft: 1,
      children: e(TextInput, {
        showCursor: !0,
        focus: !0,
        placeholder: `Directory path${re.ellipsis}`,
        value: value,
        onChange: onChange,
        onSubmit: onSubmit,
        columns: 80,
        cursorOffset: cursorOffset,
        onChangeCursorOffset: onChangeCursorOffset,
        inputFilter: He,
        disableCursorMovementForUpDownKeys: !0,
      }),
    })),
      ($[1] = cursorOffset),
      ($[2] = onChange),
      ($[3] = onChangeCursorOffset),
      ($[4] = onSubmit),
      ($[5] = value),
      ($[6] = f));
  else f = $[6];
  let v;
  if ($[7] !== selectedSuggestion || $[8] !== suggestions)
    ((v =
      suggestions.length > 0 &&
      e(Box, {
        marginBottom: 1,
        children: e(PromptInputFooterSuggestions, {
          suggestions: suggestions,
          selectedSuggestion: selectedSuggestion,
          noPad: !0,
        }),
      })),
      ($[7] = selectedSuggestion),
      ($[8] = suggestions),
      ($[9] = v));
  else v = $[9];
  let o;
  if ($[10] !== error) ((o = e(ErrorText, { error: error })), ($[10] = error), ($[11] = o));
  else o = $[11];
  let F;
  if ($[12] !== f || $[13] !== v || $[14] !== o)
    ((F = r(Box, { flexDirection: "column", children: [E, f, v, o] })),
      ($[12] = f),
      ($[13] = v),
      ($[14] = o),
      ($[15] = F));
  else F = $[15];
  return F;
}
//@ chunk-j1c0t4gs.js:2553-5100 fingerprint = AddWorkspaceDirectory (0.726)
function AddWorkspaceDirectory(t0) {
  let $ = w(38),
    {
      onAddDirectory: onAddDirectory,
      onAlreadyAccessible: onAlreadyAccessible,
      onCancel: onCancel,
      permissionContext: permissionContext,
      directoryPath: directoryPath,
    } = t0,
    C = useSession(),
    [c, k] = y(""),
    [m, E] = y(0),
    [f, v] = y(null),
    F;
  if ($[0] === MEMO_CACHE_SENTINEL) ((F = []), ($[0] = F));
  else F = $[0];
  let [l, ge] = y(F),
    [D, K] = y(0),
    de;
  if ($[1] !== C)
    ((de = async (path) => {
      if (!path) {
        (ge([]), K(0));
        return;
      }
      let _e = await getDirectoryCompletions(C, path);
      (ge(_e), K(0));
    }),
      ($[1] = C),
      ($[2] = de));
  else de = $[2];
  let debouncedFetchSuggestions = useDebouncedCallback(de, 100),
    me,
    fe;
  if ($[3] !== debouncedFetchSuggestions || $[4] !== c)
    ((me = () => {
      debouncedFetchSuggestions(c);
    }),
      (fe = [c, debouncedFetchSuggestions]),
      ($[3] = debouncedFetchSuggestions),
      ($[4] = c),
      ($[5] = me),
      ($[6] = fe));
  else ((me = $[5]), (fe = $[6]));
  P(me, fe);
  let he;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((he = (suggestion) => {
      let newPath = suggestion.id + "/";
      (k(newPath), E(newPath.length), v(null));
    }),
      ($[7] = he));
  else he = $[7];
  let tt = he,
    be;
  if ($[8] !== onAddDirectory || $[9] !== onAlreadyAccessible || $[10] !== permissionContext)
    ((be = async (newPath_0) => {
      let result = await validateDirectoryForWorkspace(newPath_0, permissionContext);
      if (result.resultType === "success") {
        onAddDirectory(result.absolutePath, !1);
        return;
      }
      if (
        result.resultType === "alreadyInWorkingDirectory" &&
        !result.isExactMatch &&
        onAlreadyAccessible?.(result)
      ) {
        return;
      }
      v(addDirHelpMessage(result));
    }),
      ($[8] = onAddDirectory),
      ($[9] = onAlreadyAccessible),
      ($[10] = permissionContext),
      ($[11] = be));
  else be = $[11];
  let z = be,
    Se;
  if ($[12] === MEMO_CACHE_SENTINEL) ((Se = { context: "Settings" }), ($[12] = Se));
  else Se = $[12];
  useKeybinding("confirm:no", onCancel, Se);
  let Ce;
  if ($[13] !== D || $[14] !== l)
    ((Ce = (g) => {
      if (l.length > 0) {
        if (g.name === "tab") {
          g.preventDefault();
          let ve = l[D];
          if (ve) tt(ve);
          return;
        }
        if (g.name === "up" || (g.ctrl && g.name === "p")) {
          (g.preventDefault(), K((prev) => (prev <= 0 ? l.length - 1 : prev - 1)));
          return;
        }
        if (g.name === "down" || (g.ctrl && g.name === "n")) {
          (g.preventDefault(), K((prev_0) => (prev_0 >= l.length - 1 ? 0 : prev_0 + 1)));
          return;
        }
      }
    }),
      ($[13] = D),
      ($[14] = l),
      ($[15] = Ce));
  else Ce = $[15];
  let X = Ce,
    Ae;
  if ($[16] !== directoryPath || $[17] !== onAddDirectory || $[18] !== onCancel)
    ((Ae = (value) => {
      if (!directoryPath) {
        return;
      }
      kt: switch (value) {
        case "yes-session": {
          onAddDirectory(directoryPath, !1);
          break kt;
        }
        case "yes-remember": {
          onAddDirectory(directoryPath, !0);
          break kt;
        }
        case "no": {
          onCancel();
        }
      }
    }),
      ($[16] = directoryPath),
      ($[17] = onAddDirectory),
      ($[18] = onCancel),
      ($[19] = Ae));
  else Ae = $[19];
  let N = Ae,
    B;
  if ($[20] !== directoryPath)
    ((B = directoryPath
      ? void 0
      : r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: "tab", action: "complete" }),
            e(KeyboardShortcutHint, { chord: "enter", action: "add" }),
            e(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Settings",
              fallback: "Esc",
              description: "cancel",
            }),
          ],
        })),
      ($[20] = directoryPath),
      ($[21] = B));
  else B = $[21];
  let L;
  if (
    $[22] !== m ||
    $[23] !== c ||
    $[24] !== directoryPath ||
    $[25] !== f ||
    $[26] !== N ||
    $[27] !== z ||
    $[28] !== D ||
    $[29] !== l
  )
    ((L = directoryPath
      ? r(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            e(DirectoryDisplay, { path: directoryPath }),
            e(ModelSelector, { options: REMEMBER_DIRECTORY_OPTIONS, onChange: N, onCancel: () => N("no") }),
          ],
        })
      : r(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            e(WorkspaceDirectoryHint, {}),
            e(DirectoryInput, {
              value: c,
              onChange: k,
              cursorOffset: m,
              onChangeCursorOffset: E,
              onSubmit: z,
              error: f,
              suggestions: l,
              selectedSuggestion: D,
            }),
          ],
        })),
      ($[22] = m),
      ($[23] = c),
      ($[24] = directoryPath),
      ($[25] = f),
      ($[26] = N),
      ($[27] = z),
      ($[28] = D),
      ($[29] = l),
      ($[30] = L));
  else L = $[30];
  let U;
  if ($[31] !== onCancel || $[32] !== B || $[33] !== L)
    ((U = e(Dialog, {
      title: "Add directory to workspace",
      onCancel: onCancel,
      color: "permission",
      isCancelActive: !1,
      inputGuide: B,
      children: L,
    })),
      ($[31] = onCancel),
      ($[32] = B),
      ($[33] = L),
      ($[34] = U));
  else U = $[34];
  let Oe;
  if ($[35] !== X || $[36] !== U)
    ((Oe = e(FocusColumn, { onKeyDown: X, children: U })), ($[35] = X), ($[36] = U), ($[37] = Oe));
  else Oe = $[37];
  return Oe;
}

export { AddWorkspaceDirectory };
