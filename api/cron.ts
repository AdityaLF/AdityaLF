import type { IncomingMessage, ServerResponse } from 'http';
import { loadConfig } from '../dist/config.js';
import { fetchGitHubStats } from '../dist/services/github.service.js';
import { fetchLanyardStatus } from '../dist/services/lanyard.service.js';
import { updateDevLog } from '../dist/services/devlog.service.js';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
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

    const authHeader = req.headers['authorization'];
    const host = req.headers.host || 'localhost';
    const reqUrl = new URL(req.url || '/', `http://${host}`);
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

    console.log(`[${new Date().toISOString()}] Executing Cron Sync (Vercel / cron-job.org)...`);
    const config = loadConfig();

    const stats = await fetchGitHubStats(config.github.username);
    const discord = await fetchLanyardStatus(config.discord.discordId, config.github.username);
    const history = await updateDevLog(discord.activities, config.github.username);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.statusCode = 200;
    res.end(
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
        message: 'Firestore successfully synced via Cron Job!',
      })
    );
  } catch (err: any) {
    console.error('Error executing Cron Sync endpoint:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: err?.message || String(err),
      })
    );
  }
}
