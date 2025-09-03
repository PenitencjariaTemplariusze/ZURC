const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const PAGE_ID_ENV = (process.env.NOTION_PAGE_ID || "").replace(/-/g, "");
const SHARED_TOKEN = process.env.PUBLIC_EDIT_TOKEN || "";
const MAX_CHARS = Number(process.env.MAX_CHARS || 5000);

async function listAllChildren(blockId) {
  const all = [];
  let cursor = undefined;
  do {
    const resp = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor
    });
    all.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor || undefined : undefined;
  } while (cursor);
  return all;
}

function isHeadingText(block, text) {
  const t = block?.type;
  if (!t || !block[t]) return false;
  const isHeading = t === "heading_1" || t === "heading_2" || t === "heading_3";
  if (!isHeading) return false;
  const rich = block[t].rich_text || [];
  const content = rich.map(r => r?.plain_text || "").join("");
  return content.trim() === text;
}

function toParagraphBlocks(content) {
  const parts = content
    .replace(/\r/g, "")
    .split(/\n{2,}/)
    .map(s => s.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [{
      object: "block",
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: "" } }] }
    }];
  }

  return parts.map(p => ({
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: p.slice(0, 2000) } }]
    }
  }));
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Use POST" });
  }

  try {
    const { token, content } = req.body || {};
    if (!token || token !== SHARED_TOKEN) {
      return res.status(401).json({ ok: false, error: "Unauthorized" });
    }

    const text = (content || "").toString();
    if (!text) return res.status(400).json({ ok: false, error: "Empty content" });
    if (text.length > MAX_CHARS) {
      return res.status(413).json({ ok: false, error: `Too long (> ${MAX_CHARS})` });
    }
    if (!PAGE_ID_ENV) {
      return res.status(400).json({ ok: false, error: "Missing NOTION_PAGE_ID" });
    }

    // Pobierz wszystkie bloki na stronie
    const children = await listAllChildren(PAGE_ID_ENV);

    // Znajdź markery
    const beginIdx = children.findIndex(b => isHeadingText(b, "BEGIN PUBLIC EDIT"));
    const endIdx = children.findIndex(b => isHeadingText(b, "END PUBLIC EDIT"));

    if (beginIdx === -1 || endIdx === -1 || beginIdx >= endIdx) {
      return res.status(400).json({
        ok: false,
        error: "Markers not found or wrong order. Add H2: BEGIN PUBLIC EDIT / END PUBLIC EDIT"
      });
    }

    // Usuń stare bloki pomiędzy markerami
    const between = children.slice(beginIdx + 1, endIdx);
    for (const blk of between) {
      try { await notion.blocks.delete({ block_id: blk.id }); } catch {}
    }

    // Dodaj nowe akapity na końcu strony
    await notion.blocks.children.append({
      block_id: PAGE_ID_ENV,
      children: toParagraphBlocks(text)
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
};
