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
  for (let [drawingKey, drawing] of byDrawing)
    if (drawingKey !== except && drawingKey.startsWith(`${plugin}\x00`)) {
      let entry = drawing.get(handle);
      if (entry !== undefined) return entry;
    }
  return;
}
//@ chunk-s61vbvea.js:596893-597128 placement
function carryForwardHandles({ previous, handles, ...rest }) {
  let currentHandles = new Set(handles);
  return new Map([
    ...previous,
    ...[...previous].flatMap(([previousHandle, entry], index) => {
      let newHandle = handles[index];
      return newHandle !== undefined &&
        !previous.has(newHandle) &&
        !currentHandles.has(previousHandle) &&
        findHandleInOtherDrawings({
          ...rest,
          handle: previousHandle,
        }) === undefined &&
        findHandleInOtherDrawings({
          ...rest,
          handle: newHandle,
        }) === undefined
        ? [[newHandle, entry]]
        : [];
    }),
  ]);
}
//@ chunk-s61vbvea.js:597128-597201 placement
/**
 * 云回收站条目的键（文件、组件、请求 id 与面板）。
 */
var cloudTrashEntryKey = (plugin, target) =>
  `${plugin}\x00${target.component}\x00${target.requestId}\x00${target.surface}`;
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
  let pressesByHandle = new Map();
  let byDrawing = new Map();
  let drawnByDrawing = new Map();
  let suffix = randomTrashSuffix();
  return {
    heldPress: (plugin, handle, element) => {
      let press = pressesByHandle.get(handle);
      return press?.plugin === plugin &&
        (element === undefined || element === "" || press.element === element)
        ? press
        : undefined;
    },
    holdDrawing(plugin, { drawn, ...target }, handles) {
      let drawingKey = cloudTrashEntryKey(plugin, target);
      let previous = byDrawing.get(drawingKey) ?? new Map();
      let entries = new Map();
      let carried =
        drawn !== undefined && drawn === drawnByDrawing.get(drawingKey) && handles.length === previous.size
          ? carryForwardHandles({
              byDrawing,
              plugin,
              except: drawingKey,
              previous,
              handles: handles.map((handleEntry) => handleEntry.handle),
            })
          : previous;
      for (let { tag, handle, element, pressableLinks, options } of handles) {
        let entry =
          carried.get(handle) ??
          findHandleInOtherDrawings({
            byDrawing,
            plugin,
            except: drawingKey,
            handle,
          }) ??
          ++suffix;
        entries.set(handle, entry);
        pressesByHandle.set(entry, {
          tag,
          plugin,
          handle,
          element,
          ...(pressableLinks !== undefined && {
            pressableLinks,
          }),
          ...(options !== undefined && {
            options,
          }),
          ...target,
        });
      }
      let released = [];
      let heldSet = new Set(entries.values());
      for (let [handle, entry] of previous)
        if (
          !entries.has(handle) &&
          findHandleInOtherDrawings({
            byDrawing,
            plugin,
            except: drawingKey,
            handle,
          }) === undefined
        ) {
          if (!heldSet.has(entry)) pressesByHandle.delete(entry);
          released.push(handle);
        }
      if (entries.size === 0) byDrawing.delete(drawingKey);
      else byDrawing.set(drawingKey, entries);
      if (entries.size === 0) drawnByDrawing.delete(drawingKey);
      else drawnByDrawing.set(drawingKey, drawn);
      return {
        hosted: entries,
        released,
      };
    },
    holdersOf: (handle) =>
      Array.from(byDrawing.keys())
        .filter((key) => key.endsWith(cloudTrashEntryKey("", handle)))
        .map((key) => key.slice(0, key.indexOf("\x00"))),
    forgetPresses(plugin) {
      for (let [handle, press] of pressesByHandle)
        if (press.plugin === plugin) pressesByHandle.delete(handle);
      for (let key of byDrawing.keys())
        if (key.startsWith(`${plugin}\x00`)) {
          byDrawing.delete(key);
          drawnByDrawing.delete(key);
        }
    },
    heldByKeyOf({ tag, plugin, element, surface, component, requestId }) {
      let filtered = [...pressesByHandle.values()].filter(
        (entry) =>
          entry.tag === tag &&
          entry.plugin === plugin &&
          entry.element === element &&
          entry.surface === surface &&
          entry.component === component &&
          (requestId === undefined || entry.requestId === requestId),
      );
      return filtered.length === 1 ? filtered[0] : undefined;
    },
    hostedButtonsOf: (plugin, element) =>
      [...pressesByHandle]
        .filter(([, button]) => button.plugin === plugin && button.element === element)
        .map(([hosted, button]) => ({
          hosted,
          button,
        })),
    heldPressCount: () => pressesByHandle.size,
  };
}
//@ chunk-s61vbvea.js:598766-598779 placement
/**
 * 把文件移入云回收站（保留时间戳等元信息）。
 */
var moveToCloudTrash = moveToCloudTrash_2();
export { moveToCloudTrash, CLOUD_TRASH_DIR, CLOUD_TRASH_MARKER_FILE, GITIGNORE_FILE_NAME };
