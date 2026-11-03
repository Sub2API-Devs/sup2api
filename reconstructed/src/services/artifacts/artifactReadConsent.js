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
import { rRe } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { uuidSlugFromUrl } from "../../tools/ArtifactTool/constants.js";
import { createFieldAccessor } from "../../state/sliceHelpers.js";
import { makeOwnPublishesStore } from "./ownPublishes.js";
import { AGENT_COLOR_NAMES } from "../../tools/AgentTool/agentColorManager.js";

//@ chunk-gfcxsygg.js:374-489 placement
function findLocalSourcePath(e, r) {
  return Object.entries(e.frameUrls ?? {}).find(
    ([s, n]) => n?.url !== void 0 && !rRe(s) && uuidSlugFromUrl(n.url) === r,
  )?.[0];
}
/**
 * 列出会话记录里仍保留的本地源页面（未被关闭的 frameUrls 条目）：路径、slug、url，以及是否是未经询问的例行/评论页面。
 */
//@ chunk-gfcxsygg.js:489-747 placement
function listHeldSourcePages(e) {
  return Object.entries(e.frameUrls ?? {}).flatMap(([r, s]) => {
    if (s?.url === void 0 || rRe(r)) return [];
    if (s.dismissed === !0) return [];
    let n = uuidSlugFromUrl(s.url),
      o = s.routineUnasked === !0 || s.commentUnasked === !0;
    return n === null ? [] : [{ path: r, slug: n, url: s.url, unasked: o }];
  });
}
//@ chunk-gfcxsygg.js:747-908 placement
function isWorkshopPage(e, r) {
  return Object.entries(e.frameUrls ?? {}).some(
    ([s, n]) =>
      n?.url !== void 0 &&
      uuidSlugFromUrl(n.url) === r &&
      (s.endsWith(".workshop.html") || s.endsWith(".workshop.md")),
  );
}
//@ chunk-gfcxsygg.js:908-1000 placement
var freeze = Object.freeze({}),
  g = createFieldAccessor("artifactReadConsentSlugs", freeze),
  u = createFieldAccessor("artifactConsentEpoch", 0);
/**
 * 组装 artifact 会话存储：本会话发布记录、已记录页面查询（是否 workshop 页、本地源路径、保留的源页面）、共享读取同意与同意纪元。
 */
//@ chunk-gfcxsygg.js:1000-1195 placement
function createArtifactSessionStores(e, r) {
  return {
    ownPublishes: makeOwnPublishesStore(e, r),
    recordedPages: {
      isWorkshopPage: (s) => isWorkshopPage(e(), s),
      localSourcePath: (s) => findLocalSourcePath(e(), s),
      heldSourcePages: () => listHeldSourcePages(e()),
    },
    sharedReadConsent: g(e, r),
    consentEpoch: u(e, r),
  };
}
//@ chunk-gfcxsygg.js:1195-1251 placement
function Uht() {
  let e = {};
  return createArtifactSessionStores(
    () => e,
    (r) => {
      e = r(e);
    },
  );
}
//@ chunk-gfcxsygg.js:1251-1295 placement
var Bht = {
  assign: () => AGENT_COLOR_NAMES[0],
  get: () => {
    return;
  },
};
/**
 * 按出现顺序为键分配代理颜色（循环使用颜色表），同一键始终返回同一颜色；get 只查不分配。
 */
//@ chunk-gfcxsygg.js:1295-1586 placement
function createColorAssigner(e) {
  return {
    assign(r) {
      let s = e.get(),
        n = s.assignments.get(r);
      if (n) return n;
      let o = AGENT_COLOR_NAMES[s.index % AGENT_COLOR_NAMES.length];
      return (
        e.set((i) => {
          if (i.assignments.has(r)) return i;
          let t = new Map(i.assignments);
          return (t.set(r, o), { assignments: t, index: i.index + 1 });
        }),
        o
      );
    },
    get(r) {
      return e.get().assignments.get(r);
    },
  };
}
//@ chunk-gfcxsygg.js:1586-1640 placement
var freeze_2 = Object.freeze({ bridge: void 0, channel: void 0 });
/**
 * 保存当前桥接对象与频道（connectBridge/disconnectBridge/setChannel）。
 */
//@ chunk-gfcxsygg.js:1640-1813 placement
class BridgeChannelSlot {
  #e = void 0;
  #r = void 0;
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
    this.#e = void 0;
  }
  setChannel(e) {
    this.#r = e;
  }
}

export { BridgeChannelSlot, createColorAssigner, freeze_2, Uht, Bht, createArtifactSessionStores };
