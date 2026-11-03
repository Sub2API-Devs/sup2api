/**
 * components/TeleportRepoMismatchDialog.tsx
 *
 * teleport 时当前仓库不匹配，选择其他路径。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TeleportRepoMismatchDialog.tsx
 * pieces: chunk-s1ks86z4.js (3)
 * attribution: sole-consumer 2, fingerprint 1
 */
import { j, y } from "../../vendor/react/cjs/react.production.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { getDisplayPath } from "../utils/file.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { validateRepoAtPath, removePathFromRepo } from "../utils/githubRepoPathMapping.js";
import { Box, Text } from "../ink/components/Text.js";
import { ErrorText } from "./ErrorText.js";
import { Spinner } from "./Spinner.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-s1ks86z4.js:14448-14452 sole-consumer
j();
//@ chunk-s1ks86z4.js:14452-14500 sole-consumer
function J(E) {
  return e(OrderedListWithItem.Item, { label: getDisplayPath(E) }, E);
}
//@ chunk-s1ks86z4.js:14500-15718 fingerprint = TeleportRepoMismatchDialog (0.688)
function TeleportRepoMismatchDialog(t0) {
  let $ = w(15),
    {
      targetRepo: targetRepo,
      initialPaths: initialPaths,
      onSelectPath: onSelectPath,
      onCancel: onCancel,
      storageV5: storageV5,
    } = t0,
    [a, Q] = y(initialPaths),
    [g, x] = y(null),
    [f, M] = y(!1),
    S;
  if ($[0] !== a || $[1] !== onSelectPath || $[2] !== storageV5 || $[3] !== targetRepo)
    ((S = async (value) => {
      if ((M(!0), x(null), await validateRepoAtPath(value, targetRepo))) {
        onSelectPath(value);
        return;
      }
      removePathFromRepo(targetRepo, value, storageV5);
      let updatedPaths = a.filter((U) => U !== value);
      (Q(updatedPaths),
        M(!1),
        x(`${getDisplayPath(value)} no longer contains the correct repository. Select another path.`));
    }),
      ($[0] = a),
      ($[1] = onSelectPath),
      ($[2] = storageV5),
      ($[3] = targetRepo),
      ($[4] = S));
  else S = $[4];
  let v = S,
    d;
  if ($[5] !== a || $[6] !== g || $[7] !== v || $[8] !== onCancel || $[9] !== targetRepo || $[10] !== f)
    ((d =
      a.length > 0
        ? r(Fragment, {
            children: [
              r(Box, {
                flexDirection: "column",
                gap: 1,
                children: [
                  e(ErrorText, { error: g }),
                  r(Text, {
                    children: ["Open Claude Code in ", e(Text, { bold: !0, children: targetRepo }), ":"],
                  }),
                ],
              }),
              f
                ? r(Box, {
                    children: [e(Spinner, {}), e(Text, { children: " Validating repository\u2026" })],
                  })
                : r(OrderedListWithItem, {
                    onSelect: (value_0) => {
                      let B = a[value_0];
                      if (B === void 0) {
                        onCancel();
                        return;
                      }
                      v(B);
                    },
                    children: [a.map(J), e(OrderedListWithItem.Item, { label: "Cancel" }, "cancel")],
                  }),
            ],
          })
        : r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              e(ErrorText, { error: g }),
              r(Text, { dimColor: !0, children: ["Run claude --teleport from a checkout of ", targetRepo] }),
            ],
          })),
      ($[5] = a),
      ($[6] = g),
      ($[7] = v),
      ($[8] = onCancel),
      ($[9] = targetRepo),
      ($[10] = f),
      ($[11] = d));
  else d = $[11];
  let D;
  if ($[12] !== onCancel || $[13] !== d)
    ((D = e(Dialog, {
      title: "Teleport to Repo",
      onCancel: onCancel,
      exitOnCtrlCD: !0,
      color: "background",
      children: d,
    })),
      ($[12] = onCancel),
      ($[13] = d),
      ($[14] = D));
  else D = $[14];
  return D;
}
