package group

import (
	"context"
	"maps"
	"slices"

	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/store"
)

// PricingSummary is what a group row tells of group pricing (CONTRACTS §97).
type PricingSummary struct {
	Access Access `json:"access"`
	// PriceRuleCount counts the model prices of the group itself and
	// SegmentRuleCount those of segments in it, on the models it provides
	// now, as its pricing table lists them (offeredRules).
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
	offered, err := offeredModels(ctx, s.db.Pool, policies)
	if err != nil {
		return err
	}
	rules, err := offeredRules(ctx, s.db.Pool, offered, `pr.group_id = ANY($1)`, ids)
	if err != nil {
		return err
	}
	byID := make(map[int64]*Group, len(gs))
	for _, g := range gs {
		g.Access = access[g.ID]
		g.ModelCount = len(offered[g.ID])
		g.PriceRuleCount, g.SegmentRuleCount = 0, 0
		byID[g.ID] = g
	}
	for _, r := range rules {
		if g := byID[r.groupID]; r.segmentID == 0 {
			g.PriceRuleCount++
		} else {
			g.SegmentRuleCount++
		}
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

// ruleOn is what a price rule is on: a model in a group, for a segment (0 =
// the group's own rule).
type ruleOn struct {
	groupID, segmentID int64
	model              string
}

// offeredRules returns the price rules cond selects (on price_rules pr) that
// are on a model their group provides now (Models.Offered), as the group's
// pricing table lists them: a rule on a model the group no longer provides
// stays stored but is neither listed nor counted. offered are the models of
// the groups by id when the caller has them; the groups of the rules missing
// from it are read.
func offeredRules(ctx context.Context, q store.Querier, offered map[int64][]string, cond string, args ...any) ([]ruleOn, error) {
	rows, err := q.Query(ctx, `SELECT pr.group_id, COALESCE(pr.segment_id, 0), pr.model, g.model_allowlist, g.model_filter_mode
		FROM price_rules pr JOIN groups g ON g.id = pr.group_id WHERE `+cond, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var all []ruleOn
	var missing []core.GroupInfo
	seen := map[int64]bool{}
	for rows.Next() {
		var r ruleOn
		var g core.GroupInfo
		if err := rows.Scan(&r.groupID, &r.segmentID, &r.model, &g.ModelAllowlist, &g.ModelFilterMode); err != nil {
			return nil, err
		}
		all = append(all, r)
		if _, ok := offered[r.groupID]; !ok && !seen[r.groupID] {
			g.ID, seen[r.groupID] = r.groupID, true
			missing = append(missing, g)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if len(missing) > 0 {
		more, err := offeredModels(ctx, q, missing)
		if err != nil {
			return nil, err
		}
		merged := make(map[int64][]string, len(offered)+len(more))
		maps.Copy(merged, offered)
		maps.Copy(merged, more)
		offered = merged
	}
	return slices.DeleteFunc(all, func(r ruleOn) bool {
		_, ok := slices.BinarySearch(offered[r.groupID], r.model)
		return !ok
	}), nil
}

// SegmentRuleCounts counts the price rules of each of the segments by group
// id, on the models the groups provide now (offeredRules): what the pricing
// table of the group lists for the segment.
func (s *Service) SegmentRuleCounts(ctx context.Context, segmentIDs []int64) (map[int64]map[int64]int64, error) {
	rules, err := offeredRules(ctx, s.db.Pool, nil, `pr.segment_id = ANY($1)`, segmentIDs)
	if err != nil {
		return nil, err
	}
	out := map[int64]map[int64]int64{}
	for _, r := range rules {
		if out[r.segmentID] == nil {
			out[r.segmentID] = map[int64]int64{}
		}
		out[r.segmentID][r.groupID]++
	}
	return out, nil
}
