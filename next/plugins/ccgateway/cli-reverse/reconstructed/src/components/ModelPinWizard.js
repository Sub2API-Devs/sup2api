/**
 * components/ModelPinWizard.tsx
 *
 * 2.1.316 新增：模型固定向导。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pqe1nn4c.js (11)
 * attribution: placement 10, layout 1
 */
import { env } from "../utils/env.js";
import {
  init_react_production,
  useMemo,
  useState,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { useWizard } from "./wizard/useWizard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { WizardDialogLayout } from "./wizard/WizardDialogLayout.js";
import { Box, Text } from "../ink/components/Text.js";
import { TIER_LABELS } from "../utils/model/thirdPartyDefaultFallbacks.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { supports1mBeta, modelHasNative1MContext } from "../utils/model/contextWindow1m.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { Spinner } from "./Spinner.js";
import { strip1mSuffix } from "../utils/model/modelIds.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-pqe1nn4c.js:3766-3807 placement
/**
 * 导出值：MODEL_PIN_FAMILIES（可固定的模型家族）。
 */
var MODEL_PIN_FAMILIES = ["sonnet", "opus", "haiku", "fable"];
//@ chunk-pqe1nn4c.js:3807-3981 placement
function readEnvModelPins() {
  return {
    sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    haiku: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    fable: env.ANTHROPIC_DEFAULT_FABLE_MODEL,
  };
}
//@ chunk-pqe1nn4c.js:3981-3985 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pqe1nn4c.js:3981", () => {
  init_react_production();
});
//@ chunk-pqe1nn4c.js:3985-5811 placement
/**
 * 第三方提供方（Bedrock/Vertex）配置向导中的"固定模型版本"步骤：对 sonnet/opus/haiku/fable 各探测候选模型，可一键固定可用模型（可选 1M 上下文）、手动逐档选择或跳过使用默认。
 */
