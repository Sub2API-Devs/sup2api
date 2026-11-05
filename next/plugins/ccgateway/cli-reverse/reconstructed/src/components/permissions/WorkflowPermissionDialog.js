/**
 * components/permissions/WorkflowPermissionDialog.tsx
 *
 * 工作流脚本权限对话框（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5z2maphr.js (17)
 * attribution: placement 16, layout 1
 */
import {
  init_react_production,
  fragmentTypeExport,
  useState,
} from "../../../vendor/react/cjs/react.production.js";
import { truncate, formatOverflowHint } from "../../utils/format.js";
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
import { currentToolPermissionContext } from "../../utils/permissions/currentPermissionContext.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { editPromptInEditor } from "../../utils/promptEditor.js";
import { normalizeCrLf } from "../../services/workflow/scriptFile.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  CommandDisplay,
  CommandPreviewFrame,
  FittedBodyKeybindings,
} from "./BashPermissionRequest/commandDisplay.js";
import { fitTextToRows } from "../AutocompactOfferDialog.js";
import { shouldOfferAlwaysAllow } from "./FallbackPermissionRequest.js";
import { sanitizeToolNameForAnalytics } from "../../services/analytics/metadata.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "./PermissionRuleExplanation.js";
import { Blockquote } from "../Blockquote.js";
import { DenialLimitFallbackNotice } from "./UnattendedAutoBlockNotice.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { permissionChoicePrompt } from "./PermissionPrompt.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { HighlightedCode } from "../HighlightedCode.js";

//@ chunk-5z2maphr.js:15876-15880 placement
init_react_production();
//@ chunk-5z2maphr.js:15880-15884 placement
init_react_production();
//@ chunk-5z2maphr.js:15884-15903 placement
var DECIDE_DELAY_MS = 100;
var PERMISSION_TIMEOUT_MS = 5000;
//@ chunk-5z2maphr.js:15903-16622 placement
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
//@ chunk-5z2maphr.js:16622-16848 placement
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
//@ chunk-5z2maphr.js:16848-17132 placement
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
//@ chunk-5z2maphr.js:17132-17186 placement
function hasIdentifierChar(char) {
  return char != null && /[A-Za-z0-9_]/.test(char);
}
//@ chunk-5z2maphr.js:17186-18873 placement
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
    return {
      phases,
    };
  } catch {
    return null;
  }
}
//@ chunk-5z2maphr.js:18873-18908 placement
function rawText(field) {
  return displayField(field).text;
}
//@ chunk-5z2maphr.js:18908-18980 placement
function quotedPreview(text) {
  return `\xB7 "${stripNonPrintable(text.length > 60 ? truncateToLength(text, 59) + "\u2026" : text)}"`;
}
//@ chunk-5z2maphr.js:18980-19121 layout
function formatStepLine(step, index) {
  return (
    `${index + 1}. ${step.title}` +
    (step.detail ? ` \u2014 ${step.detail}` : "") +
    (step.promptsPreview === ""
      ? ""
      : `
   ${step.promptsPreview}`)
  );
}
//@ chunk-5z2maphr.js:19121-19355 placement
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
        step.promptsPreview !== "" &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: ["     ", step.promptsPreview],
          }),
      ],
    },
    index,
  );
}
//@ chunk-5z2maphr.js:19355-19756 placement
/**
 * 工作流对话框常量：脚本显示上限、动态工作流 token 消耗警告文案、步骤类型标签。
 */
var MAX_WORKFLOW_SCRIPT_DISPLAY = 200000;
var DYNAMIC_WORKFLOW_USAGE_WARNING =
  "Dynamic workflows can use a lot of tokens quickly by running many " +
  "subagents in parallel \u2014 which counts against your usage limit. Stop a " +
  "running workflow at any time with /workflows, or disable dynamic workflows in /config.";
