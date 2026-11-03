/**
 * services/api/_new/returnValue.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: sole-consumer-new 1
 */

//@ chunk-e6aww6q8.js:922105-922183 sole-consumer-new = returnValue (1)
async function returnValue(as) {
  let n;
  do n = await as.next();
  while (!n.done);
  return n.value;
}

export { returnValue };
