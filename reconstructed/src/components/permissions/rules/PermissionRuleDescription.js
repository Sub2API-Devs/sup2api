/**
 * components/permissions/rules/PermissionRuleDescription.tsx
 *
 * 权限规则的人类可读描述。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/PermissionRuleDescription.tsx
 * pieces: chunk-mjpqa6jt.js (1), chunk-p2qwpk2k.js (2)
 * attribution: placement 2, callgraph-witnessed 1
 */
import { j } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { Text } from "../../../ink/components/Text.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { consentRowLabel } from "../consentRows.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";

//@ chunk-p2qwpk2k.js:20255-20259 placement
j();
//@ chunk-p2qwpk2k.js:21751-22240 callgraph-witnessed = PermissionRuleDescription (0.302)
function PermissionRuleDescription(t0) {
  let $ = w(13),
    { ruleValue: ruleValue } = t0,
    a,
    f,
    g,
    v,
    x,
    C;
  if ($[0] !== ruleValue) {
    C = EARLY_RETURN_SENTINEL;
    c: {
      f = describeRuleShape(ruleValue);
      if (!f) {
        C = null;
        break c;
      }
      a = Text;
      g = !0;
      v = f.prefix;
      x = f.emphasis !== void 0 && e(Text, { bold: !0, children: consentRowLabel(f.emphasis) });
    }
    (($[0] = ruleValue), ($[1] = a), ($[2] = f), ($[3] = g), ($[4] = v), ($[5] = x), ($[6] = C));
  } else ((a = $[1]), (f = $[2]), (g = $[3]), (v = $[4]), (x = $[5]), (C = $[6]));
  if (C !== EARLY_RETURN_SENTINEL) return C;
  let M;
  if ($[7] !== a || $[8] !== f.suffix || $[9] !== g || $[10] !== v || $[11] !== x)
    ((M = r(a, { dimColor: g, children: [v, x, f.suffix] })),
      ($[7] = a),
      ($[8] = f.suffix),
      ($[9] = g),
      ($[10] = v),
      ($[11] = x),
      ($[12] = M));
  else M = $[12];
  return M;
}
/**
 * 生成权限规则的可读描述片段 {prefix, emphasis, suffix}：Bash 规则区分任意命令/前缀/精确命令，无内容的规则描述为"任意使用该工具"，其余返回 null。
 */
//@ chunk-mjpqa6jt.js:227-617 placement
function describeRuleShape(e) {
  if (e.toolName === BASH_TOOL_NAME) {
    if (!e.ruleContent) return { prefix: "Any Bash command" };
    if (e.ruleContent.endsWith(":*") || e.ruleContent.endsWith(" *"))
      return { prefix: "Any Bash command starting with ", emphasis: e.ruleContent.slice(0, -2) };
    return { prefix: "The Bash command ", emphasis: e.ruleContent };
  }
  if (!e.ruleContent) return { prefix: "Any use of the ", emphasis: e.toolName, suffix: " tool" };
  return null;
}

export { describeRuleShape, PermissionRuleDescription };
