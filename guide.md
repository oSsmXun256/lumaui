# LumaUI 実装ガイド v1.4

## Design Philosophy

LumaUIは「情報を読ませるUI」のためのフレームワークです。判断の基準は常に次の順序です。

1. **可読性が最優先** — 装飾はテキストのコントラストを下げない範囲で。Glow・ガラス・グラデーション面は持ち込まない。
2. **階層は3軸で示す** — Surface(背景の明るさ段階) / Border(ボーダー) / Elevation(影)の3つで「どれが上か」を伝える。shadowだけで階層を作らない。
3. **Neumorphismは補助** — 入力系(インプット・トグル・スライダー・選択中タブ)の凹凸表現に限定。カードやパネルの主階層はborder+surfaceで示す。
4. **操作可能性を明示** — 読むだけのカードと遷移できるカードをクラスで区別し、操作対象にはhover / focus / 矢印を付ける。
5. **キーボード・支援技術を前提にする** — Esc / Tab / 矢印 / Home / Endとfocus管理はライブラリが担当。閉じたレイヤーがTabストップとして残らない。

## v1.4 の変更点

- CSSをモジュール分割（1ファイル1400行 → 7モジュール + 結合版）。用途に応じて必要な分だけ読み込み可能
- `lumaui.js` を公式提供。Dropdown/Drawer/Modal/Tabs/Accordion/ThemeToggle/Toastを1本のJSで管理（キーボード操作: Arrow / Home / End / Esc / Tab Trap対応）
- モーダルは開いた要素へフォーカスし、閉じると起点へ復帰。開いている間は背面スクロールを固定
- 閉じたレイヤー(モーダル・ドロワー・アコーディオン・ドロップダウン項目)がTabフォーカスの対象にならないようvisibility制御
- セマンティックカラー: `--luma-on`(success) / `--luma-error` / `--luma-warning` / `--luma-info` + badge / inset / text の各バリアント
- Surface / Elevationトークンを全コンポーネントへ適用。`--luma-surface-0..3` と `--luma-elevation-0..4` で階層を統一
- 新規コンポーネント: Modal, Tabs(縦含む), Accordion, Toast, Tooltip, Pagination, Breadcrumb, Avatar, Skeleton, Spinner, 検索付き複数選択Dropdown
- `data-style="flat"` でNeumorphism⇔フラットデザインを切替可能
- サイズバリエーション追加: `luma-btn--sm/lg`, `luma-input--sm/lg`, `luma-avatar--sm/lg`
- `luma-btn--loading`(処理中スピナー)とフォームのdisabled状態を標準提供
- ユーティリティクラス拡充（mt/mb/ml/mr/p, w-25/50/75, flex-wrap, shadow-none, border-none 等）。インラインstyle撤廃を推奨
- 命名をBEM `--` 修飾子に統一（`luma-card-sm` → `luma-card--sm`。旧クラスは互換エイリアスとして維持）
- アニメーション追加（fade / slide / spin / skeleton、`prefers-reduced-motion` 対応）

---

## セットアップ

### モジュール別（推奨・軽量）

```html
<link rel="stylesheet" href="lumaui-core.css">        <!-- 必須: トークン/リセット/タイポグラフィ/レイアウト/ユーティリティ -->
<link rel="stylesheet" href="lumaui-button.css">       <!-- ボタンを使う場合 -->
<link rel="stylesheet" href="lumaui-form.css">         <!-- 入力・セレクト・トグル・スライダー・ドロップダウンを使う場合 -->
<link rel="stylesheet" href="lumaui-table.css">        <!-- テーブル・ページネーション・パンくずを使う場合 -->
<link rel="stylesheet" href="lumaui-navigation.css">   <!-- サイドバー・ドロワー・タブを使う場合 -->
<link rel="stylesheet" href="lumaui-components.css">   <!-- カード・バッジ・メトリクス・アバター等 -->
<link rel="stylesheet" href="lumaui-overlay.css">      <!-- モーダル・トースト・ツールチップ・アコーディオン -->
<script src="lumaui.js" defer></script>
```

### 一括（互換・簡易）

```html
<link rel="stylesheet" href="lumaui.css">  <!-- 上記7ファイルの結合版 -->
<script src="lumaui.js" defer></script>
```

`lumaui.css` は `npm run build` で分割モジュールから再生成されます。直接編集しないでください(編集は次回ビルドで失われます)。

