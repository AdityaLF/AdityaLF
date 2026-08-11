import { DiscordActivity, HistoryData, DevLogRecord } from '../types.js';
import { saveVSCodeHistoryToFirestore, fetchVSCodeHistoryFromFirestore } from './firestore.service.js';

export async function updateDevLog(activities: DiscordActivity[], username?: string): Promise<HistoryData> {
  let records: DevLogRecord[] = [];
  if (username) {
    try {
      records = await fetchVSCodeHistoryFromFirestore(username);
    } catch {
      records = [];
    }
  }

  const history: HistoryData = { records };

  const vsCodeAct = activities.find((act) => isVSCodeActivity(act));
  if (!vsCodeAct) {
    if (username && history.records.length > 0) {
      saveVSCodeHistoryToFirestore(username, history).catch(() => {});
    }
    return history;
  }

  const details = parseDetails(vsCodeAct);
  const state = parseState(vsCodeAct);

  if (!details || !state) {
    if (username && history.records.length > 0) {
      saveVSCodeHistoryToFirestore(username, history).catch(() => {});
    }
    return history;
  }

  const startTime = vsCodeAct.timestamps?.start
    ? new Date(vsCodeAct.timestamps.start).toISOString()
    : new Date().toISOString();
  const nowStr = new Date().toISOString();

  const existingIdx = history.records.findIndex((r) => {
    if (state && r.state) {
      return r.state.toLowerCase() === state.toLowerCase();
    }
    if (details && r.details && !state && !r.state) {
      return r.details.toLowerCase() === details.toLowerCase();
    }
    return false;
  });

  if (existingIdx >= 0) {
    history.records[existingIdx].endTime = nowStr;
    if (details) history.records[existingIdx].details = details;
    if (state) history.records[existingIdx].state = state;
  } else {
    const newRecord: DevLogRecord = {
      id: `log_${Date.now()}`,
      details: details || undefined,
      state: state || undefined,
      startTime,
      endTime: nowStr,
    };
    history.records.unshift(newRecord);
  }

  if (history.records.length > 50) {
    history.records = history.records.slice(0, 50);
  }

  if (username) {
    saveVSCodeHistoryToFirestore(username, history).catch(() => {});
  }
  return history;
}

function isVSCodeActivity(act: DiscordActivity): boolean {
  const name = (act.name || '').toLowerCase();
  return name.includes('visual studio code') || name === 'code' || name === 'vscode';
}

function parseDetails(act: DiscordActivity): string {
  if (act.details) {
    const cleaned = act.details.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (cleaned && !cleaned.toLowerCase().includes('not in a file')) {
      return cleaned;
    }
  }
  return '';
}

function parseState(act: DiscordActivity): string {
  if (act.state) {
    const cleaned = act.state.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (cleaned && !cleaned.toLowerCase().includes('not in a file')) {
      return cleaned;
    }
  }
  return '';
}


export function groupHistoryByDate(records: DevLogRecord[]): Record<string, DevLogRecord[]> {
  const grouped: Record<string, DevLogRecord[]> = {
    Today: [],
    Yesterday: [],
    Earlier: [],
  };

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  records.forEach((record) => {
    const recordDate = new Date(record.startTime).toISOString().split('T')[0];
    if (recordDate === todayStr) {
      grouped.Today.push(record);
    } else if (recordDate === yesterdayStr) {
      grouped.Yesterday.push(record);
    } else {
      grouped.Earlier.push(record);
    }
  });

  return grouped;
}
