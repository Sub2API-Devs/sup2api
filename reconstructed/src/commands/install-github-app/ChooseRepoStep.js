/**
 * commands/install-github-app/ChooseRepoStep.tsx
 *
 * GitHub App 安装向导：选择仓库步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/install-github-app/ChooseRepoStep.tsx
 * pieces: chunk-4v9zy7gn.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MessageActionsKeybindings } from "../../components/messageActions.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TextInput } from "../../components/TextInput.js";

//@ chunk-4v9zy7gn.js:27559-29707 fingerprint = ChooseRepoStep (0.84)
function ChooseRepoStep(t0) {
  let x = w(44),
    {
      currentRepo: currentRepo,
      useCurrentRepo: useCurrentRepo,
      repoUrl: repoUrl,
      onRepoUrlChange: onRepoUrlChange,
      onSubmit: onSubmit,
      onToggleUseCurrentRepo: onToggleUseCurrentRepo,
    } = t0,
    [v, A] = y(0),
    [g, _] = y(!1),
    textInputColumns = useTerminalSize().columns,
    T;
  if (x[0] !== currentRepo || x[1] !== onSubmit || x[2] !== repoUrl || x[3] !== useCurrentRepo)
    ((T = () => {
      if (!(useCurrentRepo ? currentRepo : repoUrl)?.trim()) {
        _(!0);
        return;
      }
      onSubmit();
    }),
      (x[0] = currentRepo),
      (x[1] = onSubmit),
      (x[2] = repoUrl),
      (x[3] = useCurrentRepo),
      (x[4] = T));
  else T = x[4];
  let W = T,
    N = !useCurrentRepo || !currentRepo,
    G;
  if (x[5] !== currentRepo || x[6] !== onToggleUseCurrentRepo)
    ((G = () => {
      if (!currentRepo) {
        return;
      }
      (onToggleUseCurrentRepo(!0), _(!1));
    }),
      (x[5] = currentRepo),
      (x[6] = onToggleUseCurrentRepo),
      (x[7] = G));
  else G = x[7];
  let B = G,
    V;
  if (x[8] !== onToggleUseCurrentRepo)
    ((V = () => {
      (onToggleUseCurrentRepo(!1), _(!1));
    }),
      (x[8] = onToggleUseCurrentRepo),
      (x[9] = V));
  else V = x[9];
  let M = V,
    ie;
  if (x[10] !== M || x[11] !== B || x[12] !== W)
    ((ie = { "confirm:previous": B, "confirm:next": M, "confirm:yes": W }),
      (x[10] = M),
      (x[11] = B),
      (x[12] = W),
      (x[13] = ie));
  else ie = x[13];
  const t5 = !N;
  let U;
  if (x[14] !== t5) ((U = { context: "Confirmation", isActive: t5 }), (x[14] = t5), (x[15] = U));
  else U = x[15];
  MessageActionsKeybindings(ie, U);
  let D;
  if (x[16] !== M || x[17] !== B)
    ((D = { "confirm:previous": B, "confirm:next": M }), (x[16] = M), (x[17] = B), (x[18] = D));
  else D = x[18];
  let Y;
  if (x[19] !== N) ((Y = { context: "Confirmation", isActive: N }), (x[19] = N), (x[20] = Y));
  else Y = x[20];
  MessageActionsKeybindings(D, Y);
  let X;
  if (x[21] !== currentRepo || x[22] !== useCurrentRepo)
    ((X =
      currentRepo &&
      e(Box, {
        children: r(Text, {
          bold: useCurrentRepo,
          color: useCurrentRepo ? "permission" : void 0,
          children: [useCurrentRepo ? "> " : "  ", "Use current repository: ", currentRepo],
        }),
      })),
      (x[21] = currentRepo),
      (x[22] = useCurrentRepo),
      (x[23] = X));
  else X = x[23];
  const pe = !useCurrentRepo || !currentRepo,
    ae = !useCurrentRepo || !currentRepo ? "permission" : void 0,
    de = !useCurrentRepo || !currentRepo ? "> " : "  ",
    _e = currentRepo ? "Enter a different repository" : "Enter repository";
  let te;
  if (x[24] !== pe || x[25] !== ae || x[26] !== de || x[27] !== _e)
    ((te = e(Box, { children: r(Text, { bold: pe, color: ae, children: [de, _e] }) })),
      (x[24] = pe),
      (x[25] = ae),
      (x[26] = de),
      (x[27] = _e),
      (x[28] = te));
  else te = x[28];
  let me;
  if (
    x[29] !== currentRepo ||
    x[30] !== v ||
    x[31] !== W ||
    x[32] !== onRepoUrlChange ||
    x[33] !== repoUrl ||
    x[34] !== textInputColumns ||
    x[35] !== useCurrentRepo
  )
    ((me =
      (!useCurrentRepo || !currentRepo) &&
      e(Box, {
        marginLeft: 2,
        children: e(TextInput, {
          value: repoUrl,
          onChange: (value) => {
            (onRepoUrlChange(value), _(!1));
          },
          onSubmit: W,
          focus: !0,
          placeholder: "Enter a repo as owner/repo or https://github.com/owner/repo\u2026",
          columns: textInputColumns,
          cursorOffset: v,
          onChangeCursorOffset: A,
          showCursor: !0,
        }),
      })),
      (x[29] = currentRepo),
      (x[30] = v),
      (x[31] = W),
      (x[32] = onRepoUrlChange),
      (x[33] = repoUrl),
      (x[34] = textInputColumns),
      (x[35] = useCurrentRepo),
      (x[36] = me));
  else me = x[36];
  let se;
  if (x[37] !== g)
    ((se = g && e(Text, { color: "error", children: "Please enter a repository name to continue" })),
      (x[37] = g),
      (x[38] = se));
  else se = x[38];
  let ge;
  if (x[39] !== te || x[40] !== me || x[41] !== se || x[42] !== X)
    ((ge = r(Box, { flexDirection: "column", gap: 1, children: [X, te, me, se] })),
      (x[39] = te),
      (x[40] = me),
      (x[41] = se),
      (x[42] = X),
      (x[43] = ge));
  else ge = x[43];
  return ge;
}

export { ChooseRepoStep };
