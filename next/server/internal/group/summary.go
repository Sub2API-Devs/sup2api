package group

import (
	"context"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// PricingSummary is what a group row tells of group pricing (CONTRACTS §97).
type PricingSummary struct {
	Access Access `json:"access"`
	// PriceRuleCount counts the model prices of the group itself and
	// SegmentRuleCount those of segments in it.
	PriceRuleCount   int64 `json:"price_rule_count"`
	SegmentRuleCount int64 `json:"segment_rule_count"`
	// ModelCount is the number of models the group provides (Models.Offered).
	ModelCount int `json:"model_count"`
}

// Access is who may use a private group: the named segments granted it and
// how many personal ones. A public group is open to everyone and lists none.
type Access struct {
	Segments      []core.SegmentRef `json:"segments"`
	PersonalCount int64             `json:"personal_count"`
}

// fillSummary sets the pricing summary of the groups, with one query per part.
func (s *Service) fillSummary(ctx context.Context, gs []*Group) error {
	ids := make([]int64, len(gs))
	policies := make([]core.GroupInfo, len(gs))
	for i, g := range gs {
		ids[i] = g.ID
		policies[i] = core.GroupInfo{ID: g.ID, ModelAllowlist: g.ModelAllowlist, ModelFilterMode: g.ModelFilterMode}
	}
	access, err := groupAccess(ctx, s.db.Pool, ids)
	if err != nil {
		return err
	}
	rules, err := ruleCounts(ctx, s.db.Pool, ids)
	if err != nil {
		return err
	}
	offered, err := offeredModels(ctx, s.db.Pool, policies)
	if err != nil {
		return err
	}
	for _, g := range gs {
		g.Access = access[g.ID]
		g.PriceRuleCount, g.SegmentRuleCount = rules[g.ID].own, rules[g.ID].segments
		g.ModelCount = len(offered[g.ID])
	}
	return nil
}

// groupAccess returns the access of each of the groups, by group id.
func groupAccess(ctx context.Context, q store.Querier, ids []int64) (map[int64]Access, error) {
	out := make(map[int64]Access, len(ids))
	for _, id := range ids {
		out[id] = Access{Segments: []core.SegmentRef{}}
	}
	rows, err := q.Query(ctx, `SELECT sg.group_id,
			COALESCE(array_agg(s.id ORDER BY s.id) FILTER (WHERE s.kind = 'named'), '{}'),
			COALESCE(array_agg(s.name ORDER BY s.id) FILTER (WHERE s.kind = 'named'), '{}'),
			count(*) FILTER (WHERE s.kind = 'personal')
		FROM segment_groups sg
		JOIN segments s ON s.id = sg.segment_id
		JOIN groups g ON g.id = sg.group_id
		WHERE sg.group_id = ANY($1) AND sg.granted AND g.visibility = 'restricted'
		GROUP BY sg.group_id`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var groupID int64
		var segmentIDs []int64
		var names []string
		a := Access{Segments: []core.SegmentRef{}}
		if err := rows.Scan(&groupID, &segmentIDs, &names, &a.PersonalCount); err != nil {
			return nil, err
		}
		for i, id := range segmentIDs {
			a.Segments = append(a.Segments, core.SegmentRef{ID: id, Kind: core.SegmentNamed, Name: names[i]})
		}
		out[groupID] = a
	}
	return out, rows.Err()
}

// ruleCount counts the price rules of a group: its own and those of segments.
type ruleCount struct{ own, segments int64 }

// ruleCounts returns the price rule counts of each of the groups that has
// rules, by group id.
func ruleCounts(ctx context.Context, q store.Querier, ids []int64) (map[int64]ruleCount, error) {
	rows, err := q.Query(ctx, `SELECT group_id, count(*) FILTER (WHERE segment_id IS NULL), count(segment_id)
		FROM price_rules WHERE group_id = ANY($1) GROUP BY group_id`, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]ruleCount, len(ids))
	for rows.Next() {
		var groupID int64
		var n ruleCount
		if err := rows.Scan(&groupID, &n.own, &n.segments); err != nil {
			return nil, err
		}
		out[groupID] = n
	}
	return out, rows.Err()
}