`lumaui.js` は `DOMContentLoaded` 時に全コンポーネントを自動初期化する。個別初期化が必要な場合は `LumaUI.Dropdown.initAll()` のように呼び出す。

### テーマ・スタイル切替属性

`<html>` タグに以下を指定：
- `data-theme="light"` / `data-theme="dark"` — 強制ライト/ダーク（省略時OS設定）
- `data-style="flat"` — Neumorphismを無効化しフラット表示（省略時はNeumorphism）

```html
<button data-luma-theme-toggle>💡</button>  <!-- クリックでテーマをトグル。lumaui.jsが自動処理 -->
```

---

## Surface / Elevation ガイド

どの面をどの高さに置くかの基準です。影を独自に書かず、トークンを選んでください。

| トークン | 用途 |
| :-- | :-- |
| `--luma-surface-0`(=`--luma-bg`) | ページ背景 |
| `--luma-surface-1`(=`--luma-surface`) | 標準のカード・パネル・バー |
| `--luma-surface-2`(=`--luma-surface-raised`) | ページより一段上に浮く面: サイドバー、モーダル、ドロップダウンリスト、トースト |
| `--luma-surface-3`(=`--luma-surface-hover`) | hover等で一時的に強調する面 |
| `--luma-elevation-0` | 影なし |
| `--luma-elevation-1` | 標準カード・縦タブコンテナの静かな浮き |
| `--luma-elevation-2` | Neumorphismの凸(アクセント) |
| `--luma-elevation-3` | hover時の浮き上がり、ドロップダウン、トースト |
| `--luma-elevation-4` | モーダルなど最前面のレイヤー |

```html
<!-- 標準面: surface-1 + elevation-1 -->
<article class="luma-card">…</article>

<!-- 固定サイドバー: surface-2(浮いた面) + elevation-1 -->
<nav class="luma-nav luma-nav--side">…</nav>
```

- **Card / Panel**: `luma-card`(surface-1 + elevation-1)。情報量が多くてもこの1段で十分です。
- **Button**: 通常ボタンはsurface + 凸影(elevation-2相当)。hoverで `--luma-neu-convex-hover`、押下で `--luma-neu-inset`。primary/dangerのみ色付き影を持ちます。
- **Navigation**: サイドバーは `--luma-surface-raised` でページから一段浮けます。従来型のフル幅・直角リンクではなく、余白付き角丸リンク + アクティブ時の左アクセントバーで現在地を示します。
- **Tabs**: 選択タブだけ凸影とon-bgで持ち上げ、非選択は平らのまま。
- **Form**: 入力系は凹(`--luma-neu-inset`)で「触る場所」を示す。disabledは `opacity: .5` + `cursor: not-allowed` が標準です。
- **Dropdown / Modal**: 面を `--luma-surface-raised` に持ち上げ、影は `--luma-elevation-3` / `--luma-elevation-4`。ガラスやblurは使わないでください。

**悪い使用例**:

- `style="box-shadow: 0 4px 12px rgba(0,0,0,.2)"` のような独自影 → elevationトークンを使う
- カードの中にさらに凸影のカードを重ねる → 階層は1段ずつ。深い階層はinset(`luma-inset`)で表現する
- 全要素にNeumorphismの凸影 → 凸は操作系と選択状態のみ
- 閉じているモーダルの中身を `opacity: 0` だけで隠す → Tabでフォーカスが届くため `visibility` 制御(ライブラリ+CSSで済み)が必要

---

## レイアウト

### ページラッパー / グリッド / フレックス

```html
<main class="luma-page luma-stack luma-gap-lg">...</main>

<div class="luma-grid luma-grid-4">...</div>   <!-- ≤1024px:2列 ≤768px:1列 -->
<div class="luma-grid luma-grid-3">...</div>   <!-- ≤1024px:2列 ≤768px:1列 -->
<div class="luma-grid luma-grid-2">...</div>   <!-- ≤768px:1列 -->
<div class="luma-grid luma-grid-auto">...</div><!-- auto-fit minmax(240px) -->

<div class="luma-flex luma-gap-sm luma-flex-wrap">...</div>       <!-- style="flex-wrap:wrap"の代替 -->
<div class="luma-flex luma-flex-col luma-gap-sm">...</div>        <!-- 縦並びflex -->
<div class="luma-flex-between">...</div>
<div class="luma-flex-center">...</div>
<div class="luma-flex luma-flex-responsive">...</div>             <!-- スマホで縦並び -->
```

