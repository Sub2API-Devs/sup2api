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
import { init_react_production, Kc, y } from "../../../vendor/react/cjs/react.production.js";
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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
    let i = 0;
    let R = pos;
    while (R < min) {
      let g = source[R];
      if (g === "(" || g === "[" || g === "{") i++;
      else if (g === ")" || g === "]" || g === "}") {
        if (i === 0) break;
        i--;
      } else if (g === "," && i === 0) break;
      else if (g === '"' || g === "'" || g === "`") {
        R++;
        while (R < min && source[R] !== g) {
          if (source[R] === "\\") R++;
          R++;
        }
      }
      R++;
    }
    return truncate(source.slice(pos, R).trim(), DECIDE_DELAY_MS);
  }
  pos++;
  let chars = [];
  while (pos < source.length) {
    let f = source[pos];
    if (f === "\\") {
      chars.push(source[pos + 1] ?? "");
      pos += 2;
      continue;
    }
    if (f === quote) break;
    if (quote === "`" && f === "$" && source[pos + 1] === "{") {
      chars.push("${\u2026}");
      let i = 1;
      pos += 2;
      while (pos < source.length && i > 0) {
        if (source[pos] === "{") i++;
        if (source[pos] === "}") i--;
        pos++;
      }
      continue;
    }
    chars.push(f);
    pos++;
  }
  let trimmed = chars.join("").replace(/\s+/g, " ").trim();
  return truncate(trimmed, DECIDE_DELAY_MS);
}
//@ chunk-sycr1qkz.js:15383-15608 placement
function extractParenthesized(t, o, l) {
  if (t[o] !== "(") return;
  let min = Math.min(t.length, o + PERMISSION_TIMEOUT_MS);
  let a = 0;
  let c = o;
  while (c < min) {
    let f = t[c];
    if (f === "(") a++;
    else if (f === ")") {
      a--;
      if (a === 0) return t.slice(o + 1, c);
    } else if (l && f === ";" && a === 1) return t.slice(o + 1, c);
    c++;
  }
  return;
}
//@ chunk-sycr1qkz.js:15608-15892 placement
function findStatementEnd(t, o, l) {
  let d = 0;
  let a = o;
  while (a < l) {
    let c = t[a];
    if (c === "(" || c === "[" || c === "{") d++;
    else if (c === ")" || c === "]" || c === "}") {
      if (d === 0) return a;
      d--;
    } else if (d === 0 && c === ";") return a + 1;
    else if (
      d === 0 &&
      c ===
        `
`
    ) {
      let f = a + 1;
      while (f < l && /\s/.test(t[f] ?? "")) f++;
      if (t[f] !== "{") return a + 1;
    }
    a++;
  }
  return -1;
}
//@ chunk-sycr1qkz.js:15892-15945 placement
function hasIdentifierChar(t) {
  return t != null && /[A-Za-z0-9_]/.test(t);
}
//@ chunk-sycr1qkz.js:15945-17744 placement
function summarizeWorkflowScript(source) {
  try {
    let o = [];
    let l = 0;
    let d = 0;
    let a = false;
    let c;
    let f = -1;
    let i = [];
    let R = [];
    let g = source.length;
    let p = 0;
    while (p < g) {
      if (f >= 0 && p >= f) {
        a = false;
        c = undefined;
        f = -1;
      }
      let m = source[p];
      if (m === "/" && source[p + 1] === "/")
        while (
          p < g &&
          source[p] !==
            `
`
        )
          p++;
      else if (m === "/" && source[p + 1] === "*") {
        p += 2;
        while (p < g && !(source[p] === "*" && source[p + 1] === "/")) p++;
        p++;
      } else if (m === '"' || m === "'" || m === "`") {
        p++;
        while (p < g && source[p] !== m) {
          if (source[p] === "\\") p++;
          p++;
        }
      } else if (m === "{") {
        l++;
        if (a && d === 0) {
          i.push({
            braceDepth: l,
            cond: c,
          });
          a = false;
          c = undefined;
          f = -1;
        }
      } else if (m === "}") {
        let last = i.at(-1);
        if (last && last.braceDepth === l) i.pop();
        l--;
      } else if (m === "(") d++;
      else if (m === ")") {
        let last = R.at(-1);
        if (last !== undefined && last === d) R.pop();
        d--;
        if (a && d === 0 && f < 0) {
          let b = p + 1;
          let min = Math.min(g, b + PERMISSION_TIMEOUT_MS);
          while (b < min && /\s/.test(source[b] ?? "")) b++;
          if (source[b] !== "{") {
            let statementEnd = findStatementEnd(source, b, Math.min(g, b + PERMISSION_TIMEOUT_MS));
            if (statementEnd >= 0) f = statementEnd;
          }
        }
      } else if (
        m === "w" &&
        source.startsWith("while", p) &&
        d === 0 &&
        !hasIdentifierChar(source[p - 1]) &&
        !hasIdentifierChar(source[p + 5])
      ) {
        let index = source.indexOf("(", p);
        if (index === -1 || index - p > PERMISSION_TIMEOUT_MS) {
          p++;
          continue;
        }
        a = true;
        f = -1;
        c = extractParenthesized(source, index, false);
      } else if (
        m === "f" &&
        source.startsWith("for", p) &&
        d === 0 &&
        !hasIdentifierChar(source[p - 1]) &&
        !hasIdentifierChar(source[p + 3])
      ) {
        let index = source.indexOf("(", p);
        if (index === -1 || index - p > PERMISSION_TIMEOUT_MS) {
          p++;
          continue;
        }
        a = true;
        f = -1;
        c = extractParenthesized(source, index, true);
      } else if (m === "p" && source.startsWith("parallel(", p) && !hasIdentifierChar(source[p - 1])) {
        R.push(d + 1);
        p += 7;
      } else if (m === "a" && source.startsWith("agent", p) && !hasIdentifierChar(source[p - 1])) {
        let u = p + 5;
        while (u < g && /\s/.test(source[u] ?? "")) u++;
        if (source[u] === "(") {
          let b = R.length > 0 ? "parallel" : a || i.length > 0 ? "loop" : "sequential";
          let C = a ? c : i.at(-1)?.cond;
          let annotation = b === "loop" ? C?.trim().slice(0, 40) : b === "parallel" ? "\xD7 N" : undefined;
          o.push({
            prompt: extractCallArgumentPreview(source, u + 1),
            kind: b,
            annotation,
          });
        }
      }
      p++;
    }
    if (o.length === 0) return null;
    let P = [];
    for (let m of o) {
      let last = P.at(-1);
      if (last && last.kind === m.kind && last.annotation === m.annotation)
        last.agents.push({
          prompt: m.prompt,
        });
      else
        P.push({
          kind: m.kind,
          agents: [
            {
              prompt: m.prompt,
            },
          ],
          annotation: m.annotation,
        });
    }
    let estimatedAgents = 0;
    for (let m of P) {
      let u = m.agents.length;
      estimatedAgents += m.kind === "sequential" ? u : u * 3;
    }
    return {
      phases: P,
      estimatedAgents,
      hasReturn: /\breturn\b/.test(source),
    };
  } catch {
    return null;
  }
}
//@ chunk-sycr1qkz.js:17744-17779 placement
function rawText(co) {
  return displayField(co).text;
}
//@ chunk-sycr1qkz.js:17779-17805 placement
function isFalsy(mo) {
  return !mo;
}
//@ chunk-sycr1qkz.js:17805-17878 placement
function quotedPreview(Qe) {
  return `\xB7 "${stripNonPrintable(Qe.length > 60 ? truncateToLength(Qe, 59) + "\u2026" : Qe)}"`;
}
//@ chunk-sycr1qkz.js:17878-18180 placement
/**
 * 渲染工作流权限对话框中的一个步骤行：序号、标题与灰色详情，下方列出最多两个提示词，超出时显示 +N more。
 */
