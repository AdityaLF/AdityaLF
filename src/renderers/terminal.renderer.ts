import { Config, DiscordActivity, GitHubStats, HistoryData } from '../types.js';
import { escapeXml, truncateText } from '../utils/text.js';
import { formatRelativeTimeAgo } from '../utils/time.js';

interface LineItem {
  id: string;
  x: number;
  y: number;
  maxWidth: number;
  delay: number;
  contentSvg: string;
}

export function renderTerminalSvg(
  config: Config,
  stats: GitHubStats,
  discord: { status: string; activities: DiscordActivity[]; lastActive?: string },
  history: HistoryData
): string {
  const theme = config.appearance.theme;
  const dotWidth = 17;

  const titleColor = theme.yellow;
  const treeColor = theme.prompt;
  const labelColor = theme.text;
  const valueColor = theme.accent;
  const dotColor = '#484f58';
  const timeTextColor = '#8b949e';

  const sectionPadding = 18;
  const lineHeight = 19;

  const lineItems: LineItem[] = [];
  let lineIdCounter = 0;

  // Left column calculations
  const yDiscord = 88;
  let discordLinesCount = 0;
  let tLeft = 0.70;

  // Discord Rich Presence
  lineItems.push({
    id: `line-${lineIdCounter++}`,
    x: 25,
    y: yDiscord,
    maxWidth: 240,
    delay: tLeft,
    contentSvg: `<tspan fill="${titleColor}" font-weight="bold">Discord Rich Presence</tspan>`,
  });
  discordLinesCount += 1;
  tLeft += 0.12;

  const statusInfo = formatStatusText(discord.status);

  if (discord.activities.length > 0) {
    const activeList = discord.activities.slice(0, 2);
    const totalActivities = activeList.length;

    activeList.forEach((act, actIdx) => {
      const isLastAct = actIdx === totalActivities - 1;
      const actTreeChar = isLastAct ? '└─' : '├─';
      const stem1 = isLastAct ? '\u00A0\u00A0\u00A0' : '│\u00A0\u00A0';

      const appName = truncateText(act.name, 38);
      const yPos = yDiscord + discordLinesCount * lineHeight;
      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 25,
        y: yPos,
        maxWidth: 380,
        delay: tLeft,
        contentSvg: `<tspan fill="${treeColor}">${actTreeChar} </tspan><tspan fill="${theme.text}">${escapeXml(appName)}</tspan>`,
      });
      discordLinesCount += 1;
      tLeft += 0.12;

      const det = (act.details || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      const state = (act.state || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      const elapsed = (act.elapsedTime || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

      const level2Items: string[] = [];
      if (det && det.toLowerCase() !== act.name.toLowerCase()) {
        level2Items.push(truncateText(det, 36));
      }
      if (state && state.toLowerCase() !== act.name.toLowerCase() && state.toLowerCase() !== det.toLowerCase()) {
        level2Items.push(truncateText(state, 36));
      }

      if (level2Items.length > 0) {
        level2Items.forEach((text, l2Idx) => {
          const isLastL2 = l2Idx === level2Items.length - 1;
          const l2TreeChar = isLastL2 ? `${stem1}└─` : `${stem1}├─`;
          const yL2 = yDiscord + discordLinesCount * lineHeight;
          lineItems.push({
            id: `line-${lineIdCounter++}`,
            x: 25,
            y: yL2,
            maxWidth: 380,
            delay: tLeft,
            contentSvg: `<tspan fill="${treeColor}">${l2TreeChar} </tspan><tspan fill="${labelColor}">${escapeXml(text)}</tspan>`,
          });
          discordLinesCount += 1;
          tLeft += 0.12;
        });

        if (elapsed) {
          const stem2 = isLastAct ? '\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0' : '│\u00A0\u00A0\u00A0\u00A0\u00A0';
          const l3TreeChar = `${stem2}└─`;
          const yEl = yDiscord + discordLinesCount * lineHeight;
          lineItems.push({
            id: `line-${lineIdCounter++}`,
            x: 25,
            y: yEl,
            maxWidth: 380,
            delay: tLeft,
            contentSvg: `<tspan fill="${treeColor}">${l3TreeChar} </tspan><tspan fill="${timeTextColor}">${escapeXml(truncateText(elapsed, 32))}</tspan>`,
          });
          discordLinesCount += 1;
          tLeft += 0.12;
        }
      } else if (elapsed) {
        const l2TreeChar = `${stem1}└─`;
        const yEl = yDiscord + discordLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 25,
          y: yEl,
          maxWidth: 380,
          delay: tLeft,
          contentSvg: `<tspan fill="${treeColor}">${l2TreeChar} </tspan><tspan fill="${timeTextColor}">${escapeXml(truncateText(elapsed, 36))}</tspan>`,
        });
        discordLinesCount += 1;
        tLeft += 0.12;
      }
    });
  } else {
    if (discord.status === 'offline') {
      const lastActiveStr = discord.lastActive
        ? formatRelativeTimeAgo(discord.lastActive)
        : getLastActiveTime(history);

      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 25,
        y: yDiscord + 1 * lineHeight,
        maxWidth: 380,
        delay: tLeft,
        contentSvg: `<tspan fill="${treeColor}">└─ </tspan><tspan fill="${labelColor}">Offline</tspan>`,
      });
      discordLinesCount += 1;
      tLeft += 0.12;

      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 25,
        y: yDiscord + 2 * lineHeight,
        maxWidth: 380,
        delay: tLeft,
        contentSvg: `<tspan fill="${treeColor}">\u00A0\u00A0\u00A0└─ </tspan><tspan fill="${timeTextColor}">${escapeXml(lastActiveStr)}</tspan>`,
      });
      discordLinesCount += 1;
      tLeft += 0.12;
    } else {
      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 25,
        y: yDiscord + 1 * lineHeight,
        maxWidth: 380,
        delay: tLeft,
        contentSvg: `<tspan fill="${treeColor}">├─ </tspan><tspan fill="${statusInfo.color}">${escapeXml(statusInfo.label)}</tspan>`,
      });
      discordLinesCount += 1;
      tLeft += 0.12;

      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 25,
        y: yDiscord + 2 * lineHeight,
        maxWidth: 380,
        delay: tLeft,
        contentSvg: `<tspan fill="${treeColor}">└─ </tspan><tspan fill="#6e7681">No active session</tspan>`,
      });
      discordLinesCount += 1;
      tLeft += 0.12;
    }
  }

  // Right column calculations
  const yGitHub = 88;
  let ghLinesCount = 0;
  let tRight = 0.76;

  // Activity Overview
  lineItems.push({
    id: `line-${lineIdCounter++}`,
    x: 465,
    y: yGitHub,
    maxWidth: 240,
    delay: tRight,
    contentSvg: `<tspan fill="${titleColor}" font-weight="bold">Activity Overview</tspan>`,
  });
  ghLinesCount += 1;
  tRight += 0.12;

  const ghLines = [
    { label: 'Repos:', val: `${stats.publicRepos}` },
    { label: 'Commits:', val: `${stats.commits}` },
    { label: 'PRs:', val: `${stats.pullRequests}` },
    { label: 'Merges:', val: `${stats.merges}` },
    { label: 'Stars:', val: `${stats.stars}` },
  ];

  ghLines.forEach((item, idx) => {
    const dotsNeeded = Math.max(2, dotWidth - item.label.length);
    const dotsStr = `${'.'.repeat(dotsNeeded)} `;
    const treeChar = idx === ghLines.length - 1 ? '└─' : '├─';
    const yPos = yGitHub + ghLinesCount * lineHeight;

    let lineContent = `<tspan fill="${treeColor}">${treeChar} </tspan>`;
    lineContent += `<tspan fill="${labelColor}">${escapeXml(item.label)} </tspan>`;
    lineContent += `<tspan fill="${dotColor}">${dotsStr}</tspan>`;
    lineContent += `<tspan fill="${valueColor}">${escapeXml(item.val)}</tspan>`;

    lineItems.push({
      id: `line-${lineIdCounter++}`,
      x: 465,
      y: yPos,
      maxWidth: 380,
      delay: tRight,
      contentSvg: lineContent,
    });
    ghLinesCount += 1;
    tRight += 0.12;
  });

  // Recent Events
  const yRecentEvents = yDiscord + discordLinesCount * lineHeight + sectionPadding;
  let eventsLinesCount = 0;

  lineItems.push({
    id: `line-${lineIdCounter++}`,
    x: 25,
    y: yRecentEvents,
    maxWidth: 240,
    delay: tLeft,
    contentSvg: `<tspan fill="${titleColor}" font-weight="bold">Recent Events</tspan>`,
  });
  eventsLinesCount += 1;
  tLeft += 0.12;

  const eventsList = stats.recentEventsWithTime && stats.recentEventsWithTime.length > 0
    ? stats.recentEventsWithTime.slice(0, 3)
    : (stats.recentEvents || []).slice(0, 3).map((ev) => ({ action: ev, timeAgo: 'recently' }));

  if (eventsList.length > 0) {
    eventsList.forEach((ev, idx) => {
      const isLastRecord = idx === eventsList.length - 1;
      const nextTimeAgo = !isLastRecord ? eventsList[idx + 1].timeAgo : null;
      const isSameAsNextTime = ev.timeAgo === nextTimeAgo;

      const mainTreeChar = isLastRecord ? '└─' : '├─';
      const subTreeChar = isLastRecord ? '\u00A0\u00A0\u00A0└─' : '│\u00A0\u00A0└─';

      const yAct = yRecentEvents + eventsLinesCount * lineHeight;
      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 25,
        y: yAct,
        maxWidth: 380,
        delay: tLeft,
        contentSvg: `<tspan fill="${treeColor}">${mainTreeChar} </tspan><tspan fill="${labelColor}">${escapeXml(truncateText(ev.action, 38))}</tspan>`,
      });
      eventsLinesCount += 1;
      tLeft += 0.12;

      if (!isSameAsNextTime) {
        const yTime = yRecentEvents + eventsLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 25,
          y: yTime,
          maxWidth: 380,
          delay: tLeft,
          contentSvg: `<tspan fill="${treeColor}">${subTreeChar} </tspan><tspan fill="${timeTextColor}">${escapeXml(ev.timeAgo)}</tspan>`,
        });
        eventsLinesCount += 1;
        tLeft += 0.12;
      }
    });
  } else {
    const yNoEvents = yRecentEvents + eventsLinesCount * lineHeight;
    lineItems.push({
      id: `line-${lineIdCounter++}`,
      x: 25,
      y: yNoEvents,
      maxWidth: 380,
      delay: tLeft,
      contentSvg: `<tspan fill="${treeColor}">└─ </tspan><tspan fill="#6e7681">No recent events</tspan>`,
    });
    eventsLinesCount += 1;
    tLeft += 0.12;
  }

  // Latest Repos
  const reposList = stats.latestReposList && stats.latestReposList.length > 0
    ? stats.latestReposList.slice(0, 3)
    : [];

  const yLatestRepo = yGitHub + ghLinesCount * lineHeight + sectionPadding;
  let repoLinesCount = 0;

  lineItems.push({
    id: `line-${lineIdCounter++}`,
    x: 465,
    y: yLatestRepo,
    maxWidth: 240,
    delay: tRight,
    contentSvg: `<tspan fill="${titleColor}" font-weight="bold">Latest Repos</tspan>`,
  });
  repoLinesCount += 1;
  tRight += 0.12;

  if (reposList.length > 0) {
    reposList.forEach((r, idx) => {
      const isLast = idx === reposList.length - 1;
      const nextTimeAgo = !isLast ? reposList[idx + 1].timeAgo : null;
      const isSameAsNextTime = r.timeAgo === nextTimeAgo;

      const mainTreeChar = isLast ? '└─' : '├─';
      const subTreeChar = isLast ? '\u00A0\u00A0\u00A0└─' : '│\u00A0\u00A0└─';

      const yRepo = yLatestRepo + repoLinesCount * lineHeight;
      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 465,
        y: yRepo,
        maxWidth: 380,
        delay: tRight,
        contentSvg: `<tspan fill="${treeColor}">${mainTreeChar} </tspan><tspan fill="${theme.text}">${escapeXml(truncateText(r.name, 38))}</tspan>`,
      });
      repoLinesCount += 1;
      tRight += 0.12;

      if (!isSameAsNextTime) {
        const yTime = yLatestRepo + repoLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 465,
          y: yTime,
          maxWidth: 380,
          delay: tRight,
          contentSvg: `<tspan fill="${treeColor}">${subTreeChar} </tspan><tspan fill="${timeTextColor}">${escapeXml(r.timeAgo)}</tspan>`,
        });
        repoLinesCount += 1;
        tRight += 0.12;
      }
    });
  } else {
    const yNoRepos = yLatestRepo + repoLinesCount * lineHeight;
    lineItems.push({
      id: `line-${lineIdCounter++}`,
      x: 465,
      y: yNoRepos,
      maxWidth: 380,
      delay: tRight,
      contentSvg: `<tspan fill="${treeColor}">└─ </tspan><tspan fill="#6e7681">No recent repositories</tspan>`,
    });
    repoLinesCount += 1;
    tRight += 0.12;
  }

  // Development Log
  const yHistory = yRecentEvents + eventsLinesCount * lineHeight + sectionPadding;
  let historyLinesCount = 0;

  lineItems.push({
    id: `line-${lineIdCounter++}`,
    x: 25,
    y: yHistory,
    maxWidth: 240,
    delay: tLeft,
    contentSvg: `<tspan fill="${titleColor}" font-weight="bold">Development Log</tspan>`,
  });
  historyLinesCount += 1;
  tLeft += 0.12;

  const completedRecords = (history.records || []).filter(
    (rec) =>
      !isRecordCurrentlyActive(rec, discord.activities) &&
      rec.details &&
      rec.details.trim().length > 0 &&
      rec.state &&
      rec.state.trim().length > 0
  );
  const sortedRecords = [...completedRecords].sort((a, b) => {
    const timeA = new Date(a.endTime || a.startTime).getTime();
    const timeB = new Date(b.endTime || b.startTime).getTime();
    return timeB - timeA;
  });

  const uniqueRecords: typeof completedRecords = [];
  const seenKeys = new Set<string>();

  for (const rec of sortedRecords) {
    const detKey = (rec.details || '').trim().toLowerCase();
    const stateKey = (rec.state || '').trim().toLowerCase();
    const key = `${detKey}|${stateKey}`;
    if (key && key !== '|' && !seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueRecords.push(rec);
    }
  }

  const vsRecords = uniqueRecords.length > 0 ? uniqueRecords.slice(0, 3) : [];

  if (vsRecords.length > 0) {
    const totalRecords = vsRecords.length;
    vsRecords.forEach((rec, idx) => {
      const isLastRecord = idx === totalRecords - 1;
      const timeAgoStr = formatRelativeTimeAgo(rec.endTime || rec.startTime);

      const topText = (rec.details || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
      const bottomText = (rec.state || '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

      const hasBoth = topText && bottomText && topText.toLowerCase() !== bottomText.toLowerCase();

      if (hasBoth) {
        const mainTreeChar = isLastRecord ? '└─' : '├─';
        const stem1 = isLastRecord ? '\u00A0\u00A0\u00A0' : '│\u00A0\u00A0';

        const yTop = yHistory + historyLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 25,
          y: yTop,
          maxWidth: 380,
          delay: tLeft,
          contentSvg: `<tspan fill="${treeColor}">${mainTreeChar} </tspan><tspan fill="${theme.text}">${escapeXml(truncateText(topText, 42))}</tspan>`,
        });
        historyLinesCount += 1;
        tLeft += 0.12;

        const itemTreeChar = `${stem1}└─`;
        const stem2 = `${stem1}\u00A0\u00A0\u00A0`;
        const yBottom = yHistory + historyLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 25,
          y: yBottom,
          maxWidth: 380,
          delay: tLeft,
          contentSvg: `<tspan fill="${treeColor}">${itemTreeChar} </tspan><tspan fill="${labelColor}">${escapeXml(truncateText(bottomText, 38))}</tspan>`,
        });
        historyLinesCount += 1;
        tLeft += 0.12;

        const timeTreeChar = `${stem2}└─`;
        const yTime = yHistory + historyLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 25,
          y: yTime,
          maxWidth: 380,
          delay: tLeft,
          contentSvg: `<tspan fill="${treeColor}">${timeTreeChar} </tspan><tspan fill="${timeTextColor}">${escapeXml(timeAgoStr)}</tspan>`,
        });
        historyLinesCount += 1;
        tLeft += 0.12;
      } else {
        const mainTreeChar = isLastRecord ? '└─' : '├─';
        const stem1 = isLastRecord ? '\u00A0\u00A0\u00A0' : '│\u00A0\u00A0';
        const singleText = topText;

        const ySingle = yHistory + historyLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 25,
          y: ySingle,
          maxWidth: 380,
          delay: tLeft,
          contentSvg: `<tspan fill="${treeColor}">${mainTreeChar} </tspan><tspan fill="${theme.text}">${escapeXml(truncateText(singleText, 42))}</tspan>`,
        });
        historyLinesCount += 1;
        tLeft += 0.12;

        const timeTreeChar = `${stem1}└─`;
        const yTime = yHistory + historyLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 25,
          y: yTime,
          maxWidth: 380,
          delay: tLeft,
          contentSvg: `<tspan fill="${treeColor}">${timeTreeChar} </tspan><tspan fill="${timeTextColor}">${escapeXml(timeAgoStr)}</tspan>`,
        });
        historyLinesCount += 1;
        tLeft += 0.12;
      }
    });
  } else {
    const yNoHist = yHistory + historyLinesCount * lineHeight;
    lineItems.push({
      id: `line-${lineIdCounter++}`,
      x: 25,
      y: yNoHist,
      maxWidth: 380,
      delay: tLeft,
      contentSvg: `<tspan fill="${treeColor}">└─ </tspan><tspan fill="#6e7681">no activity recorded</tspan>`,
    });
    historyLinesCount += 1;
    tLeft += 0.12;
  }
  const endLeftY = yHistory + historyLinesCount * lineHeight;

  // Latest Commits
  const commitsList = stats.latestCommitsList && stats.latestCommitsList.length > 0
    ? stats.latestCommitsList.slice(0, 3)
    : [];

  const yLatestCommit = yLatestRepo + repoLinesCount * lineHeight + sectionPadding;
  let commitLinesCount = 0;

  lineItems.push({
    id: `line-${lineIdCounter++}`,
    x: 465,
    y: yLatestCommit,
    maxWidth: 240,
    delay: tRight,
    contentSvg: `<tspan fill="${titleColor}" font-weight="bold">Latest Commits</tspan>`,
  });
  commitLinesCount += 1;
  tRight += 0.12;

  if (commitsList.length > 0) {
    commitsList.forEach((c, idx) => {
      const isLast = idx === commitsList.length - 1;
      const nextTimeAgo = !isLast ? commitsList[idx + 1].timeAgo : null;
      const isSameAsNextTime = c.timeAgo === nextTimeAgo;

      const mainTreeChar = isLast ? '└─' : '├─';
      const subTreeChar = isLast ? '\u00A0\u00A0\u00A0└─' : '│\u00A0\u00A0└─';
      const msgStr = c.message;

      const yCommit = yLatestCommit + commitLinesCount * lineHeight;
      lineItems.push({
        id: `line-${lineIdCounter++}`,
        x: 465,
        y: yCommit,
        maxWidth: 380,
        delay: tRight,
        contentSvg: `<tspan fill="${treeColor}">${mainTreeChar} </tspan><tspan fill="${theme.text}">${escapeXml(truncateText(msgStr, 38))}</tspan>`,
      });
      commitLinesCount += 1;
      tRight += 0.12;

      if (!isSameAsNextTime) {
        const yTime = yLatestCommit + commitLinesCount * lineHeight;
        lineItems.push({
          id: `line-${lineIdCounter++}`,
          x: 465,
          y: yTime,
          maxWidth: 380,
          delay: tRight,
          contentSvg: `<tspan fill="${treeColor}">${subTreeChar} </tspan><tspan fill="${timeTextColor}">${escapeXml(c.timeAgo)}</tspan>`,
        });
        commitLinesCount += 1;
        tRight += 0.12;
      }
    });
  } else {
    const yNoCommit = yLatestCommit + commitLinesCount * lineHeight;
    lineItems.push({
      id: `line-${lineIdCounter++}`,
      x: 465,
      y: yNoCommit,
      maxWidth: 380,
      delay: tRight,
      contentSvg: `<tspan fill="${treeColor}">└─ </tspan><tspan fill="#6e7681">No recent commits</tspan>`,
    });
    commitLinesCount += 1;
    tRight += 0.12;
  }
  const endRightY = yLatestCommit + commitLinesCount * lineHeight;

  const maxY = Math.max(endLeftY, endRightY);
  const footerLineY = maxY + 15;
  const footerTextY = footerLineY + 20;
  const svgWidth = 885;
  const svgHeight = footerTextY + 15;

  const maxAnimTime = Math.max(tLeft, tRight) + 0.10;
  const footerDelayStr = maxAnimTime.toFixed(2);
  const footerTextDelayStr = (maxAnimTime + 0.25).toFixed(2);

  const now = new Date();
  const utcString = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`;
  const viewsVal = stats.viewsFormatted || '0';

  // Build clipPaths & styles per individual line
  let clipDefsSvg = '';
  let clipStyleSvg = '';
  let renderedLinesSvg = '';

  lineItems.forEach((item) => {
    const delayStr = item.delay.toFixed(2);

    clipDefsSvg += `    <clipPath id="${item.id}">\n`;
    clipDefsSvg += `      <rect x="${item.x}" y="${item.y - 14}" width="0" height="20">\n`;
    clipDefsSvg += `        <animate attributeName="width" from="0" to="${item.maxWidth}" dur="0.22s" begin="${delayStr}s" fill="freeze" calcMode="linear" />\n`;
    clipDefsSvg += `      </rect>\n`;
    clipDefsSvg += `    </clipPath>\n`;

    clipStyleSvg += `    .${item.id} { opacity: 0; animation: fadeIn 0.10s ease-out forwards; animation-delay: ${delayStr}s; clip-path: url(#${item.id}); }\n`;

    renderedLinesSvg += `    <g class="${item.id}">\n`;
    renderedLinesSvg += `      <text x="${item.x}" y="${item.y}">${item.contentSvg}</text>\n`;
    renderedLinesSvg += `    </g>\n`;
  });

  const promptUsername = escapeXml(stats.username.toLowerCase());
  const promptPrefix = `guest@github:~$ `;
  const cmdText = `gh profile view ${promptUsername}`;

  const charWidth = 8.41;
  const promptStartX = 25;
  const promptTextLen = 15;
  const promptEndXNum = promptStartX + promptTextLen * charWidth;

  const cmdWidthNum = cmdText.length * charWidth;
  const clipMaxWidth = (promptEndXNum + cmdWidthNum + 15).toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" fill="none" xml:space="preserve">
  <defs>
    <clipPath id="typewriter-clip">
      <rect x="0" y="38" width="0" height="26">
        <animate attributeName="width" from="140" to="${clipMaxWidth}" dur="0.55s" begin="0.10s" fill="freeze" calcMode="linear" />
      </rect>
    </clipPath>
    <clipPath id="footer-line-clip">
      <rect x="442.5" y="${footerLineY - 2}" width="0" height="4">
        <animate attributeName="x" from="442.5" to="25" dur="0.25s" begin="${footerDelayStr}s" fill="freeze" calcMode="linear" />
        <animate attributeName="width" from="0" to="${svgWidth - 50}" dur="0.25s" begin="${footerDelayStr}s" fill="freeze" calcMode="linear" />
      </rect>
    </clipPath>
