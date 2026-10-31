package audit

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// RegisterRoutes mounts GET /audit-logs: newest first, filtered by action,
// target_type, target_id, user_id and the RFC 3339 created_at range from/to.
// Each row carries user_email and user_name of its actor (null for the
// system).
func RegisterRoutes(r *httpapi.Router, db *store.DB) {
	r.Perm("GET", "/audit-logs", "audit:read", func(c *gin.Context) {
		var f store.Filter
		for _, x := range []struct{ q, cond string }{{"action", "a.action = ?"}, {"target_type", "a.target_type = ?"}, {"target_id", "a.target_id = ?"}} {
			if v := c.Query(x.q); v != "" {
				f.And(x.cond, v)
			}
		}
		if v := c.Query("user_id"); v != "" {
			id, err := strconv.ParseInt(v, 10, 64)
			if err != nil {
				httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid user_id"))
				return
			}
			f.And("a.user_id = ?", id)
		}
		for _, x := range []struct{ q, cond string }{{"from", "a.created_at >= ?"}, {"to", "a.created_at < ?"}} {
			v := c.Query(x.q)
			if v == "" {
				continue
			}
			t, err := time.Parse(time.RFC3339, v)
			if err != nil {
				httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid "+x.q+" (RFC 3339)"))
				return
			}
			f.And(x.cond, t)
		}
		page, size := httpapi.Pagination(c)
		ctx := c.Request.Context()
		where, args := f.Cond(), f.Args()
		var total int64
		if err := db.Pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs a`+where, args...).Scan(&total); err != nil {
			httpapi.Fail(c, err)
			return
		}
		n := len(args)
		rows, err := db.Pool.Query(ctx, `SELECT to_jsonb(a) || jsonb_build_object('user_email', u.email, 'user_name', u.display_name)
			FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id`+where+
			` ORDER BY a.id DESC LIMIT $`+strconv.Itoa(n+1)+` OFFSET $`+strconv.Itoa(n+2), append(args, size, (page-1)*size)...)
		if err != nil {
			httpapi.Fail(c, err)
			return
		}
		defer rows.Close()
		items := []json.RawMessage{}
		for rows.Next() {
			var item json.RawMessage
			if err := rows.Scan(&item); err != nil {
				httpapi.Fail(c, err)
				return
			}
			items = append(items, item)
		}
		if err := rows.Err(); err != nil {
			httpapi.Fail(c, err)
			return
		}
		httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
	})
}
