/**
 * components/permissions/rules/WorkspaceTab.tsx
 *
 * 工作目录标签页：原始工作目录与追加目录列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/WorkspaceTab.tsx
 * pieces: chunk-p2qwpk2k.js (6)
 * attribution: placement 1, layout 2, fingerprint 2, file-local 1
 */
import { j, P } from "../../../../vendor/react/cjs/react.production.js";
import { hr } from "../../../utils/invisibleChars.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTabHeaderFocus } from "../../design-system/Tabs.js";
import { useProject } from "../../../context/session.js";
import { uniqueLabels } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { ModelSelector } from "../../agents/ModelSelector.js";

//@ chunk-p2qwpk2k.js:33366-33370 placement
j();
//@ chunk-p2qwpk2k.js:33370-33408 layout
function selectOriginalCwd(Ve) {
  return Ve.originalCwd;
}
//@ chunk-p2qwpk2k.js:33408-33468 fingerprint = _temp (1)
function vc(path) {
  return { path: path, isCurrent: !1, isDeletable: !0 };
}
//@ chunk-p2qwpk2k.js:33468-33499 file-local
function bc(dir) {
  return dir.path;
}
//@ chunk-p2qwpk2k.js:33499-33529 layout
function Cc($e) {
  return hr($e);
}
//@ chunk-p2qwpk2k.js:33529-35210 fingerprint = WorkspaceTab (0.849)
function WorkspaceTab(t0) {
  let $ = w(29),
    {
      onCancel: onCancel,
      toolPermissionContext: toolPermissionContext,
      onRequestAddDirectory: onRequestAddDirectory,
      onRequestRemoveDirectory: onRequestRemoveDirectory,
      onHeaderFocusChange: onHeaderFocusChange,
    } = t0,
    { headerFocused: headerFocused, focusHeader: focusHeader } = useTabHeaderFocus(),
    originalCwd = useProject(selectOriginalCwd),
    M,
    b;
  if ($[0] !== headerFocused || $[1] !== onHeaderFocusChange)
    ((M = () => {
      onHeaderFocusChange(headerFocused);
    }),
      (b = [headerFocused, onHeaderFocusChange]),
      ($[0] = headerFocused),
      ($[1] = onHeaderFocusChange),
      ($[2] = M),
      ($[3] = b));
  else ((M = $[2]), (b = $[3]));
  P(M, b);
  let T;
  if ($[4] !== toolPermissionContext.additionalWorkingDirectories)
    ((T = Array.from(toolPermissionContext.additionalWorkingDirectories.keys()).map(vc)),
      ($[4] = toolPermissionContext.additionalWorkingDirectories),
      ($[5] = T));
  else T = $[5];
  let E = T,
    D;
  if ($[6] !== E || $[7] !== onRequestAddDirectory || $[8] !== onRequestRemoveDirectory)
    ((D = (selectedValue) => {
      if (selectedValue === "add-directory") {
        onRequestAddDirectory();
        return;
      }
      let directory = E.find((V) => V.path === selectedValue);
      if (directory && directory.isDeletable) onRequestRemoveDirectory(directory.path);
    }),
      ($[6] = E),
      ($[7] = onRequestAddDirectory),
      ($[8] = onRequestRemoveDirectory),
      ($[9] = D));
  else D = $[9];
  let B = D,
    Y;
  if ($[10] !== E) {
    let se = uniqueLabels(E.map(bc), Cc);
    let mapped = E.map((Re, le) => ({ label: se[le], value: Re.path }));
    Y = (mapped.push({ label: `Add directory${re.ellipsis}`, value: "add-directory" }), mapped);
    (($[10] = E), ($[11] = Y));
  } else Y = $[11];
  let K = Y,
    ye;
  if ($[12] !== originalCwd) ((ye = hr(originalCwd)), ($[12] = originalCwd), ($[13] = ye));
  else ye = $[13];
  const ue = `-  ${ye}`;
  let ee;
  if ($[14] !== ue) ((ee = e(Text, { children: ue })), ($[14] = ue), ($[15] = ee));
  else ee = $[15];
  let ce;
  if ($[16] === MEMO_CACHE_SENTINEL)
    ((ce = e(Text, { dimColor: !0, children: "(Original working directory)" })), ($[16] = ce));
  else ce = $[16];
  let te;
  if ($[17] !== ee)
    ((te = r(Box, { flexDirection: "row", marginTop: 1, marginLeft: 2, gap: 1, children: [ee, ce] })),
      ($[17] = ee),
      ($[18] = te));
  else te = $[18];
  const t7 = Math.min(10, K.length);
  let de;
  if (
    $[19] !== focusHeader ||
    $[20] !== B ||
    $[21] !== headerFocused ||
    $[22] !== onCancel ||
    $[23] !== K ||
    $[24] !== t7
  )
    ((de = e(ModelSelector, {
      options: K,
      onChange: B,
      onCancel: onCancel,
      visibleOptionCount: t7,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
      hidePromptWhileDisabled: !0,
    })),
      ($[19] = focusHeader),
      ($[20] = B),
      ($[21] = headerFocused),
      ($[22] = onCancel),
      ($[23] = K),
      ($[24] = t7),
      ($[25] = de));
  else de = $[25];
  let X;
  if ($[26] !== te || $[27] !== de)
    ((X = r(Box, { flexDirection: "column", marginBottom: 1, children: [te, de] })),
      ($[26] = te),
      ($[27] = de),
      ($[28] = X));
  else X = $[28];
  return X;
}

export { WorkspaceTab };
