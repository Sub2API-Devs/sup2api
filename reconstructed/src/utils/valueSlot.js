/**
 * utils/valueSlot.ts
 *
 * 2.1.316 新增：简单可设置的值槽
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6k13djcn.js (1)
 * attribution: placement 1
 */

//@ chunk-6k13djcn.js:191-244 placement
function to() {
  let t;
  return {
    set: (o) => {
      t = o;
    },
    get: () => t,
  };
}

export { to };
