package account

import (
	"context"
	"encoding/json"
	"log/slog"
	"slices"
	"strconv"
	"strings"

	pluginv1 "github.com/Sub2API-Devs/sup2api/next/sdk/gen/pluginv1"
	"github.com/Sub2API-Devs/sup2api/next/sdk/manifest"
	"github.com/Sub2API-Devs/sup2api/next/server/internal/core"
)

// maxModelLimits bounds the model lists of an account (CONTRACTS §68).
const maxModelLimits = 50

func parseModelLimits(raw []byte) []core.ModelLimit {
	out := []core.ModelLimit{}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &out)
	}
	return out
}

func modelLimitsJSON(in []core.ModelLimit) string {
	if in == nil {
		in = []core.ModelLimit{}
	}
	b, _ := json.Marshal(in)
	return string(b)
}

func coreModelLimits(in []*pluginv1.ModelLimit) []core.ModelLimit {
	out := make([]core.ModelLimit, 0, len(in))
	for _, l := range in {
		out = append(out, core.ModelLimit{Models: l.GetModels(), MaxConcurrency: int(l.GetMaxConcurrency()), RPMLimit: int(l.GetRpmLimit()), TPMLimit: l.GetTpmLimit(), SPMLimit: int(l.GetSpmLimit())})
	}
	return out
}

func sameModelLimit(a, b core.ModelLimit) bool {
	return slices.Equal(a.Models, b.Models) && a.MaxConcurrency == b.MaxConcurrency && a.RPMLimit == b.RPMLimit && a.TPMLimit == b.TPMLimit && a.SPMLimit == b.SPMLimit
}

// normalizeModelLimits trims the model lists, drops repeated models within a
// list and lists without models, and checks the limits. A model may be in one
// list only, and every entry must be a complete model id.
func normalizeModelLimits(ctx context.Context, in []core.ModelLimit) ([]core.ModelLimit, []core.FieldError) {
	var fe []core.FieldError
	add := func(field, code, en, zh string) {
		fe = append(fe, core.FieldError{Field: field, Code: code, Message: t(ctx, en, zh)})
	}
	out := make([]core.ModelLimit, 0, len(in))
	owner := map[string]int{}
	for i, l := range in {
		field := "model_limits[" + strconv.Itoa(i) + "]"
		models := make([]string, 0, len(l.Models))
		for j, m := range l.Models {
			m = strings.TrimSpace(m)
			at := field + ".models[" + strconv.Itoa(j) + "]"
			switch {
			case m == "":
			case !manifest.ValidModelID(m):
				add(at, "invalid", "not a complete model id (wildcards are not allowed)", "不是完整的模型 ID（不允许通配符）")
			case slices.Contains(models, m):
			default:
				if k, ok := owner[m]; ok && k != i {
					add(at, "duplicate", "the model is already limited by another list", "该模型已在另一个列表中限速")
					continue
				}
				owner[m] = i
				models = append(models, m)
			}
		}
		if len(models) > maxModels {
			add(field+".models", "too_many", "at most 500 models per list", "每个列表最多 500 个模型")
		}
		if l.MaxConcurrency < 0 || l.MaxConcurrency > maxConcurrency {
			add(field+".max_concurrency", "invalid", "max concurrency must be 0-100000 (0 = unlimited)", "最大并发必须为 0-100000（0 表示不限）")
		}
		if l.RPMLimit < 0 || l.RPMLimit > maxRPMLimit {
			add(field+".rpm_limit", "invalid", "rpm limit must be 0-10000000 (0 = unlimited)", "每分钟请求数上限必须为 0-10000000（0 表示不限）")
		}
		if l.TPMLimit < 0 || l.TPMLimit > maxTokenLimit {
			add(field+".tpm_limit", "invalid", "tpm limit must be 0-1000000000000 (0 = unlimited)", "每分钟 token 上限必须为 0-1000000000000（0 表示不限）")
		}
		if l.SPMLimit < 0 || l.SPMLimit > maxRPMLimit {
			add(field+".spm_limit", "invalid", "spm limit must be 0-10000000 (0 = unlimited)", "每分钟会话数上限必须为 0-10000000（0 表示不限）")
		}
		if len(models) == 0 {
			continue
		}
		l.Models = models
		out = append(out, l)
	}
	if len(out) > maxModelLimits {
		add("model_limits", "too_many", "at most 50 model lists", "最多 50 个模型列表")
	}
	return out, fe
}

// fillModelInUse sets the requests in flight of each model list of the views,
// one Redis round trip per distinct list.
func (s *Service) fillModelInUse(ctx context.Context, out []*View) {
	if s.d.Slots == nil {
		return
	}
	byKey := map[string][]int64{}
	for _, v := range out {
		for i := range v.ModelLimits {
			k := v.ModelLimits[i].Key()
			byKey[k] = append(byKey[k], v.ID)
		}
	}
	counts := make(map[string]map[int64]int, len(byKey))
	for k, ids := range byKey {
		n, err := s.d.Slots.InUseMany(ctx, core.ModelLimitSlots(k), ids)
		if err != nil {
			slog.WarnContext(ctx, "account: read model list slots", "err", err)
			return
		}
		counts[k] = n
	}
	for _, v := range out {
		for i := range v.ModelLimits {
			if i < len(v.RateUsage.Models) {
				v.RateUsage.Models[i].InUse = counts[v.ModelLimits[i].Key()][v.ID]
			}
		}
	}
}
