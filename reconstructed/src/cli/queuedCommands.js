/**
 * cli/queuedCommands.ts
 *
 * 2.1.316 新增：排队命令（print/stream-json 模式下）的辅助函数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63641kq7.js (7)
 * attribution: placement 7
 */

//@ chunk-63641kq7.js:7195-7403 placement
function getQueuedCommandField(e, n) {
  let attachment = e.type === "attachment" ? e.attachment : undefined;
  if (
    typeof attachment !== "object" ||
    attachment === null ||
    !("type" in attachment) ||
    attachment.type !== "queued_command"
  )
    return;
  let t = Reflect.get(attachment, n);
  return typeof t === "string" && t ? t : undefined;
}
//@ chunk-63641kq7.js:7403-7445 placement
function getSourceUuid(e) {
  return getQueuedCommandField(e, "source_uuid");
}
//@ chunk-63641kq7.js:7445-7487 placement
function getDeliveryId(e) {
  return getQueuedCommandField(e, "delivery_id");
}
//@ chunk-63641kq7.js:7487-7612 placement
function getMessageIdentityUuids(e) {
  let { submitUuid } = e;
  let r =
    getSourceUuid(e) ?? (e.type === "system" && typeof submitUuid === "string" ? submitUuid : undefined);
  return r ? [e.uuid, r] : [e.uuid];
}
//@ chunk-63641kq7.js:7612-7680 placement
function getDroppedPromptUuids(e) {
  return e.type === "user" ? filterUuidList(e.droppedPromptUuids) : [];
}
//@ chunk-63641kq7.js:7680-7766 placement
function filterUuidList(e) {
  return Array.isArray(e) ? e.filter((n) => typeof n === "string" && n !== "") : [];
}
//@ chunk-63641kq7.js:7766-7864 placement
function findMessageIndexByUuid(e, uuid) {
  let index = e.findIndex((t) => t.uuid === uuid);
  return index !== -1 ? index : e.findIndex((t) => getSourceUuid(t) === uuid);
}
export {
  getMessageIdentityUuids,
  getDroppedPromptUuids,
  getDeliveryId,
  findMessageIndexByUuid,
  getSourceUuid,
  filterUuidList,
};
