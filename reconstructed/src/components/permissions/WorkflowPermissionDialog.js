/**
 * components/permissions/WorkflowPermissionDialog.tsx
 *
 * 工作流脚本权限对话框（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sycr1qkz.js (17)
 * attribution: placement 17
 */
import {
  init_react_production,
  fragmentTypeExport,
  useState,
} from "../../../vendor/react/cjs/react.production.js";
import { truncate } from "../../utils/format.js";
import {
  displayField,
  plainDisplay,
  stripUnsafeChars,
  hasSuspiciousText,
  replaceLineBreaks,
  serializeApprovalPayload,
  MAX_PAYLOAD_UNITS,
  needsGutter,
} from "../../utils/permissions/approvalPayloadSerialization.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { isConsentRow, parseConsentSuggestions } from "./consentRows.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { editPromptInEditor } from "../../utils/promptEditor.js";
import { normalizeCrLf } from "../../services/workflow/scriptFile.js";
import { shouldOfferAlwaysAllow } from "./FallbackPermissionRequest.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "./PermissionRuleExplanation.js";
import { Blockquote } from "../Blockquote.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { HighlightedCode } from "../HighlightedCode.js";
import { DenialLimitFallbackNotice } from "./UnattendedAutoBlockNotice.js";
import { PermissionPrompt } from "./PermissionPrompt.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-sycr1qkz.js:14639-14643 placement
init_react_production();
//@ chunk-sycr1qkz.js:14643-14647 placement
init_react_production();
//@ chunk-sycr1qkz.js:14647-14665 placement
var DECIDE_DELAY_MS = 100;
var PERMISSION_TIMEOUT_MS = 5000;
//@ chunk-sycr1qkz.js:14665-15383 placement
/**
 * 从脚本源码的某位置提取一个调用参数的预览：字符串字面量取内容（模板插值换成 ${…}，折叠空白），否则扫描到同层逗号/右括号为止，结果截断。
 */
