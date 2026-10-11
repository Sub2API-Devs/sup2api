package core

import (
	"context"
	"time"
)

type AccountStatsReader interface {
	AccountStats(context.Context, []int64, int) (AccountStatsSnapshot, error)
}

type AccountStatsSnapshot struct {
	WindowSeconds int                `json:"window_seconds"`
	ObservedSince *time.Time         `json:"observed_since"`
	AsOf          time.Time          `json:"as_of"`
	Status        string             `json:"status"`
	Accounts      []AccountStatsView `json:"accounts"`
}

type AccountStatsView struct {
	AccountID       int64    `json:"account_id"`
	SuccessRequests *int64   `json:"success_requests"`
	SuccessTokens   *int64   `json:"success_tokens"`
	PendingUsage    *int64   `json:"pending_usage"`
	RPM             *float64 `json:"rpm"`
	TPM             *float64 `json:"tpm"`
	InUse           *int     `json:"in_use"`
}
