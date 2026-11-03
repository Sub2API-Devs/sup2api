/**
 * commands/review/UltrareviewLaunchDialog.tsx
 *
 * ultrareview 启动确认对话框（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0eepcc6r.js (6)
 * attribution: placement 6
 */
import { j, y, R } from "../../../vendor/react/cjs/react.production.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getReviewDurationNote, getReviewCostNote } from "./ultrareviewPreconditions.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { useInputRefusalWindow, useRefusalTracker } from "../../components/CustomSelect/selectTypeahead.js";
import { previewInstructions } from "./reviewRemote.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { CCR_TERMS_URL_ULTRAPLAN } from "../ultraplan.js";
import { ShimmerLoadingText } from "../../components/permissions/PermissionExplanation.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";

//@ chunk-0eepcc6r.js:14131-14135 placement
j();
//@ chunk-0eepcc6r.js:14135-14185 placement
function Ve() {
  return !getGlobalConfig().hasSeenUltrareviewTerms;
}
//@ chunk-0eepcc6r.js:14185-14269 placement
function Xe(x) {
  return x.hasSeenUltrareviewTerms ? x : { ...x, hasSeenUltrareviewTerms: !0 };
}
//@ chunk-0eepcc6r.js:14269-14444 placement
var UPLOAD_NOTICE =
  "This will upload your repository to a cloud session for the review, which may include staged and unstaged changes you haven't committed yet, but not untracked files.";
/**
 * ultrareview 启动确认对话框（含费用估算、可选把结果发到 PR）
 */
//@ chunk-0eepcc6r.js:14444-15639 placement
function UltrareviewLaunchDialog(P) {
  let L = w(23),
    {
      subtitle: subtitle,
      body: body,
      scope: scope,
      postOption: postOption,
      onProceed: onProceed,
      onCancel: onCancel,
    } = P;
  useRegisterOverlay("ultrareview-launch");
  let { storageV5: storageV5 } = Me(),
    [t] = y(Ve),
    [u, k] = y(!1),
    [g, F] = y(null),
    p;
  if (L[0] === MEMO_CACHE_SENTINEL) ((p = new AbortController()), (L[0] = p));
  else p = L[0];
  let f = R(p),
    T = R(!1),
    M;
  if (L[1] !== onCancel || L[2] !== onProceed || L[3] !== t || L[4] !== storageV5)
    ((M = (D) => {
      if (T.current) {
        return;
      }
      if (((T.current = !0), D === "proceed" || D === "proceed-post")) {
        if (t) saveGlobalConfig(Xe, storageV5);
        (F(D),
          k(!0),
          onProceed(f.current.signal, { postToPR: D === "proceed-post" }).catch(() => {
            ((T.current = !1), k(!1));
          }));
      } else (f.current.abort(), onCancel());
    }),
      (L[1] = onCancel),
      (L[2] = onProceed),
      (L[3] = t),
      (L[4] = storageV5),
      (L[5] = M));
  else M = L[5];
  let U = M,
    B;
  if (L[6] !== onCancel)
    ((B = () => {
      ((T.current = !0), f.current.abort(), onCancel());
    }),
      (L[6] = onCancel),
      (L[7] = B));
  else B = L[7];
  let N = B,
    I;
  if (L[8] !== subtitle)
    ((I = subtitle ?? `${getReviewDurationNote()} \xB7 Est. cost ${getReviewCostNote()} USD`),
      (L[8] = subtitle),
      (L[9] = I));
  else I = L[9];
  let A;
  if (
    L[10] !== body ||
    L[11] !== N ||
    L[12] !== U ||
    L[13] !== u ||
    L[14] !== g ||
    L[15] !== postOption ||
    L[16] !== scope ||
    L[17] !== t
  )
    ((A = e(UltrareviewLaunchDetails, {
      showTerms: t,
      body: body,
      scope: scope,
      postOption: postOption,
      retryFocus: g,
      isLaunching: u,
      onSelect: U,
      onCancel: N,
    })),
      (L[10] = body),
      (L[11] = N),
      (L[12] = U),
      (L[13] = u),
      (L[14] = g),
      (L[15] = postOption),
      (L[16] = scope),
      (L[17] = t),
      (L[18] = A));
  else A = L[18];
  let G;
  if (L[19] !== N || L[20] !== I || L[21] !== A)
    ((G = e(Dialog, { title: "Run ultrareview in the cloud?", subtitle: I, onCancel: N, children: A })),
      (L[19] = N),
      (L[20] = I),
      (L[21] = A),
      (L[22] = G));
  else G = L[22];
  return G;
}
/**
 * ultrareview 启动对话框正文：说明审查流程、是否把结果作为普通评论发到 PR
 */
