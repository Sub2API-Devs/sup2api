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
import { init_react_production, y, R } from "../../../../vendor/react/cjs/react.production.js";
import { claudeTempDir } from "../../../utils/tempDir.js";
import { AUTO_MODE_BUILTINS } from "../../../utils/teleport/autoModeDumps.js";
import { openFileInExternalEditor, resolveEditorCommand, getShortEditorName } from "../../../utils/editor.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
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
function toBulletLine(dt) {
  return `- ${dt}`;
}
//@ chunk-p2qwpk2k.js:50031-50260 placement
async function writeBuiltinRulesFile(h, i) {
  let filePath = join(claudeTempDir(), `${AUTO_MODE_BUILTINS}${h}-${randomBytes(8).toString("hex")}.md`);
  let a = await open(
    filePath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
    384,
  );
  try {
    await a.writeFile(i, "utf8");
  } finally {
    await a.close();
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
  let f = w(5);
  let [i, m] = y(null);
  let a = R(false);
  let g;
  if (f[0] !== section) {
    g = (v) => {
      if (a.current) {
        return;
      }
      a.current = true;
      writeBuiltinRulesFile(section, v)
        .then((x) => {
          let { opened, path } = x;
          m(
            opened
              ? `opening ${path}`
              : resolveEditorCommand()
                ? `wrote ${path} \u2014 the editor could not be launched`
                : `wrote ${path} \u2014 no $VISUAL/$EDITOR set`,
          );
        })
        .catch((error) => {
          m(`could not write the file: ${error instanceof Error ? error.message : String(error)}`);
        })
        .finally(() => {
          a.current = false;
        });
    };
    f[0] = section;
    f[1] = g;
  } else g = f[1];
  let b = g;
  let x;
  if (f[2] !== b || f[3] !== i) {
    x = [i, b];
    f[2] = b;
    f[3] = i;
    f[4] = x;
  } else x = f[4];
  return x;
}
//@ chunk-p2qwpk2k.js:50753-51445 placement = UltrareviewOverageDialog (0.349)
function UltrareviewOverageDialog(props) {
  let g = w(13);
  let { entry, onCancel } = props;
  let [a, f] = openRulesInEditor(entry.section);
  if (entry.text.length <= MAX_DISPLAY_UNITS) {
    return null;
  }
  let options;
  if (g[0] === MEMO_CACHE_SENTINEL) {
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
    g[0] = options;
  } else options = g[0];
  let onChange;
  if (g[1] !== entry.text || g[2] !== f || g[3] !== onCancel) {
    onChange = (value) => {
      if (value === "editor") f(entry.text);
      else onCancel();
    };
    g[1] = entry.text;
    g[2] = f;
    g[3] = onCancel;
    g[4] = onChange;
  } else onChange = g[4];
  let c;
  if (g[5] !== onCancel || g[6] !== onChange) {
    c = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
    });
    g[5] = onCancel;
    g[6] = onChange;
    g[7] = c;
  } else c = g[7];
  let M;
  if (g[8] !== a) {
    M =
      a !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap-trim",
        children: a,
      });
    g[8] = a;
    g[9] = M;
  } else M = g[9];
  let b;
  if (g[10] !== c || g[11] !== M) {
    b = jsxProd_default_2(Fragment, {
      children: [c, M],
    });
    g[10] = c;
    g[11] = M;
    g[12] = b;
  } else b = g[12];
  return b;
}
export { UltrareviewOverageDialog, openRulesInEditor, toBulletLine };
