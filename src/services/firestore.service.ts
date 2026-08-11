import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore, FieldValue, Firestore } from 'firebase-admin/firestore';
import { GitHubStats, HistoryData, DevLogRecord } from '../types.js';
import { createShortHash } from '../utils/text.js';

let db: Firestore | null = null;
let isInitialized = false;

export function getFirestore(): Firestore | null {
  if (isInitialized) return db;
  isInitialized = true;

  try {
    if (getApps().length > 0) {
      db = getAdminFirestore();
      return db;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (projectId && clientEmail && privateKey) {
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      db = getAdminFirestore();
      console.log(`Firestore connected (${projectId}).`);
    } else {
      console.log('No Firestore credentials provided. Running in local mode.');
    }
    if (db) {
      db.settings({ ignoreUndefinedProperties: true });
    }
  } catch (err) {
    console.warn('Failed to initialize Firestore:', err);
    db = null;
  }

  return db;
}

export async function saveGitHubHistoryToFirestore(_username: string, stats: GitHubStats): Promise<void> {
  const firestore = getFirestore();
  if (!firestore) return;

  try {
    const batch = firestore.batch();

    if (stats.latestReposList && stats.latestReposList.length > 0) {
      const reposCol = firestore.collection('latest_repos');
      for (const repo of stats.latestReposList) {
        const repoShort = repo.name.includes('/') ? repo.name.split('/')[1] : repo.name;
        const cleanDocId = repoShort.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
        const docRef = reposCol.doc(cleanDocId);
        batch.set(
          docRef,
          {
            repoName: repo.name,
            timeAgo: repo.timeAgo || '',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    if (stats.latestCommitsList && stats.latestCommitsList.length > 0) {
      const commitsCol = firestore.collection('latest_commits');
      for (const commit of stats.latestCommitsList) {
        const commitSha = commit.sha
          ? commit.sha
          : createShortHash(`${commit.repo}_${commit.message}`);
        const cleanDocId = `commit_${commitSha}`;
        const docRef = commitsCol.doc(cleanDocId);
        batch.set(
          docRef,
          {
            repo: commit.repo,
            message: commit.message,
            timeAgo: commit.timeAgo,
            sha: commitSha,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
    }

    await batch.commit();
    if (stats.latestReposList && stats.latestReposList.length > 0) {
      console.log('Saved Latest Repos to Firestore.');
    }
    if (stats.latestCommitsList && stats.latestCommitsList.length > 0) {
      console.log('Saved Latest Commits to Firestore.');
    }

    pruneOldDocuments('latest_repos', 10).catch(() => {});
    pruneOldDocuments('latest_commits', 10).catch(() => {});
  } catch (err) {
    console.warn('Error saving Latest Repos/Commits to Firestore:', err);
  }
}

export async function fetchCommitsFromFirestore(_username: string, limitCount = 10): Promise<{ message: string; repo: string; timeAgo: string; sha?: string }[]> {
  const firestore = getFirestore();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('latest_commits')
      .limit(limitCount)
      .get();

    if (snapshot.empty) return [];

    const commits = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          message: (data.message || '').trim(),
          repo: data.repo || '',
          timeAgo: data.timeAgo || '',
          sha: data.sha,
          updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.timestamp ? new Date(data.timestamp).getTime() : 0),
        };
      })
      .filter((c) => c.message.length > 0);

    return commits
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ message, repo, timeAgo, sha }) => ({ message, repo, timeAgo, sha }));
  } catch (err) {
    console.warn('Error fetching commits from Firestore:', err);
    return [];
  }
}

export async function fetchReposFromFirestore(_username: string, limitCount = 10): Promise<{ name: string; timeAgo: string }[]> {
  const firestore = getFirestore();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('latest_repos')
      .limit(limitCount)
      .get();

    if (snapshot.empty) return [];

    const repos = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        name: data.repoName || doc.id,
        timeAgo: data.timeAgo || '',
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : 0,
      };
    });

    return repos
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ name, timeAgo }) => ({ name, timeAgo }));
  } catch (err) {
    console.warn('Error fetching repos from Firestore:', err);
    return [];
  }
}

export async function saveEventsToFirestore(
  _username: string,
  activities: { action: string; timeAgo: string; eventId?: string }[]
): Promise<void> {
  const firestore = getFirestore();
  if (!firestore || !activities || activities.length === 0) return;

  try {
    const batch = firestore.batch();
    const collectionRef = firestore.collection('recent_events');

    for (const act of activities) {
      const cleanId = act.eventId
        ? `event_${act.eventId}`
        : `event_${act.action.toLowerCase().replace(/[^a-z0-9_-]/g, '_').slice(0, 80)}`;
      const docRef = collectionRef.doc(cleanId);
      batch.set(
        docRef,
        {
          action: act.action,
          timeAgo: act.timeAgo,
          eventId: act.eventId || null,
          timestamp: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`Saved Recent Events to Firestore.`);

    pruneOldDocuments('recent_events', 10).catch(() => {});
  } catch (err) {
    console.warn('Error saving Recent Events to Firestore:', err);
  }
}

export async function fetchEventsFromFirestore(_username: string, limitCount = 10): Promise<{ action: string; timeAgo: string }[]> {
  const firestore = getFirestore();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('recent_events')
      .limit(limitCount)
      .get();

    if (snapshot.empty) return [];

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        action: data.action || '',
        timeAgo: data.timeAgo || '',
      };
    });
  } catch (err) {
    console.warn('Error fetching events from Firestore:', err);
    return [];
  }
}