//@ chunk-0eepcc6r.js:15639-19212 placement
function UltrareviewLaunchDetails(P) {
  let L = w(30),
    {
      showTerms: showTerms,
      body: body,
      scope: scope,
      postOption: postOption,
      retryFocus: retryFocus,
      isLaunching: isLaunching,
      onSelect: onSelect,
      onCancel: onCancel,
    } = P,
    u = postOption
      ? `When it finishes, Claude can post the findings to the PR as a single comment from your GitHub account${postOption.githubLogin ? ` (@${postOption.githubLogin})` : ""} \u2014 one plain comment, not a review or an approval, and it carries a "Generated by Claude Code" note.`
      : null,
    k = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    p;
  if (L[0] !== k || L[1] !== noteRefused || L[2] !== refusedWithin)
    ((p = function f() {
      if (k() || refusedWithin()) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      (L[0] = k),
      (L[1] = noteRefused),
      (L[2] = refusedWithin),
      (L[3] = p));
  else p = L[3];
  let f = p,
    T;
  if (L[4] !== onSelect || L[5] !== f)
    ((T = (M) => {
      if (f()) {
        return;
      }
      onSelect(M);
    }),
      (L[4] = onSelect),
      (L[5] = f),
      (L[6] = T));
  else T = L[6];
  let D = T,
    U =
      scope.mode === "pr"
        ? `Reviewing ${scope.repo}#${scope.prNumber} fetched from GitHub.`
        : scope.noMergeBase === "unrelated_history"
          ? `Reviewing all files (no common history with ${scope.baseBranch}).`
          : scope.noMergeBase === "base_ref_missing"
            ? `Reviewing all files (no ${scope.baseBranch} branch to compare against).`
            : scope.noMergeBase === "first_commit"
              ? "Reviewing every file in the first commit (there is nothing earlier to compare with)."
              : scope.headBranch === scope.baseBranch
                ? `Reviewing local changes on ${scope.baseBranch}.`
                : `Reviewing ${scope.headBranch} against ${scope.baseBranch}.`,
    B = scope.mode === "branch" && scope.diffStat ? scope.diffStat : null,
    N = scope.mode === "branch" ? UPLOAD_NOTICE : null,
    I;
  if (L[7] !== scope.instructions || L[8] !== scope.mode)
    ((I =
      scope.mode === "branch" && scope.instructions
        ? `Note for findings (not a base branch): "${previewInstructions(scope.instructions)}"`
        : null),
      (L[7] = scope.instructions),
      (L[8] = scope.mode),
      (L[9] = I));
  else I = L[9];
  let A = I,
    G =
      scope.mode === "pr"
        ? "Tip: run /code-review ultra (no number) to review your current branch instead."
        : "Tip: run /code-review ultra <PR number> to fetch and review a specific GitHub PR instead.",
    x;
  if (
    L[10] !== body ||
    L[11] !== B ||
    L[12] !== A ||
    L[13] !== u ||
    L[14] !== U ||
    L[15] !== showTerms ||
    L[16] !== N ||
    L[17] !== G
  )
    ((x = showTerms
      ? r(Fragment, {
          children: [
            r(Box, {
              flexDirection: "column",
              children: [
                e(Text, { dimColor: !0, children: U }),
                B && r(Text, { dimColor: !0, children: ["Scope: ", B] }),
                N && e(Text, { dimColor: !0, children: N }),
                A && e(Text, { dimColor: !0, children: A }),
                e(Text, {
                  dimColor: !0,
                  children: "Finds and verifies bugs using a multi-agent review fleet.",
                }),
                e(Text, { dimColor: !0, children: G }),
                body && e(Text, { dimColor: !0, children: body }),
                u && e(Text, { dimColor: !0, children: u }),
                r(Text, {
                  dimColor: !0,
                  children: [
                    "More information: ",
                    e(Link, { url: CCR_TERMS_URL_ULTRAPLAN, children: CCR_TERMS_URL_ULTRAPLAN }),
                  ],
                }),
              ],
            }),
            e(Text, { children: "Proceed?" }),
          ],
        })
      : r(Box, {
          flexDirection: "column",
          children: [
            e(Text, { dimColor: !0, children: U }),
            B && r(Text, { dimColor: !0, children: ["Scope: ", B] }),
            N && e(Text, { dimColor: !0, children: N }),
            A && e(Text, { dimColor: !0, children: A }),
            e(Text, { dimColor: !0, children: "Finds and verifies bugs using a multi-agent review fleet." }),
            e(Text, { dimColor: !0, children: G }),
            body && e(Text, { dimColor: !0, children: body }),
            u && e(Text, { dimColor: !0, children: u }),
          ],
        })),
      (L[10] = body),
      (L[11] = B),
      (L[12] = A),
      (L[13] = u),
      (L[14] = U),
      (L[15] = showTerms),
      (L[16] = N),
      (L[17] = G),
      (L[18] = x));
  else x = L[18];
  let Q;
  if (
    L[19] !== D ||
    L[20] !== isLaunching ||
    L[21] !== onCancel ||
    L[22] !== postOption ||
    L[23] !== f ||
    L[24] !== retryFocus ||
    L[25] !== showTerms
  )
    ((Q = isLaunching
      ? e(ShimmerLoadingText, {})
      : postOption
        ? e(ModelSelector, {
            options: [
              {
                label: "Run and only show findings here",
                value: "proceed",
                description: "launch in a cloud session",
              },
              { label: "Cancel", value: "cancel" },
              {
                label: "Run and post the findings to the PR as me",
                value: "proceed-post",
                description: "launch in a cloud session",
              },
            ],
            defaultFocusValue: retryFocus ?? (postOption.preferPost ? "proceed-post" : "proceed"),
            refuseInput: f,
            selectedValue: NO_COMMITTED_ROW,
            onChange: D,
            onCancel: onCancel,
          })
        : e(ModelSelector, {
            options: [
              {
                label: showTerms ? "Yes" : "Run ultrareview",
                value: "proceed",
                description: "launch in a cloud session",
              },
              { label: showTerms ? "No" : "Not now", value: "cancel" },
            ],
            refuseInput: f,
            selectedValue: NO_COMMITTED_ROW,
            onChange: D,
            onCancel: onCancel,
          })),
      (L[19] = D),
      (L[20] = isLaunching),
      (L[21] = onCancel),
      (L[22] = postOption),
      (L[23] = f),
      (L[24] = retryFocus),
      (L[25] = showTerms),
      (L[26] = Q));
  else Q = L[26];
  let be;
  if (L[27] !== x || L[28] !== Q)
    ((be = r(Box, { flexDirection: "column", gap: 1, children: [x, Q] })),
      (L[27] = x),
      (L[28] = Q),
      (L[29] = be));
  else be = L[29];
  return be;
}

export { UltrareviewLaunchDialog };
