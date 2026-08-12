import http from 'http';
import { loadConfig } from './config.js';
import { fetchGitHubStats } from './services/github.service.js';
import { fetchLanyardStatus } from './services/lanyard.service.js';
import { updateDevLog } from './services/devlog.service.js';
import { renderTerminalSvg } from './renderers/terminal.renderer.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/cron' || pathname === '/api/cron') {
    try {
      console.log(`[${new Date().toLocaleTimeString()}] Executing local Cron Sync...`);
      const config = loadConfig();
      const cronSecret = process.env.CRON_SECRET || 'alf_read_me_zzz';
      const authHeader = req.headers['authorization'];
      const queryKey = reqUrl.searchParams.get('key');

      if (authHeader !== `Bearer ${cronSecret}` && queryKey !== cronSecret) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            success: false,
            error: 'Unauthorized: Invalid or missing CRON_SECRET key',
          })
        );
      }

      const stats = await fetchGitHubStats(config.github.username);
      const discord = await fetchLanyardStatus(config.discord.discordId, config.github.username);
      const history = await updateDevLog(discord.activities, config.github.username);

      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      });
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
      console.error('Error executing local cron:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: err?.message || String(err) }));
    }
  }

  if (pathname === '/terminal.svg' || pathname === '/' || pathname.startsWith('/terminal')) {
    try {
      console.log(`[${new Date().toLocaleTimeString()}] Serving terminal.svg...`);
      const config = loadConfig();
      const stats = await fetchGitHubStats(config.github.username);
      const discord = await fetchLanyardStatus(config.discord.discordId, config.github.username);
      const history = await updateDevLog(discord.activities, config.github.username);
      const svg = renderTerminalSvg(config, stats, discord, history);

      res.writeHead(200, {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(svg);
    } catch (err) {
      console.error('Error generating SVG:', err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Error generating SVG');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/terminal.svg`);
});
