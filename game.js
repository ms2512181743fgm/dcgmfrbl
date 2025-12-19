// -------------------------
// パラメータ設定
// -------------------------
const MAX_PLAYER_HP = 8054;
const MAX_ENEMY_HP  = 9358;

const MAX_PLAYER_MP = 100;
const MAGIC_COST    = 25;
const MP_GAIN_ON_ATTACK = 12;

// 敵MP（ためてから全部使う）
const MAX_ENEMY_MP = 100;

// プレイヤー攻撃
const PLAYER_PHYS_MIN = 360;
const PLAYER_PHYS_MAX = 460;

const PLAYER_MAGIC_MIN = 620;
const PLAYER_MAGIC_MAX = 740;
const MAGIC_CRIT_MULTIPLIER = 2.0; // 強攻撃直後に奥義でクリティカル

// 敵攻撃
const ENEMY_PHYS_MIN = 420;
const ENEMY_PHYS_MAX = 560;

const ENEMY_STRONG_MIN = 2300;
const ENEMY_STRONG_MAX = 2700;
const ENEMY_CHARGE_RATE = 0.22; // 力をためる確率
const STRONG_DEFEND_REDUCTION = 0.25; // 防御時ダメージ1/4

// -------------------------
// ゲーム状態
// -------------------------
let playerHP, enemyHP, playerMP, enemyMP;
let isPlayerTurn = true;
let playerDefending = false;

let enemyCharging = false;              // 力をためているか
let magicCriticalTurn = false;          // 強攻撃直後のターンで奥義クリティカル

let gameOver = false;

// -------------------------
// DOM取得
// -------------------------
const battleField   = document.getElementById("battle-field");
const enemySprite   = document.getElementById("enemy-sprite");
const effectDiv     = document.getElementById("effect");
const effectImg     = document.getElementById("effect-img");
const messageArea   = document.getElementById("message-area");
const youWinDiv     = document.getElementById("you-win");

const playerHpBar   = document.getElementById("player-hp-bar");
const playerMpBar   = document.getElementById("player-mp-bar");
const enemyHpBar    = document.getElementById("enemy-hp-bar");

const playerHpText  = document.getElementById("player-hp-text");
const playerMpText  = document.getElementById("player-mp-text");
const enemyHpText   = document.getElementById("enemy-hp-text");

const btnAttack  = document.getElementById("btn-attack");
const btnMagic   = document.getElementById("btn-magic");
const btnDefend  = document.getElementById("btn-defend");
const btnRestart = document.getElementById("restart-btn");

// -------------------------
// ユーティリティ
// -------------------------
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function setMessage(text, append = false) {
  if (append) {
    messageArea.textContent += "\n" + text;
  } else {
    messageArea.textContent = text;
  }
}

function updateStatus() {
  // 値を0未満にしない
  playerHP = Math.max(0, playerHP);
  playerMP = Math.max(0, playerMP);
  enemyHP  = Math.max(0, enemyHP);
  enemyMP  = Math.max(0, enemyMP);

  // HP, MPバー
  playerHpBar.style.width = (playerHP / MAX_PLAYER_HP * 100) + "%";
  playerMpBar.style.width = (playerMP / MAX_PLAYER_MP * 100) + "%";
  enemyHpBar.style.width  = (enemyHP  / MAX_ENEMY_HP * 100) + "%";

  // 数値表示
  playerHpText.textContent = `HP: ${playerHP} / ${MAX_PLAYER_HP}`;
  playerMpText.textContent = `MP: ${playerMP} / ${MAX_PLAYER_MP}`;
  enemyHpText.textContent  = `HP: ${enemyHP} / ${MAX_ENEMY_HP}`;
}

// あなた側の攻撃エフェクトのみ使用
function showEffect(type) {
  if (type === "phys") {
    effectImg.src = "ec_buturi.png";
  } else if (type === "magic") {
    effectImg.src = "ec_mahou.png";
  } else {
    effectImg.src = "ec_buturi.png";
  }
  effectDiv.style.display = "block";
  effectDiv.classList.remove("flash");
  void effectDiv.offsetWidth; // アニメーションリセット用
  effectDiv.classList.add("flash");

  setTimeout(() => {
    effectDiv.style.display = "none";
  }, 400);
}

function changeEnemySprite(tempSprite, duration = 400) {
  const original = "tk_tuujou.png";
  enemySprite.src = tempSprite;
  enemySprite.classList.remove("shake");
  void enemySprite.offsetWidth;
  enemySprite.classList.add("shake");

  setTimeout(() => {
    enemySprite.classList.remove("shake");
    enemySprite.src = original;
  }, duration);
}

