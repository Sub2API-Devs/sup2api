/**
 * components/vertexSetup/vertexCredentials.ts
 *
 * 2.1.316 新增：Vertex 凭证探测、gcloud 配置列举、模型固定与项目步骤
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-y6fv30yg.js (16)
 * attribution: placement 16
 */
import { join } from "path";
import { readdir, readFile } from "fs/promises";
import {
  buildVertexGoogleAuth,
  suppressVertexAuthRejection,
  vertexResidualCredentialPins,
} from "../../services/api/vertexAuth.js";
import { withTimeout } from "../../utils/sleep.js";
import { defaultVertexModels, knownVertexModelIds } from "./VertexSetupWizard.js";
import { probeModelAccess, MODEL_PIN_FAMILIES, ModelPinStep } from "../ModelPinWizard.js";
import { getForwardableEnvHeaders } from "../../services/api/requestHeaders.js";
import { CLOUD_AUTH_SLOT } from "../../services/api/customHeaders.js";
import { env } from "../../utils/env.js";
import { getVertexBaseUrlForRegion } from "../../utils/envUtils.js";
import { TIER_LABELS } from "../../utils/model/thirdPartyDefaultFallbacks.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useWizard } from "../wizard/useWizard.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { init_react_production, y, fo } from "../../../vendor/react/cjs/react.production.js";
import { resolveGcloudConfigDir } from "../../utils/gcloudConfigDir.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { WizardDialogLayout } from "../wizard/WizardDialogLayout.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { MemoryStep } from "../agents/new-agent-creation/wizard-steps/MemoryStep.js";

//@ chunk-y6fv30yg.js:5805-5927 placement
function vertexCredentialSource(o) {
  if (o.authMethod === "serviceAccount" && o.keyFile)
    return {
      kind: "keyFile",
      path: o.keyFile,
    };
  return {
    kind: "default",
  };
}
//@ chunk-y6fv30yg.js:5927-5940 placement
var VERTEX_AUTH_TIMEOUT_MS = 12000;
//@ chunk-y6fv30yg.js:5940-7316 placement
/**
 * 用 Google 认证探测 Vertex 凭证：获取访问令牌并试调用模型，返回成功或失败原因。
 */
