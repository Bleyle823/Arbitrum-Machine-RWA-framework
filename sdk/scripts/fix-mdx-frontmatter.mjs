import fs from "fs";
import path from "path";

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".mdx")) files.push(p);
  }
  return files;
}

function fixFile(file) {
  let text = fs.readFileSync(file, "utf8");
  if (!text.startsWith("---")) return false;
  const end = text.indexOf("\n---", 3);
  if (end < 0) return false;
  const fm = text.slice(0, end + 4);
  const body = text.slice(end + 4);
  const lines = fm.split(/\r?\n/);
  let changed = false;
  const out = lines.map(line => {
    const m = line.match(/^description:\s*(.+)$/);
    if (!m) return line;
    let val = m[1].trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      return line;
    }
    if (!val.includes(":")) return line;
    val = val.replace(/"/g, '\\"');
    changed = true;
    return `description: "${val}"`;
  });
  if (!changed) return false;
  fs.writeFileSync(file, out.join("\n") + body);
  return true;
}

const roots = process.argv.slice(2);
for (const root of roots) {
  const fixed = walk(root).filter(fixFile);
  console.log(`${root}: fixed ${fixed.length} files`);
}
