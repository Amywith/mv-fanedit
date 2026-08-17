#!/usr/bin/env node
// mv-fanedit CLI 入口
// 用法：npx mv-fanedit <project_dir>

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function run(cmd, cwd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function probeVideo(videoPath) {
  const out = execSync(`ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, { encoding: 'utf8' }).trim();
  const [w, h] = out.split(',').map(Number);
  return { w, h };
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
  fs.mkdirSync(path.join(projectDir, 'outputs'), { recursive: true });

  const mvPath = path.join(projectDir, cfg.mv_path);
  const { w: srcW, h: srcH } = probeVideo(mvPath);
  const cropH = srcH;
  const cropW = Math.round(cropH * 9 / 16);
  console.log(`📐 源视频 ${srcW}x${srcH} → 裁切 ${cropW}x${cropH} (9:16)`);

  // 1. 裁切片段 + 固定关键帧
  console.log('\n📐 [1/4] 裁切竖屏片段 + 固定关键帧...');
  cfg.shots.forEach((s, i) => {
    const dur = s.mv_end - s.mv_start;
    const dst = path.join(rendersDir, `shot${i+1}_fixed.mp4`);
    const vf = `crop=${cropW}:${cropH}:${s.crop_x}:0,scale=1080:1920,setsar=1`;
    execSync(`ffmpeg -y -ss ${s.mv_start} -i "${mvPath}" -t ${dur} -vf "${vf}" -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -pix_fmt yuv420p -an "${dst}"`, { stdio: 'ignore' });
    console.log(`  shot${i+1}: ${s.mv_start}-${s.mv_end}s (${s.label}) crop_x=${s.crop_x}`);
  });

  // 2. 生成 HyperFrames 合成
  console.log('\n🎬 [2/4] 生成 HyperFrames 合成...');
  const composer = require('./references/composer.js');
  composer.main([configPath, projectDir, path.join(projectDir, 'index.html')]);

  // 3. HyperFrames 渲染（内部含 lint/check）
  console.log('\n🎞️ [3/4] HyperFrames 渲染...');
  const outPath = cfg.output || path.join(projectDir, 'outputs', `${path.basename(projectDir)}-final.mp4`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  run(`npx hyperframes render --quality high --output "${outPath}"`, projectDir);

  console.log(`\n✅ 完成！成片：${outPath}`);
}

main();