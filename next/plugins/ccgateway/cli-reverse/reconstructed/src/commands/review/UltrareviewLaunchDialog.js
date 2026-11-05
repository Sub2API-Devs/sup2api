/**
 * commands/review/UltrareviewLaunchDialog.tsx
 *
 * ultrareview 启动确认对话框（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1nx5c9rq.js (6)
 * attribution: placement 6
 */
import { init_react_production, useState, useRef } from "../../../vendor/react/cjs/react.production.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { useRecentInputWithin, useRefusalTracker } from "../../components/CustomSelect/selectTypeahead.js";
import { previewInstructions } from "./reviewRemote.js";
import { Box, Text, Link } from "../../ink/components/Text.js";
import { CCR_TERMS_URL_ULTRAPLAN } from "../ultraplan.js";
import { ShimmerLoadingText } from "../../components/permissions/PermissionExplanation.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1nx5c9rq.js:15307-15311 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1nx5c9rq.js:15307", () => {
  init_react_production();
});
//@ chunk-1nx5c9rq.js:15311-15361 placement
function hasNotSeenUltrareviewTerms() {
  return !getGlobalConfig().hasSeenUltrareviewTerms;
}
//@ chunk-1nx5c9rq.js:15361-15445 placement
function markUltrareviewTermsSeen(config) {
  return config.hasSeenUltrareviewTerms
    ? config
    : {
        ...config,
        hasSeenUltrareviewTerms: true,
      };
}
//@ chunk-1nx5c9rq.js:15445-15620 placement
var UPLOAD_NOTICE =
  "This will upload your repository to a cloud session for the review, which may include staged and unstaged changes you haven't committed yet, but not untracked files.";
//@ chunk-1nx5c9rq.js:15620-16814 placement
/**
 * ultrareview 启动确认对话框（含费用估算、可选把结果发到 PR）
 */
function UltrareviewLaunchDialog(props) {
  let $ = useMemoCache(23);
  let { subtitle, body, scope, postOption, onProceed, onCancel } = props;
  useRegisterOverlay("ultrareview-launch");
  let { storageV5 } = useTheme_2();
  let [showTerms] = useState(hasNotSeenUltrareviewTerms);
  let [isLaunching, setIsLaunching] = useState(false);
  let [retryFocus, setRetryFocus] = useState(null);
  let abortController;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    abortController = new AbortController();
    $[0] = abortController;
  } else abortController = $[0];
  let abortControllerRef = useRef(abortController);
  let selectedRef = useRef(false);
  let handleSelect;
  if ($[1] !== onCancel || $[2] !== onProceed || $[3] !== showTerms || $[4] !== storageV5) {
    handleSelect = (value) => {
      if (selectedRef.current) {
        return;
      }
      selectedRef.current = true;
      if (value === "proceed" || value === "proceed-post") {
        if (showTerms) saveGlobalConfig(markUltrareviewTermsSeen, storageV5);
        setRetryFocus(value);
        setIsLaunching(true);
        onProceed(abortControllerRef.current.signal, {
          postToPR: value === "proceed-post",
        }).catch(() => {
          selectedRef.current = false;
          setIsLaunching(false);
        });
      } else {
        abortControllerRef.current.abort();
        onCancel();
      }
    };
    $[1] = onCancel;
    $[2] = onProceed;
    $[3] = showTerms;
    $[4] = storageV5;
    $[5] = handleSelect;
  } else handleSelect = $[5];
  let onSelect = handleSelect;
  let handleCancel;
  if ($[6] !== onCancel) {
    handleCancel = () => {
      selectedRef.current = true;
      abortControllerRef.current.abort();
      onCancel();
    };
    $[6] = onCancel;
    $[7] = handleCancel;
  } else handleCancel = $[7];
  let onCancel_2 = handleCancel;
  let subtitle_2;
  if ($[8] !== subtitle) {
    subtitle_2 = subtitle ?? `${getReviewDurationNote()} \xB7 Est. cost ${getReviewCostNote()} USD`;
    $[8] = subtitle;
    $[9] = subtitle_2;
  } else subtitle_2 = $[9];
  let children;
  if (
    $[10] !== body ||
    $[11] !== onCancel_2 ||
    $[12] !== onSelect ||
    $[13] !== isLaunching ||
    $[14] !== retryFocus ||
    $[15] !== postOption ||
    $[16] !== scope ||
    $[17] !== showTerms
  ) {
    children = jsxProd_default(UltrareviewLaunchDetails, {
      showTerms,
      body,
      scope,
      postOption,
      retryFocus,
      isLaunching,
      onSelect,
      onCancel: onCancel_2,
    });
    $[10] = body;
    $[11] = onCancel_2;
    $[12] = onSelect;
    $[13] = isLaunching;
    $[14] = retryFocus;
    $[15] = postOption;
    $[16] = scope;
    $[17] = showTerms;
    $[18] = children;
  } else children = $[18];
  let dialog;
  if ($[19] !== onCancel_2 || $[20] !== subtitle_2 || $[21] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Run ultrareview in the cloud?",
      subtitle: subtitle_2,
      onCancel: onCancel_2,
      children,
    });
    $[19] = onCancel_2;
    $[20] = subtitle_2;
    $[21] = children;
    $[22] = dialog;
  } else dialog = $[22];
  return dialog;
}
//@ chunk-1nx5c9rq.js:16814-20388 placement
/**
 * ultrareview 启动对话框正文：说明审查流程、是否把结果作为普通评论发到 PR
 */
