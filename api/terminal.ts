import type { IncomingMessage, ServerResponse } from 'http';
import { loadConfig } from '../src/config.js';
import { fetchGitHubStats } from '../src/services/github.service.js';
import { fetchLanyardStatus } from '../src/services/lanyard.service.js';
import { updateDevLog } from '../src/services/devlog.service.js';
import { renderTerminalSvg } from '../src/renderers/terminal.renderer.js';

export default async function handler(_req: IncomingMessage, res: ServerResponse) {
  const host = _req.headers.host || 'localhost';
  const reqUrl = new URL(_req.url || '/', `http://${host}`);
  const pathname = reqUrl.pathname;

  // Handle Cron Sync Endpoint
  if (pathname === '/cron' || pathname === '/api/cron') {
    try {
      const cronSecret = process.env.CRON_SECRET;

      if (!cronSecret) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            success: false,
            error: 'Server misconfigured: CRON_SECRET environment variable is not set',
          })
        );
      }

      const authHeader = _req.headers['authorization'];
      const queryKey = reqUrl.searchParams.get('key');

      if (authHeader !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Invalid or missing CRON_SECRET key',
          })
        );
      }

      console.log(`[${new Date().toISOString()}] Executing Cron Sync...`);
      const config = loadConfig();
      const stats = await fetchGitHubStats(config.github.username);
      const discord = await fetchLanyardStatus(config.discord.discordId, config.github.username);
      const history = await updateDevLog(discord.activities, config.github.username);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          success: true,
          timestamp: new Date().toISOString(),
          username: config.github.username,
          statsFetched: {
            repos: stats.publicRepos,
            commits: stats.commits,
            latestRepo: stats.latestRepo,
          },
          discordStatus: discord.status,
          devLogCount: history.records?.length || 0,
          message: 'Firestore successfully synced via Cron Job',
        })
      );
    } catch (err: any) {
      console.error('Error executing Cron Sync endpoint:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      return res.end(
        JSON.stringify({
          success: false,
          timestamp: new Date().toISOString(),
          error: err?.message || String(err),
        })
      );
    }
  }

  // Strip query params for SVG rendering to prevent cache bypass
  if (reqUrl.search !== '' && pathname !== '/terminal.svg' && pathname !== '/') {
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
