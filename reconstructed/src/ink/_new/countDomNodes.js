/**
 * ink/_new/countDomNodes.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-bzr73sfg.js (3)
 * attribution: sole-consumer-new 3
 */

//@ chunk-bzr73sfg.js:258541-258557 sole-consumer-new
var fiberStack = [],
  domStack = [];
//@ chunk-bzr73sfg.js:258557-258754 sole-consumer-new
function countFibers(root) {
  if (!root) return 0;
  let u = 0,
    f = fiberStack;
  ((f.length = 0), f.push(root));
  while (f.length > 0) {
    let m = f.pop();
    if ((u++, m.alternate)) u++;
    if (m.sibling) f.push(m.sibling);
    if (m.child) f.push(m.child);
  }
  return ((f.length = 0), u);
}
//@ chunk-bzr73sfg.js:258754-258955 sole-consumer-new = clearYogaNodeReferences (0.804)
function countDomNodes(root) {
  if (!root) return 0;
  let u = 0,
    f = domStack;
  ((f.length = 0), f.push(root));
  while (f.length > 0) {
    let m = f.pop();
    if ((u++, "childNodes" in m)) {
      let childNodes = m.childNodes;
      for (let g = 0; g < childNodes.length; g++) f.push(childNodes[g]);
    }
  }
  return ((f.length = 0), u);
}

export { countDomNodes, countFibers };
