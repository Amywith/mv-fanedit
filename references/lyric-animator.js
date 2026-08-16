// 歌词动画预设库 — 可直接在 composer 中引用
// 所有动画基于 GSAP 3，时间单位：秒

export const LYRIC_PRESETS = {
  // 默认：弹性入场 + 模糊淡入淡出
  'elastic-blur': {
    durIn: 0.6,
    durOut: 0.4,
    in: (el, t) => gsap.fromTo(el, 
      { opacity: 0, y: 40, scale: 0.9, filter: 'blur(8px)' },
      { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.6, ease: 'power2.out' }, t),
    elastic: (el, t) => gsap.fromTo(el, { scale: 1.1 }, { scale: 1, duration: 1.2, ease: 'elastic.out(1, 0.5)' }, t),
    out: (el, t) => gsap.to(el, { opacity: 0, y: -30, scale: 0.95, filter: 'blur(6px)', duration: 0.4, ease: 'power2.in' }, t),
  },

  // 呼吸光晕（高亮副歌句）
  'breathing-glow': {
    // 在 elastic 后接入，按停留时长计算重复次数
    glow: (el, start, hold) => {
      const repeat = Math.max(1, Math.floor(hold / 1.5));
      return gsap.fromTo(el, { scale: 1 }, { scale: 1.05, duration: 1.5, ease: 'sine.inOut', repeat, yoyo: true }, start + 0.6);
    }
  },

  // 打字机逐字显示
  'typewriter': {
    // 需要把歌词拆成单字 span
    chars: (el, text, start, charDur = 0.08) => {
      const chars = text.split('').map((c, i) => 
        `<span style="display:inline-block;opacity:0">${c}</span>`
      ).join('');
      el.innerHTML = chars;
      const spans = el.querySelectorAll('span');
      spans.forEach((sp, i) => {
        gsap.to(sp, { opacity: 1, duration: 0.2, ease: 'power2.out' }, start + i * charDur);
      });
    }
  },

  // 逐字高光（ Karaoke 风格）
  'karaoke': {
    // 歌词按词拆分，每词高亮
    words: (el, words, start, wordDur) => {
      el.innerHTML = words.map(w => `<span class="kw">${w}</span>`).join(' ');
      const spans = el.querySelectorAll('.kw');
      spans.forEach((sp, i) => {
        gsap.to(sp, { color: '#D4A574', fontWeight: 900, textShadow: '0 0 40px rgba(212,165,116,0.8)', duration: 0.3, ease: 'power2.out' }, start + i * wordDur);
        gsap.to(sp, { color: '#fff', fontWeight: 700, textShadow: '0 0 30px rgba(212,165,116,0.6)', duration: 0.3, delay: wordDur - 0.3 }, start + i * wordDur);
      });
    }
  },

  // 从下方滑入 + 缩放
  'slide-scale': {
    in: (el, t) => gsap.fromTo(el, { opacity: 0, y: 60, scale: 0.8 }, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: 'expo.out' }, t),
    out: (el, t) => gsap.to(el, { opacity: 0, y: -40, scale: 0.85, duration: 0.3, ease: 'expo.in' }, t),
  },

  // 纯淡入淡出（极简）
  'fade': {
    in: (el, t) => gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power2.out' }, t),
    out: (el, t) => gsap.to(el, { opacity: 0, duration: 0.3, ease: 'power2.in' }, t),
  }
};

// 辅助：把时间轴上的动画加到 timeline
export function addLyricAnimation(tl, el, preset, start, end, options = {}) {
  const p = LYRIC_PRESETS[preset];
  if (!p) throw new Error(`Unknown preset: ${preset}`);
  
  const durIn = options.durIn || 0.6;
  const durOut = options.durOut || 0.4;
  const hold = end - start - durIn - durOut;
  
  if (p.in) p.in(el, start);
  if (p.elastic) p.elastic(el, start);
  if (p.glow && options.highlight) p.glow(el, start + durIn, hold);
  if (p.out) p.out(el, end - durOut);
  
  return tl;
}