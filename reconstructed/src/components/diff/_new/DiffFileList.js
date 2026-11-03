/**
 * components/diff/_new/DiffFileList.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mtx4csef.js (4)
 * attribution: sole-consumer-new 4
 */
import { e } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { merged } from "../../CustomSelect/select.js";
import { FileItem } from "../DiffFileList.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { HintText } from "../../design-system/HintText.js";

//@ chunk-mtx4csef.js:17021-17036 sole-consumer-new
function Vt() {}
//@ chunk-mtx4csef.js:17036-17102 sole-consumer-new
function Ht(U) {
  return e(merged.Item, { children: e(FileItem, { file: U }) }, U.path);
}
//@ chunk-mtx4csef.js:17102-17111 sole-consumer-new
var Fe = 7;
/**
 * /diff 对话框的变更文件列表；没有文件时显示 “No changed files”。
 */
//@ chunk-mtx4csef.js:17111-17588 sole-consumer-new
function DiffFileList(a) {
  let T = w(9),
    {
      files: files,
      defaultFocusIndex: defaultFocusIndex,
      resetKey: resetKey,
      onFocus: onFocus,
      onSelect: onSelect,
    } = a;
  if (files.length === 0) {
    let m;
    if (T[0] === MEMO_CACHE_SENTINEL) ((m = e(HintText, { children: "No changed files" })), (T[0] = m));
    else m = T[0];
    return m;
  }
  let m;
  if (T[1] !== files) ((m = files.map(Ht)), (T[1] = files), (T[2] = m));
  else m = T[2];
  let d;
  if (T[3] !== defaultFocusIndex || T[4] !== onFocus || T[5] !== onSelect || T[6] !== resetKey || T[7] !== m)
    ((d = e(merged, {
      visibleCount: Fe,
      defaultFocusIndex: defaultFocusIndex,
      resetKey: resetKey,
      onFocus: onFocus,
      onSelect: onSelect,
      onUpFromFirstItem: Vt,
      children: m,
    })),
      (T[3] = defaultFocusIndex),
      (T[4] = onFocus),
      (T[5] = onSelect),
      (T[6] = resetKey),
      (T[7] = m),
      (T[8] = d));
  else d = T[8];
  return d;
}

export { DiffFileList };