gap: `luma-gap-xs`(4px) / `sm`(8px) / `md`(16px) / `lg`(24px)

### サイドバー付きレイアウト（PCサイドバー＋モバイルドロワー）

```html
<header class="luma-nav luma-nav--top luma-mobile-bar">
  <button class="luma-btn luma-btn--icon luma-btn--ghost" data-luma-drawer-open aria-label="メニューを開く">☰</button>
  <div class="luma-h4">ブランド名</div>
  <button class="luma-btn luma-btn--icon luma-btn--ghost" data-luma-theme-toggle aria-label="テーマ切り替え">💡</button>
</header>

<div class="luma-overlay"></div>
<button class="luma-theme-toggle luma-hidden-mobile" data-luma-theme-toggle aria-label="テーマ切り替え">💡</button>

<nav class="luma-nav luma-nav--side" id="sideNavigation">
  <div class="luma-nav__brand">
    <span>ブランド名</span>
    <button class="luma-btn luma-btn--icon luma-btn--ghost" id="menuCloseBtn" aria-label="閉じる">✕</button>
  </div>
  <div class="luma-nav__section">セクション名</div>
  <a href="#section" class="luma-nav__link luma-nav__link--active"><span>📊</span> リンク名</a>
</nav>

<main class="luma-main-with-sidebar luma-page luma-stack luma-gap-lg">...</main>
```

ドロワーの開閉・Esc・Tabトラップは `lumaui.js` の `Drawer` が自動処理する（`data-luma-drawer-open` 属性の要素がトリガー、`#menuCloseBtn` が閉じるボタン）。独自JSは不要。

---

## カード・コンテナ

```html
<div class="luma-card">
  <div class="luma-card__header"><h2 class="luma-h2">タイトル</h2></div>
  ...
</div>

<div class="luma-card luma-card--sm">...</div>   <!-- 小サイズ（旧: luma-card-sm、互換維持） -->
<div class="luma-card luma-card--lg">...</div>   <!-- 大サイズ（新規） -->

<!-- 情報表示だけのカード -->
<article class="luma-card luma-card--static">状態を表示するだけ</article>

<!-- 遷移・操作できるカード: a/button/role=link と組み合わせる -->
<a class="luma-card luma-card--interactive" href="/settings">
  <h2 class="luma-h3">設定</h2>
  <span class="luma-card__action">開く →</span>
</a>

<div class="luma-card__header luma-flex-between">
  <h2 class="luma-h2">タイトル</h2>
  <span class="luma-badge luma-badge--on">稼働中</span>
</div>
```

### インセット（セマンティックバリエーション）

```html
<div class="luma-inset">汎用のインセット（凹み）コンテナ</div>

<div class="luma-inset luma-inset--on">
  <div class="luma-flex luma-gap-sm">
    <span aria-hidden="true">✅</span>
    <div><p class="luma-label luma-text-on">成功タイトル</p><p class="luma-body-sm">説明文</p></div>
  </div>
</div>
<!-- 同様に luma-inset--error / luma-inset--warning / luma-inset--info -->
```

> 背景とボーダーは `luma-inset--on/--error/--warning/--info` が担当します。インラインstyleでの色指定は不要です。見出しの色は `luma-text-on / -error / -warning / -info` を併用してください。

---

## タイポグラフィ

```html
<h1 class="luma-h1">Heading 1</h1>
<h2 class="luma-h2">Heading 2</h2>
<h3 class="luma-h3">Heading 3</h3>
<h4 class="luma-h4">Heading 4</h4>

<p class="luma-body">通常テキスト</p>
<p class="luma-body-sm">補足テキスト</p>
<p class="luma-caption">キャプション</p>
<p class="luma-label">フォームラベル</p>
<code class="luma-mono">192.168.11.4</code>

<span class="luma-text-on">成功</span>
<span class="luma-text-error">エラー</span>
<span class="luma-text-muted">ミュート</span>
<span class="luma-text-hint">ヒント</span>
<p class="luma-text-left">左揃え</p>
<p class="luma-text-center">中央揃え</p>
<p class="luma-text-right">右揃え</p>
```

---

