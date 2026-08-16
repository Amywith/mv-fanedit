// 从 MV 按分镜时间码裁切竖屏片段
// 用法：node shot-extractor.js <config.json> [output_dir]

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function cropVertical(src, dst, start, duration, cropX) {
  // 3840x2160 -> 竖屏 1080x1920，裁切宽=1215(=2160*9/16)
  const cropW = 1215;
  const cropH = 2160;
  const vf = `crop=${cropW}:${cropH}:${cropX}:0,scale=1080:1920,setsar=1`;
  const cmd = `ffmpeg -y -ss ${start} -i "${src}" -t ${duration} -vf "${vf}" -c:v libx264 -pix_fmt yuv420p -an "${dst}"`;
  execSync(cmd, { stdio: 'ignore' });
}

function main() {
  const configPath = process.argv[2];
  const outDir = process.argv[3] || 'renders';
  if (!configPath) {
    console.error('Usage: node shot-extractor.js <config.json> [output_dir]');
    process.exit(1);
  }
  const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  fs.mkdirSync(outDir, { recursive: true });

  cfg.shots.forEach((shot, i) => {
    const dur = shot.mv_end - shot.mv_start;
    const dst = path.join(outDir, `shot${i+1}.mp4`);
    console.log(`[${i+1}/${cfg.shots.length}] ${shot.label}  ${shot.mv_start}-${shot.mv_end}s  crop_x=${shot.crop_x}`);
    cropVertical(cfg.mv_path, dst, shot.mv_start, dur, shot.crop_x);
  });
  console.log('✅ 所有片段裁切完成 →', outDir);
}

main();