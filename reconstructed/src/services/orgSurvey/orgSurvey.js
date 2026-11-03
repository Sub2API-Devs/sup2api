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
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { string, u, union, E, M, array, zJt } from "../../../vendor/zod/v4/classic/schemas.js";
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
init_react_production();
//@ chunk-18hwfzwa.js:1050364-1050414 placement
/**
 * 是否可展示组织问卷（非 WIF、是 claude.ai 订阅者）。
 */
function isSurveyEligible() {
  if (!getAnthropicApiKeySafe() && shouldUseWIFAuth()) return false;
  return isClaudeAISubscriber();
}
//@ chunk-18hwfzwa.js:1050414-1050625 placement
async function orgSurveyCredentialSource(h, { acceptInjectedTokens }) {
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(h);
  if (claudeAIOAuthTokenOrigin === "store")
    return !CLAUDE_CODE_ORGANIZATION_UUID || CLAUDE_CODE_ORGANIZATION_UUID === organizationUuid;
  if (claudeAIOAuthTokenOrigin === "env" || claudeAIOAuthTokenOrigin === "fd")
    return acceptInjectedTokens && Boolean(CLAUDE_CODE_ORGANIZATION_UUID);
  return false;
}
//@ chunk-18hwfzwa.js:1050625-1050681 placement
/**
 * 问卷邀请的默认标题。
 */
var DEFAULT_HEADLINE_DELAY_MS = 2000;
var DEFAULT_SURVEY_HEADLINE = "How\u2019s working with Claude going?";
//@ chunk-18hwfzwa.js:1050681-1050765 placement
/**
 * 生成 “与 <组织> 管理员分享想法” 的邀请文案。
 */
