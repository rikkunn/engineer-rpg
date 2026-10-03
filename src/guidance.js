import { MAPS, entities, pathTo } from './world.js';

/** A suggestion, never a movement or a progression mutation. Null means that a
 * malformed/unreachable map has no honest destination to suggest. */
export function nextGuidance(state) {
  if (!state || !Object.hasOwn(MAPS, state.map)) return null;
  const f = state.flags || {}, defeated = new Set(state.defeated || []);
  const local = entities(state), candidates = [];
  const add = (id, label, reason) => candidates.push({ targetId: id, label, reason });
  const missing = (flag, id, label, reason) => { if (!f[flag]) add(id, label, reason); };
  const enemy = (id, label, reason) => { if (!defeated.has(id)) add(id, label, reason); };
  const back = (id, label, reason) => add(id, label, reason);
  const allEvidence = ['evidence_a', 'evidence_b', 'evidence_c'].every(key => f[key]);
  const wounded = state.party?.some(h => h.hp <= 0) || state.party?.every(h => h.hp < h.maxHp * .4);

  // Recovery is actionable once: resting changes HP, so the next suggestion
  // returns to the investigation rather than repeatedly suggesting the inn.
  if (wounded && !f.finished) {
    if (state.map === 'village') add('inn', '宿屋で立て直す', '戦闘不能の仲間や大きな消耗がある。無料で全員回復できる。');
    else if (['border', 'capital', 'release'].includes(state.map)) add('camp_rest', '全員を回復する', '休憩でHP・MPを戻してから続きを進めよう。');
  }

  if (f.finished) {
    const exits = { village: 'inn', ruins: 'village', core: 'ruinsBack', border: 'camp_rest', application: 'back_border', network: 'back_border', gate: 'to_capital', training: 'back_border', capital: 'camp_rest', vault: 'back_capital', operations: 'back_capital', tower: 'back_capital', release: 'camp_rest' };
    add(exits[state.map], 'ひと息つく', '冒険は完了。別の結末を目指すなら、手帳の「切替前の世界へ戻る」を選べる。');
  } else switch (state.map) {
    case 'village':
      if (f.boss && !f.complete) add('shop', '道具屋へ解決を報告', '二重送信は止まった。依頼主への報告で次の道が開く。');
      else if (f.complete) add('border_gate', '国境の砦へ向かう', f.knights ? '王都へ戻るには、国境砦から基盤塔を通ろう。' : '次の依頼は、三社が管理する国境の橋にある。');
      else {
        missing('quest', 'shop', '道具屋に話を聞く', 'まず依頼主から、何が起きているか聞こう。');
        if (f.quest) missing('clerk', 'clerk', '店員の操作を確認', '実際に注文ボタンを押した人の話が必要だ。');
        if (f.clerk) missing('mayor', 'mayor', '村長に運用を聞く', '店員の話が揃った。夜間の古い仕組みを調べよう。');
        if (f.mayor) add('ruins', '地下遺跡へ進む', '夜間の再送処理と、重複を防ぐ刻印を探そう。');
      }
      break;
    case 'ruins':
      if (f.boss || !f.mayor) back('village', '村へ戻る', f.boss ? '道具屋への解決報告が残っている。' : '地下の調査前に、村の聞き込みを揃えよう。');
      else {
        missing('terminal', 'terminal', '運用端末を調べる', 'ログが残っていない理由と、調査の方法を確かめよう。');
        missing('minutes', 'minutes', '議事録を拾う', '合意を示す証拠があれば、後の戦闘で役立つ。');
        add('core', '再送処理の祭壇へ', f.seal ? '刻印を持って、二重送信の発生源へ向かおう。' : '最深部で処理済みの刻印を探そう。');
      }
      break;
    case 'core':
      if (f.boss) back('ruinsBack', '村への道を戻る', '二重送信は解消した。道具屋へ報告しよう。');
      else {
        missing('seal', 'seal', '宝箱から刻印を取る', '二つの処理が復活し続けるのを止める道具だ。');
        missing('archive', 'archive', '前任者の記録を読む', '再送の仕組みが、何を守っていたのか確かめよう。');
        if (f.seal) add('boss', '二重送信を止める', '刻印は戦闘中の「どうぐ」から使える。');
      }
      break;
    case 'border':
      if (f.knights) add('to_gate', '基盤塔から王都へ', '橋の問題は解決済み。基盤塔の奥から王都へ進める。');
      else {
        missing('sales_meeting', 'sales_meeting', '営業サラと依頼を確認', '調査する範囲と、契約の条件を確認しよう。');
        if (!f.evidence_a) add('to_application', 'アプリ塔の記録を探す', '三つの証拠のうち、受付記録がまだない。');
        else if (!f.evidence_b) add('to_network', '中継塔の記録を探す', '次は通信記録。申請がどこまで届いたか調べよう。');
        else if (!f.evidence_c) add('to_gate', '基盤塔の記録を探す', '最後は変更記録。門の許可設定を確かめよう。');
        else add('to_gate', '三社の担当者に会う', '証拠が揃った。基盤塔で同じ申請を照合しよう。');
      }
      break;
    case 'application':
      if (!f.evidence_a) {
        missing('application_keeper', 'application_keeper', '術師に受付の仕組みを聞く', '「成功」の表示が、どこまでの成功なのか確認しよう。');
        enemy('meeting1', '確認会議を片付ける', '受付台帳を読むには、塔の二つの障害を解消する必要がある。');
        enemy('golem1', '仕様書の不明点を調べる', 'もう一つの障害を解消すれば、受付台帳を開ける。');
        add('evidence_a', '受付台帳を写す', '障害は解消した。台帳を調べて証拠を手に入れよう。');
      } else back('back_border', '証拠を持って砦へ', '受付記録は入手済み。ほかの塔の記録と照合しよう。');
      break;
    case 'network':
      if (!f.evidence_b) {
        missing('network_keeper', 'network_keeper', '渡し守に監視の範囲を聞く', '線が正常でも、申請が通るとは限らない。');
        enemy('spec1', '食い違う仕様を確かめる', '中継碑を読むには、塔の二つの障害を解消しよう。');
        enemy('ghost2', '環境差の不具合を調べる', '監視とログで原因を見つけ、中継碑への障害を取り除こう。');
        add('evidence_b', '中継碑を写す', '通信記録が読める。拒否された場所を確かめよう。');
      } else back('back_border', '通信記録を持って砦へ', 'この塔の証拠は揃った。残りの記録を探そう。');
      break;
    case 'gate':
      if (f.knights) add('to_capital', '王都へ進む', '三社の認識が揃い、王都への道が開いた。');
      else if (!f.evidence_c) {
        missing('infrastructure_keeper', 'infrastructure_keeper', '守衛に申請状況を聞く', '新しい印章が門に登録されているか確認しよう。');
        enemy('slime3', '承認待ちの問題を解く', '変更台帳を読むため、申請の障害を解消しよう。');
        add('evidence_c', '変更台帳を写す', '台帳の下書きと送信日時を確かめよう。');
      } else if (!allEvidence) back('back_border', '足りない証拠を探しに戻る', '受付・通信・変更の三記録が揃ってから担当者に示そう。');
      else add('knights', f.trace_complete ? '証拠を担当者へ示す' : '三つの記録を照合する', f.trace_complete ? '戦闘の「どうぐ」から、それぞれの担当へ証拠を提示しよう。' : '申請42番を追う調査を進め、そのまま三社の問題を解こう。');
      break;
    case 'training':
      if (f.auto_test) back('back_border', '砦へ戻る', '任意依頼の自動テストは完成した。最終戦の助けになる。');
      else if (f.test_normal && f.test_rejected) add('test_request', '検証士へ試験結果を報告', '二つの結果を報告すると、自動テストが完成する。');
      else {
        missing('test_request', 'test_request', '検証士の依頼を聞く', 'ここは任意の準備。試験の条件を揃えてから始めよう。');
        if (f.test_request) {
          enemy('meeting2', '確認会議を終わらせる', '会議の障害を片付けると、二つの試験碑を使える。');
          missing('test_normal', 'normal_trial', '白い碑で正常系を試す', '登録済みの印章が、一度だけ門を開くか確かめよう。');
          missing('test_rejected', 'rejected_trial', '黒い碑で異常系を試す', '未登録の印章を正しく拒否できるか確かめよう。');
        }
      }
      break;
    case 'capital':
      missing('king_deadline', 'king_deadline', '王に切替条件を聞く', '日程と、確認できなかった場合の判断を揃えよう。');
      missing('order_owner', 'order_owner', '受発注係に確認', 'どの注文までを引き継ぐか確かめよう。');
      missing('stock_owner', 'stock_owner', '倉庫番に確認', '棚と配送中の在庫を、同じ数え方で揃えよう。');
      missing('invoice_owner', 'invoice_owner', '会計官に確認', '請求済みの履歴を、二度処理しないための確認だ。');
      if (f.restore_request && !f.restore_test) add('to_vault', '受けた復元確認を進める', '任意依頼が途中。保管庫で続けられる。古代機への道も選べる。');
      if (f.handover_request && !f.handover) add('to_operations', '受けた引き継ぎを進める', '任意依頼が途中。ノノの運用室で続けられる。');
      add('to_tower', '古代機の回廊へ進む', '必要な担当者への確認が揃えば進める。任意の準備は後からも回収できる。');
      break;
    case 'vault':
      if (f.restore_test) back('back_capital', '王都へ戻る', '復元確認は完了した。最終戦で一度だけ全滅から復帰できる。');
      else if (f.restore_trial) add('restore_request', '司書へ復元結果を報告', '試験の完了を報告し、復元確認の準備を受け取ろう。');
      else {
        missing('restore_request', 'restore_request', '司書の依頼を聞く', '任意の準備として、バックアップを実際に戻せるか試そう。');
        missing('restore_archive', 'restore_archive', '「最新」の写本を確認', '表紙だけで選ばず、記録の中身を確かめよう。');
        enemy('ghost3', '復元の障害を調べる', '試験台座を使うには、まず不具合を解消しよう。');
        add('restore_trial', '試験台座で復元する', '写本の確認と障害の解消が済んだら、記録を照合する。');
      }
      break;
    case 'operations':
      if (f.handover) back('back_capital', '王都へ戻る', 'ノノへの引き継ぎは完了。最終戦の移行が短くなる。');
      else if (f.handover_trial) add('handover_request', 'ノノに完了を報告', '実演結果を伝えると、引き継ぎの準備が完了する。');
      else {
        missing('handover_request', 'handover_request', 'ノノが困る箇所を聞く', '任意の準備。手順書の「いつもの」を一緒に確かめよう。');
        enemy('golem2', '属人化の壁を取り除く', '運用卓で実演する前に、障害を解消しよう。');
        add('handover_trial', 'ノノと手順を実演', '六つの場面を確認する。途中で閉じても確認済みの手順は残る。');
      }
      break;
    case 'tower':
      missing('predecessor_record', 'predecessor_record', '前任者の記録を読む', '残された処理の理由を知ってから、役目を引き継ごう。');
      enemy('scope1', '追加要求を整理する', '回廊の二つの障害を解消すると、切替の門へ進める。');
      enemy('spec2', '変更された仕様を確認', '確定した条件を揃え、切替に余分な問題を持ち込まない。');
      add('to_release', '切替の門へ進む', 'この先で最後の範囲と準備を確認する。まだ引き返せる。');
      break;
    case 'release':
      missing('release_scope', 'release_scope', 'サラと今回の範囲を確認', '追加要求を外す判断と、必ず移す三系統を揃えよう。');
      missing('legacy_voice', 'legacy_voice', '古代機の声を聞く', '引き継ぐ相手が何を守っているか確かめよう。');
      enemy('scope2', '最後の追加要求を整理', '切替前に残った「あと一点」を片付けよう。');
      add('legacy', f.release_complete ? '切替開始の確認へ' : '切替前の照合を始める', f.release_complete ? '開始前に準備一覧が出る。休憩や寄り道を続けることもできる。' : '三系統の記録を六手で照合する。その後で開始するか選べる。');
      break;
  }

  const routeTo = id => {
    const entity = local.find(e => e.id === id);
    return entity ? pathTo(state, entity.x, entity.y) : null;
  };
  for (const candidate of candidates) {
    if (routeTo(candidate.targetId)) return candidate;
    const destination = local.find(e => e.id === candidate.targetId);
    if (!destination) continue;
    // Trace the intended route with hostile symbols removed, then pick its
    // first actually approachable blocker. Never tell the player to tap a wall.
    const blockers = local.filter(e => e.type === 'enemy');
    const cleared = { ...state, defeated: [...state.defeated, ...blockers.map(e => e.id)] };
    const possible = pathTo(cleared, destination.x, destination.y);
    if (possible) for (const tile of possible.path) {
      const blocker = blockers.find(e => e.x === tile.x && e.y === tile.y);
      if (blocker && routeTo(blocker.id)) return { targetId: blocker.id, label: `${blocker.label}を解消する`, reason: `${candidate.label}ための道を、この障害が塞いでいる。` };
    }
  }
  // Safe fallback for old/imported saves with inconsistent flags. Preserve the
  // guarantee that every returned ID is both present and reachable right now.
  for (const entity of [...local.filter(e => e.type === 'exit'), ...local]) {
    if (routeTo(entity.id)) return { targetId: entity.id, label: `${entity.label}へ`, reason: 'ここから移動・調査できる。詳しい状況は手帳でも確認できる。' };
  }
  return null;
}
