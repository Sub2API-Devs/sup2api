/**
 * utils/teleport/uploadManifestText.ts
 *
 * 2.1.316 新增：上传清单的显示文本（留在本机的条目、未列出的文件）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2pnk09ft.js (7)
 * attribution: placement 7
 */
import { formatFileSize } from "../format.js";
import { plural } from "../stringUtils.js";
import { printableName } from "../printableName.js";
import { MAX_PUBLISH_META_CHARS } from "../../tools/PublishPluginTool/constants.js";

//@ chunk-2pnk09ft.js:335-377 placement
/**
 * 上传清单里的一行：路径与大小。
 */
var fileEntryLine = (entry) => `${entry.path} (${formatFileSize(entry.bytes)})`;
//@ chunk-2pnk09ft.js:377-464 placement
/**
 * 「另有 N 个未列出的文件」提示。
 */
var moreFilesNote = (count, kind) =>
  [count]
    .filter((positive) => positive > 0)
    .map((value) => `and ${value} more ${plural(value, kind)} not named here`);
//@ chunk-2pnk09ft.js:464-512 placement
/**
 * 保留缩进的清单名称行。
 */
var indentedPrintableName = (title) =>
  (/^ */.exec(title)?.[0] ?? "") + printableName(title, MAX_PUBLISH_META_CHARS);
//@ chunk-2pnk09ft.js:512-648 placement
var staysOnMachineLines = (count) =>
  [count]
    .filter((positive) => positive > 0)
    .map(
      (value) =>
        `${value} ${plural(value, "entry stays", "entries stay")} on this machine (secrets, links, ignored files)`,
    );
//@ chunk-2pnk09ft.js:648-767 placement
var manifestWriteLines = (manifests) =>
  [manifests ?? []].flat().flatMap((manifest) => [
    `Writes this manifest first, to ${manifest.path}:`,
    ...manifest.text.trimEnd().split(`
`),
  ]);
//@ chunk-2pnk09ft.js:767-815 placement
var staysEntryLine = (entry) => `stays here: ${entry.path} (${entry.words})`;
//@ chunk-2pnk09ft.js:815-948 placement
var manifestEntryLines = (manifest) =>
  [
    ...manifest.files.map(fileEntryLine),
    ...moreFilesNote(manifest.unnamed?.files ?? 0, "file"),
    ...manifest.stays.map(staysEntryLine),
    ...moreFilesNote(manifest.unnamed?.stays ?? 0, "entry"),
  ].map(indentedPrintableName);
export {
  manifestWriteLines,
  staysOnMachineLines,
  manifestEntryLines,
  indentedPrintableName,
  fileEntryLine,
  moreFilesNote,
};
