/**
 * components/ClaudeMdExternalIncludesDialog.tsx
 *
 * CLAUDE.md 或 .claude/rules 引用工作目录外文件时的允许确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ClaudeMdExternalIncludesDialog.tsx
 * pieces: chunk-5xgkngpb.js (1), chunk-6gtnap6b.js (5)
 * attribution: fingerprint 2, placement 1, file-last-pair 1, facade-exports 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getCurrentProjectConfig, saveCurrentProjectConfig } from "../utils/config.js";
import { hasExternalClaudeMdIncludes, getMemoryFilesCached } from "../utils/claudemd.js";
import { init_react_production, useEffect, useRef } from "../../vendor/react/cjs/react.production.js";
import { logEvent } from "../services/analytics/index.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box, Link } from "../ink/components/Text.js";
import { stripInvisibleChars } from "../utils/invisibleChars.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  useRecentInputWithin,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "./CustomSelect/selectTypeahead.js";
import { MAX_VISIBLE_ITEMS } from "./permissions/wrapWidth.js";
import { Dialog } from "./design-system/Dialog.js";
import { plural } from "../utils/stringUtils.js";
import { ConfirmSelect } from "./design-system/ConfirmSelect.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1352301-1352458 fingerprint (2.1.88 match: _temp3, 1)
/**
 * 尚未批准或提示过、且 CLAUDE.md 引用了外部文件时返回 true。
 */
async function shouldShowExternalIncludesDialog(session, storageV5) {
  let currentProjectConfig = getCurrentProjectConfig();
  if (
    currentProjectConfig.hasClaudeMdExternalIncludesApproved ||
    currentProjectConfig.hasClaudeMdExternalIncludesWarningShown
  )
    return false;
  return hasExternalClaudeMdIncludes(await getMemoryFilesCached(session, true, storageV5));
}
//@ chunk-6gtnap6b.js:746-750 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6gtnap6b.js:746", () => {
  init_react_production();
});
//@ chunk-6gtnap6b.js:750-810 fingerprint (2.1.88 match: _temp, 1)
function logClaudeMdIncludesShown() {
  logEvent("tengu_claude_md_includes_dialog_shown", {});
}
//@ chunk-6gtnap6b.js:810-909 file-last-pair
function renderIncludePath(include, i) {
  return jsxProd_default_2(
    Text,
    {
      dimColor: true,
      wrap: "truncate-middle",
      children: ["  ", stripInvisibleChars(include.path)],
    },
    i,
  );
}
//@ chunk-6gtnap6b.js:909-1153 facade-exports (2.1.88 match: _temp2, 0.486)
function recordExternalIncludesDecision(approved, source, storageV5) {
  saveCurrentProjectConfig(
    (config) => ({
      ...config,
      hasClaudeMdExternalIncludesApproved: approved,
      hasClaudeMdExternalIncludesWarningShown: true,
    }),
    storageV5,
  );
  logEvent(
    approved
      ? "tengu_claude_md_external_includes_dialog_accepted"
      : "tengu_claude_md_external_includes_dialog_declined",
    {
      source: fromEnum(source),
    },
  );
}
//@ chunk-6gtnap6b.js:1153-3611 facade-exports (2.1.88 match: ClaudeMdExternalIncludesDialog, 0.44)
/**
 * 外部 CLAUDE.md 引用确认：列出工作目录外被 @ 引用的文件，允许或拒绝（记录 tengu_claude_md_external_includes_dialog_*）。
 */
