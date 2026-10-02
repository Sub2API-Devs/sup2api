package audit

import (
	"encoding/json"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *httpapi.Router, db *store.DB) {
	r.Perm("GET", "/audit-logs", "audit:read", func(c *gin.Context) {
		page, size := httpapi.Pagination(c)
		action := c.Query("action")
		var total int64
		context := c.Request.Context()
		if err := db.Pool.QueryRow(context, `SELECT count(*) FROM audit_logs WHERE ($1='' OR action=$1)`, action).Scan(&total); err != nil {
			httpapi.Fail(c, err)
			return
		}
		rows, err := db.Pool.Query(context, `SELECT to_jsonb(a) FROM audit_logs a WHERE ($1='' OR action=$1) ORDER BY id DESC LIMIT $2 OFFSET $3`, action, size, (page-1)*size)
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
