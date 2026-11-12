// Package segment owns user groups ("segments", CONTRACTS §97): which private
// groups their members may use and at what rate. Model prices of a segment
// are billing's.
package segment

import (
	"context"

	"github.com/shopspring/decimal"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// OpenToUserSQL is the SQL condition for "the user may use the group": the
// group is public, or the user's segment is granted it. group is the alias of
// the groups row and user an expression of the user's id (a column or a
// placeholder). It is the one place the rule is written; the group's status
// is the caller's to check.
func OpenToUserSQL(group, user string) string {
	return `(` + group + `.visibility = 'public' OR EXISTS (SELECT 1 FROM segment_groups sg
		JOIN users su ON su.segment_id = sg.segment_id
		WHERE sg.group_id = ` + group + `.id AND sg.granted AND su.id = ` + user + `))`
}

// Terms is what a segment gets in a group.
type Terms struct {
	SegmentID int64
	// Open reports whether members may use the group: it is public or
	// granted to the segment.
	Open bool
	// Rate is the rate members pay there and RateSource where it comes from
	// (core.SegmentRate).
	Rate       decimal.Decimal
	RateSource string
}

const selectTerms = `SELECT g.id, s.id, g.visibility = 'public' OR COALESCE(sg.granted, false),
		g.rate_multiplier, s.discount, sg.rate_override
	FROM groups g
	JOIN segments s ON s.id = `

const joinTerms = `
	LEFT JOIN segment_groups sg ON sg.segment_id = s.id AND sg.group_id = g.id
	WHERE g.id = ANY($2)`

// UserTerms returns the terms of the user's segment in each of the groups
// that exist, by group id.
func UserTerms(ctx context.Context, q store.Querier, userID int64, groupIDs []int64) (map[int64]Terms, error) {
	return queryTerms(ctx, q, selectTerms+`(SELECT u.segment_id FROM users u WHERE u.id = $1)`+joinTerms, userID, groupIDs)
}

// SegmentTerms returns the terms of the segment in each of the groups that
// exist, by group id.
func SegmentTerms(ctx context.Context, q store.Querier, segmentID int64, groupIDs []int64) (map[int64]Terms, error) {
	return queryTerms(ctx, q, selectTerms+`$1`+joinTerms, segmentID, groupIDs)
}

func queryTerms(ctx context.Context, q store.Querier, sql string, id int64, groupIDs []int64) (map[int64]Terms, error) {
	rows, err := q.Query(ctx, sql, id, groupIDs)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]Terms, len(groupIDs))
	for rows.Next() {
		var groupID int64
		var t Terms
		var groupRate, discount decimal.Decimal
		var override decimal.NullDecimal
		if err := rows.Scan(&groupID, &t.SegmentID, &t.Open, &groupRate, &discount, &override); err != nil {
			return nil, err
		}
		t.Rate, t.RateSource = core.SegmentRate(groupRate, discount, nullable(override))
		out[groupID] = t
	}
	return out, rows.Err()
}

// nullable turns a nullable column into the pointer core.SegmentRate takes.
func nullable(d decimal.NullDecimal) *decimal.Decimal {
	if !d.Valid {
		return nil
	}
	return &d.Decimal
}
