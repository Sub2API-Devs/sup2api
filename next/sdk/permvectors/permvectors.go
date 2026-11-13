// Package permvectors holds the shared test vectors of scoped permission
// keys (CONTRACTS §21): canonical spellings, the implies table and the row
// check (core.DataScope.AllowsRow, the console's scopeAllowsRow). The
// server's perm package and the console's TypeScript implementation run the
// same file, so the two cannot drift.
package permvectors

import _ "embed"

// JSON is vectors.json:
//
//	{"canonical": [{"in": "...", "out": "..."} | {"in": "...", "invalid": true}],
//	 "implies":   [{"have": "...", "want": "...", "ok": bool}],
//	 "allows":    [{"have": ["..."], "action": "...", "me": 7,
//	               "row": {"id": 1, "created_by": 7 | null, "group_ids": [12] | null}, "ok": bool}]}
//
//go:embed vectors.json
var JSON []byte
