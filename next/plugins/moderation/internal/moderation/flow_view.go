package moderation

import (
	"cmp"
	"fmt"
	"slices"
)

// FlowRef names a flow version: the flow a group is bound to now.
type FlowRef struct {
	FlowID  int64  `json:"flow_id"`
	Name    string `json:"name,omitempty"`
	Version int    `json:"version"`
}

// The flow version view and its category dictionary (CONTRACTS §72.13.5,
// new-api category_dict.go).

// openAICategoryNames / openAICategoryDefs: the OpenAI omni-moderation
// categories in Chinese (new-api messages.go and category_dict.go).
var openAICategoryNames = map[string]string{
	"harassment": "骚扰", "harassment/threatening": "骚扰 · 威胁", "hate": "仇恨", "hate/threatening": "仇恨 · 威胁",
	"illicit": "违法行为", "illicit/violent": "违法行为 · 暴力", "self-harm": "自残", "self-harm/intent": "自残 · 意图",
	"self-harm/instructions": "自残 · 指导", "sexual": "色情内容", "sexual/minors": "未成年人色情", "violence": "暴力",
	"violence/graphic": "暴力 · 血腥",
}

var openAICategoryDefs = map[string]string{
	"harassment":             "表达、煽动或宣扬针对任何对象的骚扰性语言。",
	"harassment/threatening": "同时包含对任何对象施加暴力或严重伤害的骚扰内容。",
	"hate":                   "基于种族、性别、民族、宗教、国籍、性取向、残障或种姓表达、煽动或宣扬仇恨的内容。",
	"hate/threatening":       "同时包含对目标群体施加暴力或严重伤害的仇恨内容。",
	"illicit":                "提供如何实施违法行为的建议或指导（例如「如何入店行窃」）。",
	"illicit/violent":        "同上，且涉及暴力或获取武器。",
	"self-harm":              "宣扬、鼓励或描写自杀、割伤、进食障碍等自我伤害行为。",
	"self-harm/intent":       "说话者表达正在或打算进行自我伤害。",
	"self-harm/instructions": "鼓励自我伤害，或提供如何实施的指导和建议。",
	"sexual":                 "意在引起性兴奋的内容（例如描写性行为），或推广性服务（性教育和健康除外）。",
	"sexual/minors":          "涉及未满 18 岁者的性内容。",
	"violence":               "描写死亡、暴力或身体伤害的内容。",
	"violence/graphic":       "以直观露骨的细节描写死亡、暴力或身体伤害。",
}

const openAIDefSource = "OpenAI 内置类别说明"

// Stage roles: a fallback stage is 补审, the first stage 初审, a later stage
// with a Jev auditor 行为审查, any other 复核 (new-api StageRole).
const (
	RoleFirst    = "first"
	RoleBehavior = "behavior"
	RoleReview   = "review"
	RoleFallback = "fallback"
)

var stageRoleNames = map[string]string{RoleFirst: "初审", RoleBehavior: "行为审查", RoleReview: "复核", RoleFallback: "补审"}

func stageRole(index int, fallback, hasJev bool) string {
	switch {
	case fallback:
		return RoleFallback
	case index == 0:
		return RoleFirst
	case hasJev:
		return RoleBehavior
	}
	return RoleReview
}

// CategoryDef is one dictionary item; Def is the definition text sent to the model.
type CategoryDef struct {
	Code    string `json:"category"`
	Name    string `json:"name"`
	Source  string `json:"source"` // openai_moderation | typesafe | llm_verdict | llm_questions
	Stage   int    `json:"stage,omitempty"`
	Auditor string `json:"auditor,omitempty"`
	From    string `json:"from"`
	Def     string `json:"definition"`
}

// CategoryDict is the dictionary of the current version of one flow; FlowID
// 0 = no flow, only the 13 built-in codes.
type CategoryDict struct {
	FlowID   int64         `json:"flow_id"`
	FlowName string        `json:"flow_name,omitempty"`
	Version  int           `json:"version,omitempty"`
	Items    []CategoryDef `json:"items"`
}

