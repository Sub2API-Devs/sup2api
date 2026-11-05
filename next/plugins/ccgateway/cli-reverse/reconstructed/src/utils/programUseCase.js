/**
 * utils/programUseCase.ts
 *
 * program use case（主机给的用量用途 id）的选择开关、打标门值、请求体字段与 bootstrap 重取退避（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7kayq7nc.js (30)
 * attribution: placement 30
 */
import { env } from "./env.js";
import {
  TURN_ID_RE,
  currentProgramUseCaseId,
  isModelRefusing,
  clearProgramUseCaseId,
} from "../services/mcp/ccrTurnId.js";
import {
  getRootSession,
  programUseCaseAwaitsAccount,
  getProgramUseCaseId,
  isCcsTenant,
  setProgramUseCaseId,
  setProgramUseCaseRefusal,
  getProgramUseCaseChoices,
  getProgramUseCaseRefusal,
  tokenAdoptedSinceStamp,
} from "../bootstrap/state.js";
import { BETA_PROGRAM_USE_CASE_IDS } from "./betas.js";
import { HostScoped } from "./hostScoped.js";
import { createSignal } from "./signal.js";
import { logError } from "./log.js";
import { sleep } from "./sleep.js";
import { logForDebugging } from "./debug.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-7kayq7nc.js:182349-182381 placement
/**
 * program use case 选择开关当前是否打开。
 */
function isProgramUseCaseChoiceEnabled() {
  return useCaseChoiceGate?.() ?? false;
}
//@ chunk-7kayq7nc.js:182381-182422 placement
/**
 * 开关键 tengu_federated_possum 与本地缓存的选择门值。
 */
var PROGRAM_USE_CASE_CHOICE_FLAG = "tengu_federated_possum";
var useCaseChoiceGate = null;
//@ chunk-7kayq7nc.js:182422-182443 placement
/**
 * 设置 program use case 选择门值。
 */
function setProgramUseCaseChoiceGate(gate) {
  useCaseChoiceGate = gate;
}
//@ chunk-7kayq7nc.js:182443-182483 placement
/**
 * 标记键 tengu_greedy_mountain 与本地缓存的打标门值。
 */
var PROGRAM_USE_CASE_STAMP_FLAG = "tengu_greedy_mountain";
var useCaseStampGate = null;
//@ chunk-7kayq7nc.js:182483-182504 placement
/**
 * 设置 program use case 打标门值。
 */
function setProgramUseCaseStampGate(gate) {
  useCaseStampGate = gate;
}
//@ chunk-7kayq7nc.js:182504-182645 placement
/**
 * 取宿主给的 program use case id：需为合法格式、开关打开且宿主未被拒。
 */
function hostProgramUseCaseId() {
  let CLAUDE_CODE_PROGRAM_USE_CASE_ID = env.CLAUDE_CODE_PROGRAM_USE_CASE_ID;
  if (
    CLAUDE_CODE_PROGRAM_USE_CASE_ID === undefined ||
    !TURN_ID_RE.test(CLAUDE_CODE_PROGRAM_USE_CASE_ID) ||
    !isProgramUseCaseChoiceEnabled() ||
    hostState.of(getRootSession().host).hostIdRefused
  )
    return null;
  return CLAUDE_CODE_PROGRAM_USE_CASE_ID;
}
//@ chunk-7kayq7nc.js:182645-182664 placement
var CONTAINER = "container";
//@ chunk-7kayq7nc.js:182664-182705 placement
function currentStamp() {
  return useCaseStampGate?.() ? currentProgramUseCaseId() : undefined;
}
//@ chunk-7kayq7nc.js:182705-182898 placement
/**
 * 决定这次请求要发的 program use case id（跟随/固定/未打标等分支），不发时返回 null。
 */
function programUseCaseIdForWire() {
  if (env.CCR_SESSION_PROFILE) return null;
  if (isStampedByEnv()) {
    let stampValue = currentStamp();
    return stampValue === undefined || stampValue === CONTAINER ? null : stampValue;
  }
  if (followsStamp()) {
    let stampValue = currentStamp();
    return stampValue === CONTAINER ? hostProgramUseCaseId() : (stampValue ?? null);
  }
  return (
    hostProgramUseCaseId() ??
    (isProgramUseCaseChoiceEnabled() && !programUseCaseAwaitsAccount() ? getProgramUseCaseId() : null)
  );
}
//@ chunk-7kayq7nc.js:182898-183000 placement
function isStampedByEnv() {
  let stampedValue = env.CLAUDE_CODE_PROGRAM_USE_CASE_STAMPED;
  return (!!stampedValue && stampedValue !== "follow") || (isCcsTenant() && useCaseStampGate?.() === true);
}
//@ chunk-7kayq7nc.js:183000-183071 placement
function followsStamp() {
  return env.CLAUDE_CODE_PROGRAM_USE_CASE_STAMPED === "follow";
}
//@ chunk-7kayq7nc.js:183071-183107 placement
var PROGRAM_USE_CASE_STAMPS_V1 = "program_use_case_stamps_v1";
//@ chunk-7kayq7nc.js:183107-183192 placement
/**
 * 按开关与拒绝状态决定是否下发 program_use_case_stamps_v1 能力。
 */
