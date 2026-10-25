/**
 * check-ranking-links.js — confirms every link on the /rankings directory
 * page still opens. Run from CI, since the poll sites block most sandboxes.
 *
 * Prints each link's status and page title. Exits 1 if any link is missing
 * (404/410) or unreachable; a 403 is reported but allowed, since some sites
 * turn away scripts while working fine in a browser.
 */

const cheerio = require('cheerio');
const directory = require('../src/data/rankings-directory.json');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

async function check(url) {
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
    const html = res.ok ? await res.text() : '';
    const $ = cheerio.load(html || '');
    const title = $('title').first().text().trim().slice(0, 80);
    // How regional pages split their regions, for parsing them later.
    let regions = '';
    if (/regional/.test(url)) {
      const table = $('table').first();
      const head = table.find('th').map((_, el) => $(el).text().trim()).get().join(' | ');
      const rows = table.find('tbody tr').slice(0, 3).map((_, tr) => $(tr).find('td').map((__, td) => $(td).text().trim()).get().join(' | ')).get().join(' // ');
      const picks = $('select option, a[href*="regional"]').map((_, el) => `${$(el).text().trim()}=${$(el).attr('value') || $(el).attr('href')}`).get().slice(0, 15).join(' ; ');
      const near = table.prevAll().slice(0, 3).map((_, el) => $(el).text().trim().slice(0, 60)).get().join(' / ');
      regions = `head: ${head}\n           rows: ${rows}\n           picks: ${picks}\n           before table: ${near}`;
    }
    return { status: res.status, finalUrl: res.url, title, regions };
  } catch (err) {
    return { status: 0, finalUrl: url, title: err.message };
  }
}

async function main() {
  const urls = [...new Set(directory.flatMap(s => s.polls.map(p => p.url)))];
  let broken = 0;
  for (const url of urls) {
    const r = await check(url);
    const bad = r.status === 0 || r.status === 404 || r.status === 410;
    if (bad) broken++;
    const moved = r.finalUrl !== url ? ` → ${r.finalUrl}` : '';
    console.log(`${bad ? 'BROKEN' : r.status === 200 ? 'ok    ' : 'warn  '} ${r.status} ${url}${moved} | ${r.title}`);
    if (r.regions) console.log(`         regions: ${r.regions}`);
  }
  console.log(`\n${urls.length} links, ${broken} broken`);
  if (broken) process.exit(1);
}

if (require.main === module) main();