## ボタン

```html
<!-- バリアント -->
<button class="luma-btn luma-btn--primary">Primary</button>
<button class="luma-btn">Default</button>
<button class="luma-btn luma-btn--danger">Danger</button>
<button class="luma-btn luma-btn--ghost">Ghost</button>   <!-- 新規: 背景・影なし -->
<button class="luma-btn" disabled>Disabled</button>

<!-- サイズ（新規） -->
<button class="luma-btn luma-btn--primary luma-btn--sm">Small</button>
<button class="luma-btn luma-btn--primary">Medium (default)</button>
<button class="luma-btn luma-btn--primary luma-btn--lg">Large</button>

<!-- アイコンボタン（size修飾子併用可） -->
<button class="luma-btn luma-btn--icon">⚙️</button>
<button class="luma-btn luma-btn--icon luma-btn--sm">＋</button>
<button class="luma-btn luma-btn--icon luma-btn--lg luma-btn--danger">🗑</button>

<!-- 処理中状態: クリック直後に付け、完了時に外す。スピナーが先頭に付き、再クリックを防ぐ -->
<button class="luma-btn luma-btn--primary luma-btn--loading" aria-busy="true">保存中…</button>
```

---

## フォーム

### フィールドラッパー

```html
<div class="luma-field">
  <label class="luma-field__label" for="inp1">フィールド名</label>
  <input class="luma-input" id="inp1" type="text" placeholder="プレースホルダー">
  <span class="luma-field__hint">ヒントテキスト</span>
</div>

<div class="luma-field">
  <label class="luma-field__label" for="inp2">メールアドレス</label>
  <input class="luma-input luma-input--error" id="inp2" type="email">
  <span class="luma-field__error">有効なメールアドレスを入力してください</span>
</div>
```

### 入力バリアント・サイズ（新規: sm/lg）

```html
<input class="luma-input luma-input--sm" type="text">
<input class="luma-input" type="text">              <!-- 標準 -->
<input class="luma-input luma-input--lg" type="text">

<input class="luma-input luma-input--number" type="number" value="12800">

<div class="luma-input-group">
  <span class="luma-input-group__addon">¥</span>
  <input class="luma-input luma-input--number" type="number" value="12800">
  <span class="luma-input-group__addon luma-input-group__addon--right">JPY</span>
</div>
```

### ドロップダウン（カスタム実装・推奨）

単一選択には `luma-dropdown` 構造を推奨します（矢印キー・選択管理が組み込み）。単純な社内ツール用にネイティブselectの `luma-select` スタイルも残していますが、キーボード操作と見た目の統一が必要な場面では `luma-dropdown` を使ってください。

```html
<div class="luma-field">
  <label class="luma-field__label">選択ラベル</label>
  <div class="luma-dropdown">
    <button type="button" class="luma-dropdown__trigger">
      <span class="luma-dropdown__value">初期値テキスト</span>
      <svg class="luma-dropdown__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <ul class="luma-dropdown__list" role="listbox">
      <li class="luma-dropdown__group-label" aria-hidden="true">グループ名</li>
      <li class="luma-dropdown__item luma-dropdown__item--selected" role="option" data-value="value1">表示名1</li>
      <li class="luma-dropdown__item" role="option" data-value="value2">表示名2</li>
      <li class="luma-dropdown__item" role="option" data-value="value3">表示名3</li>
    </ul>
  </div>
</div>
```

JSは不要。`lumaui.js` の `Dropdown` が自動的に開閉・矢印キー移動（↑↓ Home End）・Enter/Space選択・Escで閉じる・フォーカス制御をすべて処理する。`luma-dropdown__value` はJSが選択項目のテキストへ自動更新するので、`data-value` と `data-label`（省略時は要素テキスト）だけ指定すればよい。選択イベントは `dropdown.addEventListener('luma:change', e => console.log(e.detail.value))` で取得可能。

### プレースホルダー状態

```html
<button type="button" class="luma-dropdown__trigger" data-placeholder="true">
  <span class="luma-dropdown__value">選択してください</span>
  ...
</button>
```

### 複数選択Dropdown（検索・チェックボックス付き）

`.luma-dropdown` に `.luma-multiselect` と `data-multiple="true"` を付けると、検索・全解除・選択チップが有効になります。`data-search` 属性で検索用の別表記（英字名など）を指定できます。

