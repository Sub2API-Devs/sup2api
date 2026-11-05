/**
 * components/permissions/AskUserQuestionPermissionRequest/QuestionNavigationBar.tsx
 *
 * 问题导航条：各问题标签（已答标记）与 Submit 标签。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/QuestionNavigationBar.tsx
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 3, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { truncateToWidth } from "../../../utils/format.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { Box, Text } from "../../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TagTabs } from "../../TagTabs.js";

//@ chunk-czq1j3j2.js:1301423-1301490 placement
function ownLookup(record, key) {
  return key !== undefined && Object.hasOwn(record, key) ? record[key] : undefined;
}
//@ chunk-czq1j3j2.js:1301490-1301547 placement
function questionTabHeader(questionDisplay, index) {
  return questionDisplay?.displayHeader || `Q${index + 1}`;
}
//@ chunk-czq1j3j2.js:1301547-1301580 placement
function tabWidth(header) {
  return 4 + bunStringWidth(header);
}
//@ chunk-czq1j3j2.js:1301580-1301613 layout
function addNumbers(left, right) {
  return left + right;
}
//@ chunk-czq1j3j2.js:1301613-1304639 fingerprint (2.1.88 match: QuestionNavigationBar, 0.703)
function QuestionNavigationBar(props) {
  let $ = useMemoCache(55);
  let { questions, currentQuestionIndex, answers, hideSubmitTab } = props;
  let hideSubmitTab_2 = hideSubmitTab === undefined ? false : hideSubmitTab;
  let { columns } = useTerminalSize();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let t2;
  if ($[0] !== columns || $[1] !== currentQuestionIndex || $[2] !== hideSubmitTab_2 || $[3] !== questions) {
    zt: {
      let submitText = hideSubmitTab_2 ? "" : ` ${figures_default.tick} Submit `;
      let fixedWidth = bunStringWidth("\u2190 ") + bunStringWidth(" \u2192") + bunStringWidth(submitText);
      let availableForTabs = columns - fixedWidth;
      if (availableForTabs <= 0) {
        let t3;
        if ($[5] !== currentQuestionIndex || $[6] !== questions) {
          let t4;
          if ($[8] !== currentQuestionIndex) {
            t4 = (question, index) => {
              let header = question?.displayHeader || `Q${index + 1}`;
              return index === currentQuestionIndex ? truncateToWidth(header, 3) : "";
            };
            $[8] = currentQuestionIndex;
            $[9] = t4;
          } else t4 = $[9];
          t3 = questions.map(t4);
          $[5] = currentQuestionIndex;
          $[6] = questions;
          $[7] = t3;
        } else t3 = $[7];
        t2 = t3;
        break zt;
      }
      let tabHeaders = questions.map(questionTabHeader);
      if (tabHeaders.map(tabWidth).reduce(addNumbers, 0) <= availableForTabs) {
        t2 = tabHeaders;
        break zt;
      }
      let currentHeader = tabHeaders[currentQuestionIndex] || "";
      let currentIdealWidth = 4 + bunStringWidth(currentHeader);
      let currentTabWidth = Math.min(currentIdealWidth, availableForTabs / 2);
      let remainingWidth = availableForTabs - currentTabWidth;
      let otherTabCount = questions.length - 1;
      let widthPerOtherTab = Math.max(6, Math.floor(remainingWidth / Math.max(otherTabCount, 1)));
      let t3;
      if ($[10] !== currentQuestionIndex || $[11] !== currentTabWidth || $[12] !== widthPerOtherTab) {
        t3 = (header, index) => {
          if (index === currentQuestionIndex) {
            let maxTextWidth = currentTabWidth - 2 - 2;
            return truncateToWidth(header, maxTextWidth);
          } else {
            let maxTextWidth = widthPerOtherTab - 2 - 2;
            return truncateToWidth(header, maxTextWidth);
          }
        };
        $[10] = currentQuestionIndex;
        $[11] = currentTabWidth;
        $[12] = widthPerOtherTab;
        $[13] = t3;
      } else t3 = $[13];
      t2 = tabHeaders.map(t3);
    }
    $[0] = columns;
    $[1] = currentQuestionIndex;
    $[2] = hideSubmitTab_2;
    $[3] = questions;
    $[4] = t2;
  } else t2 = $[4];
  let tabDisplayTexts = t2;
  if (isScreenReaderEnabled) {
    let headerComponent;
    let containerComponent;
    let labelText;
    let summaryText;
    let marginBottom;
    if ($[14] !== answers || $[15] !== questions) {
      let formatTabLabel;
      if ($[21] !== answers) {
        formatTabLabel = (question, index) => {
          let header = question?.displayHeader || `Q${index + 1}`;
          let label = header.includes(",") || /answered/i.test(header) ? jsonStringify(header) : header;
          return ownLookup(answers, question?.key) ? `${label} (answered)` : label;
        };
        $[21] = answers;
        $[22] = formatTabLabel;
      } else formatTabLabel = $[22];
      let mapped = questions.map(formatTabLabel);
      let headingLabel = questions.length === 1 ? "Question" : "Questions";
      containerComponent = Box;
      marginBottom = 1;
      headerComponent = Text;
      labelText = headingLabel;
      summaryText = mapped.join(", ");
      $[14] = answers;
      $[15] = questions;
      $[16] = headerComponent;
      $[17] = containerComponent;
      $[18] = labelText;
      $[19] = summaryText;
      $[20] = marginBottom;
    } else {
      headerComponent = $[16];
      containerComponent = $[17];
      labelText = $[18];
      summaryText = $[19];
      marginBottom = $[20];
    }
    const children = `${labelText}: ${summaryText}`;
    let children_2;
    if ($[23] !== headerComponent || $[24] !== children) {
      children_2 = jsxProd_default(headerComponent, {
        children,
      });
      $[23] = headerComponent;
      $[24] = children;
      $[25] = children_2;
    } else children_2 = $[25];
    let headerRow;
    if ($[26] !== containerComponent || $[27] !== marginBottom || $[28] !== children_2) {
      headerRow = jsxProd_default(containerComponent, {
        marginBottom,
        children: children_2,
      });
      $[26] = containerComponent;
      $[27] = marginBottom;
      $[28] = children_2;
      $[29] = headerRow;
    } else headerRow = $[29];
    return headerRow;
  }
  let hideArrows = questions.length === 1 && hideSubmitTab_2;
  let backArrowElement;
  if ($[30] !== currentQuestionIndex || $[31] !== hideArrows) {
    backArrowElement =
      !hideArrows &&
      jsxProd_default_2(Text, {
        color: currentQuestionIndex === 0 ? "inactive" : undefined,
        children: ["\u2190", " "],
      });
    $[30] = currentQuestionIndex;
    $[31] = hideArrows;
    $[32] = backArrowElement;
  } else backArrowElement = $[32];
  let t4;
  if (
    $[33] !== answers ||
    $[34] !== currentQuestionIndex ||
    $[35] !== questions ||
    $[36] !== tabDisplayTexts
  ) {
    let t5;
    if ($[38] !== answers || $[39] !== currentQuestionIndex || $[40] !== tabDisplayTexts) {
      t5 = (q_1, index) => {
        let isSelected = index === currentQuestionIndex;
        let checkboxGlyph = ownLookup(answers, q_1?.key)
          ? figures_default.checkboxOn
          : figures_default.checkboxOff;
        let displayText = tabDisplayTexts[index] || q_1?.displayHeader || `Q${index + 1}`;
        return jsxProd_default(
          Box,
          {
            children: jsxProd_default_2(TagTabs, {
              color: isSelected ? "permission" : undefined,
              padded: true,
              children: [checkboxGlyph, " ", displayText],
            }),
          },
          q_1?.key || `question-${index}`,
        );
      };
      $[38] = answers;
      $[39] = currentQuestionIndex;
      $[40] = tabDisplayTexts;
      $[41] = t5;
    } else t5 = $[41];
    t4 = questions.map(t5);
    $[33] = answers;
    $[34] = currentQuestionIndex;
    $[35] = questions;
    $[36] = tabDisplayTexts;
    $[37] = t4;
  } else t4 = $[37];
  let t5;
  if ($[42] !== currentQuestionIndex || $[43] !== hideSubmitTab_2 || $[44] !== questions.length) {
    t5 =
      !hideSubmitTab_2 &&
      jsxProd_default(
        Box,
        {
          children: jsxProd_default_2(TagTabs, {
            color: currentQuestionIndex === questions.length ? "permission" : undefined,
            padded: true,
            children: [figures_default.tick, " Submit"],
          }),
        },
        "submit",
      );
    $[42] = currentQuestionIndex;
    $[43] = hideSubmitTab_2;
    $[44] = questions.length;
    $[45] = t5;
  } else t5 = $[45];
  let t6;
  if ($[46] !== currentQuestionIndex || $[47] !== hideArrows || $[48] !== questions.length) {
    t6 =
      !hideArrows &&
      jsxProd_default_2(Text, {
        color: currentQuestionIndex === questions.length ? "inactive" : undefined,
        children: [" ", "\u2192"],
      });
    $[46] = currentQuestionIndex;
    $[47] = hideArrows;
    $[48] = questions.length;
    $[49] = t6;
  } else t6 = $[49];
  let t7;
  if ($[50] !== backArrowElement || $[51] !== t4 || $[52] !== t5 || $[53] !== t6) {
    t7 = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginBottom: 1,
      children: [backArrowElement, t4, t5, t6],
    });
    $[50] = backArrowElement;
    $[51] = t4;
    $[52] = t5;
    $[53] = t6;
    $[54] = t7;
  } else t7 = $[54];
  return t7;
}
export { ownLookup, QuestionNavigationBar };
