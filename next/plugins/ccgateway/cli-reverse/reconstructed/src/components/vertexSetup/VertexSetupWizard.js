/**
 * components/vertexSetup/VertexSetupWizard.tsx
 *
 * 2.1.316 新增：Google Vertex AI 设置向导
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3qyfks39.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState, useRef } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useWizard } from "../wizard/useWizard.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { tildify } from "../../utils/path.js";
import { getSettingsFilePathForSource, updateSettingsForSource } from "../../utils/settings/settings.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { ErrorText } from "../ErrorText.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { WizardDialogLayout } from "../wizard/WizardDialogLayout.js";
import { catalogEntriesByFirstPartyId } from "../../utils/model/modelCatalog.js";
import {
  DEFAULT_3P_SONNET_KEY,
  DEFAULT_VERTEX_OPUS_KEY,
  DEFAULT_3P_HAIKU_KEY,
  DEFAULT_3P_FABLE_KEY,
} from "../../utils/model/model.js";
import { ModelStep } from "../agents/new-agent-creation/wizard-steps/ModelStep.js";
import { PromptStep } from "../agents/new-agent-creation/wizard-steps/PromptStep.js";
import { VertexProjectStep, VertexModelPinsStep } from "./vertexCredentials.js";
import { TypeStep } from "../agents/new-agent-creation/wizard-steps/TypeStep.js";
import { LocationStep } from "../agents/new-agent-creation/wizard-steps/LocationStep.js";
import { WizardProvider } from "../wizard/WizardProvider.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3qyfks39.js:1434-1525 placement
var VERTEX_WIZARD_STEPS_2 = {
  AUTH_METHOD: 0,
  SERVICE_ACCOUNT: 1,
  PROJECT: 2,
  REGION: 3,
  VERIFY: 4,
  PIN_MODELS: 5,
  CONFIRM: 6,
};
//@ chunk-3qyfks39.js:2554-2558 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-3qyfks39.js:2554", () => {
  init_react_production();
});
//@ chunk-3qyfks39.js:2558-2594 placement
function hasProjectSelection(entry) {
  return entry[1] !== undefined;
}
//@ chunk-3qyfks39.js:2594-2697 placement
function renderEnvAssignment(entry) {
  let [name, value] = entry;
  return jsxProd_default_2(
    Text,
    {
      children: [
        "  ",
        jsxProd_default(Text, {
          color: "suggestion",
          children: name,
        }),
        " = ",
        value,
      ],
    },
    name,
  );
}
//@ chunk-3qyfks39.js:2697-3522 placement
/**
 * 由 Vertex 向导数据生成要写入设置的 env：开启 CLAUDE_CODE_USE_VERTEX 并清掉其他提供方开关，写项目 ID、区域、服务账号密钥文件与固定的 Sonnet/Opus/Fable/Haiku 模型。
 */
