/**
 * services/orgSurvey/orgSurvey.ts
 *
 * 2.1.316 新增。组织调查问卷数据。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (22)
 * attribution: placement 22
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import {
  getAnthropicApiKeySafe,
  shouldUseWIFAuth,
  isClaudeAISubscriber,
  getOauthAccountInfo,
  getClaudeAIOAuthTokenOriginAsync,
  getSubscriptionType,
} from "../../utils/auth.js";
import { env } from "../../utils/env.js";
import { stripInvisibleChars } from "../../utils/sanitization.js";
import { o, u, Ue, E, M, A, zJt } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { apiClient } from "../routines/routinesApi.js";
import {
  classifyAxiosError,
  sanitizedConnectionCodeLowerForTelemetry,
  getErrnoCode,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";

//@ chunk-18hwfzwa.js:1050360-1050364 placement
j();
//@ chunk-18hwfzwa.js:1050364-1050414 placement
function N4() {
  if (!getAnthropicApiKeySafe() && shouldUseWIFAuth()) return !1;
  return isClaudeAISubscriber();
}
//@ chunk-18hwfzwa.js:1050414-1050625 placement
async function orgSurveyCredentialSource(h, { acceptInjectedTokens: acceptInjectedTokens }) {
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID,
    L = getOauthAccountInfo()?.organizationUuid,
    ee = await getClaudeAIOAuthTokenOriginAsync(h);
  if (ee === "store") return !CLAUDE_CODE_ORGANIZATION_UUID || CLAUDE_CODE_ORGANIZATION_UUID === L;
  if (ee === "env" || ee === "fd") return acceptInjectedTokens && Boolean(CLAUDE_CODE_ORGANIZATION_UUID);
  return !1;
}
//@ chunk-18hwfzwa.js:1050625-1050681 placement
var SC = 2000,
  pho = "How\u2019s working with Claude going?";
//@ chunk-18hwfzwa.js:1050681-1050765 placement
function fho(h) {
  return `Take a few minutes to share thoughts with your ${h} admins.`;
}
//@ chunk-18hwfzwa.js:1050765-1050866 placement
function normalizeSurveyText(h) {
  let trimmed = stripInvisibleChars(h, " ", { keepEmojiJoiners: !0 }).replace(/\s+/g, " ").trim();
  return trimmed === "" ? null : trimmed;
}
//@ chunk-18hwfzwa.js:1050866-1051106 placement
var SURVEY_QUESTION_TYPES = {
  SURVEY_QUESTION_TYPE_MULTI_SELECT: "multi_select",
  SURVEY_QUESTION_TYPE_LONG_TEXT: "text",
  SURVEY_QUESTION_TYPE_SHORT_TEXT: "text",
  SURVEY_QUESTION_TYPE_SINGLE_SELECT: "single_select",
  1: "multi_select",
  2: "text",
  3: "text",
  4: "single_select",
};
//@ chunk-18hwfzwa.js:1051106-1051169 placement
function E$(h) {
  return o().refine((x) => Array.from(x).length <= h);
}
/**
 * 组织问卷题目的 schema：id、类型、题干、是否必答、选项与说明文字。
 */
//@ chunk-18hwfzwa.js:1051169-1051515 placement
var surveyQuestionSchema = DoctorLazy(() =>
    u({
      id: o().regex(/^[A-Za-z0-9_-]{1,16}$/),
      type: Ue([o(), E()]),
      text: E$(1000),
      required: M().default(!1),
      options: A(E$(200)).max(8).default([]),
      helperText: E$(500).default(""),
    }),
  ),
  pendingSurveyResponseSchema = DoctorLazy(() =>
    u({
      pending: u({
        surveyUuid: zJt(),
        questions: A(surveyQuestionSchema()).min(1).max(7),
        inviteHeadline: E$(1000).default(""),
        inviteMessage: E$(2000).default(""),
      }).optional(),
    }),
  );
