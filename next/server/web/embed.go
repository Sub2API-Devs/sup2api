// Package web embeds the console build output (next/web → server/web/dist).
package web

import "embed"

//go:embed all:dist
var Dist embed.FS
