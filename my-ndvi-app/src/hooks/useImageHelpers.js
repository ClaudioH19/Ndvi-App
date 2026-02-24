// Helpers para procesamiento de imágenes NDVI y CIR

export const RAW_W = 2048;
export const RAW_H = 1536;

// Normaliza un valor desde rango [mn, mx] a [0, 255]
export function norm(v, mn, mx) {
  const range = mx - mn || 1;
  return Math.min(255, Math.max(0, Math.round(((v ?? mn) - mn) / range * 255)));
}

export function buildCIR(nir, red, green) {
  let nirMn = Infinity, nirMx = -Infinity;
  let redMn = Infinity, redMx = -Infinity;
  let grnMn = Infinity, grnMx = -Infinity;
  for (let y = 0; y < RAW_H; y++)
    for (let x = 0; x < RAW_W; x++) {
      const n = nir[y]?.[x], r = red[y]?.[x], g = green[y]?.[x];
      if (n != null && isFinite(n)) { if (n < nirMn) nirMn = n; if (n > nirMx) nirMx = n; }
      if (r != null && isFinite(r)) { if (r < redMn) redMn = r; if (r > redMx) redMx = r; }
      if (g != null && isFinite(g)) { if (g < grnMn) grnMn = g; if (g > grnMx) grnMx = g; }
    }
  const id = new Uint8ClampedArray(RAW_W * RAW_H * 4);
  for (let y = 0; y < RAW_H; y++)
    for (let x = 0; x < RAW_W; x++) {
      const i = (y * RAW_W + x) * 4;
      id[i]   = norm(nir[y]?.[x]   ?? nirMn, nirMn, nirMx);
      id[i+1] = norm(red[y]?.[x]   ?? redMn, redMn, redMx);
      id[i+2] = norm(green[y]?.[x] ?? grnMn, grnMn, grnMx);
      id[i+3] = 255;
    }
  return id;
}

export function buildNDVI(ndvi) {
  const id = new Uint8ClampedArray(RAW_W * RAW_H * 4);
  for (let y = 0; y < RAW_H; y++)
    for (let x = 0; x < RAW_W; x++) {
      const i = (y * RAW_W + x) * 4;
      const v = Math.min(255, Math.max(0, Math.round((((ndvi[y]?.[x] ?? -1) + 1) / 2) * 255)));
      id[i]=v; id[i+1]=v; id[i+2]=v; id[i+3]=255;
    }
  return id;
}

export function renderToCanvas(canvas, pixelData, dw, dh) {
  canvas.width = dw; canvas.height = dh;
  const tmp = document.createElement("canvas");
  tmp.width = RAW_W; tmp.height = RAW_H;
  tmp.getContext("2d").putImageData(new ImageData(pixelData, RAW_W, RAW_H), 0, 0);
  canvas.getContext("2d").drawImage(tmp, 0, 0, dw, dh);
}

export function displaySize() {
  const availW = Math.min(window.innerWidth - 220, 1400);
  const availH = window.innerHeight - 120;
  let dw = RAW_W, dh = RAW_H;
  if (dw > availW) { dh = Math.round(dh * availW / dw); dw = availW; }
  if (dh > availH) { dw = Math.round(dw * availH / dh); dh = availH; }
  return { dw, dh };
}