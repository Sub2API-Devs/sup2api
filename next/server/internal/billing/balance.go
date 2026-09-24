package billing

import (
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

// LedgerEntry is the API view of a balance_ledger row.
type LedgerEntry struct {
	ID             int64           `json:"id"`
	UserID         int64           `json:"user_id"`
	UserEmail      string          `json:"user_email,omitempty"`
	UserName       string          `json:"user_name,omitempty"`
	Delta          decimal.Decimal `json:"delta"`
	BalanceAfter   decimal.Decimal `json:"balance_after"`
	Kind           string          `json:"kind"`
	RefType        string          `json:"ref_type"`
	RefID          string          `json:"ref_id"`
	IdempotencyKey string          `json:"idempotency_key"`
	OperatorID     *int64          `json:"operator_id"`
	PluginKey      *string         `json:"plugin_key"`
	Note           string          `json:"note"`
	CreatedAt      time.Time       `json:"created_at"`
}

func (s *Service) registerBalanceRoutes(r *httpapi.Router) {
	r.Perm("GET", "/me/balance", "balance:self:read", s.myBalance)
	r.Perm("GET", "/me/ledger", "balance:self:read", s.myLedger)
	r.Perm("GET", "/ledger", "balance:all:read", s.allLedger)
	r.Perm("POST", "/users/:id/balance/adjust", "balance:adjust", s.adjustBalance)
}

func (s *Service) myBalance(c *gin.Context) {
	ctx := c.Request.Context()
	uid, _ := core.UserID(ctx)
	var bal decimal.Decimal
	err := s.db.Pool.QueryRow(ctx, `SELECT COALESCE((SELECT balance FROM user_balances WHERE user_id = $1), 0)`, uid).Scan(&bal)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"balance": bal})
}

func (s *Service) myLedger(c *gin.Context) {
	uid, _ := core.UserID(c.Request.Context())
	s.listLedger(c, &uid)
}

func (s *Service) allLedger(c *gin.Context) {
	var uid *int64
	if v := c.Query("user_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid user_id"))
			return
		}
		uid = &id
	}
	s.listLedger(c, uid)
}

// listLedger serves ?kind=&from=&to= (RFC 3339) with pagination.
func (s *Service) listLedger(c *gin.Context, userID *int64) {
	ctx := c.Request.Context()
	page, size := httpapi.Pagination(c)
	var where []string
	var args []any
	add := func(cond string, v any) {
		args = append(args, v)
		where = append(where, strings.ReplaceAll(cond, "?", "$"+strconv.Itoa(len(args))))
	}
	if userID != nil {
		add("l.user_id = ?", *userID)
	}
	if v := c.Query("kind"); v != "" {
		add("l.kind = ?", v)
	}
	for _, f := range []struct{ q, cond string }{{"from", "l.created_at >= ?"}, {"to", "l.created_at < ?"}} {
		if v := c.Query(f.q); v != "" {
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid "+f.q))
				return
			}
			add(f.cond, t)
		}
	}
	cond := ""
	if len(where) > 0 {
		cond = " WHERE " + strings.Join(where, " AND ")
	}
	var total int64
	if err := s.db.Pool.QueryRow(ctx, `SELECT count(*) FROM balance_ledger l`+cond, args...).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	args = append(args, size, (page-1)*size)
	rows, err := s.db.Pool.Query(ctx, `
		SELECT l.id, l.user_id, COALESCE(u.email, ''), COALESCE(u.display_name, ''), l.delta, l.balance_after, l.kind,
		       l.ref_type, l.ref_id, l.idempotency_key, l.operator_id, l.plugin_key, l.note, l.created_at
		FROM balance_ledger l LEFT JOIN users u ON u.id = l.user_id`+cond+`
		ORDER BY l.id DESC LIMIT $`+strconv.Itoa(len(args)-1)+` OFFSET $`+strconv.Itoa(len(args)), args...)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	defer rows.Close()
	items := []LedgerEntry{}
	for rows.Next() {
		var e LedgerEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.UserEmail, &e.UserName, &e.Delta, &e.BalanceAfter, &e.Kind,
			&e.RefType, &e.RefID, &e.IdempotencyKey, &e.OperatorID, &e.PluginKey, &e.Note, &e.CreatedAt); err != nil {
			httpapi.Fail(c, err)
			return
		}
		items = append(items, e)
	}
	if err := rows.Err(); err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

// POST /users/:id/balance/adjust {amount, credit, note}; an optional
// Idempotency-Key header makes retries safe.
func (s *Service) adjustBalance(c *gin.Context) {
	ctx := c.Request.Context()
	id, ok := httpapi.PathID(c, "id")
	if !ok {
		return
	}
	var in struct {
		Amount decimal.Decimal `json:"amount"`
		Credit bool            `json:"credit"`
		Note   string          `json:"note"`
	}
	if !httpapi.BindJSON(c, &in) {
		return
	}
	operator, _ := core.UserID(ctx)
	key := strings.TrimSpace(c.GetHeader("Idempotency-Key"))
	if key == "" {
		key = uuid.NewString()
	}
	if len(key) > 100 {
		httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("Idempotency-Key too long"))
		return
	}
	res, err := s.Apply(ctx, core.LedgerChange{
		UserID:         id,
		Amount:         in.Amount,
		Credit:         in.Credit,
		Kind:           KindAdminAdjust,
		RefType:        "admin",
		RefID:          strconv.FormatInt(operator, 10),
		IdempotencyKey: "admin_adjust:" + key,
		OperatorID:     nullID(operator),
		Note:           in.Note,
	})
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	httpapi.OK(c, gin.H{"ledger_id": res.LedgerID, "balance_after": res.BalanceAfter, "duplicate": res.Duplicate})
}
