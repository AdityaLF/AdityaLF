export interface Config {
  github: {
    username: string;
    host: string;
  };
  discord: {
    discordId: string;
  };
  appearance: {
    theme: {
      background: string;
      border: string;
      text: string;
      prompt: string;
      accent: string;
      yellow: string;
    };
  };
}

export interface GitHubStats {
  username: string;
  name: string;
  publicRepos: number;
  stars: number;
  commits: number;
  pullRequests: number;
  merges: number;
  viewsFormatted?: string;
  latestCommit: { message: string; repo: string; date: string };
  latestRepo: string;
  latestRepoDate?: string;
  latestReposList?: { name: string; timeAgo: string }[];
  latestCommitsList?: { message: string; repo: string; timeAgo: string; sha?: string }[];
  recentEvents: string[];
  recentEventsWithTime?: { action: string; timeAgo: string; eventId?: string }[];
}

export interface DiscordActivity {
  name: string;
  type: number;
  applicationId?: string;
  details?: string;
  state?: string;
  timestamps?: {
    start?: number;
    end?: number;
  };
  elapsedTime?: string;
}

export interface LanyardData {
  discord_user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
  };
  discord_status: 'online' | 'idle' | 'dnd' | 'offline';
  activities: Array<{
    id: string;
    name: string;
    type: number;
    application_id?: string;
    details?: string;
    state?: string;
    timestamps?: {
      start?: number;
      end?: number;
    };
  }>;
}

export interface DevLogRecord {
  id: string;
  details?: string;
  state?: string;
  startTime: string;
  endTime: string;
}

export interface HistoryData {
  records: DevLogRecord[];
}
