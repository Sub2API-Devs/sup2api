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
function getQueuedCommandField(attachment, field) {
  let attachment_2 = attachment.type === "attachment" ? attachment.attachment : undefined;
  if (
    typeof attachment_2 !== "object" ||
    attachment_2 === null ||
    !("type" in attachment_2) ||
    attachment_2.type !== "queued_command"
  )
    return;
  let value = Reflect.get(attachment_2, field);
  return typeof value === "string" && value ? value : undefined;
}
//@ chunk-63641kq7.js:7403-7445 placement
function getSourceUuid(message) {
  return getQueuedCommandField(message, "source_uuid");
}
//@ chunk-63641kq7.js:7445-7487 placement
function getDeliveryId(message) {
  return getQueuedCommandField(message, "delivery_id");
}
//@ chunk-63641kq7.js:7487-7612 placement
function getMessageIdentityUuids(message) {
  let { submitUuid } = message;
  let uuids =
    getSourceUuid(message) ??
    (message.type === "system" && typeof submitUuid === "string" ? submitUuid : undefined);
  return uuids ? [message.uuid, uuids] : [message.uuid];
}
//@ chunk-63641kq7.js:7612-7680 placement
function getDroppedPromptUuids(message) {
  return message.type === "user" ? filterUuidList(message.droppedPromptUuids) : [];
}
//@ chunk-63641kq7.js:7680-7766 placement
function filterUuidList(list) {
  return Array.isArray(list) ? list.filter((uuid) => typeof uuid === "string" && uuid !== "") : [];
}
//@ chunk-63641kq7.js:7766-7864 placement
function findMessageIndexByUuid(messages, uuid) {
  let index = messages.findIndex((message) => message.uuid === uuid);
  return index !== -1 ? index : messages.findIndex((message) => getSourceUuid(message) === uuid);
}
export {
  getMessageIdentityUuids,
  getDroppedPromptUuids,
  getDeliveryId,
  findMessageIndexByUuid,
  getSourceUuid,
  filterUuidList,
};
