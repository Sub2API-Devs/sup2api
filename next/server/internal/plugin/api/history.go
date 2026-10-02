package api

import (
	"encoding/json"
	"strconv"
	"time"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
	"github.com/gin-gonic/gin"
)

// listRollouts serves both the per-plugin and cross-plugin history. Completed
// node results are snapshots; current rollouts use the live controller view.
func (a *API) listRollouts(c *gin.Context) {
	key := c.Param("key")
	var since *time.Time
	if raw := c.Query("since"); raw != "" {
		value, err := time.Parse(time.RFC3339, raw)
		if err != nil {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid since"))
			return
		}
		since = &value
	}
	page, size := httpapi.Pagination(c)
	where := ` WHERE ($1='' OR plugin_key=$1) AND ($2::timestamptz IS NULL OR created_at >= $2)`
	var total int64
	if err := a.d.DB.Pool.QueryRow(ctx(c), `SELECT count(*) FROM plugin_rollouts`+where, key, since).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := a.d.DB.Pool.Query(ctx(c), `SELECT to_jsonb(r) || jsonb_build_object('coordinator',r.coordinator_node_id,'nodes',
        COALESCE((SELECT jsonb_agg(to_jsonb(n) ORDER BY n.node_id,n.boot_id) FROM plugin_rollout_nodes n WHERE n.rollout_id=r.id),'[]'::jsonb))
        FROM plugin_rollouts r`+where+` ORDER BY id DESC LIMIT $3 OFFSET $4`, key, since, size, (page-1)*size)
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	items := []map[string]any{}
	for rows.Next() {
		var raw []byte
		if err = rows.Scan(&raw); err != nil {
			break
		}
		var item map[string]any
		if err = json.Unmarshal(raw, &item); err != nil {
			break
		}
		items = append(items, item)
	}
	rows.Close()
	if err == nil {
		err = rows.Err()
	}
	if err != nil {
		httpapi.Fail(c, err)
		return
	}
	if a.d.Rollout != nil {
		for _, item := range items {
			if item["phase"] != "preparing" && item["phase"] != "activating" {
				continue
			}
			current, readErr := a.d.Rollout.Current(ctx(c), item["plugin_key"].(string))
			if readErr != nil {
				httpapi.Fail(c, readErr)
				return
			}
			if current != nil && float64(current.ID) == item["id"] {
				item["nodes"] = current.Nodes
			}
		}
	}
	httpapi.List(c, items, httpapi.Page{Page: page, PageSize: size, Total: total})
}

func (a *API) pluginHistory(c *gin.Context) {
	var rolloutID int64
	if raw := c.Query("rollout_id"); raw != "" {
		var err error
		rolloutID, err = strconv.ParseInt(raw, 10, 64)
		if err != nil || rolloutID <= 0 {
			httpapi.Fail(c, core.ErrInvalidArgument.WithMessage("invalid rollout_id"))
			return
		}
	}
	page, size := httpapi.Pagination(c)
	where := ` WHERE plugin_key=$1 AND ($2::bigint=0 OR rollout_id=$2)`
	var total int64
	if err := a.d.DB.Pool.QueryRow(ctx(c), `SELECT count(*) FROM plugin_history`+where, c.Param("key"), rolloutID).Scan(&total); err != nil {
		httpapi.Fail(c, err)
		return
	}
	rows, err := a.d.DB.Pool.Query(ctx(c), `SELECT to_jsonb(h) FROM plugin_history h`+where+` ORDER BY id DESC LIMIT $3 OFFSET $4`, c.Param("key"), rolloutID, size, (page-1)*size)
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
}
