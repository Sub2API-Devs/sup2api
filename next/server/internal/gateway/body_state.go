package gateway

import (
	"crypto/sha256"

	"github.com/tidwall/gjson"
)

// sameBytes reports whether a and b are the same slice: the same backing
// array, length included. It only decides whether a cached result of the
// current body may be reused; a false answer costs one recomputation.
func sameBytes(a, b []byte) bool {
	return len(a) == len(b) && (len(a) == 0 || &a[0] == &b[0])
}

// bodyRoot is the current body parsed as a gjson root, parsed once per body
// version. gjson keeps a document as a string, so parsing copies it (a
// megabyte for a large request), and the model-reference scan runs once per
// declared rule — before hooks, after hooks, and per patch comparison. setBody
// drops it: a scan of the new bytes must not see the old document.
func (c *call) bodyRoot() gjson.Result {
	if !c.docValid {
		c.doc, c.docValid = gjson.ParseBytes(c.body), true
	}
	return c.doc
}

// rootFor is bodyRoot for body when that is the current request body, and a
// fresh parse otherwise (a converted or patched copy).
func (c *call) rootFor(body []byte) gjson.Result {
	if sameBytes(body, c.body) {
		return c.bodyRoot()
	}
	return gjson.ParseBytes(body)
}

// digestFor is bodyDigest for the current body, and a fresh hash otherwise.
func (c *call) digestFor(body []byte) [32]byte {
	if sameBytes(body, c.body) {
		return c.bodyDigest()
	}
	return sha256.Sum256(body)
}

// bodyDigest is the SHA-256 of the current body, computed once per body
// version. The request path asks for it more than once (resource scan, the
// before/after comparison of plugin patches); hashing a megabyte each time is
// wasted work, and a hook that replaces the body invalidates it through
// setBody.
func (c *call) bodyDigest() [32]byte {
	if !c.digestValid {
		c.digest = sha256.Sum256(c.body)
		c.digestValid = true
	}
	return c.digest
}
