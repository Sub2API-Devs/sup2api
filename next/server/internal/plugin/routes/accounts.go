package routes

import (
	"encoding/json"
	"fmt"
	"net/url"
	"slices"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/httpapi"
)

var (
	errNoAccountAccess = core.ErrUnavailable.WithMessage("account checks of plugin routes are not configured")
	errTooManyAccounts = core.ErrInvalidArgument.WithMessage(fmt.Sprintf("at most %d accounts per request", manifest.MaxAccountBatch))
)

// authorizeAccounts checks that the caller may act on every account the
// request names (manifest.RouteAccounts) and answers the request when not.
func (h *Handler) authorizeAccounts(c *gin.Context, acc *manifest.RouteAccounts, params map[string]string, body []byte) bool {
	if h.accounts == nil {
		httpapi.Fail(c, errNoAccountAccess)
		return false
	}
	ids, err := accountIDs(acc.From, params, c.Request.URL.Query(), body)
	if err == nil {
		ctx := c.Request.Context()
		userID, _ := core.UserID(ctx)
		err = core.AuthorizeAccounts(ctx, h.accounts, userID, acc.Action, ids)
	}
	if err != nil {
		httpapi.Fail(c, err)
		return false
	}
	return true
}

// accountIDs collects the distinct account ids the request names under from:
// path parameters, query parameters (every value) and top-level JSON body
// fields. Body field names match case-insensitively, as encoding/json does
// when the plugin decodes the body. A body that is no JSON object names none.
func accountIDs(from []string, params map[string]string, query url.Values, body []byte) ([]int64, error) {
	var fields map[string]json.RawMessage
	_ = json.Unmarshal(body, &fields)
	var ids []int64
	for _, f := range from {
		source, name, _ := manifest.ParseAccountsFrom(f)
		more, err := sourceIDs(source, name, params, query, fields)
		if err != nil {
			return nil, core.InvalidFields(core.FieldError{Field: name, Code: "invalid",
				Message: "must be an account id, a list of account ids or a comma-separated string of them"})
		}
		ids = append(ids, more...)
	}
	slices.Sort(ids)
	if ids = slices.Compact(ids); len(ids) > manifest.MaxAccountBatch {
		return nil, errTooManyAccounts
	}
	return ids, nil
}

// sourceIDs reads the ids of one RouteAccounts.From entry.
func sourceIDs(source, name string, params map[string]string, query url.Values, fields map[string]json.RawMessage) ([]int64, error) {
	switch source {
	case manifest.AccountsFromPath:
		return splitIDs(params[name])
	case manifest.AccountsFromQuery:
		return splitIDs(query[name]...)
	case manifest.AccountsFromBody:
		return fieldIDs(fields, name)
	}
	return nil, nil
}

// fieldIDs reads every body field named name, in any case.
func fieldIDs(fields map[string]json.RawMessage, name string) ([]int64, error) {
	var ids []int64
	for k, raw := range fields {
		if !strings.EqualFold(k, name) {
			continue
		}
		more, err := rawIDs(raw)
		if err != nil {
			return nil, err
		}
		ids = append(ids, more...)
	}
	return ids, nil
}

// rawIDs reads a JSON number, array of numbers or comma-separated string.
func rawIDs(raw json.RawMessage) ([]int64, error) {
	var s string
	if json.Unmarshal(raw, &s) == nil {
		return splitIDs(s)
	}
	var ids []int64
	if json.Unmarshal(raw, &ids) == nil {
		return ids, nil
	}
	var id int64
	err := json.Unmarshal(raw, &id)
	return []int64{id}, err
}

// splitIDs parses comma-separated ids; empty parts are skipped.
func splitIDs(vals ...string) ([]int64, error) {
	var ids []int64
	for _, v := range vals {
		for _, part := range strings.Split(v, ",") {
			if part = strings.TrimSpace(part); part == "" {
				continue
			}
			id, err := strconv.ParseInt(part, 10, 64)
			if err != nil {
				return nil, err
			}
			ids = append(ids, id)
		}
	}
	return ids, nil
}
