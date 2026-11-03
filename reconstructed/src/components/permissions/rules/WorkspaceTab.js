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
import { init_react_production, P } from "../../../../vendor/react/cjs/react.production.js";
import { stripInvisibleChars } from "../../../utils/invisibleChars.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTabHeaderFocus } from "../../design-system/Tabs.js";
import { useProject } from "../../../context/session.js";
import { uniqueLabels } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { ModelSelector } from "../../agents/ModelSelector.js";

//@ chunk-p2qwpk2k.js:33366-33370 placement
init_react_production();
//@ chunk-p2qwpk2k.js:33370-33408 layout
function selectOriginalCwd(Ve) {
  return Ve.originalCwd;
}
//@ chunk-p2qwpk2k.js:33408-33468 fingerprint = _temp (1)
function toWorkspaceDirRow(path) {
  return {
    path,
    isCurrent: false,
    isDeletable: true,
  };
}
//@ chunk-p2qwpk2k.js:33468-33499 file-local
function dirPath(dir) {
  return dir.path;
}
//@ chunk-p2qwpk2k.js:33499-33529 layout
function displayDirPath($e) {
  return stripInvisibleChars($e);
}
//@ chunk-p2qwpk2k.js:33529-35210 fingerprint = WorkspaceTab (0.849)
function WorkspaceTab(props) {
  let $ = w(29);
  let {
    onCancel,
    toolPermissionContext,
    onRequestAddDirectory,
    onRequestRemoveDirectory,
    onHeaderFocusChange,
  } = props;
  let { headerFocused, focusHeader } = useTabHeaderFocus();
  let originalCwd = useProject(selectOriginalCwd);
  let t1;
  let t2;
  if ($[0] !== headerFocused || $[1] !== onHeaderFocusChange) {
    t1 = () => {
      onHeaderFocusChange(headerFocused);
    };
    t2 = [headerFocused, onHeaderFocusChange];
    $[0] = headerFocused;
    $[1] = onHeaderFocusChange;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  P(t1, t2);
  let t3;
  if ($[4] !== toolPermissionContext.additionalWorkingDirectories) {
    t3 = Array.from(toolPermissionContext.additionalWorkingDirectories.keys()).map(toWorkspaceDirRow);
    $[4] = toolPermissionContext.additionalWorkingDirectories;
    $[5] = t3;
  } else t3 = $[5];
  let E = t3;
  let t4;
  if ($[6] !== E || $[7] !== onRequestAddDirectory || $[8] !== onRequestRemoveDirectory) {
    t4 = (selectedValue) => {
      if (selectedValue === "add-directory") {
        onRequestAddDirectory();
        return;
      }
      let directory = E.find((V) => V.path === selectedValue);
      if (directory && directory.isDeletable) onRequestRemoveDirectory(directory.path);
    };
    $[6] = E;
    $[7] = onRequestAddDirectory;
    $[8] = onRequestRemoveDirectory;
    $[9] = t4;
  } else t4 = $[9];
  let onChange = t4;
  let t5;
  if ($[10] !== E) {
    let se = uniqueLabels(E.map(dirPath), displayDirPath);
    let mapped = E.map((Re, le) => ({
      label: se[le],
      value: Re.path,
    }));
    t5 =
      (mapped.push({
        label: `Add directory${figures_default.ellipsis}`,
        value: "add-directory",
      }),
      mapped);
    $[10] = E;
    $[11] = t5;
  } else t5 = $[11];
  let K = t5;
  let ye;
  if ($[12] !== originalCwd) {
    ye = stripInvisibleChars(originalCwd);
    $[12] = originalCwd;
    $[13] = ye;
  } else ye = $[13];
  const children = `-  ${ye}`;
  let ee;
  if ($[14] !== children) {
    ee = jsxProd_default(Text, {
      children,
    });
    $[14] = children;
    $[15] = ee;
  } else ee = $[15];
  let ce;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    ce = jsxProd_default(Text, {
      dimColor: true,
      children: "(Original working directory)",
    });
    $[16] = ce;
  } else ce = $[16];
  let te;
  if ($[17] !== ee) {
    te = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop: 1,
      marginLeft: 2,
      gap: 1,
      children: [ee, ce],
    });
    $[17] = ee;
    $[18] = te;
  } else te = $[18];
  const visibleOptionCount = Math.min(10, K.length);
  let de;
  if (
    $[19] !== focusHeader ||
    $[20] !== onChange ||
    $[21] !== headerFocused ||
    $[22] !== onCancel ||
    $[23] !== K ||
    $[24] !== visibleOptionCount
  ) {
    de = jsxProd_default(ModelSelector, {
      options: K,
      onChange,
      onCancel,
      visibleOptionCount,
      onUpFromFirstItem: focusHeader,
      isDisabled: headerFocused,
      hidePromptWhileDisabled: true,
    });
    $[19] = focusHeader;
    $[20] = onChange;
    $[21] = headerFocused;
    $[22] = onCancel;
    $[23] = K;
    $[24] = visibleOptionCount;
    $[25] = de;
  } else de = $[25];
  let X;
  if ($[26] !== te || $[27] !== de) {
    X = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [te, de],
    });
    $[26] = te;
    $[27] = de;
    $[28] = X;
  } else X = $[28];
  return X;
}
export { WorkspaceTab };
