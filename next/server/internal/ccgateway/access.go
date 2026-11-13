package ccgateway

import (
	"context"
	"net/http"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// Per-account runtime endpoints follow the account itself (CONTRACTS §49.5):
// reading its runtime takes the account's read keys, anything else its update
// keys. settings:* opens none of them; it keeps the controller and the
// images.

// accountAction is the account action (core.AccountAccess) a request with
// method needs.
func accountAction(method string) string {
	if method == http.MethodGet {
		return "read"
	}
	return "update"
}

// authorizeAccount checks that the caller may act on account id with method:
// the account must be in the caller's data scope of the action (CONTRACTS
// §21: every row, own, group or id ranges; others are not found). Whether the account exists and is a Claude
// Code account stays with the caller's own query.
func (s *Service) authorizeAccount(ctx context.Context, method string, id int64) error {
	uid, _ := core.UserID(ctx)
	return core.AuthorizeAccounts(ctx, s.Accounts, uid, accountAction(method), []int64{id})
}