//@ chunk-18hwfzwa.js:1051515-1052638 placement
function parseOrgSurvey(h, x) {
  let { orgName: orgName, ownerKey: ownerKey } = x,
    safeParse = pendingSurveyResponseSchema().safeParse(h);
  if (!safeParse.success) return { survey: null, reason: "parse_failed" };
  let pending = safeParse.data.pending;
  if (pending === void 0) return { survey: null, reason: "none" };
  if (new Set(pending.questions.map((question) => question.id)).size !== pending.questions.length)
    return { survey: null, reason: "duplicate_question_id" };
  let Be = [];
  for (let question of pending.questions) {
    let We = Object.hasOwn(SURVEY_QUESTION_TYPES, question.type)
        ? SURVEY_QUESTION_TYPES[question.type]
        : void 0,
      ze = normalizeSurveyText(question.text);
    if (We === void 0 || ze === null) return { survey: null, reason: "unrenderable_question" };
    let Xe = {
      id: question.id,
      text: ze,
      helperText: normalizeSurveyText(question.helperText),
      required: question.required,
    };
    if (We === "text") {
      Be.push({ ...Xe, kind: We });
      continue;
    }
    let rt = [];
    for (let option of question.options) {
      let At = normalizeSurveyText(option);
      if (At === null) return { survey: null, reason: "unrenderable_question" };
      rt.push({ value: option, label: At });
    }
    if (
      rt.length === 0 ||
      new Set(rt.map((kt) => kt.value)).size !== rt.length ||
      new Set(rt.map((kt) => kt.label)).size !== rt.length
    )
      return { survey: null, reason: "unrenderable_question" };
    Be.push({ ...Xe, kind: We, options: rt });
  }
  return {
    survey: {
      surveyUuid: pending.surveyUuid,
      ownerKey: ownerKey,
      orgName: orgName,
      headline: normalizeSurveyText(pending.inviteHeadline) ?? pho,
      message: normalizeSurveyText(pending.inviteMessage) ?? fho(orgName),
      questions: Be,
    },
  };
}
//@ chunk-18hwfzwa.js:1052638-1052705 placement
var TENGU_STEADY_MITTEN = "tengu_steady_mitten",
  M$ = 21600000,
  Sho = 86400000,
  bho = 3600000;
//@ chunk-18hwfzwa.js:1052705-1052813 placement
async function checkOrgSurveyEligibilitySafe(h) {
  try {
    return await orgSurveyEligibility(h);
  } catch {
    return (logFeatureSad("cli_org_survey", "skip_caller_error"), "error");
  }
}
//@ chunk-18hwfzwa.js:1052813-1052927 placement
function getOrgSurveyOwnerKey() {
  let h = getOauthAccountInfo();
  return h?.accountUuid && h.organizationUuid ? `${h.accountUuid}:${h.organizationUuid}` : null;
}
//@ chunk-18hwfzwa.js:1052927-1053414 placement
async function orgSurveyEligibility(h) {
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return null;
  if (isEssentialTrafficOnly()) return null;
  if (getAPIProvider() !== "firstParty") return null;
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STEADY_MITTEN, !1)) return null;
  if (getSubscriptionType() !== "enterprise") return null;
  if (!N4()) return null;
  if (!(await orgSurveyCredentialSource(h, { acceptInjectedTokens: !1 }))) return null;
  let x = getOauthAccountInfo(),
    D = normalizeSurveyText(x?.organizationName ?? "");
  if (!x?.organizationUuid || D === null) return (logFeatureSad("cli_org_survey", "skip_no_org_name"), null);
  return { orgName: D, orgUuid: x.organizationUuid, checkKey: `${x.accountUuid}:${x.organizationUuid}` };
}
//@ chunk-18hwfzwa.js:1053414-1053773 placement
var ORG_SURVEY_RPC = 3000,
  Cho = "/claudeai-rpc/anthropic.loupe.api.v1alpha.OrgSurveyService",
  _ho = {
    auth: "teleport-org",
    isBackground: !0,
    timeout: 1e4,
    headers: { "Connect-Protocol-Version": "1" },
    validateStatus: (h) => h < 500,
  },
  Tho = {
    GetPendingSurvey: "get_pending",
    RecordSurveyMilestone: "record_milestone",
    DismissSurvey: "dismiss",
    SubmitSurveyResponse: "submit",
  },
  Pho = DoctorLazy(() => u({ message: o() }));
