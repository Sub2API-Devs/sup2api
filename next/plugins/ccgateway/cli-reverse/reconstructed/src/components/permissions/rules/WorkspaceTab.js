/**
 * components/permissions/rules/WorkspaceTab.tsx
 *
 * 工作目录标签页：原始工作目录与追加目录列表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/WorkspaceTab.tsx
 * pieces: chunk-h5wy8vq5.js (6)
 * attribution: placement 1, layout 2, fingerprint 2, file-local 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useEffect } from "../../../../vendor/react/cjs/react.production.js";
import { stripInvisibleChars } from "../../../utils/invisibleChars.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
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

//@ chunk-h5wy8vq5.js:34486-34490 placement
init_react_production();
//@ chunk-h5wy8vq5.js:34490-34528 layout
function selectOriginalCwd(state) {
  return state.originalCwd;
}
//@ chunk-h5wy8vq5.js:34528-34588 fingerprint (2.1.88 match: _temp, 1)
function toWorkspaceDirRow(path) {
  return {
    path,
    isCurrent: false,
    isDeletable: true,
  };
}
//@ chunk-h5wy8vq5.js:34588-34619 file-local
function dirPath(dir) {
  return dir.path;
}
//@ chunk-h5wy8vq5.js:34619-34649 layout
function displayDirPath(dirPath) {
  return stripInvisibleChars(dirPath);
}
//@ chunk-h5wy8vq5.js:34649-36330 fingerprint (2.1.88 match: WorkspaceTab, 0.849)
function WorkspaceTab(props) {
  let $ = useMemoCache(29);
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
  useEffect(t1, t2);
  let t3;
  if ($[4] !== toolPermissionContext.additionalWorkingDirectories) {
    t3 = Array.from(toolPermissionContext.additionalWorkingDirectories.keys()).map(toWorkspaceDirRow);
    $[4] = toolPermissionContext.additionalWorkingDirectories;
    $[5] = t3;
  } else t3 = $[5];
  let directories = t3;
  let t4;
  if ($[6] !== directories || $[7] !== onRequestAddDirectory || $[8] !== onRequestRemoveDirectory) {
    t4 = (selectedValue) => {
      if (selectedValue === "add-directory") {
        onRequestAddDirectory();
        return;
      }
      let directory = directories.find((state) => state.path === selectedValue);
      if (directory && directory.isDeletable) onRequestRemoveDirectory(directory.path);
    };
    $[6] = directories;
    $[7] = onRequestAddDirectory;
    $[8] = onRequestRemoveDirectory;
    $[9] = t4;
  } else t4 = $[9];
  let onChange = t4;
  let t5;
  if ($[10] !== directories) {
    let dirLabels = uniqueLabels(directories.map(dirPath), displayDirPath);
    let mapped = directories.map((directory, index) => ({
      label: dirLabels[index],
      value: directory.path,
    }));
    t5 =
      (mapped.push({
        label: `Add directory${figures_default.ellipsis}`,
        value: "add-directory",
      }),
      mapped);
    $[10] = directories;
    $[11] = t5;
  } else t5 = $[11];
  let options = t5;
  let cwdLabel;
  if ($[12] !== originalCwd) {
    cwdLabel = stripInvisibleChars(originalCwd);
    $[12] = originalCwd;
    $[13] = cwdLabel;
  } else cwdLabel = $[13];
  const children = `-  ${cwdLabel}`;
  let cwdText;
  if ($[14] !== children) {
    cwdText = jsxProd_default(Text, {
      children,
    });
    $[14] = children;
    $[15] = cwdText;
  } else cwdText = $[15];
  let originalNote;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    originalNote = jsxProd_default(Text, {
      dimColor: true,
      children: "(Original working directory)",
    });
    $[16] = originalNote;
  } else originalNote = $[16];
  let cwdRow;
  if ($[17] !== cwdText) {
    cwdRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginTop: 1,
      marginLeft: 2,
      gap: 1,
      children: [cwdText, originalNote],
    });
    $[17] = cwdText;
    $[18] = cwdRow;
  } else cwdRow = $[18];
  const visibleOptionCount = Math.min(10, options.length);
  let modelSelectorElement;
  if (
    $[19] !== focusHeader ||
    $[20] !== onChange ||
    $[21] !== headerFocused ||
    $[22] !== onCancel ||
    $[23] !== options ||
    $[24] !== visibleOptionCount
  ) {
    modelSelectorElement = jsxProd_default(ModelSelector, {
      options,
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
    $[23] = options;
    $[24] = visibleOptionCount;
    $[25] = modelSelectorElement;
  } else modelSelectorElement = $[25];
  let column;
  if ($[26] !== cwdRow || $[27] !== modelSelectorElement) {
    column = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [cwdRow, modelSelectorElement],
    });
    $[26] = cwdRow;
    $[27] = modelSelectorElement;
    $[28] = column;
  } else column = $[28];
  return column;
}
export { WorkspaceTab };
