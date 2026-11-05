/**
 * components/permissions/rules/PermissionRuleDescription.tsx
 *
 * 权限规则的人类可读描述。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/rules/PermissionRuleDescription.tsx
 * pieces: chunk-69br0ssk.js (1), chunk-h5wy8vq5.js (2)
 * attribution: placement 2, callgraph-fingerprint 1
 */
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { permissionRuleValueFromString as permissionRuleValueFromString_2 } from "../../../utils/sandbox/sandbox-adapter.js";
import { describeWildcardHint } from "../../../utils/permissions/legacyWildcardRules.js";
import { permissionRuleValueFromString } from "../../../utils/permissions/permissionRuleParser.js";
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { EARLY_RETURN_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { Text } from "../../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { consentRowLabel } from "../consentRows.js";

//@ chunk-69br0ssk.js:303-754 placement
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
  if (permissionRuleValueFromString_2(ruleValue))
    return {
      prefix: `This rule ${describeWildcardHint(permissionRuleValueFromString(ruleValue), ruleValue.toolName)}`,
    };
  if (!ruleValue.ruleContent)
    return {
      prefix: "Any use of the ",
      emphasis: ruleValue.toolName,
      suffix: " tool",
    };
  return null;
}
//@ chunk-h5wy8vq5.js:21374-21378 placement
init_react_production();
//@ chunk-h5wy8vq5.js:22870-23359 callgraph-fingerprint (2.1.88 match: PermissionRuleDescription, 0.302)
function PermissionRuleDescription(props) {
  let $ = useMemoCache(13);
  let { ruleValue } = props;
  let labelElement;
  let detailElement;
  let dimColor;
  let childrenElement;
  let boxElement;
  let ruleResult;
  if ($[0] !== ruleValue) {
    ruleResult = EARLY_RETURN_SENTINEL;
    h: {
      detailElement = describeRuleShape(ruleValue);
      if (!detailElement) {
        ruleResult = null;
        break h;
      }
      labelElement = Text;
      dimColor = true;
      childrenElement = detailElement.prefix;
      boxElement =
        detailElement.emphasis !== undefined &&
        jsxProd_default(Text, {
          bold: true,
          children: consentRowLabel(detailElement.emphasis),
        });
    }
    $[0] = ruleValue;
    $[1] = labelElement;
    $[2] = detailElement;
    $[3] = dimColor;
    $[4] = childrenElement;
    $[5] = boxElement;
    $[6] = ruleResult;
  } else {
    labelElement = $[1];
    detailElement = $[2];
    dimColor = $[3];
    childrenElement = $[4];
    boxElement = $[5];
    ruleResult = $[6];
  }
  if (ruleResult !== EARLY_RETURN_SENTINEL) return ruleResult;
  let labelElementElement;
  if (
    $[7] !== labelElement ||
    $[8] !== detailElement.suffix ||
    $[9] !== dimColor ||
    $[10] !== childrenElement ||
    $[11] !== boxElement
  ) {
    labelElementElement = jsxProd_default_2(labelElement, {
      dimColor,
      children: [childrenElement, boxElement, detailElement.suffix],
    });
    $[7] = labelElement;
    $[8] = detailElement.suffix;
    $[9] = dimColor;
    $[10] = childrenElement;
    $[11] = boxElement;
    $[12] = labelElementElement;
  } else labelElementElement = $[12];
  return labelElementElement;
}
export { PermissionRuleDescription, describeRuleShape };
