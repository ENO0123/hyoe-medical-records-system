# RailwayとGitHubの連携手順

RailwayでGitHubリポジトリが表示されない場合の対処方法です。

## 方法1：Railwayダッシュボードから連携（推奨）

### ステップ1：GitHubアカウントでRailwayにログイン

1. [railway.app](https://railway.app)にアクセス
2. 「Login」をクリック
3. 「Continue with GitHub」を選択
4. GitHubの認証画面で「Authorize Railway」をクリック

### ステップ2：リポジトリの権限を確認

1. GitHubにログイン
2. 右上のプロフィールアイコン → 「Settings」
3. 左メニューの「Applications」→「Installed GitHub Apps」
4. 「Railway」を探してクリック
5. 「Repository access」で以下を確認：
   - 「All repositories」が選択されている場合：すべてのリポジトリが表示されます
   - 「Only select repositories」が選択されている場合：選択したリポジトリのみ表示されます

### ステップ3：リポジトリへのアクセスを許可

「Only select repositories」が選択されている場合：

1. 「Configure」をクリック
2. 「Repository access」で「All repositories」を選択
   - または、特定のリポジトリのみ許可する場合は、リポジトリを選択
3. 「Save」をクリック

### ステップ4：Railwayでリポジトリを確認

1. Railwayダッシュボードに戻る
2. 「New Project」をクリック
3. 「Deploy from GitHub repo」を選択
4. リポジトリ一覧に表示されることを確認

---

## 方法2：GitHubリポジトリがまだ作成されていない場合

### ステップ1：GitHubリポジトリを作成

1. [GitHub](https://github.com)にログイン
2. 右上の「+」→「New repository」をクリック
3. リポジトリ名を入力（例：`medical-records-system`）
4. 公開設定を選択（Private または Public）
5. 「Create repository」をクリック

### ステップ2：ローカルコードをGitHubにプッシュ

ターミナルで以下を実行：

```bash
# 現在のディレクトリを確認
cd /Users/ryoenomoto/work/11_兵衛/電子カルテ

# Gitリポジトリが初期化されているか確認
git status

# まだGitリポジトリでない場合
git init
git add .
git commit -m "Initial commit"

# GitHubリポジトリをリモートとして追加
# （YOUR_USERNAMEとYOUR_REPO_NAMEを実際の値に置き換える）
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# ブランチ名を設定（mainまたはmaster）
git branch -M main

# GitHubにプッシュ
git push -u origin main
```

### ステップ3：Railwayでリポジトリを選択

1. Railwayダッシュボードで「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. 作成したリポジトリを選択

---

## 方法3：既存のGitリポジトリがある場合

### ステップ1：リモートリポジトリを確認

```bash
# 現在のリモートを確認
git remote -v

# リモートが設定されていない場合、GitHubリポジトリを追加
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# 既存のリモートがある場合、URLを更新
git remote set-url origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
```

### ステップ2：GitHubにプッシュ

```bash
# 変更をコミット
git add .
git commit -m "Add Railway configuration files"

# GitHubにプッシュ
git push -u origin main
```

---

## トラブルシューティング

### リポジトリが表示されない場合

1. **GitHubアカウントの再認証**
   - Railwayダッシュボードで「Settings」→「Account」
   - 「Disconnect GitHub」をクリック
   - 再度「Connect GitHub」をクリック

2. **ブラウザのキャッシュをクリア**
   - ブラウザのキャッシュをクリア
   - Railwayダッシュボードを再読み込み

3. **リポジトリの権限を確認**
   - GitHubの「Settings」→「Applications」→「Installed GitHub Apps」→「Railway」
   - リポジトリへのアクセス権限を確認

### プライベートリポジトリの場合

- Railwayはプライベートリポジトリにもアクセスできます
- GitHubでRailwayアプリに適切な権限が付与されていることを確認してください

### 組織のリポジトリの場合

- 組織のリポジトリを使用する場合、組織の管理者がRailwayアプリを承認する必要がある場合があります
- 組織の「Settings」→「Third-party access」で確認してください

---

## 次のステップ

GitHubリポジトリが表示されたら：

1. Railwayで「New Project」をクリック
2. 「Deploy from GitHub repo」を選択
3. リポジトリを選択
4. ブランチを選択（例：`main`）
5. デプロイが開始されます

---

## 参考リンク

- [Railway Documentation - GitHub Integration](https://docs.railway.app/guides/github)
- [GitHub - Managing your connections to third-party applications](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-connections-to-third-party-applications)
