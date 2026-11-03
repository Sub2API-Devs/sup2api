/**
 * components/vertexSetup/VertexSetupWizard.tsx
 *
 * 2.1.316 新增：Google Vertex AI 设置向导
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y6fv30yg.js (11)
 * attribution: placement 11
 */
import { init_react_production, y, R } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { ToolsStep } from "../agents/new-agent-creation/wizard-steps/ToolsStep.js";
import { PromptStep } from "../agents/new-agent-creation/wizard-steps/PromptStep.js";
import { VertexProjectStep, VertexModelPinsStep } from "./vertexCredentials.js";
import { TypeStep } from "../agents/new-agent-creation/wizard-steps/TypeStep.js";
import { LocationStep } from "../agents/new-agent-creation/wizard-steps/LocationStep.js";
import { WizardProvider } from "../wizard/WizardProvider.js";

//@ chunk-y6fv30yg.js:1434-1525 placement
var VERTEX_WIZARD_STEPS_2 = {
  AUTH_METHOD: 0,
  SERVICE_ACCOUNT: 1,
  PROJECT: 2,
  REGION: 3,
  VERIFY: 4,
  PIN_MODELS: 5,
  CONFIRM: 6,
};
//@ chunk-y6fv30yg.js:2554-2558 placement
init_react_production();
//@ chunk-y6fv30yg.js:2558-2594 placement
function hasProjectSelection(J) {
  return J[1] !== undefined;
}
//@ chunk-y6fv30yg.js:2594-2697 placement
function renderEnvAssignment(o) {
  let [N, G] = o;
  return jsxProd_default_2(
    Text,
    {
      children: [
        "  ",
        jsxProd_default(Text, {
          color: "suggestion",
          children: N,
        }),
        " = ",
        G,
      ],
    },
    N,
  );
}
//@ chunk-y6fv30yg.js:2697-3522 placement
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
//@ chunk-y6fv30yg.js:3522-5539 placement = ConfirmStep (0.161)
function ConfirmStep(props) {
  let $ = w(30);
  let { onComplete } = props;
  let { storageV5 } = useTheme_2();
  let { goBack, wizardData } = useWizard();
  let [h, p] = y(null);
  let u;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    u = tildify(getSettingsFilePathForSource("userSettings") ?? "~/.claude/settings.json");
    $[0] = u;
  } else u = $[0];
  let k = u;
  let g;
  if ($[1] !== wizardData) {
    g = buildVertexEnvSettings(wizardData);
    $[1] = wizardData;
    $[2] = g;
  } else g = $[2];
  let _ = g;
  let A;
  if ($[3] !== _) {
    A = Object.entries(_).filter(hasProjectSelection);
    $[3] = _;
    $[4] = A;
  } else A = $[4];
  let d = A;
  let D = R(false);
  let x;
  if (
    $[5] !== _ ||
    $[6] !== onComplete ||
    $[7] !== storageV5 ||
    $[8] !== wizardData.authMethod ||
    $[9] !== wizardData.pinFable ||
    $[10] !== wizardData.pinHaiku ||
    $[11] !== wizardData.pinOpus ||
    $[12] !== wizardData.pinSonnet ||
    $[13] !== wizardData.verifiedIdentity
  ) {
    x = async () => {
      if (D.current) {
        return;
      }
      D.current = true;
      let { error } = await updateSettingsForSource(
        "userSettings",
        {
          env: _,
        },
        undefined,
        storageV5,
      );
      if (error) {
        D.current = false;
        p(error.message);
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
        `Vertex AI configuration saved to ${k}.${wizardData.authMethod === "adc" ? " When your ADC token expires, run `gcloud auth application-default login` \u2014 Claude Code picks up refreshed credentials automatically." : ""}`,
      );
    };
    $[5] = _;
    $[6] = onComplete;
    $[7] = storageV5;
    $[8] = wizardData.authMethod;
    $[9] = wizardData.pinFable;
    $[10] = wizardData.pinHaiku;
    $[11] = wizardData.pinOpus;
    $[12] = wizardData.pinSonnet;
    $[13] = wizardData.verifiedIdentity;
    $[14] = x;
  } else x = $[14];
  let onConfirm = x;
  let E;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    E = jsxProd_default_2(Text, {
      children: ["These will be written to ", k, " under env:"],
    });
    $[15] = E;
  } else E = $[15];
  let v;
  if ($[16] !== d) {
    v = jsxProd_default(Box, {
      flexDirection: "column",
      children: d.map(renderEnvAssignment),
    });
    $[16] = d;
    $[17] = v;
  } else v = $[17];
  let b;
  if ($[18] !== wizardData.verifiedIdentity) {
    b =
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
    $[19] = b;
  } else b = $[19];
  let W;
  if ($[20] !== h) {
    W = jsxProd_default(ErrorText, {
      error: h,
    });
    $[20] = h;
    $[21] = W;
  } else W = $[21];
  let Y;
  if ($[22] !== goBack || $[23] !== onConfirm) {
    Y = jsxProd_default(ConfirmSelect, {
      confirmLabel: "Save",
      cancelLabel: "Cancel",
      onConfirm,
      onCancel: goBack,
    });
    $[22] = goBack;
    $[23] = onConfirm;
    $[24] = Y;
  } else Y = $[24];
  let F;
  if ($[25] !== v || $[26] !== b || $[27] !== W || $[28] !== Y) {
    F = jsxProd_default(WizardDialogLayout, {
      subtitle: "Confirm and save",
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [E, v, b, W, Y],
      }),
    });
    $[25] = v;
    $[26] = b;
    $[27] = W;
    $[28] = Y;
    $[29] = F;
  } else F = $[29];
  return F;
}
//@ chunk-y6fv30yg.js:5539-5644 placement
function defaultVertexModels() {
  return {
    sonnet: catalogEntriesByFirstPartyId[DEFAULT_3P_SONNET_KEY].vertex,
    opus: catalogEntriesByFirstPartyId[DEFAULT_VERTEX_OPUS_KEY].vertex,
    haiku: catalogEntriesByFirstPartyId[DEFAULT_3P_HAIKU_KEY].vertex,
    fable: catalogEntriesByFirstPartyId[DEFAULT_3P_FABLE_KEY].vertex,
  };
}
//@ chunk-y6fv30yg.js:5644-5805 placement
function knownVertexModelIds(o) {
  let l = new Set();
  for (let c of Object.values(catalogEntriesByFirstPartyId))
    if (c.vertex !== null && c.vertex.toLowerCase().includes(o)) l.add(c.vertex);
  return [...l].sort().reverse();
}
//@ chunk-y6fv30yg.js:19411-19426 placement
function noopWizardEffect() {}
//@ chunk-y6fv30yg.js:19426-19456 placement
var VERTEX_WIZARD_STEPS = [
  ToolsStep,
  PromptStep,
  VertexProjectStep,
  TypeStep,
  LocationStep,
  VertexModelPinsStep,
  ConfirmStep,
];
//@ chunk-y6fv30yg.js:19456-19849 placement
function VertexSetupWizard(props) {
  let t = w(7);
  let { onComplete, onCancel, exitOnCtrlCD } = props;
  let stepProps;
  if (t[0] !== onComplete) {
    stepProps = {
      onComplete,
    };
    t[0] = onComplete;
    t[1] = stepProps;
  } else stepProps = t[1];
  let initialData;
  if (t[2] === MEMO_CACHE_SENTINEL) {
    initialData = {};
    t[2] = initialData;
  } else initialData = t[2];
  let f;
  if (t[3] !== exitOnCtrlCD || t[4] !== onCancel || t[5] !== stepProps) {
    f = jsxProd_default(WizardProvider, {
      steps: VERTEX_WIZARD_STEPS,
      stepProps,
      initialData,
      onComplete: noopWizardEffect,
      onCancel,
      exitOnCtrlCD,
      title: "Set up Google Vertex AI",
      showStepCounter: false,
    });
    t[3] = exitOnCtrlCD;
    t[4] = onCancel;
    t[5] = stepProps;
    t[6] = f;
  } else f = t[6];
  return f;
}
export { VertexSetupWizard, VERTEX_WIZARD_STEPS_2, defaultVertexModels, knownVertexModelIds };
