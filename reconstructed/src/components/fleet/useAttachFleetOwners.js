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
import { init_react_production, P } from "../../../vendor/react/cjs/react.production.js";
import { createSignal } from "../../utils/signal.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { createReducerStore } from "../../utils/killRing.js";

//@ chunk-ejntaqp9.js:336-340 placement
init_react_production();
//@ chunk-ejntaqp9.js:340-349 placement
var EMPTY_OWNERS = [];
//@ chunk-ejntaqp9.js:349-887 placement
/**
 * FleetView 会话所有者附着状态存储
 */
class FleetOwnersStore {
  #n = createSignal();
  #o = {
    entries: EMPTY_OWNERS,
    loading: false,
  };
  #t = false;
  #i = 0;
  #e = 0;
  getSnapshot = () => this.#o;
  subscribe = (e) => this.#n.subscribe(e);
  #r(e) {
    let t = this.#o;
    let r = {
      ...t,
      ...e,
    };
    if (r.entries === t.entries && r.loading === t.loading) return;
    this.#o = r;
    this.#n.emit();
  }
  get pending() {
    return this.#e !== 0;
  }
  clear() {
    this.#t = false;
    this.#r({
      entries: EMPTY_OWNERS,
    });
  }
  beginLoad() {
    this.#e = ++this.#i;
    if (!this.#t)
      this.#r({
        loading: true,
      });
    return this.#e;
  }
  endLoad(e) {
    if (e !== this.#e) return;
    this.#e = 0;
    this.#r({
      loading: false,
    });
  }
  setEntries(e) {
    this.#t = true;
    this.#r({
      entries: e.length === 0 ? EMPTY_OWNERS : e,
    });
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
    agentLastUsedMigrationDone: false,
    scope: null,
    resultSeen: {
      entryChannel: lit("unknown"),
      openFinished: null,
      emitted: new Set(),
    },
    fleetNudgeStore: null,
    killRing: createReducerStore(),
  };
}
//@ chunk-ejntaqp9.js:1154-1438 placement
/**
 * FleetView 附着会话所有者的 hook。
 */
function useAttachFleetOwners({ selection, view, attach, editor, deleteConfirm }, { clock, groupsEnabled }) {
  P(() => {
    let d = selection.attachView({
      clock,
      onError: editor.setError,
    });
    let p = view.attachView({
      groupsEnabled,
    });
    let c = attach.attachView();
    let h = editor.attachView();
    let S = deleteConfirm.attachView();
    return () => {
      S();
      h();
      c();
      p();
      d();
    };
  }, [selection, view, attach, editor, deleteConfirm, clock]);
}
export { createFleetViewHost, useAttachFleetOwners };
