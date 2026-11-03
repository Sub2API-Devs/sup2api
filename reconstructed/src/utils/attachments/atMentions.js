/**
 * utils/attachments/atMentions.ts
 *
 * 2.1.316 新增：@ 提及附件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */

//@ chunk-e6aww6q8.js:3194472-3194556 placement
var rAe = "\u3002\u3001\uFF1F\uFF01",
  gq = String.raw`[\s${"\u3002\u3001\uFF1F\uFF01"}]`;
//@ chunk-e6aww6q8.js:3194556-3194653 placement
function Rfn(e, n) {
  let code = e.charCodeAt(n);
  return (
    (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || code === 95 || (code >= 97 && code <= 122)
  );
}

export { gq, Rfn, rAe };
