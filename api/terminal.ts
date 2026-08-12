import type { IncomingMessage, ServerResponse } from 'http';
import { loadConfig } from '../dist/config.js';
import { fetchGitHubStats } from '../dist/services/github.service.js';
import { fetchLanyardStatus } from '../dist/services/lanyard.service.js';
import { updateDevLog } from '../dist/services/devlog.service.js';
import { renderTerminalSvg } from '../dist/renderers/terminal.renderer.js';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  // Strip query params to prevent cache bypass
  const reqUrl = new URL(_req.url || '/', `http://${_req.headers.host || 'localhost'}`);
  if (reqUrl.search !== '') {
    res.statusCode = 301;
    res.setHeader('Location', '/terminal.svg');
    return res.end();
  }

  try {
    const config = loadConfig();
    const stats = await fetchGitHubStats(config.github.username);
    const discord = await fetchLanyardStatus(config.discord.discordId, config.github.username);
    const history = await updateDevLog(discord.activities, config.github.username);
    const svg = renderTerminalSvg(config, stats, discord, history);

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=180, s-maxage=300, stale-while-revalidate=600');
    res.statusCode = 200;
    res.end(svg);
  } catch (err) {
    console.error('Error generating Vercel terminal SVG:', err);
    res.statusCode = 500;
    res.end('Error generating SVG');
  }
}
