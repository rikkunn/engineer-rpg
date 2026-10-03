# 作業引き継ぎ（2026-10-03）

## 目標

スマホブラウザのSEあるあるRPG。全3章、1〜2時間の短編を目指す。AAA品質、Web/フォーム感のないゲームUI、6観点の厳格なサブエージェントレビュー。進捗をREADMEへ記載し、GitHubのPrivateリポジトリへcommit/push。

## 現在の区切り

ユーザーが「ここいらでcommit/pushし、サイトへ公開して」と明示。完成前の動作確認済み版を公開する新指示が、以前の完成後公開条件に優先する。GitHubはPrivate、Sitesはpublic（URLを知る人が遊べる）。未実装の追加機能はREADMEに明記する。

13マップ・17戦闘・18調査手順・3結末。有給/1ターン不在/残業代・共有スキルを実装、単体28件通過。3サイズの戦闘/休暇テスト、後半15戦闘・147台詞・全結末のUI操作が通過。ソースはsrc、画面検証はscripts、生成物はdist。

## 次の作業

- prototypesの会話バトルを本編へ統合：要件定義/新人教育/昼休み/評価面談/アンケート。専用コマンドで理解・信頼を揃え、相手を倒さない。
- 状態異常と支援技：理解不足、丁寧に説明（高MP）、前も説明しなかったっけ（低MPと副作用）など。まだengineへ入れていない。
- 全員OKを捏造しない。初見プレイ時間とiOS/Android実機は未測定。追加実装後に再レビュー。
- 村の国境出口(7,7)は装備屋(7,6)で片側が塞がる。会話NPCを(6,7)へ置くと到達不能になるため禁止。新NPC追加ごとにworldテスト。

## 公開

.openai/hosting.jsonに既存Site IDを記録。新規Siteを作り直さない。Sites hostingスキルのworkflowを使う。トークンをファイルに保存しない。distにドキュメント/テスト/.gitは含めない。

## クラウド

このタスクはまだローカル。Sites公開はPCを切っても遊べる配信だが、ローカル開発タスクをクラウド移行するものではない。Codex Cloudの環境設定と新タスクが別途必要。公式参照：https://learn.chatgpt.com/docs/environments/cloud-environments

ローカルの組み込みBrowserはruntime起動エラーがあったため、独立したheadless Edge/Playwrightで検証した。PLAYWRIGHT_PATHで既存ランタイムを指定する。

Sites v1公開済み：https://engineer-rpg.lungtheater.chatgpt.site （ゲームソースc99bf82）。Windows公開時はPATHの先頭にGit/binを置き、TAR_OPTIONS=--force-local、archivePathはC:/形式でbundled workflowを実行する。標準bashはWSLのためWindowsパスで失敗する。

2026-10-04: ユーザー試遊で会話表示/台詞の人間味/次操作不明を重大問題として指摘。dialogue.js/chapter-one.jsで一人一発言と顔/地の文分離、campaign40イベント改稿＋REVISITS20、guidance.jsで次行動CTAと地図目標を統合。モバイル導入75ページPASS、単体46件。三騎士の合意は戦後へ移動。初見プレイ時間/実機/AAA認定は未検証のまま。会話バトルと新状態はまだprototypes/未実装。
2026-10-04: Sites v2公開成功。ゲームソース2d6ffba。今回3重大問題の担当別レビュー全てOK、公開URLは同じ。
2026-10-04: 固有アバターと表情を追加、320/390実会話で独立レビュー合格。Sites v3公開済み、ゲームソース00bbd61。
2026-10-04: 戦闘文章を完全タップ送りへ変更、演出抑制でも省略しない。手送り3サイズ/既存戦闘15画面/休暇3サイズPASS。Sites v4公開、ゲームソースdbbdea8。
