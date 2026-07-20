import fs from "node:fs";
import path from "node:path";

const directory = path.resolve("data/dictionary");
const files = fs
  .readdirSync(directory)
  .filter((name) => name.endsWith(".json"))
  .filter((name) => !["dictionary.schema.json", "template.json"].includes(name));

const ids = new Map();
const slugs = new Map();
const words = new Map();
let count = 0;
let failed = false;

function error(message) {
  failed = true;
  console.error(`ERROR: ${message}`);
}

for (const file of files) {
  const fullPath = path.join(directory, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  } catch (cause) {
    error(`${file}: invalid JSON (${cause.message})`);
    continue;
  }

  if (data.schemaVersion !== "1.0" || !Array.isArray(data.entries)) {
    error(`${file}: expected schemaVersion 1.0 and an entries array`);
    continue;
  }

  for (const [index, entry] of data.entries.entries()) {
    count += 1;
    const label = `${file} entry ${index + 1}`;
    for (const key of ["id", "word", "slug", "meaningZh", "definitionEn", "status", "version"]) {
      if (entry[key] === undefined || entry[key] === "") error(`${label}: missing ${key}`);
    }
    if (!Array.isArray(entry.aliases)) error(`${label}: aliases must be an array`);
    if (!Array.isArray(entry.examples) || entry.examples.length === 0) error(`${label}: requires at least one example`);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug ?? "")) error(`${label}: invalid slug '${entry.slug}'`);

    for (const [field, value, registry] of [
      ["id", entry.id, ids],
      ["slug", entry.slug, slugs],
      ["word", String(entry.word ?? "").toLowerCase(), words],
    ]) {
      if (registry.has(value)) error(`${label}: duplicate ${field} '${value}', first seen in ${registry.get(value)}`);
      else registry.set(value, label);
    }
  }
}

if (failed) process.exit(1);
console.log(`Dictionary validation passed: ${count} entries across ${files.length} file(s).`);