function setButtonsEnabled(enabled) {
  btnAttack.disabled = !enabled;
  btnMagic.disabled  = !enabled || playerMP < MAGIC_COST; // MP不足なら奥義不可
  btnDefend.disabled = !enabled;
}

// 画面揺れ（あなたがダメージを受けた時）
function shakeScreen() {
  battleField.classList.remove("screen-shake");
  void battleField.offsetWidth;
  battleField.classList.add("screen-shake");
  setTimeout(() => {
    battleField.classList.remove("screen-shake");
  }, 400);
}

// -------------------------
// バトルロジック
// -------------------------
function checkBattleEnd() {
  if (playerHP <= 0 && enemyHP <= 0) {
    setMessage("相打ちになってしまった……。\n酔ったオーナーの勝利だ。");
    enemySprite.src = "tk_shori.png";
    gameOver = true;
  } else if (enemyHP <= 0) {
    setMessage("酔ったオーナーを倒した！\nあなたの勝利だ！");
    enemySprite.src = "tk_haiboku.jpg";  // 敵敗北画像

    // YOU WIN 表示
    youWinDiv.style.display = "block";

    gameOver = true;
  } else if (playerHP <= 0) {
    setMessage("あなたは倒れてしまった……。\n酔ったオーナーの勝利だ。");
    enemySprite.src = "tk_shori.png";
    gameOver = true;
  }

  if (gameOver) {
    setButtonsEnabled(false);
    btnRestart.style.display = "block";
    return true;
  }
  return false;
}

// -------------------------
// あなたのターン
// -------------------------
function playerTurnAttack() {
  if (gameOver || !isPlayerTurn) return;
  setButtonsEnabled(false);
  playerDefending = false;

  const damage = randInt(PLAYER_PHYS_MIN, PLAYER_PHYS_MAX);
  enemyHP -= damage;
  showEffect("phys"); // あなた側だけエフェクト使用
  changeEnemySprite("tk_hidame.png", 400);

  // MP回復（攻撃でMPをためる）
  const oldMP = playerMP;
  playerMP = Math.min(MAX_PLAYER_MP, playerMP + MP_GAIN_ON_ATTACK);

  let msg = `あなたの攻撃！\n酔ったオーナーに ${damage} のダメージ！`;
  if (playerMP > oldMP) {
    msg += `\nMPが ${playerMP - oldMP} 回復した。`;
  }
  setMessage(msg);
  updateStatus();

  if (checkBattleEnd()) return;

  setTimeout(enemyTurn, 700);
}

function playerTurnMagic() {
  if (gameOver || !isPlayerTurn) return;
  if (playerMP < MAGIC_COST) {
    setMessage("MPが足りない……！");
    return;
  }
  setButtonsEnabled(false);
  playerDefending = false;

  playerMP -= MAGIC_COST;
  let damage = randInt(PLAYER_MAGIC_MIN, PLAYER_MAGIC_MAX);
  let isCrit = false;

  // 酔ったオーナーの強攻撃直後のターン限定で、奥義クリティカル（ダメージ倍）
  if (magicCriticalTurn) {
    damage = Math.floor(damage * MAGIC_CRIT_MULTIPLIER);
    isCrit = true;
    magicCriticalTurn = false;
  }

  enemyHP -= damage;
  showEffect("magic");
  changeEnemySprite("tk_hidame.png", 400);

  let msg = `あなたの奥義！\n敵に ${damage} のダメージ！`;
  if (isCrit) {
    msg += "\nクリティカルヒット！ 強攻撃の隙をついた！";
  }
  setMessage(msg);
  updateStatus();

  if (checkBattleEnd()) return;

  setTimeout(enemyTurn, 700);
}

function playerTurnDefend() {
  if (gameOver || !isPlayerTurn) return;
  setButtonsEnabled(false);
  playerDefending = true;

  setMessage("あなたは身を守っている……。\n次の攻撃に備える。");
  updateStatus();

  setTimeout(enemyTurn, 700);
}

// -------------------------
// 敵のターン
// -------------------------
function enemyTurn() {
  if (gameOver) return;
  isPlayerTurn = false;

  // すでに力をためている場合は、MPを全て使った強攻撃
  if (enemyCharging) {
    enemyCharging = false;
    enemyStrongAttack();
    return;
  }

  // ランダムで、「力をためる」か通常攻撃
  const r = Math.random();
  if (r < ENEMY_CHARGE_RATE) {
    enemyCharge();
  } else {
    enemyNormalAttack();
  }
}

