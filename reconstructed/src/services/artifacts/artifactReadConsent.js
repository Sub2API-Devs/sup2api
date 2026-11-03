/**
 * services/artifacts/artifactReadConsent.ts
 *
 * 2.1.316 新增：Artifact 读取同意。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gfcxsygg.js (10)
 * attribution: placement 10
 */
import { isPersistableFrameUrl } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { uuidSlugFromUrl } from "../../tools/ArtifactTool/constants.js";
import { createFieldAccessor } from "../../state/sliceHelpers.js";
import { makeOwnPublishesStore } from "./ownPublishes.js";
import { AGENT_COLOR_NAMES } from "../../tools/AgentTool/agentColorManager.js";

//@ chunk-gfcxsygg.js:374-489 placement
function findLocalSourcePath(e, r) {
  return Object.entries(e.frameUrls ?? {}).find(
    ([key, value]) =>
      value?.url !== undefined && !isPersistableFrameUrl(key) && uuidSlugFromUrl(value.url) === r,
  )?.[0];
}
//@ chunk-gfcxsygg.js:489-747 placement
/**
 * 列出会话记录里仍保留的本地源页面（未被关闭的 frameUrls 条目）：路径、slug、url，以及是否是未经询问的例行/评论页面。
 */
function listHeldSourcePages(e) {
  return Object.entries(e.frameUrls ?? {}).flatMap(([key, value]) => {
    if (value?.url === undefined || isPersistableFrameUrl(key)) return [];
    if (value.dismissed === true) return [];
    let n = uuidSlugFromUrl(value.url);
    let unasked = value.routineUnasked === true || value.commentUnasked === true;
    return n === null
      ? []
      : [
          {
            path: key,
            slug: n,
            url: value.url,
            unasked,
          },
        ];
  });
}
//@ chunk-gfcxsygg.js:747-908 placement
function isWorkshopPage(e, r) {
  return Object.entries(e.frameUrls ?? {}).some(
    ([key, value]) =>
      value?.url !== undefined &&
      uuidSlugFromUrl(value.url) === r &&
      (key.endsWith(".workshop.html") || key.endsWith(".workshop.md")),
  );
}
//@ chunk-gfcxsygg.js:908-1000 placement
var c = Object.freeze({});
var sharedReadConsentAccessor = createFieldAccessor("artifactReadConsentSlugs", c);
var consentEpochAccessor = createFieldAccessor("artifactConsentEpoch", 0);
//@ chunk-gfcxsygg.js:1000-1195 placement
/**
 * 组装 artifact 会话存储：本会话发布记录、已记录页面查询（是否 workshop 页、本地源路径、保留的源页面）、共享读取同意与同意纪元。
 */
function createArtifactSessionStores(getAppState, setAppState) {
  return {
    ownPublishes: makeOwnPublishesStore(getAppState, setAppState),
    recordedPages: {
      isWorkshopPage: (s) => isWorkshopPage(getAppState(), s),
      localSourcePath: (s) => findLocalSourcePath(getAppState(), s),
      heldSourcePages: () => listHeldSourcePages(getAppState()),
    },
    sharedReadConsent: sharedReadConsentAccessor(getAppState, setAppState),
    consentEpoch: consentEpochAccessor(getAppState, setAppState),
  };
}
//@ chunk-gfcxsygg.js:1195-1251 placement
/**
 * 导出函数 `createEmptyArtifactSessionStores`：返回 createArtifactSessionStores( () => e, (r) => { e = r(e); }, )。
 */
function createEmptyArtifactSessionStores() {
  let e = {};
  return createArtifactSessionStores(
    () => e,
    (r) => {
      e = r(e);
    },
  );
}
//@ chunk-gfcxsygg.js:1251-1295 placement
/**
 * 导出函数 `NO_OP_COLOR_ASSIGNER`。
 */
var NO_OP_COLOR_ASSIGNER = {
  assign: () => AGENT_COLOR_NAMES[0],
  get: () => {
    return;
  },
};
//@ chunk-gfcxsygg.js:1295-1586 placement
/**
 * 按出现顺序为键分配代理颜色（循环使用颜色表），同一键始终返回同一颜色；get 只查不分配。
 */
function createColorAssigner(e) {
  return {
    assign(r) {
      let s = e.get();
      let n = s.assignments.get(r);
      if (n) return n;
      let o = AGENT_COLOR_NAMES[s.index % AGENT_COLOR_NAMES.length];
      e.set((i) => {
        if (i.assignments.has(r)) return i;
        let t = new Map(i.assignments);
        t.set(r, o);
        return {
          assignments: t,
          index: i.index + 1,
        };
      });
      return o;
    },
    get(r) {
      return e.get().assignments.get(r);
    },
  };
}
//@ chunk-gfcxsygg.js:1586-1640 placement
var Jce = Object.freeze({
  bridge: undefined,
  channel: undefined,
});
//@ chunk-gfcxsygg.js:1640-1813 placement
/**
 * 保存当前桥接对象与频道（connectBridge/disconnectBridge/setChannel）。
 */
class BridgeChannelSlot {
  #e = undefined;
  #r = undefined;
  get bridge() {
    return this.#e;
  }
  get channel() {
    return this.#r;
  }
  connectBridge(e) {
    this.#e = e;
  }
  disconnectBridge() {
    this.#e = undefined;
  }
  setChannel(e) {
    this.#r = e;
  }
}
export {
  BridgeChannelSlot,
  createColorAssigner,
  Jce,
  createEmptyArtifactSessionStores,
  NO_OP_COLOR_ASSIGNER,
  createArtifactSessionStores,
};
