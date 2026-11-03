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
import { init_react_production, y, R } from "../../../vendor/react/cjs/react.production.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getReviewDurationNote, getReviewCostNote } from "./ultrareviewPreconditions.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { useInputRefusalWindow, useRefusalTracker } from "../../components/CustomSelect/selectTypeahead.js";
import { previewInstructions } from "./reviewRemote.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { CCR_TERMS_URL_ULTRAPLAN } from "../ultraplan.js";
import { ShimmerLoadingText } from "../../components/permissions/PermissionExplanation.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";

//@ chunk-0eepcc6r.js:14131-14135 placement
init_react_production();
//@ chunk-0eepcc6r.js:14135-14185 placement
function hasNotSeenUltrareviewTerms() {
  return !getGlobalConfig().hasSeenUltrareviewTerms;
}
//@ chunk-0eepcc6r.js:14185-14269 placement
function markUltrareviewTermsSeen(x) {
  return x.hasSeenUltrareviewTerms
    ? x
    : {
        ...x,
        hasSeenUltrareviewTerms: true,
      };
}
//@ chunk-0eepcc6r.js:14269-14444 placement
var UPLOAD_NOTICE =
  "This will upload your repository to a cloud session for the review, which may include staged and unstaged changes you haven't committed yet, but not untracked files.";
//@ chunk-0eepcc6r.js:14444-15639 placement
/**
 * ultrareview 启动确认对话框（含费用估算、可选把结果发到 PR）
 */
function UltrareviewLaunchDialog(props) {
  let L = w(23);
  let { subtitle, body, scope, postOption, onProceed, onCancel } = props;
  useRegisterOverlay("ultrareview-launch");
  let { storageV5 } = useTheme_2();
  let [t] = y(hasNotSeenUltrareviewTerms);
  let [u, k] = y(false);
  let [g, F] = y(null);
  let p;
  if (L[0] === MEMO_CACHE_SENTINEL) {
    p = new AbortController();
    L[0] = p;
  } else p = L[0];
  let f = R(p);
  let T = R(false);
  let M;
  if (L[1] !== onCancel || L[2] !== onProceed || L[3] !== t || L[4] !== storageV5) {
    M = (D) => {
      if (T.current) {
        return;
      }
      T.current = true;
      if (D === "proceed" || D === "proceed-post") {
        if (t) saveGlobalConfig(markUltrareviewTermsSeen, storageV5);
        F(D);
        k(true);
        onProceed(f.current.signal, {
          postToPR: D === "proceed-post",
        }).catch(() => {
          T.current = false;
          k(false);
        });
      } else {
        f.current.abort();
        onCancel();
      }
    };
    L[1] = onCancel;
    L[2] = onProceed;
    L[3] = t;
    L[4] = storageV5;
    L[5] = M;
  } else M = L[5];
  let onSelect = M;
  let B;
  if (L[6] !== onCancel) {
    B = () => {
      T.current = true;
      f.current.abort();
      onCancel();
    };
    L[6] = onCancel;
    L[7] = B;
  } else B = L[7];
  let onCancel_2 = B;
  let subtitle_2;
  if (L[8] !== subtitle) {
    subtitle_2 = subtitle ?? `${getReviewDurationNote()} \xB7 Est. cost ${getReviewCostNote()} USD`;
    L[8] = subtitle;
    L[9] = subtitle_2;
  } else subtitle_2 = L[9];
  let children;
  if (
    L[10] !== body ||
    L[11] !== onCancel_2 ||
    L[12] !== onSelect ||
    L[13] !== u ||
    L[14] !== g ||
    L[15] !== postOption ||
    L[16] !== scope ||
    L[17] !== t
  ) {
    children = jsxProd_default(UltrareviewLaunchDetails, {
      showTerms: t,
      body,
      scope,
      postOption,
      retryFocus: g,
      isLaunching: u,
      onSelect,
      onCancel: onCancel_2,
    });
    L[10] = body;
    L[11] = onCancel_2;
    L[12] = onSelect;
    L[13] = u;
    L[14] = g;
    L[15] = postOption;
    L[16] = scope;
    L[17] = t;
    L[18] = children;
  } else children = L[18];
  let G;
  if (L[19] !== onCancel_2 || L[20] !== subtitle_2 || L[21] !== children) {
    G = jsxProd_default(Dialog, {
      title: "Run ultrareview in the cloud?",
      subtitle: subtitle_2,
      onCancel: onCancel_2,
      children,
    });
    L[19] = onCancel_2;
    L[20] = subtitle_2;
    L[21] = children;
    L[22] = G;
  } else G = L[22];
  return G;
}
//@ chunk-0eepcc6r.js:15639-19212 placement
/**
 * ultrareview 启动对话框正文：说明审查流程、是否把结果作为普通评论发到 PR
 */