```html
<div class="luma-dropdown luma-multiselect" data-multiple="true" data-placeholder="選択してください">
  <button type="button" class="luma-dropdown__trigger">
    <span class="luma-dropdown__value">選択してください</span>
    <svg class="luma-dropdown__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
  </button>
  <div class="luma-dropdown__list">
    <div class="luma-multiselect__toolbar">
      <input type="search" class="luma-input luma-input--sm luma-multiselect__search" placeholder="絞り込み…" aria-label="選択肢を絞り込み">
      <button type="button" class="luma-btn luma-btn--sm luma-btn--ghost luma-multiselect__clear">全解除</button>
    </div>
    <div class="luma-dropdown__item" role="option" aria-selected="false" data-value="apne1" data-search="tokyo japan">
      <span class="luma-multiselect__check" aria-hidden="true"></span> Tokyo
    </div>
    <div class="luma-dropdown__item" role="option" aria-selected="false" data-value="use1" data-search="virginia">
      <span class="luma-multiselect__check" aria-hidden="true"></span> N. Virginia
    </div>
  </div>
</div>
<div class="luma-multiselect__selected" aria-label="選択中の項目"></div>
```

- 開くと検索ボックスへフォーカスし、選択済み項目は `luma-multiselect__selected` へチップとして出力されます。チップの×でも解除できます。
- 変更は `dropdown.addEventListener('luma:change', e => e.detail.values)` で配列として取得できます(単一選択は `e.detail.value`)。
- Esc・外部クリック・矢印キー・Home / End・Enter / Spaceは単一選択と共通です。

### トグルスイッチ

```html
<label class="luma-toggle-row">
  <span class="luma-toggle">
    <input type="checkbox">
    <span class="luma-toggle__track"><span class="luma-toggle__thumb"></span></span>
  </span>
  <span class="luma-toggle-label">ラベルテキスト</span>
</label>
```

### スライダー

```html
<div class="luma-slider-wrap">
  <div class="luma-slider-header">
    <label for="mySlider" class="luma-label">スライダーラベル</label>
    <span class="luma-mono" id="sliderVal">50%</span>
  </div>
  <input type="range" id="mySlider" class="luma-slider luma-slider--accent" min="0" max="100" value="50" style="--luma-progress:50%;">
</div>
```

値との連動（`--luma-progress`）はデータ依存のため引き続きJSで実装する：

```js
const slider = document.getElementById('mySlider');
slider.addEventListener('input', e => {
  sliderVal.textContent = e.target.value + '%';
  slider.style.setProperty('--luma-progress', e.target.value + '%');
});
```

### プログレスバー

```html
<div class="luma-progress-wrap">
  <div class="luma-flex-between luma-caption"><span>ラベル</span><span>42%</span></div>
  <div class="luma-progress-track"><div class="luma-progress-bar" style="width:42%;"></div></div>
</div>
<div class="luma-progress-track luma-progress-track--sm"><div class="luma-progress-bar" style="width:68%;"></div></div>
<div class="luma-progress-bar luma-progress-bar--error" style="width:95%;"></div>
```

---

## バッジ・チップ・アバター

```html
<span class="luma-badge luma-badge--on">Online</span>
<span class="luma-badge luma-badge--error">Error</span>
<span class="luma-badge luma-badge--warning">Warning</span>
<span class="luma-badge luma-badge--info">Info</span>
<span class="luma-badge">Default</span>
<span class="luma-badge luma-badge--no-dot">v1.4.0</span>

<!-- アバター（新規） -->
<span class="luma-avatar luma-avatar--sm">A</span>
<span class="luma-avatar"><img src="user.jpg" alt=""></span>
<span class="luma-avatar luma-avatar--lg">田</span>
<div class="luma-avatar-group">
  <span class="luma-avatar luma-avatar--sm">A</span>
  <span class="luma-avatar luma-avatar--sm">B</span>
  <span class="luma-avatar luma-avatar--sm">C</span>
</div>
```

## スケルトン・スピナー（新規: ローディング表現）

```html
<div class="luma-skeleton luma-skeleton--text" style="width:60%;"></div>
<div class="luma-skeleton luma-skeleton--circle" style="width:40px;height:40px;"></div>
<div class="luma-spinner"></div>
<div class="luma-spinner luma-spinner--lg"></div>
```

---

