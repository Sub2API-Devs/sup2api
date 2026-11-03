/**
 * utils/cloudTrash.ts
 *
 * 云端回收目录（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */

//@ chunk-s61vbvea.js:596669-596741 placement
var CLOUD_TRASH_DIR = "claude-cloud-trash",
  Nti = ".claude-cloud-trash",
  $ti = ".gitignore";
//@ chunk-s61vbvea.js:596741-596893 placement
function findHandleInOtherDrawings({ byDrawing: byDrawing, plugin: plugin, except: except, handle: handle }) {
  for (let [h, y] of byDrawing)
    if (h !== except && h.startsWith(`${plugin}\x00`)) {
      let S = y.get(handle);
      if (S !== void 0) return S;
    }
  return;
}
//@ chunk-s61vbvea.js:596893-597128 placement
function carryForwardHandles({ previous: previous, handles: handles, ...r }) {
  let s = new Set(handles);
  return new Map([
    ...previous,
    ...[...previous].flatMap(([h, y], S) => {
      let w = handles[S];
      return w !== void 0 &&
        !previous.has(w) &&
        !s.has(h) &&
        findHandleInOtherDrawings({ ...r, handle: h }) === void 0 &&
        findHandleInOtherDrawings({ ...r, handle: w }) === void 0
        ? [[w, y]]
        : [];
    }),
  ]);
}
//@ chunk-s61vbvea.js:597128-597201 placement
var yp = (e, n) => `${e}\x00${n.component}\x00${n.requestId}\x00${n.surface}`;
//@ chunk-s61vbvea.js:597201-597219 placement
var SE = 1073741824;
//@ chunk-s61vbvea.js:597219-597259 placement
var _E = () => Math.floor(Math.random() * SE);
//@ chunk-s61vbvea.js:597259-598766 placement
function moveToCloudTrash() {
  let e = new Map(),
    n = new Map(),
    r = new Map(),
    s = _E();
  return {
    heldPress: (h, y, S) => {
      let w = e.get(y);
      return w?.plugin === h && (S === void 0 || S === "" || w.element === S) ? w : void 0;
    },
    holdDrawing(h, { drawn: y, ...S }, w) {
      let R = yp(h, S),
        x = n.get(R) ?? new Map(),
        P = new Map(),
        G =
          y !== void 0 && y === r.get(R) && w.length === x.size
            ? carryForwardHandles({
                byDrawing: n,
                plugin: h,
                except: R,
                previous: x,
                handles: w.map((Q) => Q.handle),
              })
            : x;
      for (let {
        tag: tag,
        handle: handle,
        element: element,
        pressableLinks: pressableLinks,
        options: options,
      } of w) {
        let re =
          G.get(handle) ??
          findHandleInOtherDrawings({ byDrawing: n, plugin: h, except: R, handle: handle }) ??
          ++s;
        (P.set(handle, re),
          e.set(re, {
            tag: tag,
            plugin: h,
            handle: handle,
            element: element,
            ...(pressableLinks !== void 0 && { pressableLinks: pressableLinks }),
            ...(options !== void 0 && { options: options }),
            ...S,
          }));
      }
      let L = [],
        q = new Set(P.values());
      for (let [Q, Z] of x)
        if (
          !P.has(Q) &&
          findHandleInOtherDrawings({ byDrawing: n, plugin: h, except: R, handle: Q }) === void 0
        ) {
          if (!q.has(Z)) e.delete(Z);
          L.push(Q);
        }
      return (
        P.size === 0 ? n.delete(R) : n.set(R, P),
        P.size === 0 ? r.delete(R) : r.set(R, y),
        { hosted: P, released: L }
      );
    },
    holdersOf: (h) =>
      Array.from(n.keys())
        .filter((y) => y.endsWith(yp("", h)))
        .map((y) => y.slice(0, y.indexOf("\x00"))),
    forgetPresses(h) {
      for (let [y, S] of e) if (S.plugin === h) e.delete(y);
      for (let y of n.keys()) if (y.startsWith(`${h}\x00`)) (n.delete(y), r.delete(y));
    },
    heldByKeyOf({ tag: h, plugin: y, element: S, surface: w, component: R, requestId: x }) {
      let filtered = [...e.values()].filter(
        (G) =>
          G.tag === h &&
          G.plugin === y &&
          G.element === S &&
          G.surface === w &&
          G.component === R &&
          (x === void 0 || G.requestId === x),
      );
      return filtered.length === 1 ? filtered[0] : void 0;
    },
    hostedButtonsOf: (h, y) =>
      [...e].filter(([, S]) => S.plugin === h && S.element === y).map(([S, w]) => ({ hosted: S, button: w })),
    heldPressCount: () => e.size,
  };
}
//@ chunk-s61vbvea.js:598766-598779 placement
var _ee = moveToCloudTrash();

export { _ee, CLOUD_TRASH_DIR, Nti, $ti };
