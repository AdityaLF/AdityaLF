import fs from 'fs';
import path from 'path';
import { loadConfig } from './config.js';
import { fetchGitHubStats } from './services/github.service.js';
import { fetchLanyardStatus } from './services/lanyard.service.js';
import { updateDevLog } from './services/devlog.service.js';
import { renderTerminalSvg } from './renderers/terminal.renderer.js';

async function main() {
  // Load Config
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

main().catch((err) => {
  console.error('Error executing generator:', err);
  process.exit(1);
});
