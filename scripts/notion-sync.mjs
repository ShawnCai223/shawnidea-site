/**
 * Notion → Astro content sync
 * Usage: npm run sync
 *
 * Required .env vars:
 *   NOTION_TOKEN          — Integration secret
 *   NOTION_BLOG_DB        — Blog database ID
 *   NOTION_PROJECTS_DB    — Projects database ID
 */

import { Client } from '@notionhq/client';
import slugify from 'slugify';
import fs from 'fs';
import path from 'path';

// Load .env
try {
  const env = fs.readFileSync('.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
} catch {}

const { NOTION_TOKEN, NOTION_BLOG_DB, NOTION_PROJECTS_DB } = process.env;

if (!NOTION_TOKEN) {
  console.error('Missing NOTION_TOKEN in .env');
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });
const CONTENT_ROOT = path.resolve('src/content');

// ── property helpers ─────────────────────────────────────────────────────────

function prop(page, name) {
  return page.properties?.[name];
}

function richText(p) {
  return p?.rich_text?.map((t) => t.plain_text).join('') ?? '';
}

function titleProp(p) {
  return p?.title?.map((t) => t.plain_text).join('') ?? '';
}

function dateProp(p) {
  return p?.date?.start ?? '';
}

function multi(p) {
  return p?.multi_select?.map((s) => s.name) ?? [];
}

function urlProp(p) {
  return p?.url ?? '';
}

function toSlug(str) {
  return slugify(str, { lower: true, strict: true });
}

function formatDate(d) {
  return d ? new Date(d).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function yamlStr(val) {
  return JSON.stringify(String(val));
}

function yamlArr(arr) {
  if (!arr.length) return '[]';
  return '[' + arr.map((s) => JSON.stringify(s)).join(', ') + ']';
}

// ── fetch pages from a database ──────────────────────────────────────────────

async function queryDatabase(dbId, statusValue = 'Published') {
  try {
    const res = await notion.dataSources.query({
      data_source_id: dbId,
      filter: { property: 'Status', status: { equals: statusValue } },
    });
    return res.results ?? [];
  } catch (e) {
    console.warn('  Querying without Status filter:', e.message);
    try {
      const res = await notion.dataSources.query({ data_source_id: dbId });
      return res.results ?? [];
    } catch (e2) {
      console.error('  Failed to query database:', e2.message);
      return [];
    }
  }
}

// ── get page body as Markdown ────────────────────────────────────────────────

async function getMarkdown(pageId) {
  try {
    const res = await notion.pages.retrieveMarkdown({ page_id: pageId });
    return res.markdown?.trim() ?? '';
  } catch {
    return '';
  }
}

// ── blog sync ────────────────────────────────────────────────────────────────

async function syncBlog() {
  if (!NOTION_BLOG_DB) {
    console.log('NOTION_BLOG_DB not set — skipping');
    return;
  }

  const outDir = path.join(CONTENT_ROOT, 'blog');
  fs.mkdirSync(outDir, { recursive: true });

  const pages = await queryDatabase(NOTION_BLOG_DB, 'Published');
  let count = 0;

  for (const page of pages) {
    const t = titleProp(prop(page, 'Title'));
    if (!t) continue;

    const description = richText(prop(page, 'Description'));
    const pubDate = formatDate(dateProp(prop(page, 'Date')));
    const heroImage = urlProp(prop(page, 'HeroImage'));
    const slug = richText(prop(page, 'Slug')) || toSlug(t);
    const body = await getMarkdown(page.id);

    const fm = [
      '---',
      `title: ${yamlStr(t)}`,
      `description: ${yamlStr(description)}`,
      `pubDate: '${pubDate}'`,
      heroImage ? `heroImage: ${yamlStr(heroImage)}` : null,
      '---',
    ].filter(l => l !== null).join('\n');

    fs.writeFileSync(path.join(outDir, `${slug}.md`), fm + '\n\n' + body + '\n');
    console.log(`  blog → ${slug}.md`);
    count++;
  }

  console.log(`Blog: synced ${count} post(s)`);
}

// ── projects sync ────────────────────────────────────────────────────────────

async function syncProjects() {
  if (!NOTION_PROJECTS_DB) {
    console.log('NOTION_PROJECTS_DB not set — skipping');
    return;
  }

  const outDir = path.join(CONTENT_ROOT, 'projects');
  fs.mkdirSync(outDir, { recursive: true });

  const pages = await queryDatabase(NOTION_PROJECTS_DB, 'Done');
  let count = 0;

  for (const page of pages) {
    const t = titleProp(prop(page, 'Title'));
    if (!t) continue;

    const description = richText(prop(page, 'Description'));
    const pubDate = formatDate(dateProp(prop(page, 'Date')));
    const languages = multi(prop(page, 'Languages'));
    const stack = multi(prop(page, 'Stack'));
    const github = urlProp(prop(page, 'GitHub'));
    const demo = urlProp(prop(page, 'Demo'));
    const role = richText(prop(page, 'Role'));
    const glyph = richText(prop(page, 'Glyph'));
    const heroImage = urlProp(prop(page, 'HeroImage'));
    const slug = richText(prop(page, 'Slug')) || toSlug(t);
    const body = await getMarkdown(page.id);

    const fm = [
      '---',
      `title: ${yamlStr(t)}`,
      `description: ${yamlStr(description)}`,
      `pubDate: '${pubDate}'`,
      heroImage ? `heroImage: ${yamlStr(heroImage)}` : "heroImage: ''",
      `languages: ${yamlArr(languages)}`,
      `stack: ${yamlArr(stack)}`,
      github ? `github: ${yamlStr(github)}` : null,
      demo ? `demo: ${yamlStr(demo)}` : null,
      role ? `role: ${yamlStr(role)}` : null,
      glyph ? `glyph: ${yamlStr(glyph)}` : null,
      '---',
    ].filter(l => l !== null).join('\n');

    fs.writeFileSync(path.join(outDir, `${slug}.md`), fm + '\n\n' + body + '\n');
    console.log(`  project → ${slug}.md`);
    count++;
  }

  console.log(`Projects: synced ${count} project(s)`);
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('Syncing from Notion…');
await syncBlog();
await syncProjects();
console.log('Done.');
