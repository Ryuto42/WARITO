// ybouane/liquidglass のベベル屈折モデルを SVG 変位マップで再現する。
// backdrop-filter: url() は Chromium 系（Chrome / Android WebView）しか描画しないため他は従来のぼかしのみ
const SVG_NS = 'http://www.w3.org/2000/svg';

const supportsRefraction = () => {
  const ua = navigator.userAgent;
  return /Chrome\/|Chromium\//.test(ua) && !/iPhone|iPad|iPod/.test(ua);
};

const roundedRectSdf = (x: number, y: number, hw: number, hh: number, r: number) => {
  const qx = Math.abs(x) - hw + r;
  const qy = Math.abs(y) - hh + r;
  return Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r;
};

const buildMap = (w: number, h: number, radius: number) => {
  const hw = w / 2;
  const hh = h / 2;
  const r = Math.min(radius, hw, hh);
  const zR = Math.max(6, Math.min(hh, hw) * 0.75);
  const maxDisp = zR * 0.42;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(w, h);

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const x = px + 0.5 - hw;
      const y = py + 0.5 - hh;
      const sdf = roundedRectSdf(x, y, hw, hh, r);
      let dx = 0;
      let dy = 0;
      const d = -sdf;
      if (d > 0) {
        if (d < zR) {
          const gx = roundedRectSdf(x + 0.5, y, hw, hh, r) - roundedRectSdf(x - 0.5, y, hw, hh, r);
          const gy = roundedRectSdf(x, y + 0.5, hw, hh, r) - roundedRectSdf(x, y - 0.5, hw, hh, r);
          const len = Math.hypot(gx, gy) || 1;
          const k = maxDisp * Math.pow(1 - d / zR, 1.6);
          dx -= (gx / len) * k;
          dy -= (gy / len) * k;
        }
        const depth = Math.min(d, zR) / zR;
        dx -= (x / hw) * depth * 2;
        dy -= (y / hh) * depth * 2;
      }
      const i = (py * w + px) * 4;
      img.data[i] = 128 + (dx / maxDisp) * 127;
      img.data[i + 1] = 128 + (dy / maxDisp) * 127;
      img.data[i + 2] = 128;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return { url: canvas.toDataURL(), scale: maxDisp * 2 };
};

const channel = (id: string, c: 'r' | 'g' | 'b', scale: number) => `
  <feDisplacementMap in="SourceGraphic" in2="map" scale="${scale}" xChannelSelector="R" yChannelSelector="G" result="d${c}"/>
  <feColorMatrix in="d${c}" type="matrix" values="${c === 'r' ? '1 0 0 0 0' : '0 0 0 0 0'} ${c === 'g' ? '0 1 0 0 0' : '0 0 0 0 0'} ${c === 'b' ? '0 0 1 0 0' : '0 0 0 0 0'} 0 0 0 1 0" result="${id}${c}"/>`;

export const initLiquidRefraction = () => {
  if (typeof window === 'undefined' || !supportsRefraction()) return () => {};

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  document.body.appendChild(svg);

  const ids = new WeakMap<HTMLElement, string>();
  const sizes = new WeakMap<HTMLElement, string>();
  let seq = 0;

  const update = (el: HTMLElement) => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w || !h) return;
    const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    const key = `${w}x${h}x${radius}`;
    if (sizes.get(el) === key) return;
    sizes.set(el, key);

    let id = ids.get(el);
    if (!id) {
      id = `lg-refract-${++seq}`;
      ids.set(el, id);
    }
    const { url, scale } = buildMap(w, h, radius);
    // 色収差: チャンネルごとに屈折量をわずかにずらす（chromAberration 0.05 相当）
    const markup = `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
      <feImage href="${url}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>
      ${channel(id, 'r', scale * 1.04)}${channel(id, 'g', scale)}${channel(id, 'b', scale * 0.96)}
      <feBlend in="${id}r" in2="${id}g" mode="screen" result="rg"/>
      <feBlend in="rg" in2="${id}b" mode="screen"/>
    </filter>`;
    svg.querySelector(`#${id}`)?.remove();
    svg.insertAdjacentHTML('beforeend', markup);
    el.style.setProperty('--lg-refract', `url(#${id})`);
  };

  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((e) => update(e.target as HTMLElement));
  });
  const tracked = new Set<HTMLElement>();
  const scan = () => {
    document.querySelectorAll<HTMLElement>('.liquid-glass').forEach((el) => {
      if (tracked.has(el)) return;
      tracked.add(el);
      resizeObserver.observe(el);
      update(el);
    });
    tracked.forEach((el) => {
      if (el.isConnected) return;
      tracked.delete(el);
      resizeObserver.unobserve(el);
      const id = ids.get(el);
      if (id) svg.querySelector(`#${id}`)?.remove();
    });
  };

  // 屈折で背景が読めるようにぼかしを弱める
  document.documentElement.style.setProperty('--lg-blur-k', '0.3');
  scan();
  const mutationObserver = new MutationObserver(scan);
  mutationObserver.observe(document.body, { childList: true, subtree: true });

  return () => {
    mutationObserver.disconnect();
    resizeObserver.disconnect();
    svg.remove();
    document.documentElement.style.removeProperty('--lg-blur-k');
  };
};
