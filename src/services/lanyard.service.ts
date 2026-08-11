import { DiscordActivity, LanyardData } from '../types.js';
import { formatActivityElapsedTime } from '../utils/time.js';
import { saveDiscordPresenceToFirestore, fetchDiscordPresenceFromFirestore } from './firestore.service.js';

export async function fetchLanyardStatus(
  discordId: string,
  username?: string
): Promise<{ status: string; activities: DiscordActivity[]; lastActive?: string }> {
  if (!discordId || discordId === '123456789012345678') {
    return { status: 'offline', activities: [] };
  }

  try {
    const response = await fetch(`https://api.lanyard.rest/v1/users/${discordId}`);
    if (!response.ok) {
      throw new Error(`Lanyard API returned status ${response.status}`);
    }

    const json = (await response.json()) as { success: boolean; data: LanyardData };
    if (!json.success || !json.data) {
      return { status: 'offline', activities: [] };
    }

    const data = json.data;
    const status = data.discord_status || 'offline';
    const activities: DiscordActivity[] = (data.activities || []).map((act) => ({
      name: act.name,
      type: act.type,
      applicationId: act.application_id,
      details: act.details,
      state: act.state,
      timestamps: act.timestamps,
      elapsedTime: formatActivityElapsedTime(act.timestamps),
    }));

    let lastActive: string | undefined;
    if (username) {
      const savedLastActive = await saveDiscordPresenceToFirestore(username, discordId, status, activities);
      if (savedLastActive) {
        lastActive = savedLastActive;
      } else {
        const fetched = await fetchDiscordPresenceFromFirestore(username);
        if (fetched) lastActive = fetched;
      }
    }

    return { status, activities, lastActive };
  } catch (err) {
    console.warn(`Failed to fetch Lanyard status for ${discordId}:`, err);
    let lastActive: string | undefined;
    if (username) {
      const fetched = await fetchDiscordPresenceFromFirestore(username);
      if (fetched) lastActive = fetched;
    }
    return { status: 'offline', activities: [], lastActive };
  }
}
