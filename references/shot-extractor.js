// 从 MV 按分镜时间码裁切竖屏片段 + 固定关键帧
// 用法：node shot-extractor.js <config.json> [projectDir]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function probeVideo(videoPath) {
  const out = execSync(`ffprobe -v quiet -show_entries stream=width,height -of csv=p=0 "${videoPath}"`, { encoding: 'utf8' }).trim();
  const [w, h] = out.split(',').map(Number);
  return { w, h };
}

function cropVertical(src, dst, start, duration, cropX, srcW, srcH) {
  const cropH = srcH;
  const cropW = Math.round(cropH * 9 / 16);
  const vf = `crop=${cropW}:${cropH}:${cropX}:0,scale=1080:1920,setsar=1`;
  const cmd = `ffmpeg -y -ss ${start} -i "${src}" -t ${duration} -vf "${vf}" -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -pix_fmt yuv420p -an "${dst}"`;
  execSync(cmd, { stdio: 'ignore' });
}

function main() {
  const configPath = process.argv[2];
  const projectDir = process.argv[3] || path.dirname(configPath);
  if (!configPath) {
    console.error('Usage: node shot-extractor.js <config.json> [projectDir]');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const rendersDir = path.join(projectDir, 'renders');
  fs.mkdirSync(rendersDir, { recursive: true });

  const mvPath = path.join(projectDir, cfg.mv_path);
  const { w: srcW, h: srcH } = probeVideo(mvPath);
  const cropH = srcH;
  const cropW = Math.round(cropH * 9 / 16);
  console.log(`📐 源视频 ${srcW}x${srcH} → 裁切 ${cropW}x${cropH} (9:16)`);

  cfg.shots.forEach((s, i) => {
    const dur = s.mv_end - s.mv_start;
    const dst = path.join(rendersDir, `shot${i+1}_fixed.mp4`);
    console.log(`  shot${i+1}: ${s.mv_start}-${s.mv_end}s (${s.label}) crop_x=${s.crop_x}`);
    const vf = `crop=${cropW}:${cropH}:${s.crop_x}:0,scale=1080:1920,setsar=1`;
    execSync(`ffmpeg -y -ss ${s.mv_start} -i "${mvPath}" -t ${dur} -vf "${vf}" -c:v libx264 -r 30 -g 30 -keyint_min 30 -movflags +faststart -pix_fmt yuv420p -an "${dst}"`, { stdio: 'ignore' });
  });
  console.log('✅ 所有片段裁切完成 →', rendersDir);
}

main();