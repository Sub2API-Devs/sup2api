/**
 * components/projects/ContinueInProjectsMessageDialog.tsx
 *
 * 2.1.316 新增：发送到 Claude 项目前的消息编辑/确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1gcg79yh.js (1), chunk-sa8rbrfs.js (4)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRecentInputWithin, useMountTime, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { DECAY_TICK_MS } from "../ResumeStaleConversationDialog.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { messageTitle, MESSAGE_REVEAL_NOTICE } from "./messageRevealConfirm.js";
import {
  wrapTextToWidth,
  wrapCardText,
  countItemsFittingRows,
  ProjectProposalCard,
} from "./ProjectProposalCard.js";
import { MESSAGE_DISCLOSURE } from "../../tools/ContinueInProjectsTool/ContinueInProjectsTool.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-sa8rbrfs.js:15263-15267 placement
init_react_production();
//@ chunk-sa8rbrfs.js:15267-15324 placement
function renderDimText(text) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children: text,
    },
    text,
  );
}
//@ chunk-sa8rbrfs.js:15324-15431 placement
var MIN_DIALOG_ROWS = 6;
var BULLET_GAP = 11;
var RESERVED_ROWS = 20;
var TERMINAL_TOO_SMALL_MESSAGE = "Make this terminal larger to read and send it.";
var CLOSE_ONLY_OPTIONS = [
  {
    label: "Close",
    value: "cancel",
  },
];
//@ chunk-sa8rbrfs.js:15431-18493 placement
/**
 * 发送到 Claude 项目前的消息编辑/确认对话框。
 */