// categoryDict builds the dictionary of a flow's current version: the 13
// built-in codes first, then each stage's auditors in order; a later
// definition of the same code replaces the earlier one in place.
func categoryDict(f *liveFlow, auditors map[int64]*liveAuditor) CategoryDict {
	d := CategoryDict{Items: make([]CategoryDef, 0, len(OpenAICategories))}
	at := map[string]int{}
	for _, c := range OpenAICategories {
		at[c] = len(d.Items)
		d.Items = append(d.Items, CategoryDef{Code: c, Name: openAICategoryNames[c], Source: ChannelOpenAI, From: openAIDefSource, Def: openAICategoryDefs[c]})
	}
	if f == nil {
		return d
	}
	d.FlowID, d.FlowName, d.Version = f.ID, f.Name, f.Version
	for i, st := range f.Spec.Stages {
		role := stageRoleNames[stageRole(i, st.Fallback, stageHasJev(st, auditors))]
		for _, id := range st.Auditors {
			if a := auditors[id]; a != nil {
				d.merge(at, auditorDefs(a, i+1, fmt.Sprintf("第 %d 级 · %s · %s", i+1, role, a.Name)))
			}
		}
	}
	return d
}

func (d *CategoryDict) merge(at map[string]int, defs []CategoryDef) {
	for _, def := range defs {
		if pos, ok := at[def.Code]; ok {
			d.Items[pos] = def
			continue
		}
		at[def.Code] = len(d.Items)
		d.Items = append(d.Items, def)
	}
}

// auditorDefs: OpenAI defines the 13 codes with the OpenAI meanings, Jev
// and llm_questions each row of the question table with its question text,
// llm_verdict each category with its description.
func auditorDefs(a *liveAuditor, stage int, from string) []CategoryDef {
	var defs []CategoryDef
	switch {
	case (a.Type == AuditorTypeSafe || a.Type == AuditorLLMQuestions) && a.questions != nil:
		for _, q := range a.questions.Items {
			defs = append(defs, CategoryDef{Code: q.Category, Name: cmp.Or(q.Label, openAICategoryNames[q.Category], q.Category),
				Source: a.Type, Stage: stage, Auditor: a.Name, From: from + "（问题原文）", Def: q.Question})
		}
	case a.Type == AuditorLLMVerdict && a.llm != nil:
		for _, c := range a.llm.categories {
			defs = append(defs, CategoryDef{Code: c.ID, Name: c.ID, Source: a.Type, Stage: stage, Auditor: a.Name,
				From: from + "（分类说明）", Def: c.Description})
		}
	case a.Type == AuditorOpenAI:
		for _, c := range OpenAICategories {
			defs = append(defs, CategoryDef{Code: c, Name: openAICategoryNames[c], Source: a.Type, Stage: stage, Auditor: a.Name,
				From: from + "（" + openAIDefSource + "）", Def: openAICategoryDefs[c]})
		}
	}
	return defs
}

func stageHasJev(st Stage, auditors map[int64]*liveAuditor) bool {
	return slices.ContainsFunc(st.Auditors, func(id int64) bool { return auditors[id] != nil && auditors[id].Type == AuditorTypeSafe })
}

// FlowVersionView is one version of a flow as the version API returns it:
// current (thresholds, questions, dictionary), historical (structure only)
// or deleted.
type FlowVersionView struct {
	FlowID         int64         `json:"flow_id"`
	Name           string        `json:"name,omitempty"`
	Version        int           `json:"version"`
	Current        bool          `json:"current"`
	CurrentVersion int           `json:"current_version,omitempty"`
	Historical     bool          `json:"historical,omitempty"`
	Deleted        bool          `json:"deleted,omitempty"`
	Note           string        `json:"note,omitempty"`
	BoundGroups    []int64       `json:"bound_groups,omitempty"`
	PublishedAt    string        `json:"published_at,omitempty"`
	Spec           *Spec         `json:"spec,omitempty"`
	Stages         []StageView   `json:"stages"`
	Dict           *CategoryDict `json:"dict,omitempty"`
}

