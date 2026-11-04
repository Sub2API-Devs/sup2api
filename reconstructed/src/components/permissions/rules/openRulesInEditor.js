/**
 * components/permissions/rules/openRulesInEditor.ts
 *
 * 把规则写入文件并用外部编辑器打开（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p2qwpk2k.js (5)
 * attribution: placement 5
 */
import { join } from "path";
import { randomBytes } from "crypto";
import { open } from "fs/promises";
import { constants } from "fs";
import { init_react_production, useState, useRef } from "../../../../vendor/react/cjs/react.production.js";
import { claudeTempDir } from "../../../utils/tempDir.js";
import { AUTO_MODE_BUILTINS } from "../../../utils/teleport/autoModeDumps.js";
import { openFileInExternalEditor, resolveEditorCommand, getShortEditorName } from "../../../utils/editor.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MAX_DISPLAY_UNITS } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { Text } from "../../../ink/components/Text.js";

//@ chunk-p2qwpk2k.js:49860-49864 placement
init_react_production();
//@ chunk-p2qwpk2k.js:49999-50031 placement
function toBulletLine(text) {
  return `- ${text}`;
}
//@ chunk-p2qwpk2k.js:50031-50260 placement
async function writeBuiltinRulesFile(section, text) {
  let filePath = join(
    claudeTempDir(),
    `${AUTO_MODE_BUILTINS}${section}-${randomBytes(8).toString("hex")}.md`,
  );
  let handle = await open(
    filePath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    384,
  );
  try {
    await handle.writeFile(text, "utf8");
  } finally {
    await handle.close();
  }
  return {
    opened: openFileInExternalEditor(filePath),
    path: filePath,
  };
}
//@ chunk-p2qwpk2k.js:50260-50753 placement
/**
 * 把规则写到文件并用 $VISUAL/$EDITOR 打开
 */
function openRulesInEditor(section) {
  let $ = useMemoCache(5);
  let [errorMessage, setErrorMessage] = useState(null);
  let inFlightRef = useRef(false);
  let openEditor;
  if ($[0] !== section) {
    openEditor = (text) => {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      writeBuiltinRulesFile(section, text)
        .then((result) => {
          let { opened, path } = result;
          setErrorMessage(
            opened
              ? `opening ${path}`
              : resolveEditorCommand()
                ? `wrote ${path} \u2014 the editor could not be launched`
                : `wrote ${path} \u2014 no $VISUAL/$EDITOR set`,
          );
        })
        .catch((error) => {
          setErrorMessage(
            `could not write the file: ${error instanceof Error ? error.message : String(error)}`,
          );
        })
        .finally(() => {
          inFlightRef.current = false;
        });
    };
    $[0] = section;
    $[1] = openEditor;
  } else openEditor = $[1];
  let openEditorFn = openEditor;
  let state;
  if ($[2] !== openEditorFn || $[3] !== errorMessage) {
    state = [errorMessage, openEditorFn];
    $[2] = openEditorFn;
    $[3] = errorMessage;
    $[4] = state;
  } else state = $[4];
  return state;
}
//@ chunk-p2qwpk2k.js:50753-51445 placement = UltrareviewOverageDialog (0.349)
function UltrareviewOverageDialog(props) {
  let $ = useMemoCache(13);
  let { entry, onCancel } = props;
  let [editor, openEditor] = openRulesInEditor(entry.section);
  if (entry.text.length <= MAX_DISPLAY_UNITS) {
    return null;
  }
  let options;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: `View the full text in editor${getShortEditorName() ? ` (${getShortEditorName()})` : ""}`,
        value: "editor",
      },
      {
        label: "Cancel",
        value: "cancel",
      },
    ];
    $[0] = options;
  } else options = $[0];
  let onChange;
  if ($[1] !== entry.text || $[2] !== openEditor || $[3] !== onCancel) {
    onChange = (value) => {
      if (value === "editor") openEditor(entry.text);
      else onCancel();
    };
    $[1] = entry.text;
    $[2] = openEditor;
    $[3] = onCancel;
    $[4] = onChange;
  } else onChange = $[4];
  let modelSelectorElement;
  if ($[5] !== onCancel || $[6] !== onChange) {
    modelSelectorElement = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
    });
    $[5] = onCancel;
    $[6] = onChange;
    $[7] = modelSelectorElement;
  } else modelSelectorElement = $[7];
  let handleCancel;
  if ($[8] !== editor) {
    handleCancel =
      editor !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: editor,
      });
    $[8] = editor;
    $[9] = handleCancel;
  } else handleCancel = $[9];
  let fragmentElement;
  if ($[10] !== modelSelectorElement || $[11] !== handleCancel) {
    fragmentElement = jsxProd_default_2(Fragment, {
      children: [modelSelectorElement, handleCancel],
    });
    $[10] = modelSelectorElement;
    $[11] = handleCancel;
    $[12] = fragmentElement;
  } else fragmentElement = $[12];
  return fragmentElement;
}
export { UltrareviewOverageDialog, openRulesInEditor, toBulletLine };
