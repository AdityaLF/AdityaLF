import fs from 'fs';
import path from 'path';
import { Config } from './types.js';

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    try {
      const raw = fs.readFileSync(envPath, 'utf-8');
      raw.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    } catch {}
  }
}

export const themePresets = {
  githubDark: {
    background: '#0d1117',
    border: '#30363d',
    text: '#c9d1d9',
    prompt: '#58a6ff',
    accent: '#79c0ff',
    yellow: '#e3b341',
  },
};

export function loadConfig(): Config {
  loadEnv();

  return {
    github: {
      username: process.env.GH_USERNAME || '',
      host: 'github.com',
    },
    discord: {
      discordId: process.env.DISCORD_ID || '',
    },
    appearance: {
      theme: themePresets.githubDark,
    },
  };
}
