# BGM

ベートーヴェンの主題・伴奏モチーフを、ゲーム用の短いループとして簡略編曲しています。全曲の演奏ではありません。外部の演奏録音や音源サンプルは使用せず、`src/audio.js`のWeb Audio合成音で再生します。

|場面|原曲|音色|
|---|---|---|
|探索・タイトル|交響曲第9番 第4楽章「歓喜の歌」の主題|柔らかいピアノ風|
|ダンジョン|ピアノソナタ第14番「月光」第1楽章の伴奏モチーフ|低音と分散和音|
|戦闘|交響曲第5番「運命」第1楽章のモチーフ|弦楽器風|

楽譜参照：[第9番](https://imslp.org/wiki/Symphony_No.9,_Op.125_(Beethoven,_Ludwig_van))、[月光](https://imslp.org/wiki/Piano_Sonata_No.14_(Beethoven,_Ludwig_van))、[第5番](https://imslp.org/wiki/Symphony_No.5_(Beethoven,_Ludwig_van))。

初期設定はOFF。ゲームの設定からONにでき、設定を保存します。画面が非表示になると停止し、戻ると再開します。音楽データはJavaScriptに内包しており、追加ダウンロードはありません。