function defaultInviteMessage(orgName) {
  return `Take a few minutes to share thoughts with your ${orgName} admins.`;
}
//@ chunk-18hwfzwa.js:1050765-1050866 placement
function normalizeSurveyText(h) {
  let trimmed = stripInvisibleChars(h, " ", {
    keepEmojiJoiners: true,
  })
    .replace(/\s+/g, " ")
    .trim();
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
/**
 * 限制字符数的文本 schema 工厂。
 */
function boundedTextSchema(h) {
  return string().refine((x) => Array.from(x).length <= h);
}
//@ chunk-18hwfzwa.js:1051169-1051515 placement
/**
 * 组织问卷题目的 schema：id、类型、题干、是否必答、选项与说明文字。
 */
var surveyQuestionSchema = DoctorLazy(() =>
  u({
    id: string().regex(/^[A-Za-z0-9_-]{1,16}$/),
    type: union([string(), E()]),
    text: boundedTextSchema(1000),
    required: M().default(false),
    options: array(boundedTextSchema(200)).max(8).default([]),
    helperText: boundedTextSchema(500).default(""),
  }),
);
var pendingSurveyResponseSchema = DoctorLazy(() =>
  u({
    pending: u({
      surveyUuid: zJt(),
      questions: array(surveyQuestionSchema()).min(1).max(7),
      inviteHeadline: boundedTextSchema(1000).default(""),
      inviteMessage: boundedTextSchema(2000).default(""),
    }).optional(),
  }),
);
//@ chunk-18hwfzwa.js:1051515-1052638 placement
function parseOrgSurvey(h, x) {
  let { orgName, ownerKey } = x;
  let ee = pendingSurveyResponseSchema().safeParse(h);
  if (!ee.success)
    return {
      survey: null,
      reason: "parse_failed",
    };
  let pending = ee.data.pending;
  if (pending === undefined)
    return {
      survey: null,
      reason: "none",
    };
  if (new Set(pending.questions.map((question) => question.id)).size !== pending.questions.length)
    return {
      survey: null,
      reason: "duplicate_question_id",
    };
  let Be = [];
  for (let question of pending.questions) {
    let We = Object.hasOwn(SURVEY_QUESTION_TYPES, question.type)
      ? SURVEY_QUESTION_TYPES[question.type]
      : undefined;
    let ze = normalizeSurveyText(question.text);
    if (We === undefined || ze === null)
      return {
        survey: null,
        reason: "unrenderable_question",
      };
    let Xe = {
      id: question.id,
      text: ze,
      helperText: normalizeSurveyText(question.helperText),
      required: question.required,
    };
    if (We === "text") {
      Be.push({
        ...Xe,
        kind: We,
      });
      continue;
    }
    let rt = [];
    for (let option of question.options) {
      let At = normalizeSurveyText(option);
      if (At === null)
        return {
          survey: null,
          reason: "unrenderable_question",
        };
      rt.push({
        value: option,
        label: At,
      });
    }
    if (
      rt.length === 0 ||
      new Set(rt.map((kt) => kt.value)).size !== rt.length ||
      new Set(rt.map((kt) => kt.label)).size !== rt.length
    )
      return {
        survey: null,
        reason: "unrenderable_question",
      };
    Be.push({
      ...Xe,
      kind: We,
      options: rt,
    });
  }
  return {
    survey: {
      surveyUuid: pending.surveyUuid,
      ownerKey,
      orgName,
      headline: normalizeSurveyText(pending.inviteHeadline) ?? DEFAULT_SURVEY_HEADLINE,
      message: normalizeSurveyText(pending.inviteMessage) ?? defaultInviteMessage(orgName),
      questions: Be,
    },
  };
}
//@ chunk-18hwfzwa.js:1052638-1052705 placement
/**
 * 出错后的重试间隔（1 小时）。
 */
var TENGU_STEADY_MITTEN = "tengu_steady_mitten";
var RETRY_404_MS = 21600000;
var RETRY_DEFAULT_MS = 86400000;
var RETRY_ERROR_MS = 3600000;
//@ chunk-18hwfzwa.js:1052705-1052813 placement
async function checkOrgSurveyEligibilitySafe(credentials) {
  try {
    return await orgSurveyEligibility(credentials);
  } catch {
    logFeatureSad("cli_org_survey", "skip_caller_error");
    return "error";
  }
}
//@ chunk-18hwfzwa.js:1052813-1052927 placement
function getOrgSurveyOwnerKey() {
  let oauthAccountInfo = getOauthAccountInfo();
  return oauthAccountInfo?.accountUuid && oauthAccountInfo.organizationUuid
    ? `${oauthAccountInfo.accountUuid}:${oauthAccountInfo.organizationUuid}`
    : null;
}
//@ chunk-18hwfzwa.js:1052927-1053414 placement
async function orgSurveyEligibility(h) {
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return null;
  if (isEssentialTrafficOnly()) return null;
  if (getAPIProvider() !== "firstParty") return null;
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STEADY_MITTEN, false)) return null;
  if (getSubscriptionType() !== "enterprise") return null;
  if (!isSurveyEligible()) return null;
  if (
    !(await orgSurveyCredentialSource(h, {
      acceptInjectedTokens: false,
    }))
  )
    return null;
  let oauthAccountInfo = getOauthAccountInfo();
  let D = normalizeSurveyText(oauthAccountInfo?.organizationName ?? "");
  if (!oauthAccountInfo?.organizationUuid || D === null) {
    logFeatureSad("cli_org_survey", "skip_no_org_name");
    return null;
  }
  return {
    orgName: D,
    orgUuid: oauthAccountInfo.organizationUuid,
    checkKey: `${oauthAccountInfo.accountUuid}:${oauthAccountInfo.organizationUuid}`,
  };
}
//@ chunk-18hwfzwa.js:1053414-1053773 placement
/**
 * 问卷消息的 schema。
 */
var ORG_SURVEY_RPC = 3000;
var ORG_SURVEY_RPC_PATH = "/claudeai-rpc/anthropic.loupe.api.v1alpha.OrgSurveyService";
var ORG_SURVEY_REQUEST_OPTIONS = {
  auth: "teleport-org",
  isBackground: true,
  timeout: 1e4,
  headers: {
    "Connect-Protocol-Version": "1",
  },
  validateStatus: (h) => h < 500,
};
var ORG_SURVEY_METHODS = {
  GetPendingSurvey: "get_pending",
  RecordSurveyMilestone: "record_milestone",
  DismissSurvey: "dismiss",
  SubmitSurveyResponse: "submit",
};
var surveyMessageSchema = DoctorLazy(() =>
  u({
    message: string(),
  }),
);
//@ chunk-18hwfzwa.js:1053773-1053844 placement
/**
 * 记录问卷请求失败（提交类用 bad，其他用 sad）。
 */
