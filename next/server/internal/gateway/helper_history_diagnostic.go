package gateway

import (
	"context"
	"errors"
	"log/slog"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Never log an arbitrary parser/DB error string: it may contain client fields,
// ciphertext details or provider content. Stage plus bounded class identifies
// which custody check failed without describing every failure as a DB outage.
func logHelperFinalizationError(ctx context.Context, rid string, account int64, stage string, err error) {
	switch stage {
	case "public_prefix", "commit", "persist_uncertain_usage":
	default:
		stage = "unknown"
	}
	kind := "unclassified"
	if stage == "public_prefix" {
		kind = "invalid_public_response"
	}
	switch {
	case errors.Is(err, context.Canceled):
		kind = "canceled"
	case errors.Is(err, context.DeadlineExceeded):
		kind = "deadline_exceeded"
	default:
		var typed *core.Error
		if errors.As(err, &typed) {
			switch typed.Code {
			case "invalid_argument", "not_found", "conflict", "rate_limited", "unavailable", "internal":
				kind = typed.Code
			}
		}
	}
	slog.ErrorContext(ctx, "gateway: helper finalization failed", "request_id", rid, "account", account, "stage", stage, "error_kind", kind)
}
