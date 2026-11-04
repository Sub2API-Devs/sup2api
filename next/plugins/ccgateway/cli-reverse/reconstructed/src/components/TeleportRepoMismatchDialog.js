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
import { init_react_production, useState } from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { getDisplayPath } from "../utils/file.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { validateRepoAtPath, removePathFromRepo } from "../utils/githubRepoPathMapping.js";
import { Box, Text } from "../ink/components/Text.js";
import { ErrorText } from "./ErrorText.js";
import { Spinner } from "./Spinner.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-s1ks86z4.js:14448-14452 sole-consumer
init_react_production();
//@ chunk-s1ks86z4.js:14452-14500 sole-consumer
function renderRepoItem(path) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: getDisplayPath(path),
    },
    path,
  );
}
//@ chunk-s1ks86z4.js:14500-15718 fingerprint (2.1.88 match: TeleportRepoMismatchDialog, 0.688)
function TeleportRepoMismatchDialog(props) {
  let $ = useMemoCache(15);
  let { targetRepo, initialPaths, onSelectPath, onCancel, storageV5 } = props;
  let [availablePaths, setAvailablePaths] = useState(initialPaths);
  let [errorMessage, setErrorMessage] = useState(null);
  let [validating, setValidating] = useState(false);
  let t1;
  if ($[0] !== availablePaths || $[1] !== onSelectPath || $[2] !== storageV5 || $[3] !== targetRepo) {
    t1 = async (value) => {
      setValidating(true);
      setErrorMessage(null);
      if (await validateRepoAtPath(value, targetRepo)) {
        onSelectPath(value);
        return;
      }
      removePathFromRepo(targetRepo, value, storageV5);
      let updatedPaths = availablePaths.filter((availablePath) => availablePath !== value);
      setAvailablePaths(updatedPaths);
      setValidating(false);
      setErrorMessage(
        `${getDisplayPath(value)} no longer contains the correct repository. Select another path.`,
      );
    };
    $[0] = availablePaths;
    $[1] = onSelectPath;
    $[2] = storageV5;
    $[3] = targetRepo;
    $[4] = t1;
  } else t1 = $[4];
  let handleChange = t1;
  let children;
  if (
    $[5] !== availablePaths ||
    $[6] !== errorMessage ||
    $[7] !== handleChange ||
    $[8] !== onCancel ||
    $[9] !== targetRepo ||
    $[10] !== validating
  ) {
    children =
      availablePaths.length > 0
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default_2(Box, {
                flexDirection: "column",
                gap: 1,
                children: [
                  jsxProd_default(ErrorText, {
                    error: errorMessage,
                  }),
                  jsxProd_default_2(Text, {
                    children: [
                      "Open Claude Code in ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: targetRepo,
                      }),
                      ":",
                    ],
                  }),
                ],
              }),
              validating
                ? jsxProd_default_2(Box, {
                    children: [
                      jsxProd_default(Spinner, {}),
                      jsxProd_default(Text, {
                        children: " Validating repository\u2026",
                      }),
                    ],
                  })
                : jsxProd_default_2(OrderedListWithItem, {
                    onSelect: (value_0) => {
                      let selectedPath = availablePaths[value_0];
                      if (selectedPath === undefined) {
                        onCancel();
                        return;
                      }
                      handleChange(selectedPath);
                    },
                    children: [
                      availablePaths.map(renderRepoItem),
                      jsxProd_default(
                        OrderedListWithItem.Item,
                        {
                          label: "Cancel",
                        },
                        "cancel",
                      ),
                    ],
                  }),
            ],
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              jsxProd_default(ErrorText, {
                error: errorMessage,
              }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: ["Run claude --teleport from a checkout of ", targetRepo],
              }),
            ],
          });
    $[5] = availablePaths;
    $[6] = errorMessage;
    $[7] = handleChange;
    $[8] = onCancel;
    $[9] = targetRepo;
    $[10] = validating;
    $[11] = children;
  } else children = $[11];
  let t4;
  if ($[12] !== onCancel || $[13] !== children) {
    t4 = jsxProd_default(Dialog, {
      title: "Teleport to Repo",
      onCancel,
      exitOnCtrlCD: true,
      color: "background",
      children,
    });
    $[12] = onCancel;
    $[13] = children;
    $[14] = t4;
  } else t4 = $[14];
  return t4;
}
export { TeleportRepoMismatchDialog };
