package codex

import (
	"context"
	"strconv"
	"sync"
	"time"

	"github.com/tidwall/gjson"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// Cached reset counts (docs/PLUGIN-CODEX.md §10.6). The console's account
// list shows each account's remaining official resets and reloads every few
// seconds, so it reads them from the plugin KV (POST /reset-credits/summary)
// instead of asking ChatGPT per row. The count is written by the usage query
// (wham/usage carries rate_limit_reset_credits.available_count) and by a
// successful list; a spent reset drops it until the next of those. A cache
// failure is only logged: it never fails the usage query or a route.

const (
	// kvResetCount is the KV namespace of the cached counts, keyed by
	// account id.
	kvResetCount = "reset_count"
	// resetCountTTL is how long a count is kept without a refresh.
	resetCountTTL = 7 * 24 * time.Hour
	// summaryReaders and summaryTimeout bound the KV reads of one summary
	// (the KV serves one key per call).
	summaryReaders = 16
	summaryTimeout = 5 * time.Second
	// usageResetCountPath is the count in the wham/usage answer.
	usageResetCountPath = "rate_limit_reset_credits.available_count"
)

// ResetCount is one account's cached count; UpdatedAt is Unix seconds.
type ResetCount struct {
	AvailableCount int   `json:"available_count"`
	UpdatedAt      int64 `json:"updated_at"`
}

// ResetSummaryRequest is the body of POST /reset-credits/summary.
type ResetSummaryRequest struct {
	AccountIDs []int64 `json:"account_ids"`
}

// ResetSummaryResponse answers POST /reset-credits/summary, keyed by account
// id; an account without a cached count is absent.
type ResetSummaryResponse struct {
	Accounts map[string]ResetCount `json:"accounts"`
}

func resetCountKey(id int64) string { return strconv.FormatInt(id, 10) }

// storeResetCount caches the account's current count.
func (p *Plugin) storeResetCount(ctx context.Context, id int64, n int) {
	err := p.saveCached(ctx, kvResetCount, resetCountKey(id), ResetCount{AvailableCount: n, UpdatedAt: p.now().Unix()}, resetCountTTL)
	if err != nil {
		p.log.Warn("codex: cache the reset count", "account_id", id, "error", err.Error())
	}
}

// cacheUsageResetCount caches the count a usage answer reports; an answer
// without one (missing or null) leaves the cache as it is.
func (p *Plugin) cacheUsageResetCount(ctx context.Context, id int64, body []byte) {
	n := gjson.GetBytes(body, usageResetCountPath)
	if id <= 0 || n.Type != gjson.Number {
		return
	}
	p.storeResetCount(ctx, id, int(n.Int()))
}

// loadResetCounts reads the cached counts of ids, a few at a time and within
// summaryTimeout. Unreadable entries are left out (and logged once).
func (p *Plugin) loadResetCounts(ctx context.Context, ids []int64) map[string]ResetCount {
	ctx, cancel := context.WithTimeout(ctx, summaryTimeout)
	defer cancel()
	var (
		mu     sync.Mutex
		wg     sync.WaitGroup
		out    = map[string]ResetCount{}
		failed int
		slots  = make(chan struct{}, summaryReaders)
	)
	for _, id := range ids {
		slots <- struct{}{}
		wg.Go(func() {
			defer func() { <-slots }()
			var c ResetCount
			found, err := p.loadCached(ctx, kvResetCount, resetCountKey(id), &c)
			mu.Lock()
			defer mu.Unlock()
			if err != nil {
				failed++
			} else if found {
				out[resetCountKey(id)] = c
			}
		})
	}
	wg.Wait()
	if failed > 0 {
		p.log.Warn("codex: read cached reset counts", "failed", failed, "of", len(ids))
	}
	return out
}

// handleResetSummary answers the cached counts of the listed accounts. It
// only reads the KV and never asks ChatGPT.
func (p *Plugin) handleResetSummary(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	var in ResetSummaryRequest
	if err := decodeOptional(req, &in); err != nil {
		return errInvalidJSON(), nil
	}
	ids := positiveUnique(in.AccountIDs)
	if len(ids) > manifest.MaxAccountBatch {
		return pluginsdk.BadRequest("account_ids", "max", "at most "+strconv.Itoa(manifest.MaxAccountBatch)+" accounts per request / 每次最多 "+strconv.Itoa(manifest.MaxAccountBatch)+" 个账号"), nil
	}
	if p.host == nil {
		return errNotReady(), nil
	}
	return pluginsdk.DataResponse(ResetSummaryResponse{Accounts: p.loadResetCounts(ctx, ids)}), nil
}

// positiveUnique keeps the positive ids, each once, in order.
func positiveUnique(ids []int64) []int64 {
	seen := make(map[int64]bool, len(ids))
	out := make([]int64, 0, len(ids))
	for _, id := range ids {
		if id > 0 && !seen[id] {
			seen[id] = true
			out = append(out, id)
		}
	}
	return out
}
