package account

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// LimitsWindow represents one time-based usage limit window with computed percentages.
type LimitsWindow struct {
	Label            string    `json:"label"`
	Seconds          int64     `json:"seconds"`
	Used             int64     `json:"used"`
	Limit            int64     `json:"limit"`
	UsedPercent      float64   `json:"used_percent"`
	RemainingPercent float64   `json:"remaining_percent"`
	ResetAt          time.Time `json:"reset_at"`
	Exhausted        bool      `json:"exhausted"`
}

// LimitsSnapshot is the complete snapshot returned to clients.
type LimitsSnapshot struct {
	AccountID      int64         `json:"account_id"`
	HasLimits      bool          `json:"has_limits"`
	Windows        []LimitsWindow `json:"windows,omitempty"`
	AnyExhausted   bool          `json:"any_exhausted"`
	TightestWindow *LimitsWindow `json:"tightest_window,omitempty"`
	LastQueriedAt  time.Time     `json:"last_queried_at"`
	Provider       string        `json:"provider,omitempty"`
	AutoResumeAt   *time.Time    `json:"auto_resume_at,omitempty"`
}

const (
	// cacheFreshDuration is how long a cache is considered fresh without re-query
	cacheFreshDuration = 5 * time.Minute
	// debounceWindow prevents concurrent queries within this window
	debounceWindow = 30 * time.Second
	// queryTimeout is the RPC timeout for plugin queries
	queryTimeout = 15 * time.Second
)

// debounceEntry tracks the last query time for an account
type debounceEntry struct {
	lastQueried time.Time
	mu          sync.Mutex
}

// limitsDebouncer manages query debouncing per account
type limitsDebouncer struct {
	entries sync.Map // map[int64]*debounceEntry
}

func newLimitsDebouncer() *limitsDebouncer {
	return &limitsDebouncer{}
}

// tryAcquire attempts to acquire the debounce lock for an account.
// Returns true if the query should proceed, false if debounced.
func (d *limitsDebouncer) tryAcquire(accountID int64) bool {
	now := time.Now()

	// Load or create entry
	val, _ := d.entries.LoadOrStore(accountID, &debounceEntry{})
	entry := val.(*debounceEntry)

	entry.mu.Lock()
	defer entry.mu.Unlock()

	// Check if within debounce window
	if now.Sub(entry.lastQueried) < debounceWindow {
		return false
	}

	// Update last queried time
	entry.lastQueried = now
	return true
}

// cleanup removes stale entries (optional, for memory management)
func (d *limitsDebouncer) cleanup() {
	now := time.Now()
	d.entries.Range(func(key, value interface{}) bool {
		entry := value.(*debounceEntry)
		entry.mu.Lock()
		if now.Sub(entry.lastQueried) > 10*time.Minute {
			d.entries.Delete(key)
		}
		entry.mu.Unlock()
		return true
	})
}

// QueryAccountLimits queries the subscription limits for an account.
// It implements a multi-layer strategy:
// 1. Check account type (API Key -> no limits)
// 2. Check fresh cache (< 5 min)
// 3. Check debounce (< 30 sec)
// 4. Query plugin RPC
// 5. Update cache
func (s *Service) QueryAccountLimits(ctx context.Context, accountID int64, force bool) (*LimitsSnapshot, error) {
	// 1. Load account
	acct, err := s.loadRow(ctx, s.d.DB.Pool, accountID, core.OwnerScope(ctx, "account:test"), false)
	if err != nil {
		return nil, err
	}

	// 2. Check if account type supports subscription limits
	bt, ok := s.accountType(acct.PluginKey, acct.Type)
	if !ok || bt.Client == nil {
		return nil, core.ErrPluginUnavailable
	}

	// TODO: Check bt.Type.Features.SubscriptionLimits once proto is regenerated
	// For now, assume all non-API-key accounts MAY support limits
	// The plugin will return UNIMPLEMENTED if it doesn't support it

	// 3. Check cache (unless force=true)
	if !force {
		cached, err := s.d.DB.GetAccountLimits(ctx, accountID)
		if err != nil {
			return nil, fmt.Errorf("failed to get cached limits: %w", err)
		}

		if cached != nil && time.Since(cached.LastQueriedAt) < cacheFreshDuration {
			// Cache is fresh, return it
			return s.buildSnapshotFromCache(accountID, cached), nil
		}
	}

	// 4. Debounce check
	if !s.limitsDebouncer.tryAcquire(accountID) {
		// Within debounce window, return stale cache if exists
		cached, _ := s.d.DB.GetAccountLimits(ctx, accountID)
		if cached != nil {
			return s.buildSnapshotFromCache(accountID, cached), nil
		}
		return nil, core.ErrRateLimited.WithMessage("Please wait before querying limits again")
	}

	// 5. Decrypt credentials
	plain, err := s.decrypt(acct.PluginKey, acct.CredEnc)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt credentials: %w", err)
	}

	// 6. Call plugin RPC
	queryCtx, cancel := context.WithTimeout(ctx, queryTimeout)
	defer cancel()

	resp, err := bt.Client.QuerySubscriptionLimits(queryCtx, &pluginv1.QuerySubscriptionLimitsRequest{
		AccountId:       accountID,
		AccountName:     acct.Name,
		AccountType:     acct.Type,
		CredentialsJson: string(plain),
		SettingsJson:    string(acct.Settings),
		ProxyUrl:        s.getProxyURL(ctx, acct.ProxyID),
	})

	var lastError string
	if err != nil {
		lastError = err.Error()
		// Save error and return stale cache if exists
		cached, _ := s.d.DB.GetAccountLimits(ctx, accountID)
		if cached != nil {
			_ = s.d.DB.UpsertAccountLimits(ctx, accountID, cached.LimitsSnapshot, lastError)
			return s.buildSnapshotFromCache(accountID, cached), nil
		}
		return nil, fmt.Errorf("plugin query failed: %w", err)
	}

	// Handle error response from plugin
	if resp.ErrorType != "" {
		lastError = fmt.Sprintf("%s: %s", resp.ErrorType, resp.ErrorMessage)
		// TODO: Handle auth_rejected differently (disable account?)
		return nil, fmt.Errorf("plugin returned error: %s", lastError)
	}

	// 7. Convert and save snapshot
	snapshot := s.convertPluginSnapshot(resp)
	if err := s.d.DB.UpsertAccountLimits(ctx, accountID, snapshot, ""); err != nil {
		return nil, fmt.Errorf("failed to save limits: %w", err)
	}

	// 8. Build and return response
	cached, _ := s.d.DB.GetAccountLimits(ctx, accountID)
	if cached == nil {
		// Shouldn't happen, but fallback
		return &LimitsSnapshot{
			AccountID:     accountID,
			HasLimits:     len(snapshot.Windows) > 0,
			LastQueriedAt: time.Now(),
		}, nil
	}

	return s.buildSnapshotFromCache(accountID, cached), nil
}

