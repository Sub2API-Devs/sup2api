/**
 * components/ModelPinWizard.tsx
 *
 * 2.1.316 新增：模型固定向导。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-095ptjmr.js (10)
 * attribution: placement 10
 */
import { env } from "../utils/env.js";
import { init_react_production, Q, y, P } from "../../vendor/react/cjs/react.production.js";
import { useWizard } from "./wizard/useWizard.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ensure1mSuffix } from "../utils/model/model.js";
import { WizardDialogLayout } from "./wizard/WizardDialogLayout.js";
import { Box, Text } from "../ink/components/Text.js";
import { TIER_LABELS } from "../utils/model/thirdPartyDefaultFallbacks.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { supports1mBeta, modelHasNative1MContext } from "../utils/model/contextWindow1m.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { StatusIcon } from "./design-system/StatusIcon.js";
import { Spinner } from "./Spinner.js";
import { strip1mSuffix } from "../utils/model/modelIds.js";

//@ chunk-095ptjmr.js:3989-4030 placement
/**
 * 导出值：MODEL_PIN_FAMILIES（可固定的模型家族）。
 */
var MODEL_PIN_FAMILIES = ["sonnet", "opus", "haiku", "fable"];
//@ chunk-095ptjmr.js:4030-4204 placement
function readEnvModelPins() {
  return {
    sonnet: env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    opus: env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    haiku: env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
    fable: env.ANTHROPIC_DEFAULT_FABLE_MODEL,
  };
}
//@ chunk-095ptjmr.js:4204-4208 placement
init_react_production();
//@ chunk-095ptjmr.js:4208-6032 placement
/**
 * 第三方提供方（Bedrock/Vertex）配置向导中的"固定模型版本"步骤：对 sonnet/opus/haiku/fable 各探测候选模型，可一键固定可用模型（可选 1M 上下文）、手动逐档选择或跳过使用默认。
 */
