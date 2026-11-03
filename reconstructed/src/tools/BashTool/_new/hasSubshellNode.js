/**
 * tools/BashTool/_new/hasSubshellNode.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: sole-consumer-new 3
 */

//@ chunk-e6aww6q8.js:1155366-1155446 sole-consumer-new
var U2t = /^(?:(?:command(?:[ \t]+-p+)*|builtin)(?:[ \t]+--)?|noglob)[ \t]+(?!-)/;
//@ chunk-e6aww6q8.js:1155446-1155517 sole-consumer-new
function YIo(e) {
  let n = e;
  while (U2t.test(n)) n = n.replace(U2t, "");
  return n;
}
/**
 * 判断语法树中是否含子 shell 或复合语句节点。
 */
//@ chunk-e6aww6q8.js:1155517-1155651 sole-consumer-new
function hasSubshellNode(e) {
  if (e.type === "subshell" || e.type === "compound_statement") return !0;
  for (let n of e.children) if (n && hasSubshellNode(n)) return !0;
  return !1;
}

export { hasSubshellNode, YIo };
