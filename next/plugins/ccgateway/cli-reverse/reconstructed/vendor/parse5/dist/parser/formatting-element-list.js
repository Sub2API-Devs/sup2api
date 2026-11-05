/**
 * parse5/dist/parser/formatting-element-list.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-p9ac6cnb.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */

//@ chunk-p9ac6cnb.js:122132-122138 esm-layout
var EntryType;
//@ chunk-p9ac6cnb.js:122138-122212 esm-fingerprint
(function (EntryType) {
  EntryType[(EntryType.Marker = 0)] = "Marker";
  EntryType[(EntryType.Element = 1)] = "Element";
})(EntryType || (EntryType = {}));
//@ chunk-p9ac6cnb.js:122212-122235 esm-fingerprint
var MARKER = {
  type: EntryType.Marker,
};
//@ chunk-p9ac6cnb.js:122235-123774 esm-fingerprint
class FormattingElementList {
  constructor(treeAdapter) {
    this.treeAdapter = treeAdapter;
    this.entries = [];
    this.bookmark = null;
  }
  _getNoahArkConditionCandidates(newElement, neAttrs) {
    let candidates = [];
    let neAttrsLength = neAttrs.length;
    let neTagName = this.treeAdapter.getTagName(newElement);
    let neNamespaceURI = this.treeAdapter.getNamespaceURI(newElement);
    for (let i = 0; i < this.entries.length; i++) {
      let entry = this.entries[i];
      if (entry.type === EntryType.Marker) break;
      let { element } = entry;
      if (
        this.treeAdapter.getTagName(element) === neTagName &&
        this.treeAdapter.getNamespaceURI(element) === neNamespaceURI
      ) {
        let elementAttrs = this.treeAdapter.getAttrList(element);
        if (elementAttrs.length === neAttrsLength)
          candidates.push({
            idx: i,
            attrs: elementAttrs,
          });
      }
    }
    return candidates;
  }
  _ensureNoahArkCondition(newElement) {
    if (this.entries.length < 3) return;
    let neAttrs = this.treeAdapter.getAttrList(newElement);
    let candidates = this._getNoahArkConditionCandidates(newElement, neAttrs);
    if (candidates.length < 3) return;
    let neAttrsMap = new Map(neAttrs.map((neAttr) => [neAttr.name, neAttr.value]));
    let validCandidates = 0;
    for (let i = 0; i < candidates.length; i++) {
      let candidate = candidates[i];
      if (candidate.attrs.every((cAttr) => neAttrsMap.get(cAttr.name) === cAttr.value)) {
        validCandidates += 1;
        if (validCandidates >= 3) this.entries.splice(candidate.idx, 1);
      }
    }
  }
  insertMarker() {
    this.entries.unshift(MARKER);
  }
  pushElement(element, token) {
    this._ensureNoahArkCondition(element);
    this.entries.unshift({
      type: EntryType.Element,
      element,
      token,
    });
  }
  insertElementAfterBookmark(element, token) {
    let bookmarkIdx = this.entries.indexOf(this.bookmark);
    this.entries.splice(bookmarkIdx, 0, {
      type: EntryType.Element,
      element,
      token,
    });
  }
  removeEntry(entry) {
    let entryIndex = this.entries.indexOf(entry);
    if (entryIndex >= 0) this.entries.splice(entryIndex, 1);
  }
  clearToLastMarker() {
    let markerIdx = this.entries.indexOf(MARKER);
    if (markerIdx >= 0) this.entries.splice(0, markerIdx + 1);
    else this.entries.length = 0;
  }
  getElementEntryInScopeWithTagName(tagName) {
    let entry = this.entries.find(
      (entry) => entry.type === EntryType.Marker || this.treeAdapter.getTagName(entry.element) === tagName,
    );
    return entry && entry.type === EntryType.Element ? entry : null;
  }
  getElementEntry(element) {
    return this.entries.find((entry) => entry.type === EntryType.Element && entry.element === element);
  }
}
export { FormattingElementList, EntryType };
