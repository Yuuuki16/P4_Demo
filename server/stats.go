package main

import (
	"math"
	"sort"
	"time"
)

// 集計ページ（/#stats）で使う分析。回答が増えるたびに、全件から計算し直す。
//
// 体験の前と後は同じ人の回答なので、「対応のある t 検定」で
// 前後の差が偶然の範囲かどうかを調べる（p 値）。あわせて効果量（Cohen の dz）も出す。

// QuestionStats は1問ぶんの分析結果。
type QuestionStats struct {
	ID       string  `json:"id"`
	Pre      float64 `json:"pre"`      // 体験前の平均
	Post     float64 `json:"post"`     // 体験後の平均
	Diff     float64 `json:"diff"`     // 差（後 − 前）の平均
	SD       float64 `json:"sd"`       // 差の標準偏差
	PreDist  [5]int  `json:"preDist"`  // 体験前に 1〜5 を選んだ人数
	PostDist [5]int  `json:"postDist"` // 体験後に 1〜5 を選んだ人数
	Up       int     `json:"up"`       // 体験後に点数が上がった人数
	Same     int     `json:"same"`     // 変わらなかった人数
	Down     int     `json:"down"`     // 下がった人数
	// 回答が2件未満のときは計算できないので null
	T      *float64 `json:"t"`
	P      *float64 `json:"p"`      // 両側の p 値
	Effect *float64 `json:"effect"` // 効果量 dz = 差の平均 / 差の標準偏差
}

// DatasetStats は、学習に使ったデータ（A・B・C・なし）ごとの前後の差の平均。
type DatasetStats struct {
	Dataset string   `json:"dataset"` // "A" "B" "C"、データを選ばなかった回答は "-"
	Count   int      `json:"count"`
	Diff    Averages `json:"diff"`
}

// question は1問の取り出し方。
type question struct {
	id  string
	get func(Answers) int
}

var questions = []question{
	{"scary", func(a Answers) int { return a.Scary }},
	{"understand", func(a Answers) int { return a.Understand }},
	{"fixable", func(a Answers) int { return a.Fixable }},
}

func analyzeQuestion(q question, all []Response) QuestionStats {
	out := QuestionStats{ID: q.id}
	n := len(all)
	if n == 0 {
		return out
	}
	diffs := make([]float64, n)
	for i, r := range all {
		pre, post := q.get(r.Pre), q.get(r.Post)
		out.Pre += float64(pre)
		out.Post += float64(post)
		out.PreDist[pre-1]++
		out.PostDist[post-1]++
		d := float64(post - pre)
		diffs[i] = d
		out.Diff += d
		switch {
		case d > 0:
			out.Up++
		case d < 0:
			out.Down++
		default:
			out.Same++
		}
	}
	nf := float64(n)
	out.Pre /= nf
	out.Post /= nf
	out.Diff /= nf
	if n < 2 {
		return out
	}

	var ss float64
	for _, d := range diffs {
		ss += (d - out.Diff) * (d - out.Diff)
	}
	out.SD = math.Sqrt(ss / (nf - 1)) // 不偏標準偏差

	var t, p float64
	switch {
	case out.SD > 0:
		t = out.Diff / (out.SD / math.Sqrt(nf))
		p = tTestP(t, nf-1)
		e := out.Diff / out.SD
		out.Effect = &e
	case out.Diff == 0:
		t, p = 0, 1 // 全員の差が 0
	default:
		t, p = math.Inf(int(math.Copysign(1, out.Diff))), 0 // 全員が同じだけ変化した
	}
	if !math.IsInf(t, 0) {
		out.T = &t
	}
	out.P = &p
	return out
}

func analyzeDatasets(all []Response) []DatasetStats {
	groups := map[string][]Response{}
	for _, r := range all {
		key := "-"
		if r.Dataset != nil {
			key = *r.Dataset
		}
		groups[key] = append(groups[key], r)
	}
	out := make([]DatasetStats, 0, len(groups))
	for key, rs := range groups {
		ds := DatasetStats{Dataset: key, Count: len(rs)}
		n := float64(len(rs))
		for _, r := range rs {
			ds.Diff.Scary += float64(r.Post.Scary-r.Pre.Scary) / n
			ds.Diff.Understand += float64(r.Post.Understand-r.Pre.Understand) / n
			ds.Diff.Fixable += float64(r.Post.Fixable-r.Pre.Fixable) / n
		}
		out = append(out, ds)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].Dataset < out[j].Dataset })
	return out
}

// lastResponseAt は、いちばん新しい回答の時刻。回答がなければ nil。
func lastResponseAt(all []Response) *time.Time {
	var last *time.Time
	for i := range all {
		if last == nil || all[i].CreatedAt.After(*last) {
			last = &all[i].CreatedAt
		}
	}
	return last
}

// tTestP は、自由度 df の t 分布で |T| >= |t| となる確率（両側の p 値）。
// p = I_x(df/2, 1/2)、x = df / (df + t²)（I は正則化不完全ベータ関数）
func tTestP(t, df float64) float64 {
	if df <= 0 {
		return math.NaN()
	}
	x := df / (df + t*t)
	return regIncBeta(df/2, 0.5, x)
}

// regIncBeta は正則化不完全ベータ関数 I_x(a, b)。連分数で計算する（Numerical Recipes の betai / betacf）。
func regIncBeta(a, b, x float64) float64 {
	if x <= 0 {
		return 0
	}
	if x >= 1 {
		return 1
	}
	la, _ := math.Lgamma(a)
	lb, _ := math.Lgamma(b)
	lab, _ := math.Lgamma(a + b)
	front := math.Exp(lab - la - lb + a*math.Log(x) + b*math.Log(1-x))
	if x < (a+1)/(a+b+2) {
		return front * betaCF(a, b, x) / a
	}
	return 1 - front*betaCF(b, a, 1-x)/b
}

func betaCF(a, b, x float64) float64 {
	const maxIter = 300
	const eps = 1e-14
	const tiny = 1e-300
	qab, qap, qam := a+b, a+1, a-1
	c, d := 1.0, 1-qab*x/qap
	if math.Abs(d) < tiny {
		d = tiny
	}
	d = 1 / d
	h := d
	for m := 1; m <= maxIter; m++ {
		mf := float64(m)
		m2 := 2 * mf
		aa := mf * (b - mf) * x / ((qam + m2) * (a + m2))
		d = 1 + aa*d
		if math.Abs(d) < tiny {
			d = tiny
		}
		c = 1 + aa/c
		if math.Abs(c) < tiny {
			c = tiny
		}
		d = 1 / d
		h *= d * c
		aa = -(a + mf) * (qab + mf) * x / ((a + m2) * (qap + m2))
		d = 1 + aa*d
		if math.Abs(d) < tiny {
			d = tiny
		}
		c = 1 + aa/c
		if math.Abs(c) < tiny {
			c = tiny
		}
		d = 1 / d
		del := d * c
		h *= del
		if math.Abs(del-1) < eps {
			break
		}
	}
	return h
}