async function probeVertexCredentials(wizardData) {
  let identity;
  try {
    let vertexGoogleAuth = await buildVertexGoogleAuth(
      vertexCredentialSource(wizardData),
      wizardData.projectId,
    );
    let h = (async () => {
      await (await vertexGoogleAuth.getClient()).getAccessToken();
    })();
    await withTimeout(h, VERTEX_AUTH_TIMEOUT_MS, "Timed out waiting for GCP credentials");
    let p;
    try {
      p = (await vertexGoogleAuth.getCredentials()).client_email;
    } catch {
      p = undefined;
    }
    identity =
      p ??
      (wizardData.authMethod === "serviceAccount"
        ? `service account (${wizardData.keyFile})`
        : "Application Default Credentials");
  } catch (error) {
    return {
      status: "error",
      ...explainVertexError(error, wizardData),
    };
  }
  let haiku = defaultVertexModels().haiku;
  let m = await checkVertexAuth(wizardData, haiku);
  if (m.ok)
    return {
      status: "ok",
      identity,
      note: `Test request to ${haiku} succeeded.`,
    };
  switch (m.reason) {
    case "auth":
      return {
        status: "error",
        error: "Got a token, but Vertex AI rejected it. The credential may lack the cloud-platform scope.",
      };
    case "permission":
      return {
        status: "error",
        error: `Permission denied calling Vertex AI in project "${wizardData.projectId}". The principal needs the aiplatform.endpoints.predict permission (Vertex AI User role), and the Vertex AI API must be enabled.`,
      };
    case "model":
      return {
        status: "ok",
        identity,
        note: `Credentials work, but ${haiku} returned not-found in ${wizardData.region}. Pin a model you have access to on the next step, or try the 'global' region.`,
      };
    case "network":
      return {
        status: "error",
        error: `Could not reach Vertex AI in region "${wizardData.region}". Check the region name and your network.`,
      };
    case "other":
      return {
        status: "ok",
        identity,
        note: `Credentials work, but the test request to ${haiku} failed. You can pin a different model on the next step.`,
      };
  }
}
//@ chunk-y6fv30yg.js:7316-7374 placement
async function checkVertexAuth(o, l) {
  return probeModelAccess(
    () => createVertexProbeClient(o),
    l,
    () => "auth",
  );
}
//@ chunk-y6fv30yg.js:7374-7762 placement
async function createVertexProbeClient(o) {
  let [{ AnthropicVertex: l }, { getProxyFetchOptions: c }] = await Promise.all([
    import("./chunk-xa96axyz.js"),
    import("./chunk-amdegp7s.js"),
  ]);
  let googleAuth = await buildVertexGoogleAuth(vertexCredentialSource(o), o.projectId);
  return suppressVertexAuthRejection(
    new l({
      region: o.region,
      projectId: o.projectId,
      googleAuth,
      maxRetries: 0,
      defaultHeaders: {
        ...getForwardableEnvHeaders(),
        ...vertexResidualCredentialPins(),
      },
      ...CLOUD_AUTH_SLOT,
      timeout: 15000,
      fetchOptions: c({
        url: env.ANTHROPIC_VERTEX_BASE_URL || getVertexBaseUrlForRegion(o.region),
      }),
    }),
  );
}
//@ chunk-y6fv30yg.js:7762-7809 placement
var ADC_LOGIN_COMMAND = "gcloud auth application-default login";
//@ chunk-y6fv30yg.js:7809-9569 placement
function explainVertexError(error, l) {
  let c = error?.message ?? String(error);
  if (/ENOENT|no such file/i.test(c)) {
    if (l.authMethod === "serviceAccount" && l.keyFile && c.includes(l.keyFile))
      return {
        error: `Service account key file not found: ${l.keyFile}`,
      };
    let m = env.GOOGLE_APPLICATION_CREDENTIALS
      ? ["GOOGLE_APPLICATION_CREDENTIALS", env.GOOGLE_APPLICATION_CREDENTIALS]
      : env.google_application_credentials
        ? ["google_application_credentials", env.google_application_credentials]
        : undefined;
    if (m && l.authMethod !== "serviceAccount" && c.includes(`The file at ${m[1]} does not exist`))
      return {
        error: `Key file named by ${m[0]} not found: ${m[1]}`,
      };
  }
  if (/Could not load the default credentials/i.test(c))
    return l.authMethod === "adc"
      ? {
          error: "No Application Default Credentials found. Run:",
          command: ADC_LOGIN_COMMAND,
        }
      : {
          error:
            "No GCP credentials found in the environment. Set GOOGLE_APPLICATION_CREDENTIALS or run gcloud auth application-default login.",
        };
  if (/invalid_grant|Token has been expired|reauth/i.test(c)) {
    if (l.authMethod === "serviceAccount")
      return {
        error:
          "Service account credentials have been revoked or expired. Obtain a new key file from GCP IAM (IAM \u2192 Service Accounts \u2192 Keys \u2192 Add Key).",
      };
    if (l.authMethod === "adc")
      return {
        error: "GCP credentials expired. Run:",
        command: ADC_LOGIN_COMMAND,
      };
    return {
      error:
        "GCP credentials in the environment have expired or been revoked. Refresh them (gcloud auth application-default login for ADC, or replace the GOOGLE_APPLICATION_CREDENTIALS key file).",
    };
  }
  if (/Unable to detect a Project Id/i.test(c))
    return {
      error:
        "Could not determine a GCP project from the credentials. Go back and set the project ID explicitly.",
    };
  if (/Timed out waiting for GCP/i.test(c))
    return {
      error: "Timed out resolving GCP credentials (no ADC, no key file, and no GCE metadata server).",
      ...(l.authMethod === "adc" && {
        command: ADC_LOGIN_COMMAND,
      }),
    };
  return {
    error: c,
  };
}
//@ chunk-y6fv30yg.js:9569-10314 placement
var VERTEX_PROBE_PROVIDER = {
  reasonLabel: {
    auth: "auth failed",
    permission: "no aiplatform.endpoints.predict permission",
    model: "not enabled in this project",
    network: "unreachable",
    other: "request failed",
  },
  intro:
    "Without pinning, Claude Code uses its built-in defaults. When a new model ships, your install will try to call it even if it is not yet available in your project \u2014 Claude Code will fail to connect to Vertex AI until you enable the model or pin to one you have.",
  resolveTierDefaults: () => {
    let o = defaultVertexModels();
    return Object.fromEntries(
      MODEL_PIN_FAMILIES.map((l) => [
        l,
        {
          fallback: o[l],
        },
      ]),
    );
  },
  listTierCandidates: (o) => knownVertexModelIds(o),
  pickerSubtitle: (o) =>
    `Available ${TIER_LABELS[o]} versions on Vertex AI \xB7 each tested with a one-token request.`,
  preferOnSettle: ["current", "fallback"],
  probe: (o, l) => checkVertexAuth(o, l),
};
//@ chunk-y6fv30yg.js:10314-10446 placement
function VertexModelPinsStep() {
  let l = w(2);
  let { updateWizardData } = useWizard();
  let c;
  if (l[0] !== updateWizardData) {
    c = jsxProd_default(ModelPinStep, {
      provider: VERTEX_PROBE_PROVIDER,
      onPins: updateWizardData,
    });
    l[0] = updateWizardData;
    l[1] = c;
  } else c = l[1];
  return c;
}
//@ chunk-y6fv30yg.js:10446-10450 placement
init_react_production();
//@ chunk-y6fv30yg.js:10533-10958 placement
async function listGcloudConfigurations() {
  let o = new Set();
  let gcloudConfigDir = resolveGcloudConfigDir();
  try {
    let c = join(gcloudConfigDir, "configurations");
    for (let m of await readdir(c)) {
      if (!m.startsWith("config_")) continue;
      try {
        let file = await readFile(join(c, m), "utf8");
        for (let h of file.matchAll(/^project\s*=\s*(\S+)/gm)) {
          let trimmed = h[1]?.trim();
          if (trimmed) o.add(trimmed);
        }
      } catch {}
    }
  } catch {}
  try {
    let c = jsonParse(await readFile(join(gcloudConfigDir, "application_default_credentials.json"), "utf8"));
    if (c.quota_project_id) o.add(c.quota_project_id);
  } catch {}
  return [...o].sort();
}
//@ chunk-y6fv30yg.js:10958-10981 placement
function emptyAccounts() {
  return [];
}
//@ chunk-y6fv30yg.js:10981-11017 placement
function loadAccountsOrEmpty() {
  return listGcloudConfigurations().catch(emptyAccounts);
}
//@ chunk-y6fv30yg.js:11017-11065 placement
function listItem(st) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: st,
    },
    st,
  );
}
//@ chunk-y6fv30yg.js:11065-11091 placement
var MANUAL_PROJECT_VALUE = "__manual__";
var MAX_ACCOUNT_OPTIONS = 12;
//@ chunk-y6fv30yg.js:11091-11359 placement
function VertexProjectStep() {
  let l = w(3);
  let [o] = y(loadAccountsOrEmpty);
  let fallback;
  if (l[0] === MEMO_CACHE_SENTINEL) {
    fallback = jsxProd_default(WizardDialogLayout, {
      subtitle: "GCP project",
      children: jsxProd_default(WorkerBadge, {
        message: "Reading ~/.config/gcloud\u2026",
      }),
    });
    l[0] = fallback;
  } else fallback = l[0];
  let m;
  if (l[1] !== o) {
    m = jsxProd_default(fo, {
      fallback,
      children: jsxProd_default(MemoryStep, {
        projectsPromise: o,
      }),
    });
    l[1] = o;
    l[2] = m;
  } else m = l[2];
  return m;
}
export {
  VertexProjectStep,
  VertexModelPinsStep,
  MAX_ACCOUNT_OPTIONS,
  listItem,
  MANUAL_PROJECT_VALUE,
  probeVertexCredentials,
};
