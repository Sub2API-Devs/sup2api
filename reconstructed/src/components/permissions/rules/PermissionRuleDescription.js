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
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { Text } from "../../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { consentRowLabel } from "../consentRows.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";

//@ chunk-p2qwpk2k.js:20255-20259 placement
init_react_production();
//@ chunk-p2qwpk2k.js:21751-22240 callgraph-witnessed = PermissionRuleDescription (0.302)
function PermissionRuleDescription(props) {
  let $ = w(13);
  let { ruleValue } = props;
  let a;
  let f;
  let dimColor;
  let v;
  let x;
  let C;
  if ($[0] !== ruleValue) {
    C = EARLY_RETURN_SENTINEL;
    c: {
      f = describeRuleShape(ruleValue);
      if (!f) {
        C = null;
        break c;
      }
      a = Text;
      dimColor = true;
      v = f.prefix;
      x =
        f.emphasis !== undefined &&
        jsxProd_default(Text, {
          bold: true,
          children: consentRowLabel(f.emphasis),
        });
    }
    $[0] = ruleValue;
    $[1] = a;
    $[2] = f;
    $[3] = dimColor;
    $[4] = v;
    $[5] = x;
    $[6] = C;
  } else {
    a = $[1];
    f = $[2];
    dimColor = $[3];
    v = $[4];
    x = $[5];
    C = $[6];
  }
  if (C !== EARLY_RETURN_SENTINEL) return C;
  let M;
  if ($[7] !== a || $[8] !== f.suffix || $[9] !== dimColor || $[10] !== v || $[11] !== x) {
    M = jsxProd_default_2(a, {
      dimColor,
      children: [v, x, f.suffix],
    });
    $[7] = a;
    $[8] = f.suffix;
    $[9] = dimColor;
    $[10] = v;
    $[11] = x;
    $[12] = M;
  } else M = $[12];
  return M;
}
//@ chunk-mjpqa6jt.js:227-617 placement
/**
 * 生成权限规则的可读描述片段 {prefix, emphasis, suffix}：Bash 规则区分任意命令/前缀/精确命令，无内容的规则描述为"任意使用该工具"，其余返回 null。
 */
function describeRuleShape(ruleValue) {
  if (ruleValue.toolName === BASH_TOOL_NAME) {
    if (!ruleValue.ruleContent)
      return {
        prefix: "Any Bash command",
      };
    if (ruleValue.ruleContent.endsWith(":*") || ruleValue.ruleContent.endsWith(" *"))
      return {
        prefix: "Any Bash command starting with ",
        emphasis: ruleValue.ruleContent.slice(0, -2),
      };
    return {
      prefix: "The Bash command ",
      emphasis: ruleValue.ruleContent,
    };
  }
  if (!ruleValue.ruleContent)
    return {
      prefix: "Any use of the ",
      emphasis: ruleValue.toolName,
      suffix: " tool",
    };
  return null;
}
export { describeRuleShape, PermissionRuleDescription };
