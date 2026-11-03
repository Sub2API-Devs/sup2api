/**
 * main/fastPathSubcommands.ts
 *
 * 2.1.316 新增：启动快速路径子命令判定（plugins、upgrade 等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y7y3wdde.js (6)
 * attribution: placement 6
 */

//@ chunk-y7y3wdde.js:191-260 placement
var r = new Set(["update", "upgrade", "doctor", "forward-home-settings"]);
//@ chunk-y7y3wdde.js:260-283 placement
function i(o) {
  return !1;
}
//@ chunk-y7y3wdde.js:283-352 placement
function s(o) {
  let index = o.indexOf("mcp");
  return index !== -1 && o[index + 1] === "serve";
}
//@ chunk-y7y3wdde.js:352-432 placement
function a(o) {
  let index = o.indexOf("agents");
  return index !== -1 && o.includes("--json", index + 1);
}
//@ chunk-y7y3wdde.js:432-515 placement
function c(o) {
  return o.some((n, e) => (n === "plugin" || n === "plugins") && o[e + 1] === "eval");
}
//@ chunk-y7y3wdde.js:515-580 placement
function l(o) {
  return o.some((n) => n === "remote-control" || n === "rc");
}