function programUseCaseStampsCapabilities() {
  return followsStamp() &&
    !isStampedByEnv() &&
    !env.CCR_SESSION_PROFILE &&
    isProgramUseCaseChoiceEnabled() &&
    useCaseStampGate?.() === true
    ? [PROGRAM_USE_CASE_STAMPS_V1]
    : [];
}
//@ chunk-7kayq7nc.js:183192-183225 placement
/**
 * 判断 use case 是否回合内固定（已打标或已拒绝）。
 */
function isProgramUseCaseTurnScoped() {
  return isStampedByEnv() || followsStamp();
}
//@ chunk-7kayq7nc.js:183225-183342 placement
/**
 * 生成请求体里的 program_use_case_id 字段（不可发时返回空对象）。
 */
function programUseCaseBody(betas, args) {
  let programUseCaseId = programUseCaseIdForWire();
  if (
    programUseCaseId === null ||
    !betas.includes(BETA_PROGRAM_USE_CASE_IDS) ||
    (args !== undefined && isModelRefusing(args))
  )
    return {};
  return {
    program_use_case_id: programUseCaseId,
  };
}
//@ chunk-7kayq7nc.js:183342-183523 placement
/**
 * 未持有时的重取下限（5 分钟）与按宿主的 use case 状态槽位。
 */
var NOT_HELD_REFETCH_FLOOR_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var hostState;
deferInit("chunk-7kayq7nc.js:183342", () => {
  NOT_HELD_REFETCH_FLOOR_MS = 300000;
  hostState = new HostScoped(() => ({
    nextRefetchAt: 0,
    refetch: null,
    hostIdRefused: false,
    choiceChanged: createSignal(),
    bootstrapAnswered: false,
    refetchingForAdoptedToken: false,
    refetchWaitsForRefusalToLapse: false,
  }));
});
//@ chunk-7kayq7nc.js:183523-183589 placement
/**
 * 订阅选择变更事件。
 */
function onProgramUseCaseChoiceChanged(listener) {
  return hostState.of(getRootSession().host).choiceChanged.subscribe(listener);
}
//@ chunk-7kayq7nc.js:183589-183660 placement
/**
 * 广播选择变更事件。
 */
