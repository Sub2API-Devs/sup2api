/**
 * components/permissions/rules/RemoveWorkspaceDirectory.tsx
 *
 * 移除工作目录确认。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/RemoveWorkspaceDirectory.tsx
 * pieces: chunk-p2qwpk2k.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { applyValidatedPermissionUpdate } from "../../../utils/permissions/PermissionUpdate.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";
import { Dialog } from "../../design-system/Dialog.js";

//@ chunk-p2qwpk2k.js:32506-33366 fingerprint = RemoveWorkspaceDirectory (0.681)
function RemoveWorkspaceDirectory(props) {
  let $ = w(15);
  let { directoryPath, onRemove, onCancel, permissionContext, setPermissionContext } = props;
  let t1;
  if (
    $[0] !== directoryPath ||
    $[1] !== onRemove ||
    $[2] !== permissionContext ||
    $[3] !== setPermissionContext
  ) {
    t1 = () => {
      let updatedContext = applyValidatedPermissionUpdate(permissionContext, {
        type: "removeDirectories",
        directories: [directoryPath],
        destination: "session",
      });
      setPermissionContext(updatedContext);
      onRemove();
    };
    $[0] = directoryPath;
    $[1] = onRemove;
    $[2] = permissionContext;
    $[3] = setPermissionContext;
    $[4] = t1;
  } else t1 = $[4];
  let onConfirm = t1;
  let M;
  if ($[5] !== directoryPath) {
    M = jsxProd_default(Box, {
      marginX: 2,
      flexDirection: "column",
      children: jsxProd_default(Text, {
        bold: true,
        children: directoryPath,
      }),
    });
    $[5] = directoryPath;
    $[6] = M;
  } else M = $[6];
  let b;
  if ($[7] === MEMO_CACHE_SENTINEL) {
    b = jsxProd_default(Text, {
      children: "Claude Code will no longer have access to files in this directory.",
    });
    $[7] = b;
  } else b = $[7];
  let t6;
  if ($[8] !== onConfirm || $[9] !== onCancel) {
    t6 = jsxProd_default(ConfirmSelect, {
      focus: "cancel",
      hideIndexes: true,
      onConfirm,
      onCancel,
    });
    $[8] = onConfirm;
    $[9] = onCancel;
    $[10] = t6;
  } else t6 = $[10];
  let t7;
  if ($[11] !== onCancel || $[12] !== M || $[13] !== t6) {
    t7 = jsxProd_default_2(Dialog, {
      title: "Remove directory from workspace?",
      onCancel,
      color: "error",
      children: [M, b, t6],
    });
    $[11] = onCancel;
    $[12] = M;
    $[13] = t6;
    $[14] = t7;
  } else t7 = $[14];
  return t7;
}
export { RemoveWorkspaceDirectory };