function ClaudeMdExternalIncludesDialog(props) {
  let $ = useMemoCache(37);
  let { onDone, isStandaloneDialog, externalIncludes } = props;
  let { storageV5 } = useTheme_2();
  let shownDeps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    shownDeps = [];
    $[0] = shownDeps;
  } else shownDeps = $[0];
  useEffect(logClaudeMdIncludesShown, shownDeps);
  let recentInput = useRecentInputWithin();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let refuseInput;
  if ($[1] !== recentInput || $[2] !== noteRefused || $[3] !== refusedWithin) {
    refuseInput = function refuseInputFn() {
      if (recentInput() || refusedWithin()) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[1] = recentInput;
    $[2] = noteRefused;
    $[3] = refusedWithin;
    $[4] = refuseInput;
  } else refuseInput = $[4];
  let refuseInput_2 = refuseInput;
  let openedAt = useMountTime();
  let settled = settleKey(epoch);
  let includes;
  if ($[5] !== externalIncludes) {
    includes = externalIncludes ?? [];
    $[5] = externalIncludes;
    $[6] = includes;
  } else includes = $[6];
  let list = includes;
  let visible;
  if ($[7] !== list) {
    visible = list.length <= MAX_VISIBLE_ITEMS ? list : list.slice(0, MAX_VISIBLE_ITEMS - 2);
    $[7] = list;
    $[8] = visible;
  } else visible = $[8];
  let visibleList = visible;
  let sliced = list.slice(visibleList.length);
  let answeredRef = useRef(false);
  let handleAnswer;
  if (
    $[9] !== recentInput ||
    $[10] !== noteRefused ||
    $[11] !== onDone ||
    $[12] !== refusedWithin ||
    $[13] !== storageV5
  ) {
    handleAnswer = (value) => {
      if (recentInput() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (answeredRef.current) {
        return;
      }
      answeredRef.current = true;
      recordExternalIncludesDecision(value === "yes", "dialog", storageV5);
      onDone();
    };
    $[9] = recentInput;
    $[10] = noteRefused;
    $[11] = onDone;
    $[12] = refusedWithin;
    $[13] = storageV5;
    $[14] = handleAnswer;
  } else handleAnswer = $[14];
  let choose = handleAnswer;
  let handleCancel;
  if ($[15] !== choose) {
    handleCancel = () => {
      choose("no");
    };
    $[15] = choose;
    $[16] = handleCancel;
  } else handleCancel = $[16];
  let onCancel = handleCancel;
  const DialogComponent = Dialog;
  const title = "Allow external CLAUDE.md file imports?";
  const color = "warning";
  const hideBorder = !isStandaloneDialog;
  const hideInputGuide = !isStandaloneDialog;
  let bodyText;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    bodyText = jsxProd_default(Text, {
      children:
        "This project's CLAUDE.md or .claude/rules imports files outside the current working directory. Never allow this for third-party repositories.",
    });
    $[17] = bodyText;
  } else bodyText = $[17];
  const includesList =
    externalIncludes &&
    externalIncludes.length > 0 &&
    jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: "External imports:",
        }),
        visibleList.map(renderIncludePath),
        sliced.length > 0
          ? jsxProd_default_2(Fragment, {
              children: [
                jsxProd_default_2(Text, {
                  dimColor: true,
                  wrap: "truncate",
                  children: [
                    "  ",
                    "\u2026 +",
                    sliced.length,
                    " ",
                    plural(sliced.length, "import"),
                    " not shown.",
                  ],
                }),
                jsxProd_default_2(Text, {
                  dimColor: true,
                  wrap: "truncate",
                  children: ["  ", "Yes covers those too, plus any this project adds later."],
                }),
              ],
            })
          : null,
      ],
    });
  let options;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    options = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Important: Only use Claude Code with files you trust. Accessing untrusted files may pose security risks",
        " ",
        jsxProd_default(Link, {
          url: "https://code.claude.com/docs/en/security",
        }),
        " ",
      ],
    });
    $[18] = options;
  } else options = $[18];
  let onConfirm;
  let onCancel_2;
  if ($[19] !== choose) {
    onConfirm = () => choose("yes");
    onCancel_2 = () => choose("no");
    $[19] = choose;
    $[20] = onConfirm;
    $[21] = onCancel_2;
  } else {
    onConfirm = $[20];
    onCancel_2 = $[21];
  }
  let layout;
  if (
    $[22] !== settled.remountKey ||
    $[23] !== refuseInput_2 ||
    $[24] !== openedAt ||
    $[25] !== onConfirm ||
    $[26] !== onCancel_2
  ) {
    layout = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput: refuseInput_2,
        openedAt,
        hideIndexes: true,
        confirmLabel: "Yes, allow external imports",
        cancelLabel: "No, disable external imports",
        cancelFirst: true,
        focus: "cancel",
        onConfirm,
        onCancel: onCancel_2,
      },
      settled.remountKey,
    );
    $[22] = settled.remountKey;
    $[23] = refuseInput_2;
    $[24] = openedAt;
    $[25] = onConfirm;
    $[26] = onCancel_2;
    $[27] = layout;
  } else layout = $[27];
  let dialog;
  if (
    $[28] !== DialogComponent ||
    $[29] !== onCancel ||
    $[30] !== isStandaloneDialog ||
    $[31] !== hideInputGuide ||
    $[32] !== bodyText ||
    $[33] !== includesList ||
    $[34] !== layout ||
    $[35] !== hideBorder
  ) {
    dialog = jsxProd_default_2(DialogComponent, {
      title,
      color,
      onCancel,
      exitOnCtrlCD: isStandaloneDialog,
      hideBorder,
      hideInputGuide,
      children: [bodyText, includesList, options, layout],
    });
    $[28] = DialogComponent;
    $[29] = onCancel;
    $[30] = isStandaloneDialog;
    $[31] = hideInputGuide;
    $[32] = bodyText;
    $[33] = includesList;
    $[34] = layout;
    $[35] = hideBorder;
    $[36] = dialog;
  } else dialog = $[36];
  return dialog;
}
export { shouldShowExternalIncludesDialog, recordExternalIncludesDecision, ClaudeMdExternalIncludesDialog };