## メトリクスカード

```html
<div class="luma-metric">
  <div class="luma-metric__label">月間ユーザー</div>
  <div class="luma-metric__value">12,480</div>
  <div class="luma-metric__sub luma-metric__sub--on">▲ +12.5%</div>
</div>
```

---

## テーブル・ページネーション・パンくず（新規2点）

```html
<div class="luma-table-wrap">
  <table class="luma-table">
    <thead><tr><th>列名</th><th class="luma-text-right">数値列</th></tr></thead>
    <tbody>
      <tr><td class="luma-mono">node-asia-01</td><td class="luma-text-right luma-mono luma-text-on">23%</td></tr>
    </tbody>
  </table>
</div>

<!-- ページネーション -->
<nav class="luma-pagination" aria-label="ページ送り">
  <span class="luma-pagination__item luma-pagination__item--disabled">‹</span>
  <span class="luma-pagination__item luma-pagination__item--active">1</span>
  <a class="luma-pagination__item" href="#">2</a>
  <a class="luma-pagination__item" href="#">3</a>
  <a class="luma-pagination__item" href="#">›</a>
</nav>

<!-- パンくず -->
<nav class="luma-breadcrumb" aria-label="パンくずリスト">
  <a class="luma-breadcrumb__link" href="#">ホーム</a>
  <span class="luma-breadcrumb__sep">/</span>
  <a class="luma-breadcrumb__link" href="#">設定</a>
  <span class="luma-breadcrumb__sep">/</span>
  <span class="luma-breadcrumb__current">プロフィール</span>
</nav>
```

---

## タブ（新規）

```html
<div class="luma-tabs" role="tablist">
  <button class="luma-tabs__item" role="tab" aria-selected="true" aria-controls="panel-a">タブA</button>
  <button class="luma-tabs__item" role="tab" aria-selected="false" aria-controls="panel-b">タブB</button>
</div>
<div class="luma-tabs__panel" id="panel-a">Aの内容</div>
<div class="luma-tabs__panel" id="panel-b" hidden>Bの内容</div>
```

`lumaui.js` の `Tabs` が自動処理。左右矢印キー・Home/Endでタブ移動、クリックで切替、`aria-controls` に対応する要素の `hidden` を自動制御する。

縦タブは `luma-tabs--vertical` と `luma-tabs__list` / `luma-tabs__panels` を使います。上下矢印キーで移動し、640px以下では横スクロール可能なタブ列へ切り替わります。

```html
<div class="luma-tabs luma-tabs--vertical" aria-orientation="vertical">
  <div class="luma-tabs__list" role="tablist" aria-orientation="vertical">
    <button class="luma-tabs__item" role="tab" aria-selected="true" aria-controls="panel-general">一般</button>
    <button class="luma-tabs__item" role="tab" aria-selected="false" aria-controls="panel-access">権限</button>
  </div>
  <div class="luma-tabs__panels">
    <div class="luma-tabs__panel" id="panel-general" role="tabpanel">一般設定</div>
    <div class="luma-tabs__panel" id="panel-access" role="tabpanel" hidden>権限設定</div>
  </div>
</div>
```

## アコーディオン（新規）

```html
<div class="luma-accordion">
  <div class="luma-accordion__item">
    <button class="luma-accordion__trigger">
      見出しA
      <svg class="luma-accordion__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </button>
    <div class="luma-accordion__panel"><div class="luma-accordion__panel-inner">本文A</div></div>
  </div>
</div>
```

## モーダル（新規）

```html
<button data-luma-modal-open="myModal" class="luma-btn luma-btn--primary">開く</button>

<div class="luma-modal-backdrop" id="myModal">
  <div class="luma-modal" role="dialog" aria-modal="true" aria-labelledby="myModalTitle">
    <div class="luma-modal__header">
      <h2 class="luma-h3" id="myModalTitle">モーダルタイトル</h2>
      <button class="luma-modal__close" data-luma-modal-close aria-label="閉じる">✕</button>
    </div>
    <div class="luma-modal__body">本文</div>
    <div class="luma-modal__footer">
      <button class="luma-btn" data-luma-modal-close>キャンセル</button>
      <button class="luma-btn luma-btn--primary" data-luma-modal-close>OK</button>
    </div>
  </div>
</div>
```