function enemyCharge() {
  if (gameOver) return;
  enemyCharging = true;
  playerDefending = false; // あなたの防御はターン経過でリセット

  // 力をためる＝敵MPを最大までためるイメージ
  enemyMP = MAX_ENEMY_MP;

  enemySprite.src = "tk_kougeki.png";
  setMessage("酔ったオーナーは力をためている……！\n次のターンの攻撃が危険そうだ。");
  updateStatus();

  setTimeout(() => {
    enemySprite.src = "tk_tuujou.png";
    isPlayerTurn = true;
    if (!gameOver) {
      setButtonsEnabled(true);
    }
  }, 700);
}

function enemyNormalAttack() {
  if (gameOver) return;

  const damage = randInt(ENEMY_PHYS_MIN, ENEMY_PHYS_MAX);

  // 防御状態かどうかを先に判定してからダメージを与える
  const wasDefending = playerDefending;
  playerDefending = false;

  playerHP -= damage;

  changeEnemySprite("tk_kougeki.png", 250);

  setMessage(`酔ったオーナーの攻撃！\nあなたは ${damage} のダメージを受けた！`);
  updateStatus();

  // あなたが攻撃を受けたので画面を揺らす
  shakeScreen();

  // 通常攻撃：防御していない場合のみ白フラッシュ
  if (!wasDefending) {
    battleField.classList.add("flash-white");
    setTimeout(() => {
      battleField.classList.remove("flash-white");
    }, 300);
  }

  if (checkBattleEnd()) return;

  setTimeout(() => {
    isPlayerTurn = true;
    if (!gameOver) {
      setButtonsEnabled(true);
    }
  }, 700);
}

function enemyStrongAttack() {
  if (gameOver) return;

  changeEnemySprite("tk_kougeki.png", 400);

  // MPを全て解放して強攻撃
  const mpUsed = enemyMP;
  enemyMP = 0;

  let damage = randInt(ENEMY_STRONG_MIN, ENEMY_STRONG_MAX);

  // MPに応じて少し上乗せ（演出として）
  damage += Math.floor(mpUsed * 3);

  const wasDefending = playerDefending;

  if (wasDefending) {
    damage = Math.floor(damage * STRONG_DEFEND_REDUCTION);
  }

  playerHP -= damage;

  // 強攻撃のフラッシュ演出
  if (wasDefending) {
    battleField.classList.add("flash-black");
    setTimeout(() => {
      battleField.classList.remove("flash-black");
    }, 400);
  } else {
    battleField.classList.add("flash-red");
    setTimeout(() => {
      battleField.classList.remove("flash-red");
    }, 400);
  }

  let msg = "酔ったオーナーの強烈な奥義！！\n";
  if (wasDefending) {
    msg += `身を守っていたおかげで、ダメージは抑えられた。\nあなたは ${damage} のダメージを受けた！`;
  } else {
    msg += `防御していなかった……。\nあなたは ${damage} の大ダメージを受けた！`;
  }

  setMessage(msg);
  updateStatus();

  // あなたが攻撃を受けたので画面を揺らす
  shakeScreen();

  // この後の「あなたの奥義」はクリティカル
  magicCriticalTurn = true;
  playerDefending = false;

  if (checkBattleEnd()) return;

  setTimeout(() => {
    isPlayerTurn = true;
    if (!gameOver) {
      setButtonsEnabled(true);
    }
  }, 900);
}

// -------------------------
// 初期化
// -------------------------
function initBattle() {
  playerHP = MAX_PLAYER_HP;
  enemyHP  = MAX_ENEMY_HP;
  playerMP = MAX_PLAYER_MP;
  enemyMP  = MAX_ENEMY_MP;

  isPlayerTurn = true;
  playerDefending = false;
  enemyCharging = false;
  magicCriticalTurn = false;
  gameOver = false;

  enemySprite.src = "tk_tuujou.png";
  youWinDiv.style.display = "none";
  btnRestart.style.display = "none";
  setButtonsEnabled(true);

  setMessage(
  "酔ったオーナーがあらわれた！\n" +
  "・攻撃でMPをためながら戦う。\n" +
  "・酔ったオーナーが力をためた次のターンは超強力な攻撃！\n" +
  "・その攻撃の直後、あなたの奥義はクリティカルになる。"
　);
  updateStatus();
}

// -------------------------
// イベント
// -------------------------
btnAttack.addEventListener("click", playerTurnAttack);
btnMagic.addEventListener("click", playerTurnMagic);
btnDefend.addEventListener("click", playerTurnDefend);
btnRestart.addEventListener("click", initBattle);

// ゲーム開始
initBattle();

