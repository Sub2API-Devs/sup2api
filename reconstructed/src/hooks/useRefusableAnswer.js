/**
 * hooks/useRefusableAnswer.ts
 *
 * 2.1.316 新增：可拒绝回答的 hook
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-x35ttgf3.js (2)
 * attribution: placement 2
 */
import { j, y, ce, P } from "../../vendor/react/cjs/react.production.js";

//@ chunk-x35ttgf3.js:233-237 placement
j();
//@ chunk-x35ttgf3.js:237-557 placement
function useRefusableAnswer(r) {
  let [t, n] = y({ attempts: 0, refused: null }),
    s = ce((e) => {
      n((a) => ({ attempts: a.attempts + 1, refused: e }));
    }, []),
    u = ce(
      (e) => {
        if (r(e) === !1) return (s(e), !1);
        return !0;
      },
      [r, s],
    );
  return (
    P(() => {
      if (t.refused !== null) n((e) => ({ attempts: e.attempts, refused: null }));
    }, [t.refused]),
    { answer: u, refuse: s, refused: t.refused, attempts: t.attempts }
  );
}

export { useRefusableAnswer };
