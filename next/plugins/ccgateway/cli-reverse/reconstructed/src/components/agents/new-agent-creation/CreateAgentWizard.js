/**
 * components/agents/new-agent-creation/CreateAgentWizard.tsx
 *
 * 新建子代理向导入口；本模块实际字符串为 "Set up Amazon Bedrock"，疑似匹配错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/CreateAgentWizard.tsx
 * pieces: chunk-3msz77wt.js (3)
 * attribution: file-last-pair 1, layout 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  BedrockAuthMethodStep,
  BedrockAccessKeysStep,
} from "../../providerSetup/bedrock/BedrockCredentialsStep.js";
import {
  BedrockProfileStep,
  BedrockVerifyStep,
  BedrockModelCheckStep,
} from "../../providerSetup/bedrock/bedrockVerify.js";
import { MethodStep } from "./wizard-steps/MethodStep.js";
import { DescriptionStep } from "./wizard-steps/DescriptionStep.js";
import { BedrockSaveStep } from "../../providerSetup/bedrock/BedrockSaveStep.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WizardProvider } from "../../wizard/WizardProvider.js";

//@ chunk-3msz77wt.js:23427-23442 file-last-pair
function noop_3() {}
//@ chunk-3msz77wt.js:23442-23475 layout
var BEDROCK_SETUP_STEPS = [
  BedrockAuthMethodStep,
  BedrockProfileStep,
  MethodStep,
  BedrockAccessKeysStep,
  DescriptionStep,
  BedrockVerifyStep,
  BedrockModelCheckStep,
  BedrockSaveStep,
];
//@ chunk-3msz77wt.js:23475-23847 fingerprint (2.1.88 match: CreateAgentWizard, 0.48)
function CreateAgentWizard(props) {
  let $ = useMemoCache(7);
  let { onComplete, onCancel, exitOnCtrlCD } = props;
  let stepProps;
  if ($[0] !== onComplete) {
    stepProps = {
      onComplete,
    };
    $[0] = onComplete;
    $[1] = stepProps;
  } else stepProps = $[1];
  let initialData;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    initialData = {};
    $[2] = initialData;
  } else initialData = $[2];
  let wizard;
  if ($[3] !== exitOnCtrlCD || $[4] !== onCancel || $[5] !== stepProps) {
    wizard = jsxProd_default(WizardProvider, {
      steps: BEDROCK_SETUP_STEPS,
      stepProps,
      initialData,
      onComplete: noop_3,
      onCancel,
      exitOnCtrlCD,
      title: "Set up Amazon Bedrock",
    });
    $[3] = exitOnCtrlCD;
    $[4] = onCancel;
    $[5] = stepProps;
    $[6] = wizard;
  } else wizard = $[6];
  return wizard;
}
export { CreateAgentWizard };
