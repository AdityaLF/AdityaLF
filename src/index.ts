import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'fs';
import path from 'path';
import { loadConfig } from './config.js';
import { fetchGitHubStats } from './services/github.service.js';
import { fetchLanyardStatus } from './services/lanyard.service.js';
import { updateDevLog } from './services/devlog.service.js';
import { renderTerminalSvg } from './renderers/terminal.renderer.js';

export default async function handler(_req?: IncomingMessage, res?: ServerResponse) {
  if (_req && res) {
    const host = _req.headers.host || 'localhost';
    const reqUrl = new URL(_req.url || '/', `http://${host}`);
    const pathname = reqUrl.pathname;

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

        const config = loadConfig();
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
            discordStatus: discord.status,
            devLogCount: history.records?.length || 0,
            message: 'Discord last active status and DevLog successfully synced to Firestore via Cron Job',
          })
        );
      } catch (err: any) {
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
  }

  try {
    const config = loadConfig();
    const stats = await fetchGitHubStats(config.github.username);
    const discord = await fetchLanyardStatus(config.discord.discordId, config.github.username);
    const history = await updateDevLog(discord.activities, config.github.username);
    const svg = renderTerminalSvg(config, stats, discord, history);

    if (res) {
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'max-age=0, no-cache, no-store, must-revalidate');
      res.statusCode = 200;
      res.end(svg);
    }
    return svg;
  } catch (err) {
    console.error('Error generating Vercel terminal SVG:', err);
    if (res) {
      res.statusCode = 500;
      res.end('Error generating SVG');
    }
    throw err;
  }
}

async function main() {
  const config = loadConfig();
  const username = config.github.username;
  console.log('Generating terminal.svg...');

  console.log('Fetching Activity Overview...');
  const stats = await fetchGitHubStats(username);

  console.log('Fetching Discord Rich Presence...');
  const discord = await fetchLanyardStatus(config.discord.discordId, username);

  console.log('Updating Development Log...');
  const history = await updateDevLog(discord.activities, username);

  console.log('Rendering terminal.svg...');
  const svg = renderTerminalSvg(config, stats, discord, history);
  const svgPath = path.resolve(process.cwd(), 'terminal.svg');
  fs.writeFileSync(svgPath, svg, 'utf-8');
  console.log(`Saved ${svgPath}`);

  console.log('Terminal generation complete.');
}

if (!process.env.VERCEL && (process.argv[1]?.endsWith('index.js') || process.argv[1]?.endsWith('index.ts'))) {
  main().catch((err) => {
    console.error('Error executing generator:', err);
    process.exit(1);
  });
}