function logSurveyFailure(h, x) {
  (h === "SubmitSurveyResponse" ? logFeatureBad : logFeatureSad)("cli_org_survey", x);
}
//@ chunk-18hwfzwa.js:1053844-1054658 placement
async function callOrgSurveyRpc(h, x, D) {
  let L = ORG_SURVEY_METHODS[h];
  let ee;
  try {
    ee = await apiClient.post(`${ORG_SURVEY_RPC_PATH}/${h}`, x, D);
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    let ze =
      status !== undefined
        ? `http_${status}`
        : kind === "http"
          ? (sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(error)) ?? "no_response")
          : kind;
    logSurveyFailure(h, `${L}_${ze}`);
    logForDebugging(`org survey ${h} failed: ${ze}`, {
      level: "warn",
    });
    return {
      kind: "transient",
    };
  }
  if (!ee.ok) {
    logFeatureSad("cli_org_survey", `${L}_${ee.reason.replaceAll("-", "_")}`);
    return {
      kind: "skipped",
    };
  }
  if ((ee.status >= 200 && ee.status < 300) || (h === "GetPendingSurvey" && ee.status === 404))
    logFeatureOk("cli_org_survey");
  else logSurveyFailure(h, `${L}_http_${ee.status}`);
  if (ee.status >= 200 && ee.status < 300)
    return {
      kind: "ok",
      data: ee.data,
    };
  if (ee.status === 429)
    return {
      kind: "transient",
    };
  let message = surveyMessageSchema().safeParse(ee.data).data?.message;
  let code = message !== undefined && /^[a-z_]{1,64}$/.test(message) ? message : undefined;
  logForDebugging(`org survey ${h} refused: http_${ee.status}`);
  return {
    kind: "refused",
    status: ee.status,
    code,
  };
}
//@ chunk-18hwfzwa.js:1054658-1054727 placement
/**
 * 取当前问卷检查记录（键不匹配返回 undefined）。
 */
function getSurveyCheck(h) {
  let orgSurveyCheck = getGlobalConfig().orgSurveyCheck;
  return orgSurveyCheck?.key === h ? orgSurveyCheck : undefined;
}
//@ chunk-18hwfzwa.js:1054727-1054804 placement
/**
 * 判断现在是否到了下次检查时间。
 */
