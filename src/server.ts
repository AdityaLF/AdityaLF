import http from 'http';
import { loadConfig } from './config.js';
import { fetchGitHubStats } from './services/github.service.js';
import { fetchLanyardStatus } from './services/lanyard.service.js';
import { updateDevLog } from './services/devlog.service.js';
import { renderTerminalSvg } from './renderers/terminal.renderer.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(async (req, res) => {
  const url = req.url || '/';

  if (url === '/terminal.svg' || url === '/' || url.startsWith('/terminal')) {
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
