/**
 * utils/teleport/uploadManifestText.ts
 *
 * 2.1.316 新增：上传清单的显示文本（留在本机的条目、未列出的文件）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bs59k3zm.js (7)
 * attribution: placement 7
 */
import { formatFileSize } from "../format.js";
import { plural } from "../stringUtils.js";
import { printableName } from "../printableName.js";
import { doe } from "../../tools/PublishPluginTool/constants.js";

//@ chunk-bs59k3zm.js:335-377 placement
var Y0s = (t) => `${t.path} (${formatFileSize(t.bytes)})`;
//@ chunk-bs59k3zm.js:377-464 placement
var cTo = (t, r) => [t].filter((e) => e > 0).map((e) => `and ${e} more ${plural(e, r)} not named here`);
//@ chunk-bs59k3zm.js:464-512 placement
var IOr = (t) => (/^ */.exec(t)?.[0] ?? "") + printableName(t, doe);
//@ chunk-bs59k3zm.js:512-648 placement
var staysOnMachineLines = (t) =>
  [t]
    .filter((r) => r > 0)
    .map(
      (r) =>
        `${r} ${plural(r, "entry stays", "entries stay")} on this machine (secrets, links, ignored files)`,
    );
//@ chunk-bs59k3zm.js:648-767 placement
var manifestWriteLines = (t) =>
  [t ?? []].flat().flatMap((r) => [
    `Writes this manifest first, to ${r.path}:`,
    ...r.text.trimEnd().split(`
`),
  ]);
//@ chunk-bs59k3zm.js:767-815 placement
var a = (t) => `stays here: ${t.path} (${t.words})`;
//@ chunk-bs59k3zm.js:815-948 placement
var manifestEntryLines = (t) =>
  [
    ...t.files.map(Y0s),
    ...cTo(t.unnamed?.files ?? 0, "file"),
    ...t.stays.map(a),
    ...cTo(t.unnamed?.stays ?? 0, "entry"),
  ].map(IOr);

export { IOr, staysOnMachineLines, manifestWriteLines, Y0s, cTo, manifestEntryLines };
