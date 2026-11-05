/**
 * plugins/functionHooks/sessionReceive.ts
 *
 * 2.1.316 新增：session.receive 事件钩子（处理收到的消息）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dropHopChain } from "../../utils/peerMessageHeaders.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import { HooksError } from "./hooksErrors.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { NO_CORE_AT_CHAIN_BOTTOM } from "./eventCatalog.js";
import { logForDebugging } from "../../utils/debug.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:74058-74142 placement
/**
 * 拼接文本块
 */
var joinTextBlocks = (blocks, separator) =>
  blocks
    .flatMap((block) => (block.type === "text" && block.text !== undefined ? [block.text] : []))
    .join(separator);
//@ chunk-5xgkngpb.js:74142-74286 placement
function receivedText(origin, content) {
  let clean = origin.kind === "peer" ? dropHopChain : (text) => text;
  return typeof content === "string"
    ? clean(content)
    : joinTextBlocks(
        content.map((block) =>
          block.type === "text"
            ? {
                ...block,
                text: clean(block.text),
              }
            : block,
        ),
        `
`,
      );
}
//@ chunk-5xgkngpb.js:74286-74344 placement
/**
 * 钩子未放行投递
 */
var DELIVERY_NOT_PASSED = "a hook answered without passing the delivery on";
//@ chunk-5xgkngpb.js:74344-74459 placement
var RECEIVE_NOT_QUEUED_MESSAGE =
  "session.receive: the delivery was not queued (the drain refused or held it after the hooks passed it on)";
//@ chunk-5xgkngpb.js:74459-74546 placement
/**
 * 排队投递结果
 */
var queuedDelivery = (coreHandoff, arrived) => ({
  queued: () =>
    coreHandoff.done({
      text: arrived.text,
    }),
  [Symbol.dispose]: coreHandoff[Symbol.dispose],
});
//@ chunk-5xgkngpb.js:74546-74721 placement
/**
 * 把投递来源（对等或协调者，交还除外）转换为附件中的来源描述。
 */
function agentMessageOrigin(origin) {
  if (origin?.kind !== "peer" && origin?.kind !== "coordinator") return;
  if (origin.kind === "peer" && origin.handback === true) return;
  let { kind, plugin } = origin;
  return {
    kind,
    ...(plugin !== undefined && {
      plugin,
    }),
  };
}
//@ chunk-5xgkngpb.js:74721-75050 placement
/**
 * 代理消息接收槽：有接收器时经 session.receive 钩子处理，可被消费或改写后入队。
 */
function createDeliveryReceiverSlot() {
  let receiverSlot = subscribe();
  return {
    setDeliveryReceiver: receiverSlot.set,
    receiveAgentMessage: async (origin, content, agentId) => {
      let receiver = receiverSlot.get();
      if (!receiver)
        return {
          text: content,
        };
      let outcome = await receiver({
        origin,
        content,
        ...(agentId !== undefined && {
          agentId,
        }),
      });
      if (outcome.consumed !== undefined)
        return {
          consumed: outcome.consumed,
        };
      using queueing = outcome.queueing;
      queueing.queued();
      let { content: content_2 } = outcome;
      return {
        text: typeof content_2 === "string" ? content_2 : content,
      };
    },
  };
}
//@ chunk-5xgkngpb.js:75050-75064 placement
/**
 * 投递接收槽
 */
var deliveryReceiverSlot; // deferred: uses createDeliveryReceiverSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:75050", () => {
  deliveryReceiverSlot = createDeliveryReceiverSlot();
});
//@ chunk-5xgkngpb.js:75064-75210 placement
/**
 * 队友邮箱消息的来源：已验证且来自 team-lead 为 coordinator，否则 peer，附带插件与队友名。
 */
function teammateMessageOrigin(message, isVerified) {
  return {
    kind: isVerified && message.from === TEAM_LEAD ? "coordinator" : "peer",
    ...(message.from_plugin !== undefined && {
      plugin: message.from_plugin,
    }),
    teammate: message.from,
    isVerified,
  };
}
//@ chunk-5xgkngpb.js:75210-75242 placement
var receiveAgentMessage; // deferred: uses deliveryReceiverSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:75210", () => {
  receiveAgentMessage = deliveryReceiverSlot.receiveAgentMessage;
});
//@ chunk-5xgkngpb.js:75242-75274 placement
var setDeliveryReceiver; // deferred: uses deliveryReceiverSlot of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:75242", () => {
  setDeliveryReceiver = deliveryReceiverSlot.setDeliveryReceiver;
});
//@ chunk-5xgkngpb.js:75274-75346 placement
/**
 * 执行核心步骤
 */