function emitProgramUseCaseChoiceChanged() {
  try {
    hostState.of(getRootSession().host).choiceChanged.emit();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7kayq7nc.js:183660-183718 placement
/**
 * 记录 bootstrap 已回答并广播。
 */
function noteProgramUseCaseBootstrapAnswer() {
  hostState.of(getRootSession().host).bootstrapAnswered = true;
  emitProgramUseCaseChoiceChanged();
}
//@ chunk-7kayq7nc.js:183718-183774 placement
/**
 * bootstrap 是否已回答。
 */
function programUseCaseBootstrapAnswered() {
  return hostState.of(getRootSession().host).bootstrapAnswered;
}
//@ chunk-7kayq7nc.js:183774-183822 placement
/**
 * 解除宿主的 use case 拒绝标记。
 */
function liftHostProgramUseCaseRefusal() {
  hostState.of(getRootSession().host).hostIdRefused = false;
}
//@ chunk-7kayq7nc.js:183822-183864 placement
/**
 * 登记重取 bootstrap 的回调。
 */
function setProgramUseCaseRefetch(refetch) {
  hostState.of(getRootSession().host).refetch = refetch;
}
//@ chunk-7kayq7nc.js:183864-184076 placement
/**
 * 宿主拒绝本次 use case 时收尾：标记拒绝、清缓存、按需安排重取并通知。
 */
function forgetRefusedProgramUseCase(deps, refusedId) {
  let state = hostState.of(getRootSession().host);
  if (isProgramUseCaseTurnScoped()) {
    clearProgramUseCaseId();
    return;
  }
  if (refusedId === hostProgramUseCaseId()) state.hostIdRefused = true;
  if (!isProgramUseCaseChoiceEnabled()) setProgramUseCaseId(null);
  else if (refusedId !== undefined && refusedId === getProgramUseCaseId()) {
    setProgramUseCaseRefusal({
      id: refusedId,
      offered: getProgramUseCaseChoices(),
      at: Date.now(),
    });
    setProgramUseCaseId(null);
    waitForRefusalToLapse(state, deps);
  }
  emitProgramUseCaseChoiceChanged();
  refetchForHeldUseCase(deps);
}
//@ chunk-7kayq7nc.js:184076-184425 placement
async function waitForRefusalToLapse(state, { storageV5: deps, credentials }) {
  if (state.refetchWaitsForRefusalToLapse) return;
  state.refetchWaitsForRefusalToLapse = true;
  let refusal = getProgramUseCaseRefusal();
  while (refusal !== null) {
    let waitMs = refusal.at + NOT_HELD_REFETCH_FLOOR_MS - Date.now();
    if (waitMs <= 0) break;
    await sleep(waitMs, undefined, {
      unref: true,
    });
    refusal = getProgramUseCaseRefusal();
  }
  state.refetchWaitsForRefusalToLapse = false;
  if (refusal !== null) {
    state.nextRefetchAt = Date.now() + NOT_HELD_REFETCH_FLOOR_MS;
    await refetchQuietly(state, {
      storageV5: deps,
      credentials,
    });
  }
}
//@ chunk-7kayq7nc.js:184425-184454 placement
var ADOPTED_TOKEN_REFETCH_DELAYS_MS = [0, 5000, 30000, 300000];
//@ chunk-7kayq7nc.js:184454-184568 placement
/**
 * 采用宿主令牌后按退避重取 bootstrap。
 */
function refetchForAdoptedToken() {
  let state = hostState.of(getRootSession().host);
  let hasChoice = getProgramUseCaseId() !== null || getProgramUseCaseChoices().length > 0;
  if (isProgramUseCaseChoiceEnabled() && hasChoice && !state.refetchingForAdoptedToken)
    retryWithBackoff(state);
}
//@ chunk-7kayq7nc.js:184568-184681 placement
/**
 * bootstrap 答案作废时重取。
 */
function refetchForVoidedBootstrapAnswer(deps) {
  let state = hostState.of(getRootSession().host);
  if (
    isProgramUseCaseChoiceEnabled() &&
    tokenAdoptedSinceStamp() &&
    !state.bootstrapAnswered &&
    !state.refetchingForAdoptedToken
  )
    refetchQuietly(state, deps);
}
//@ chunk-7kayq7nc.js:184681-184744 placement
async function refetchQuietly(state, deps) {
  try {
    await state.refetch?.(deps);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-7kayq7nc.js:184744-185021 placement
async function retryWithBackoff(state) {
  state.refetchingForAdoptedToken = true;
  for (let attempt = 0; ; attempt++) {
    let delayMs = ADOPTED_TOKEN_REFETCH_DELAYS_MS[attempt] ?? ADOPTED_TOKEN_REFETCH_DELAYS_MS.at(-1);
    if (delayMs)
      await sleep(delayMs, undefined, {
        unref: true,
      });
    if (state.refetch === null || !programUseCaseAwaitsAccount()) {
      state.refetchingForAdoptedToken = false;
      return;
    }
    try {
      if (await state.refetch({})) {
        state.refetchingForAdoptedToken = false;
        return;
      }
    } catch (error) {
      logError(error);
    }
  }
}
//@ chunk-7kayq7nc.js:185021-185349 placement
async function refetchForHeldUseCase(deps) {
  try {
    let state = hostState.of(getRootSession().host);
    if (state.refetch === null) return;
    let now = Date.now();
    if (now < state.nextRefetchAt) {
      logForDebugging("[program-use-case] bootstrap was refetched in the last 5 minutes, not again yet");
      return;
    }
    state.nextRefetchAt = now + NOT_HELD_REFETCH_FLOOR_MS;
    logForDebugging("[program-use-case] refetching bootstrap for the held use case");
    await state.refetch(deps);
  } catch (error) {
    logError(error);
  }
}
export {
  isProgramUseCaseTurnScoped,
  programUseCaseBody,
  forgetRefusedProgramUseCase,
  isProgramUseCaseChoiceEnabled,
  onProgramUseCaseChoiceChanged,
  programUseCaseStampsCapabilities,
  hostProgramUseCaseId,
  programUseCaseIdForWire,
  setProgramUseCaseRefetch,
  refetchForVoidedBootstrapAnswer,
  noteProgramUseCaseBootstrapAnswer,
  programUseCaseBootstrapAnswered,
  setProgramUseCaseChoiceGate,
  PROGRAM_USE_CASE_CHOICE_FLAG,
  setProgramUseCaseStampGate,
  PROGRAM_USE_CASE_STAMP_FLAG,
  NOT_HELD_REFETCH_FLOOR_MS,
  liftHostProgramUseCaseRefusal,
  emitProgramUseCaseChoiceChanged,
  refetchForAdoptedToken,
};