function ModelPinStep({ provider, onPins }) {
  let { goBack, goNext, wizardData } = useWizard();
  let tierDefaults = useMemo(() => provider.resolveTierDefaults(wizardData), []);
  let existingPins = useMemo(() => readEnvModelPins(), []);
  let [pins, setPins] = useState(() =>
    Object.fromEntries(
      MODEL_PIN_FAMILIES.map((family) => [
        family,
        existingPins[family] ?? tierDefaults[family].auto ?? tierDefaults[family].fallback,
      ]),
    ),
  );
  let [probeStates, setProbeStates] = useState({
    sonnet: "pending",
    opus: "pending",
    haiku: "pending",
    fable: "pending",
  });
  let [view, setView] = useState("summary");
  let mapped = MODEL_PIN_FAMILIES.map((family) =>
    jsxProd_default(
      ModelProbe,
      {
        candidate: pins[family],
        probe: (modelId) => provider.probe(wizardData, modelId),
        onState: (state) =>
          setProbeStates((prev) => ({
            ...prev,
            [family]: state,
          })),
      },
      family,
    ),
  );
  if (view !== "summary") {
    let picking = view.picking;
    return jsxProd_default_2(Fragment, {
      children: [
        mapped,
        jsxProd_default(
          TierModelPicker,
          {
            tier: picking,
            provider,
            wizardData,
            fallback: tierDefaults[picking].fallback,
            current: pins[picking],
            existingPin: existingPins[picking],
            onPick: (modelId) => {
              setPins((prev) => ({
                ...prev,
                [picking]: modelId,
              }));
              let index = MODEL_PIN_FAMILIES.indexOf(picking);
              let nextFamily = MODEL_PIN_FAMILIES[index + 1];
              setView(
                nextFamily
                  ? {
                      picking: nextFamily,
                    }
                  : "summary",
              );
            },
            onCancel: () => setView("summary"),
          },
          picking,
        ),
      ],
    });
  }
  let allProbedWithOk =
    MODEL_PIN_FAMILIES.every((family) => probeStates[family] !== "pending") &&
    MODEL_PIN_FAMILIES.some((family) => probeStates[family] !== "pending" && probeStates[family].ok);
  let canPin1m =
    allProbedWithOk &&
    MODEL_PIN_FAMILIES.some((family) => {
      let state = probeStates[family];
      return state !== "pending" && state.ok && isPinnableModel(pins[family]);
    });
  let onChange = (choice) => {
    if (choice === "manual") {
      setView({
        picking: "sonnet",
      });
      return;
    }
    if (choice === "pin" || choice === "pin1m") {
      let pickFor = (family) => {
        let state = probeStates[family];
        if (state === "pending" || !state.ok) return;
        let modelId = pins[family];
        return choice === "pin1m" && isPinnableModel(modelId) ? ensure1mSuffix(modelId) : modelId;
      };
      onPins({
        pinSonnet: pickFor("sonnet"),
        pinOpus: pickFor("opus"),
        pinHaiku: pickFor("haiku"),
        pinFable: pickFor("fable"),
      });
    } else
      onPins({
        pinSonnet: undefined,
        pinOpus: undefined,
        pinHaiku: undefined,
        pinFable: undefined,
      });
    goNext();
  };
  return jsxProd_default_2(Fragment, {
    children: [
      mapped,
      jsxProd_default(WizardDialogLayout, {
        subtitle: "Pin model versions",
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          children: [
            jsxProd_default(Text, {
              children: provider.intro,
            }),
            jsxProd_default_2(Box, {
              flexDirection: "column",
              children: [
                jsxProd_default(Text, {
                  dimColor: true,
                  children: "Each candidate is tested with a one-token request:",
                }),
                MODEL_PIN_FAMILIES.map((family) =>
                  jsxProd_default(
                    ModelProbeStatusRow,
                    {
                      label: TIER_LABELS[family],
                      modelId: pins[family],
                      state: probeStates[family],
                      reasonLabel: provider.reasonLabel,
                    },
                    family,
                  ),
                ),
              ],
            }),
            jsxProd_default(ModelSelector, {
              options: [
                ...(allProbedWithOk
                  ? [
                      {
                        label: "Pin the working models",
                        value: "pin",
                      },
                    ]
                  : []),
                ...(canPin1m
                  ? [
                      {
                        label: "Pin the working models with 1M context",
                        value: "pin1m",
                      },
                    ]
                  : []),
                {
                  label: "Choose different models\u2026",
                  value: "manual",
                },
                {
                  label: "Skip \u2014 use Claude Code defaults (auto-updates)",
                  value: "skip",
                },
              ],
              onChange,
              onCancel: goBack,
            }),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-pqe1nn4c.js:5811-5866 placement
function isPinnableModel(model) {
  return (
    supports1mBeta(model) &&
    !modelHasNative1MContext(model, {
      byItsOwnName: true,
    })
  );
}
//@ chunk-pqe1nn4c.js:5866-5919 layout (2.1.88 match: resolveSkillModelOverride, 1)
/**
 * 已有 [1m] 原样返回，否则追加 [1m]。旧版名 resolveSkillModelOverride 为错配。
 */
function ensure1mSuffix(model) {
  return /\[1m\]$/i.test(model) ? model : `${model}[1m]`;
}
//@ chunk-pqe1nn4c.js:5919-6199 placement
function ModelProbe(props) {
  let $ = useMemoCache(6);
  let { candidate, probe, onState } = props;
  let probeEffect;
  if ($[0] !== candidate || $[1] !== onState || $[2] !== probe) {
    probeEffect = () => {
      let isCancelled = false;
      onState("pending");
      probe(candidate).then((state) => {
        if (!isCancelled) onState(state);
      });
      return () => {
        isCancelled = true;
      };
    };
    $[0] = candidate;
    $[1] = onState;
    $[2] = probe;
    $[3] = probeEffect;
  } else probeEffect = $[3];
  let probeDeps;
  if ($[4] !== candidate) {
    probeDeps = [candidate];
    $[4] = candidate;
    $[5] = probeDeps;
  } else probeDeps = $[5];
  useEffect(probeEffect, probeDeps);
  return null;
}
//@ chunk-pqe1nn4c.js:6199-7277 placement
/**
 * 某一档模型的手动选择：列出候选（含默认、当前、已固定），逐个探测，结果出来后可用的排前并预选。
 */
function TierModelPicker({
  tier,
  provider,
  wizardData,
  fallback,
  current: currentCandidate,
  existingPin,
  onPick,
  onCancel,
}) {
  let candidates = useMemo(() => {
    let candidateList = provider.listTierCandidates(tier, wizardData);
    for (let candidate of [fallback, currentCandidate, existingPin])
      if (candidate && !candidateList.includes(candidate)) candidateList.push(candidate);
    return candidateList;
  }, [tier, fallback, currentCandidate, existingPin]);
  let [states, setStates] = useState(() =>
    Object.fromEntries(candidates.map((candidate) => [candidate, "pending"])),
  );
  useEffect(() => {
    let cancelled = false;
    for (let candidate of candidates)
      provider.probe(wizardData, candidate).then((state) => {
        if (!cancelled)
          setStates((prev) => ({
            ...prev,
            [candidate]: state,
          }));
      });
    return () => {
      cancelled = true;
    };
  }, []);
  let all = candidates.every((candidate) => states[candidate] !== "pending");
  let isOk = (candidate) => {
    let state = states[candidate];
    return state !== undefined && state !== "pending" && state.ok;
  };
  let sorted = useMemo(() => {
    if (!all) return candidates;
    return [...candidates].sort((left, right) => (isOk(left) ? 0 : 1) - (isOk(right) ? 0 : 1));
  }, [candidates, states, all]);
  let options = sorted.map((candidate) => ({
    value: candidate,
    label: jsxProd_default(CandidateStatusRow, {
      id: candidate,
      state: states[candidate] ?? "pending",
      reasonLabel: provider.reasonLabel,
      suffix:
        candidate === existingPin
          ? "(currently pinned)"
          : candidate === fallback
            ? "(built-in default)"
            : candidate === currentCandidate
              ? "(selected)"
              : undefined,
    }),
  }));
  let preferred = () => {
    for (let preference of provider.preferOnSettle ?? []) {
      let candidate = preference === "current" ? currentCandidate : fallback;
      if (isOk(candidate)) return candidate;
    }
    return sorted.find(isOk);
  };
  return jsxProd_default(WizardDialogLayout, {
    subtitle: `Pin ${TIER_LABELS[tier]} model`,
    children: jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default(Text, {
          dimColor: true,
          children: provider.pickerSubtitle(tier, wizardData),
        }),
        jsxProd_default(
          ModelSelector,
          {
            options,
            defaultValue: all ? preferred() : currentCandidate,
            onChange: onPick,
            onCancel,
          },
          all ? "settled" : "pending",
        ),
      ],
    }),
  });
}
//@ chunk-pqe1nn4c.js:7277-8233 placement (2.1.88 match: waitForInitialization, 0.632)
/**
 * （误归此处）模型档位候选的状态行组件：pending/ok/error 三态图标 + id + 后缀 + 失败原因。
 */
function CandidateStatusRow(props) {
  let $ = useMemoCache(19);
  let { id, state, suffix, reasonLabel } = props;
  if (state === "pending") {
    let pendingIcon;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      pendingIcon = jsxProd_default(StatusIcon, {
        status: "pending",
        withSpace: true,
      });
      $[0] = pendingIcon;
    } else pendingIcon = $[0];
    let pendingSuffix;
    if ($[1] !== suffix) {
      pendingSuffix =
        suffix &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", suffix],
        });
      $[1] = suffix;
      $[2] = pendingSuffix;
    } else pendingSuffix = $[2];
    let pendingRow;
    if ($[3] !== id || $[4] !== pendingSuffix) {
      pendingRow = jsxProd_default_2(Text, {
        children: [pendingIcon, id, pendingSuffix],
      });
      $[3] = id;
      $[4] = pendingSuffix;
      $[5] = pendingRow;
    } else pendingRow = $[5];
    return pendingRow;
  }
  if (state.ok) {
    let successIcon;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      successIcon = jsxProd_default(StatusIcon, {
        status: "success",
        withSpace: true,
      });
      $[6] = successIcon;
    } else successIcon = $[6];
    let successSuffix;
    if ($[7] !== suffix) {
      successSuffix =
        suffix &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", suffix],
        });
      $[7] = suffix;
      $[8] = successSuffix;
    } else successSuffix = $[8];
    let successRow;
    if ($[9] !== id || $[10] !== successSuffix) {
      successRow = jsxProd_default_2(Text, {
        children: [successIcon, id, successSuffix],
      });
      $[9] = id;
      $[10] = successSuffix;
      $[11] = successRow;
    } else successRow = $[11];
    return successRow;
  }
  let errorIcon;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    errorIcon = jsxProd_default(StatusIcon, {
      status: "error",
      withSpace: true,
    });
    $[12] = errorIcon;
  } else errorIcon = $[12];
  const errorSuffix = suffix && ` ${suffix}`;
  const reasonText = reasonLabel[state.reason];
  let reasonElement;
  if ($[13] !== reasonText) {
    reasonElement = jsxProd_default_2(Text, {
      color: "error",
      children: ["(", reasonText, ")"],
    });
    $[13] = reasonText;
    $[14] = reasonElement;
  } else reasonElement = $[14];
  let errorRow;
  if ($[15] !== id || $[16] !== errorSuffix || $[17] !== reasonElement) {
    errorRow = jsxProd_default_2(Text, {
      dimColor: true,
      children: [errorIcon, id, errorSuffix, " ", reasonElement],
    });
    $[15] = id;
    $[16] = errorSuffix;
    $[17] = reasonElement;
    $[18] = errorRow;
  } else errorRow = $[18];
  return errorRow;
}
//@ chunk-pqe1nn4c.js:8233-9416 placement
/**
 * 模型探测状态行：pending 显示 spinner，成功绿色显示模型 id，失败显示原因。
 */
