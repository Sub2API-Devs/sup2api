package account

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// RegisterClaudeOAuthBalanceProvider registers the balance provider for the
// claude_oauth account type of the claude_oauth plugin. Call this after
// creating the Service.
func (s *Service) RegisterClaudeOAuthBalanceProvider() {
	RegisterBalanceProvider(core.AccountTypeKey{PluginKey: "claude_oauth", Type: "claude_oauth"}, &claudeOAuthBalanceProvider{s: s})
}

const (
	claudeOAuthUsageURL = "https://api.anthropic.com/api/oauth/usage"
	claudeOAuthUA       = "claude-code/2.1.7"
)

type claudeOAuthUsageResponse struct {
	AccountBalance *struct {
		Amount   string `json:"amount"`
		Currency string `json:"currency"`
	} `json:"account_balance"`
}

type claudeOAuthBalanceProvider struct {
	s *Service
}

func (p *claudeOAuthBalanceProvider) QueryBalance(ctx context.Context, accountID int64) (*store.BalanceSnapshot, error) {
	a, err := p.s.loadRow(ctx, p.s.d.DB.Pool, accountID, nil, false)
	if err != nil {
		return nil, fmt.Errorf("load account: %w", err)
	}

	plain, err := p.s.decrypt(a.PluginKey, a.CredEnc)
	if err != nil {
		return nil, fmt.Errorf("decrypt credentials: %w", err)
	}

	var creds struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.Unmarshal(plain, &creds); err != nil {
		return nil, fmt.Errorf("parse credentials: %w", err)
	}
	if strings.TrimSpace(creds.AccessToken) == "" {
		return nil, fmt.Errorf("missing access_token")
	}

	req, err := http.NewRequestWithContext(ctx, "GET", claudeOAuthUsageURL, nil)
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Accept", "application/json, text/plain, */*")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+creds.AccessToken)
	req.Header.Set("Anthropic-Beta", "oauth-2025-04-20")
	req.Header.Set("User-Agent", claudeOAuthUA)

	client := &http.Client{Timeout: 15 * time.Second}
	if a.ProxyID != nil {
		// TODO: use account proxy from service
		// For now, direct request (proxy integration is in gateway layer)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == 401 || resp.StatusCode == 403 {
		return nil, fmt.Errorf("auth rejected: status %d", resp.StatusCode)
	}
	if resp.StatusCode != 200 {
		return nil, fmt.Errorf("upstream error: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var usage claudeOAuthUsageResponse
	if err := json.Unmarshal(body, &usage); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	if usage.AccountBalance == nil {
		return nil, fmt.Errorf("account_balance field missing")
	}

	amountMicros, err := parseMoneyToMicros(usage.AccountBalance.Amount)
	if err != nil {
		return nil, fmt.Errorf("parse amount: %w", err)
	}

	now := time.Now()
	return &store.BalanceSnapshot{
		AccountID:    accountID,
		AmountMicros: amountMicros,
		Currency:     usage.AccountBalance.Currency,
		UpdatedAt:    &now,
	}, nil
}

// parseMoneyToMicros converts "1.23" to 1230000 (micros).
func parseMoneyToMicros(s string) (int64, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, nil
	}

	// Handle negative
	negative := false
	if strings.HasPrefix(s, "-") {
		negative = true
		s = s[1:]
	}

	parts := strings.Split(s, ".")
	if len(parts) > 2 {
		return 0, fmt.Errorf("invalid decimal: %q", s)
	}

	wholePart := int64(0)
	if len(parts) >= 1 && parts[0] != "" {
		var err error
		wholePart, err = parseInt64(parts[0])
		if err != nil {
			return 0, fmt.Errorf("parse whole part: %w", err)
		}
	}

	fracPart := int64(0)
	if len(parts) == 2 {
		frac := parts[1]
		if len(frac) > 6 {
			frac = frac[:6] // truncate to 6 decimal places
		}
		for len(frac) < 6 {
			frac += "0"
		}
		var err error
		fracPart, err = parseInt64(frac)
		if err != nil {
			return 0, fmt.Errorf("parse fractional part: %w", err)
		}
	}

	micros := wholePart*1_000_000 + fracPart
	if negative {
		micros = -micros
	}
	return micros, nil
}

func parseInt64(s string) (int64, error) {
	var result int64
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, fmt.Errorf("invalid digit: %c", c)
		}
		result = result*10 + int64(c-'0')
	}
	return result, nil
}