function UltrareviewLaunchDetails(props) {
  let L = w(30);
  let { showTerms, body, scope, postOption, retryFocus, isLaunching, onSelect, onCancel } = props;
  let u = postOption
    ? `When it finishes, Claude can post the findings to the PR as a single comment from your GitHub account${postOption.githubLogin ? ` (@${postOption.githubLogin})` : ""} \u2014 one plain comment, not a review or an approval, and it carries a "Generated by Claude Code" note.`
    : null;
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let p;
  if (L[0] !== inputRefusalWindow || L[1] !== noteRefused || L[2] !== refusedWithin) {
    p = function f() {
      if (inputRefusalWindow() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    L[0] = inputRefusalWindow;
    L[1] = noteRefused;
    L[2] = refusedWithin;
    L[3] = p;
  } else p = L[3];
  let f = p;
  let T;
  if (L[4] !== onSelect || L[5] !== f) {
    T = (M) => {
      if (f()) {
        return;
      }
      onSelect(M);
    };
    L[4] = onSelect;
    L[5] = f;
    L[6] = T;
  } else T = L[6];
  let onChange = T;
  let children =
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
              : `Reviewing ${scope.headBranch} against ${scope.baseBranch}.`;
  let diffStat = scope.mode === "branch" && scope.diffStat ? scope.diffStat : null;
  let N = scope.mode === "branch" ? UPLOAD_NOTICE : null;
  let I;
  if (L[7] !== scope.instructions || L[8] !== scope.mode) {
    I =
      scope.mode === "branch" && scope.instructions
        ? `Note for findings (not a base branch): "${previewInstructions(scope.instructions)}"`
        : null;
    L[7] = scope.instructions;
    L[8] = scope.mode;
    L[9] = I;
  } else I = L[9];
  let A = I;
  let children_2 =
    scope.mode === "pr"
      ? "Tip: run /code-review ultra (no number) to review your current branch instead."
      : "Tip: run /code-review ultra <PR number> to fetch and review a specific GitHub PR instead.";
  let x;
  if (
    L[10] !== body ||
    L[11] !== diffStat ||
    L[12] !== A ||
    L[13] !== u ||
    L[14] !== children ||
    L[15] !== showTerms ||
    L[16] !== N ||
    L[17] !== children_2
  ) {
    x = showTerms
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children,
                }),
                diffStat &&
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: ["Scope: ", diffStat],
                  }),
                N &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: N,
                  }),
                A &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: A,
                  }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "Finds and verifies bugs using a multi-agent review fleet.",
                }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: children_2,
                }),
                body &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: body,
                  }),
                u &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: u,
                  }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [
                    "More information: ",
                    jsxProd_default(Link, {
                      url: CCR_TERMS_URL_ULTRAPLAN,
                      children: CCR_TERMS_URL_ULTRAPLAN,
                    }),
                  ],
                }),
              ],
            }),
            jsxProd_default(Text, {
              children: "Proceed?",
            }),
          ],
        })
      : jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default(Text, {
              dimColor: true,
              children,
            }),
            diffStat &&
              jsxProd_default_2(Text, {
                dimColor: true,
                children: ["Scope: ", diffStat],
              }),
            N &&
              jsxProd_default(Text, {
                dimColor: true,
                children: N,
              }),
            A &&
              jsxProd_default(Text, {
                dimColor: true,
                children: A,
              }),
            jsxProd_default(Text, {
              dimColor: true,
              children: "Finds and verifies bugs using a multi-agent review fleet.",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: children_2,
            }),
            body &&
              jsxProd_default(Text, {
                dimColor: true,
                children: body,
              }),
            u &&
              jsxProd_default(Text, {
                dimColor: true,
                children: u,
              }),
          ],
        });
    L[10] = body;
    L[11] = diffStat;
    L[12] = A;
    L[13] = u;
    L[14] = children;
    L[15] = showTerms;
    L[16] = N;
    L[17] = children_2;
    L[18] = x;
  } else x = L[18];
  let Q;
  if (
    L[19] !== onChange ||
    L[20] !== isLaunching ||
    L[21] !== onCancel ||
    L[22] !== postOption ||
    L[23] !== f ||
    L[24] !== retryFocus ||
    L[25] !== showTerms
  ) {
    Q = isLaunching
      ? jsxProd_default(ShimmerLoadingText, {})
      : postOption
        ? jsxProd_default(ModelSelector, {
            options: [
              {
                label: "Run and only show findings here",
                value: "proceed",
                description: "launch in a cloud session",
              },
              {
                label: "Cancel",
                value: "cancel",
              },
              {
                label: "Run and post the findings to the PR as me",
                value: "proceed-post",
                description: "launch in a cloud session",
              },
            ],
            defaultFocusValue: retryFocus ?? (postOption.preferPost ? "proceed-post" : "proceed"),
            refuseInput: f,
            selectedValue: NO_COMMITTED_ROW,
            onChange,
            onCancel,
          })
        : jsxProd_default(ModelSelector, {
            options: [
              {
                label: showTerms ? "Yes" : "Run ultrareview",
                value: "proceed",
                description: "launch in a cloud session",
              },
              {
                label: showTerms ? "No" : "Not now",
                value: "cancel",
              },
            ],
            refuseInput: f,
            selectedValue: NO_COMMITTED_ROW,
            onChange,
            onCancel,
          });
    L[19] = onChange;
    L[20] = isLaunching;
    L[21] = onCancel;
    L[22] = postOption;
    L[23] = f;
    L[24] = retryFocus;
    L[25] = showTerms;
    L[26] = Q;
  } else Q = L[26];
  let be;
  if (L[27] !== x || L[28] !== Q) {
    be = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [x, Q],
    });
    L[27] = x;
    L[28] = Q;
    L[29] = be;
  } else be = L[29];
  return be;
}
export { UltrareviewLaunchDialog };
