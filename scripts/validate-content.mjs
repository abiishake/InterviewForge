#!/usr/bin/env node
// Validates the Markdown knowledge base without needing .NET: structure, ids, code fences and example overlays.
//   node scripts/validate-content.mjs            (run from the repo root)
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const dataDir = process.argv.slice(2).find(a => !a.startsWith("--")) ?? "data";
const problems = [];
const fail = (file, msg) => problems.push(`${file}: ${msg}`);

const walk = (dir) => !existsSync(dir) ? [] : readdirSync(dir).flatMap(n => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".md") ? [p] : [];
}).sort();

const isFence = (l) => /^\s*(```|~~~)/.test(l);
const DASH = /\s+(?:---|--|—|–)\s+/;

function parseBank(file) {
  const topics = []; let topic = null, q = null, inFence = false;
  const lines = readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  const closeQ = () => { if (q && topic) topic.questions.push(q); q = null; };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (isFence(line)) { inFence = !inFence; if (q) { q.body.push(line); if (q.section === "answer") q.answer.push(line); } continue; }
    if (inFence) { if (q) { q.body.push(line); if (q.section === "answer") q.answer.push(line); } continue; }
    let m = /^#\s+TOPIC\s*(?:---|--|—|–|:)\s*(.+)$/i.exec(line);
    if (m) { closeQ(); topic = { title: m[1], id: null, priority: null, questions: [] }; topics.push(topic); continue; }
    if (/^#\s+/.test(line)) { closeQ(); topic = null; continue; }
    if (!topic) continue;
    if (line.startsWith("## ")) { closeQ(); const parts = line.slice(3).trim().split(DASH); q = { headingId: parts.length > 1 ? parts[0] : null, title: parts.at(-1), fields: {}, body: [], fenceLines: 0, section: "none", keywords: "" }; continue; }
    const f = /^\*\*([A-Za-z_\- ]+):\*\*\s*`?([^`]*)`?\\?\s*$/.exec(line.trim());
    if (!q) { if (f) { const k = f[1].toLowerCase().replace(/[ -]/g, "_"); if (k === "topic_id") topic.id = f[2].trim(); if (k === "priority") topic.priority = f[2].trim(); } continue; }
    if (/^\*\*Question\*\*:?$/i.test(line.trim())) { q.section = "question"; continue; }
    if (/^\*\*Answer\*\*:?$/i.test(line.trim())) { q.section = "answer"; q.answer = []; continue; }
    if (/^\*\*Follow-?ups:?\*\*:?$/i.test(line.trim())) { q.section = "followups"; q.followups = 0; continue; }
    if (/^\*\*Keywords:?\*\*/i.test(line.trim())) { q.section = "keywords"; const inline = /^\*\*Keywords:?\*\*\s*`?([^`]*)`?/i.exec(line.trim()); q.keywords = inline?.[1] ?? ""; continue; }
    if (q.section === "keywords" && !q.keywords && line.trim().startsWith("`")) { q.keywords = line.replace(/[`\\]/g, "").trim(); continue; }
    if (q.section === "none" && f) { q.fields[f[1].toLowerCase().replace(/[ -]/g, "_")] = f[2].trim(); continue; }
    if (q.section === "answer") q.answer.push(line);
    if (q.section === "followups" && /^\s*[-*+]\s+\S/.test(line)) q.followups++;
    q.body.push(line);
  }
  closeQ();
  return { topics, unbalanced: inFence };
}

const legacy = join(dataDir, "dotnet_10_year_interview_question_bank.md");
const splitFiles = walk(join(dataDir, "question-bank"));
const ids = new Map(); let withCode = 0, total = 0;
const topicIds = new Set();

for (const file of [legacy, ...splitFiles]) {
  if (!existsSync(file)) continue;
  const isSplit = splitFiles.includes(file);
  const { topics, unbalanced } = parseBank(file);
  if (unbalanced) fail(file, "unbalanced code fence");
  if (!topics.length) fail(file, "no '# TOPIC ---' headings found");
  for (const t of topics) {
    if (!t.id) fail(file, `topic '${t.title}' has no topic_id`);
    if (!t.priority) fail(file, `topic '${t.title}' has no priority`);
    if (isSplit && topicIds.has(t.id)) fail(file, `duplicate topic_id ${t.id}`);
    topicIds.add(t.id);
    if (!t.questions.length) fail(file, `topic '${t.title}' has no questions`);
    for (const q of t.questions) {
      total++;
      const id = q.fields.question_id ?? q.headingId;
      const where = `${id ?? q.title}`;
      if (!id) { fail(file, `question '${q.title}' has no id`); continue; }
      if (ids.has(id)) fail(file, `duplicate question id ${id} (also in ${ids.get(id)})`); else ids.set(id, file);
      if (isSplit) {
        if (q.headingId !== id) fail(file, `${where}: heading id differs from question_id`);
        if (q.fields.topic_id !== t.id) fail(file, `${where}: topic_id '${q.fields.topic_id}' != topic '${t.id}'`);
        if (!q.fields.difficulty) fail(file, `${where}: missing difficulty`);
        if (!id.startsWith(`${t.id}-`)) fail(file, `${where}: id should start with '${t.id}-'`);
        if (!q.keywords || q.keywords.split(",").length < 3) fail(file, `${where}: needs at least 3 keywords`);
        if (!q.followups || q.followups < 2) fail(file, `${where}: needs at least 2 follow-ups`);
        const answer = (q.answer ?? []).join("\n");
        if (answer.trim().length < 400) fail(file, `${where}: answer is too short`);
        if (!answer.includes("```")) fail(file, `${where}: answer has no code example`); else withCode++;
        if (!/Real-world example/i.test(answer)) fail(file, `${where}: answer lacks a 'Real-world example' lead-in`);
      }
    }
  }
}

// Example overlays: ids must exist, bodies must contain a code fence and balanced fences.
let exampleCount = 0; const covered = new Set();
for (const file of walk(join(dataDir, "examples"))) {
  let id = null, body = [], inFence = false;
  const flush = () => {
    if (!id) return;
    exampleCount++;
    const text = body.join("\n");
    if (!ids.has(id)) fail(file, `example '${id}' matches no question`);
    if (covered.has(id)) fail(file, `duplicate example for ${id}`);
    covered.add(id);
    if (!text.includes("```")) fail(file, `example '${id}' has no code block`);
    if (text.trim().length < 120) fail(file, `example '${id}' is too short`);
    id = null; body = [];
  };
  for (const raw of readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n")) {
    if (isFence(raw)) inFence = !inFence;
    if (!inFence && raw.startsWith("## ")) { flush(); id = raw.slice(3).trim().split(DASH)[0].trim(); continue; }
    if (!inFence && raw.startsWith("# ")) { flush(); continue; }
    if (id) body.push(raw);
  }
  flush();
  if (inFence) fail(file, "unbalanced code fence");
}

const legacyIds = [...ids].filter(([, f]) => f === legacy).map(([id]) => id);
const missing = legacyIds.filter(id => !covered.has(id));
console.log(`questions: ${total} (split-file questions with code: ${withCode}); examples: ${exampleCount}`);
console.log(`legacy questions: ${legacyIds.length}, with a real-world code example: ${legacyIds.length - missing.length}`);
if (process.argv.includes("--list-missing")) console.log("missing examples:\n" + missing.join("\n"));
if (problems.length) { console.error(`\n${problems.length} problem(s):\n` + problems.map(p => " - " + p).join("\n")); process.exit(1); }
console.log("content OK");
