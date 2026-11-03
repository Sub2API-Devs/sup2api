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
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";
import { Dialog } from "../../design-system/Dialog.js";

//@ chunk-p2qwpk2k.js:32506-33366 fingerprint = RemoveWorkspaceDirectory (0.681)
function RemoveWorkspaceDirectory(t0) {
  let $ = w(15),
    {
      directoryPath: directoryPath,
      onRemove: onRemove,
      onCancel: onCancel,
      permissionContext: permissionContext,
      setPermissionContext: setPermissionContext,
    } = t0,
    x;
  if (
    $[0] !== directoryPath ||
    $[1] !== onRemove ||
    $[2] !== permissionContext ||
    $[3] !== setPermissionContext
  )
    ((x = () => {
      let updatedContext = applyValidatedPermissionUpdate(permissionContext, {
        type: "removeDirectories",
        directories: [directoryPath],
        destination: "session",
      });
      (setPermissionContext(updatedContext), onRemove());
    }),
      ($[0] = directoryPath),
      ($[1] = onRemove),
      ($[2] = permissionContext),
      ($[3] = setPermissionContext),
      ($[4] = x));
  else x = $[4];
  let c = x,
    M;
  if ($[5] !== directoryPath)
    ((M = e(Box, {
      marginX: 2,
      flexDirection: "column",
      children: e(Text, { bold: !0, children: directoryPath }),
    })),
      ($[5] = directoryPath),
      ($[6] = M));
  else M = $[6];
  let b;
  if ($[7] === MEMO_CACHE_SENTINEL)
    ((b = e(Text, { children: "Claude Code will no longer have access to files in this directory." })),
      ($[7] = b));
  else b = $[7];
  let T;
  if ($[8] !== c || $[9] !== onCancel)
    ((T = e(ConfirmSelect, { focus: "cancel", hideIndexes: !0, onConfirm: c, onCancel: onCancel })),
      ($[8] = c),
      ($[9] = onCancel),
      ($[10] = T));
  else T = $[10];
  let E;
  if ($[11] !== onCancel || $[12] !== M || $[13] !== T)
    ((E = r(Dialog, {
      title: "Remove directory from workspace?",
      onCancel: onCancel,
      color: "error",
      children: [M, b, T],
    })),
      ($[11] = onCancel),
      ($[12] = M),
      ($[13] = T),
      ($[14] = E));
  else E = $[14];
  return E;
}

export { RemoveWorkspaceDirectory };
