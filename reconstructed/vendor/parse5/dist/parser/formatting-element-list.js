/**
 * parse5/dist/parser/formatting-element-list.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: parse5@7.2.0..7.2.1
 * pieces: chunk-6ja29j2n.js (4)
 * attribution: esm-layout 1, esm-fingerprint 3
 */

//@ chunk-6ja29j2n.js:122132-122138 esm-layout
var p;
//@ chunk-6ja29j2n.js:122138-122212 esm-fingerprint
(function (e) {
  ((e[(e.Marker = 0)] = "Marker"), (e[(e.Element = 1)] = "Element"));
})(p || (p = {}));
//@ chunk-6ja29j2n.js:122212-122235 esm-fingerprint
var Fe = { type: p.Marker };
//@ chunk-6ja29j2n.js:122235-123774 esm-fingerprint
class le {
  constructor(e) {
    ((this.treeAdapter = e), (this.entries = []), (this.bookmark = null));
  }
  _getNoahArkConditionCandidates(e, t) {
    let a = [],
      n = t.length,
      tagName = this.treeAdapter.getTagName(e),
      namespaceURI = this.treeAdapter.getNamespaceURI(e);
    for (let l = 0; l < this.entries.length; l++) {
      let _ = this.entries[l];
      if (_.type === p.Marker) break;
      let { element: element } = _;
      if (
        this.treeAdapter.getTagName(element) === tagName &&
        this.treeAdapter.getNamespaceURI(element) === namespaceURI
      ) {
        let attrList = this.treeAdapter.getAttrList(element);
        if (attrList.length === n) a.push({ idx: l, attrs: attrList });
      }
    }
    return a;
  }
  _ensureNoahArkCondition(e) {
    if (this.entries.length < 3) return;
    let attrList = this.treeAdapter.getAttrList(e),
      _getNoahArkConditionCandidates = this._getNoahArkConditionCandidates(e, attrList);
    if (_getNoahArkConditionCandidates.length < 3) return;
    let n = new Map(attrList.map((h) => [h.name, h.value])),
      d = 0;
    for (let h = 0; h < _getNoahArkConditionCandidates.length; h++) {
      let l = _getNoahArkConditionCandidates[h];
      if (l.attrs.every((attr) => n.get(attr.name) === attr.value)) {
        if (((d += 1), d >= 3)) this.entries.splice(l.idx, 1);
      }
    }
  }
  insertMarker() {
    this.entries.unshift(Fe);
  }
  pushElement(e, t) {
    (this._ensureNoahArkCondition(e), this.entries.unshift({ type: p.Element, element: e, token: t }));
  }
  insertElementAfterBookmark(e, t) {
    let index = this.entries.indexOf(this.bookmark);
    this.entries.splice(index, 0, { type: p.Element, element: e, token: t });
  }
  removeEntry(e) {
    let index = this.entries.indexOf(e);
    if (index >= 0) this.entries.splice(index, 1);
  }
  clearToLastMarker() {
    let index = this.entries.indexOf(Fe);
    if (index >= 0) this.entries.splice(0, index + 1);
    else this.entries.length = 0;
  }
  getElementEntryInScopeWithTagName(e) {
    let found = this.entries.find(
      (entry) => entry.type === p.Marker || this.treeAdapter.getTagName(entry.element) === e,
    );
    return found && found.type === p.Element ? found : null;
  }
  getElementEntry(e) {
    return this.entries.find((entry) => entry.type === p.Element && entry.element === e);
  }
}

export { le, p };
