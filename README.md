# 英語フレーズクイズ

日本語 → 英語の翻訳クイズアプリです。  
GitHub Pages で公開することで、iPhone の Safari からも使えます。

---

## GitHub Pages への公開手順

### 必要なもの
- GitHub アカウント（無料）
- このフォルダにある `index.html`

---

### ステップ 1：GitHubにリポジトリを作成する

1. [github.com](https://github.com) にログインする
2. 右上の「**+**」→「**New repository**」をクリック
3. 以下を入力する
   - **Repository name**：`phrase-app`（任意の名前でOK）
   - **Public** を選択（GitHub Pages は Public リポジトリなら無料）
4. 「**Create repository**」をクリック

---

### ステップ 2：ファイルをアップロードする

#### 方法A：ブラウザからアップロード（簡単）

1. 作成したリポジトリのページを開く
2. 「**uploading an existing file**」リンクをクリック
3. `index.html` をドラッグ＆ドロップ（または「choose your files」から選択）
4. 画面下の「**Commit changes**」をクリック

#### 方法B：git コマンドで登録（上級者向け）

```bash
cd /path/to/phrase-app
git init
git add index.html
git commit -m "Add quiz app"
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/phrase-app.git
git push -u origin main
```

---

### ステップ 3：GitHub Pages を有効にする

1. リポジトリの「**Settings**」タブをクリック
2. 左側メニューの「**Pages**」を選択
3. **Source** のドロップダウンで「**Deploy from a branch**」を選択
4. **Branch** を「**main**」、フォルダを「**/ (root)**」に設定
5. 「**Save**」をクリック

---

### ステップ 4：公開URLを確認する

数分後、以下の形式のURLでアプリが公開されます。

```
https://あなたのユーザー名.github.io/phrase-app/
```

ページ上部にURLが表示されます。表示されない場合は少し待ってから再読み込みしてください。

---

## iPhoneでの音声入力について

- **Safari（iOS 14.5以降）** で音声入力が使えます
- 初回利用時にマイクの使用許可を求めるダイアログが表示されます → 「許可」をタップ
- GitHub Pages は HTTPS で配信されるため、音声認識が正常に動作します
- ローカルの `file://` で開いた場合、音声入力はiOSでは動作しません

## ファイル構成

```
phrase-app/
├── index.html   # アプリ本体（これ1つで動作）
├── phrases.csv  # 元データ（参照用、アプリには埋め込み済み）
└── README.md    # この説明書
```