function isSurveyCheckDue(checkKey, x) {
  let nextCheckAt = getSurveyCheck(checkKey)?.nextCheckAt;
  return typeof nextCheckAt !== "number" || x >= nextCheckAt;
}
//@ chunk-18hwfzwa.js:1054804-1055005 placement
function saveOrgSurveyCheck(h, x, storageV5) {
  saveGlobalConfig((L) => {
    let orgSurveyCheck = L.orgSurveyCheck?.key === h ? L.orgSurveyCheck : {};
    return {
      ...L,
      orgSurveyCheck: {
        ...orgSurveyCheck,
        ...x,
        key: h,
      },
    };
  }, storageV5).catch(() => {
    logForDebugging("org survey check could not be saved", {
      level: "warn",
    });
  });
}
//@ chunk-18hwfzwa.js:1055005-1057797 placement
function checkPendingOrgSurvey({ credentials, storageV5, now = Date.now }) {
  let L = {
    ...ORG_SURVEY_REQUEST_OPTIONS,
    credentials,
    storageV5,
  };
  async function ee(Re) {
    let Be = await checkOrgSurveyEligibilitySafe(credentials);
    if (Be !== null && Be !== "error" && Be.checkKey !== Re.ownerKey) {
      logFeatureSad("cli_org_survey", "skip_login_changed");
      return null;
    }
    return Be;
  }
  function ke(Re, surveyUuid) {
    return callOrgSurveyRpc(
      "DismissSurvey",
      {
        organizationUuid: Re.orgUuid,
        surveyUuid,
      },
      L,
    );
  }
  return {
    async getPendingSurvey() {
      let Re = await checkOrgSurveyEligibilitySafe(credentials);
      if (Re === null || Re === "error" || !isSurveyCheckDue(Re.checkKey, now())) return null;
      let Be = await callOrgSurveyRpc(
        "GetPendingSurvey",
        {
          organizationUuid: Re.orgUuid,
          surface: "SURVEY_SURFACE_CODE",
        },
        L,
      );
      switch (Be.kind) {
        case "skipped":
          return null;
        case "transient":
          saveOrgSurveyCheck(
            Re.checkKey,
            {
              nextCheckAt: now() + RETRY_ERROR_MS,
            },
            storageV5,
          );
          return null;
        case "refused":
          saveOrgSurveyCheck(
            Re.checkKey,
            {
              nextCheckAt: now() + (Be.status === 404 ? RETRY_404_MS : RETRY_DEFAULT_MS),
            },
            storageV5,
          );
          return null;
        case "ok": {
          let orgSurvey = parseOrgSurvey(Be.data, {
            orgName: Re.orgName,
            ownerKey: Re.checkKey,
          });
          if (orgSurvey.survey === null) {
            if (orgSurvey.reason !== "none") logFeatureSad("cli_org_survey", `pending_${orgSurvey.reason}`);
            saveOrgSurveyCheck(
              Re.checkKey,
              {
                nextCheckAt: now() + RETRY_404_MS,
              },
              storageV5,
            );
            return null;
          }
          if (getSurveyCheck(Re.checkKey)?.dismissedSurveyUuid === orgSurvey.survey.surveyUuid) {
            let We = await ke(Re, orgSurvey.survey.surveyUuid);
            saveOrgSurveyCheck(
              Re.checkKey,
              {
                nextCheckAt: now() + RETRY_404_MS,
                ...(We.kind === "ok" && {
                  dismissedSurveyUuid: undefined,
                }),
              },
              storageV5,
            );
            return null;
          }
          return orgSurvey.survey;
        }
      }
    },
    async isStillPending(Re) {
      let Be = await ee(Re);
      if (Be === null) return false;
      if (Be === "error") return true;
      let He = await callOrgSurveyRpc(
        "GetPendingSurvey",
        {
          organizationUuid: Be.orgUuid,
          surface: "SURVEY_SURFACE_CODE",
        },
        {
          ...L,
          timeout: ORG_SURVEY_RPC,
        },
      );
      if (He.kind === "refused") return ![401, 403, 404].includes(He.status);
      if (He.kind !== "ok") return He.kind === "transient";
      let We = pendingSurveyResponseSchema().safeParse(He.data);
      return !We.success || We.data.pending?.surveyUuid === Re.surveyUuid;
    },
    async recordMilestone(Re, Be) {
      let He = await ee(Re);
      if (He === null || He === "error") return false;
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
          {
            nextCheckAt: now() + RETRY_404_MS,
            dismissedSurveyUuid: Re.surveyUuid,
          },
          storageV5,
        );
      let Be = await ee(Re);
      if (Be === null || Be === "error") return false;
      let He = (await ke(Be, Re.surveyUuid)).kind === "ok";
      if (He)
        saveOrgSurveyCheck(
          Re.ownerKey,
          {
            dismissedSurveyUuid: undefined,
          },
          storageV5,
        );
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
              ? {
                  questionId: Xe.questionId,
                  text: Xe.text,
                }
              : {
                  questionId: Xe.questionId,
                  options: {
                    selected: Xe.selected,
                  },
                },
          ),
        },
        L,
      );
      let ze =
        We.kind === "ok" || (We.kind === "refused" && We.code === "survey_already_answered")
          ? "submitted"
          : We.kind === "refused" && ([401, 403, 404].includes(We.status) || We.code === "survey_not_open")
            ? "closed"
            : "failed";
      if (ze !== "failed")
        saveOrgSurveyCheck(
          He.checkKey,
          {
            nextCheckAt: now() + RETRY_404_MS,
          },
          storageV5,
        );
      return ze;
    },
  };
}
//@ chunk-18hwfzwa.js:1057797-1057801 placement
init_react_production();
export { DEFAULT_HEADLINE_DELAY_MS, checkPendingOrgSurvey, isSurveyEligible, orgSurveyCredentialSource };
