"use strict";

// Produce a static deployment with a content-based version for every CSS and JS file.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const root = __dirname;
const output = path.join(root, "dist");
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex").slice(0, 12);
const versions = {};

function copyDirectory(relative) {
  const source = path.join(root, relative);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const name = path.posix.join(relative, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(name);
    } else if (entry.isFile()) {
      const contents = fs.readFileSync(path.join(root, name));
      const destination = path.join(output, name);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, contents);
      if (/\.(?:js|css)$/.test(name)) versions[name] = hash(contents);
    }
  }
}

fs.mkdirSync(output, { recursive: true });
for (const directory of ["assets", "tools"]) copyDirectory(directory);
for (const name of ["style.css", "projects.js", "guestbook.js"]) {
  const data = fs.readFileSync(path.join(root, name));
  fs.writeFileSync(path.join(output, name), data);
  versions[name] = hash(data);
}

const uiPath = path.join(output, "tools/ui.js");
const ui = fs.readFileSync(uiPath, "utf8");
const marker = "/* ASSET_VERSIONS */ {}";
if (!ui.includes(marker)) throw new Error("Asset version marker missing from tools/ui.js");
const builtUi = ui.replace(marker, `/* ASSET_VERSIONS */ ${JSON.stringify(versions)}`);
fs.writeFileSync(uiPath, builtUi);
versions["tools/ui.js"] = hash(builtUi);

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const builtHtml = html.replace(/(href|src)="([^"?#]+\.(?:css|js))(?:\?[^"#]*)?"/g, (match, attribute, asset) => {
  if (!versions[asset]) throw new Error(`Missing asset: ${asset}`);
  return `${attribute}="${asset}?v=${versions[asset]}"`;
});
fs.writeFileSync(path.join(output, "index.html"), builtHtml);
console.log("Built versioned static site in dist/");