Esc・背景クリック・Tabトラップは `lumaui.js` の `Modal` が自動処理。開いたときに最初の操作可能要素へフォーカスし、閉じたときに開くきっかけとなった要素へフォーカスを戻します。モーダルが開いている間は背面のスクロールも固定されます。閉じているモーダルはCSSの `visibility: hidden` でTabフォーカス・読み上げの両方から遮断されます。JSから直接開閉する場合は `LumaUI.Modal.open('myModal')` / `LumaUI.Modal.close('myModal')`。

## トースト（新規）

```js
LumaUI.Toast.show('保存しました', { type: 'on', duration: 4000 });
LumaUI.Toast.show('エラーが発生しました', { type: 'error' });
```

`type` は `on` / `error` / 省略（デフォルト）。表示領域(`.luma-toast-region`)はJSが自動生成する。画面右下に固定表示され、新しいトーストは現在の一番上のカードの上に、右からスッと入ってくる。一番下（既存のカード）の位置は増減の影響を受けず常に同じ場所のまま。カード幅は360px固定・本文は1行省略表示（`text-overflow: ellipsis`）のため、内容の長さに関わらずサイズは常に一定。

**スタック表示**: 表示中のトーストが `Toast.STACK_THRESHOLD`（既定4件）を超えると、5件目以降は隠れ、表示中4枚目（一番下）のカード下端から古いカードの縁がわずかにのぞく見た目（`+N`バッジ付き）になる。そのカードをクリックすると全件展開し（`.is-expanded`）、`max-height: 70vh; overflow-y: auto` でマウスホイールスクロールできる（スクロールバーは非表示）。展開中は先頭に固定の「▲ たたむ」バーが表示され、クリックで再び4件+スタック表示に戻る。しきい値は `LumaUI.Toast.STACK_THRESHOLD = 6;` のように上書き可能。

閉じるボタン(`.luma-toast__close`)はモーダルと同じ32×32pxタップ領域。トーストは表示時に `luma-toast-in`、閉じる時（×クリック／自動タイムアウトの両方）に `luma-toast-out` で右へフェードアウトしてからDOMから削除される。

## ツールチップ（新規・CSSのみ）

```html
<span class="luma-tooltip">
  <button class="luma-btn luma-btn--icon">?</button>
  <span class="luma-tooltip__bubble">説明テキスト</span>
</span>
```

---

## 区切り線 / グラフコンテナ

```html
<hr class="luma-divider">
<hr class="luma-divider luma-divider--strong">

<div class="luma-chart-area"><canvas class="luma-chart-area__canvas" id="myChart"></canvas></div>
```

---

## ユーティリティ（拡充）

```html
<!-- スペーシング（0/xs/sm/md/lg、mt/mb/ml/mr/p） -->
<div class="luma-mt-sm luma-mb-md luma-ml-sm luma-p-md">...</div>

<!-- 幅 -->
<div class="luma-w-full">100%</div>
<div class="luma-w-25">25%</div>
<div class="luma-w-50">50%</div>
<div class="luma-max-w-md luma-mx-auto">中央寄せ・最大幅</div>

<!-- 表示制御 -->
<span class="luma-hidden">常に非表示</span>
<span class="luma-hidden-mobile">PCのみ表示</span>
<span class="luma-hidden-desktop">スマホのみ表示</span>
<span class="luma-sr-only">スクリーンリーダー専用</span>
<div class="luma-block">display:block</div>
<span class="luma-inline-block">display:inline-block</span>

<!-- インラインstyle撤廃用 -->
<div class="luma-shadow-none luma-border-none luma-radius-none luma-overflow-hidden">...</div>

<!-- アニメーション -->
<div class="luma-anim-fade">フェードイン</div>
<div class="luma-anim-slide">スライドアップ</div>
```

---

## CSSカスタムプロパティ

