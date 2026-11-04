/**
 * parse5/lib/common/error-codes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-6ja29j2n.js:1753-1759 esm-layout
var errors;
//@ chunk-6ja29j2n.js:1759-5754 esm-fingerprint
(function (errors) {
  errors.controlCharacterInInputStream = "control-character-in-input-stream";
  errors.noncharacterInInputStream = "noncharacter-in-input-stream";
  errors.surrogateInInputStream = "surrogate-in-input-stream";
  errors.nonVoidHtmlElementStartTagWithTrailingSolidus =
    "non-void-html-element-start-tag-with-trailing-solidus";
  errors.endTagWithAttributes = "end-tag-with-attributes";
  errors.endTagWithTrailingSolidus = "end-tag-with-trailing-solidus";
  errors.unexpectedSolidusInTag = "unexpected-solidus-in-tag";
  errors.unexpectedNullCharacter = "unexpected-null-character";
  errors.unexpectedQuestionMarkInsteadOfTagName = "unexpected-question-mark-instead-of-tag-name";
  errors.invalidFirstCharacterOfTagName = "invalid-first-character-of-tag-name";
  errors.unexpectedEqualsSignBeforeAttributeName = "unexpected-equals-sign-before-attribute-name";
  errors.missingEndTagName = "missing-end-tag-name";
  errors.unexpectedCharacterInAttributeName = "unexpected-character-in-attribute-name";
  errors.unknownNamedCharacterReference = "unknown-named-character-reference";
  errors.missingSemicolonAfterCharacterReference = "missing-semicolon-after-character-reference";
  errors.unexpectedCharacterAfterDoctypeSystemIdentifier =
    "unexpected-character-after-doctype-system-identifier";
  errors.unexpectedCharacterInUnquotedAttributeValue = "unexpected-character-in-unquoted-attribute-value";
  errors.eofBeforeTagName = "eof-before-tag-name";
  errors.eofInTag = "eof-in-tag";
  errors.missingAttributeValue = "missing-attribute-value";
  errors.missingWhitespaceBetweenAttributes = "missing-whitespace-between-attributes";
  errors.missingWhitespaceAfterDoctypePublicKeyword = "missing-whitespace-after-doctype-public-keyword";
  errors.missingWhitespaceBetweenDoctypePublicAndSystemIdentifiers =
    "missing-whitespace-between-doctype-public-and-system-identifiers";
  errors.missingWhitespaceAfterDoctypeSystemKeyword = "missing-whitespace-after-doctype-system-keyword";
  errors.missingQuoteBeforeDoctypePublicIdentifier = "missing-quote-before-doctype-public-identifier";
  errors.missingQuoteBeforeDoctypeSystemIdentifier = "missing-quote-before-doctype-system-identifier";
  errors.missingDoctypePublicIdentifier = "missing-doctype-public-identifier";
  errors.missingDoctypeSystemIdentifier = "missing-doctype-system-identifier";
  errors.abruptDoctypePublicIdentifier = "abrupt-doctype-public-identifier";
  errors.abruptDoctypeSystemIdentifier = "abrupt-doctype-system-identifier";
  errors.cdataInHtmlContent = "cdata-in-html-content";
  errors.incorrectlyOpenedComment = "incorrectly-opened-comment";
  errors.eofInScriptHtmlCommentLikeText = "eof-in-script-html-comment-like-text";
  errors.eofInDoctype = "eof-in-doctype";
  errors.nestedComment = "nested-comment";
  errors.abruptClosingOfEmptyComment = "abrupt-closing-of-empty-comment";
  errors.eofInComment = "eof-in-comment";
  errors.incorrectlyClosedComment = "incorrectly-closed-comment";
  errors.eofInCdata = "eof-in-cdata";
  errors.absenceOfDigitsInNumericCharacterReference = "absence-of-digits-in-numeric-character-reference";
  errors.nullCharacterReference = "null-character-reference";
  errors.surrogateCharacterReference = "surrogate-character-reference";
  errors.characterReferenceOutsideUnicodeRange = "character-reference-outside-unicode-range";
  errors.controlCharacterReference = "control-character-reference";
  errors.noncharacterCharacterReference = "noncharacter-character-reference";
  errors.missingWhitespaceBeforeDoctypeName = "missing-whitespace-before-doctype-name";
  errors.missingDoctypeName = "missing-doctype-name";
  errors.invalidCharacterSequenceAfterDoctypeName = "invalid-character-sequence-after-doctype-name";
  errors.duplicateAttribute = "duplicate-attribute";
  errors.nonConformingDoctype = "non-conforming-doctype";
  errors.missingDoctype = "missing-doctype";
  errors.misplacedDoctype = "misplaced-doctype";
  errors.endTagWithoutMatchingOpenElement = "end-tag-without-matching-open-element";
  errors.closingOfElementWithOpenChildElements = "closing-of-element-with-open-child-elements";
  errors.disallowedContentInNoscriptInHead = "disallowed-content-in-noscript-in-head";
  errors.openElementsLeftAfterEof = "open-elements-left-after-eof";
  errors.abandonedHeadElementChild = "abandoned-head-element-child";
  errors.misplacedStartTagForHeadElement = "misplaced-start-tag-for-head-element";
  errors.nestedNoscriptInHead = "nested-noscript-in-head";
  errors.eofInElementThatCanContainOnlyText = "eof-in-element-that-can-contain-only-text";
})(errors || (errors = {}));
export { errors };