function UltrareviewLaunchDetails(props) {
  let $ = useMemoCache(30);
  let { showTerms, body, scope, postOption, retryFocus, isLaunching, onSelect, onCancel } = props;
  let postNote = postOption
    ? `When it finishes, Claude can post the findings to the PR as a single comment from your GitHub account${postOption.githubLogin ? ` (@${postOption.githubLogin})` : ""} \u2014 one plain comment, not a review or an approval, and it carries a "Generated by Claude Code" note.`
    : null;
  let recentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let refuseInput;
  if ($[0] !== recentInput || $[1] !== noteRefused || $[2] !== refusedWithin) {
    refuseInput = function refuseInputFn() {
      if (recentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[0] = recentInput;
    $[1] = noteRefused;
    $[2] = refusedWithin;
    $[3] = refuseInput;
  } else refuseInput = $[3];
  let refuseInput_2 = refuseInput;
  let handleChange;
  if ($[4] !== onSelect || $[5] !== refuseInput_2) {
    handleChange = (value) => {
      if (refuseInput_2()) {
        return;
      }
      onSelect(value);
    };
    $[4] = onSelect;
    $[5] = refuseInput_2;
    $[6] = handleChange;
  } else handleChange = $[6];
  let onChange = handleChange;
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
  let uploadNotice = scope.mode === "branch" ? UPLOAD_NOTICE : null;
  let instructionsNote;
  if ($[7] !== scope.instructions || $[8] !== scope.mode) {
    instructionsNote =
      scope.mode === "branch" && scope.instructions
        ? `Note for findings (not a base branch): "${previewInstructions(scope.instructions)}"`
        : null;
    $[7] = scope.instructions;
    $[8] = scope.mode;
    $[9] = instructionsNote;
  } else instructionsNote = $[9];
  let noteLine = instructionsNote;
  let children_2 =
    scope.mode === "pr"
      ? "Tip: run /code-review ultra (no number) to review your current branch instead."
      : "Tip: run /code-review ultra <PR number> to fetch and review a specific GitHub PR instead.";
  let details;
  if (
    $[10] !== body ||
    $[11] !== diffStat ||
    $[12] !== noteLine ||
    $[13] !== postNote ||
    $[14] !== children ||
    $[15] !== showTerms ||
    $[16] !== uploadNotice ||
    $[17] !== children_2
  ) {
    details = showTerms
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
                uploadNotice &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: uploadNotice,
                  }),
                noteLine &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: noteLine,
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
                postNote &&
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: postNote,
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
            uploadNotice &&
              jsxProd_default(Text, {
                dimColor: true,
                children: uploadNotice,
              }),
            noteLine &&
              jsxProd_default(Text, {
                dimColor: true,
                children: noteLine,
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
            postNote &&
              jsxProd_default(Text, {
                dimColor: true,
                children: postNote,
              }),
          ],
        });
    $[10] = body;
    $[11] = diffStat;
    $[12] = noteLine;
    $[13] = postNote;
    $[14] = children;
    $[15] = showTerms;
    $[16] = uploadNotice;
    $[17] = children_2;
    $[18] = details;
  } else details = $[18];
  let selector;
  if (
    $[19] !== onChange ||
    $[20] !== isLaunching ||
    $[21] !== onCancel ||
    $[22] !== postOption ||
    $[23] !== refuseInput_2 ||
    $[24] !== retryFocus ||
    $[25] !== showTerms
  ) {
    selector = isLaunching
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
            refuseInput: refuseInput_2,
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
            refuseInput: refuseInput_2,
            selectedValue: NO_COMMITTED_ROW,
            onChange,
            onCancel,
          });
    $[19] = onChange;
    $[20] = isLaunching;
    $[21] = onCancel;
    $[22] = postOption;
    $[23] = refuseInput_2;
    $[24] = retryFocus;
    $[25] = showTerms;
    $[26] = selector;
  } else selector = $[26];
  let body_2;
  if ($[27] !== details || $[28] !== selector) {
    body_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [details, selector],
    });
    $[27] = details;
    $[28] = selector;
    $[29] = body_2;
  } else body_2 = $[29];
  return body_2;
}
export { UltrareviewLaunchDialog };
