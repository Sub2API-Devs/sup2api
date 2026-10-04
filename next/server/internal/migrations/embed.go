// Package migrations embeds the core SQL migrations.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS

// FirstIdempotentMigration is the first core migration from which every
// migration must be safe to run again (CREATE ... IF NOT EXISTS, ADD COLUMN
// IF NOT EXISTS, one-off data fixes guarded so a re-run does not repeat
// them): a managed upgrade can be interrupted after a migration commits
// and before the node records it everywhere. Earlier migrations predate the
// rule and are immutable once deployed.
const FirstIdempotentMigration = "0026_account_auto_disable.sql"
