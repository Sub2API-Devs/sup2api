/**
 * components/providerSetup/bedrock/BedrockCredentialsStep.tsx
 *
 * 2.1.316 新增。Bedrock 设置向导：认证方式与访问密钥步骤。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3msz77wt.js (6)
 * attribution: placement 6
 */
import { init_react_production, useState } from "../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AgentsList } from "../../agents/AgentsList.js";
import { Text, Box } from "../../../ink/components/Text.js";
import { WizardDialogLayout } from "../../wizard/WizardDialogLayout.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-3msz77wt.js:1426-1430 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3msz77wt.js:1426", () => {
  init_react_production();
});
//@ chunk-3msz77wt.js:1430-1769 placement
/**
 * Bedrock 访问密钥表单字段：Access key ID、Secret access key（掩码）、可选 Session token（仅 STS 临时凭证需要）。
 */
var ACCESS_KEY_FIELDS = [
  {
    type: "text",
    key: "accessKeyId",
    label: "Access key ID",
    placeholder: "AKIA\u2026",
    required: true,
  },
  {
    type: "text",
    key: "secretAccessKey",
    label: "Secret access key",
    mask: "*",
    required: true,
  },
  {
    type: "text",
    key: "sessionToken",
    label: "Session token",
    mask: "*",
    hint: () => "Only needed for temporary credentials from STS. Leave empty for long-lived keys.",
  },
];
//@ chunk-3msz77wt.js:1769-2744 placement
function BedrockAccessKeysStep() {
  let $ = useMemoCache(16);
  let { goBack, goNext, updateWizardData, wizardData, title } = useWizard();
  const accessKeyId = wizardData.accessKeyId ?? "";
  const secretAccessKey = wizardData.secretAccessKey ?? "";
  const sessionToken = wizardData.sessionToken ?? "";
  let initialCredentials;
  if ($[0] !== accessKeyId || $[1] !== secretAccessKey || $[2] !== sessionToken) {
    initialCredentials = {
      accessKeyId,
      secretAccessKey,
      sessionToken,
    };
    $[0] = accessKeyId;
    $[1] = secretAccessKey;
    $[2] = sessionToken;
    $[3] = initialCredentials;
  } else initialCredentials = $[3];
  let [credentials, setCredentials] = useState(initialCredentials);
  let onSubmit;
  if (
    $[4] !== goNext ||
    $[5] !== updateWizardData ||
    $[6] !== credentials.accessKeyId ||
    $[7] !== credentials.secretAccessKey ||
    $[8] !== credentials.sessionToken
  ) {
    onSubmit = () => {
      updateWizardData({
        accessKeyId: credentials.accessKeyId.trim(),
        secretAccessKey: credentials.secretAccessKey.trim(),
        sessionToken: credentials.sessionToken.trim() || undefined,
      });
      goNext();
    };
    $[4] = goNext;
    $[5] = updateWizardData;
    $[6] = credentials.accessKeyId;
    $[7] = credentials.secretAccessKey;
    $[8] = credentials.sessionToken;
    $[9] = onSubmit;
  } else onSubmit = $[9];
  let onSubmit_2 = onSubmit;
  const title_2 = title ?? "Set up AWS Bedrock";
  let onChange;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    onChange = (field, value) =>
      setCredentials((previous) => ({
        ...previous,
        [field]: value,
      }));
    $[10] = onChange;
  } else onChange = $[10];
  let agentsListElement;
  if ($[11] !== goBack || $[12] !== onSubmit_2 || $[13] !== title_2 || $[14] !== credentials) {
    agentsListElement = jsxProd_default(AgentsList, {
      title: title_2,
      subtitle: "AWS access keys",
      fields: ACCESS_KEY_FIELDS,
      values: credentials,
      onChange,
      onSubmit: onSubmit_2,
      onCancel: goBack,
      submitLabel: "Continue",
    });
    $[11] = goBack;
    $[12] = onSubmit_2;
    $[13] = title_2;
    $[14] = credentials;
    $[15] = agentsListElement;
  } else agentsListElement = $[15];
  return agentsListElement;
}
//@ chunk-3msz77wt.js:2744-2842 placement
var BEDROCK_STEPS = {
  AUTH_METHOD: 0,
  PROFILE: 1,
  BEARER: 2,
  ACCESS_KEY_ID: 3,
  REGION: 4,
  VERIFY: 5,
  PIN_MODELS: 6,
  CONFIRM: 7,
};
//@ chunk-3msz77wt.js:2842-3817 placement
function BedrockAuthMethodStep() {
  let $ = useMemoCache(9);
  let { goBack, goToStep, updateWizardData } = useWizard();
  let authMethodOptions;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    authMethodOptions = [
      {
        label: "AWS profile (SSO or named profile)",
        value: "profile",
      },
      {
        label: "Bedrock API key (bearer token)",
        value: "bearer",
      },
      {
        label: "Access key + secret",
        value: "accessKey",
      },
      {
        label: "Use credentials already in my environment",
        value: "environment",
      },
    ];
    $[0] = authMethodOptions;
  } else authMethodOptions = $[0];
  let options = authMethodOptions;
  let stepByMethod;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    stepByMethod = {
      profile: BEDROCK_STEPS.PROFILE,
      bearer: BEDROCK_STEPS.BEARER,
      accessKey: BEDROCK_STEPS.ACCESS_KEY_ID,
      environment: BEDROCK_STEPS.REGION,
    };
    $[1] = stepByMethod;
  } else stepByMethod = $[1];
  let stepMap = stepByMethod;
  let onChange;
  if ($[2] !== goToStep || $[3] !== updateWizardData) {
    onChange = (authMethod) => {
      let method = authMethod;
      updateWizardData({
        authMethod: method,
      });
      goToStep(stepMap[method]);
    };
    $[2] = goToStep;
    $[3] = updateWizardData;
    $[4] = onChange;
  } else onChange = $[4];
  let onChange_2 = onChange;
  let textElement;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      dimColor: true,
      children:
        "Claude Code uses the standard AWS credential chain. Pick the method you already use with the AWS CLI.",
    });
    $[5] = textElement;
  } else textElement = $[5];
  let wizardDialogLayoutElement;
  if ($[6] !== goBack || $[7] !== onChange_2) {
    wizardDialogLayoutElement = jsxProd_default(WizardDialogLayout, {
      subtitle: "How do you authenticate to AWS?",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [
          textElement,
          jsxProd_default(ModelSelector, {
            options,
            onChange: onChange_2,
            onCancel: goBack,
          }),
        ],
      }),
    });
    $[6] = goBack;
    $[7] = onChange_2;
    $[8] = wizardDialogLayoutElement;
  } else wizardDialogLayoutElement = $[8];
  return wizardDialogLayoutElement;
}
//@ chunk-3msz77wt.js:3817-3821 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3msz77wt.js:3817", () => {
  init_react_production();
});
export { BEDROCK_STEPS, BedrockAuthMethodStep, BedrockAccessKeysStep };
