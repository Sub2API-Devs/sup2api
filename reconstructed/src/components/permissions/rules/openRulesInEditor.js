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
import { randomBytes, randomBytes as randomBytes_2 } from "crypto";
import { open } from "fs/promises";
import { constants, constants as constants_2 } from "fs";
import { j, y, R } from "../../../../vendor/react/cjs/react.production.js";
import { claudeTempDir } from "../../../utils/tempDir.js";
import { AUTO_MODE_BUILTINS } from "../../../utils/teleport/autoModeDumps.js";
import { openFileInExternalEditor, wM, C5 } from "../../../utils/editor.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MAX_DISPLAY_UNITS } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { Text } from "../../../ink/components/Text.js";

//@ chunk-p2qwpk2k.js:49860-49864 placement
j();
//@ chunk-p2qwpk2k.js:49999-50031 placement
function tp(dt) {
  return `- ${dt}`;
}
//@ chunk-p2qwpk2k.js:50031-50260 placement
async function writeBuiltinRulesFile(h, i) {
  let m = join(claudeTempDir(), `${AUTO_MODE_BUILTINS}${h}-${randomBytes(8).toString("hex")}.md`),
    a = await open(m, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 384);
  try {
    await a.writeFile(i, "utf8");
  } finally {
    await a.close();
  }
  return { opened: openFileInExternalEditor(m), path: m };
}
/**
 * 把规则写到文件并用 $VISUAL/$EDITOR 打开
 */
//@ chunk-p2qwpk2k.js:50260-50753 placement
function openRulesInEditor(h) {
  let f = w(5),
    [i, m] = y(null),
    a = R(!1),
    g;
  if (f[0] !== h)
    ((g = (v) => {
      if (a.current) {
        return;
      }
      ((a.current = !0),
        writeBuiltinRulesFile(h, v)
          .then((x) => {
            let { opened: opened, path: path } = x;
            m(
              opened
                ? `opening ${path}`
                : wM()
                  ? `wrote ${path} \u2014 the editor could not be launched`
                  : `wrote ${path} \u2014 no $VISUAL/$EDITOR set`,
            );
          })
          .catch((M) => {
            m(`could not write the file: ${M instanceof Error ? M.message : String(M)}`);
          })
          .finally(() => {
            a.current = !1;
          }));
    }),
      (f[0] = h),
      (f[1] = g));
  else g = f[1];
  let b = g,
    x;
  if (f[2] !== b || f[3] !== i) ((x = [i, b]), (f[2] = b), (f[3] = i), (f[4] = x));
  else x = f[4];
  return x;
}
//@ chunk-p2qwpk2k.js:50753-51445 placement = UltrareviewOverageDialog (0.349)
function UltrareviewOverageDialog(t0) {
  let g = w(13),
    { entry: entry, onCancel: onCancel } = t0,
    [a, f] = openRulesInEditor(entry.section);
  if (entry.text.length <= MAX_DISPLAY_UNITS) {
    return null;
  }
  let v;
  if (g[0] === MEMO_CACHE_SENTINEL)
    ((v = [
      { label: `View the full text in editor${C5() ? ` (${C5()})` : ""}`, value: "editor" },
      { label: "Cancel", value: "cancel" },
    ]),
      (g[0] = v));
  else v = g[0];
  let x;
  if (g[1] !== entry.text || g[2] !== f || g[3] !== onCancel)
    ((x = (value) => {
      if (value === "editor") f(entry.text);
      else onCancel();
    }),
      (g[1] = entry.text),
      (g[2] = f),
      (g[3] = onCancel),
      (g[4] = x));
  else x = g[4];
  let c;
  if (g[5] !== onCancel || g[6] !== x)
    ((c = e(ModelSelector, { options: v, onChange: x, onCancel: onCancel })),
      (g[5] = onCancel),
      (g[6] = x),
      (g[7] = c));
  else c = g[7];
  let M;
  if (g[8] !== a)
    ((M = a !== null && e(Text, { dimColor: !0, wrap: "wrap-trim", children: a })), (g[8] = a), (g[9] = M));
  else M = g[9];
  let b;
  if (g[10] !== c || g[11] !== M)
    ((b = r(Fragment, { children: [c, M] })), (g[10] = c), (g[11] = M), (g[12] = b));
  else b = g[12];
  return b;
}

export { UltrareviewOverageDialog, openRulesInEditor, tp };
