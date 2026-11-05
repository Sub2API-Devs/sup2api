/**
 * components/fleet/useAttachFleetOwners.ts
 *
 * 2.1.316 新增。FleetView 附着会话所有者的 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nc5fehpa.js (5)
 * attribution: placement 5
 */
import { init_react_production, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { createSignal } from "../../utils/signal.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { createReducerStore } from "../../utils/killRing.js";

//@ chunk-nc5fehpa.js:336-340 placement
init_react_production();
//@ chunk-nc5fehpa.js:340-349 placement
var EMPTY_OWNERS = [];
//@ chunk-nc5fehpa.js:349-887 placement
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
  subscribe = (listener) => this.#n.subscribe(listener);
  #r(patch) {
    let previous = this.#o;
    let next = {
      ...previous,
      ...patch,
    };
    if (next.entries === previous.entries && next.loading === previous.loading) return;
    this.#o = next;
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
  endLoad(token) {
    if (token !== this.#e) return;
    this.#e = 0;
    this.#r({
      loading: false,
    });
  }
  setEntries(entries) {
    this.#t = true;
    this.#r({
      entries: entries.length === 0 ? EMPTY_OWNERS : entries,
    });
  }
  get known() {
    return this.#t;
  }
}
//@ chunk-nc5fehpa.js:887-1154 placement
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
//@ chunk-nc5fehpa.js:1154-1438 placement
/**
 * FleetView 附着会话所有者的 hook。
 */
function useAttachFleetOwners({ selection, view, attach, editor, deleteConfirm }, { clock, groupsEnabled }) {
  useEffect(() => {
    let selectionDetach = selection.attachView({
      clock,
      onError: editor.setError,
    });
    let viewDetach = view.attachView({
      groupsEnabled,
    });
    let attachDetach = attach.attachView();
    let editorDetach = editor.attachView();
    let deleteDetach = deleteConfirm.attachView();
    return () => {
      deleteDetach();
      editorDetach();
      attachDetach();
      viewDetach();
      selectionDetach();
    };
  }, [selection, view, attach, editor, deleteConfirm, clock]);
}
export { createFleetViewHost, useAttachFleetOwners };
