// Package migrations embeds the core SQL migrations.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
