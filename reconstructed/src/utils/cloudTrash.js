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
/**
 * 云回收站目录里的标记文件名。
 */
var CLOUD_TRASH_DIR = "claude-cloud-trash";
var CLOUD_TRASH_MARKER_FILE = ".claude-cloud-trash";
var GITIGNORE_FILE_NAME = ".gitignore";
//@ chunk-s61vbvea.js:596741-596893 placement
function findHandleInOtherDrawings({ byDrawing, plugin, except, handle }) {
  for (let [h, y] of byDrawing)
    if (h !== except && h.startsWith(`${plugin}\x00`)) {
      let S = y.get(handle);
      if (S !== undefined) return S;
    }
  return;
}
//@ chunk-s61vbvea.js:596893-597128 placement
function carryForwardHandles({ previous, handles, ...r }) {
  let s = new Set(handles);
  return new Map([
    ...previous,
    ...[...previous].flatMap(([h, y], S) => {
      let w = handles[S];
      return w !== undefined &&
        !previous.has(w) &&
        !s.has(h) &&
        findHandleInOtherDrawings({
          ...r,
          handle: h,
        }) === undefined &&
        findHandleInOtherDrawings({
          ...r,
          handle: w,
        }) === undefined
        ? [[w, y]]
        : [];
    }),
  ]);
}
//@ chunk-s61vbvea.js:597128-597201 placement
/**
 * 云回收站条目的键（文件、组件、请求 id 与面板）。
 */
var cloudTrashEntryKey = (e, n) => `${e}\x00${n.component}\x00${n.requestId}\x00${n.surface}`;
//@ chunk-s61vbvea.js:597201-597219 placement
/**
 * 回收站随机后缀的上限（2^30）。
 */
var TRASH_SUFFIX_RANGE_EXCLUSIVE = 1073741824;
//@ chunk-s61vbvea.js:597219-597259 placement
/**
 * 生成回收站目录的随机后缀。
 */
var randomTrashSuffix = () => Math.floor(Math.random() * TRASH_SUFFIX_RANGE_EXCLUSIVE);
//@ chunk-s61vbvea.js:597259-598766 placement
function moveToCloudTrash_2() {
  let e = new Map();
  let n = new Map();
  let r = new Map();
  let s = randomTrashSuffix();
  return {
    heldPress: (h, y, S) => {
      let w = e.get(y);
      return w?.plugin === h && (S === undefined || S === "" || w.element === S) ? w : undefined;
    },
    holdDrawing(h, { drawn, ...S }, w) {
      let R = cloudTrashEntryKey(h, S);
      let x = n.get(R) ?? new Map();
      let P = new Map();
      let G =
        drawn !== undefined && drawn === r.get(R) && w.length === x.size
          ? carryForwardHandles({
              byDrawing: n,
              plugin: h,
              except: R,
              previous: x,
              handles: w.map((Q) => Q.handle),
            })
          : x;
      for (let { tag, handle, element, pressableLinks, options } of w) {
        let re =
          G.get(handle) ??
          findHandleInOtherDrawings({
            byDrawing: n,
            plugin: h,
            except: R,
            handle,
          }) ??
          ++s;
        P.set(handle, re);
        e.set(re, {
          tag,
          plugin: h,
          handle,
          element,
          ...(pressableLinks !== undefined && {
            pressableLinks,
          }),
          ...(options !== undefined && {
            options,
          }),
          ...S,
        });
      }
      let L = [];
      let q = new Set(P.values());
      for (let [Q, Z] of x)
        if (
          !P.has(Q) &&
          findHandleInOtherDrawings({
            byDrawing: n,
            plugin: h,
            except: R,
            handle: Q,
          }) === undefined
        ) {
          if (!q.has(Z)) e.delete(Z);
          L.push(Q);
        }
      if (P.size === 0) n.delete(R);
      else n.set(R, P);
      if (P.size === 0) r.delete(R);
      else r.set(R, drawn);
      return {
        hosted: P,
        released: L,
      };
    },
    holdersOf: (h) =>
      Array.from(n.keys())
        .filter((key) => key.endsWith(cloudTrashEntryKey("", h)))
        .map((key) => key.slice(0, key.indexOf("\x00"))),
    forgetPresses(h) {
      for (let [y, S] of e) if (S.plugin === h) e.delete(y);
      for (let key of n.keys())
        if (key.startsWith(`${h}\x00`)) {
          n.delete(key);
          r.delete(key);
        }
    },
    heldByKeyOf({ tag, plugin, element, surface, component, requestId }) {
      let filtered = [...e.values()].filter(
        (G) =>
          G.tag === tag &&
          G.plugin === plugin &&
          G.element === element &&
          G.surface === surface &&
          G.component === component &&
          (requestId === undefined || G.requestId === requestId),
      );
      return filtered.length === 1 ? filtered[0] : undefined;
    },
    hostedButtonsOf: (h, y) =>
      [...e]
        .filter(([, S]) => S.plugin === h && S.element === y)
        .map(([S, w]) => ({
          hosted: S,
          button: w,
        })),
    heldPressCount: () => e.size,
  };
}
//@ chunk-s61vbvea.js:598766-598779 placement
/**
 * 把文件移入云回收站（保留时间戳等元信息）。
 */
var moveToCloudTrash = moveToCloudTrash_2();
export { moveToCloudTrash, CLOUD_TRASH_DIR, CLOUD_TRASH_MARKER_FILE, GITIGNORE_FILE_NAME };