var performCoreStep = (coreHandoff) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: (request) => coreHandoff.perform(request),
});
//@ chunk-5xgkngpb.js:75346-75532 placement
/**
 * 等待钩子链要么把事件传到核心（arrived），要么直接作答（answered），后者释放核心。
 */
async function awaitArrivalOrAnswer(coreHandoff, hookAnswer) {
  await Promise.race([
    coreHandoff.arrived,
    hookAnswer.then(
      () => {
        return;
      },
      () => {
        return;
      },
    ),
  ]);
  if (coreHandoff.hasArrived())
    return {
      arrived: await coreHandoff.arrived,
    };
  coreHandoff[Symbol.dispose]();
  return {
    answered: await hookAnswer,
  };
}
//@ chunk-5xgkngpb.js:75532-75852 placement
/**
 * 核心交接器：perform 记录到达的参数并返回结果 Promise，done/failed 结算，dispose 以给定消息失败。
 */
function createCoreHandoff(disposeMessage) {
  let deferred = Promise.withResolvers();
  let deferred_2 = Promise.withResolvers();
  let hasArrived = false;
  let isDone = false;
  deferred_2.promise.catch(() => {
    return;
  });
  function fail(error) {
    if (!isDone) {
      isDone = true;
      deferred_2.reject(error);
    }
  }
  return {
    perform(request) {
      if (!hasArrived) {
        hasArrived = true;
        deferred.resolve(request);
      }
      return deferred_2.promise;
    },
    arrived: deferred.promise,
    hasArrived: () => hasArrived,
    done(result) {
      if (!isDone) {
        isDone = true;
        deferred_2.resolve(result);
      }
    },
    failed: fail,
    [Symbol.dispose]() {
      fail(new HooksError(disposeMessage));
    },
  };
}
//@ chunk-5xgkngpb.js:75852-75927 placement
var KEEP_QUEUED_READY; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:75852", () => {
  KEEP_QUEUED_READY = Object.freeze({
    queued: () => {
      return;
    },
    [Symbol.dispose]: () => {
      return;
    },
  });
});
//@ chunk-5xgkngpb.js:75927-76031 placement
function replaceTextContent(content, text) {
  return typeof content === "string"
    ? text
    : [
        {
          type: "text",
          text,
        },
        ...content.filter((block) => block.type !== "text"),
      ];
}
//@ chunk-5xgkngpb.js:76031-76632 placement
/**
 * 运行 session.receive 钩子链，钩子消费的消息不再入队。
 */
async function dispatchSessionReceiveHooks(request) {
  let { origin, content, event, agentId } = request;
  let facts = {
    origin,
    ...(agentId !== undefined && {
      agentId,
    }),
  };
  if (!hasModuleHookingSite("session.receive", facts))
    return {
      content,
      queueing: KEEP_QUEUED_READY,
    };
  let text = receivedText(origin, content);
  let coreHandoff = createCoreHandoff(RECEIVE_NOT_QUEUED_MESSAGE);
  let outcome = await awaitArrivalOrAnswer(
    coreHandoff,
    NO_CORE_AT_CHAIN_BOTTOM("session.receive", {
      core: {
        "session.receive": performCoreStep(coreHandoff),
      },
    })({
      origin,
      text,
      ...(event !== undefined && {
        event,
      }),
      ...(agentId !== undefined && {
        agentId,
      }),
    }),
  );
  if (!outcome.arrived) {
    let consumed = outcome.answered.consumed ?? DELIVERY_NOT_PASSED;
    logForDebugging(
      `session.receive (${origin.kind}): consumed by a hook (${consumed}; hooked by ` +
        pluginsMatchingEvent("session.receive", facts).join("+") +
        "); not queued",
    );
    return {
      consumed,
    };
  }
  let { arrived } = outcome;
  return {
    content: arrived.text === text ? content : replaceTextContent(content, arrived.text),
    queueing: queuedDelivery(coreHandoff, arrived),
  };
}
//@ chunk-5xgkngpb.js:76632-76641 placement
// deferred: uses setDeliveryReceiver of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:76632", () => {
  setDeliveryReceiver(dispatchSessionReceiveHooks);
});
export {
  dispatchSessionReceiveHooks,
  agentMessageOrigin,
  receiveAgentMessage,
  joinTextBlocks,
  teammateMessageOrigin,
  createCoreHandoff,
  awaitArrivalOrAnswer,
  performCoreStep,
};
