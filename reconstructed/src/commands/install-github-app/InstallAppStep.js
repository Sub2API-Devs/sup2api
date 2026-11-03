/**
 * commands/install-github-app/InstallAppStep.tsx
 *
 * GitHub App 安装向导：安装 Claude GitHub App 步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/InstallAppStep.tsx
 * pieces: chunk-4v9zy7gn.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { GITHUB_ACTION_SETUP_DOCS_URL } from "../../constants/github-app.js";

//@ chunk-4v9zy7gn.js:32810-34294 fingerprint = InstallAppStep (0.475)
function InstallAppStep(t0) {
  let f = w(12),
    { repoUrl: repoUrl, onSubmit: onSubmit } = t0,
    C;
  if (f[0] === MEMO_CACHE_SENTINEL) ((C = { context: "Confirmation" }), (f[0] = C));
  else C = f[0];
  useKeybinding("confirm:yes", onSubmit, C);
  let u;
  if (f[1] === MEMO_CACHE_SENTINEL)
    ((u = e(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: e(Text, { bold: !0, children: "Install the Claude GitHub App" }),
    })),
      (f[1] = u));
  else u = f[1];
  let o;
  if (f[2] === MEMO_CACHE_SENTINEL)
    ((o = e(Box, {
      marginBottom: 1,
      children: e(Text, { children: "Opening browser to install the Claude GitHub App\u2026" }),
    })),
      (f[2] = o));
  else o = f[2];
  let v;
  if (f[3] === MEMO_CACHE_SENTINEL)
    ((v = e(Box, {
      marginBottom: 1,
      children: e(Text, { children: "If your browser doesn't open automatically, visit:" }),
    })),
      (f[3] = v));
  else v = f[3];
  let A;
  if (f[4] === MEMO_CACHE_SENTINEL)
    ((A = e(Box, {
      marginBottom: 1,
      children: e(Text, { underline: !0, children: "https://github.com/apps/claude" }),
    })),
      (f[4] = A));
  else A = f[4];
  let g;
  if (f[5] !== repoUrl)
    ((g = e(Box, {
      marginBottom: 1,
      children: r(Text, {
        children: ["Please install the app for repository: ", e(Text, { bold: !0, children: repoUrl })],
      }),
    })),
      (f[5] = repoUrl),
      (f[6] = g));
  else g = f[6];
  let _;
  if (f[7] === MEMO_CACHE_SENTINEL)
    ((_ = e(Box, {
      marginBottom: 1,
      children: e(Text, {
        dimColor: !0,
        children: "Important: Make sure to grant access to this specific repository",
      }),
    })),
      (f[7] = _));
  else _ = f[7];
  let k;
  if (f[8] === MEMO_CACHE_SENTINEL)
    ((k = e(Box, {
      children: r(Text, {
        bold: !0,
        color: "permission",
        children: ["Press Enter once you've installed the app", re.ellipsis],
      }),
    })),
      (f[8] = k));
  else k = f[8];
  let E;
  if (f[9] === MEMO_CACHE_SENTINEL)
    ((E = e(Box, {
      marginTop: 1,
      children: r(Text, {
        dimColor: !0,
        children: [
          "Having trouble? See manual setup instructions at:",
          " ",
          e(Text, { color: "claude", children: GITHUB_ACTION_SETUP_DOCS_URL }),
        ],
      }),
    })),
      (f[9] = E));
  else E = f[9];
  let x;
  if (f[10] !== g)
    ((x = r(Box, { flexDirection: "column", children: [u, o, v, A, g, _, k, E] })), (f[10] = g), (f[11] = x));
  else x = f[11];
  return x;
}

export { InstallAppStep };