function renderWorkflowStepRow(L, Nt) {
  return jsxProd_default_2(
    Kc,
    {
      children: [
        jsxProd_default_2(Text, {
          children: [
            "  ",
            Nt + 1,
            ". ",
            L.title,
            L.detail
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \u2014 ", L.detail],
                })
              : "",
          ],
        }),
        L.prompts.length > 0 &&
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              "     ",
              L.prompts.slice(0, 2).map(quotedPreview).join("  "),
              L.prompts.length > 2 ? `  +${L.prompts.length - 2} more` : "",
            ],
          }),
      ],
    },
    Nt,
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
function workflowChoiceToResult(t, payload, script, d, a) {
  switch (t) {
    case "yes":
      return {
        behavior: "allow",
        updatedInput: {
          ...payload.input,
          script,
        },
        ...(a && {
          feedback: a,
        }),
      };
    case "yes-always": {
      if (d === null || !isConsentRow(d))
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
        permissionUpdates: d.applies,
      };
    }
    case "no":
      return {
        behavior: "deny",
        ...(a && {
          feedback: a,
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
      renderLabel: (l) => {
        let d = l.length === 1 ? l[0] : undefined;
        if (
          d === undefined ||
          d.type !== "addRules" ||
          d.rules.length !== 1 ||
          d.rules[0]?.toolName !== WORKFLOW_TOOL_NAME ||
          d.rules[0]?.ruleContent !== workflowName
        )
          return null;
        let a = plainDisplay(d.rules[0].ruleContent);
        if (a === null) return null;
        return jsxProd_default_2(Text, {
          children: [
            "Yes, and don't ask again for ",
            jsxProd_default(Text, {
              bold: true,
              children: a.display,
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
  let i = w(132);
  let { payload, answer, wouldTakeAnswer } = props;
  let [script, setScript] = y(payload.script);
  let f = script.length > MAX_WORKFLOW_SCRIPT_DISPLAY || payload.scriptForged;
  let R;
  if (i[0] !== script || i[1] !== f) {
    R = f ? "" : stripUnsafeChars(script);
    i[0] = script;
    i[1] = f;
    i[2] = R;
  } else R = i[2];
  let code = R;
  let p;
  if (i[3] !== script || i[4] !== f) {
    p = f || hasSuspiciousText(script);
    i[3] = script;
    i[4] = f;
    i[5] = p;
  } else p = i[5];
  let P = p;
  let Y;
  m: {
    if (P) {
      Y = null;
      break m;
    }
    let u;
    if (i[6] !== script) {
      u = parseWorkflowScript(script);
      i[6] = script;
      i[7] = u;
    } else u = i[7];
    let b = u;
    Y = "error" in b ? null : b;
  }
  let C = Y;
  let N = P ? "" : (C?.scriptBody ?? script);
  let u;
  if (i[8] !== N) {
    u = summarizeWorkflowScript(N);
    i[8] = N;
    i[9] = u;
  } else u = i[9];
  let M = u;
  let H;
  if (i[10] !== M || i[11] !== C?.meta.phases) {
    Xo: {
      let ao = rawText;
      let re = (io) => replaceLineBreaks(ao(io)).replace(/\s+/g, " ").trim();
      let bt = (lo) => {
        let kt = new Set();
        let Rt = [];
        for (const pe of lo?.agents ?? []) {
          if (pe.prompt && !kt.has(pe.prompt)) {
            kt.add(pe.prompt);
            Rt.push(re(pe.prompt));
          }
        }
        return Rt;
      };
      let Wt = (de) => ({
        title: re(WORKFLOW_STEP_KIND_LABELS[de.kind] + (de.annotation ? ` ${de.annotation}` : "")),
        prompts: bt(de),
      });
      let phases = C?.meta.phases;
      if (phases && phases.length > 0) {
        let mapped = phases.map((phase, ro) => ({
          title: re(phase.title),
          detail: phase.detail !== undefined ? re(phase.detail) : undefined,
          prompts: bt(M?.phases[ro]),
        }));
        let J;
        if (i[13] !== M?.phases) {
          J = M?.phases ?? [];
          i[13] = M?.phases;
          i[14] = J;
        } else J = i[14];
        let mapped_2 = J.slice(phases.length).map(Wt);
        H = [...mapped, ...mapped_2];
        break Xo;
      }
      if (M && M.phases.length > 0) {
        H = M.phases.map(Wt);
        break Xo;
      }
      H = null;
    }
    i[10] = M;
    i[11] = C?.meta.phases;
    i[12] = H;
  } else H = i[12];
  let T = H;
  let [F, Ct] = y(T === null);
  let J;
  if (i[15] !== script || i[16] !== wouldTakeAnswer) {
    J = function fe(event) {
      if (event.ctrl && event.key === "g") {
        event.preventDefault();
        if (!wouldTakeAnswer()) {
          return;
        }
        let St = editPromptInEditor(script);
        let Ge = St.content === null ? null : normalizeCrLf(St.content);
        if (Ge !== null && Ge !== script) {
          setScript(Ge);
          Ct(false);
        }
      }
    };
    i[15] = script;
    i[16] = wouldTakeAnswer;
    i[17] = J;
  } else J = i[17];
  let fe = J;
  let Dt;
  if (i[18] !== payload.args) {
    Dt =
      payload.args === undefined
        ? undefined
        : serializeApprovalPayload(payload.args, {
            scrub: "key",
            maxUnits: MAX_PAYLOAD_UNITS,
          });
    i[18] = payload.args;
    i[19] = Dt;
  } else Dt = i[19];
  let D = Dt;
  let ce = D === undefined ? undefined : D.kind === "full" ? D.text : D.marker;
  let vt;
  if (i[20] !== D?.kind || i[21] !== payload || i[22] !== P) {
    vt =
      shouldOfferAlwaysAllow(payload) && D?.kind !== "withheld" && !P
        ? workflowPermissionOptions(payload)
        : null;
    i[20] = D?.kind;
    i[21] = payload;
    i[22] = P;
    i[23] = vt;
  } else vt = i[23];
  let v = vt;
  let xt;
  if (
    i[24] !== v ||
    i[25] !== answer ||
    i[26] !== payload ||
    i[27] !== script ||
    i[28] !== P ||
    i[29] !== wouldTakeAnswer
  ) {
    xt = (Ue, fo) => {
      if (Ue === "toggle") {
        if (!wouldTakeAnswer()) {
          return false;
        }
        Ct(isFalsy);
        return;
      }
      if (Ue !== "no" && P) {
        return false;
      }
      return answer(workflowChoiceToResult(Ue, payload, script, v, fo));
    };
    i[24] = v;
    i[25] = answer;
    i[26] = payload;
    i[27] = script;
    i[28] = P;
    i[29] = wouldTakeAnswer;
    i[30] = xt;
  } else xt = i[30];
  let onSelect = xt;
  let Ot;
  if (i[31] !== answer) {
    Ot = () =>
      answer({
        behavior: "deny",
      });
    i[31] = answer;
    i[32] = Ot;
  } else Ot = i[32];
  let onCancel = Ot;
  let me;
  let he;
  let we;
  let x;
  let options;
  let flexDirection;
  let paddingX;
  let marginBottom;
  let overflow;
  let be;
  let flexDirection_2;
  let marginTop;
  let tabIndex;
  let autoFocus;
  let onKeyDown;
  let ee;
  let color;
  let title;
  let requestSource;
  let toolAnalyticsContext;
  if (
    i[33] !== v ||
    i[34] !== T ||
    i[35] !== fe ||
    i[36] !== C ||
    i[37] !== payload ||
    i[38] !== P ||
    i[39] !== F
  ) {
    let text = C?.meta.description !== undefined ? displayField(C.meta.description).text : undefined;
    x = payload.permissionResult.inPlaceOfClassifier === true;
    let _;
    if (i[60] === MEMO_CACHE_SENTINEL) {
      _ = {
        label: "No",
        value: "no",
        feedbackConfig: {
          type: "reject",
        },
      };
      i[60] = _;
    } else _ = i[60];
    let Tt = _;
    let X;
    if (i[61] !== v || i[62] !== T || i[63] !== x || i[64] !== P || i[65] !== F) {
      X = x ? [Tt] : [];
      if (!P) {
        let k;
        if (i[67] === MEMO_CACHE_SENTINEL) {
          k = {
            label: "Yes, run it",
            value: "yes",
            feedbackConfig: {
              type: "accept",
            },
          };
          i[67] = k;
        } else k = i[67];
        X.push(k);
      }
      if (v !== null) {
        let k;
        if (i[68] !== v.node) {
          k = {
            label: v.node,
            value: "yes-always",
          };
          i[68] = v.node;
          i[69] = k;
        } else k = i[69];
        X.push(k);
      }
      if (T && !P) {
        const label = F ? "View workflow summary" : "View raw script";
        let A;
        if (i[70] !== label) {
          A = {
            label,
            value: "toggle",
          };
          i[70] = label;
          i[71] = A;
        } else A = i[71];
        X.push(A);
      }
      if (!x) X.push(Tt);
      i[61] = v;
      i[62] = T;
      i[63] = x;
      i[64] = P;
      i[65] = F;
      i[66] = X;
    } else X = i[66];
    options = X;
    let toolName;
    if (i[72] !== payload.toolName) {
      toolName = sanitizeToolNameForAnalytics(payload.toolName);
      i[72] = payload.toolName;
      i[73] = toolName;
    } else toolName = i[73];
    let A;
    if (i[74] !== payload.isMcp || i[75] !== toolName) {
      A = {
        toolName,
        isMcp: payload.isMcp,
      };
      i[74] = payload.isMcp;
      i[75] = toolName;
      i[76] = A;
    } else A = i[76];
    toolAnalyticsContext = A;
    we = PermissionDialog_2;
    color = "permission";
    title = "Run a dynamic workflow?";
    requestSource = payload.requestSource;
    he = Box;
    flexDirection_2 = "column";
    marginTop = 1;
    tabIndex = 0;
    autoFocus = true;
    onKeyDown = fe;
    if (i[77] !== payload.permissionResult) {
      ee =
        payload.permissionResult.denialLimitFallback !== undefined &&
        jsxProd_default(PermissionRuleExplanation, {
          permissionResult: payload.permissionResult,
          toolType: "tool",
        });
      i[77] = payload.permissionResult;
      i[78] = ee;
    } else ee = i[78];
    me = Box;
    flexDirection = "column";
    paddingX = 1;
    marginBottom = 1;
    overflow = "hidden";
    be =
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
    i[33] = v;
    i[34] = T;
    i[35] = fe;
    i[36] = C;
    i[37] = payload;
    i[38] = P;
    i[39] = F;
    i[40] = me;
    i[41] = he;
    i[42] = we;
    i[43] = x;
    i[44] = options;
    i[45] = flexDirection;
    i[46] = paddingX;
    i[47] = marginBottom;
    i[48] = overflow;
    i[49] = be;
    i[50] = flexDirection_2;
    i[51] = marginTop;
    i[52] = tabIndex;
    i[53] = autoFocus;
    i[54] = onKeyDown;
    i[55] = ee;
    i[56] = color;
    i[57] = title;
    i[58] = requestSource;
    i[59] = toolAnalyticsContext;
  } else {
    me = i[40];
    he = i[41];
    we = i[42];
    x = i[43];
    options = i[44];
    flexDirection = i[45];
    paddingX = i[46];
    marginBottom = i[47];
    overflow = i[48];
    be = i[49];
    flexDirection_2 = i[50];
    marginTop = i[51];
    tabIndex = i[52];
    autoFocus = i[53];
    onKeyDown = i[54];
    ee = i[55];
    color = i[56];
    title = i[57];
    requestSource = i[58];
    toolAnalyticsContext = i[59];
  }
  let _;
  if (
    i[79] !== T ||
    i[80] !== payload.scriptForged ||
    i[81] !== code ||
    i[82] !== script.length ||
    i[83] !== P ||
    i[84] !== F
  ) {
    _ = P
      ? jsxProd_default(Box, {
          marginBottom: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: payload.scriptForged
              ? "(the workflow script could not be read from this request \u2014 approval is unavailable; deny or send feedback)"
              : `(script of ${script.length.toLocaleString()} characters cannot be shown in full \u2014 approval is unavailable; deny or send feedback)`,
          }),
        })
      : F || !T
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
              T.map(renderWorkflowStepRow),
            ],
          });
    i[79] = T;
    i[80] = payload.scriptForged;
    i[81] = code;
    i[82] = script.length;
    i[83] = P;
    i[84] = F;
    i[85] = _;
  } else _ = i[85];
  let k;
  if (i[86] !== ce || i[87] !== D) {
    k =
      ce &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default(Blockquote, {
          multiline: D?.kind === "full" && D.needsGutter,
          children: jsxProd_default_2(Text, {
            children: [
              jsxProd_default_2(Text, {
                bold: true,
                dimColor: true,
                children: ["args:", " "],
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children: ce,
              }),
            ],
          }),
        }),
      });
    i[86] = ce;
    i[87] = D;
    i[88] = k;
  } else k = i[88];
  let A;
  if (
    i[89] !== me ||
    i[90] !== flexDirection ||
    i[91] !== paddingX ||
    i[92] !== marginBottom ||
    i[93] !== overflow ||
    i[94] !== be ||
    i[95] !== _ ||
    i[96] !== k
  ) {
    A = jsxProd_default_2(me, {
      flexDirection,
      paddingX,
      marginBottom,
      overflow,
      children: [be, _, k],
    });
    i[89] = me;
    i[90] = flexDirection;
    i[91] = paddingX;
    i[92] = marginBottom;
    i[93] = overflow;
    i[94] = be;
    i[95] = _;
    i[96] = k;
    i[97] = A;
  } else A = i[97];
  let Be;
  if (i[98] !== x || i[99] !== payload.permissionResult) {
    Be =
      x &&
      jsxProd_default(PermissionRuleExplanation, {
        permissionResult: payload.permissionResult,
        toolType: "tool",
        rowBudget: MAX_EXPLANATION_LINES,
      });
    i[98] = x;
    i[99] = payload.permissionResult;
    i[100] = Be;
  } else Be = i[100];
  let Ne;
  if (i[101] !== payload.permissionResult) {
    Ne =
      payload.permissionResult.denialLimitFallback === undefined &&
      payload.permissionResult.autoDenyWindow !== undefined &&
      jsxProd_default(DenialLimitFallbackNotice, {
        permissionResult: payload.permissionResult,
      });
    i[101] = payload.permissionResult;
    i[102] = Ne;
  } else Ne = i[102];
  let question;
  if (i[103] === MEMO_CACHE_SENTINEL) {
    question = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        color: "warning",
        children: DYNAMIC_WORKFLOW_USAGE_WARNING,
      }),
    });
    i[103] = question;
  } else question = i[103];
  let qe;
  if (
    i[104] !== onCancel ||
    i[105] !== onSelect ||
    i[106] !== x ||
    i[107] !== options ||
    i[108] !== payload.requestSource ||
    i[109] !== toolAnalyticsContext
  ) {
    qe = jsxProd_default(PermissionPrompt, {
      options,
      hideIndexes: x,
      onSelect,
      onCancel,
      requestSource: payload.requestSource,
      question,
      toolAnalyticsContext,
    });
    i[104] = onCancel;
    i[105] = onSelect;
    i[106] = x;
    i[107] = options;
    i[108] = payload.requestSource;
    i[109] = toolAnalyticsContext;
    i[110] = qe;
  } else qe = i[110];
  let Mt;
  if (i[111] === MEMO_CACHE_SENTINEL) {
    Mt = jsxProd_default(Text, {
      dimColor: true,
      children: jsxProd_default(KeyboardShortcutHint, {
        chord: "ctrl+g",
        action: "edit script in $EDITOR",
      }),
    });
    i[111] = Mt;
  } else Mt = i[111];
  let Fe;
  if (i[112] !== Be || i[113] !== Ne || i[114] !== qe) {
    Fe = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingX: 1,
      children: [Be, Ne, qe, Mt],
    });
    i[112] = Be;
    i[113] = Ne;
    i[114] = qe;
    i[115] = Fe;
  } else Fe = i[115];
  let children;
  if (
    i[116] !== he ||
    i[117] !== flexDirection_2 ||
    i[118] !== marginTop ||
    i[119] !== tabIndex ||
    i[120] !== autoFocus ||
    i[121] !== onKeyDown ||
    i[122] !== ee ||
    i[123] !== A ||
    i[124] !== Fe
  ) {
    children = jsxProd_default_2(he, {
      flexDirection: flexDirection_2,
      marginTop,
      tabIndex,
      autoFocus,
      onKeyDown,
      children: [ee, A, Fe],
    });
    i[116] = he;
    i[117] = flexDirection_2;
    i[118] = marginTop;
    i[119] = tabIndex;
    i[120] = autoFocus;
    i[121] = onKeyDown;
    i[122] = ee;
    i[123] = A;
    i[124] = Fe;
    i[125] = children;
  } else children = i[125];
  let Bt;
  if (
    i[126] !== we ||
    i[127] !== color ||
    i[128] !== title ||
    i[129] !== requestSource ||
    i[130] !== children
  ) {
    Bt = jsxProd_default(we, {
      color,
      title,
      requestSource,
      children,
    });
    i[126] = we;
    i[127] = color;
    i[128] = title;
    i[129] = requestSource;
    i[130] = children;
    i[131] = Bt;
  } else Bt = i[131];
  return Bt;
}
