package main

import (
	"math"
	"testing"
	"time"
)

func TestTTestP(t *testing.T) {
	// t 分布表の値（両側）
	cases := []struct {
		t, df, want, tol float64
	}{
		{0, 10, 1, 1e-12},
		{2.228, 10, 0.05, 2e-4},     // 自由度10の 5% 点
		{3.169, 10, 0.01, 2e-4},     // 自由度10の 1% 点
		{12.706, 1, 0.05, 2e-4},     // 自由度1の 5% 点
		{2.086, 20, 0.05, 2e-4},     // 自由度20の 5% 点
		{-2.228, 10, 0.05, 2e-4},    // 符号は関係ない（両側）
		{1.959964, 1e7, 0.05, 1e-5}, // 自由度が大きいと正規分布に近づく
	}
	for _, c := range cases {
		if got := tTestP(c.t, c.df); math.Abs(got-c.want) > c.tol {
			t.Errorf("tTestP(%v, %v) = %v, want %v", c.t, c.df, got, c.want)
		}
	}
}

func resp(pre, post Answers) Response {
	return Response{ID: "x", Pre: pre, Post: post, CreatedAt: time.Now()}
}

func TestAnalyzeQuestion(t *testing.T) {
	// こわさ：前 4,3,5,2 → 後 2,3,3,1（差 -2,0,-2,-1）
	all := []Response{
		resp(Answers{4, 1, 1}, Answers{2, 1, 1}),
		resp(Answers{3, 1, 1}, Answers{3, 1, 1}),
		resp(Answers{5, 1, 1}, Answers{3, 1, 1}),
		resp(Answers{2, 1, 1}, Answers{1, 1, 1}),
	}
	q := analyzeQuestion(questions[0], all)
	near := func(name string, got, want float64) {
		t.Helper()
		if math.Abs(got-want) > 1e-3 {
			t.Errorf("%s = %v, want %v", name, got, want)
		}
	}
	near("Pre", q.Pre, 3.5)
	near("Post", q.Post, 2.25)
	near("Diff", q.Diff, -1.25)
	near("SD", q.SD, 0.9574) // sqrt(2.75/3)
	if q.T == nil || q.P == nil || q.Effect == nil {
		t.Fatalf("T/P/Effect should be set: %+v", q)
	}
	near("T", *q.T, -2.6112) // -1.25 / (0.9574/2)
	near("Effect", *q.Effect, -1.3056)
	if *q.P < 0.05 || *q.P > 0.10 { // 自由度3で |t|=2.61 は 5%〜10% の間
		t.Errorf("P = %v, want between 0.05 and 0.10", *q.P)
	}
	if q.Up != 0 || q.Same != 1 || q.Down != 3 {
		t.Errorf("Up/Same/Down = %d/%d/%d, want 0/1/3", q.Up, q.Same, q.Down)
	}
	if q.PreDist != [5]int{0, 1, 1, 1, 1} || q.PostDist != [5]int{1, 1, 2, 0, 0} {
		t.Errorf("PreDist = %v, PostDist = %v", q.PreDist, q.PostDist)
	}
}

func TestAnalyzeQuestionEdgeCases(t *testing.T) {
	// 1件だけ：検定はできない
	one := analyzeQuestion(questions[0], []Response{resp(Answers{4, 1, 1}, Answers{2, 1, 1})})
	if one.P != nil || one.T != nil {
		t.Errorf("1件なら P と T は null: %+v", one)
	}
	// 全員変化なし：p = 1
	same := analyzeQuestion(questions[0], []Response{
		resp(Answers{3, 1, 1}, Answers{3, 1, 1}),
		resp(Answers{4, 1, 1}, Answers{4, 1, 1}),
	})
	if same.P == nil || *same.P != 1 {
		t.Errorf("変化なしなら P = 1: %+v", same)
	}
	// 全員が同じだけ下がった：ばらつきが 0 なので p = 0、t は無限大なので null
	all := analyzeQuestion(questions[0], []Response{
		resp(Answers{4, 1, 1}, Answers{3, 1, 1}),
		resp(Answers{5, 1, 1}, Answers{4, 1, 1}),
	})
	if all.P == nil || *all.P != 0 || all.T != nil {
		t.Errorf("全員同じ変化なら P = 0、T = null: %+v", all)
	}
	// 0件
	if z := analyzeQuestion(questions[0], nil); z.Pre != 0 || z.P != nil {
		t.Errorf("0件: %+v", z)
	}
}

func TestAnalyzeDatasets(t *testing.T) {
	a, b := "A", "B"
	all := []Response{
		{Dataset: &a, Pre: Answers{4, 2, 2}, Post: Answers{2, 4, 4}},
		{Dataset: &a, Pre: Answers{4, 2, 2}, Post: Answers{4, 2, 2}},
		{Dataset: &b, Pre: Answers{3, 3, 3}, Post: Answers{2, 3, 5}},
		{Dataset: nil, Pre: Answers{1, 1, 1}, Post: Answers{1, 1, 1}},
	}
	got := analyzeDatasets(all)
	if len(got) != 3 || got[0].Dataset != "-" || got[1].Dataset != "A" || got[2].Dataset != "B" {
		t.Fatalf("datasets = %+v", got)
	}
	if got[1].Count != 2 || got[1].Diff.Scary != -1 || got[1].Diff.Understand != 1 {
		t.Errorf("A = %+v", got[1])
	}
	if got[2].Diff.Fixable != 2 {
		t.Errorf("B = %+v", got[2])
	}
}
