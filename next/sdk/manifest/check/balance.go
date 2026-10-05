package check

import (
	"regexp"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
)

var (
	// currencyCodeRe is ISO 4217 three-letter currency code (e.g. "USD", "EUR").
	currencyCodeRe = regexp.MustCompile(`^[A-Z]{3}$`)
)

const (
	minBalanceUpdateInterval     = 60
	maxBalanceUpdateInterval     = 86400
	defaultBalanceUpdateInterval = 180
)

// balance validates accountTypes[].balance (CONTRACTS §51): currency code
// format and update interval bounds.
func (v *validator) balance(f string, b *manifest.AccountBalance) {
	if b == nil {
		return
	}
	f += ".balance"
	if b.Currency == "" {
		v.add(f+".currency", "required", "currency is required")
	} else if !currencyCodeRe.MatchString(b.Currency) {
		v.add(f+".currency", "invalid_format", "currency %q must be a three-letter ISO 4217 code", b.Currency)
	}
	if b.UpdateInterval != 0 && (b.UpdateInterval < minBalanceUpdateInterval || b.UpdateInterval > maxBalanceUpdateInterval) {
		v.add(f+".updateInterval", "out_of_range", "updateInterval must be %d-%d", minBalanceUpdateInterval, maxBalanceUpdateInterval)
	}
}
