// 生成 HyperFrames 合成 HTML + GSAP Timeline
// 用法：node composer.js <config.json> [projectDir] [output.html]

const fs = require('fs');
const path = require('path');

const HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width={WIDTH}, initial-scale=1">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
@font-face { font-family: 'KaiTi'; src: local('KaiTi'), local('STKaiti'); }
body { width:{WIDTH}px; height:{HEIGHT}px; overflow:hidden; background:#000; font-family:'KaiTi','Inter',sans-serif; position:relative; }
#composition { width:100%; height:100%; }
video.clip { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }

.vignette { position:absolute; inset:0; background:radial-gradient(ellipse 80% 60% at 50% 40%,transparent 0%,rgba(0,0,0,0.35) 55%,rgba(0,0,0,0.85) 100%); z-index:10; }
.lyric-gradient { position:absolute; bottom:0; left:0; right:0; height:55%; background:linear-gradient(to top,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.6) 25%,rgba(0,0,0,0.2) 55%,transparent 100%); z-index:15; pointer-events:none; }
.top-gradient { position:absolute; top:0; left:0; right:0; height:30%; background:linear-gradient(to bottom,rgba(0,0,0,0.45) 0%,transparent 100%); z-index:12; pointer-events:none; }
.lyrics-container { position:absolute; bottom:220px; left:60px; right:60px; z-index:20; text-align:center; }
.lyric-line { position:absolute; bottom:0; left:0; right:0; font-size:72px; font-weight:700; color:#fff; text-shadow:0 0 2px rgba(0,0,0,0.9),0 0 8px rgba(212,165,116,0.6),0 0 18px rgba(212,165,116,0.4),0 0 32px rgba(212,165,116,0.25); line-height:1.35; letter-spacing:4px; opacity:0; }
.credit { position:absolute; bottom:130px; left:0; right:0; text-align:center; font-size:32px; color:rgba(212,165,116,0.7); z-index:20; opacity:0; transform:translateY(25px); letter-spacing:12px; font-weight:300; }
.lyric-line.highlight { text-shadow:0 0 2px rgba(0,0,0,0.95),0 0 10px rgba(212,165,116,0.9),0 0 24px rgba(212,165,116,0.6),0 0 48px rgba(212,165,116,0.35); }
</style>
</head>
<body>
<div id="composition" data-composition-id="{CID}" data-width="{WIDTH}" data-height="{HEIGHT}" data-duration="{DUR}" data-start="0">
{VIDEO_TAGS}
  <audio id="bgm" class="clip" data-track-index="1" data-start="0" data-duration="{DUR}" src="{AUDIO_SRC}"></audio>
  <div class="vignette"></div>
  <div class="top-gradient"></div>
  <div class="lyric-gradient"></div>
  <div class="lyrics-container">
{LYRIC_TAGS}
  </div>
  <div class="credit" id="credit">致每一场认真的演唱</div>
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script>
window.__timelines = window.__timelines || {};

const tl = gsap.timeline({ paused: true });

const durIn = 0.55, durOut = 0.35;

function addLyric(el, start, end, highlight) {
  const hold = end - start - durIn - durOut;
  const repeatCount = highlight ? Math.max(1, Math.floor(hold / 1.4)) : 0;
  
  tl.fromTo(el, 
    { opacity: 0, y: 55, scale: 0.88, filter: 'blur(12px)' },
    { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: durIn, ease: 'power3.out' },
    start
  );
  tl.fromTo(el, { scale: 1.08 }, { scale: 1, duration: 1.1, ease: 'elastic.out(1, 0.45)' }, start);
  if (highlight) {
    const hold = end - start - durIn - durOut;
    const repeatCount = Math.max(1, Math.floor(hold / 1.4));
    tl.fromTo(el, { scale: 1 }, { scale: 1.04, duration: 1.4, ease: 'sine.inOut', repeat: repeatCount, yoyo: true }, start + durIn);
  }
  tl.to(el, { opacity: 0, y: -35, scale: 0.93, filter: 'blur(8px)', duration: durOut, ease: 'power3.in' }, end - durOut);
}

{LYRIC_ANIM_JS}

// 署名
tl.to(credit, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, {DUR} - 3);
tl.to({}, { duration: 0.1 }, {DUR});

window.__timelines["{CID}"] = tl;

gsap.set('.lyric-line', { opacity: 0, y: 55, scale: 0.88, filter: 'blur(12px)' });
gsap.set(credit, { opacity: 0, y: 25 });
document.querySelectorAll('video.clip').forEach(v => v.load());
document.getElementById('bgm').load();
</script>
</body>
</html>`;

function generateVideoTags(shots, dur) {
  return shots.map((s, i) => {
    const start = s.start !== undefined ? s.start : (i === 0 ? 0 : shots[i-1].end);
    const end = s.end !== undefined ? s.end : (i === shots.length-1 ? dur : shots[i+1].start);
    return `  <video id="v${i+1}" muted playsinline class="clip" data-track-index="0" data-start="${start}" data-duration="${end-start}" src="renders/shot${i+1}_fixed.mp4"></video>`;
  }).join('\n');
}

function generateLyricTags(lyrics) {
  return lyrics.map((l, i) => 
    `    <div class="lyric-line${l.highlight ? ' highlight' : ''}" id="l${i+1}">${escapeHtml(l.text)}</div>`
  ).join('\n');
}

function generateLyricAnimJS(lyrics) {
  return lyrics.map((l, i) => 
    `addLyric(l${i+1}, ${l.start}, ${l.end}, ${l.highlight});`
  ).join('\n');
}

function escapeHtml(s) {
  return s.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>');
}

function main() {
  const configPath = process.argv[2];
  const projectDir = process.argv[3] || path.dirname(configPath);
  const outPath = process.argv[4] || path.join(projectDir, 'index.html');
  if (!configPath) {
    console.error('Usage: node composer.js <config.json> [projectDir] [output.html]');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const html = HTML_TEMPLATE
    .replace(/\{WIDTH\}/g, cfg.canvas.w)
    .replace(/\{HEIGHT\}/g, cfg.canvas.h)
    .replace(/\{DUR\}/g, cfg.canvas.dur)
    .replace(/\{CID\}/g, path.basename(projectDir))
    .replace(/\{AUDIO_SRC\}/g, cfg.audio_path)
    .replace('{VIDEO_TAGS}', generateVideoTags(cfg.shots, cfg.canvas.dur))
    .replace('{LYRIC_TAGS}', generateLyricTags(cfg.lyrics))
    .replace('{LYRIC_ANIM_JS}', generateLyricAnimJS(cfg.lyrics))
    .replace(/\{CID\}/g, path.basename(projectDir));

  fs.writeFileSync(outPath, html);
  console.log('✅ HyperFrames 合成写入 →', outPath);
}

main();