// StageView is one stage of a FlowVersionView.
type StageView struct {
	Stage    int              `json:"stage"`
	Role     string           `json:"role"`
	Combine  string           `json:"combine,omitempty"`
	N        int              `json:"n,omitempty"`
	Fallback bool             `json:"fallback,omitempty"`
	Auditors []AuditorRefView `json:"auditors"`
}

// AuditorRefView is one auditor of a StageView.
type AuditorRefView struct {
	AuditorID   int64              `json:"auditor_id"`
	Name        string             `json:"name"`
	Type        string             `json:"type,omitempty"`
	ChannelName string             `json:"channel_name,omitempty"`
	Model       string             `json:"model,omitempty"`
	Thresholds  map[string]float64 `json:"thresholds,omitempty"`
	Questions   *JevQuestions      `json:"questions,omitempty"`
	Categories  []Category         `json:"categories,omitempty"`
	Deleted     bool               `json:"deleted,omitempty"`
}

// Notes of a FlowVersionView that is not the current version.
const (
	NoteHistorical  = "historical"
	NoteFlowDeleted = "flow_deleted"
)

// currentFlowView: structure, thresholds or questions, and the dictionary.
func currentFlowView(f *liveFlow, auditors map[int64]*liveAuditor, groups []int64) *FlowVersionView {
	if f == nil {
		return nil
	}
	dict := categoryDict(f, auditors)
	spec := *f.Spec
	v := &FlowVersionView{FlowID: f.ID, Name: f.Name, Version: f.Version, Current: true, BoundGroups: groups, Spec: &spec, Dict: &dict}
	for i, st := range f.Spec.Stages {
		sv := StageView{Stage: i + 1, Role: stageRole(i, st.Fallback, stageHasJev(st, auditors)), Combine: cmp.Or(st.Combine, CombineAny), N: st.N,
			Fallback: st.Fallback, Auditors: []AuditorRefView{}}
		for _, id := range st.Auditors {
			sv.Auditors = append(sv.Auditors, currentAuditorView(id, auditors[id]))
		}
		v.Stages = append(v.Stages, sv)
	}
	return v
}

func currentAuditorView(id int64, a *liveAuditor) AuditorRefView {
	if a == nil {
		return AuditorRefView{AuditorID: id, Deleted: true}
	}
	av := AuditorRefView{AuditorID: id, Name: a.Name, Type: a.Type}
	switch a.Type {
	case AuditorTypeSafe, AuditorLLMQuestions:
		av.Questions = a.questions
	case AuditorOpenAI:
		av.Thresholds = a.thresholds
	case AuditorLLMVerdict:
		if a.llm != nil {
			av.Categories = a.llm.categories
		}
	}
	if a.channel != nil {
		av.ChannelName, av.Model = a.channel.Name, a.channel.Model
	}
	return av
}

// stageStructure: each stage's role, combine and auditors (current names;
// a missing id is deleted). Old versions only get this.
func stageStructure(spec *Spec, auditors map[int64]*liveAuditor) []StageView {
	views := make([]StageView, 0, len(spec.Stages))
	for i, st := range spec.Stages {
		sv := StageView{Stage: i + 1, Combine: cmp.Or(st.Combine, CombineAny), N: st.N, Fallback: st.Fallback, Auditors: make([]AuditorRefView, 0, len(st.Auditors))}
		for _, id := range st.Auditors {
			a := auditors[id]
			if a == nil {
				sv.Auditors = append(sv.Auditors, AuditorRefView{AuditorID: id, Deleted: true})
				continue
			}
			sv.Auditors = append(sv.Auditors, AuditorRefView{AuditorID: id, Name: a.Name, Type: a.Type})
		}
		sv.Role = stageRole(i, st.Fallback, stageHasJev(st, auditors))
		views = append(views, sv)
	}
	return views
}
