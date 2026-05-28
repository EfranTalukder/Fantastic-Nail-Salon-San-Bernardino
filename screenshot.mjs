import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = process.argv[2] || "http://localhost:3000";
const label = process.argv[3] || "";

const screenshotsDir = path.join(__dirname, "temporary screenshots");
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

function nextFilename(label) {
  const files = fs.existsSync(screenshotsDir)
    ? fs.readdirSync(screenshotsDir).filter((f) => f.endsWith(".png"))
    : [];
  let max = 0;
  for (const f of files) {
    const m = f.match(/^screenshot-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  const n = String(max + 1).padStart(3, "0");
  return label
    ? `screenshot-${n}-${label}.png`
    : `screenshot-${n}.png`;
}

const browser = await puppeteer.launch({
  executablePath:
    "C:/Users/Efran/.cache/puppeteer/chrome/win64-127.0.6533.88/chrome-win64/chrome.exe",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

// Force all reveal elements visible immediately
await page.evaluate(() => {
  document.querySelectorAll('.rev').forEach(el => el.classList.add('in'));
});

// Scroll through slowly to trigger lazy images
await page.evaluate(async () => {
  await new Promise(resolve => {
    let pos = 0;
    const step = 200;
    const timer = setInterval(() => {
      pos += step;
      window.scrollTo(0, pos);
      if (pos >= document.body.scrollHeight) {
        window.scrollTo(0, 0);
        clearInterval(timer);
        resolve();
      }
    }, 120);
  });
});

// Wait for all images to finish loading
await page.evaluate(async () => {
  const imgs = Array.from(document.images);
  await Promise.all(imgs.map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(res => { img.onload = res; img.onerror = res; });
  }));
});

await new Promise(r => setTimeout(r, 2000));

const filename = nextFilename(label);
const filePath = path.join(screenshotsDir, filename);
await page.screenshot({ path: filePath, fullPage: true });
console.log(`Screenshot saved: ${filePath}`);

await browser.close();