function buildVertexEnvSettings(wizardData) {
  let envOverrides = {
    CLAUDE_CODE_USE_VERTEX: "1",
    CLAUDE_CODE_USE_BEDROCK: undefined,
    CLAUDE_CODE_USE_FOUNDRY: undefined,
    CLAUDE_CODE_USE_ANTHROPIC_AWS: undefined,
    CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD: undefined,
    CLAUDE_CODE_USE_MANTLE: undefined,
    ANTHROPIC_VERTEX_PROJECT_ID: wizardData.projectId,
    CLOUD_ML_REGION: wizardData.region,
    GOOGLE_APPLICATION_CREDENTIALS: undefined,
    ANTHROPIC_DEFAULT_SONNET_MODEL: undefined,
    ANTHROPIC_DEFAULT_OPUS_MODEL: undefined,
    ANTHROPIC_DEFAULT_HAIKU_MODEL: undefined,
    ANTHROPIC_DEFAULT_FABLE_MODEL: undefined,
    ANTHROPIC_SMALL_FAST_MODEL: undefined,
  };
  if (wizardData.authMethod === "serviceAccount")
    envOverrides.GOOGLE_APPLICATION_CREDENTIALS = wizardData.keyFile;
  if (wizardData.pinSonnet) envOverrides.ANTHROPIC_DEFAULT_SONNET_MODEL = wizardData.pinSonnet;
  if (wizardData.pinOpus) envOverrides.ANTHROPIC_DEFAULT_OPUS_MODEL = wizardData.pinOpus;
  if (wizardData.pinFable) envOverrides.ANTHROPIC_DEFAULT_FABLE_MODEL = wizardData.pinFable;
  if (wizardData.pinHaiku) envOverrides.ANTHROPIC_DEFAULT_HAIKU_MODEL = wizardData.pinHaiku;
  return envOverrides;
}
//@ chunk-3qyfks39.js:3522-5539 placement (2.1.88 match: ConfirmStep, 0.161)
function ConfirmStep(props) {
  let $ = useMemoCache(30);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let { goBack, wizardData } = useWizard();
  let [saveError, setSaveError] = useState(null);
  let settingsPath;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    settingsPath = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
    $[0] = settingsPath;
  } else settingsPath = $[0];
  let settingsPath_ = settingsPath;
  let envSettings;
  if ($[1] !== wizardData) {
    envSettings = buildVertexEnvSettings(wizardData);
    $[1] = wizardData;
    $[2] = envSettings;
  } else envSettings = $[2];
  let envSettings_ = envSettings;
  let envEntries;
  if ($[3] !== envSettings_) {
    envEntries = Object.entries(envSettings_).filter(hasProjectSelection);
    $[3] = envSettings_;
    $[4] = envEntries;
  } else envEntries = $[4];
  let pinEntries = envEntries;
  let hasSubmittedRef = useRef(false);
  let onConfirm;
  if (
    $[5] !== envSettings_ ||
    $[6] !== onComplete ||
    $[7] !== storageV5 ||
    $[8] !== wizardData.authMethod ||
    $[9] !== wizardData.pinFable ||
    $[10] !== wizardData.pinHaiku ||
    $[11] !== wizardData.pinOpus ||
    $[12] !== wizardData.pinSonnet ||
    $[13] !== wizardData.verifiedIdentity
  ) {
    onConfirm = async () => {
      if (hasSubmittedRef.current) {
        return;
      }
      hasSubmittedRef.current = true;
      let { error } = await updateSettingsForSource(
        "userSettings",
        {
          env: envSettings_,
        },
        undefined,
        storageV5,
      );
      if (error) {
        hasSubmittedRef.current = false;
        setSaveError(error.message);
        return;
      }
      logEvent("tengu_vertex_setup_complete", {
        auth_method: fromEnumOpt(wizardData.authMethod),
        pinned_models: Boolean(
          wizardData.pinSonnet || wizardData.pinOpus || wizardData.pinFable || wizardData.pinHaiku,
        ),
        verified: Boolean(wizardData.verifiedIdentity),
      });
      onComplete(
        `Vertex AI configuration saved to ${settingsPath_}.${wizardData.authMethod === "adc" ? " When your ADC token expires, run `gcloud auth application-default login` \u2014 Claude Code picks up refreshed credentials automatically." : ""}`,
      );
    };
    $[5] = envSettings_;
    $[6] = onComplete;
    $[7] = storageV5;
    $[8] = wizardData.authMethod;
    $[9] = wizardData.pinFable;
    $[10] = wizardData.pinHaiku;
    $[11] = wizardData.pinOpus;
    $[12] = wizardData.pinSonnet;
    $[13] = wizardData.verifiedIdentity;
    $[14] = onConfirm;
  } else onConfirm = $[14];
  let onConfirm_2 = onConfirm;
  let explainElement;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    explainElement = jsxProd_default_2(Text, {
      children: ["These will be written to ", settingsPath_, " under env:"],
    });
    $[15] = explainElement;
  } else explainElement = $[15];
  let envListElement;
  if ($[16] !== pinEntries) {
    envListElement = jsxProd_default(Box, {
      flexDirection: "column",
      children: pinEntries.map(renderEnvAssignment),
    });
    $[16] = pinEntries;
    $[17] = envListElement;
  } else envListElement = $[17];
  let verifiedElement;
  if ($[18] !== wizardData.verifiedIdentity) {
    verifiedElement =
      wizardData.verifiedIdentity &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          "Verified as ",
          wizardData.verifiedIdentity,
        ],
      });
    $[18] = wizardData.verifiedIdentity;
    $[19] = verifiedElement;
  } else verifiedElement = $[19];
  let errorElement;
  if ($[20] !== saveError) {
    errorElement = jsxProd_default(ErrorText, {
      error: saveError,
    });
    $[20] = saveError;
    $[21] = errorElement;
  } else errorElement = $[21];
  let confirmElement;
  if ($[22] !== goBack || $[23] !== onConfirm_2) {
    confirmElement = jsxProd_default(ConfirmSelect, {
      confirmLabel: "Save",
      cancelLabel: "Cancel",
      onConfirm: onConfirm_2,
      onCancel: goBack,
    });
    $[22] = goBack;
    $[23] = onConfirm_2;
    $[24] = confirmElement;
  } else confirmElement = $[24];
  let layoutElement;
  if (
    $[25] !== envListElement ||
    $[26] !== verifiedElement ||
    $[27] !== errorElement ||
    $[28] !== confirmElement
  ) {
    layoutElement = jsxProd_default(WizardDialogLayout, {
      subtitle: "Confirm and save",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [explainElement, envListElement, verifiedElement, errorElement, confirmElement],
      }),
    });
    $[25] = envListElement;
    $[26] = verifiedElement;
    $[27] = errorElement;
    $[28] = confirmElement;
    $[29] = layoutElement;
  } else layoutElement = $[29];
  return layoutElement;
}
//@ chunk-3qyfks39.js:5539-5644 placement
function defaultVertexModels() {
  return {
    sonnet: catalogEntriesByFirstPartyId[DEFAULT_3P_SONNET_KEY].vertex,
    opus: catalogEntriesByFirstPartyId[DEFAULT_VERTEX_OPUS_KEY].vertex,
    haiku: catalogEntriesByFirstPartyId[DEFAULT_3P_HAIKU_KEY].vertex,
    fable: catalogEntriesByFirstPartyId[DEFAULT_3P_FABLE_KEY].vertex,
  };
}
//@ chunk-3qyfks39.js:5644-5805 placement
function knownVertexModelIds(query) {
  let ids = new Set();
  for (let entry of Object.values(catalogEntriesByFirstPartyId))
    if (entry.vertex !== null && entry.vertex.toLowerCase().includes(query)) ids.add(entry.vertex);
  return [...ids].sort().reverse();
}
//@ chunk-3qyfks39.js:19411-19426 placement
function noopWizardEffect() {}
//@ chunk-3qyfks39.js:19426-19456 placement
var VERTEX_WIZARD_STEPS = [
  ModelStep,
  PromptStep,
  VertexProjectStep,
  TypeStep,
  LocationStep,
  VertexModelPinsStep,
  ConfirmStep,
];
//@ chunk-3qyfks39.js:19456-19830 placement
function VertexSetupWizard(props) {
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
  let wizardElement;
  if ($[3] !== exitOnCtrlCD || $[4] !== onCancel || $[5] !== stepProps) {
    wizardElement = jsxProd_default(WizardProvider, {
      steps: VERTEX_WIZARD_STEPS,
      stepProps,
      initialData,
      onComplete: noopWizardEffect,
      onCancel,
      exitOnCtrlCD,
      title: "Set up Google Vertex AI",
    });
    $[3] = exitOnCtrlCD;
    $[4] = onCancel;
    $[5] = stepProps;
    $[6] = wizardElement;
  } else wizardElement = $[6];
  return wizardElement;
}
export { VertexSetupWizard, VERTEX_WIZARD_STEPS_2, defaultVertexModels, knownVertexModelIds };
