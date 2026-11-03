/**
 * commands/install-github-app/SuccessStep.tsx
 *
 * GitHub App 安装向导：完成步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/SuccessStep.tsx
 * pieces: chunk-4v9zy7gn.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";

//@ chunk-4v9zy7gn.js:40689-42521 callgraph-fingerprint = SuccessStep (0.235)
function SuccessStep(t0) {
  let A = w(19),
    {
      secretExists: secretExists,
      useExistingSecret: useExistingSecret,
      secretName: secretName,
      skipWorkflow: t1,
      appOnlyInstall: appOnlyInstall,
    } = t0,
    skipWorkflow = t1 === void 0 ? !1 : t1;
  if (appOnlyInstall === void 0 ? !1 : appOnlyInstall) {
    let g;
    if (A[0] === MEMO_CACHE_SENTINEL)
      ((g = r(Text, {
        color: "success",
        children: [e(StatusIcon, { status: "success", withSpace: !0 }), "GitHub App installed"],
      })),
        (A[0] = g));
    else g = A[0];
    let _;
    if (A[1] === MEMO_CACHE_SENTINEL)
      ((_ = r(Box, {
        flexDirection: "column",
        children: [
          g,
          e(Box, {
            marginTop: 1,
            children: e(Text, {
              children: "Run /install-github-app again anytime to set up GitHub Actions workflows.",
            }),
          }),
        ],
      })),
        (A[1] = _));
    else _ = A[1];
    return _;
  }
  let g;
  if (A[2] !== skipWorkflow)
    ((g =
      !skipWorkflow &&
      r(Text, {
        color: "success",
        children: [e(StatusIcon, { status: "success", withSpace: !0 }), "GitHub Actions workflow created!"],
      })),
      (A[2] = skipWorkflow),
      (A[3] = g));
  else g = A[3];
  let _;
  if (A[4] !== secretExists || A[5] !== useExistingSecret)
    ((_ =
      secretExists &&
      useExistingSecret &&
      e(Box, {
        marginTop: 1,
        children: r(Text, {
          color: "success",
          children: [
            e(StatusIcon, { status: "success", withSpace: !0 }),
            "Using existing ANTHROPIC_API_KEY secret",
          ],
        }),
      })),
      (A[4] = secretExists),
      (A[5] = useExistingSecret),
      (A[6] = _));
  else _ = A[6];
  let k;
  if (A[7] !== secretExists || A[8] !== secretName || A[9] !== useExistingSecret)
    ((k =
      (!secretExists || !useExistingSecret) &&
      e(Box, {
        marginTop: 1,
        children: r(Text, {
          color: "success",
          children: [
            e(StatusIcon, { status: "success", withSpace: !0 }),
            "API key saved as ",
            secretName,
            " secret",
          ],
        }),
      })),
      (A[7] = secretExists),
      (A[8] = secretName),
      (A[9] = useExistingSecret),
      (A[10] = k));
  else k = A[10];
  let E;
  if (A[11] === MEMO_CACHE_SENTINEL)
    ((E = e(Box, { marginTop: 1, children: e(Text, { children: "Next steps:" }) })), (A[11] = E));
  else E = A[11];
  let x;
  if (A[12] !== skipWorkflow)
    ((x = skipWorkflow
      ? r(Fragment, {
          children: [
            e(Text, { children: "1. Install the Claude GitHub App if you haven't already" }),
            e(Text, { children: "2. Your workflow file was kept unchanged" }),
            e(Text, { children: "3. API key is configured and ready to use" }),
          ],
        })
      : r(Fragment, {
          children: [
            e(Text, { children: "1. A pre-filled PR page has been created" }),
            e(Text, { children: "2. Install the Claude GitHub App if you haven't already" }),
            e(Text, { children: "3. Merge the PR to enable Claude PR assistance" }),
          ],
        })),
      (A[12] = skipWorkflow),
      (A[13] = x));
  else x = A[13];
  let T;
  if (A[14] !== g || A[15] !== _ || A[16] !== k || A[17] !== x)
    ((T = r(Box, { flexDirection: "column", children: [g, _, k, E, x] })),
      (A[14] = g),
      (A[15] = _),
      (A[16] = k),
      (A[17] = x),
      (A[18] = T));
  else T = A[18];
  return T;
}

export { SuccessStep };
