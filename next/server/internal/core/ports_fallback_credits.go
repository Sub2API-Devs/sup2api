package core

import (
	"context"
	"time"
)

// FallbackCredit contains hashes and verified routing facts, never the token
// itself or request content. Ownership survives rotation of a platform API key.
type FallbackCredit struct {
	TokenHash, PluginKey, SourceModel string
	Owner                             ResourceOwner
	Binding                           ResourceBinding
	PromptDigests                     []string
	ObservedAt, ExpiresAt             time.Time
}

type FallbackCreditLookup struct {
	Owner                   ResourceOwner
	TokenHash, PromptDigest string
}

type FallbackCredits interface {
	Record(context.Context, FallbackCredit) error
	LookupOwned(context.Context, ResourceOwner, string) (FallbackCredit, error)
	Resolve(context.Context, FallbackCreditLookup) (FallbackCredit, error)
}
