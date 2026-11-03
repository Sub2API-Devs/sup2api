/**
 * commands/install-github-app/ErrorStep.tsx
 *
 * GitHub App 安装向导：错误步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/ErrorStep.tsx
 * pieces: chunk-4v9zy7gn.js (2)
 * attribution: file-last-pair 1, fingerprint 1
 */
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BulletRow } from "../../components/design-system/BulletRow.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { GITHUB_ACTION_SETUP_DOCS_URL } from "../../constants/github-app.js";

//@ chunk-4v9zy7gn.js:30650-30695 file-last-pair
function No(instruction, index) {
  return e(BulletRow, { children: instruction }, index);
}
//@ chunk-4v9zy7gn.js:30695-31502 fingerprint = ErrorStep (0.389)
function ErrorStep(t0) {
  let C = w(11),
    { error: error, errorReason: errorReason, errorInstructions: errorInstructions } = t0,
    u;
  if (C[0] !== error)
    ((u = r(Text, { color: "error", children: ["Error: ", error] })), (C[0] = error), (C[1] = u));
  else u = C[1];
  let o;
  if (C[2] !== errorReason)
    ((o =
      errorReason &&
      e(Box, { marginTop: 1, children: r(Text, { dimColor: !0, children: ["Reason: ", errorReason] }) })),
      (C[2] = errorReason),
      (C[3] = o));
  else o = C[3];
  let v;
  if (C[4] !== errorInstructions)
    ((v =
      errorInstructions.length > 0 &&
      r(Box, {
        flexDirection: "column",
        marginTop: 1,
        children: [
          e(Text, { dimColor: !0, children: "How to fix:" }),
          e(Box, { flexDirection: "column", marginLeft: 2, children: errorInstructions.map(No) }),
        ],
      })),
      (C[4] = errorInstructions),
      (C[5] = v));
  else v = C[5];
  let A;
  if (C[6] === MEMO_CACHE_SENTINEL)
    ((A = e(Box, {
      marginTop: 1,
      children: r(Text, {
        dimColor: !0,
        children: [
          "For manual setup instructions, see:",
          " ",
          e(Text, { color: "claude", children: GITHUB_ACTION_SETUP_DOCS_URL }),
        ],
      }),
    })),
      (C[6] = A));
  else A = C[6];
  let g;
  if (C[7] !== u || C[8] !== o || C[9] !== v)
    ((g = r(Box, { flexDirection: "column", children: [u, o, v, A] })),
      (C[7] = u),
      (C[8] = o),
      (C[9] = v),
      (C[10] = g));
  else g = C[10];
  return g;
}

export { ErrorStep };
