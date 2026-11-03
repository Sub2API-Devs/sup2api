/**
 * utils/cliArgvReader.ts
 *
 * 2.1.316 新增。注入式命令行参数读取器（避免循环依赖）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cmr2yp8m.js (3)
 * attribution: placement 3
 */
import { ge } from "./identity.js";

//@ chunk-cmr2yp8m.js:227-272 placement
var r = ge({ read: void 0 }, (e) => {
  e.read = void 0;
});
//@ chunk-cmr2yp8m.js:272-297 placement
function installCliArgvReader(e) {
  r.read = e;
}
/**
 * 注入式命令行参数读取器（避免循环依赖）。
 */
//@ chunk-cmr2yp8m.js:297-326 placement
function cliArgvReader() {
  return r.read;
}

export { cliArgvReader };
