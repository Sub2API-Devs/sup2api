/**
 * plugins/functionHooks/promptSubmit.ts
 *
 * 2.1.316 新增：prompt.submit 事件钩子与提交改写
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (20)
 * attribution: placement 20
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { MANAGED } from "./classicHookBridge.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { onProcessRootHost, mainAgentId } from "../../bootstrap/state.js";
import { bVe, lhn, oO, enqueueCommand } from "../../utils/messageQueueManager.js";
import { extractTextContent_2 } from "../../utils/messages.js";
import { createStepRecorder } from "./dispatch/chain.js";
import { UI_ENV_SITE_RULES } from "./sites/siteRules.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { requireBoundSession, mWe, submitHoldRefusal, Hme, LATER } from "./sessionApi.js";
import { HooksError } from "./hooksErrors.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-e6aww6q8.js:767357-767413 placement
var RBr = "a hook answered without passing the prompt on";
//@ chunk-e6aww6q8.js:767413-767502 placement
function vNi(e, n) {
  let r = n?.drop === void 0 ? void 0 : n;
  return e.drop !== void 0 ? e : (r ?? { drop: RBr });
}
//@ chunk-e6aww6q8.js:767502-767550 placement
var G$t = "an earlier prompt in the batch failed";
//@ chunk-e6aww6q8.js:767550-767606 placement
var eTo = (e) => ({ name: "core", isCore: !0, budgetMs: 0, run: e });
//@ chunk-e6aww6q8.js:767606-767757 placement
var createManagedSubmitHandler = (e, n) => ({
  name: MANAGED,
  isManaged: !0,
  budgetMs: 0,
  async run(r, s) {
    let h = await e(r.text, { managedHooksOnly: !0 });
    return (n(r.text), h.drop === void 0 ? s(r) : h);
  },
});
//@ chunk-e6aww6q8.js:767757-767792 placement
var nTo = new HostScoped(() => ({ watching: !1 }));
/**
 * 跟踪排队中的提示提交：被移出队列时以丢弃结算，以文本形式交给模型时以文本结算。
 */
//@ chunk-e6aww6q8.js:767792-768237 placement
function createSubmitWaiters() {
  let e = new Map();
  function n(s) {
    let h = e.get(s);
    return (e.delete(s), h);
  }
  function r(s, h) {
    for (let y of s) {
      if (y.uuid === void 0) continue;
      n(y.uuid)?.settle(h(y));
    }
  }
  return {
    record: (s, h) => {
      let y = onProcessRootHost(nTo);
      if (!y.watching)
        ((y.watching = !0),
          bVe.subscribe((S) => r(S, () => ({ drop: "the prompt was removed from the queue before it ran" }))),
          lhn.subscribe((S) =>
            r(S, (w) => {
              let L = w.value;
              return {
                text:
                  typeof L === "string"
                    ? L
                    : extractTextContent_2(
                        L,
                        `
`,
                      ),
              };
            }),
          ));
      e.set(s, h);
    },
    take: n,
    settleEach: r,
  };
}
//@ chunk-e6aww6q8.js:768237-768251 placement
var Bme = createSubmitWaiters();
//@ chunk-e6aww6q8.js:768251-768326 placement
var kNi = (e) => ({
  [Symbol.dispose]: () => {
    Bme.settleEach(e, () => ({ drop: G$t }));
  },
});
/**
 * 为 prompt.submit 构造链两端：托管钩子处理器与核心处理器（运行 UserPromptSubmit 钩子并记录每步结果）。
 */