function extractCallArgumentPreview(source, start) {
  let pos = start;
  while (pos < source.length && /\s/.test(source[pos])) pos++;
  let quote = source[pos];
  if (quote !== '"' && quote !== "'" && quote !== "`") {
    let min = Math.min(source.length, pos + PERMISSION_TIMEOUT_MS);
    let index = 0;
    let cursor = pos;
    while (cursor < min) {
      let closeIndex = source[cursor];
      if (closeIndex === "(" || closeIndex === "[" || closeIndex === "{") index++;
      else if (closeIndex === ")" || closeIndex === "]" || closeIndex === "}") {
        if (index === 0) break;
        index--;
      } else if (closeIndex === "," && index === 0) break;
      else if (closeIndex === '"' || closeIndex === "'" || closeIndex === "`") {
        cursor++;
        while (cursor < min && source[cursor] !== closeIndex) {
          if (source[cursor] === "\\") cursor++;
          cursor++;
        }
      }
      cursor++;
    }
    return truncate(source.slice(pos, cursor).trim(), DECIDE_DELAY_MS);
  }
  pos++;
  let chars = [];
  while (pos < source.length) {
    let innerStart = source[pos];
    if (innerStart === "\\") {
      chars.push(source[pos + 1] ?? "");
      pos += 2;
      continue;
    }
    if (innerStart === quote) break;
    if (quote === "`" && innerStart === "$" && source[pos + 1] === "{") {
      chars.push("${\u2026}");
      let result = 1;
      pos += 2;
      while (pos < source.length && result > 0) {
        if (source[pos] === "{") result++;
        if (source[pos] === "}") result--;
        pos++;
      }
      continue;
    }
    chars.push(innerStart);
    pos++;
  }
  let trimmed = chars.join("").replace(/\s+/g, " ").trim();
  return truncate(trimmed, DECIDE_DELAY_MS);
}
//@ chunk-sycr1qkz.js:15383-15608 placement
function extractParenthesized(text, start, end) {
  if (text[start] !== "(") return;
  let min = Math.min(text.length, start + PERMISSION_TIMEOUT_MS);
  let minEnd = 0;
  let depth = start;
  while (depth < min) {
    let innerEnd = text[depth];
    if (innerEnd === "(") minEnd++;
    else if (innerEnd === ")") {
      minEnd--;
      if (minEnd === 0) return text.slice(start + 1, depth);
    } else if (end && innerEnd === ";" && minEnd === 1) return text.slice(start + 1, depth);
    depth++;
  }
  return;
}
//@ chunk-sycr1qkz.js:15608-15892 placement
function findStatementEnd(source, start, end) {
  let depth = 0;
  let index = start;
  while (index < end) {
    let char = source[index];
    if (char === "(" || char === "[" || char === "{") depth++;
    else if (char === ")" || char === "]" || char === "}") {
      if (depth === 0) return index;
      depth--;
    } else if (depth === 0 && char === ";") return index + 1;
    else if (
      depth === 0 &&
      char ===
        `
`
    ) {
      let nextIndex = index + 1;
      while (nextIndex < end && /\s/.test(source[nextIndex] ?? "")) nextIndex++;
      if (source[nextIndex] !== "{") return index + 1;
    }
    index++;
  }
  return -1;
}
//@ chunk-sycr1qkz.js:15892-15945 placement
function hasIdentifierChar(char) {
  return char != null && /[A-Za-z0-9_]/.test(char);
}
//@ chunk-sycr1qkz.js:15945-17744 placement
function summarizeWorkflowScript(scriptBody) {
  try {
    let agents = [];
    let braceDepth = 0;
    let parenDepth = 0;
    let pendingCondition = false;
    let condition;
    let statementEnd = -1;
    let braceStack = [];
    let parenStack = [];
    let length = scriptBody.length;
    let index = 0;
    while (index < length) {
      if (statementEnd >= 0 && index >= statementEnd) {
        pendingCondition = false;
        condition = undefined;
        statementEnd = -1;
      }
      let char = scriptBody[index];
      if (char === "/" && scriptBody[index + 1] === "/")
        while (
          index < length &&
          scriptBody[index] !==
            `
`
        )
          index++;
      else if (char === "/" && scriptBody[index + 1] === "*") {
        index += 2;
        while (index < length && !(scriptBody[index] === "*" && scriptBody[index + 1] === "/")) index++;
        index++;
      } else if (char === '"' || char === "'" || char === "`") {
        index++;
        while (index < length && scriptBody[index] !== char) {
          if (scriptBody[index] === "\\") index++;
          index++;
        }
      } else if (char === "{") {
        braceDepth++;
        if (pendingCondition && parenDepth === 0) {
          braceStack.push({
            braceDepth,
            cond: condition,
          });
          pendingCondition = false;
          condition = undefined;
          statementEnd = -1;
        }
      } else if (char === "}") {
        let last = braceStack.at(-1);
        if (last && last.braceDepth === braceDepth) braceStack.pop();
        braceDepth--;
      } else if (char === "(") parenDepth++;
      else if (char === ")") {
        let last = parenStack.at(-1);
        if (last !== undefined && last === parenDepth) parenStack.pop();
        parenDepth--;
        if (pendingCondition && parenDepth === 0 && statementEnd < 0) {
          let probe = index + 1;
          let min = Math.min(length, probe + PERMISSION_TIMEOUT_MS);
          while (probe < min && /\s/.test(scriptBody[probe] ?? "")) probe++;
          if (scriptBody[probe] !== "{") {
            let statementEnd_2 = findStatementEnd(
              scriptBody,
              probe,
              Math.min(length, probe + PERMISSION_TIMEOUT_MS),
            );
            if (statementEnd_2 >= 0) statementEnd = statementEnd_2;
          }
        }
      } else if (
        char === "w" &&
        scriptBody.startsWith("while", index) &&
        parenDepth === 0 &&
        !hasIdentifierChar(scriptBody[index - 1]) &&
        !hasIdentifierChar(scriptBody[index + 5])
      ) {
        let start = scriptBody.indexOf("(", index);
        if (start === -1 || start - index > PERMISSION_TIMEOUT_MS) {
          index++;
          continue;
        }
        pendingCondition = true;
        statementEnd = -1;
        condition = extractParenthesized(scriptBody, start, false);
      } else if (
        char === "f" &&
        scriptBody.startsWith("for", index) &&
        parenDepth === 0 &&
        !hasIdentifierChar(scriptBody[index - 1]) &&
        !hasIdentifierChar(scriptBody[index + 3])
      ) {
        let start = scriptBody.indexOf("(", index);
        if (start === -1 || start - index > PERMISSION_TIMEOUT_MS) {
          index++;
          continue;
        }
        pendingCondition = true;
        statementEnd = -1;
        condition = extractParenthesized(scriptBody, start, true);
      } else if (
        char === "p" &&
        scriptBody.startsWith("parallel(", index) &&
        !hasIdentifierChar(scriptBody[index - 1])
      ) {
        parenStack.push(parenDepth + 1);
        index += 7;
      } else if (
        char === "a" &&
        scriptBody.startsWith("agent", index) &&
        !hasIdentifierChar(scriptBody[index - 1])
      ) {
        let probe = index + 5;
        while (probe < length && /\s/.test(scriptBody[probe] ?? "")) probe++;
        if (scriptBody[probe] === "(") {
          let kind =
            parenStack.length > 0
              ? "parallel"
              : pendingCondition || braceStack.length > 0
                ? "loop"
                : "sequential";
          let agentCondition = pendingCondition ? condition : braceStack.at(-1)?.cond;
          let annotation =
            kind === "loop"
              ? agentCondition?.trim().slice(0, 40)
              : kind === "parallel"
                ? "\xD7 N"
                : undefined;
          agents.push({
            prompt: extractCallArgumentPreview(scriptBody, probe + 1),
            kind,
            annotation,
          });
        }
      }
      index++;
    }
    if (agents.length === 0) return null;
    let phases = [];
    for (let agent of agents) {
      let last = phases.at(-1);
      if (last && last.kind === agent.kind && last.annotation === agent.annotation)
        last.agents.push({
          prompt: agent.prompt,
        });
      else
        phases.push({
          kind: agent.kind,
          agents: [
            {
              prompt: agent.prompt,
            },
          ],
          annotation: agent.annotation,
        });
    }
    let estimatedAgents = 0;
    for (let phase of phases) {
      let agentCount = phase.agents.length;
      estimatedAgents += phase.kind === "sequential" ? agentCount : agentCount * 3;
    }
    return {
      phases,
      estimatedAgents,
      hasReturn: /\breturn\b/.test(scriptBody),
    };
  } catch {
    return null;
  }
}
//@ chunk-sycr1qkz.js:17744-17779 placement
function rawText(field) {
  return displayField(field).text;
}
//@ chunk-sycr1qkz.js:17779-17805 placement
function isFalsy(value) {
  return !value;
}
//@ chunk-sycr1qkz.js:17805-17878 placement
function quotedPreview(text) {
  return `\xB7 "${stripNonPrintable(text.length > 60 ? truncateToLength(text, 59) + "\u2026" : text)}"`;
}
//@ chunk-sycr1qkz.js:17878-18180 placement
/**
 * 渲染工作流权限对话框中的一个步骤行：序号、标题与灰色详情，下方列出最多两个提示词，超出时显示 +N more。
 */
