/**
 * @aws-sdk/xml-builder/dist-cjs/xml-external/nodable_entities.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-sdk/xml-builder@3.921.0..3.972.5
 * pieces: chunk-s1zey0a9.js (1)
 * attribution: esm-fingerprint 1
 */
//@ chunk-s1zey0a9.js:5442-5836 esm-fingerprint
var MESSAGE_ELEMENT_RE = /<message\b([^>]*)>([\s\S]*?)<\/message>/g;
var PREVIOUS_BODY_RE =
  /<previous-body>[\s\S]*?<\/previous-body>|<reply-to\b[^>]*>[\s\S]*?<\/reply-to>|<mentions\b[^>]*>[\s\S]*?<\/mentions>|<reactions\b[^>]*>[\s\S]*?<\/reactions>|<attachment\b[^>]*\/>|<attachment\b[^>]*>[\s\S]*?<\/attachment>/g;
var REPLY_TO_START_RE = /<reply-to\b([^>]*)>/g;
var ENTITY_RE = /&(amp|lt|gt|quot|apos|#x[0-9a-f]+|#\d+);/gi;
var NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};
export { PREVIOUS_BODY_RE, MESSAGE_ELEMENT_RE, ENTITY_RE, NAMED_ENTITIES, REPLY_TO_START_RE };