// ResetAccountLimits clears the cache and optionally refetches.
func (s *Service) ResetAccountLimits(ctx context.Context, accountID int64, clearMarkers, refetch bool) (*LimitsSnapshot, error) {
	if clearMarkers {
		if err := s.d.DB.ClearAccountLimitsMarkers(ctx, accountID); err != nil {
			return nil, fmt.Errorf("failed to clear markers: %w", err)
		}
	} else {
		if err := s.d.DB.ClearAccountLimits(ctx, accountID); err != nil {
			return nil, fmt.Errorf("failed to clear limits: %w", err)
		}
	}

	if refetch {
		return s.QueryAccountLimits(ctx, accountID, true)
	}

	return &LimitsSnapshot{
		AccountID: accountID,
		HasLimits: false,
	}, nil
}

// convertPluginSnapshot converts plugin response to store.LimitsSnapshot
func (s *Service) convertPluginSnapshot(resp *pluginv1.QuerySubscriptionLimitsResponse) store.LimitsSnapshot {
	windows := make([]store.LimitsWindow, len(resp.Windows))
	for i, w := range resp.Windows {
		windows[i] = store.LimitsWindow{
			Label:   w.Label,
			Seconds: w.Seconds,
			Used:    w.Used,
			Limit:   w.Limit,
			ResetAt: time.Unix(w.ResetAt, 0),
		}
	}

	return store.LimitsSnapshot{
		Windows:   windows,
		UpdatedAt: time.Now(),
		Provider:  resp.Provider,
	}
}

// buildSnapshotFromCache converts database row to API response
func (s *Service) buildSnapshotFromCache(accountID int64, cached *store.AccountLimitsRow) *LimitsSnapshot {
	windows := make([]LimitsWindow, len(cached.LimitsSnapshot.Windows))
	anyExhausted := false
	var tightest *LimitsWindow
	minRemaining := 100.0

	for i, w := range cached.LimitsSnapshot.Windows {
		usedPct := 0.0
		remainingPct := 100.0
		exhausted := false

		if w.Limit > 0 {
			usedPct = float64(w.Used) / float64(w.Limit) * 100.0
			remainingPct = 100.0 - usedPct
			exhausted = w.Used >= w.Limit
		}

		windows[i] = LimitsWindow{
			Label:            w.Label,
			Seconds:          w.Seconds,
			Used:             w.Used,
			Limit:            w.Limit,
			UsedPercent:      usedPct,
			RemainingPercent: remainingPct,
			ResetAt:          w.ResetAt,
			Exhausted:        exhausted,
		}

		if exhausted {
			anyExhausted = true
		}

		if remainingPct < minRemaining {
			minRemaining = remainingPct
			tightest = &windows[i]
		}
	}

	var autoResumeAt *time.Time
	if cached.ResumeAt.Valid {
		autoResumeAt = &cached.ResumeAt.Time
	}

	return &LimitsSnapshot{
		AccountID:      accountID,
		HasLimits:      len(windows) > 0,
		Windows:        windows,
		AnyExhausted:   anyExhausted,
		TightestWindow: tightest,
		LastQueriedAt:  cached.LastQueriedAt,
		Provider:       cached.LimitsSnapshot.Provider,
		AutoResumeAt:   autoResumeAt,
	}
}

// getProxyURL returns the proxy URL for an account (if configured)
func (s *Service) getProxyURL(ctx context.Context, proxyID *int64) string {
	if proxyID == nil {
		return ""
	}
	// TODO: Implement proxy lookup
	return ""
}
