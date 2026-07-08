// Generates the extension icons (public/icons/icon-{16,48,128}.png) without
// any image library: pixels are drawn in memory and encoded as PNG by hand
// (zlib deflate is built into node).
// Design: rounded yellow square, three dark dots left-to-right = peloton,
// chase group and breakaway riding toward the finish.
// Run: node tools/generate-icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BG = [255, 205, 5]; // tour yellow
const DOT = [26, 26, 26];
const SIZES = [16, 48, 128];
const SS = 4; // supersampling factor for smooth edges

// dots as fractions of the icon size: [cx, cy, r]
const DOTS = [
  [0.3, 0.54, 0.17], // peloton
  [0.6, 0.49, 0.105], // chase
  [0.83, 0.44, 0.07], // breakaway
];

function crc32(buf) {
  let c,
    crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0; // filter: none
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// returns [r,g,b,a] for one supersampled pixel at (x, y) on an n×n grid
function sample(x, y, n) {
  const radius = 0.18 * n;
  // inside the rounded square?
  const dx = Math.max(radius - x, x - (n - 1 - radius), 0);
  const dy = Math.max(radius - y, y - (n - 1 - radius), 0);
  if (dx * dx + dy * dy > radius * radius) return [0, 0, 0, 0];
  for (const [cx, cy, r] of DOTS) {
    const ddx = x - cx * n;
    const ddy = y - cy * n;
    if (ddx * ddx + ddy * ddy <= r * n * (r * n)) return [...DOT, 255];
  }
  return [...BG, 255];
}

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

for (const size of SIZES) {
  const n = size * SS;
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [pr, pg, pb, pa] = sample(x * SS + sx, y * SS + sy, n);
          r += pr; g += pg; b += pb; a += pa;
        }
      }
      const k = (y * size + x) * 4;
      const s = SS * SS;
      rgba[k] = r / s; rgba[k + 1] = g / s; rgba[k + 2] = b / s; rgba[k + 3] = a / s;
    }
  }
  const file = join(outDir, `icon-${size}.png`);
  writeFileSync(file, png(size, rgba));
  console.log(`wrote ${file}`);
}