function renderWorkflowStepRow(step, index) {
  return jsxProd_default_2(
    fragmentTypeExport,
    {
      children: [
        jsxProd_default_2(Text, {
          children: [
            "  ",
            index + 1,
            ". ",
            step.title,
            step.detail
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \u2014 ", step.detail],
                })
              : "",
          ],
        }),
        step.prompts.length > 0 &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "     ",
              step.prompts.slice(0, 2).map(quotedPreview).join("  "),
              step.prompts.length > 2 ? `  +${step.prompts.length - 2} more` : "",
            ],
          }),
      ],
    },
    index,
  );
}
//@ chunk-sycr1qkz.js:18180-18488 placement
/**
 * 工作流对话框常量：脚本显示上限、动态工作流 token 消耗警告文案、步骤类型标签。
 */
var MAX_WORKFLOW_SCRIPT_DISPLAY = 200000;
var DYNAMIC_WORKFLOW_USAGE_WARNING =
  "Dynamic workflows can use a lot of tokens quickly by running many " +
  "subagents in parallel \u2014 which counts against your usage limit. Stop a " +
  "running workflow at any time with /workflows, or disable dynamic workflows in /config.";
var WORKFLOW_STEP_KIND_LABELS = {
  loop: "loop",
  parallel: "parallel",
  sequential: "step",
};
//@ chunk-sycr1qkz.js:18488-18849 placement
/**
 * 把工作流权限选项转换为结果（yes / yes-always 带权限更新 / no 带反馈），allow 时把脚本写回 input.script。
 */