var ARGS_LABEL = "args: ";
var MAX_ARGS_ROWS = 2;
var VIEW_MODE_OPTIONS = {
  summary: "View workflow summary",
  raw: "View raw script",
  args: "View args",
};
var WORKFLOW_STEP_KIND_LABELS = {
  loop: "loop",
  parallel: "parallel",
  sequential: "step",
};
//@ chunk-5z2maphr.js:19756-20117 placement
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
//@ chunk-5z2maphr.js:20117-20146 placement
var RULE_UPDATE_TYPES = new Set(["addRules"]);
//@ chunk-5z2maphr.js:20146-20707 placement
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
//@ chunk-5z2maphr.js:20707-30845 placement
/**
 * 工作流脚本权限对话框：展示脚本、允许/本地规则记住
 */
function WorkflowPermissionDialog(props) {
  let $ = useMemoCache(145);
  let { payload, answer, wouldTakeAnswer } = props;
  let [script, setScript] = useState(payload.script);
  let [permissionContext] = useState(currentToolPermissionContext);
  let isTooLarge = script.length > MAX_WORKFLOW_SCRIPT_DISPLAY || payload.scriptForged;
  let safeCode;
  if ($[0] !== permissionContext || $[1] !== script || $[2] !== isTooLarge) {
    safeCode = isTooLarge || permissionContext ? "" : stripUnsafeChars(script);
    $[0] = permissionContext;
    $[1] = script;
    $[2] = isTooLarge;
    $[3] = safeCode;
  } else safeCode = $[3];
  let code = safeCode;
  let isSuspicious;
  if ($[4] !== script || $[5] !== isTooLarge) {
    isSuspicious = isTooLarge || hasSuspiciousText(script);
    $[4] = script;
    $[5] = isTooLarge;
    $[6] = isSuspicious;
  } else isSuspicious = $[6];
  let isSuspiciousFlag = isSuspicious;
  let parsed;
  A: {
    if (isSuspiciousFlag) {
      parsed = null;
      break A;
    }
    let parseResult;
    if ($[7] !== script) {
      parseResult = parseWorkflowScript(script);
      $[7] = script;
      $[8] = parseResult;
    } else parseResult = $[8];
    let parseResult_2 = parseResult;
    parsed = "error" in parseResult_2 ? null : parseResult_2;
  }
  let parsedScript = parsed;
  let scriptBody = isSuspiciousFlag ? "" : (parsedScript?.scriptBody ?? script);
  let summary;
  if ($[9] !== scriptBody) {
    summary = summarizeWorkflowScript(scriptBody);
    $[9] = scriptBody;
    $[10] = summary;
  } else summary = $[10];
  let summary_2 = summary;
  let steps;
  if ($[11] !== summary_2 || $[12] !== parsedScript?.meta.phases) {
    Jo: {
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
        return (
          prompts.slice(0, 2).map(quotedPreview).join("  ") +
          (prompts.length > 2 ? `  +${prompts.length - 2} more` : "")
        );
      };
      let toStep = (step) => ({
        title: normalizeText(
          WORKFLOW_STEP_KIND_LABELS[step.kind] + (step.annotation ? ` ${step.annotation}` : ""),
        ),
        promptsPreview: collectPrompts(step),
      });
      let phases = parsedScript?.meta.phases;
      if (phases && phases.length > 0) {
        let mapped = phases.map((phase, index) => ({
          title: normalizeText(phase.title),
          detail: phase.detail !== undefined ? normalizeText(phase.detail) : undefined,
          promptsPreview: collectPrompts(summary_2?.phases[index]),
        }));
        let summaryPhases;
        if ($[14] !== summary_2?.phases) {
          summaryPhases = summary_2?.phases ?? [];
          $[14] = summary_2?.phases;
          $[15] = summaryPhases;
        } else summaryPhases = $[15];
        let mapped_2 = summaryPhases.slice(phases.length).map(toStep);
        steps = [...mapped, ...mapped_2];
        break Jo;
      }
      if (summary_2 && summary_2.phases.length > 0) {
        steps = summary_2.phases.map(toStep);
        break Jo;
      }
      steps = null;
    }
    $[11] = summary_2;
    $[12] = parsedScript?.meta.phases;
    $[13] = steps;
  } else steps = $[13];
  let scriptSteps = steps;
  let [showSummary, setShowSummary] = useState(scriptSteps === null);
  let [showRaw, setShowRaw] = useState(false);
  let onKeyDown;
  if ($[16] !== script || $[17] !== wouldTakeAnswer) {
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
          setShowRaw(false);
        }
      }
    };
    $[16] = script;
    $[17] = wouldTakeAnswer;
    $[18] = onKeyDown;
  } else onKeyDown = $[18];
  let onKeyDown_2 = onKeyDown;
  let argsText;
  if ($[19] !== payload.args) {
    argsText =
      payload.args === undefined
        ? undefined
        : serializeApprovalPayload(payload.args, {
            scrub: "key",
            maxUnits: MAX_PAYLOAD_UNITS,
          });
    $[19] = payload.args;
    $[20] = argsText;
  } else argsText = $[20];
  let argsText_2 = argsText;
  let argsDisplay =
    argsText_2 === undefined ? undefined : argsText_2.kind === "full" ? argsText_2.text : argsText_2.marker;
  let text =
    parsedScript?.meta.description !== undefined
      ? displayField(parsedScript.meta.description).text
      : undefined;
  let forgedNotice;
  if ($[21] !== payload.scriptForged || $[22] !== script.length) {
    forgedNotice = payload.scriptForged
      ? "(the workflow script could not be read from this request \u2014 approval is unavailable; deny or send feedback)"
      : `(script of ${script.length.toLocaleString()} characters cannot be shown in full \u2014 approval is unavailable; deny or send feedback)`;
    $[21] = payload.scriptForged;
    $[22] = script.length;
    $[23] = forgedNotice;
  } else forgedNotice = $[23];
  let forgedNoticeStable = forgedNotice;
  let alwaysAllowOption;
  if ($[24] !== permissionContext || $[25] !== script || $[26] !== isSuspiciousFlag) {
    alwaysAllowOption =
      permissionContext && !isSuspiciousFlag
        ? serializeApprovalPayload(script, {
            maxUnits: MAX_WORKFLOW_SCRIPT_DISPLAY,
          })
        : undefined;
    $[24] = permissionContext;
    $[25] = script;
    $[26] = isSuspiciousFlag;
    $[27] = alwaysAllowOption;
  } else alwaysAllowOption = $[27];
  let allowOption = alwaysAllowOption;
  let onKeyDownStable = isSuspiciousFlag || allowOption?.kind === "withheld";
  let stepsDisplay;
  if ($[28] !== onKeyDownStable || $[29] !== scriptSteps || $[30] !== permissionContext) {
    stepsDisplay =
      permissionContext && scriptSteps && !onKeyDownStable
        ? serializeApprovalPayload(
            scriptSteps.map(formatStepLine).join(`
`),
            {
              maxUnits: MAX_WORKFLOW_SCRIPT_DISPLAY,
            },
          )
        : undefined;
    $[28] = onKeyDownStable;
    $[29] = scriptSteps;
    $[30] = permissionContext;
    $[31] = stepsDisplay;
  } else stepsDisplay = $[31];
  let stepsText = stepsDisplay;
  let hasSteps = permissionContext ? stepsText?.kind === "full" : scriptSteps !== null;
  let needsGutter_2 = argsText_2?.kind === "full" && argsText_2.needsGutter;
  let gutterNeeded = permissionContext && needsGutter_2 && !onKeyDownStable;
  let commandDisplay;
  Qo: {
    if (!permissionContext) {
      let emptyPayload;
      if ($[32] === MEMO_CACHE_SENTINEL) {
        emptyPayload = serializeApprovalPayload("");
        $[32] = emptyPayload;
      } else emptyPayload = $[32];
      commandDisplay = emptyPayload;
      break Qo;
    }
    if (allowOption?.kind !== "full") {
      let forgedPayload;
      if ($[33] !== forgedNoticeStable) {
        forgedPayload = serializeApprovalPayload(forgedNoticeStable);
        $[33] = forgedNoticeStable;
        $[34] = forgedPayload;
      } else forgedPayload = $[34];
      commandDisplay = forgedPayload;
      break Qo;
    }
    if (showRaw && argsText_2?.kind === "full") {
      commandDisplay = argsText_2;
      break Qo;
    }
    commandDisplay = !showSummary && stepsText?.kind === "full" ? stepsText : allowOption;
  }
  let commandDisplay_2 = commandDisplay;
  let fitted = CommandDisplay({
    commandDisplay: commandDisplay_2,
    description: text ?? "",
    refinedPrefix: undefined,
  });
  let { offersStanding, isStandingHeld } = fitted.body;
  let isCut = fitted.isCut;
  let width = fitted.body.columns - 2 - ARGS_LABEL.length;
  let argsDisplayValue;
  Io: {
    if (!isCut || !argsDisplay || !needsGutter_2) {
      argsDisplayValue = argsDisplay;
      break Io;
    }
    let fittedArgs;
    if ($[35] !== width || $[36] !== argsDisplay) {
      let fitResult = fitTextToRows(argsDisplay, width, MAX_ARGS_ROWS);
      fittedArgs =
        fitResult.hiddenRows === 0
          ? fitResult.text
          : `${fitResult.text}
${formatOverflowHint(fitResult.hiddenRows, "line")}`;
      $[35] = width;
      $[36] = argsDisplay;
      $[37] = fittedArgs;
    } else fittedArgs = $[37];
    argsDisplayValue = fittedArgs;
  }
  let argsDisplayStable = argsDisplayValue;
  let viewMode = showRaw
    ? hasSteps
      ? "summary"
      : "raw"
    : !showSummary && hasSteps
      ? "raw"
      : gutterNeeded
        ? "args"
        : "summary";
  let alwaysAllow;
  if ($[38] !== argsText_2?.kind || $[39] !== payload || $[40] !== isSuspiciousFlag) {
    alwaysAllow =
      shouldOfferAlwaysAllow(payload) && argsText_2?.kind !== "withheld" && !isSuspiciousFlag
        ? workflowPermissionOptions(payload)
        : null;
    $[38] = argsText_2?.kind;
    $[39] = payload;
    $[40] = isSuspiciousFlag;
    $[41] = alwaysAllow;
  } else alwaysAllow = $[41];
  let alwaysAllowOption_2 = alwaysAllow;
  let onSelect;
  if (
    $[42] !== alwaysAllowOption_2 ||
    $[43] !== answer ||
    $[44] !== onKeyDownStable ||
    $[45] !== gutterNeeded ||
    $[46] !== isStandingHeld ||
    $[47] !== viewMode ||
    $[48] !== payload ||
    $[49] !== script ||
    $[50] !== wouldTakeAnswer
  ) {
    onSelect = (choice, feedback) => {
      if (choice === "toggle") {
        if (!wouldTakeAnswer()) {
          return false;
        }
        setShowRaw(viewMode === "args");
        setShowSummary(viewMode !== "summary");
        return;
      }
      if (choice !== "no" && onKeyDownStable) {
        return false;
      }
      if (choice === "yes-always" && (isStandingHeld || gutterNeeded)) {
        return false;
      }
      return answer(workflowChoiceToResult(choice, payload, script, alwaysAllowOption_2, feedback));
    };
    $[42] = alwaysAllowOption_2;
    $[43] = answer;
    $[44] = onKeyDownStable;
    $[45] = gutterNeeded;
    $[46] = isStandingHeld;
    $[47] = viewMode;
    $[48] = payload;
    $[49] = script;
    $[50] = wouldTakeAnswer;
    $[51] = onSelect;
  } else onSelect = $[51];
  let onSelect_2 = onSelect;
  let onCancel;
  if ($[52] !== answer) {
    onCancel = () =>
      answer({
        behavior: "deny",
      });
    $[52] = answer;
    $[53] = onCancel;
  } else onCancel = $[53];
  let onCancel_2 = onCancel;
  let hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
  let noOption;
  if ($[54] === MEMO_CACHE_SENTINEL) {
    noOption = {
      label: "No",
      value: "no",
      feedbackConfig: {
        type: "reject",
      },
    };
    $[54] = noOption;
  } else noOption = $[54];
  let noOption_2 = noOption;
  let optionsList;
  if (
    $[55] !== alwaysAllowOption_2 ||
    $[56] !== onKeyDownStable ||
    $[57] !== gutterNeeded ||
    $[58] !== hasSteps ||
    $[59] !== hideIndexes ||
    $[60] !== isStandingHeld ||
    $[61] !== viewMode ||
    $[62] !== offersStanding
  ) {
    optionsList = hideIndexes ? [noOption_2] : [];
    if (!onKeyDownStable) {
      let yesOption;
      if ($[64] === MEMO_CACHE_SENTINEL) {
        yesOption = {
          label: "Yes, run it",
          value: "yes",
          feedbackConfig: {
            type: "accept",
          },
        };
        $[64] = yesOption;
      } else yesOption = $[64];
      optionsList.push(yesOption);
    }
    if (alwaysAllowOption_2 !== null && !onKeyDownStable && offersStanding && !gutterNeeded) {
      let alwaysOption;
      if ($[65] !== alwaysAllowOption_2.node || $[66] !== isStandingHeld) {
        alwaysOption = {
          label: alwaysAllowOption_2.node,
          value: "yes-always",
          disabled: isStandingHeld,
        };
        $[65] = alwaysAllowOption_2.node;
        $[66] = isStandingHeld;
        $[67] = alwaysOption;
      } else alwaysOption = $[67];
      optionsList.push(alwaysOption);
    }
    if ((hasSteps || gutterNeeded) && !onKeyDownStable) {
      const label = VIEW_MODE_OPTIONS[viewMode];
      let toggleOption;
      if ($[68] !== label) {
        toggleOption = {
          label,
          value: "toggle",
        };
        $[68] = label;
        $[69] = toggleOption;
      } else toggleOption = $[69];
      optionsList.push(toggleOption);
    }
    if (!hideIndexes) optionsList.push(noOption_2);
    $[55] = alwaysAllowOption_2;
    $[56] = onKeyDownStable;
    $[57] = gutterNeeded;
    $[58] = hasSteps;
    $[59] = hideIndexes;
    $[60] = isStandingHeld;
    $[61] = viewMode;
    $[62] = offersStanding;
    $[63] = optionsList;
  } else optionsList = $[63];
  let options = optionsList;
  let toolName;
  if ($[70] !== payload.toolName) {
    toolName = sanitizeToolNameForAnalytics(payload.toolName);
    $[70] = payload.toolName;
    $[71] = toolName;
  } else toolName = $[71];
  let toolAnalytics;
  if ($[72] !== payload.isMcp || $[73] !== toolName) {
    toolAnalytics = {
      toolName,
      isMcp: payload.isMcp,
    };
    $[72] = payload.isMcp;
    $[73] = toolName;
    $[74] = toolAnalytics;
  } else toolAnalytics = $[74];
  let toolAnalyticsContext = toolAnalytics;
  if (permissionContext) {
    const requestSource = payload.requestSource;
    let frameHints;
    if ($[75] === MEMO_CACHE_SENTINEL) {
      frameHints = [
        jsxProd_default(
          KeyboardShortcutHint,
          {
            chord: "ctrl+g",
            action: "edit script",
            terse: true,
            format: {
              keyCase: "lower",
            },
          },
          "edit",
        ),
      ];
      $[75] = frameHints;
    } else frameHints = $[75];
    let ruleExplanation;
    if ($[76] !== fitted.isCut || $[77] !== fitted.reasonColumns || $[78] !== payload.permissionResult) {
      ruleExplanation =
        payload.permissionResult.denialLimitFallback !== undefined &&
        jsxProd_default(PermissionRuleExplanation, {
          permissionResult: payload.permissionResult,
          toolType: "tool",
          rowBudget: fitted.isCut ? MAX_EXPLANATION_LINES : undefined,
          rowColumns: fitted.isCut ? fitted.reasonColumns : undefined,
        });
      $[76] = fitted.isCut;
      $[77] = fitted.reasonColumns;
      $[78] = payload.permissionResult;
      $[79] = ruleExplanation;
    } else ruleExplanation = $[79];
    const descriptionBlock =
      text &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Blockquote, {
          multiline: needsGutter(fitted.description),
          children: jsxProd_default(Text, {
            bold: true,
            children: fitted.description,
          }),
        }),
      });
    let phasesIntro;
    if ($[80] !== hasSteps || $[81] !== showRaw || $[82] !== showSummary) {
      phasesIntro =
        !showRaw &&
        !showSummary &&
        hasSteps &&
        jsxProd_default(Text, {
          children: "This dynamic workflow will spin up multiple subagents across the following phases:",
        });
      $[80] = hasSteps;
      $[81] = showRaw;
      $[82] = showSummary;
      $[83] = phasesIntro;
    } else phasesIntro = $[83];
    let argsLabelRow;
    if ($[84] !== showRaw) {
      argsLabelRow =
        showRaw &&
        jsxProd_default(Text, {
          bold: true,
          dimColor: true,
          children: ARGS_LABEL,
        });
      $[84] = showRaw;
      $[85] = argsLabelRow;
    } else argsLabelRow = $[85];
    let commandPreview;
    if ($[86] !== commandDisplay_2 || $[87] !== fitted) {
      commandPreview = jsxProd_default(CommandPreviewFrame, {
        commandDisplay: commandDisplay_2,
        fitted,
        inset: 0,
      });
      $[86] = commandDisplay_2;
      $[87] = fitted;
      $[88] = commandPreview;
    } else commandPreview = $[88];
    let argsBlock;
    if ($[89] !== argsDisplayStable || $[90] !== needsGutter_2 || $[91] !== showRaw) {
      argsBlock =
        argsDisplayStable &&
        !showRaw &&
        jsxProd_default(Blockquote, {
          multiline: needsGutter_2,
          children: jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                dimColor: true,
                children: ARGS_LABEL,
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: argsDisplayStable,
              }),
            ],
          }),
        });
      $[89] = argsDisplayStable;
      $[90] = needsGutter_2;
      $[91] = showRaw;
      $[92] = argsBlock;
    } else argsBlock = $[92];
    let explanationRow;
    if (
      $[93] !== fitted.isCut ||
      $[94] !== fitted.reasonColumns ||
      $[95] !== hideIndexes ||
      $[96] !== payload.permissionResult
    ) {
      explanationRow =
        hideIndexes &&
        payload.permissionResult.denialLimitFallback === undefined &&
        jsxProd_default(PermissionRuleExplanation, {
          permissionResult: payload.permissionResult,
          toolType: "tool",
          rowBudget: MAX_EXPLANATION_LINES,
          rowColumns: fitted.isCut ? fitted.reasonColumns : undefined,
        });
      $[93] = fitted.isCut;
      $[94] = fitted.reasonColumns;
      $[95] = hideIndexes;
      $[96] = payload.permissionResult;
      $[97] = explanationRow;
    } else explanationRow = $[97];
    let autoDenyNotice;
    if ($[98] !== payload.permissionResult) {
      autoDenyNotice =
        payload.permissionResult.denialLimitFallback === undefined &&
        payload.permissionResult.autoDenyWindow !== undefined &&
        jsxProd_default(DenialLimitFallbackNotice, {
          permissionResult: payload.permissionResult,
        });
      $[98] = payload.permissionResult;
      $[99] = autoDenyNotice;
    } else autoDenyNotice = $[99];
    let usageWarning;
    if ($[100] === MEMO_CACHE_SENTINEL) {
      usageWarning = jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(Text, {
          color: "warning",
          children: DYNAMIC_WORKFLOW_USAGE_WARNING,
        }),
      });
      $[100] = usageWarning;
    } else usageWarning = $[100];
    return jsxProd_default(FittedBodyKeybindings, {
      fitted,
      children: jsxProd_default(FocusColumn, {
        onKeyDown: onKeyDown_2,
        children: jsxProd_default_2(permissionChoicePrompt, {
          options,
          hideIndexes,
          onSelect: onSelect_2,
          onCancel: onCancel_2,
          requestSource,
          toolAnalyticsContext,
          frameTitle: "Run a dynamic workflow?",
          frameHints,
          children: [
            ruleExplanation,
            descriptionBlock,
            phasesIntro,
            argsLabelRow,
            commandPreview,
            argsBlock,
            explanationRow,
            autoDenyNotice,
            usageWarning,
          ],
        }),
      }),
    });
  }
  const DialogComponent = PermissionDialog_2;
  const color = "permission";
  const title = "Run a dynamic workflow?";
  const requestSource = payload.requestSource;
  const outerBox = Box;
  const flexDirection = "column";
  const marginTop = 1;
  const tabIndex = 0;
  const autoFocus = true;
  let fallbackExplanation;
  if ($[101] !== payload.permissionResult) {
    fallbackExplanation =
      payload.permissionResult.denialLimitFallback !== undefined &&
      jsxProd_default(PermissionRuleExplanation, {
        permissionResult: payload.permissionResult,
        toolType: "tool",
      });
    $[101] = payload.permissionResult;
    $[102] = fallbackExplanation;
  } else fallbackExplanation = $[102];
  const innerBox = Box;
  const flexDirection_2 = "column";
  const paddingX = 1;
  const marginBottom = 1;
  const overflow = "hidden";
  const descriptionBox =
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
  let bodyContent;
  if (
    $[103] !== scriptSteps ||
    $[104] !== code ||
    $[105] !== isSuspiciousFlag ||
    $[106] !== showSummary ||
    $[107] !== forgedNoticeStable
  ) {
    bodyContent = isSuspiciousFlag
      ? jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: forgedNoticeStable,
          }),
        })
      : showSummary || !scriptSteps
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
              scriptSteps.map(renderWorkflowStepRow),
            ],
          });
    $[103] = scriptSteps;
    $[104] = code;
    $[105] = isSuspiciousFlag;
    $[106] = showSummary;
    $[107] = forgedNoticeStable;
    $[108] = bodyContent;
  } else bodyContent = $[108];
  let argsBox;
  if ($[109] !== argsDisplay || $[110] !== argsText_2) {
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
    $[109] = argsDisplay;
    $[110] = argsText_2;
    $[111] = argsBox;
  } else argsBox = $[111];
  let bodyBox;
  if ($[112] !== innerBox || $[113] !== descriptionBox || $[114] !== bodyContent || $[115] !== argsBox) {
    bodyBox = jsxProd_default_2(innerBox, {
      flexDirection: flexDirection_2,
      paddingX,
      marginBottom,
      overflow,
      children: [descriptionBox, bodyContent, argsBox],
    });
    $[112] = innerBox;
    $[113] = descriptionBox;
    $[114] = bodyContent;
    $[115] = argsBox;
    $[116] = bodyBox;
  } else bodyBox = $[116];
  let ruleExplanation_2;
  if ($[117] !== hideIndexes || $[118] !== payload.permissionResult) {
    ruleExplanation_2 =
      hideIndexes &&
      jsxProd_default(PermissionRuleExplanation, {
        permissionResult: payload.permissionResult,
        toolType: "tool",
        rowBudget: MAX_EXPLANATION_LINES,
      });
    $[117] = hideIndexes;
    $[118] = payload.permissionResult;
    $[119] = ruleExplanation_2;
  } else ruleExplanation_2 = $[119];
  let fallbackNotice;
  if ($[120] !== payload.permissionResult) {
    fallbackNotice =
      payload.permissionResult.denialLimitFallback === undefined &&
      payload.permissionResult.autoDenyWindow !== undefined &&
      jsxProd_default(DenialLimitFallbackNotice, {
        permissionResult: payload.permissionResult,
      });
    $[120] = payload.permissionResult;
    $[121] = fallbackNotice;
  } else fallbackNotice = $[121];
  let question;
  if ($[122] === MEMO_CACHE_SENTINEL) {
    question = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        color: "warning",
        children: DYNAMIC_WORKFLOW_USAGE_WARNING,
      }),
    });
    $[122] = question;
  } else question = $[122];
  let prompt;
  if (
    $[123] !== onCancel_2 ||
    $[124] !== onSelect_2 ||
    $[125] !== hideIndexes ||
    $[126] !== options ||
    $[127] !== payload.requestSource ||
    $[128] !== toolAnalyticsContext
  ) {
    prompt = jsxProd_default(permissionChoicePrompt, {
      options,
      hideIndexes,
      onSelect: onSelect_2,
      onCancel: onCancel_2,
      requestSource: payload.requestSource,
      question,
      toolAnalyticsContext,
    });
    $[123] = onCancel_2;
    $[124] = onSelect_2;
    $[125] = hideIndexes;
    $[126] = options;
    $[127] = payload.requestSource;
    $[128] = toolAnalyticsContext;
    $[129] = prompt;
  } else prompt = $[129];
  let editHint;
  if ($[130] === MEMO_CACHE_SENTINEL) {
    editHint = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(KeyboardShortcutHint, {
        chord: "ctrl+g",
        action: "edit script in $EDITOR",
      }),
    });
    $[130] = editHint;
  } else editHint = $[130];
  let promptBox;
  if ($[131] !== ruleExplanation_2 || $[132] !== fallbackNotice || $[133] !== prompt) {
    promptBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [ruleExplanation_2, fallbackNotice, prompt, editHint],
    });
    $[131] = ruleExplanation_2;
    $[132] = fallbackNotice;
    $[133] = prompt;
    $[134] = promptBox;
  } else promptBox = $[134];
  let children;
  if (
    $[135] !== outerBox ||
    $[136] !== onKeyDown_2 ||
    $[137] !== fallbackExplanation ||
    $[138] !== bodyBox ||
    $[139] !== promptBox
  ) {
    children = jsxProd_default_2(outerBox, {
      flexDirection,
      marginTop,
      tabIndex,
      autoFocus,
      onKeyDown: onKeyDown_2,
      children: [fallbackExplanation, bodyBox, promptBox],
    });
    $[135] = outerBox;
    $[136] = onKeyDown_2;
    $[137] = fallbackExplanation;
    $[138] = bodyBox;
    $[139] = promptBox;
    $[140] = children;
  } else children = $[140];
  let dialog;
  if ($[141] !== DialogComponent || $[142] !== payload.requestSource || $[143] !== children) {
    dialog = jsxProd_default(DialogComponent, {
      color,
      title,
      requestSource,
      children,
    });
    $[141] = DialogComponent;
    $[142] = payload.requestSource;
    $[143] = children;
    $[144] = dialog;
  } else dialog = $[144];
  return dialog;
}
export { WorkflowPermissionDialog };
