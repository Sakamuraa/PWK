// Naikkan patch version di package.json: x.x.NN (minimal dua digit).
// Dipakai setiap commit perubahan: node scripts/bump-version.mjs
import fs from "node:fs";

const path = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(fs.readFileSync(path, "utf8"));
const [maj, min, patch] = pkg.version.split(".").map((x) => Number(x) || 0);
const next = `${maj}.${min}.${patch + 1}`;
pkg.version = next;
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
console.log(`versi ${maj}.${min}.${patch} → ${next}`);