function ModelPinStep({ provider, onPins }) {
  let { goBack, goNext, wizardData } = useWizard();
  let t = Q(() => provider.resolveTierDefaults(wizardData), []);
  let c = Q(() => readEnvModelPins(), []);
  let [l, d] = y(() =>
    Object.fromEntries(MODEL_PIN_FAMILIES.map((a) => [a, c[a] ?? t[a].auto ?? t[a].fallback])),
  );
  let [x, h] = y({
    sonnet: "pending",
    opus: "pending",
    haiku: "pending",
    fable: "pending",
  });
  let [R, z] = y("summary");
  let mapped = MODEL_PIN_FAMILIES.map((a) =>
    jsxProd_default(
      ModelProbe,
      {
        candidate: l[a],
        probe: (k) => provider.probe(wizardData, k),
        onState: (k) =>
          h((B) => ({
            ...B,
            [a]: k,
          })),
      },
      a,
    ),
  );
  if (R !== "summary") {
    let picking = R.picking;
    return jsxProd_default_2(Fragment, {
      children: [
        mapped,
        jsxProd_default(
          TierModelPicker,
          {
            tier: picking,
            provider,
            wizardData,
            fallback: t[picking].fallback,
            current: l[picking],
            existingPin: c[picking],
            onPick: (k) => {
              d((F) => ({
                ...F,
                [picking]: k,
              }));
              let index = MODEL_PIN_FAMILIES.indexOf(picking);
              let J = MODEL_PIN_FAMILIES[index + 1];
              z(
                J
                  ? {
                      picking: J,
                    }
                  : "summary",
              );
            },
            onCancel: () => z("summary"),
          },
          picking,
        ),
      ],
    });
  }
  let v =
    MODEL_PIN_FAMILIES.every((a) => x[a] !== "pending") &&
    MODEL_PIN_FAMILIES.some((a) => x[a] !== "pending" && x[a].ok);
  let u =
    v &&
    MODEL_PIN_FAMILIES.some((a) => {
      let k = x[a];
      return k !== "pending" && k.ok && isPinnableModel(l[a]);
    });
  let onChange = (a) => {
    if (a === "manual") {
      z({
        picking: "sonnet",
      });
      return;
    }
    if (a === "pin" || a === "pin1m") {
      let k = (B) => {
        let J = x[B];
        if (J === "pending" || !J.ok) return;
        let F = l[B];
        return a === "pin1m" && isPinnableModel(F) ? ensure1mSuffix(F) : F;
      };
      onPins({
        pinSonnet: k("sonnet"),
        pinOpus: k("opus"),
        pinHaiku: k("haiku"),
        pinFable: k("fable"),
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
                MODEL_PIN_FAMILIES.map((a) =>
                  jsxProd_default(
                    ModelProbeStatusRow,
                    {
                      label: TIER_LABELS[a],
                      modelId: l[a],
                      state: x[a],
                      reasonLabel: provider.reasonLabel,
                    },
                    a,
                  ),
                ),
              ],
            }),
            jsxProd_default(ModelSelector, {
              options: [
                ...(v
                  ? [
                      {
                        label: "Pin the working models",
                        value: "pin",
                      },
                    ]
                  : []),
                ...(u
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
//@ chunk-095ptjmr.js:6032-6087 placement
function isPinnableModel(f) {
  return (
    supports1mBeta(f) &&
    !modelHasNative1MContext(f, {
      byItsOwnName: true,
    })
  );
}
//@ chunk-095ptjmr.js:6140-6420 placement
function ModelProbe(props) {
  let b = w(6);
  let { candidate, probe, onState } = props;
  let t;
  if (b[0] !== candidate || b[1] !== onState || b[2] !== probe) {
    t = () => {
      let c = false;
      onState("pending");
      probe(candidate).then((l) => {
        if (!c) onState(l);
      });
      return () => {
        c = true;
      };
    };
    b[0] = candidate;
    b[1] = onState;
    b[2] = probe;
    b[3] = t;
  } else t = b[3];
  let d;
  if (b[4] !== candidate) {
    d = [candidate];
    b[4] = candidate;
    b[5] = d;
  } else d = b[5];
  P(t, d);
  return null;
}
//@ chunk-095ptjmr.js:6420-7500 placement
/**
 * 某一档模型的手动选择：列出候选（含默认、当前、已固定），逐个探测，结果出来后可用的排前并预选。
 */
function TierModelPicker({
  tier,
  provider,
  wizardData,
  fallback,
  current: b,
  existingPin,
  onPick,
  onCancel,
}) {
  let d = Q(() => {
    let u = provider.listTierCandidates(tier, wizardData);
    for (let m of [fallback, b, existingPin]) if (m && !u.includes(m)) u.push(m);
    return u;
  }, [tier, fallback, b, existingPin]);
  let [x, h] = y(() => Object.fromEntries(d.map((u) => [u, "pending"])));
  P(() => {
    let u = false;
    for (let m of d)
      provider.probe(wizardData, m).then((a) => {
        if (!u)
          h((k) => ({
            ...k,
            [m]: a,
          }));
      });
    return () => {
      u = true;
    };
  }, []);
  let all = d.every((u) => x[u] !== "pending");
  let z = (u) => {
    let m = x[u];
    return m !== undefined && m !== "pending" && m.ok;
  };
  let A = Q(() => {
    if (!all) return d;
    return [...d].sort((u, m) => (z(u) ? 0 : 1) - (z(m) ? 0 : 1));
  }, [d, x, all]);
  let options = A.map((u) => ({
    value: u,
    label: jsxProd_default(CandidateStatusRow, {
      id: u,
      state: x[u] ?? "pending",
      reasonLabel: provider.reasonLabel,
      suffix:
        u === existingPin
          ? "(currently pinned)"
          : u === fallback
            ? "(built-in default)"
            : u === b
              ? "(selected)"
              : undefined,
    }),
  }));
  let v = () => {
    for (let u of provider.preferOnSettle ?? []) {
      let m = u === "current" ? b : fallback;
      if (z(m)) return m;
    }
    return A.find(z);
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
            defaultValue: all ? v() : b,
            onChange: onPick,
            onCancel,
          },
          all ? "settled" : "pending",
        ),
      ],
    }),
  });
}
//@ chunk-095ptjmr.js:7500-8456 placement = waitForInitialization (0.633)
/**
 * （误归此处）模型档位候选的状态行组件：pending/ok/error 三态图标 + id + 后缀 + 失败原因。
 */
