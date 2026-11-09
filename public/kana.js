// Kana data (Hepburn romaji), in learning order.
// Shared by the browser (window.KANA) and server.js (require).
(function (root) {
  // [hiragana, katakana, romaji]
  const basic = [
    ['あ','ア','a'],['い','イ','i'],['う','ウ','u'],['え','エ','e'],['お','オ','o'],
    ['か','カ','ka'],['き','キ','ki'],['く','ク','ku'],['け','ケ','ke'],['こ','コ','ko'],
    ['さ','サ','sa'],['し','シ','shi'],['す','ス','su'],['せ','セ','se'],['そ','ソ','so'],
    ['た','タ','ta'],['ち','チ','chi'],['つ','ツ','tsu'],['て','テ','te'],['と','ト','to'],
    ['な','ナ','na'],['に','ニ','ni'],['ぬ','ヌ','nu'],['ね','ネ','ne'],['の','ノ','no'],
    ['は','ハ','ha'],['ひ','ヒ','hi'],['ふ','フ','fu'],['へ','ヘ','he'],['ほ','ホ','ho'],
    ['ま','マ','ma'],['み','ミ','mi'],['む','ム','mu'],['め','メ','me'],['も','モ','mo'],
    ['や','ヤ','ya'],['ゆ','ユ','yu'],['よ','ヨ','yo'],
    ['ら','ラ','ra'],['り','リ','ri'],['る','ル','ru'],['れ','レ','re'],['ろ','ロ','ro'],
    ['わ','ワ','wa'],['を','ヲ','wo (o)'],['ん','ン','n'],
  ];
  const dakuten = [
    ['が','ガ','ga'],['ぎ','ギ','gi'],['ぐ','グ','gu'],['げ','ゲ','ge'],['ご','ゴ','go'],
    ['ざ','ザ','za'],['じ','ジ','ji'],['ず','ズ','zu'],['ぜ','ゼ','ze'],['ぞ','ゾ','zo'],
    ['だ','ダ','da'],['ぢ','ヂ','ji (di)'],['づ','ヅ','zu (du)'],['で','デ','de'],['ど','ド','do'],
    ['ば','バ','ba'],['び','ビ','bi'],['ぶ','ブ','bu'],['べ','ベ','be'],['ぼ','ボ','bo'],
    ['ぱ','パ','pa'],['ぴ','ピ','pi'],['ぷ','プ','pu'],['ぺ','ペ','pe'],['ぽ','ポ','po'],
  ];
  const yoon = [
    ['きゃ','キャ','kya'],['きゅ','キュ','kyu'],['きょ','キョ','kyo'],
    ['しゃ','シャ','sha'],['しゅ','シュ','shu'],['しょ','ショ','sho'],
    ['ちゃ','チャ','cha'],['ちゅ','チュ','chu'],['ちょ','チョ','cho'],
    ['にゃ','ニャ','nya'],['にゅ','ニュ','nyu'],['にょ','ニョ','nyo'],
    ['ひゃ','ヒャ','hya'],['ひゅ','ヒュ','hyu'],['ひょ','ヒョ','hyo'],
    ['みゃ','ミャ','mya'],['みゅ','ミュ','myu'],['みょ','ミョ','myo'],
    ['りゃ','リャ','rya'],['りゅ','リュ','ryu'],['りょ','リョ','ryo'],
    ['ぎゃ','ギャ','gya'],['ぎゅ','ギュ','gyu'],['ぎょ','ギョ','gyo'],
    ['じゃ','ジャ','ja'],['じゅ','ジュ','ju'],['じょ','ジョ','jo'],
    ['びゃ','ビャ','bya'],['びゅ','ビュ','byu'],['びょ','ビョ','byo'],
    ['ぴゃ','ピャ','pya'],['ぴゅ','ピュ','pyu'],['ぴょ','ピョ','pyo'],
  ];
  // Katakana-only combinations used for foreign words
  const extendedKatakana = [
    ['ファ','fa'],['フィ','fi'],['フェ','fe'],['フォ','fo'],['ティ','ti'],['ディ','di'],
    ['トゥ','tu'],['ウィ','wi'],['ウェ','we'],['ウォ','wo'],['ヴ','vu'],
    ['シェ','she'],['ジェ','je'],['チェ','che'],
  ];

  const groups = [
    { id: 'basic', label: 'Basic', rows: basic },
    { id: 'dakuten', label: 'Dakuten ゛ / Handakuten ゜', rows: dakuten },
    { id: 'yoon', label: 'Combinations (yōon)', rows: yoon },
  ];

  // Flat card list in learning order: all hiragana first, then katakana.
  function cards() {
    const out = [];
    for (const g of groups) for (const [h, , r] of g.rows) out.push({ kana: h, romaji: r, script: 'Hiragana', group: g.id });
    for (const g of groups) for (const [, k, r] of g.rows) out.push({ kana: k, romaji: r, script: 'Katakana', group: g.id });
    for (const [k, r] of extendedKatakana) out.push({ kana: k, romaji: r, script: 'Katakana', group: 'extended' });
    return out;
  }

  const KANA = { groups, extendedKatakana, cards };
  if (typeof module !== 'undefined' && module.exports) module.exports = KANA;
  else root.KANA = KANA;
})(typeof window !== 'undefined' ? window : globalThis);