```css
var(--luma-bg) var(--luma-surface) var(--luma-surface-alt)
var(--luma-surface-muted) var(--luma-surface-raised) var(--luma-surface-hover) var(--luma-surface-active)
var(--luma-fg) var(--luma-fg-muted) var(--luma-fg-hint)
var(--luma-on) var(--luma-on-bg) var(--luma-on-border)
var(--luma-error) var(--luma-error-bg) var(--luma-error-border)
var(--luma-warning) var(--luma-warning-bg) var(--luma-warning-border)
var(--luma-info) var(--luma-info-bg) var(--luma-info-border)
var(--luma-border) var(--luma-border-mid) var(--luma-border-strong)
var(--luma-neu-convex) var(--luma-neu-convex-hover) var(--luma-neu-inset) var(--luma-card-shadow)
var(--luma-surface-0/1/2/3) var(--luma-elevation-0/1/2/3/4) var(--luma-focus-ring)
var(--luma-space-xs/sm/md/lg/xl)
var(--luma-radius-sm/md/lg/xl/pill)
var(--luma-z-drawer/overlay/dropdown/modal/toast/tooltip)  /* z-indexスケール */
```

---

## アクセシビリティとキーボード操作

`lumaui.js` が担当する操作は次のとおりです。独自実装で置き換えないでください。

| コンポーネント | 操作 |
| :-- | :-- |
| Dropdown | ↑↓ / Home / End で項目移動、Enter / Space で選択、Esc で閉じてトリガーへ復帰 |
| Modal | Tab / Shift+Tab をダイアログ内に閉じ込め、Esc で閉じ、起点へフォーカス復帰。開いている間は背面スクロール固定 |
| Drawer(モバイル) | Tab トラップ + Esc + フォーカス復帰 |
| Tabs | 左右(縦は上下)矢印 + Home / End で移動し、選択とフォーカスが一致(roving tabindex) |
| Accordion | `aria-expanded` を維持し、閉じているパネルはフォーカス対象外 |
| Toast | `role="status"` の live region で通知。閉じるボタンは32px以上のタップ領域 |

CSS側の契約:

- フォーカスリングは `:focus-visible` で全要素に表示(`--luma-focus-ring`)。
- 閉じているレイヤーは `visibility: hidden` でTabストップから外れる(opacityやpointer-eventsだけでは不十分)。
- `prefers-reduced-motion: reduce` では全transition / animationが実質0秒になる。
- タップ領域はボタン・閉じるボタンともに実質32px以上を維持する。

## responsive

- グリッドは `luma-grid-3/4` が ≤1024pxで2列、≤768pxで1列。`luma-grid-auto` は `minmax(240px)` の自動列。
- ≤768pxでサイドバーはドロワー(`transform: translateX(-100%)` + `visibility: hidden`)に変わり、`luma-mobile-bar` が表示される。本文は `luma-main-with-sidebar` で自動追従。
- モバイルで非表示にする要素は `luma-hidden-mobile` / `luma-hidden-desktop`。`display:none` はフォーカス対象からも外れるため、a11y上も安全。
- 見出し・カード余白・トースト幅は同ブレークポイントで自動調整される。サイト側で個別の上書きを書かない。

---

## よくあるミス・禁止事項

| ❌ やってはいけない | ✅ 正しい |
|---|---|
| `<select class="luma-select">` で主要なドロップダウン実装 | `luma-dropdown` 構造を使用（`lumaui.js`が自動初期化）。`luma-select` は単純な社内ツール用 |
| `luma-dropdown__trigger` に `<div>` 使用 | `<button type="button">` を使う |
| チェブロンSVGを省略 | `<polyline points="6 9 12 15 18 9"/>` を必ず含める |
| 開閉状態を独自JSで再実装 | `lumaui.js` の `Dropdown`/`Drawer`/`Modal`/`Tabs`/`Accordion` を使う |
| モーダルにフォーカストラップを付けない | `data-luma-modal-open/close` を使えば自動対応 |
| `style="flex-wrap:wrap"` 等のインラインstyle多用 | `luma-flex-wrap` 等のユーティリティクラスを使う |
| `style="background:…"` でインセットを色分け | `luma-inset--on/--error/--warning/--info` を使う |
| 独自の `box-shadow` を書く | `--luma-elevation-*` / `--luma-neu-*` トークンを使う |
| `luma-card-sm` 等の旧命名を新規コードで使う | 新規実装では `luma-card--sm` のBEM表記を使う（旧クラスは後方互換のみ） |
| フィールドラベルを `luma-field` 外に置く | 必ず `luma-field` でラップする |
| モバイルバーを常時表示 | `luma-nav--top luma-mobile-bar` で自動的にスマホのみ表示になる |
| 閉じたレイヤーを `opacity:0` だけで隠す | `visibility` 制御(ライブラリ+CSSが処理)に任せ、独自の `display` 切替を重ねない |
