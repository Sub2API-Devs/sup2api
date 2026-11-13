// Package permvectors holds the shared test vectors of scoped permission
// keys (CONTRACTS §21): canonical spellings and the implies table. The
// server's perm package and the console's TypeScript implementation run the
// same file, so the two cannot drift.
package permvectors

import _ "embed"

// JSON is vectors.json:
//
//	{"canonical": [{"in": "...", "out": "..."} | {"in": "...", "invalid": true}],
//	 "implies":   [{"have": "...", "want": "...", "ok": bool}]}
//
//go:embed vectors.json
var JSON []byte
