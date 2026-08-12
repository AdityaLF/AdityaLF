import { GitHubStats } from '../types.js';
import { formatRelativeTime } from '../utils/time.js';
import {
  saveGitHubHistoryToFirestore,
  saveEventsToFirestore,
  fetchEventsFromFirestore,
  fetchCommitsFromFirestore,
  fetchReposFromFirestore,
  incrementAndFetchViewsFromFirestore,
} from './firestore.service.js';

export async function fetchGitHubStats(username: string): Promise<GitHubStats> {
  const token = process.env.GH_TOKEN;
  const headers: Record<string, string> = {
    'User-Agent': 'adityalf-readme',
    'Accept': 'application/vnd.github.v3+json',
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
    if (!userRes.ok) {
      throw new Error(`GitHub API user fetch failed: ${userRes.statusText}`);
    }
    const userData = (await userRes.json()) as any;

    const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers });
    const reposData = reposRes.ok ? ((await reposRes.json()) as any[]) : [];

    let totalStars = 0;
    reposData.forEach((repo) => {
      if (!repo.fork) {
        totalStars += repo.stargazers_count || 0;
      }
    });

    let pullRequests = 0;
    let merges = 0;
    let commits = 0;
    let searchCommitsList: { message: string; repo: string; timeAgo: string; sha?: string; date?: string }[] = [];

    try {
      const prRes = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:pr`, { headers });
      if (prRes.ok) {
        const prData = (await prRes.json()) as any;
        if (typeof prData.total_count === 'number') {
          pullRequests = prData.total_count;
        }
      }

      const mergedRes = await fetch(`https://api.github.com/search/issues?q=author:${username}+type:pr+is:merged`, { headers });
      if (mergedRes.ok) {
        const mergedData = (await mergedRes.json()) as any;
        if (typeof mergedData.total_count === 'number') {
          merges = mergedData.total_count;
        }
      }

      const commitHeaders = { ...headers, 'Accept': 'application/vnd.github.cloak-preview+json' };
      const commitRes = await fetch(`https://api.github.com/search/commits?q=author:${username}&sort=author-date&order=desc&per_page=10`, { headers: commitHeaders });
      if (commitRes.ok) {
        const commitData = (await commitRes.json()) as any;
        if (typeof commitData.total_count === 'number') {
          commits = commitData.total_count;
        }
        if (Array.isArray(commitData.items)) {
          for (const item of commitData.items) {
            if (searchCommitsList.length >= 3) break;
            const rawMsg = item.commit?.message || '';
            const cleanMsg = rawMsg.split('\n')[0].trim();
            const repoShort = item.repository?.name || item.repository?.full_name?.split('/')[1] || '';
            const commitDate = item.commit?.author?.date || item.commit?.committer?.date || new Date().toISOString();
            const shaStr = item.sha ? String(item.sha).slice(0, 7) : undefined;

            if (cleanMsg && !searchCommitsList.some((c) => c.message === cleanMsg || (c.sha && shaStr && c.sha === shaStr))) {
              searchCommitsList.push({
                message: cleanMsg,
                repo: repoShort,
                timeAgo: formatRelativeTime(commitDate),
                sha: shaStr,
                date: commitDate,
              });
            }
          }
        }
      }
    } catch {}

    let latestRepoName = reposData[0]?.name || '';
    let latestRepo = latestRepoName ? `${username}/${latestRepoName}` : '';
    let latestRepoDate = reposData[0]?.pushed_at || reposData[0]?.updated_at || new Date().toISOString();
    let latestCommit = {
      message: searchCommitsList[0]?.message || '',
      repo: searchCommitsList[0]?.repo || latestRepoName,
      date: searchCommitsList[0]?.date || new Date().toISOString(),
    };
    let recentEvents: string[] = [];
    let recentActivities: { action: string; timeAgo: string; eventId?: string }[] = [];
    let latestReposList: { name: string; timeAgo: string }[] = [];
    let latestCommitsList: { message: string; repo: string; timeAgo: string; sha?: string }[] = [];

    try {
      let events: any[] = [];
      const eventsRes = await fetch(`https://api.github.com/users/${username}/events/public`, { headers });
      if (eventsRes.ok) {
        events = (await eventsRes.json()) as any[];
      }

      if (events.length > 0) {
        const pushEvent = events.find((e) => e.type === 'PushEvent');
        if (pushEvent) {
          const repoShort = pushEvent.repo?.name ? pushEvent.repo.name.split('/')[1] || pushEvent.repo.name : latestRepoName;
          let msg = '';
          if (pushEvent.payload?.commits && pushEvent.payload.commits.length > 0) {
            msg = pushEvent.payload.commits[pushEvent.payload.commits.length - 1].message || '';
          }
          latestCommit = {
            message: msg ? msg.split('\n')[0] : (latestCommit.message || ''),
            repo: repoShort || latestCommit.repo,
            date: pushEvent.created_at || latestCommit.date || new Date().toISOString(),
          };
          latestRepoName = repoShort;
          latestRepo = `${username}/${repoShort}`;
        }

        latestReposList = reposData.slice(0, 3).map((r: any) => {
          const repoName = `${username}/${r.name}`;
          const repoDate = r.pushed_at || r.updated_at || new Date().toISOString();
          return {
            name: repoName,
            timeAgo: formatRelativeTime(repoDate),
          };
        });

        if (latestReposList.length < 3) {
          const fsRepos = await fetchReposFromFirestore(username);
          for (const fr of fsRepos) {
            if (latestReposList.length >= 3) break;
            if (!latestReposList.some((r) => r.name.toLowerCase() === fr.name.toLowerCase())) {
              latestReposList.push(fr);
            }
          }
        }

        latestCommitsList = [...searchCommitsList];
        if (latestCommitsList.length < 3) {
          for (const ev of events) {
            if (ev.type === 'PushEvent' && ev.payload?.commits && ev.payload.commits.length > 0) {
              const repoShort = ev.repo?.name ? ev.repo.name.split('/')[1] || ev.repo.name : 'repo';
              const timeAgo = formatRelativeTime(ev.created_at || new Date().toISOString());
              const commitsArr = [...ev.payload.commits].reverse();
              for (const c of commitsArr) {
                if (c.message && latestCommitsList.length < 3) {
                  const cleanMsg = c.message.split('\n')[0].trim();
                  if (!latestCommitsList.some((lc) => lc.message === cleanMsg)) {
                    latestCommitsList.push({
                      message: cleanMsg,
                      repo: repoShort,
                      timeAgo,
                      sha: c.sha ? String(c.sha).slice(0, 7) : undefined,
                    });
                  }
                }
              }
            }
            if (latestCommitsList.length >= 3) break;
          }
        }

        if (latestCommitsList.length < 3) {
          const fsCommits = await fetchCommitsFromFirestore(username);
          for (const fc of fsCommits) {
            if (latestCommitsList.length >= 3) break;
            if (!latestCommitsList.some((c) => c.message === fc.message || (c.sha && c.sha === fc.sha))) {
              latestCommitsList.push(fc);
            }
          }
        }

        if (latestCommitsList.length === 0 && latestCommit.message) {
          latestCommitsList.push({
            message: latestCommit.message,
            repo: latestCommit.repo,
            timeAgo: formatRelativeTime(latestCommit.date),
          });
        }

        const highPriorityActivities: { action: string; timeAgo: string; eventId?: string }[] = [];
        const pushActivities: { action: string; timeAgo: string; eventId?: string }[] = [];

        for (const ev of events) {
          const repoName = ev.repo?.name ? ev.repo.name.split('/')[1] || ev.repo.name : 'repo';
          const timeAgo = formatRelativeTime(ev.created_at || new Date().toISOString());
          const eventId = ev.id ? String(ev.id) : undefined;

          if (ev.type === 'PullRequestEvent') {
            const action = ev.payload?.action || 'opened';
            const num = ev.payload?.number || ev.payload?.pull_request?.number || '';
            const prStr = num ? ` #${num}` : '';
            const isMerged = action === 'closed' && ev.payload?.pull_request?.merged;
            const verb = isMerged ? 'Merged' : action.charAt(0).toUpperCase() + action.slice(1);
            const str = `${verb} PR${prStr} in ${repoName}`;
            highPriorityActivities.push({ action: str, timeAgo, eventId });
          } else if (ev.type === 'ReleaseEvent') {
            const relName = ev.payload?.release?.tag_name || ev.payload?.release?.name || '';
            if (!relName) break;
            const str = `Released ${relName} in ${repoName}`;
            highPriorityActivities.push({ action: str, timeAgo, eventId });
          } else if (ev.type === 'IssuesEvent') {
            const action = ev.payload?.action || 'opened';
            const num = ev.payload?.issue?.number || '';
            const issueStr = num ? ` #${num}` : '';
            const str = `${action.charAt(0).toUpperCase() + action.slice(1)} Issue${issueStr} in ${repoName}`;
            highPriorityActivities.push({ action: str, timeAgo, eventId });
          } else if (ev.type === 'CreateEvent') {
            const refType = ev.payload?.ref_type || 'repository';
            const ref = ev.payload?.ref ? ` ${ev.payload.ref}` : '';
            const str = `Created ${refType}${ref} in ${repoName}`;
            highPriorityActivities.push({ action: str, timeAgo, eventId });
          } else if (ev.type === 'PushEvent') {
            let mergeMsgMatch: string | null = null;
            if (ev.payload?.commits && ev.payload.commits.length > 0) {
              for (const c of ev.payload.commits) {
                if (c.message) {
                  const m = c.message.match(/Merge pull request #(\d+)/i);
                  if (m) {
                    mergeMsgMatch = `Merged PR #${m[1]} in ${repoName}`;
                    break;
                  }
                }
              }
            }

            if (mergeMsgMatch) {
              highPriorityActivities.push({ action: mergeMsgMatch, timeAgo, eventId });
            } else {
              const count = ev.payload?.size || ev.payload?.commits?.length || 1;
              const commitStr = count === 1 ? '1 commit' : `${count} commits`;
              const str = `Pushed ${commitStr} to ${repoName}`;
              pushActivities.push({ action: str, timeAgo, eventId });
            }
          }
        }

        const mergedActivities = [...highPriorityActivities, ...pushActivities];
        const uniqueMap = new Map<string, { action: string; timeAgo: string }>();
        for (const item of mergedActivities) {
          const key = `${item.action}|${item.timeAgo}`;
          if (!uniqueMap.has(key)) {
            uniqueMap.set(key, item);
          }
        }

        recentActivities = Array.from(uniqueMap.values()).slice(0, 3);
        recentEvents = recentActivities.map((a) => a.action);
      }
    } catch (err) {
      console.warn('Could not parse GitHub events:', err);
    }

    if (recentActivities.length < 3) {
      const fsEvents = await fetchEventsFromFirestore(username);
      for (const fe of fsEvents) {
        if (recentActivities.length >= 3) break;
        if (!recentActivities.some((a) => a.action.toLowerCase() === fe.action.toLowerCase())) {
          recentActivities.push(fe);
        }
      }
      recentEvents = recentActivities.map((a) => a.action);
    }

    const viewsFormatted = await incrementAndFetchViewsFromFirestore(username);

    const statsResult: GitHubStats = {
      username: userData.login || username,
      name: userData.name || userData.login || username,
      publicRepos: userData.public_repos || reposData.length,
      stars: totalStars,
      commits,
      pullRequests,
      merges,
      viewsFormatted,
      latestCommit,
      latestRepo,
      latestRepoDate,
      latestReposList,
      latestCommitsList,
      recentEvents,
      recentEventsWithTime: recentActivities,
    };

    saveGitHubHistoryToFirestore(username, statsResult).catch(() => {});
    saveEventsToFirestore(username, recentActivities).catch(() => {});

    return statsResult;
  } catch (error) {
    console.warn('Falling back to default stats due to API error:', error);
    return getFallbackGitHubStats(username);
  }
}

function getFallbackGitHubStats(username: string): GitHubStats {
  return {
    username,
    name: username,
    publicRepos: 0,
    stars: 0,
    commits: 0,
    pullRequests: 0,
    merges: 0,
    viewsFormatted: '0',
    latestCommit: {
      message: '',
      repo: '',
      date: new Date().toISOString(),
    },
    latestRepo: '',
    latestReposList: [],
    latestCommitsList: [],
    recentEvents: [],
    recentEventsWithTime: [],
  };
}