function ModelProbeStatusRow(props) {
  let $ = useMemoCache(26);
  let { label, modelId, state, reasonLabel } = props;
  if (state === "pending") {
    let indent;
    let spinnerElement;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      indent = jsxProd_default(Text, {
        children: "  ",
      });
      spinnerElement = jsxProd_default(Spinner, {});
      $[0] = indent;
      $[1] = spinnerElement;
    } else {
      indent = $[0];
      spinnerElement = $[1];
    }
    let labelText;
    if ($[2] !== label) {
      labelText = label.padEnd(7);
      $[2] = label;
      $[3] = labelText;
    } else labelText = $[3];
    let boxElement;
    if ($[4] !== modelId || $[5] !== labelText) {
      boxElement = jsxProd_default_2(Box, {
        children: [
          indent,
          spinnerElement,
          jsxProd_default_2(Text, {
            children: [" ", labelText, "\u2192 ", modelId],
          }),
        ],
      });
      $[4] = modelId;
      $[5] = labelText;
      $[6] = boxElement;
    } else boxElement = $[6];
    return boxElement;
  }
  if (state.ok) {
    let successIcon;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      successIcon = jsxProd_default(StatusIcon, {
        status: "success",
        withSpace: true,
      });
      $[7] = successIcon;
    } else successIcon = $[7];
    let labelText;
    if ($[8] !== label) {
      labelText = label.padEnd(7);
      $[8] = label;
      $[9] = labelText;
    } else labelText = $[9];
    let modelElement;
    if ($[10] !== modelId) {
      modelElement = jsxProd_default(Text, {
        color: "success",
        children: modelId,
      });
      $[10] = modelId;
      $[11] = modelElement;
    } else modelElement = $[11];
    let successRow;
    if ($[12] !== labelText || $[13] !== modelElement) {
      successRow = jsxProd_default_2(Text, {
        children: ["  ", successIcon, labelText, "\u2192 ", modelElement],
      });
      $[12] = labelText;
      $[13] = modelElement;
      $[14] = successRow;
    } else successRow = $[14];
    return successRow;
  }
  let errorIcon;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    errorIcon = jsxProd_default(StatusIcon, {
      status: "error",
      withSpace: true,
    });
    $[15] = errorIcon;
  } else errorIcon = $[15];
  let labelText;
  if ($[16] !== label) {
    labelText = label.padEnd(7);
    $[16] = label;
    $[17] = labelText;
  } else labelText = $[17];
  let modelElement;
  if ($[18] !== modelId) {
    modelElement = jsxProd_default(Text, {
      dimColor: true,
      children: modelId,
    });
    $[18] = modelId;
    $[19] = modelElement;
  } else modelElement = $[19];
  const reasonText = reasonLabel[state.reason];
  let reasonElement;
  if ($[20] !== reasonText) {
    reasonElement = jsxProd_default_2(Text, {
      color: "error",
      children: ["(", reasonText, ")"],
    });
    $[20] = reasonText;
    $[21] = reasonElement;
  } else reasonElement = $[21];
  let errorRow;
  if ($[22] !== labelText || $[23] !== modelElement || $[24] !== reasonElement) {
    errorRow = jsxProd_default_2(Text, {
      children: ["  ", errorIcon, labelText, "\u2192 ", modelElement, " ", reasonElement],
    });
    $[22] = labelText;
    $[23] = modelElement;
    $[24] = reasonElement;
    $[25] = errorRow;
  } else errorRow = $[25];
  return errorRow;
}
//@ chunk-pqe1nn4c.js:9416-9865 placement
/**
 * 用一次 1 token 请求探测模型可用性：创建客户端失败用 g 映射原因；401→auth、403→permission、400/404→model、429 视为可用、无状态码→network。
 */
async function probeModelAccess(getClient, modelId, describeError) {
  let client;
  try {
    client = await getClient();
  } catch (error) {
    return {
      ok: false,
      reason: describeError(error),
    };
  }
  try {
    await client.messages.create({
      model: strip1mSuffix(modelId),
      max_tokens: 1,
      messages: [
        {
          role: "user",
          content: ".",
        },
      ],
    });
    return {
      ok: true,
    };
  } catch (error) {
    let status = error?.status;
    if (status === 401)
      return {
        ok: false,
        reason: "auth",
      };
    if (status === 403)
      return {
        ok: false,
        reason: "permission",
      };
    if (status === 400 || status === 404)
      return {
        ok: false,
        reason: "model",
      };
    if (status === 429)
      return {
        ok: true,
      };
    if (status === undefined)
      return {
        ok: false,
        reason: "network",
      };
    return {
      ok: false,
      reason: "other",
    };
  }
}
export { probeModelAccess, MODEL_PIN_FAMILIES, ModelPinStep };