${clipDefsSvg}  </defs>

  <style>
    .bg { fill: ${theme.background}; }
    .header { fill: #161b22; }
    .header-text { font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; fill: #8b949e; font-weight: bold; }
    .term-text { font-family: ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace; font-size: 14px; white-space: pre; }
    .btn-red { fill: #ff5f56; }
    .btn-yellow { fill: #ffbd2e; }
    .btn-green { fill: #27c93f; }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .animate-footer-line { opacity: 0; animation: fadeIn 0.1s ease-out forwards; animation-delay: ${footerDelayStr}s; }
    .animate-footer-text { opacity: 0; animation: fadeIn 0.25s ease-out forwards; animation-delay: ${footerTextDelayStr}s; }

${clipStyleSvg}  </style>

  <!-- Terminal Window Background -->
  <rect x="1" y="1" width="${svgWidth - 2}" height="${svgHeight - 2}" class="bg" rx="12" ry="12" />

  <!-- Terminal Header Bar -->
  <path d="M 1 12 Q 1 1 12 1 L ${svgWidth - 13} 1 Q ${svgWidth - 1} 1 ${svgWidth - 1} 12 L ${svgWidth - 1} 36 L 1 36 Z" class="header" />
  <line x1="1" y1="36" x2="${svgWidth - 1}" y2="36" stroke="${theme.border}" stroke-width="1" />

  <!-- Terminal Outer Window Border -->
  <rect x="1" y="1" width="${svgWidth - 2}" height="${svgHeight - 2}" fill="none" stroke="${theme.border}" stroke-width="1" rx="12" ry="12" />

  <!-- Control Buttons -->
  <circle cx="20" cy="18" r="6" class="btn-red" />
  <circle cx="40" cy="18" r="6" class="btn-yellow" />
  <circle cx="60" cy="18" r="6" class="btn-green" />

  <!-- Header Title -->
  <text x="${svgWidth / 2}" y="22" text-anchor="middle" class="header-text">~/github/${promptUsername}</text>

  <!-- Main Terminal Content -->
  <g class="term-text">
    <!-- Prompt Line with Real Typewriter Animation -->
    <g>
      <text x="25" y="56" fill="${theme.prompt}" font-weight="bold">${promptPrefix}<tspan fill="${theme.text}" font-weight="normal" clip-path="url(#typewriter-clip)">${cmdText}</tspan></text>
    </g>

${renderedLinesSvg}
    <!-- Terminal Footer Line -->
    <g class="animate-footer-line">
      <line x1="25" y1="${footerLineY}" x2="${svgWidth - 25}" y2="${footerLineY}" stroke="#30363d" stroke-width="1" clip-path="url(#footer-line-clip)" />
    </g>
    <g class="animate-footer-text">
      <text x="25" y="${footerTextY}" fill="#8b949e" font-size="12px">Profile Views: <tspan fill="${theme.accent}">${escapeXml(viewsVal)}</tspan></text>
      <text x="${svgWidth - 25}" y="${footerTextY}" text-anchor="end" fill="#8b949e" font-size="12px">Last Updated: <tspan fill="${theme.accent}">${utcString}</tspan></text>
    </g>
  </g>
</svg>`;
}

function formatStatusText(rawStatus: string): { label: string; color: string } {
  const status = (rawStatus || 'offline').toLowerCase();
  if (status === 'online' || status === 'idle' || status === 'dnd') {
    return { label: 'Online', color: '#c9d1d9' };
  }
  return { label: 'Offline', color: '#c9d1d9' };
}

function getLastActiveTime(history: HistoryData): string {
  if (history.records && history.records.length > 0) {
    const latest = history.records[0];
    return formatRelativeTimeAgo(latest.endTime || latest.startTime);
  }
  return 'no last active recorded';
}

function isRecordCurrentlyActive(rec: { details?: string; state?: string }, activities: DiscordActivity[]): boolean {
  if (!activities || activities.length === 0) return false;

  const activeAct = activities.find((act) => {
    const name = (act.name || '').toLowerCase();
    return name.includes('visual studio code') || name === 'vscode' || name === 'code';
  });

  if (!activeAct) return false;

  const clean = (s: string) => (s || '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/:\d+(:\d+)?$/, '').trim().toLowerCase();

  const activeState = clean(activeAct.state || '');
  const recState = clean(rec.state || '');

  if (activeState && recState && recState.length > 2 && activeState.includes(recState)) {
    return true;
  }

  return false;
}