function workflowChoiceToResult(choice, payload, script, selectedRow, feedback) {
  switch (choice) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: {
          ...payload.input,
          script,
        },
        ...(feedback && {
          feedback,
        }),
      };
    case "yes-always": {
      if (selectedRow === null || !isConsentRow(selectedRow))
        return {
          behavior: "allow",
          updatedInput: {
            ...payload.input,
            script,
          },
        };
      return {
        behavior: "allow",
        updatedInput: {
          ...payload.input,
          script,
        },
        permissionUpdates: selectedRow.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(feedback && {
          feedback,
        }),
      };
  }
}
//@ chunk-sycr1qkz.js:18849-18878 placement
var RULE_UPDATE_TYPES = new Set(["addRules"]);
//@ chunk-sycr1qkz.js:18878-19439 placement
function workflowPermissionOptions(payload) {
  let workflowName = payload.workflowName;
  if (workflowName === undefined) return null;
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [
          {
            toolName: WORKFLOW_TOOL_NAME,
            ruleContent: workflowName,
          },
        ],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: RULE_UPDATE_TYPES,
      renderLabel: (updates) => {
        let update = updates.length === 1 ? updates[0] : undefined;
        if (
          update === undefined ||
          update.type !== "addRules" ||
          update.rules.length !== 1 ||
          update.rules[0]?.toolName !== WORKFLOW_TOOL_NAME ||
          update.rules[0]?.ruleContent !== workflowName
        )
          return null;
        let contentDisplay = plainDisplay(update.rules[0].ruleContent);
        if (contentDisplay === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for ",
            jsxProd_default(Text, {
              bold: true,
              children: contentDisplay.display,
            }),
            " ",
            "in",
            " ",
            jsxProd_default(Text, {
              bold: true,
              children: stripInvisibleChars(getOriginalCwd()),
            }),
          ],
        });
      },
    },
  );
}
//@ chunk-sycr1qkz.js:19439-26562 placement
/**
 * 工作流脚本权限对话框：展示脚本、允许/本地规则记住
 */
