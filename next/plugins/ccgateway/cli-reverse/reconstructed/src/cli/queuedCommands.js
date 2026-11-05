/**
 * cli/queuedCommands.ts
 *
 * 2.1.316 新增：排队命令（print/stream-json 模式下）的辅助函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jd53r7dh.js (7)
 * attribution: placement 7
 */

//@ chunk-jd53r7dh.js:6451-6659 placement (2.1.88 match: buildTranscriptEntries, 0.773)
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
//@ chunk-jd53r7dh.js:6659-6701 placement
function getSourceUuid(message) {
  return getQueuedCommandField(message, "source_uuid");
}
//@ chunk-jd53r7dh.js:6701-6743 placement
function getDeliveryId(message) {
  return getQueuedCommandField(message, "delivery_id");
}
//@ chunk-jd53r7dh.js:6743-6868 placement
function getMessageIdentityUuids(message) {
  let { submitUuid } = message;
  let uuids =
    getSourceUuid(message) ??
    (message.type === "system" && typeof submitUuid === "string" ? submitUuid : undefined);
  return uuids ? [message.uuid, uuids] : [message.uuid];
}
//@ chunk-jd53r7dh.js:6868-6936 placement
function getDroppedPromptUuids(message) {
  return message.type === "user" ? filterUuidList(message.droppedPromptUuids) : [];
}
//@ chunk-jd53r7dh.js:6936-7022 placement
function filterUuidList(list) {
  return Array.isArray(list) ? list.filter((uuid) => typeof uuid === "string" && uuid !== "") : [];
}
//@ chunk-jd53r7dh.js:7022-7120 placement
function findMessageIndexByUuid(messages, uuid) {
  let index = messages.findIndex((message) => message.uuid === uuid);
  return index !== -1 ? index : messages.findIndex((message) => getSourceUuid(message) === uuid);
}
export {
  getSourceUuid,
  filterUuidList,
  getMessageIdentityUuids,
  getDroppedPromptUuids,
  getDeliveryId,
  findMessageIndexByUuid,
};
