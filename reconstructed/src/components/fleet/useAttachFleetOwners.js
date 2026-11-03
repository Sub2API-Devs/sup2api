/**
 * components/fleet/useAttachFleetOwners.ts
 *
 * 2.1.316 新增。FleetView 附着会话所有者的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ejntaqp9.js (5)
 * attribution: placement 5
 */
import { j, P } from "../../../vendor/react/cjs/react.production.js";
import { createSignal } from "../../utils/signal.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { createReducerStore } from "../../utils/killRing.js";

//@ chunk-ejntaqp9.js:336-340 placement
j();
//@ chunk-ejntaqp9.js:340-349 placement
var n = [];
/**
 * FleetView 会话所有者附着状态存储
 */
//@ chunk-ejntaqp9.js:349-887 placement
class FleetOwnersStore {
  #n = createSignal();
  #o = { entries: n, loading: !1 };
  #t = !1;
  #i = 0;
  #e = 0;
  getSnapshot = () => this.#o;
  subscribe = (e) => this.#n.subscribe(e);
  #r(e) {
    let t = this.#o,
      r = { ...t, ...e };
    if (r.entries === t.entries && r.loading === t.loading) return;
    ((this.#o = r), this.#n.emit());
  }
  get pending() {
    return this.#e !== 0;
  }
  clear() {
    ((this.#t = !1), this.#r({ entries: n }));
  }
  beginLoad() {
    if (((this.#e = ++this.#i), !this.#t)) this.#r({ loading: !0 });
    return this.#e;
  }
  endLoad(e) {
    if (e !== this.#e) return;
    ((this.#e = 0), this.#r({ loading: !1 }));
  }
  setEntries(e) {
    ((this.#t = !0), this.#r({ entries: e.length === 0 ? n : e }));
  }
  get known() {
    return this.#t;
  }
}
//@ chunk-ejntaqp9.js:887-1154 placement
function createFleetViewHost() {
  return {
    roster: null,
    selection: null,
    view: null,
    attach: null,
    editor: null,
    deleteConfirm: null,
    earlier: new FleetOwnersStore(),
    agentLastUsedMigrationDone: !1,
    scope: null,
    resultSeen: { entryChannel: lit("unknown"), openFinished: null, emitted: new Set() },
    fleetNudgeStore: null,
    killRing: createReducerStore(),
  };
}
/**
 * FleetView 附着会话所有者的 hook。
 */
//@ chunk-ejntaqp9.js:1154-1438 placement
function useAttachFleetOwners(
  { selection: selection, view: view, attach: attach, editor: editor, deleteConfirm: deleteConfirm },
  { clock: clock, groupsEnabled: groupsEnabled },
) {
  P(() => {
    let attachView = selection.attachView({ clock: clock, onError: editor.setError }),
      attachView_2 = view.attachView({ groupsEnabled: groupsEnabled }),
      attachView_3 = attach.attachView(),
      attachView_4 = editor.attachView(),
      attachView_5 = deleteConfirm.attachView();
    return () => {
      (attachView_5(), attachView_4(), attachView_3(), attachView_2(), attachView());
    };
  }, [selection, view, attach, editor, deleteConfirm, clock]);
}

export { createFleetViewHost, useAttachFleetOwners };
