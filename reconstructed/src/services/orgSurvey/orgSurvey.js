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
import {
  stringSchema,
  objectSchema,
  union,
  numberSchema,
  booleanSchema,
  array,
  uuidSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1050360-1050364 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1050360", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1050364-1050414 placement
/**
 * 是否可展示组织问卷（非 WIF、是 claude.ai 订阅者）。
 */
function isSurveyEligible() {
  if (!getAnthropicApiKeySafe() && shouldUseWIFAuth()) return false;
  return isClaudeAISubscriber();
}
//@ chunk-18hwfzwa.js:1050414-1050625 placement
async function orgSurveyCredentialSource(credentials, { acceptInjectedTokens }) {
  let CLAUDE_CODE_ORGANIZATION_UUID = env.CLAUDE_CODE_ORGANIZATION_UUID;
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  let claudeAIOAuthTokenOrigin = await getClaudeAIOAuthTokenOriginAsync(credentials);
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
function normalizeSurveyText(text) {
  let trimmed = stripInvisibleChars(text, " ", {
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
function boundedTextSchema(maxChars) {
  return stringSchema().refine((value) => Array.from(value).length <= maxChars);
}
//@ chunk-18hwfzwa.js:1051169-1051515 placement
/**
 * 组织问卷题目的 schema：id、类型、题干、是否必答、选项与说明文字。
 */
var surveyQuestionSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var pendingSurveyResponseSchema;
deferInit("chunk-18hwfzwa.js:1051169", () => {
  surveyQuestionSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().regex(/^[A-Za-z0-9_-]{1,16}$/),
      type: union([stringSchema(), numberSchema()]),
      text: boundedTextSchema(1000),
      required: booleanSchema().default(false),
      options: array(boundedTextSchema(200)).max(8).default([]),
      helperText: boundedTextSchema(500).default(""),
    }),
  );
  pendingSurveyResponseSchema = DoctorLazy(() =>
    objectSchema({
      pending: objectSchema({
        surveyUuid: uuidSchema(),
        questions: array(surveyQuestionSchema()).min(1).max(7),
        inviteHeadline: boundedTextSchema(1000).default(""),
        inviteMessage: boundedTextSchema(2000).default(""),
      }).optional(),
    }),
  );
});
//@ chunk-18hwfzwa.js:1051515-1052638 placement
function parseOrgSurvey(payload, context) {
  let { orgName, ownerKey } = context;
  let parsed = pendingSurveyResponseSchema().safeParse(payload);
  if (!parsed.success)
    return {
      survey: null,
      reason: "parse_failed",
    };
  let pending = parsed.data.pending;
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
  let questions = [];
  for (let question of pending.questions) {
    let questionType = Object.hasOwn(SURVEY_QUESTION_TYPES, question.type)
      ? SURVEY_QUESTION_TYPES[question.type]
      : undefined;
    let text = normalizeSurveyText(question.text);
    if (questionType === undefined || text === null)
      return {
        survey: null,
        reason: "unrenderable_question",
      };
    let common = {
      id: question.id,
      text,
      helperText: normalizeSurveyText(question.helperText),
      required: question.required,
    };
    if (questionType === "text") {
      questions.push({
        ...common,
        kind: questionType,
      });
      continue;
    }
    let options = [];
    for (let option of question.options) {
      let label = normalizeSurveyText(option);
      if (label === null)
        return {
          survey: null,
          reason: "unrenderable_question",
        };
      options.push({
        value: option,
        label,
      });
    }
    if (
      options.length === 0 ||
      new Set(options.map((option) => option.value)).size !== options.length ||
      new Set(options.map((option) => option.label)).size !== options.length
    )
      return {
        survey: null,
        reason: "unrenderable_question",
      };
    questions.push({
      ...common,
      kind: questionType,
      options,
    });
  }
  return {
    survey: {
      surveyUuid: pending.surveyUuid,
      ownerKey,
      orgName,
      headline: normalizeSurveyText(pending.inviteHeadline) ?? DEFAULT_SURVEY_HEADLINE,
      message: normalizeSurveyText(pending.inviteMessage) ?? defaultInviteMessage(orgName),
      questions,
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
async function orgSurveyEligibility(credentials) {
  if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return null;
  if (isEssentialTrafficOnly()) return null;
  if (getAPIProvider() !== "firstParty") return null;
  if (!getFeatureValue_CACHED_MAY_BE_STALE(TENGU_STEADY_MITTEN, false)) return null;
  if (getSubscriptionType() !== "enterprise") return null;
  if (!isSurveyEligible()) return null;
  if (
    !(await orgSurveyCredentialSource(credentials, {
      acceptInjectedTokens: false,
    }))
  )
    return null;
  let oauthAccountInfo = getOauthAccountInfo();
  let orgName = normalizeSurveyText(oauthAccountInfo?.organizationName ?? "");
  if (!oauthAccountInfo?.organizationUuid || orgName === null) {
    logFeatureSad("cli_org_survey", "skip_no_org_name");
    return null;
  }
  return {
    orgName,
    orgUuid: oauthAccountInfo.organizationUuid,
    checkKey: `${oauthAccountInfo.accountUuid}:${oauthAccountInfo.organizationUuid}`,
  };
}
//@ chunk-18hwfzwa.js:1053414-1053773 placement
/**
 * 问卷消息的 schema。
 */
var ORG_SURVEY_RPC; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var ORG_SURVEY_RPC_PATH;
var ORG_SURVEY_REQUEST_OPTIONS;
var ORG_SURVEY_METHODS;
var surveyMessageSchema;
deferInit("chunk-18hwfzwa.js:1053414", () => {
  ORG_SURVEY_RPC = 3000;
  ORG_SURVEY_RPC_PATH = "/claudeai-rpc/anthropic.loupe.api.v1alpha.OrgSurveyService";
  ORG_SURVEY_REQUEST_OPTIONS = {
    auth: "teleport-org",
    isBackground: true,
    timeout: 1e4,
    headers: {
      "Connect-Protocol-Version": "1",
    },
    validateStatus: (status) => status < 500,
  };
  ORG_SURVEY_METHODS = {
    GetPendingSurvey: "get_pending",
    RecordSurveyMilestone: "record_milestone",
    DismissSurvey: "dismiss",
    SubmitSurveyResponse: "submit",
  };
  surveyMessageSchema = DoctorLazy(() =>
    objectSchema({
      message: stringSchema(),
    }),
  );
});
//@ chunk-18hwfzwa.js:1053773-1053844 placement
/**
 * 记录问卷请求失败（提交类用 bad，其他用 sad）。
 */
function logSurveyFailure(method, reason) {
  (method === "SubmitSurveyResponse" ? logFeatureBad : logFeatureSad)("cli_org_survey", reason);
}
//@ chunk-18hwfzwa.js:1053844-1054658 placement
async function callOrgSurveyRpc(method, body, options) {
  let telemetryName = ORG_SURVEY_METHODS[method];
  let response;
  try {
    response = await apiClient.post(`${ORG_SURVEY_RPC_PATH}/${method}`, body, options);
  } catch (error) {
    let { kind, status } = classifyAxiosError(error);
    let failureCode =
      status !== undefined
        ? `http_${status}`
        : kind === "http"
          ? (sanitizedConnectionCodeLowerForTelemetry(getErrnoCode(error)) ?? "no_response")
          : kind;
    logSurveyFailure(method, `${telemetryName}_${failureCode}`);
    logForDebugging(`org survey ${method} failed: ${failureCode}`, {
      level: "warn",
    });
    return {
      kind: "transient",
    };
  }
  if (!response.ok) {
    logFeatureSad("cli_org_survey", `${telemetryName}_${response.reason.replaceAll("-", "_")}`);
    return {
      kind: "skipped",
    };
  }
  if (
    (response.status >= 200 && response.status < 300) ||
    (method === "GetPendingSurvey" && response.status === 404)
  )
    logFeatureOk("cli_org_survey");
  else logSurveyFailure(method, `${telemetryName}_http_${response.status}`);
  if (response.status >= 200 && response.status < 300)
    return {
      kind: "ok",
      data: response.data,
    };
  if (response.status === 429)
    return {
      kind: "transient",
    };
  let message = surveyMessageSchema().safeParse(response.data).data?.message;
  let code = message !== undefined && /^[a-z_]{1,64}$/.test(message) ? message : undefined;
  logForDebugging(`org survey ${method} refused: http_${response.status}`);
  return {
    kind: "refused",
    status: response.status,
    code,
  };
}
//@ chunk-18hwfzwa.js:1054658-1054727 placement
/**
 * 取当前问卷检查记录（键不匹配返回 undefined）。
 */
function getSurveyCheck(checkKey) {
  let orgSurveyCheck = getGlobalConfig().orgSurveyCheck;
  return orgSurveyCheck?.key === checkKey ? orgSurveyCheck : undefined;
}
//@ chunk-18hwfzwa.js:1054727-1054804 placement
/**
 * 判断现在是否到了下次检查时间。
 */
function isSurveyCheckDue(checkKey, nowMs) {
  let nextCheckAt = getSurveyCheck(checkKey)?.nextCheckAt;
  return typeof nextCheckAt !== "number" || nowMs >= nextCheckAt;
}
//@ chunk-18hwfzwa.js:1054804-1055005 placement
function saveOrgSurveyCheck(key, fields, storageV5) {
  saveGlobalConfig((config) => {
    let orgSurveyCheck = config.orgSurveyCheck?.key === key ? config.orgSurveyCheck : {};
    return {
      ...config,
      orgSurveyCheck: {
        ...orgSurveyCheck,
        ...fields,
        key,
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
  let requestOptions = {
    ...ORG_SURVEY_REQUEST_OPTIONS,
    credentials,
    storageV5,
  };
  async function checkEligibility(survey) {
    let eligibility = await checkOrgSurveyEligibilitySafe(credentials);
    if (eligibility !== null && eligibility !== "error" && eligibility.checkKey !== survey.ownerKey) {
      logFeatureSad("cli_org_survey", "skip_login_changed");
      return null;
    }
    return eligibility;
  }
  function dismiss(eligibility, surveyUuid) {
    return callOrgSurveyRpc(
      "DismissSurvey",
      {
        organizationUuid: eligibility.orgUuid,
        surveyUuid,
      },
      requestOptions,
    );
  }
  return {
    async getPendingSurvey() {
      let eligibility = await checkOrgSurveyEligibilitySafe(credentials);
      if (eligibility === null || eligibility === "error" || !isSurveyCheckDue(eligibility.checkKey, now()))
        return null;
      let result = await callOrgSurveyRpc(
        "GetPendingSurvey",
        {
          organizationUuid: eligibility.orgUuid,
          surface: "SURVEY_SURFACE_CODE",
        },
        requestOptions,
      );
      switch (result.kind) {
        case "skipped":
          return null;
        case "transient":
          saveOrgSurveyCheck(
            eligibility.checkKey,
            {
              nextCheckAt: now() + RETRY_ERROR_MS,
            },
            storageV5,
          );
          return null;
        case "refused":
          saveOrgSurveyCheck(
            eligibility.checkKey,
            {
              nextCheckAt: now() + (result.status === 404 ? RETRY_404_MS : RETRY_DEFAULT_MS),
            },
            storageV5,
          );
          return null;
        case "ok": {
          let orgSurvey = parseOrgSurvey(result.data, {
            orgName: eligibility.orgName,
            ownerKey: eligibility.checkKey,
          });
          if (orgSurvey.survey === null) {
            if (orgSurvey.reason !== "none") logFeatureSad("cli_org_survey", `pending_${orgSurvey.reason}`);
            saveOrgSurveyCheck(
              eligibility.checkKey,
              {
                nextCheckAt: now() + RETRY_404_MS,
              },
              storageV5,
            );
            return null;
          }
          if (getSurveyCheck(eligibility.checkKey)?.dismissedSurveyUuid === orgSurvey.survey.surveyUuid) {
            let dismissResult = await dismiss(eligibility, orgSurvey.survey.surveyUuid);
            saveOrgSurveyCheck(
              eligibility.checkKey,
              {
                nextCheckAt: now() + RETRY_404_MS,
                ...(dismissResult.kind === "ok" && {
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
    async isStillPending(survey) {
      let eligibility = await checkEligibility(survey);
      if (eligibility === null) return false;
      if (eligibility === "error") return true;
      let result = await callOrgSurveyRpc(
        "GetPendingSurvey",
        {
          organizationUuid: eligibility.orgUuid,
          surface: "SURVEY_SURFACE_CODE",
        },
        {
          ...requestOptions,
          timeout: ORG_SURVEY_RPC,
        },
      );
      if (result.kind === "refused") return ![401, 403, 404].includes(result.status);
      if (result.kind !== "ok") return result.kind === "transient";
      let parsed = pendingSurveyResponseSchema().safeParse(result.data);
      return !parsed.success || parsed.data.pending?.surveyUuid === survey.surveyUuid;
    },
    async recordMilestone(survey, milestone) {
      let eligibility = await checkEligibility(survey);
      if (eligibility === null || eligibility === "error") return false;
      return (
        (
          await callOrgSurveyRpc(
            "RecordSurveyMilestone",
            {
              organizationUuid: eligibility.orgUuid,
              surveyUuid: survey.surveyUuid,
              milestone: milestone === "shown" ? "SURVEY_MILESTONE_SHOWN" : "SURVEY_MILESTONE_STARTED",
            },
            requestOptions,
          )
        ).kind === "ok"
      );
    },
    async dismissSurvey(survey) {
      if (getOrgSurveyOwnerKey() === survey.ownerKey)
        saveOrgSurveyCheck(
          survey.ownerKey,
          {
            nextCheckAt: now() + RETRY_404_MS,
            dismissedSurveyUuid: survey.surveyUuid,
          },
          storageV5,
        );
      let eligibility = await checkEligibility(survey);
      if (eligibility === null || eligibility === "error") return false;
      let dismissed = (await dismiss(eligibility, survey.surveyUuid)).kind === "ok";
      if (dismissed)
        saveOrgSurveyCheck(
          survey.ownerKey,
          {
            dismissedSurveyUuid: undefined,
          },
          storageV5,
        );
      return dismissed;
    },
    async submitSurvey(survey, answers) {
      let eligibility = await checkEligibility(survey);
      if (eligibility === null) return "closed";
      if (eligibility === "error") return "failed";
      let result = await callOrgSurveyRpc(
        "SubmitSurveyResponse",
        {
          organizationUuid: eligibility.orgUuid,
          surveyUuid: survey.surveyUuid,
          surface: "SURVEY_SURFACE_CODE",
          answers: answers.map((answer) =>
            "text" in answer
              ? {
                  questionId: answer.questionId,
                  text: answer.text,
                }
              : {
                  questionId: answer.questionId,
                  options: {
                    selected: answer.selected,
                  },
                },
          ),
        },
        requestOptions,
      );
      let outcome =
        result.kind === "ok" || (result.kind === "refused" && result.code === "survey_already_answered")
          ? "submitted"
          : result.kind === "refused" &&
              ([401, 403, 404].includes(result.status) || result.code === "survey_not_open")
            ? "closed"
            : "failed";
      if (outcome !== "failed")
        saveOrgSurveyCheck(
          eligibility.checkKey,
          {
            nextCheckAt: now() + RETRY_404_MS,
          },
          storageV5,
        );
      return outcome;
    },
  };
}
//@ chunk-18hwfzwa.js:1057797-1057801 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1057797", () => {
  init_react_production();
});
export { DEFAULT_HEADLINE_DELAY_MS, checkPendingOrgSurvey, isSurveyEligible, orgSurveyCredentialSource };
