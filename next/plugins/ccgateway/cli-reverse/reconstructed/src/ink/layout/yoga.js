/**
 * ink/layout/yoga.ts
 *
 * yoga 布局节点适配层；本模块现有声明全部误归（终端图片占位符、UI 组件）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/layout/yoga.ts
 * pieces: chunk-27bnjej4.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { buildNestedTree } from "../../components/ValidationErrorsList.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TreeConnectors } from "../../components/design-system/TreeConnectors.js";
import { Text } from "../components/Text.js";

//@ chunk-27bnjej4.js:15038-15200 fingerprint (2.1.88 match: createYogaLayoutNode, 1)
function renderErrorNode(errors, key) {
  let nestedTree = buildNestedTree(errors);
  return jsxProd_default(
    TreeConnectors.Node,
    {
      children: nestedTree
        ? jsxProd_default_2(Text, {
            children: [
              nestedTree,
              ": ",
              jsxProd_default(Text, {
                dimColor: true,
                children: errors.message,
              }),
            ],
          })
        : jsxProd_default(Text, {
            dimColor: true,
            children: errors.message,
          }),
    },
    key,
  );
}
export { renderErrorNode };