//@ chunk-e6aww6q8.js:768326-768767 placement
function createSubmitChainEnds(e, n = (r) => Promise.resolve(r)) {
  let r = createStepRecorder(),
    s,
    h,
    y = createManagedSubmitHandler(e, (L) => {
      s = L;
    });
  async function S(L) {
    h = L.context;
    let G = await e(L.text, L.text === s ? { managedHooksExcluded: !0 } : {}),
      q = L.context !== void 0 && L.context.length > 0,
      Se = G.drop === void 0 ? { text: G.text, origin: L.origin, ...(q && { context: L.context }) } : G;
    return (r.keep(L.text, Se), Se);
  }
  let w = eTo(async (L) => {
    let G = await S(L);
    return G.drop === void 0 ? n(G) : G;
  });
  return { managed: y, core: w, runs: r, arrivedContext: () => h };
}
//@ chunk-e6aww6q8.js:768767-768795 placement
var uTo = UI_ENV_SITE_RULES["prompt.submit"];
//@ chunk-e6aww6q8.js:768795-768864 placement
var cTo = (e, n) =>
  new Promise((r) => {
    Bme.record(e, { origin: n, settle: r });
  });
//@ chunk-e6aww6q8.js:768864-768907 placement
var ANi = (e) => (e === void 0 ? void 0 : Bme.take(e));
//@ chunk-e6aww6q8.js:768907-768952 placement
var Wme = (e) => e === void 0 || e === "session.start";
//@ chunk-e6aww6q8.js:768952-768987 placement
var oX = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:768987-769042 placement
function Gme(e, n) {
  let r = oX.get();
  if (r && Wme(n)) r.add(e);
}
/**
 * 提交标记集合：标记、查询，并按当前队列修剪。
 */
//@ chunk-e6aww6q8.js:769042-769370 placement
function createSubmitMarks() {
  let e = new Set(),
    n = new Set();
  return {
    mark: (r) => {
      e.add(r);
    },
    has: (r) => r !== void 0 && e.has(r),
    prune: (r) => {
      let s = new Set(r.map((h) => h.uuid));
      for (let h of e) if (!s.has(h) && !n.has(h)) e.delete(h);
    },
    setAside: (r) => {
      for (let s of r) if (e.has(s)) n.add(s);
    },
    putBack: () => {
      n.clear();
    },
    isAnyAside: () => n.size > 0,
    clear: () => {
      (e.clear(), n.clear());
    },
  };
}
//@ chunk-e6aww6q8.js:769370-769403 placement
var V_e = ge(createSubmitMarks(), (e) => e.clear());
//@ chunk-e6aww6q8.js:769403-769489 placement
function zme(e, n, r) {
  if (n === "turn.start" || n === "turn.complete") (V_e.prune(r), V_e.mark(e));
}
/**
 * 插件 $.prompt.submit：把一段文本作为用户提示提交给模型。
 */
//@ chunk-e6aww6q8.js:769489-770392 placement
function promptSubmitForPlugin(
  { text: text, attachments: attachments, asUser: asUser },
  s,
  h = { origin: [s] },
) {
  if ((requireBoundSession(s, "$.prompt.submit"), typeof text !== "string" || text.trim() === ""))
    return Promise.reject(new HooksError(`${s}: $.prompt.submit takes { text } (a non-empty prompt)`));
  if (mWe(text))
    return Promise.reject(
      new HooksError(
        `${s}: $.prompt.submit submits a prompt to the model; a text beginning with / would run a command as the user; run one with $.command.run({ command })`,
      ),
    );
  if (attachments && attachments.length > 0)
    return Promise.reject(
      new HooksError(`${s}: $.prompt.submit takes text alone; attachments cannot be submitted`),
    );
  let y = submitHoldRefusal({ plugin: s, ...h }, "$.prompt.submit");
  if (y !== void 0) return Promise.resolve({ drop: y });
  logForDebugging(`$.prompt.submit (${s}): ` + jsonStringify(truncateToLength(text, Hme)));
  let S = randomUUID_9(),
    w = asUser === !0,
    L = cTo(S, h.origin);
  return (
    Gme(S, h.rootEvent),
    zme(S, h.rootEvent, oO()),
    enqueueCommand({
      agentId: mainAgentId(),
      mode: "prompt",
      value: text,
      uuid: S,
      priority: LATER,
      origin: w ? { kind: "plugin", name: s, asUser: !0 } : { kind: "plugin", name: s },
      queuedUnder: h.origin,
    }),
    L
  );
}

export { V_e, oX, kNi, ANi, RBr, createSubmitChainEnds, vNi, uTo, Gme, zme, promptSubmitForPlugin, Wme };