function CandidateStatusRow(props) {
  let t = w(19);
  let { id, state, suffix, reasonLabel } = props;
  if (state === "pending") {
    let c;
    if (t[0] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(StatusIcon, {
        status: "pending",
        withSpace: true,
      });
      t[0] = c;
    } else c = t[0];
    let l;
    if (t[1] !== suffix) {
      l =
        suffix &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", suffix],
        });
      t[1] = suffix;
      t[2] = l;
    } else l = t[2];
    let d;
    if (t[3] !== id || t[4] !== l) {
      d = jsxProd_default_2(Text, {
        children: [c, id, l],
      });
      t[3] = id;
      t[4] = l;
      t[5] = d;
    } else d = t[5];
    return d;
  }
  if (state.ok) {
    let c;
    if (t[6] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(StatusIcon, {
        status: "success",
        withSpace: true,
      });
      t[6] = c;
    } else c = t[6];
    let l;
    if (t[7] !== suffix) {
      l =
        suffix &&
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [" ", suffix],
        });
      t[7] = suffix;
      t[8] = l;
    } else l = t[8];
    let d;
    if (t[9] !== id || t[10] !== l) {
      d = jsxProd_default_2(Text, {
        children: [c, id, l],
      });
      t[9] = id;
      t[10] = l;
      t[11] = d;
    } else d = t[11];
    return d;
  }
  let c;
  if (t[12] === MEMO_CACHE_SENTINEL) {
    c = jsxProd_default(StatusIcon, {
      status: "error",
      withSpace: true,
    });
    t[12] = c;
  } else c = t[12];
  const l = suffix && ` ${suffix}`;
  const d = reasonLabel[state.reason];
  let x;
  if (t[13] !== d) {
    x = jsxProd_default_2(Text, {
      color: "error",
      children: ["(", d, ")"],
    });
    t[13] = d;
    t[14] = x;
  } else x = t[14];
  let h;
  if (t[15] !== id || t[16] !== l || t[17] !== x) {
    h = jsxProd_default_2(Text, {
      dimColor: true,
      children: [c, id, l, " ", x],
    });
    t[15] = id;
    t[16] = l;
    t[17] = x;
    t[18] = h;
  } else h = t[18];
  return h;
}
//@ chunk-095ptjmr.js:8456-9639 placement
/**
 * 模型探测状态行：pending 显示 spinner，成功绿色显示模型 id，失败显示原因。
 */
function ModelProbeStatusRow(props) {
  let t = w(26);
  let { label, modelId, state, reasonLabel } = props;
  if (state === "pending") {
    let c;
    let l;
    if (t[0] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(Text, {
        children: "  ",
      });
      l = jsxProd_default(Spinner, {});
      t[0] = c;
      t[1] = l;
    } else {
      c = t[0];
      l = t[1];
    }
    let d;
    if (t[2] !== label) {
      d = label.padEnd(7);
      t[2] = label;
      t[3] = d;
    } else d = t[3];
    let x;
    if (t[4] !== modelId || t[5] !== d) {
      x = jsxProd_default_2(Box, {
        children: [
          c,
          l,
          jsxProd_default_2(Text, {
            children: [" ", d, "\u2192 ", modelId],
          }),
        ],
      });
      t[4] = modelId;
      t[5] = d;
      t[6] = x;
    } else x = t[6];
    return x;
  }
  if (state.ok) {
    let c;
    if (t[7] === MEMO_CACHE_SENTINEL) {
      c = jsxProd_default(StatusIcon, {
        status: "success",
        withSpace: true,
      });
      t[7] = c;
    } else c = t[7];
    let l;
    if (t[8] !== label) {
      l = label.padEnd(7);
      t[8] = label;
      t[9] = l;
    } else l = t[9];
    let d;
    if (t[10] !== modelId) {
      d = jsxProd_default(Text, {
        color: "success",
        children: modelId,
      });
      t[10] = modelId;
      t[11] = d;
    } else d = t[11];
    let x;
    if (t[12] !== l || t[13] !== d) {
      x = jsxProd_default_2(Text, {
        children: ["  ", c, l, "\u2192 ", d],
      });
      t[12] = l;
      t[13] = d;
      t[14] = x;
    } else x = t[14];
    return x;
  }
  let c;
  if (t[15] === MEMO_CACHE_SENTINEL) {
    c = jsxProd_default(StatusIcon, {
      status: "error",
      withSpace: true,
    });
    t[15] = c;
  } else c = t[15];
  let l;
  if (t[16] !== label) {
    l = label.padEnd(7);
    t[16] = label;
    t[17] = l;
  } else l = t[17];
  let d;
  if (t[18] !== modelId) {
    d = jsxProd_default(Text, {
      dimColor: true,
      children: modelId,
    });
    t[18] = modelId;
    t[19] = d;
  } else d = t[19];
  const x = reasonLabel[state.reason];
  let h;
  if (t[20] !== x) {
    h = jsxProd_default_2(Text, {
      color: "error",
      children: ["(", x, ")"],
    });
    t[20] = x;
    t[21] = h;
  } else h = t[21];
  let R;
  if (t[22] !== l || t[23] !== d || t[24] !== h) {
    R = jsxProd_default_2(Text, {
      children: ["  ", c, l, "\u2192 ", d, " ", h],
    });
    t[22] = l;
    t[23] = d;
    t[24] = h;
    t[25] = R;
  } else R = t[25];
  return R;
}
//@ chunk-095ptjmr.js:9639-10088 placement
/**
 * 用一次 1 token 请求探测模型可用性：创建客户端失败用 g 映射原因；401→auth、403→permission、400/404→model、429 视为可用、无状态码→network。
 */
async function probeModelAccess(f, o, g) {
  let p;
  try {
    p = await f();
  } catch (error) {
    return {
      ok: false,
      reason: g(error),
    };
  }
  try {
    await p.messages.create({
      model: strip1mSuffix(o),
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
