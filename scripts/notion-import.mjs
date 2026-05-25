/**
 * Local content → Notion import
 * Usage: npm run import
 *
 * Reads existing Markdown files from src/content/blog/ and src/content/projects/
 * and creates corresponding pages in the Notion databases.
 * Safe to re-run: checks for existing pages by title before creating.
 */

import { Client } from '@notionhq/client';
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

if (!NOTION_TOKEN) { console.error('Missing NOTION_TOKEN'); process.exit(1); }

const notion = new Client({ auth: NOTION_TOKEN });

// ── frontmatter parser ───────────────────────────────────────────────────────

function parseFrontmatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: src.trim() };

  const meta = {};
  for (const line of m[1].split('\n')) {
    const [k, ...rest] = line.split(':');
    if (!k) continue;
    let v = rest.join(':').trim().replace(/^['"]|['"]$/g, '');
    // parse arrays like ['a', 'b']
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
    }
    meta[k.trim()] = v;
  }

  return { meta, body: m[2].trim() };
}

// ── check if page already exists in db ──────────────────────────────────────

async function titleExists(dbId, title) {
  try {
    const res = await notion.dataSources.query({
      data_source_id: dbId,
      filter: { property: 'Title', title: { equals: title } },
    });
    return (res.results?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

// ── create a Notion page ─────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  const parsed = new Date(d);
  return isNaN(parsed) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
}

async function createPage(dbId, properties, body) {
  const page = await notion.pages.create({
    parent: { type: 'data_source_id', data_source_id: dbId },
    properties,
  });

  if (body) {
    await notion.pages.updateMarkdown({
      page_id: page.id,
      type: 'replace_content',
      replace_content: { new_str: body, allow_deleting_content: false },
    });
  }

  return page;
}

// ── import blog posts ────────────────────────────────────────────────────────

async function importBlog() {
  if (!NOTION_BLOG_DB) { console.log('NOTION_BLOG_DB not set — skipping'); return; }

  const dir = path.resolve('src/content/blog');
  const files = fs.readdirSync(dir).filter(f => f.match(/\.(md|mdx)$/));
  let count = 0;

  for (const file of files) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const { meta, body } = parseFrontmatter(src);
    const title = meta.title || file.replace(/\.(md|mdx)$/, '');

    if (await titleExists(NOTION_BLOG_DB, title)) {
      console.log(`  skip (exists): ${title}`);
      continue;
    }

    const properties = {
      Title: { title: [{ text: { content: title } }] },
      Description: { rich_text: [{ text: { content: meta.description || '' } }] },
      Date: { date: { start: formatDate(meta.pubDate) } },
      Status: { status: { name: 'Published' } },
    };

    if (meta.heroImage) {
      properties.HeroImage = { url: meta.heroImage };
    }

    await createPage(NOTION_BLOG_DB, properties, body);
    console.log(`  blog → "${title}"`);
    count++;
  }

  console.log(`Blog: imported ${count} post(s)`);
}

// ── import projects ──────────────────────────────────────────────────────────

async function importProjects() {
  if (!NOTION_PROJECTS_DB) { console.log('NOTION_PROJECTS_DB not set — skipping'); return; }

  const dir = path.resolve('src/content/projects');
  const files = fs.readdirSync(dir).filter(f => f.match(/\.(md|mdx)$/));
  let count = 0;

  for (const file of files) {
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const { meta, body } = parseFrontmatter(src);
    const title = meta.title || file.replace(/\.md$/, '');

    if (await titleExists(NOTION_PROJECTS_DB, title)) {
      console.log(`  skip (exists): ${title}`);
      continue;
    }

    const langs = Array.isArray(meta.languages) ? meta.languages : [];
    const stack = Array.isArray(meta.stack) ? meta.stack : [];

    const properties = {
      Title: { title: [{ text: { content: title } }] },
      Description: { rich_text: [{ text: { content: meta.description || '' } }] },
      Date: { date: { start: formatDate(meta.pubDate) } },
      Languages: { multi_select: langs.map(n => ({ name: n })) },
      Stack: { multi_select: stack.map(n => ({ name: n })) },
      Status: { status: { name: 'Done' } },
    };

    if (meta.github) properties.GitHub = { url: meta.github };
    if (meta.demo)   properties.Demo   = { url: meta.demo };
    if (meta.role)   properties.Role   = { rich_text: [{ text: { content: meta.role } }] };
    if (meta.glyph)  properties.Glyph  = { rich_text: [{ text: { content: meta.glyph } }] };

    await createPage(NOTION_PROJECTS_DB, properties, body);
    console.log(`  project → "${title}"`);
    count++;
  }

  console.log(`Projects: imported ${count} project(s)`);
}

// ── main ─────────────────────────────────────────────────────────────────────

console.log('Importing local content → Notion…');
await importBlog();
await importProjects();
console.log('Done.');