//@ chunk-18hwfzwa.js:1053773-1053844 placement
function Cnt(h, x) {
  (h === "SubmitSurveyResponse" ? logFeatureBad : logFeatureSad)("cli_org_survey", x);
}
//@ chunk-18hwfzwa.js:1053844-1054658 placement
async function callOrgSurveyRpc(h, x, D) {
  let L = Tho[h],
    ee;
  try {
    ee = await apiClient.post(`${Cho}/${h}`, x, D);
  } catch (error) {
    let { kind: kind, status: status } = classifyAxiosError(error),
      ze =
        status !== void 0
          ? `http_${status}`
          : kind === "http"
            ? (sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(error)) ?? "no_response")
            : kind;
    return (
      Cnt(h, `${L}_${ze}`),
      logForDebugging(`org survey ${h} failed: ${ze}`, { level: "warn" }),
      { kind: "transient" }
    );
  }
  if (!ee.ok)
    return (logFeatureSad("cli_org_survey", `${L}_${ee.reason.replaceAll("-", "_")}`), { kind: "skipped" });
  if ((ee.status >= 200 && ee.status < 300) || (h === "GetPendingSurvey" && ee.status === 404))
    logFeatureOk("cli_org_survey");
  else Cnt(h, `${L}_http_${ee.status}`);
  if (ee.status >= 200 && ee.status < 300) return { kind: "ok", data: ee.data };
  if (ee.status === 429) return { kind: "transient" };
  let ke = Pho().safeParse(ee.data).data?.message,
    Re = ke !== void 0 && /^[a-z_]{1,64}$/.test(ke) ? ke : void 0;
  return (
    logForDebugging(`org survey ${h} refused: http_${ee.status}`),
    { kind: "refused", status: ee.status, code: Re }
  );
}
//@ chunk-18hwfzwa.js:1054658-1054727 placement
function Tnt(h) {
  let orgSurveyCheck = getGlobalConfig().orgSurveyCheck;
  return orgSurveyCheck?.key === h ? orgSurveyCheck : void 0;
}
//@ chunk-18hwfzwa.js:1054727-1054804 placement
function Aho(h, x) {
  let D = Tnt(h)?.nextCheckAt;
  return typeof D !== "number" || x >= D;
}
//@ chunk-18hwfzwa.js:1054804-1055005 placement
function saveOrgSurveyCheck(h, x, D) {
  saveGlobalConfig((L) => {
    let ee = L.orgSurveyCheck?.key === h ? L.orgSurveyCheck : {};
    return { ...L, orgSurveyCheck: { ...ee, ...x, key: h } };
  }, D).catch(() => {
    logForDebugging("org survey check could not be saved", { level: "warn" });
  });
}
//@ chunk-18hwfzwa.js:1055005-1057797 placement
function checkPendingOrgSurvey({ credentials: credentials, storageV5: storageV5, now: now = Date.now }) {
  let L = { ..._ho, credentials: credentials, storageV5: storageV5 };
  async function ee(Re) {
    let Be = await checkOrgSurveyEligibilitySafe(credentials);
    if (Be !== null && Be !== "error" && Be.checkKey !== Re.ownerKey)
      return (logFeatureSad("cli_org_survey", "skip_login_changed"), null);
    return Be;
  }
  function ke(Re, Be) {
    return callOrgSurveyRpc("DismissSurvey", { organizationUuid: Re.orgUuid, surveyUuid: Be }, L);
  }
  return {
    async getPendingSurvey() {
      let Re = await checkOrgSurveyEligibilitySafe(credentials);
      if (Re === null || Re === "error" || !Aho(Re.checkKey, now())) return null;
      let Be = await callOrgSurveyRpc(
        "GetPendingSurvey",
        { organizationUuid: Re.orgUuid, surface: "SURVEY_SURFACE_CODE" },
        L,
      );
      switch (Be.kind) {
        case "skipped":
          return null;
        case "transient":
          return (saveOrgSurveyCheck(Re.checkKey, { nextCheckAt: now() + bho }, storageV5), null);
        case "refused":
          return (
            saveOrgSurveyCheck(
              Re.checkKey,
              { nextCheckAt: now() + (Be.status === 404 ? M$ : Sho) },
              storageV5,
            ),
            null
          );
        case "ok": {
          let He = parseOrgSurvey(Be.data, { orgName: Re.orgName, ownerKey: Re.checkKey });
          if (He.survey === null) {
            if (He.reason !== "none") logFeatureSad("cli_org_survey", `pending_${He.reason}`);
            return (saveOrgSurveyCheck(Re.checkKey, { nextCheckAt: now() + M$ }, storageV5), null);
          }
          if (Tnt(Re.checkKey)?.dismissedSurveyUuid === He.survey.surveyUuid) {
            let We = await ke(Re, He.survey.surveyUuid);
            return (
              saveOrgSurveyCheck(
                Re.checkKey,
                { nextCheckAt: now() + M$, ...(We.kind === "ok" && { dismissedSurveyUuid: void 0 }) },
                storageV5,
              ),
              null
            );
          }
          return He.survey;
        }
      }
    },
    async isStillPending(Re) {
      let Be = await ee(Re);
      if (Be === null) return !1;
      if (Be === "error") return !0;
      let He = await callOrgSurveyRpc(
        "GetPendingSurvey",
        { organizationUuid: Be.orgUuid, surface: "SURVEY_SURFACE_CODE" },
        { ...L, timeout: ORG_SURVEY_RPC },
      );
      if (He.kind === "refused") return ![401, 403, 404].includes(He.status);
      if (He.kind !== "ok") return He.kind === "transient";
      let safeParse = pendingSurveyResponseSchema().safeParse(He.data);
      return !safeParse.success || safeParse.data.pending?.surveyUuid === Re.surveyUuid;
    },
    async recordMilestone(Re, Be) {
      let He = await ee(Re);
      if (He === null || He === "error") return !1;
      return (
        (
          await callOrgSurveyRpc(
            "RecordSurveyMilestone",
            {
              organizationUuid: He.orgUuid,
              surveyUuid: Re.surveyUuid,
              milestone: Be === "shown" ? "SURVEY_MILESTONE_SHOWN" : "SURVEY_MILESTONE_STARTED",
            },
            L,
          )
        ).kind === "ok"
      );
    },
    async dismissSurvey(Re) {
      if (getOrgSurveyOwnerKey() === Re.ownerKey)
        saveOrgSurveyCheck(
          Re.ownerKey,
          { nextCheckAt: now() + M$, dismissedSurveyUuid: Re.surveyUuid },
          storageV5,
        );
      let Be = await ee(Re);
      if (Be === null || Be === "error") return !1;
      let He = (await ke(Be, Re.surveyUuid)).kind === "ok";
      if (He) saveOrgSurveyCheck(Re.ownerKey, { dismissedSurveyUuid: void 0 }, storageV5);
      return He;
    },
    async submitSurvey(Re, Be) {
      let He = await ee(Re);
      if (He === null) return "closed";
      if (He === "error") return "failed";
      let We = await callOrgSurveyRpc(
          "SubmitSurveyResponse",
          {
            organizationUuid: He.orgUuid,
            surveyUuid: Re.surveyUuid,
            surface: "SURVEY_SURFACE_CODE",
            answers: Be.map((Xe) =>
              "text" in Xe
                ? { questionId: Xe.questionId, text: Xe.text }
                : { questionId: Xe.questionId, options: { selected: Xe.selected } },
            ),
          },
          L,
        ),
        ze =
          We.kind === "ok" || (We.kind === "refused" && We.code === "survey_already_answered")
            ? "submitted"
            : We.kind === "refused" && ([401, 403, 404].includes(We.status) || We.code === "survey_not_open")
              ? "closed"
              : "failed";
      if (ze !== "failed") saveOrgSurveyCheck(He.checkKey, { nextCheckAt: now() + M$ }, storageV5);
      return ze;
    },
  };
}
//@ chunk-18hwfzwa.js:1057797-1057801 placement
j();

export { SC, checkPendingOrgSurvey, N4, orgSurveyCredentialSource };