function ContinueInProjectsMessageDialog(props) {
  let $ = useMemoCache(69);
  let { payload, answer } = props;
  let isRecentInput = useRecentInputWithin();
  let isRecentInputForSend = useRecentInputWithin(DECAY_TICK_MS);
  let openedAt = useMountTime();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let [isRefusedSend, setIsRefusedSend] = useState(false);
  let rawAnswer;
  if ($[0] !== answer) {
    rawAnswer = (choice) =>
      answer({
        choice,
      });
    $[0] = answer;
    $[1] = rawAnswer;
  } else rawAnswer = $[1];
  let refusableAnswer = useRefusableAnswer(rawAnswer);
  let { columns, rows } = useTerminalSize();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let screenReaderColumns = isScreenReaderEnabled ? columns : null;
  let proposal;
  let availableRows;
  let headerRows;
  let title;
  let contentWidth;
  if ($[2] !== columns || $[3] !== payload || $[4] !== rows) {
    title = messageTitle(payload.projectName, payload.creates);
    contentWidth = Math.max(columns - MIN_DIALOG_ROWS, RESERVED_ROWS);
    let proposalValue;
    if ($[10] !== payload.message) {
      proposalValue = {
        summary: payload.message,
      };
      $[10] = payload.message;
      $[11] = proposalValue;
    } else proposalValue = $[11];
    proposal = proposalValue;
    availableRows = rows - BULLET_GAP;
    let countRows;
    if ($[12] !== contentWidth) {
      countRows = (acc, line) => acc + wrapTextToWidth(line, contentWidth).length;
      $[12] = contentWidth;
      $[13] = countRows;
    } else countRows = $[13];
    headerRows = [title, ...MESSAGE_DISCLOSURE].reduce(countRows, 0);
    $[2] = columns;
    $[3] = payload;
    $[4] = rows;
    $[5] = proposal;
    $[6] = availableRows;
    $[7] = headerRows;
    $[8] = title;
    $[9] = contentWidth;
  } else {
    proposal = $[5];
    availableRows = $[6];
    headerRows = $[7];
    title = $[8];
    contentWidth = $[9];
  }
  let bodyRows = availableRows - headerRows;
  let max = Math.max(1, bodyRows);
  let summaryItems;
  let fittingCount;
  if ($[14] !== max || $[15] !== payload.message || $[16] !== screenReaderColumns || $[17] !== contentWidth) {
    summaryItems = wrapCardText(payload.message, contentWidth);
    fittingCount = countItemsFittingRows(summaryItems, max, screenReaderColumns);
    $[14] = max;
    $[15] = payload.message;
    $[16] = screenReaderColumns;
    $[17] = contentWidth;
    $[18] = summaryItems;
    $[19] = fittingCount;
  } else {
    summaryItems = $[18];
    fittingCount = $[19];
  }
  let isTruncated = fittingCount < summaryItems.length;
  let isTooSmall = bodyRows < 1 || columns - MIN_DIALOG_ROWS < RESERVED_ROWS || isTruncated;
  let [wasTooSmall, setWasTooSmall] = useState(isTooSmall);
  if (isTooSmall && !wasTooSmall) setWasTooSmall(true);
  let resetRefusalEffect;
  let resetRefusalDeps;
  if ($[20] !== wasTooSmall || $[21] !== isTooSmall || $[22] !== noteRefused) {
    resetRefusalEffect = () => {
      if (!isTooSmall && wasTooSmall) noteRefused();
    };
    resetRefusalDeps = [isTooSmall, wasTooSmall, noteRefused];
    $[20] = wasTooSmall;
    $[21] = isTooSmall;
    $[22] = noteRefused;
    $[23] = resetRefusalEffect;
    $[24] = resetRefusalDeps;
  } else {
    resetRefusalEffect = $[23];
    resetRefusalDeps = $[24];
  }
  useEffect(resetRefusalEffect, resetRefusalDeps);
  let showRevealNotice = isRefusedSend && !isTooSmall;
  let refuseInput;
  if (
    $[25] !== isRecentInput ||
    $[26] !== isRecentInputForSend ||
    $[27] !== noteRefused ||
    $[28] !== refusedWithin
  ) {
    refuseInput = function refuseInput(action) {
      if (!(action === "send" ? isRecentInputForSend() : isRecentInput()) && !refusedWithin()) {
        return false;
      }
      noteRefused();
      return true;
    };
    $[25] = isRecentInput;
    $[26] = isRecentInputForSend;
    $[27] = noteRefused;
    $[28] = refusedWithin;
    $[29] = refuseInput;
  } else refuseInput = $[29];
  let refuseInput_2 = refuseInput;
  let onChoice;
  if ($[30] !== refusableAnswer || $[31] !== refuseInput_2) {
    onChoice = function onChoice(action) {
      if (refuseInput_2(action)) {
        setIsRefusedSend(action === "send");
        refusableAnswer.refuse(action);
        return;
      }
      refusableAnswer.answer(action);
    };
    $[30] = refusableAnswer;
    $[31] = refuseInput_2;
    $[32] = onChoice;
  } else onChoice = $[32];
  let onChoiceStable = onChoice;
  let onCancel;
  if ($[33] !== answer || $[34] !== refuseInput_2) {
    onCancel = function onCancel() {
      if (!refuseInput_2("cancel"))
        answer({
          choice: "cancel",
        });
    };
    $[33] = answer;
    $[34] = refuseInput_2;
    $[35] = onCancel;
  } else onCancel = $[35];
  let onCancel_2 = onCancel;
  const existingProject = !payload.creates;
  let proposalCard;
  if (
    $[36] !== max ||
    $[37] !== proposal ||
    $[38] !== screenReaderColumns ||
    $[39] !== existingProject ||
    $[40] !== contentWidth
  ) {
    proposalCard = jsxProd_default(ProjectProposalCard, {
      proposal,
      proposalBytes: 0,
      existingProject,
      width: contentWidth,
      maxRows: max,
      marginTop: 0,
      transcriptChord: "",
      screenReaderColumns,
      messageFrom: "typed",
    });
    $[36] = max;
    $[37] = proposal;
    $[38] = screenReaderColumns;
    $[39] = existingProject;
    $[40] = contentWidth;
    $[41] = proposalCard;
  } else proposalCard = $[41];
  let tooSmallNotice;
  if ($[42] !== isTooSmall || $[43] !== isTruncated) {
    tooSmallNotice =
      isTooSmall && !isTruncated
        ? jsxProd_default(Text, {
            color: "warning",
            children: TERMINAL_TOO_SMALL_MESSAGE,
          })
        : null;
    $[42] = isTooSmall;
    $[43] = isTruncated;
    $[44] = tooSmallNotice;
  } else tooSmallNotice = $[44];
  let disclosureLines;
  if ($[45] === MEMO_CACHE_SENTINEL) {
    disclosureLines = MESSAGE_DISCLOSURE.map(renderDimText);
    $[45] = disclosureLines;
  } else disclosureLines = $[45];
  let revealNotice;
  if ($[46] !== showRevealNotice || $[47] !== isScreenReaderEnabled) {
    revealNotice =
      showRevealNotice || !isScreenReaderEnabled
        ? jsxProd_default(Text, {
            dimColor: true,
            children: showRevealNotice ? MESSAGE_REVEAL_NOTICE : " ",
          })
        : null;
    $[46] = showRevealNotice;
    $[47] = isScreenReaderEnabled;
    $[48] = revealNotice;
  } else revealNotice = $[48];
  let selector;
  if (
    $[49] !== onCancel_2 ||
    $[50] !== wasTooSmall ||
    $[51] !== isTooSmall ||
    $[52] !== openedAt ||
    $[53] !== onChoiceStable ||
    $[54] !== refusableAnswer.attempts ||
    $[55] !== refusableAnswer.refused ||
    $[56] !== refuseInput_2
  ) {
    selector = isTooSmall
      ? jsxProd_default(
          ModelSelector,
          {
            hideIndexes: true,
            options: [...CLOSE_ONLY_OPTIONS],
            onChange: () => onChoiceStable("cancel"),
            onCancel: onCancel_2,
          },
          refusableAnswer.attempts,
        )
      : jsxProd_default(
          ConfirmSelect,
          {
            refuseInput: () => refuseInput_2("send"),
            openedAt,
            windowMs: DECAY_TICK_MS,
            focus: wasTooSmall || refusableAnswer.refused === "cancel" ? "cancel" : "confirm",
            confirmLabel: "Send",
            cancelLabel: "No",
            onConfirm: () => onChoiceStable("send"),
            onCancel: () => onChoiceStable("cancel"),
          },
          refusableAnswer.attempts,
        );
    $[49] = onCancel_2;
    $[50] = wasTooSmall;
    $[51] = isTooSmall;
    $[52] = openedAt;
    $[53] = onChoiceStable;
    $[54] = refusableAnswer.attempts;
    $[55] = refusableAnswer.refused;
    $[56] = refuseInput_2;
    $[57] = selector;
  } else selector = $[57];
  let footerBox;
  if ($[58] !== revealNotice || $[59] !== selector) {
    footerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [disclosureLines, revealNotice, selector],
    });
    $[58] = revealNotice;
    $[59] = selector;
    $[60] = footerBox;
  } else footerBox = $[60];
  let children;
  if ($[61] !== proposalCard || $[62] !== tooSmallNotice || $[63] !== footerBox) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [proposalCard, tooSmallNotice, footerBox],
    });
    $[61] = proposalCard;
    $[62] = tooSmallNotice;
    $[63] = footerBox;
    $[64] = children;
  } else children = $[64];
  let dialog;
  if ($[65] !== onCancel_2 || $[66] !== children || $[67] !== title) {
    dialog = jsxProd_default(Dialog, {
      title,
      onCancel: onCancel_2,
      color: "suggestion",
      children,
    });
    $[65] = onCancel_2;
    $[66] = children;
    $[67] = title;
    $[68] = dialog;
  } else dialog = $[68];
  return dialog;
}
//@ chunk-1gcg79yh.js:15021-15025 placement
init_react_production();
export { ContinueInProjectsMessageDialog };
