/**
 * utils/programUseCaseChoices.ts
 *
 * 程序级用例选择模式的合法性收敛与摘要/提示文案（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (17)
 * attribution: placement 17
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { array, objectSchema, stringSchema, record, _enum } from "../../vendor/zod/v4/classic/schemas.js";
import { truncateToLength } from "./stringUtils.js";
import { sanitizeTitle } from "./resultError.js";
import {
  getAuthenticatedAccount,
  getProgramUseCaseOwner,
  getProgramUseCaseRefusal,
  setProgramUseCaseRefusal,
  getProgramUseCaseId,
  setProgramUseCaseChoices,
  setProgramUseCaseChoiceMode,
  unmarkBetaHeaderRefused,
  getProgramUseCaseChoiceMode,
  getProgramUseCaseChoices,
  setProgramUseCaseId,
  programUseCaseAwaitsAccount,
  getIsNonInteractiveSession,
} from "../bootstrap/state.js";
import { getGlobalConfig, saveGlobalConfig } from "./config.js";
import {
  isProgramUseCaseChoiceEnabled,
  NOT_HELD_REFETCH_FLOOR_MS,
  liftHostProgramUseCaseRefusal,
  hostProgramUseCaseId,
  emitProgramUseCaseChoiceChanged,
  isProgramUseCaseTurnScoped,
  programUseCaseIdForWire,
} from "./programUseCase.js";
import { env } from "./env.js";
import {
  BETA_PROGRAM_USE_CASE_IDS,
  programUseCaseHeaderAllowed,
  programUseCaseHeaderGoesOut,
} from "./betas.js";
import { logError } from "./log.js";
import { truncateToWidth } from "./format.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-vn3g7zt8.js:227632-227774 placement
var MAX_STATUS_NAME_WIDTH; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_USE_CASE_NAME_CHARS;
var useCaseListSchema;
var savedChoiceSchema;
var choiceModeSchema;
deferInit("chunk-vn3g7zt8.js:227632", () => {
  MAX_STATUS_NAME_WIDTH = 24;
  MAX_USE_CASE_NAME_CHARS = 80;
  useCaseListSchema = DoctorLazy(() =>
    array(
      objectSchema({
        id: stringSchema(),
        name: stringSchema(),
      }),
    ),
  );
  savedChoiceSchema = DoctorLazy(() =>
    record(
      stringSchema(),
      objectSchema({
        id: stringSchema().nullable(),
      }),
    ),
  );
  choiceModeSchema = DoctorLazy(() => _enum(["none", "single", "per_grant", "pick"]));
});
//@ chunk-vn3g7zt8.js:227774-227940 placement
function normalizeUseCaseList(programUseCases) {
  let parsed = useCaseListSchema().safeParse(programUseCases);
  if (!parsed.success) return [];
  return parsed.data
    .map((useCase) => ({
      id: useCase.id,
      name: truncateToLength(sanitizeTitle(useCase.name), MAX_USE_CASE_NAME_CHARS),
    }))
    .filter((useCase) => useCase.id.length > 0 && useCase.name.length > 0);
}
//@ chunk-vn3g7zt8.js:227940-228044 placement
function normalizeChoiceMode(programUseCaseChoice, offered) {
  let parsed = choiceModeSchema().safeParse(programUseCaseChoice);
  if (parsed.success) return parsed.data;
  return offered.length >= 2 ? "pick" : "single";
}
//@ chunk-vn3g7zt8.js:228044-228279 placement
function pickUseCaseId(candidate) {
  let { held, saved, serverDefault, serverNamed, offered } = candidate;
  let isOffered = (id) => offered.some((useCase) => useCase.id === id);
  if (isOffered(held)) return held;
  if (isOffered(saved?.id)) return saved.id;
  if (saved?.id === null && offered.length >= 2) return null;
  if (isOffered(serverDefault)) return serverDefault;
  return offered.length === 1 ? offered[0].id : serverNamed;
}
//@ chunk-vn3g7zt8.js:228279-228394 placement
function accountKey() {
  let account = getAuthenticatedAccount() ?? getProgramUseCaseOwner();
  return account?.organizationUuid === undefined
    ? null
    : `${account.organizationUuid}:${account.accountUuid}`;
}
//@ chunk-vn3g7zt8.js:228394-228487 placement
function savedChoices(programUseCaseChoices = getGlobalConfig().programUseCaseChoices) {
  let parsed = savedChoiceSchema().safeParse(programUseCaseChoices);
  return parsed.success ? parsed.data : {};
}
//@ chunk-vn3g7zt8.js:228487-228543 placement
function savedChoiceForAccount() {
  let key = accountKey();
  return key === null ? undefined : savedChoices()[key];
}
//@ chunk-vn3g7zt8.js:228543-228666 placement
function sameOfferedSet(offered, offered_2) {
  let ids = new Set(offered.map((useCase) => useCase.id));
  return (
    ids.size === new Set(offered_2.map((useCase) => useCase.id)).size &&
    offered_2.every((useCase) => ids.has(useCase.id))
  );
}
//@ chunk-vn3g7zt8.js:228666-228854 placement
function resolveUseCaseId(candidate) {
  if (!isProgramUseCaseChoiceEnabled()) return candidate.serverNamed;
  let programUseCaseRefusal = getProgramUseCaseRefusal();
  if (
    programUseCaseRefusal !== null &&
    (Date.now() - programUseCaseRefusal.at >= NOT_HELD_REFETCH_FLOOR_MS ||
      (candidate.offered !== null && !sameOfferedSet(programUseCaseRefusal.offered, candidate.offered)))
  )
    setProgramUseCaseRefusal(null);
  let id = applyCandidate(candidate);
  return id === getProgramUseCaseRefusal()?.id ? null : id;
}
//@ chunk-vn3g7zt8.js:228854-229141 placement
/**
 * 计算当前实际生效的用例选择模式（per_grant/单个/默认）并做合法性收敛。
 */
