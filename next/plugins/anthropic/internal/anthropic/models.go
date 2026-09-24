package anthropic

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/pluginsdk"
)

// listModels serves GET /models: the model catalog from plg_anthropic.
// Rows are returned with every column (to_jsonb), so columns added by later
// migrations (e.g. "family" in 0.2.0) show up without code changes.
// Query: q (substring of model_id/display_name), status, page, page_size.
func (p *Plugin) listModels(ctx context.Context, req *pluginv1.HTTPRequest) (*pluginv1.HTTPResponse, error) {
	if p.host == nil {
		return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "unavailable", "plugin not initialised"), nil
	}
	db, err := p.host.DB(ctx)
	if err != nil {
		return pluginsdk.ErrorResponse(http.StatusServiceUnavailable, "unavailable", "database unavailable: "+err.Error()), nil
	}
	page, size := pluginsdk.Pagination(req, 50)
	q := strings.TrimSpace(pluginsdk.Query(req, "q"))
	st := strings.TrimSpace(pluginsdk.Query(req, "status"))

	const where = `WHERE ($1 = '' OR m.model_id ILIKE '%' || $1 || '%' OR m.display_name ILIKE '%' || $1 || '%')
	  AND ($2 = '' OR m.status = $2)`
	var total int64
	if err := db.QueryRow(ctx, `SELECT count(*) FROM model_catalog m `+where, q, st).Scan(&total); err != nil {
		return nil, err
	}
	rows, err := db.Query(ctx, `SELECT to_jsonb(m) FROM model_catalog m `+where+`
	  ORDER BY m.sort_order, m.model_id LIMIT $3 OFFSET $4`, q, st, size, (page-1)*size)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []json.RawMessage{}
	for rows.Next() {
		var raw []byte
		if err := rows.Scan(&raw); err != nil {
			return nil, err
		}
		items = append(items, json.RawMessage(raw))
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return pluginsdk.ListResponse(items, pluginsdk.Page{Page: page, PageSize: size, Total: total}), nil
}