function WorkflowPermissionDialog(props) {
  let $ = useMemoCache(132);
  let { payload, answer, wouldTakeAnswer } = props;
  let [script, setScript] = useState(payload.script);
  let isTooLarge = script.length > MAX_WORKFLOW_SCRIPT_DISPLAY || payload.scriptForged;
  let safeCode;
  if ($[0] !== script || $[1] !== isTooLarge) {
    safeCode = isTooLarge ? "" : stripUnsafeChars(script);
    $[0] = script;
    $[1] = isTooLarge;
    $[2] = safeCode;
  } else safeCode = $[2];
  let code = safeCode;
  let isSuspicious;
  if ($[3] !== script || $[4] !== isTooLarge) {
    isSuspicious = isTooLarge || hasSuspiciousText(script);
    $[3] = script;
    $[4] = isTooLarge;
    $[5] = isSuspicious;
  } else isSuspicious = $[5];
  let isSuspicious_2 = isSuspicious;
  let parsed;
  m: {
    if (isSuspicious_2) {
      parsed = null;
      break m;
    }
    let parseResult;
    if ($[6] !== script) {
      parseResult = parseWorkflowScript(script);
      $[6] = script;
      $[7] = parseResult;
    } else parseResult = $[7];
    let parseResult_2 = parseResult;
    parsed = "error" in parseResult_2 ? null : parseResult_2;
  }
  let parsedScript = parsed;
  let scriptBody = isSuspicious_2 ? "" : (parsedScript?.scriptBody ?? script);
  let summary;
  if ($[8] !== scriptBody) {
    summary = summarizeWorkflowScript(scriptBody);
    $[8] = scriptBody;
    $[9] = summary;
  } else summary = $[9];
  let summary_2 = summary;
  let steps;
  if ($[10] !== summary_2 || $[11] !== parsedScript?.meta.phases) {
    Xo: {
      let toRawText = rawText;
      let normalizeText = (value) => replaceLineBreaks(toRawText(value)).replace(/\s+/g, " ").trim();
      let collectPrompts = (step) => {
        let seen = new Set();
        let prompts = [];
        for (const agent of step?.agents ?? []) {
          if (agent.prompt && !seen.has(agent.prompt)) {
            seen.add(agent.prompt);
            prompts.push(normalizeText(agent.prompt));
          }
        }
        return prompts;
      };
      let toStep = (step) => ({
        title: normalizeText(
          WORKFLOW_STEP_KIND_LABELS[step.kind] + (step.annotation ? ` ${step.annotation}` : ""),
        ),
        prompts: collectPrompts(step),
      });
      let phases = parsedScript?.meta.phases;
      if (phases && phases.length > 0) {
        let mapped = phases.map((phase, index) => ({
          title: normalizeText(phase.title),
          detail: phase.detail !== undefined ? normalizeText(phase.detail) : undefined,
          prompts: collectPrompts(summary_2?.phases[index]),
        }));
        let summaryPhases;
        if ($[13] !== summary_2?.phases) {
          summaryPhases = summary_2?.phases ?? [];
          $[13] = summary_2?.phases;
          $[14] = summaryPhases;
        } else summaryPhases = $[14];
        let mapped_2 = summaryPhases.slice(phases.length).map(toStep);
        steps = [...mapped, ...mapped_2];
        break Xo;
      }
      if (summary_2 && summary_2.phases.length > 0) {
        steps = summary_2.phases.map(toStep);
        break Xo;
      }
      steps = null;
    }
    $[10] = summary_2;
    $[11] = parsedScript?.meta.phases;
    $[12] = steps;
  } else steps = $[12];
  let steps_2 = steps;
  let [showSummary, setShowSummary] = useState(steps_2 === null);
  let onKeyDown;
  if ($[15] !== script || $[16] !== wouldTakeAnswer) {
    onKeyDown = function onKeyDownImpl(event) {
      if (event.ctrl && event.key === "g") {
        event.preventDefault();
        if (!wouldTakeAnswer()) {
          return;
        }
        let edited = editPromptInEditor(script);
        let content = edited.content === null ? null : normalizeCrLf(edited.content);
        if (content !== null && content !== script) {
          setScript(content);
          setShowSummary(false);
        }
      }
    };
    $[15] = script;
    $[16] = wouldTakeAnswer;
    $[17] = onKeyDown;
  } else onKeyDown = $[17];
  let onKeyDownStable = onKeyDown;
  let argsText;
  if ($[18] !== payload.args) {
    argsText =
      payload.args === undefined
        ? undefined
        : serializeApprovalPayload(payload.args, {
            scrub: "key",
            maxUnits: MAX_PAYLOAD_UNITS,
          });
    $[18] = payload.args;
    $[19] = argsText;
  } else argsText = $[19];
  let argsText_2 = argsText;
  let argsDisplay =
    argsText_2 === undefined ? undefined : argsText_2.kind === "full" ? argsText_2.text : argsText_2.marker;
  let alwaysAllowOption;
  if ($[20] !== argsText_2?.kind || $[21] !== payload || $[22] !== isSuspicious_2) {
    alwaysAllowOption =
      shouldOfferAlwaysAllow(payload) && argsText_2?.kind !== "withheld" && !isSuspicious_2
        ? workflowPermissionOptions(payload)
        : null;
    $[20] = argsText_2?.kind;
    $[21] = payload;
    $[22] = isSuspicious_2;
    $[23] = alwaysAllowOption;
  } else alwaysAllowOption = $[23];
  let alwaysAllowOption_2 = alwaysAllowOption;
  let onSelect;
  if (
    $[24] !== alwaysAllowOption_2 ||
    $[25] !== answer ||
    $[26] !== payload ||
    $[27] !== script ||
    $[28] !== isSuspicious_2 ||
    $[29] !== wouldTakeAnswer
  ) {
    onSelect = (choice, feedback) => {
      if (choice === "toggle") {
        if (!wouldTakeAnswer()) {
          return false;
        }
        setShowSummary(isFalsy);
        return;
      }
      if (choice !== "no" && isSuspicious_2) {
        return false;
      }
      return answer(workflowChoiceToResult(choice, payload, script, alwaysAllowOption_2, feedback));
    };
    $[24] = alwaysAllowOption_2;
    $[25] = answer;
    $[26] = payload;
    $[27] = script;
    $[28] = isSuspicious_2;
    $[29] = wouldTakeAnswer;
    $[30] = onSelect;
  } else onSelect = $[30];
  let onSelect_2 = onSelect;
  let onCancel;
  if ($[31] !== answer) {
    onCancel = () =>
      answer({
        behavior: "deny",
      });
    $[31] = answer;
    $[32] = onCancel;
  } else onCancel = $[32];
  let onCancel_2 = onCancel;
  let innerBox;
  let outerBox;
  let DialogComponent;
  let hideIndexes;
  let options;
  let flexDirection;
  let paddingX;
  let marginBottom;
  let overflow;
  let descriptionBox;
  let flexDirection_2;
  let marginTop;
  let tabIndex;
  let autoFocus;
  let onKeyDown_2;
  let ruleExplanation;
  let color;
  let title;
  let requestSource;
  let toolAnalyticsContext;
  if (
    $[33] !== alwaysAllowOption_2 ||
    $[34] !== steps_2 ||
    $[35] !== onKeyDownStable ||
    $[36] !== parsedScript ||
    $[37] !== payload ||
    $[38] !== isSuspicious_2 ||
    $[39] !== showSummary
  ) {
    let text =
      parsedScript?.meta.description !== undefined
        ? displayField(parsedScript.meta.description).text
        : undefined;
    hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
    let noOption;
    if ($[60] === MEMO_CACHE_SENTINEL) {
      noOption = {
        label: "No",
        value: "no",
        feedbackConfig: {
          type: "reject",
        },
      };
      $[60] = noOption;
    } else noOption = $[60];
    let noOption_2 = noOption;
    let optionsList;
    if (
      $[61] !== alwaysAllowOption_2 ||
      $[62] !== steps_2 ||
      $[63] !== hideIndexes ||
      $[64] !== isSuspicious_2 ||
      $[65] !== showSummary
    ) {
      optionsList = hideIndexes ? [noOption_2] : [];
      if (!isSuspicious_2) {
        let yesOption;
        if ($[67] === MEMO_CACHE_SENTINEL) {
          yesOption = {
            label: "Yes, run it",
            value: "yes",
            feedbackConfig: {
              type: "accept",
            },
          };
          $[67] = yesOption;
        } else yesOption = $[67];
        optionsList.push(yesOption);
      }
      if (alwaysAllowOption_2 !== null) {
        let alwaysOption;
        if ($[68] !== alwaysAllowOption_2.node) {
          alwaysOption = {
            label: alwaysAllowOption_2.node,
            value: "yes-always",
          };
          $[68] = alwaysAllowOption_2.node;
          $[69] = alwaysOption;
        } else alwaysOption = $[69];
        optionsList.push(alwaysOption);
      }
      if (steps_2 && !isSuspicious_2) {
        const label = showSummary ? "View workflow summary" : "View raw script";
        let toggleOption;
        if ($[70] !== label) {
          toggleOption = {
            label,
            value: "toggle",
          };
          $[70] = label;
          $[71] = toggleOption;
        } else toggleOption = $[71];
        optionsList.push(toggleOption);
      }
      if (!hideIndexes) optionsList.push(noOption_2);
      $[61] = alwaysAllowOption_2;
      $[62] = steps_2;
      $[63] = hideIndexes;
      $[64] = isSuspicious_2;
      $[65] = showSummary;
      $[66] = optionsList;
    } else optionsList = $[66];
    options = optionsList;
    let toolName;
    if ($[72] !== payload.toolName) {
      toolName = sanitizeToolNameForAnalytics(payload.toolName);
      $[72] = payload.toolName;
      $[73] = toolName;
    } else toolName = $[73];
    let toolAnalytics;
    if ($[74] !== payload.isMcp || $[75] !== toolName) {
      toolAnalytics = {
        toolName,
        isMcp: payload.isMcp,
      };
      $[74] = payload.isMcp;
      $[75] = toolName;
      $[76] = toolAnalytics;
    } else toolAnalytics = $[76];
    toolAnalyticsContext = toolAnalytics;
    DialogComponent = PermissionDialog_2;
    color = "permission";
    title = "Run a dynamic workflow?";
    requestSource = payload.requestSource;
    outerBox = Box;
    flexDirection_2 = "column";
    marginTop = 1;
    tabIndex = 0;
    autoFocus = true;
    onKeyDown_2 = onKeyDownStable;
    if ($[77] !== payload.permissionResult) {
      ruleExplanation =
        payload.permissionResult.denialLimitFallback !== undefined &&
        jsxProd_default(PermissionRuleExplanation, {
          permissionResult: payload.permissionResult,
          toolType: "tool",
        });
      $[77] = payload.permissionResult;
      $[78] = ruleExplanation;
    } else ruleExplanation = $[78];
    innerBox = Box;
    flexDirection = "column";
    paddingX = 1;
    marginBottom = 1;
    overflow = "hidden";
    descriptionBox =
      text &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Blockquote, {
          multiline: needsGutter(text),
          children: jsxProd_default(Text, {
            bold: true,
            children: text,
          }),
        }),
      });
    $[33] = alwaysAllowOption_2;
    $[34] = steps_2;
    $[35] = onKeyDownStable;
    $[36] = parsedScript;
    $[37] = payload;
    $[38] = isSuspicious_2;
    $[39] = showSummary;
    $[40] = innerBox;
    $[41] = outerBox;
    $[42] = DialogComponent;
    $[43] = hideIndexes;
    $[44] = options;
    $[45] = flexDirection;
    $[46] = paddingX;
    $[47] = marginBottom;
    $[48] = overflow;
    $[49] = descriptionBox;
    $[50] = flexDirection_2;
    $[51] = marginTop;
    $[52] = tabIndex;
    $[53] = autoFocus;
    $[54] = onKeyDown_2;
    $[55] = ruleExplanation;
    $[56] = color;
    $[57] = title;
    $[58] = requestSource;
    $[59] = toolAnalyticsContext;
  } else {
    innerBox = $[40];
    outerBox = $[41];
    DialogComponent = $[42];
    hideIndexes = $[43];
    options = $[44];
    flexDirection = $[45];
    paddingX = $[46];
    marginBottom = $[47];
    overflow = $[48];
    descriptionBox = $[49];
    flexDirection_2 = $[50];
    marginTop = $[51];
    tabIndex = $[52];
    autoFocus = $[53];
    onKeyDown_2 = $[54];
    ruleExplanation = $[55];
    color = $[56];
    title = $[57];
    requestSource = $[58];
    toolAnalyticsContext = $[59];
  }
  let bodyContent;
  if (
    $[79] !== steps_2 ||
    $[80] !== payload.scriptForged ||
    $[81] !== code ||
    $[82] !== script.length ||
    $[83] !== isSuspicious_2 ||
    $[84] !== showSummary
  ) {
    bodyContent = isSuspicious_2
      ? jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: payload.scriptForged
              ? "(the workflow script could not be read from this request \u2014 approval is unavailable; deny or send feedback)"
              : `(script of ${script.length.toLocaleString()} characters cannot be shown in full \u2014 approval is unavailable; deny or send feedback)`,
          }),
        })
      : showSummary || !steps_2
        ? jsxProd_default(DiffFrame, {
            children: jsxProd_default(HighlightedCode, {
              code,
              filePath: "workflow.js",
            }),
          })
        : jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(Text, {
                children:
                  "This dynamic workflow will spin up multiple subagents across the following phases:",
              }),
              steps_2.map(renderWorkflowStepRow),
            ],
          });
    $[79] = steps_2;
    $[80] = payload.scriptForged;
    $[81] = code;
    $[82] = script.length;
    $[83] = isSuspicious_2;
    $[84] = showSummary;
    $[85] = bodyContent;
  } else bodyContent = $[85];
  let argsBox;
  if ($[86] !== argsDisplay || $[87] !== argsText_2) {
    argsBox =
      argsDisplay &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Blockquote, {
          multiline: argsText_2?.kind === "full" && argsText_2.needsGutter,
          children: jsxProd_default_2(Text, {
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                dimColor: true,
                children: ["args:", " "],
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: argsDisplay,
              }),
            ],
          }),
        }),
      });
    $[86] = argsDisplay;
    $[87] = argsText_2;
    $[88] = argsBox;
  } else argsBox = $[88];
  let bodyBox;
  if (
    $[89] !== innerBox ||
    $[90] !== flexDirection ||
    $[91] !== paddingX ||
    $[92] !== marginBottom ||
    $[93] !== overflow ||
    $[94] !== descriptionBox ||
    $[95] !== bodyContent ||
    $[96] !== argsBox
  ) {
    bodyBox = jsxProd_default_2(innerBox, {
      flexDirection,
      paddingX,
      marginBottom,
      overflow,
      children: [descriptionBox, bodyContent, argsBox],
    });
    $[89] = innerBox;
    $[90] = flexDirection;
    $[91] = paddingX;
    $[92] = marginBottom;
    $[93] = overflow;
    $[94] = descriptionBox;
    $[95] = bodyContent;
    $[96] = argsBox;
    $[97] = bodyBox;
  } else bodyBox = $[97];
  let ruleExplanation_2;
  if ($[98] !== hideIndexes || $[99] !== payload.permissionResult) {
    ruleExplanation_2 =
      hideIndexes &&
      jsxProd_default(PermissionRuleExplanation, {
        permissionResult: payload.permissionResult,
        toolType: "tool",
        rowBudget: MAX_EXPLANATION_LINES,
      });
    $[98] = hideIndexes;
    $[99] = payload.permissionResult;
    $[100] = ruleExplanation_2;
  } else ruleExplanation_2 = $[100];
  let fallbackNotice;
  if ($[101] !== payload.permissionResult) {
    fallbackNotice =
      payload.permissionResult.denialLimitFallback === undefined &&
      payload.permissionResult.autoDenyWindow !== undefined &&
      jsxProd_default(DenialLimitFallbackNotice, {
        permissionResult: payload.permissionResult,
      });
    $[101] = payload.permissionResult;
    $[102] = fallbackNotice;
  } else fallbackNotice = $[102];
  let question;
  if ($[103] === MEMO_CACHE_SENTINEL) {
    question = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        color: "warning",
        children: DYNAMIC_WORKFLOW_USAGE_WARNING,
      }),
    });
    $[103] = question;
  } else question = $[103];
  let prompt;
  if (
    $[104] !== onCancel_2 ||
    $[105] !== onSelect_2 ||
    $[106] !== hideIndexes ||
    $[107] !== options ||
    $[108] !== payload.requestSource ||
    $[109] !== toolAnalyticsContext
  ) {
    prompt = jsxProd_default(PermissionPrompt, {
      options,
      hideIndexes,
      onSelect: onSelect_2,
      onCancel: onCancel_2,
      requestSource: payload.requestSource,
      question,
      toolAnalyticsContext,
    });
    $[104] = onCancel_2;
    $[105] = onSelect_2;
    $[106] = hideIndexes;
    $[107] = options;
    $[108] = payload.requestSource;
    $[109] = toolAnalyticsContext;
    $[110] = prompt;
  } else prompt = $[110];
  let editHint;
  if ($[111] === MEMO_CACHE_SENTINEL) {
    editHint = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(KeyboardShortcutHint, {
        chord: "ctrl+g",
        action: "edit script in $EDITOR",
      }),
    });
    $[111] = editHint;
  } else editHint = $[111];
  let promptBox;
  if ($[112] !== ruleExplanation_2 || $[113] !== fallbackNotice || $[114] !== prompt) {
    promptBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [ruleExplanation_2, fallbackNotice, prompt, editHint],
    });
    $[112] = ruleExplanation_2;
    $[113] = fallbackNotice;
    $[114] = prompt;
    $[115] = promptBox;
  } else promptBox = $[115];
  let children;
  if (
    $[116] !== outerBox ||
    $[117] !== flexDirection_2 ||
    $[118] !== marginTop ||
    $[119] !== tabIndex ||
    $[120] !== autoFocus ||
    $[121] !== onKeyDown_2 ||
    $[122] !== ruleExplanation ||
    $[123] !== bodyBox ||
    $[124] !== promptBox
  ) {
    children = jsxProd_default_2(outerBox, {
      flexDirection: flexDirection_2,
      marginTop,
      tabIndex,
      autoFocus,
      onKeyDown: onKeyDown_2,
      children: [ruleExplanation, bodyBox, promptBox],
    });
    $[116] = outerBox;
    $[117] = flexDirection_2;
    $[118] = marginTop;
    $[119] = tabIndex;
    $[120] = autoFocus;
    $[121] = onKeyDown_2;
    $[122] = ruleExplanation;
    $[123] = bodyBox;
    $[124] = promptBox;
    $[125] = children;
  } else children = $[125];
  let dialog;
  if (
    $[126] !== DialogComponent ||
    $[127] !== color ||
    $[128] !== title ||
    $[129] !== requestSource ||
    $[130] !== children
  ) {
    dialog = jsxProd_default(DialogComponent, {
      color,
      title,
      requestSource,
      children,
    });
    $[126] = DialogComponent;
    $[127] = color;
    $[128] = title;
    $[129] = requestSource;
    $[130] = children;
    $[131] = dialog;
  } else dialog = $[131];
  return dialog;
}
export { WorkflowPermissionDialog };