function applyCandidate(candidate) {
  let { serverNamed, serverDefault, offered, mode } = candidate;
  if (offered === null) return getProgramUseCaseId() ?? savedChoiceForAccount()?.id ?? serverNamed;
  setProgramUseCaseChoices(offered);
  setProgramUseCaseChoiceMode(mode);
  if (offered.some((useCase) => useCase.id === env.CLAUDE_CODE_PROGRAM_USE_CASE_ID))
    liftHostProgramUseCaseRefusal();
  if (mode === "per_grant") return serverNamed;
  return pickUseCaseId({
    held: getProgramUseCaseId(),
    saved: savedChoiceForAccount(),
    serverDefault,
    serverNamed,
    offered,
  });
}
//@ chunk-vn3g7zt8.js:229141-229192 placement
function notifyHostChoice() {
  liftHostProgramUseCaseRefusal();
  if (hostProgramUseCaseId() !== null) unmarkBetaHeaderRefused(BETA_PROGRAM_USE_CASE_IDS);
  emitProgramUseCaseChoiceChanged();
}
//@ chunk-vn3g7zt8.js:229192-229581 placement
/**
 * 校验已保存的用例选择仍可用：不在候选中、只在会话内有效时给出标记。
 */
async function setUseCase(id, storageV5) {
  if (
    getProgramUseCaseChoiceMode() === "per_grant" ||
    (id !== null && !getProgramUseCaseChoices().some((useCase) => useCase.id === id))
  )
    return "not_offered";
  setProgramUseCaseId(id);
  setProgramUseCaseRefusal(null);
  if (id !== null) unmarkBetaHeaderRefused(BETA_PROGRAM_USE_CASE_IDS);
  emitProgramUseCaseChoiceChanged();
  let key = accountKey();
  if (key === null) return "session_only";
  try {
    await saveGlobalConfig((config) => {
      let choices = savedChoices(config.programUseCaseChoices);
      return choices[key]?.id === id && Object.hasOwn(choices, key)
        ? config
        : {
            ...config,
            programUseCaseChoices: {
              ...choices,
              [key]: {
                id,
              },
            },
          };
    }, storageV5);
    return "saved";
  } catch (error) {
    logError(error);
    return "session_only";
  }
}
//@ chunk-vn3g7zt8.js:229581-229729 placement
function shouldAskUseCase() {
  let programUseCaseChoices = getProgramUseCaseChoices();
  let saved = savedChoiceForAccount();
  let any = programUseCaseChoices.some((programUseCaseChoice) => programUseCaseChoice.id === saved?.id);
  return (
    isProgramUseCaseChoiceEnabled() &&
    !isProgramUseCaseTurnScoped() &&
    getProgramUseCaseChoiceMode() !== "per_grant" &&
    programUseCaseChoices.length >= 2 &&
    programUseCaseIdForWire() === null &&
    programUseCaseHeaderAllowed() &&
    !programUseCaseAwaitsAccount() &&
    !any
  );
}
//@ chunk-vn3g7zt8.js:229729-229829 placement
function useCaseDisplayName() {
  let id = programUseCaseIdForWire();
  if (id === null || !programUseCaseHeaderGoesOut()) return null;
  return getProgramUseCaseChoices().find((useCase) => useCase.id === id)?.name ?? "";
}
//@ chunk-vn3g7zt8.js:229829-230024 placement
/**
 * 把用例选择渲染成“Use case: …”的一行文案。
 */
function useCaseStatusText() {
  if (!isProgramUseCaseChoiceEnabled() || getProgramUseCaseChoices().length === 0) return null;
  let name = useCaseDisplayName();
  if (name === null)
    return getProgramUseCaseChoiceMode() === "per_grant" ? "Use case: automatic" : "Use case: none";
  return name === "" ? "Use case: on" : `Use case: ${truncateToWidth(name, MAX_STATUS_NAME_WIDTH)}`;
}
//@ chunk-vn3g7zt8.js:230024-230393 placement
/**
 * 生成用例摘要行：自动、未用、名称不可用、具体用例名，供状态提示使用。
 */
function lifeSciencesSuffix(kind) {
  let programUseCaseChoices = getProgramUseCaseChoices();
  if (kind !== "bio" || !isProgramUseCaseChoiceEnabled() || programUseCaseChoices.length === 0) return "";
  if (getProgramUseCaseChoiceMode() === "per_grant")
    return `

Your Life Sciences use cases apply automatically.`;
  let name = useCaseDisplayName();
  return `

${name === null ? "This request used no Life Sciences use case." : name === "" ? "Your requests use a Life Sciences use case whose name isn't available." : `Your Life Sciences use case: ${name}.`}${switchHint(name, programUseCaseChoices.length >= 2)}`;
}
//@ chunk-vn3g7zt8.js:230393-230678 placement
function switchHint(name, mayChoose) {
  if (hostProgramUseCaseId() !== null || isProgramUseCaseTurnScoped() || !programUseCaseHeaderAllowed())
    return "";
  if (!mayChoose) return name === null ? " If you expected one, ask your organization's admin." : "";
  let verb = name === null ? "choose one" : "switch";
  return getIsNonInteractiveSession()
    ? ` To ${verb} for later sessions, run /use-case in an interactive session.`
    : ` To ${verb}, run /use-case.`;
}
export {
  notifyHostChoice,
  useCaseStatusText,
  setUseCase,
  normalizeUseCaseList,
  resolveUseCaseId,
  normalizeChoiceMode,
  useCaseListSchema,
  shouldAskUseCase,
  lifeSciencesSuffix,
};
