#!/usr/bin/env node
// mv-fanedit 入口
// 用法：npx mv-fanedit <project_dir>

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function main() {
  const projectDir = process.argv[2];
  if (!projectDir) {
    console.error('用法: npx mv-fanedit <project_dir>');
    process.exit(1);
  }

  const configPath = path.join(projectDir, 'config.json');
  if (!fs.existsSync(configPath)) {
    console.error('❌ 缺少 config.json');
    process.exit(1);
  }

  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const rendersDir = path.join(projectDir, 'renders');
  fs.mkdirSync(rendersDir, { recursive: true });

  // 1. 裁切片段
  console.log('\n📐 [1/4] 裁切竖屏片段...');
  cfg.shots.forEach((s, i) => {
    const dur = s.mv_end - s.mv_start;
    const dst = path.join(rendersDir, `shot${i+1}.mp4`);
    const cropW = 1215, cropH = 2160;
    const vf = `crop=${cropW}:${cropH}:${s.crop_x}:0,scale=1080:1920,setsar=1`;
    execSync(`ffmpeg -y -ss ${s.mv_start} -i "${cfg.mv_path}" -t ${dur} -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -an "${dst}"`, { stdio: 'ignore' });
    console.log(`  shot${i+1}: ${s.mv_start}-${s.mv_end}s (${s.label}) crop_x=${s.crop_x}`);
  });

  // 2. 生成 HyperFrames 合成
  console.log('\n🎬 [2/4] 生成 HyperFrames 合成...');
  const shots = cfg.shots.map((s, i) => ({
    start: s.start || (i === 0 ? 0 : cfg.shots[i-1].end),
    end: s.end || (i === cfg.shots.length-1 ? cfg.canvas.dur : cfg.shots[i+1].start),
    dur: (s.end || (i === cfg.shots.length-1 ? cfg.canvas.dur : cfg.shots[i+1].start)) - (s.start || (i === 0 ? 0 : cfg.shots[i-1].end))
  }));

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
video.clip { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0; }
video.clip.active { opacity:1; }
.vignette { position:absolute; inset:0; background:radial-gradient(ellipse at center,transparent 50%,rgba(0,0,0,0.6) 100%); z-index:10; }
.lyric-gradient { position:absolute; bottom:0; left:0; right:0; height:600px; background:linear-gradient(to top,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.4) 60%,transparent 100%); z-index:15; }
.lyrics-container { position:absolute; bottom:250px; left:80px; right:80px; z-index:20; text-align:center; }
.lyric-line { position:absolute; bottom:0; left:0; right:0; font-size:72px; font-weight:700; color:#fff; text-shadow:0 0 30px rgba(212,165,116,0.6),0 0 60px rgba(212,165,116,0.3),0 2px 4px rgba(0,0,0,0.8); line-height:1.4; letter-spacing:6px; opacity:0; }
.credit { position:absolute; bottom:150px; left:0; right:0; text-align:center; font-size:36px; color:rgba(255,255,255,0.5); z-index:20; opacity:0; transform:translateY(20px); letter-spacing:10px; }
</style>
</head>
<body>
<div id="composition" data-composition-id="{CID}" data-width="{WIDTH}" data-height="{HEIGHT}" data-duration="{DUR}" data-start="0">
{VIDEO_TAGS}
  <audio id="bgm" class="clip" data-track-index="1" data-start="0" data-duration="{DUR}" src="{AUDIO_SRC}"></audio>
  <div class="vignette"></div>
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

const videos = [
{VIDEO_SWITCH_ARRAY}
];

// 视频切换
{VIDEO_SWITCH_JS}

// 歌词动画
{LYRIC_ANIM_JS}

// 署名
tl.to(document.getElementById('credit'), { opacity: 1, y: 0, duration: 1, ease: 'power2.out' }, {CREDIT_TIME});

// 占位保证时长
tl.to({}, { duration: 0.1 }, {DUR});

window.__timelines["{CID}"] = tl;

gsap.set('.lyric-line', { opacity: 0, y: 40, scale: 0.9, filter: 'blur(8px)' });
gsap.set(document.getElementById('credit'), { opacity: 0, y: 20 });
videos.forEach(v => v.el.load());
document.getElementById('bgm').load();
</script>
</body>
</html>`;

  const videoTags = shots.map((s, i) => 
    `  <video id="v${i+1}" muted playsinline class="clip" data-track-index="0" data-start="${s.start}" data-duration="${s.dur}" src="renders/shot${i+1}.mp4"></video>`
  ).join('\n');

  const lyricTags = cfg.lyrics.map((l, i) => 
    `    <div class="lyric-line" id="l${i+1}">${l.text.replace(/&/g,'&').replace(/</g,'<').replace(/>/g,'>')}</div>`
  ).join('\n');

  const videoSwitchArray = shots.map((s, i) => `  { el: v${i+1}, start: ${s.start} }`).join(',\n');

  const videoSwitchJS = shots.map((s, i) => 
    `tl.add(() => { videos.forEach(vv => vv.el.classList.remove('active')); v${i+1}.classList.add('active'); v${i+1}.currentTime = 0; v${i+1}.play().catch(()=>{}); }, ${s.start});`
  ).join('\n');

  const durIn = 0.6, durOut = 0.4;
  const lyricAnimJS = cfg.lyrics.map((l, i) => {
    const hold = l.end - l.start - durIn - durOut;
    const repeatCount = l.highlight ? Math.max(1, Math.floor(hold / 1.5)) : 0;
    let js = `  // ${l.text}\n`;
    js += `  tl.fromTo(l${i+1}, \n`;
    js += `    { opacity: 0, y: 40, scale: 0.9, filter: 'blur(8px)' },\n`;
    js += `    { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: ${durIn}, ease: 'power2.out' },\n`;
    js += `    ${l.start}\n  );\n`;
    js += `  tl.fromTo(l${i+1}, { scale: 1.1 }, { scale: 1, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, ${l.start});\n`;
    if (l.highlight && repeatCount > 0) {
      js += `  tl.fromTo(l${i+1}, { scale: 1 }, { scale: 1.05, duration: 1.5, ease: 'sine.inOut', repeat: ${repeatCount}, yoyo: true }, ${l.start + durIn});\n`;
    }
    js += `  tl.to(l${i+1}, { opacity: 0, y: -30, scale: 0.95, filter: 'blur(6px)', duration: ${durOut}, ease: 'power2.in' }, ${l.end - durOut});\n`;
    return js;
  }).join('\n');

  const html = HTML_TEMPLATE
    .replace(/\{WIDTH\}/g, cfg.canvas.w)
    .replace(/\{HEIGHT\}/g, cfg.canvas.h)
    .replace(/\{DUR\}/g, cfg.canvas.dur)
    .replace(/\{CID\}/g, path.basename(projectDir))
    .replace(/\{AUDIO_SRC\}/g, cfg.audio_path)
    .replace('{VIDEO_TAGS}', videoTags)
    .replace('{LYRIC_TAGS}', lyricTags)
    .replace('{VIDEO_SWITCH_ARRAY}', videoSwitchArray)
    .replace('{VIDEO_SWITCH_JS}', videoSwitchJS)
    .replace('{LYRIC_ANIM_JS}', lyricAnimJS)
    .replace('{CREDIT_TIME}', cfg.canvas.dur - 3);

  const indexPath = path.join(projectDir, 'index.html');
  fs.writeFileSync(indexPath, html);
  console.log('✅ index.html 已生成');

  // 3. HyperFrames lint + check
  console.log('\n🔍 [3/4] HyperFrames lint + check...');
  run('npx hyperframes lint', projectDir);
  run('npx hyperframes check', projectDir);

  // 4. Render
  console.log('\n🎞️ [4/4] 渲染最终视频...');
  const outPath = cfg.output || path.join(projectDir, 'outputs', `${path.basename(projectDir)}-final.mp4`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  run(`npx hyperframes render --quality high --output "${outPath}"`, projectDir);

  console.log(`\n✅ 完成！成片：${outPath}`);
}

main();