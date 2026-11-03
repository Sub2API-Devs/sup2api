/**
 * components/ExportDialog.tsx
 *
 * /export：把会话复制到剪贴板或导出到文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ExportDialog.tsx
 * pieces: chunk-am3vy82s.js (3)
 * attribution: sole-consumer 1, affinity 1, fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { y } from "../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useProject } from "../context/session.js";
import { useCwdDerived } from "../utils/cwd.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { setClipboard } from "../ink/termio/osc.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { writeExportFile } from "../commands/export/export.js";
import { getCaps } from "../bootstrap/state.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { Box, Text } from "../ink/components/Text.js";
import { TextInput } from "./TextInput.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-am3vy82s.js:18832-18870 sole-consumer
function selectOriginalCwd(Le) {
  return Le.originalCwd;
}
//@ chunk-am3vy82s.js:18870-18900 affinity
function selectCwd(Re) {
  return Re.cwd;
}
/**
 * /export：选择复制到剪贴板或导出到文件（默认文件名带时间），完成后显示结果。
 */
//@ chunk-am3vy82s.js:18900-21471 fingerprint = ExportDialog (0.776)
function ExportDialog(a) {
  let $ = w(32),
    { content: content, defaultFilename: defaultFilename, onDone: onDone } = a,
    [, v] = y(null),
    [p, f] = y(defaultFilename),
    [D, Be] = y(defaultFilename.length),
    [i, X] = y(!1),
    { columns: columns } = useTerminalSize(),
    originalCwd = useProject(selectOriginalCwd),
    Pe = useCwdDerived(useProject(selectCwd)),
    z;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((z = () => {
      (X(!1), v(null));
    }),
      ($[0] = z));
  else z = $[0];
  let Te = z,
    K;
  if ($[1] !== content || $[2] !== onDone)
    ((K = async (value) => {
      if (value === "clipboard") {
        let raw = await setClipboard(content);
        if (raw) process.stdout.write(raw);
        (logFeatureOk("export_clipboard"),
          onDone({ success: !0, message: "Conversation copied to clipboard" }));
      } else if (value === "file") (v("file"), X(!0));
    }),
      ($[1] = content),
      ($[2] = onDone),
      ($[3] = K));
  else K = $[3];
  let k = K,
    Y;
  if ($[4] !== content || $[5] !== p || $[6] !== onDone)
    ((Y = async () => {
      try {
        let _e = await writeExportFile(p, content);
        (logFeatureOk("export_file"), onDone({ success: !0, message: `Conversation exported to: ${_e}` }));
      } catch (error) {
        let Z = error;
        (logFeatureBad("export_file", "write_failed"),
          onDone({
            success: !1,
            message: `Failed to export conversation: ${Z instanceof Error ? Z.message : "Unknown error"}`,
          }));
      }
    }),
      ($[4] = content),
      ($[5] = p),
      ($[6] = onDone),
      ($[7] = Y));
  else Y = $[7];
  let B = Y,
    C;
  if ($[8] !== onDone || $[9] !== i)
    ((C = () => {
      if (i) Te();
      else onDone({ success: !1, message: "Export cancelled" });
    }),
      ($[8] = onDone),
      ($[9] = i),
      ($[10] = C));
  else C = $[10];
  let d = C,
    Ge = getCaps().workspace === "remote" && originalCwd !== Pe,
    H;
  if ($[11] === MEMO_CACHE_SENTINEL)
    ((H = {
      label: "Copy to clipboard",
      value: "clipboard",
      description: "Copy the conversation to your system clipboard",
    }),
      ($[11] = H));
  else H = $[11];
  const finalFilename = Ge
    ? "Save the conversation to a file in the directory claude was launched from"
    : "Save the conversation to a file in the current directory";
  let ee;
  if ($[12] !== finalFilename)
    ((ee = [H, { label: "Save to file", value: "file", description: finalFilename }]),
      ($[12] = finalFilename),
      ($[13] = ee));
  else ee = $[13];
  let P = ee,
    oe;
  if ($[14] !== i)
    ((oe = i
      ? r(Byline, {
          children: [
            e(KeyboardShortcutHint, { chord: "enter", action: "save" }),
            e(ConfigurableShortcutHint, {
              action: "confirm:no",
              context: "Confirmation",
              fallback: "Esc",
              description: "go back",
            }),
          ],
        })
      : e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "cancel",
        })),
      ($[14] = i),
      ($[15] = oe));
  else oe = $[15];
  let T = oe,
    te;
  if ($[16] !== i) ((te = { context: "Settings", isActive: i }), ($[16] = i), ($[17] = te));
  else te = $[17];
  useKeybinding("confirm:no", d, te);
  const _ = !i;
  let F;
  if (
    $[18] !== columns ||
    $[19] !== D ||
    $[20] !== p ||
    $[21] !== d ||
    $[22] !== B ||
    $[23] !== k ||
    $[24] !== P ||
    $[25] !== i
  )
    ((F = !i
      ? e(ModelSelector, { options: P, onChange: k, onCancel: d })
      : r(Box, {
          flexDirection: "column",
          children: [
            e(Text, { children: "Enter filename:" }),
            r(Box, {
              flexDirection: "row",
              gap: 1,
              marginTop: 1,
              children: [
                e(Text, { children: ">" }),
                e(TextInput, {
                  value: p,
                  onChange: f,
                  onSubmit: B,
                  focus: !0,
                  showCursor: !0,
                  columns: columns,
                  cursorOffset: D,
                  onChangeCursorOffset: Be,
                }),
              ],
            }),
          ],
        })),
      ($[18] = columns),
      ($[19] = D),
      ($[20] = p),
      ($[21] = d),
      ($[22] = B),
      ($[23] = k),
      ($[24] = P),
      ($[25] = i),
      ($[26] = F));
  else F = $[26];
  let ne;
  if ($[27] !== d || $[28] !== T || $[29] !== _ || $[30] !== F)
    ((ne = e(Dialog, {
      title: "Export conversation",
      subtitle: "Select export method",
      color: "permission",
      onCancel: d,
      inputGuide: T,
      isCancelActive: _,
      children: F,
    })),
      ($[27] = d),
      ($[28] = T),
      ($[29] = _),
      ($[30] = F),
      ($[31] = ne));
  else ne = $[31];
  return ne;
}

export { ExportDialog };
