import axios from 'axios';
import * as cheerio from 'cheerio';

const EXCLUDED_PATTERNS = [
  '/login',
  '/signup',
  '/terms',
  '/privacy',
  '/password',
  '/cart',
  '/checkout',
  '/register',
];

const MAX_SUBPAGES = 7;
const PAGE_TIMEOUT = 12000;

export interface ScrapedPage {
  title: string;
  url: string;
}

export interface ScrapeResult {
  content: string;
  pages: ScrapedPage[];
}

function isExcluded(urlStr: string): boolean {
  try {
    const path = new URL(urlStr).pathname.toLowerCase();
    return EXCLUDED_PATTERNS.some((pattern) => path.includes(pattern));
  } catch {
    return true;
  }
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const mainPath = `${base.origin}${base.pathname}`.replace(/\/$/, '');
  const seen = new Set<string>([mainPath]);
  const links: string[] = [];

  $('a[href]').each((_, el) => {
    try {
      const href = $(el).attr('href') ?? '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname !== base.hostname) return;
      const normalized = `${resolved.origin}${resolved.pathname}`.replace(/\/$/, '');
      if (!seen.has(normalized) && !isExcluded(normalized)) {
        seen.add(normalized);
        links.push(normalized);
      }
    } catch {
      // ignore invalid URLs
    }
  });

  return links;
}

async function fetchMainWithJina(url: string): Promise<string | null> {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await axios.get(jinaUrl, {
      timeout: PAGE_TIMEOUT * 2,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ChatBotSaaS/1.0)',
        'Accept': 'text/plain, text/markdown',
        'X-Return-Format': 'markdown',
      },
      maxContentLength: 5 * 1024 * 1024,
    });
    const text = String(response.data).trim();
    return text.length >= 200 ? text : null;
  } catch {
    return null;
  }
}

async function fetchPageWithCheerio(
  url: string
): Promise<{ title: string; text: string; html: string } | null> {
  try {
    const response = await axios.get(url, {
      timeout: PAGE_TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      maxContentLength: 5 * 1024 * 1024,
    });

    const html = String(response.data);
    const $ = cheerio.load(html);
    $('script, style, noscript, iframe, .cookie-banner, #cookie-banner').remove();

    const title = $('title').text().trim() || url;
    const contentAreas = [
      'main', 'article', '[role="main"]', '.content', '.main-content',
      '#content', '#main', 'body',
    ];

    let bodyText = '';
    for (const selector of contentAreas) {
      const el = $(selector);
      if (el.length > 0) {
        bodyText = el.text();
        break;
      }
    }

    bodyText = bodyText.replace(/\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (bodyText.length < 50) return null;

    return { title, text: bodyText, html };
  } catch {
    return null;
  }
}

export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const pages: ScrapedPage[] = [];
  const contents: string[] = [];

  // メインページを Jina（JSレンダリング対応）と Cheerio（リンク抽出用）で並行取得
  const [jinaContent, mainCheerio] = await Promise.all([
    fetchMainWithJina(url),
    fetchPageWithCheerio(url),
  ]);

  const mainTitle = mainCheerio?.title ?? url;
  const mainContent = jinaContent ?? mainCheerio?.text ?? '';

  if (!mainContent) {
    throw new Error('メインページのコンテンツを取得できませんでした');
  }

  pages.push({ title: mainTitle, url });
  contents.push(`## ${mainTitle}\n\n${mainContent.slice(0, 6000)}`);

  // メインページのHTMLから内部リンクを抽出してサブページをクロール
  if (mainCheerio?.html) {
    const subLinks = extractInternalLinks(mainCheerio.html, url).slice(0, MAX_SUBPAGES);

    const subResults = await Promise.all(
      subLinks.map(async (subUrl) => {
        const result = await fetchPageWithCheerio(subUrl);
        return result ? { ...result, url: subUrl } : null;
      })
    );

    for (const r of subResults) {
      if (r && r.text.length >= 100) {
        pages.push({ title: r.title, url: r.url });
        contents.push(`## ${r.title}\n\n${r.text.slice(0, 3000)}`);
      }
    }
  }

  const content = contents.join('\n\n---\n\n').slice(0, 15000);
  return { content, pages };
}
