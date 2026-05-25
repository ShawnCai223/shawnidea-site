/**
 * Notion → Astro content sync
 * Usage: npm run sync
 *
 * Reads from two Notion databases and writes Markdown files into
 * src/content/blog/ and src/content/projects/.
 *
 * Required .env vars:
 *   NOTION_TOKEN          — Integration secret
 *   NOTION_BLOG_DB        — Blog database ID
 *   NOTION_PROJECTS_DB    — Projects database ID
 */

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import slugify from 'slugify';
import fs from 'fs';
import path from 'path';

// Load .env manually (no dotenv dependency needed in Node 20+)
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
const n2m = new NotionToMarkdown({ notionClient: notion });

const CONTENT_ROOT = path.resolve('src/content');

// ── helpers ─────────────────────────────────────────────────────────────────

function prop(page, name) {
  return page.properties[name];
}

function richText(p) {
  return p?.rich_text?.map((t) => t.plain_text).join('') ?? '';
}

function title(p) {
  return p?.title?.map((t) => t.plain_text).join('') ?? '';
}

function date(p) {
  return p?.date?.start ?? '';
}

function multi(p) {
  return p?.multi_select?.map((s) => s.name) ?? [];
}

function url(p) {
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

async function pageToMarkdown(pageId) {
  const blocks = await n2m.pageToMarkdown(pageId);
  return n2m.toMarkdownString(blocks).parent.trim();
}

// ── blog sync ────────────────────────────────────────────────────────────────

async function syncBlog() {
  if (!NOTION_BLOG_DB) {
    console.log('NOTION_BLOG_DB not set — skipping blog sync');
    return;
  }

  const outDir = path.join(CONTENT_ROOT, 'blog');
  fs.mkdirSync(outDir, { recursive: true });

  const { results } = await notion.databases.query({
    database_id: NOTION_BLOG_DB,
    filter: { property: 'Status', status: { equals: 'Published' } },
  });

  let count = 0;
  for (const page of results) {
    const titleVal = title(prop(page, 'Title'));
    if (!titleVal) continue;

    const description = richText(prop(page, 'Description'));
    const pubDate = formatDate(date(prop(page, 'Date')));
    const heroImage = url(prop(page, 'HeroImage'));

    const slug = richText(prop(page, 'Slug')) || toSlug(titleVal);
    const body = await pageToMarkdown(page.id);

    const frontmatter = [
      '---',
      `title: ${yamlStr(titleVal)}`,
      `description: ${yamlStr(description)}`,
      `pubDate: '${pubDate}'`,
      heroImage ? `heroImage: ${yamlStr(heroImage)}` : '',
      '---',
    ]
      .filter(Boolean)
      .join('\n');

    const file = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(file, frontmatter + '\n\n' + body + '\n');
    console.log(`  blog → ${slug}.md`);
    count++;
  }
  console.log(`Blog: synced ${count} post(s)`);
}

// ── projects sync ────────────────────────────────────────────────────────────

async function syncProjects() {
  if (!NOTION_PROJECTS_DB) {
    console.log('NOTION_PROJECTS_DB not set — skipping projects sync');
    return;
  }

  const outDir = path.join(CONTENT_ROOT, 'projects');
  fs.mkdirSync(outDir, { recursive: true });

  const { results } = await notion.databases.query({
    database_id: NOTION_PROJECTS_DB,
    filter: { property: 'Status', status: { equals: 'Published' } },
  });

  let count = 0;
  for (const page of results) {
    const titleVal = title(prop(page, 'Title'));
    if (!titleVal) continue;

    const description = richText(prop(page, 'Description'));
    const pubDate = formatDate(date(prop(page, 'Date')));
    const languages = multi(prop(page, 'Languages'));
    const stack = multi(prop(page, 'Stack'));
    const github = url(prop(page, 'GitHub'));
    const demo = url(prop(page, 'Demo'));
    const role = richText(prop(page, 'Role'));
    const glyph = richText(prop(page, 'Glyph'));
    const heroImage = url(prop(page, 'HeroImage'));

    const slug = richText(prop(page, 'Slug')) || toSlug(titleVal);
    const body = await pageToMarkdown(page.id);

    const frontmatter = [
      '---',
      `title: ${yamlStr(titleVal)}`,
      `description: ${yamlStr(description)}`,
      `pubDate: '${pubDate}'`,
      heroImage ? `heroImage: ${yamlStr(heroImage)}` : "heroImage: ''",
      `languages: ${yamlArr(languages)}`,
      `stack: ${yamlArr(stack)}`,
      github ? `github: ${yamlStr(github)}` : '',
      demo ? `demo: ${yamlStr(demo)}` : '',
      role ? `role: ${yamlStr(role)}` : '',
      glyph ? `glyph: ${yamlStr(glyph)}` : '',
      '---',
    ]
      .filter((l) => l !== '')
      .join('\n');

    const file = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(file, frontmatter + '\n\n' + body + '\n');
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
