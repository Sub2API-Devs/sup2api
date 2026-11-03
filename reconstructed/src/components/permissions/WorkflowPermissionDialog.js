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
import { j, Kc, y } from "../../../vendor/react/cjs/react.production.js";
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
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { isConsentRow, parseConsentSuggestions } from "./consentRows.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import { hr } from "../../utils/invisibleChars.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { parseWorkflowScript } from "../../services/workflows/workflowScriptMeta.js";
import { editPromptInEditor } from "../../utils/promptEditor.js";
import { wPe } from "../../services/workflow/scriptFile.js";
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
j();
//@ chunk-sycr1qkz.js:14643-14647 placement
j();
//@ chunk-sycr1qkz.js:14647-14665 placement
var et = 100,
  E = 5000;
/**
 * 从脚本源码的某位置提取一个调用参数的预览：字符串字面量取内容（模板插值换成 ${…}，折叠空白），否则扫描到同层逗号/右括号为止，结果截断。
 */
//@ chunk-sycr1qkz.js:14665-15383 placement
function extractCallArgumentPreview(source, start) {
  let pos = start;
  while (pos < source.length && /\s/.test(source[pos])) pos++;
  let quote = source[pos];
  if (quote !== '"' && quote !== "'" && quote !== "`") {
    let min = Math.min(source.length, pos + E),
      i = 0,
      R = pos;
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
    return truncate(source.slice(pos, R).trim(), et);
  }
  pos++;
  let chars = [];
  while (pos < source.length) {
    let f = source[pos];
    if (f === "\\") {
      (chars.push(source[pos + 1] ?? ""), (pos += 2));
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
    (chars.push(f), pos++);
  }
  let trimmed = chars.join("").replace(/\s+/g, " ").trim();
  return truncate(trimmed, et);
}
//@ chunk-sycr1qkz.js:15383-15608 placement
function extractParenthesized(t, o, l) {
  if (t[o] !== "(") return;
  let min = Math.min(t.length, o + E),
    a = 0,
    c = o;
  while (c < min) {
    let f = t[c];
    if (f === "(") a++;
    else if (f === ")") {
      if ((a--, a === 0)) return t.slice(o + 1, c);
    } else if (l && f === ";" && a === 1) return t.slice(o + 1, c);
    c++;
  }
  return;
}
//@ chunk-sycr1qkz.js:15608-15892 placement
function findStatementEnd(t, o, l) {
  let d = 0,
    a = o;
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
function V(t) {
  return t != null && /[A-Za-z0-9_]/.test(t);
}
//@ chunk-sycr1qkz.js:15945-17744 placement
function summarizeWorkflowScript(t) {
  try {
    let o = [],
      l = 0,
      d = 0,
      a = !1,
      c,
      f = -1,
      i = [],
      R = [],
      g = t.length,
      p = 0;
    while (p < g) {
      if (f >= 0 && p >= f) ((a = !1), (c = void 0), (f = -1));
      let m = t[p];
      if (m === "/" && t[p + 1] === "/")
        while (
          p < g &&
          t[p] !==
            `
`
        )
          p++;
      else if (m === "/" && t[p + 1] === "*") {
        p += 2;
        while (p < g && !(t[p] === "*" && t[p + 1] === "/")) p++;
        p++;
      } else if (m === '"' || m === "'" || m === "`") {
        p++;
        while (p < g && t[p] !== m) {
          if (t[p] === "\\") p++;
          p++;
        }
      } else if (m === "{") {
        if ((l++, a && d === 0)) (i.push({ braceDepth: l, cond: c }), (a = !1), (c = void 0), (f = -1));
      } else if (m === "}") {
        let at = i.at(-1);
        if (at && at.braceDepth === l) i.pop();
        l--;
      } else if (m === "(") d++;
      else if (m === ")") {
        let at = R.at(-1);
        if (at !== void 0 && at === d) R.pop();
        if ((d--, a && d === 0 && f < 0)) {
          let b = p + 1,
            min = Math.min(g, b + E);
          while (b < min && /\s/.test(t[b] ?? "")) b++;
          if (t[b] !== "{") {
            let N = findStatementEnd(t, b, Math.min(g, b + E));
            if (N >= 0) f = N;
          }
        }
      } else if (m === "w" && t.startsWith("while", p) && d === 0 && !V(t[p - 1]) && !V(t[p + 5])) {
        let index = t.indexOf("(", p);
        if (index === -1 || index - p > E) {
          p++;
          continue;
        }
        ((a = !0), (f = -1), (c = extractParenthesized(t, index, !1)));
      } else if (m === "f" && t.startsWith("for", p) && d === 0 && !V(t[p - 1]) && !V(t[p + 3])) {
        let index = t.indexOf("(", p);
        if (index === -1 || index - p > E) {
          p++;
          continue;
        }
        ((a = !0), (f = -1), (c = extractParenthesized(t, index, !0)));
      } else if (m === "p" && t.startsWith("parallel(", p) && !V(t[p - 1])) (R.push(d + 1), (p += 7));
      else if (m === "a" && t.startsWith("agent", p) && !V(t[p - 1])) {
        let u = p + 5;
        while (u < g && /\s/.test(t[u] ?? "")) u++;
        if (t[u] === "(") {
          let b = R.length > 0 ? "parallel" : a || i.length > 0 ? "loop" : "sequential",
            C = a ? c : i.at(-1)?.cond,
            N = b === "loop" ? C?.trim().slice(0, 40) : b === "parallel" ? "\xD7 N" : void 0;
          o.push({ prompt: extractCallArgumentPreview(t, u + 1), kind: b, annotation: N });
        }
      }
      p++;
    }
    if (o.length === 0) return null;
    let P = [];
    for (let m of o) {
      let at = P.at(-1);
      if (at && at.kind === m.kind && at.annotation === m.annotation) at.agents.push({ prompt: m.prompt });
      else P.push({ kind: m.kind, agents: [{ prompt: m.prompt }], annotation: m.annotation });
    }
    let Y = 0;
    for (let m of P) {
      let u = m.agents.length;
      Y += m.kind === "sequential" ? u : u * 3;
    }
    return { phases: P, estimatedAgents: Y, hasReturn: /\breturn\b/.test(t) };
  } catch {
    return null;
  }
}
//@ chunk-sycr1qkz.js:17744-17779 placement
function to(co) {
  return displayField(co).text;
}
//@ chunk-sycr1qkz.js:17779-17805 placement
function oo(mo) {
  return !mo;
}
//@ chunk-sycr1qkz.js:17805-17878 placement
function so(Qe) {
  return `\xB7 "${stripNonPrintable(Qe.length > 60 ? truncateToLength(Qe, 59) + "\u2026" : Qe)}"`;
}
/**
 * 渲染工作流权限对话框中的一个步骤行：序号、标题与灰色详情，下方列出最多两个提示词，超出时显示 +N more。
 */
//@ chunk-sycr1qkz.js:17878-18180 placement
function renderWorkflowStepRow(L, Nt) {
  return r(
    Kc,
    {
      children: [
        r(Text, {
          children: [
            "  ",
            Nt + 1,
            ". ",
            L.title,
            L.detail ? r(Text, { dimColor: !0, children: [" \u2014 ", L.detail] }) : "",
          ],
        }),
        L.prompts.length > 0 &&
          r(Text, {
            dimColor: !0,
            children: [
              "     ",
              L.prompts.slice(0, 2).map(so).join("  "),
              L.prompts.length > 2 ? `  +${L.prompts.length - 2} more` : "",
            ],
          }),
      ],
    },
    Nt,
  );
}
/**
 * 工作流对话框常量：脚本显示上限、动态工作流 token 消耗警告文案、步骤类型标签。
 */
//@ chunk-sycr1qkz.js:18180-18488 placement
var MAX_WORKFLOW_SCRIPT_DISPLAY = 200000,
  DYNAMIC_WORKFLOW_USAGE_WARNING =
    "Dynamic workflows can use a lot of tokens quickly by running many " +
    "subagents in parallel \u2014 which counts against your usage limit. Stop a " +
    "running workflow at any time with /workflows, or disable dynamic workflows in /config.",
  WORKFLOW_STEP_KIND_LABELS = { loop: "loop", parallel: "parallel", sequential: "step" };
/**
 * 把工作流权限选项转换为结果（yes / yes-always 带权限更新 / no 带反馈），allow 时把脚本写回 input.script。
 */
//@ chunk-sycr1qkz.js:18488-18849 placement
function workflowChoiceToResult(t, o, l, d, a) {
  switch (t) {
    case "yes":
      return { behavior: "allow", updatedInput: { ...o.input, script: l }, ...(a && { feedback: a }) };
    case "yes-always": {
      if (d === null || !isConsentRow(d))
        return { behavior: "allow", updatedInput: { ...o.input, script: l } };
      return { behavior: "allow", updatedInput: { ...o.input, script: l }, permissionUpdates: d.applies };
    }
    case "no":
      return { behavior: "deny", ...(a && { feedback: a }) };
  }
}
//@ chunk-sycr1qkz.js:18849-18878 placement
var Kt = new Set(["addRules"]);
//@ chunk-sycr1qkz.js:18878-19439 placement
function workflowPermissionOptions(t) {
  let workflowName = t.workflowName;
  if (workflowName === void 0) return null;
  return parseConsentSuggestions(
    [
      {
        type: "addRules",
        rules: [{ toolName: WORKFLOW_TOOL_NAME, ruleContent: workflowName }],
        behavior: "allow",
        destination: "localSettings",
      },
    ],
    {
      displayedTypes: Kt,
      renderLabel: (l) => {
        let d = l.length === 1 ? l[0] : void 0;
        if (
          d === void 0 ||
          d.type !== "addRules" ||
          d.rules.length !== 1 ||
          d.rules[0]?.toolName !== WORKFLOW_TOOL_NAME ||
          d.rules[0]?.ruleContent !== workflowName
        )
          return null;
        let a = plainDisplay(d.rules[0].ruleContent);
        if (a === null) return null;
        return r(Text, {
          children: [
            "Yes, and don't ask again for ",
            e(Text, { bold: !0, children: a.display }),
            " ",
            "in",
            " ",
            e(Text, { bold: !0, children: hr(getOriginalCwd()) }),
          ],
        });
      },
    },
  );
}
/**
 * 工作流脚本权限对话框：展示脚本、允许/本地规则记住
 */
//@ chunk-sycr1qkz.js:19439-26562 placement
function WorkflowPermissionDialog(t) {
  let i = w(132),
    { payload: payload, answer: answer, wouldTakeAnswer: wouldTakeAnswer } = t,
    [a, c] = y(payload.script),
    f = a.length > MAX_WORKFLOW_SCRIPT_DISPLAY || payload.scriptForged,
    R;
  if (i[0] !== a || i[1] !== f) ((R = f ? "" : stripUnsafeChars(a)), (i[0] = a), (i[1] = f), (i[2] = R));
  else R = i[2];
  let g = R,
    p;
  if (i[3] !== a || i[4] !== f) ((p = f || hasSuspiciousText(a)), (i[3] = a), (i[4] = f), (i[5] = p));
  else p = i[5];
  let P = p,
    Y;
  m: {
    if (P) {
      Y = null;
      break m;
    }
    let u;
    if (i[6] !== a) ((u = parseWorkflowScript(a)), (i[6] = a), (i[7] = u));
    else u = i[7];
    let b = u;
    Y = "error" in b ? null : b;
  }
  let C = Y,
    N = P ? "" : (C?.scriptBody ?? a),
    u;
  if (i[8] !== N) ((u = summarizeWorkflowScript(N)), (i[8] = N), (i[9] = u));
  else u = i[9];
  let M = u,
    H;
  if (i[10] !== M || i[11] !== C?.meta.phases) {
    Xo: {
      let ao = to;
      let re = (io) => replaceLineBreaks(ao(io)).replace(/\s+/g, " ").trim();
      let bt = (lo) => {
        let kt = new Set();
        let Rt = [];
        for (const pe of lo?.agents ?? []) {
          if (pe.prompt && !kt.has(pe.prompt)) (kt.add(pe.prompt), Rt.push(re(pe.prompt)));
        }
        return Rt;
      };
      let Wt = (de) => ({
        title: re(WORKFLOW_STEP_KIND_LABELS[de.kind] + (de.annotation ? ` ${de.annotation}` : "")),
        prompts: bt(de),
      });
      let ue = C?.meta.phases;
      if (ue && ue.length > 0) {
        let mapped = ue.map((Xe, ro) => ({
          title: re(Xe.title),
          detail: Xe.detail !== void 0 ? re(Xe.detail) : void 0,
          prompts: bt(M?.phases[ro]),
        }));
        let J;
        if (i[13] !== M?.phases) ((J = M?.phases ?? []), (i[13] = M?.phases), (i[14] = J));
        else J = i[14];
        let mapped_2 = J.slice(ue.length).map(Wt);
        H = [...mapped, ...mapped_2];
        break Xo;
      }
      if (M && M.phases.length > 0) {
        H = M.phases.map(Wt);
        break Xo;
      }
      H = null;
    }
    ((i[10] = M), (i[11] = C?.meta.phases), (i[12] = H));
  } else H = i[12];
  let T = H,
    [F, Ct] = y(T === null),
    J;
  if (i[15] !== a || i[16] !== wouldTakeAnswer)
    ((J = function fe(ze) {
      if (ze.ctrl && ze.key === "g") {
        if ((ze.preventDefault(), !wouldTakeAnswer())) {
          return;
        }
        let St = editPromptInEditor(a);
        let Ge = St.content === null ? null : wPe(St.content);
        if (Ge !== null && Ge !== a) (c(Ge), Ct(!1));
      }
    }),
      (i[15] = a),
      (i[16] = wouldTakeAnswer),
      (i[17] = J));
  else J = i[17];
  let fe = J,
    Dt;
  if (i[18] !== payload.args)
    ((Dt =
      payload.args === void 0
        ? void 0
        : serializeApprovalPayload(payload.args, { scrub: "key", maxUnits: MAX_PAYLOAD_UNITS })),
      (i[18] = payload.args),
      (i[19] = Dt));
  else Dt = i[19];
  let D = Dt,
    ce = D === void 0 ? void 0 : D.kind === "full" ? D.text : D.marker,
    vt;
  if (i[20] !== D?.kind || i[21] !== payload || i[22] !== P)
    ((vt =
      shouldOfferAlwaysAllow(payload) && D?.kind !== "withheld" && !P
        ? workflowPermissionOptions(payload)
        : null),
      (i[20] = D?.kind),
      (i[21] = payload),
      (i[22] = P),
      (i[23] = vt));
  else vt = i[23];
  let v = vt,
    xt;
  if (
    i[24] !== v ||
    i[25] !== answer ||
    i[26] !== payload ||
    i[27] !== a ||
    i[28] !== P ||
    i[29] !== wouldTakeAnswer
  )
    ((xt = (Ue, fo) => {
      if (Ue === "toggle") {
        if (!wouldTakeAnswer()) {
          return !1;
        }
        Ct(oo);
        return;
      }
      if (Ue !== "no" && P) {
        return !1;
      }
      return answer(workflowChoiceToResult(Ue, payload, a, v, fo));
    }),
      (i[24] = v),
      (i[25] = answer),
      (i[26] = payload),
      (i[27] = a),
      (i[28] = P),
      (i[29] = wouldTakeAnswer),
      (i[30] = xt));
  else xt = i[30];
  let Ze = xt,
    Ot;
  if (i[31] !== answer) ((Ot = () => answer({ behavior: "deny" })), (i[31] = answer), (i[32] = Ot));
  else Ot = i[32];
  let He = Ot,
    me,
    he,
    we,
    x,
    ye,
    ge,
    Pe,
    ke,
    Re,
    be,
    We,
    Ce,
    Se,
    De,
    xe,
    ee,
    Oe,
    Te,
    Ae,
    Me;
  if (
    i[33] !== v ||
    i[34] !== T ||
    i[35] !== fe ||
    i[36] !== C ||
    i[37] !== payload ||
    i[38] !== P ||
    i[39] !== F
  ) {
    let Je = C?.meta.description !== void 0 ? displayField(C.meta.description).text : void 0;
    x = payload.permissionResult.inPlaceOfClassifier === !0;
    let _;
    if (i[60] === MEMO_CACHE_SENTINEL)
      ((_ = { label: "No", value: "no", feedbackConfig: { type: "reject" } }), (i[60] = _));
    else _ = i[60];
    let Tt = _;
    let X;
    if (i[61] !== v || i[62] !== T || i[63] !== x || i[64] !== P || i[65] !== F) {
      X = x ? [Tt] : [];
      if (!P) {
        let k;
        if (i[67] === MEMO_CACHE_SENTINEL)
          ((k = { label: "Yes, run it", value: "yes", feedbackConfig: { type: "accept" } }), (i[67] = k));
        else k = i[67];
        X.push(k);
      }
      if (v !== null) {
        let k;
        if (i[68] !== v.node) ((k = { label: v.node, value: "yes-always" }), (i[68] = v.node), (i[69] = k));
        else k = i[69];
        X.push(k);
      }
      if (T && !P) {
        const k = F ? "View workflow summary" : "View raw script";
        let A;
        if (i[70] !== k) ((A = { label: k, value: "toggle" }), (i[70] = k), (i[71] = A));
        else A = i[71];
        X.push(A);
      }
      if (!x) X.push(Tt);
      ((i[61] = v), (i[62] = T), (i[63] = x), (i[64] = P), (i[65] = F), (i[66] = X));
    } else X = i[66];
    ye = X;
    let k;
    if (i[72] !== payload.toolName)
      ((k = sanitizeToolNameForAnalytics(payload.toolName)), (i[72] = payload.toolName), (i[73] = k));
    else k = i[73];
    let A;
    if (i[74] !== payload.isMcp || i[75] !== k)
      ((A = { toolName: k, isMcp: payload.isMcp }), (i[74] = payload.isMcp), (i[75] = k), (i[76] = A));
    else A = i[76];
    Me = A;
    we = PermissionDialog_2;
    Oe = "permission";
    Te = "Run a dynamic workflow?";
    Ae = payload.requestSource;
    he = Box;
    We = "column";
    Ce = 1;
    Se = 0;
    De = !0;
    xe = fe;
    if (i[77] !== payload.permissionResult)
      ((ee =
        payload.permissionResult.denialLimitFallback !== void 0 &&
        e(PermissionRuleExplanation, { permissionResult: payload.permissionResult, toolType: "tool" })),
        (i[77] = payload.permissionResult),
        (i[78] = ee));
    else ee = i[78];
    me = Box;
    ge = "column";
    Pe = 1;
    ke = 1;
    Re = "hidden";
    be =
      Je &&
      e(Box, {
        marginBottom: 1,
        children: e(Blockquote, {
          multiline: needsGutter(Je),
          children: e(Text, { bold: !0, children: Je }),
        }),
      });
    ((i[33] = v),
      (i[34] = T),
      (i[35] = fe),
      (i[36] = C),
      (i[37] = payload),
      (i[38] = P),
      (i[39] = F),
      (i[40] = me),
      (i[41] = he),
      (i[42] = we),
      (i[43] = x),
      (i[44] = ye),
      (i[45] = ge),
      (i[46] = Pe),
      (i[47] = ke),
      (i[48] = Re),
      (i[49] = be),
      (i[50] = We),
      (i[51] = Ce),
      (i[52] = Se),
      (i[53] = De),
      (i[54] = xe),
      (i[55] = ee),
      (i[56] = Oe),
      (i[57] = Te),
      (i[58] = Ae),
      (i[59] = Me));
  } else
    ((me = i[40]),
      (he = i[41]),
      (we = i[42]),
      (x = i[43]),
      (ye = i[44]),
      (ge = i[45]),
      (Pe = i[46]),
      (ke = i[47]),
      (Re = i[48]),
      (be = i[49]),
      (We = i[50]),
      (Ce = i[51]),
      (Se = i[52]),
      (De = i[53]),
      (xe = i[54]),
      (ee = i[55]),
      (Oe = i[56]),
      (Te = i[57]),
      (Ae = i[58]),
      (Me = i[59]));
  let _;
  if (
    i[79] !== T ||
    i[80] !== payload.scriptForged ||
    i[81] !== g ||
    i[82] !== a.length ||
    i[83] !== P ||
    i[84] !== F
  )
    ((_ = P
      ? e(Box, {
          marginBottom: 1,
          children: e(Text, {
            dimColor: !0,
            children: payload.scriptForged
              ? "(the workflow script could not be read from this request \u2014 approval is unavailable; deny or send feedback)"
              : `(script of ${a.length.toLocaleString()} characters cannot be shown in full \u2014 approval is unavailable; deny or send feedback)`,
          }),
        })
      : F || !T
        ? e(DiffFrame, { children: e(HighlightedCode, { code: g, filePath: "workflow.js" }) })
        : r(Box, {
            flexDirection: "column",
            children: [
              e(Text, {
                children:
                  "This dynamic workflow will spin up multiple subagents across the following phases:",
              }),
              T.map(renderWorkflowStepRow),
            ],
          })),
      (i[79] = T),
      (i[80] = payload.scriptForged),
      (i[81] = g),
      (i[82] = a.length),
      (i[83] = P),
      (i[84] = F),
      (i[85] = _));
  else _ = i[85];
  let k;
  if (i[86] !== ce || i[87] !== D)
    ((k =
      ce &&
      e(Box, {
        marginTop: 1,
        children: e(Blockquote, {
          multiline: D?.kind === "full" && D.needsGutter,
          children: r(Text, {
            children: [
              r(Text, { bold: !0, dimColor: !0, children: ["args:", " "] }),
              e(Text, { dimColor: !0, children: ce }),
            ],
          }),
        }),
      })),
      (i[86] = ce),
      (i[87] = D),
      (i[88] = k));
  else k = i[88];
  let A;
  if (
    i[89] !== me ||
    i[90] !== ge ||
    i[91] !== Pe ||
    i[92] !== ke ||
    i[93] !== Re ||
    i[94] !== be ||
    i[95] !== _ ||
    i[96] !== k
  )
    ((A = r(me, { flexDirection: ge, paddingX: Pe, marginBottom: ke, overflow: Re, children: [be, _, k] })),
      (i[89] = me),
      (i[90] = ge),
      (i[91] = Pe),
      (i[92] = ke),
      (i[93] = Re),
      (i[94] = be),
      (i[95] = _),
      (i[96] = k),
      (i[97] = A));
  else A = i[97];
  let Be;
  if (i[98] !== x || i[99] !== payload.permissionResult)
    ((Be =
      x &&
      e(PermissionRuleExplanation, {
        permissionResult: payload.permissionResult,
        toolType: "tool",
        rowBudget: MAX_EXPLANATION_LINES,
      })),
      (i[98] = x),
      (i[99] = payload.permissionResult),
      (i[100] = Be));
  else Be = i[100];
  let Ne;
  if (i[101] !== payload.permissionResult)
    ((Ne =
      payload.permissionResult.denialLimitFallback === void 0 &&
      payload.permissionResult.autoDenyWindow !== void 0 &&
      e(DenialLimitFallbackNotice, { permissionResult: payload.permissionResult })),
      (i[101] = payload.permissionResult),
      (i[102] = Ne));
  else Ne = i[102];
  let At;
  if (i[103] === MEMO_CACHE_SENTINEL)
    ((At = e(Box, {
      marginBottom: 1,
      children: e(Text, { color: "warning", children: DYNAMIC_WORKFLOW_USAGE_WARNING }),
    })),
      (i[103] = At));
  else At = i[103];
  let qe;
  if (
    i[104] !== He ||
    i[105] !== Ze ||
    i[106] !== x ||
    i[107] !== ye ||
    i[108] !== payload.requestSource ||
    i[109] !== Me
  )
    ((qe = e(PermissionPrompt, {
      options: ye,
      hideIndexes: x,
      onSelect: Ze,
      onCancel: He,
      requestSource: payload.requestSource,
      question: At,
      toolAnalyticsContext: Me,
    })),
      (i[104] = He),
      (i[105] = Ze),
      (i[106] = x),
      (i[107] = ye),
      (i[108] = payload.requestSource),
      (i[109] = Me),
      (i[110] = qe));
  else qe = i[110];
  let Mt;
  if (i[111] === MEMO_CACHE_SENTINEL)
    ((Mt = e(Text, {
      dimColor: !0,
      children: e(KeyboardShortcutHint, { chord: "ctrl+g", action: "edit script in $EDITOR" }),
    })),
      (i[111] = Mt));
  else Mt = i[111];
  let Fe;
  if (i[112] !== Be || i[113] !== Ne || i[114] !== qe)
    ((Fe = r(Box, { flexDirection: "column", paddingX: 1, children: [Be, Ne, qe, Mt] })),
      (i[112] = Be),
      (i[113] = Ne),
      (i[114] = qe),
      (i[115] = Fe));
  else Fe = i[115];
  let Ke;
  if (
    i[116] !== he ||
    i[117] !== We ||
    i[118] !== Ce ||
    i[119] !== Se ||
    i[120] !== De ||
    i[121] !== xe ||
    i[122] !== ee ||
    i[123] !== A ||
    i[124] !== Fe
  )
    ((Ke = r(he, {
      flexDirection: We,
      marginTop: Ce,
      tabIndex: Se,
      autoFocus: De,
      onKeyDown: xe,
      children: [ee, A, Fe],
    })),
      (i[116] = he),
      (i[117] = We),
      (i[118] = Ce),
      (i[119] = Se),
      (i[120] = De),
      (i[121] = xe),
      (i[122] = ee),
      (i[123] = A),
      (i[124] = Fe),
      (i[125] = Ke));
  else Ke = i[125];
  let Bt;
  if (i[126] !== we || i[127] !== Oe || i[128] !== Te || i[129] !== Ae || i[130] !== Ke)
    ((Bt = e(we, { color: Oe, title: Te, requestSource: Ae, children: Ke })),
      (i[126] = we),
      (i[127] = Oe),
      (i[128] = Te),
      (i[129] = Ae),
      (i[130] = Ke),
      (i[131] = Bt));
  else Bt = i[131];
  return Bt;
}