export async function saveVSCodeHistoryToFirestore(_username: string, history: HistoryData): Promise<void> {
  const firestore = getFirestore();
  if (!firestore || !history.records || history.records.length === 0) return;

  try {
    const batch = firestore.batch();
    const collectionRef = firestore.collection('development_log');

    for (const record of history.records) {
      const docRef = collectionRef.doc(record.id);
      batch.set(
        docRef,
        {
          id: record.id,
          details: record.details || null,
          state: record.state || null,
          startTime: record.startTime,
          endTime: record.endTime,
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`Saved Development Log to Firestore.`);

    pruneOldDocuments('development_log', 10).catch(() => {});
  } catch (err) {
    console.warn('Error saving Development Log to Firestore:', err);
  }
}

export async function pruneOldDocuments(collectionName: string, maxItems: number = 30): Promise<void> {
  const firestore = getFirestore();
  if (!firestore) return;

  try {
    const snapshot = await firestore.collection(collectionName).get();
    if (snapshot.size <= maxItems) return;

    const getTime = (data: any) => {
      if (data.endTime) return new Date(data.endTime).getTime();
      if (data.startTime) return new Date(data.startTime).getTime();
      if (data.timestamp) return new Date(data.timestamp).getTime();
      if (data.updatedAt?.toMillis) return data.updatedAt.toMillis();
      return 0;
    };

    const docs = snapshot.docs.map((doc) => ({
      ref: doc.ref,
      time: getTime(doc.data()),
    }));

    docs.sort((a, b) => b.time - a.time);

    const docsToDelete = docs.slice(maxItems);
    const batch = firestore.batch();
    for (const doc of docsToDelete) {
      batch.delete(doc.ref);
    }
    await batch.commit();
    console.log(`Auto-pruned ${docsToDelete.length} old documents from '${collectionName}' (kept latest ${maxItems}).`);
  } catch (err) {
    console.warn(`Auto-prune error for '${collectionName}':`, err);
  }
}

export async function fetchVSCodeHistoryFromFirestore(_username: string, limitCount = 50): Promise<DevLogRecord[]> {
  const firestore = getFirestore();
  if (!firestore) return [];

  try {
    const snapshot = await firestore
      .collection('development_log')
      .limit(limitCount)
      .get();

    if (snapshot.empty) return [];

    const records: DevLogRecord[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: data.id || doc.id,
        details: data.details || undefined,
        state: data.state || data.project || data.fileName || undefined,
        startTime: data.startTime || new Date().toISOString(),
        endTime: data.endTime || new Date().toISOString(),
      };
    });

    return records.sort((a, b) => {
      const timeA = new Date(a.endTime || a.startTime).getTime();
      const timeB = new Date(b.endTime || b.startTime).getTime();
      return timeB - timeA;
    });
  } catch (err) {
    console.warn('Error fetching Development Log from Firestore:', err);
    return [];
  }
}

export async function saveViewsToFirestore(_username: string, viewsCount: string): Promise<void> {
  const firestore = getFirestore();
  if (!firestore) return;

  try {
    const docRef = firestore.collection('profile_views').doc('total');
    await docRef.set(
      {
        viewsCount,
        lastUpdated: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`Saved Profile Views (${viewsCount}) to Firestore.`);
  } catch (err) {
    console.warn('Error saving Profile Views to Firestore:', err);
  }
}

export async function saveDiscordPresenceToFirestore(
  _username: string,
  discordId: string,
  status: string,
  activities: any[]
): Promise<string | null> {
  const firestore = getFirestore();
  if (!firestore) return null;

  try {
    const docRef = firestore.collection('last_active').doc('status');
    const docSnap = await docRef.get();
    const nowIso = new Date().toISOString();
    let lastActive = nowIso;

    if (docSnap.exists) {
      const data = docSnap.data();
      if (status === 'offline') {
        lastActive = data?.lastActive || nowIso;
      }
    }

    await docRef.set({
      discordId,
      status,
      lastActive,
    });

    console.log(`Saved Last Active (${status}) to Firestore.`);
    return lastActive;
  } catch (err) {
    console.warn('Error saving Last Active to Firestore:', err);
    return null;
  }
}

export async function fetchDiscordPresenceFromFirestore(_username: string): Promise<string | null> {
  const firestore = getFirestore();
  if (!firestore) return null;

  try {
    const docSnap = await firestore.collection('last_active').doc('status').get();
    if (docSnap.exists) {
      const data = docSnap.data();
      return data?.lastActive || null;
    }
  } catch (err) {
    console.warn('Error fetching last active status from Firestore:', err);
  }
  return null;
}
