# Documentation

Terminal-style SVG generator for GitHub profile READMEs with Discord Rich Presence, VS Code activity log, and GitHub statistics.

## Prerequisites

### Discord Lanyard Presence

To enable Discord Rich Presence monitoring, join the [Lanyard Discord Server](https://discord.gg/lanyard). Lanyard monitors presence only for accounts present in the server.

## Getting Started

Clone the repository.

```bash
git clone https://github.com/AdityaLF/AdityaLF.git
cd AdityaLF
```

## Environment Variables

Configure environment variables in a `.env` file based on `.env.example`.

| Variable | Description |
| :--- | :--- |
| `GH_USERNAME` | GitHub username |
| `GH_TOKEN` | GitHub Personal Access Token |
| `DISCORD_ID` | Discord user ID |
| `FIREBASE_PROJECT_ID` | Firebase Project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase Client Email |
| `FIREBASE_PRIVATE_KEY` | Firebase Private Key |
| `CRON_SECRET` | Secret key for cron sync endpoint |

### Firebase Credentials

To obtain your Firebase Service Account credentials:

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create or select a project.
2. Navigate to **Project Settings** (gear icon) -> **Service accounts** tab.
3. Click **Generate new private key** to download the credentials JSON file.
4. Extract `project_id`, `client_email`, and `private_key` from the JSON file into your `.env` file.

### GitHub Personal Access Token

To obtain your GitHub Personal Access Token (`GH_TOKEN`):

1. Go to GitHub **Settings** -> **Developer Settings** -> **Personal access tokens** -> **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Select `repo` scope.
4. Click **Generate token** and copy the generated token string into your `.env` file.

## Development

```bash
# Install dependencies
npm install

# Generate SVG
npm run generate

# Start local HTTP dev server (http://localhost:3000/terminal.svg)
npm run dev
```

## Deployment

### Vercel Serverless Endpoint

Deploying to Vercel provides a live HTTP SVG endpoint (`/api/terminal`) for your README.

1. Import the repository in Vercel.
2. Add environment variables in Vercel Project Settings (`GH_USERNAME`, `GH_TOKEN`, `DISCORD_ID`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`, `CRON_SECRET`).
3. Embed the Vercel endpoint URL directly in your profile README.
   ```markdown
   <p align="center">
     <a href="https://github.com/AdityaLF/AdityaLF">
       <img src="https://adityalf-readme.vercel.app/terminal.svg" alt="Terminal Profile" width="100%" />
     </a>
   </p>
   ```

### Automated Sync (Cron Job)

To record Discord activity history into Firestore:

1. Register a free account on [cron-job.org](https://cron-job.org).
2. Create a new Cronjob with these settings:
   - **URL**: `https://your-app.vercel.app/cron?key=YOUR_CRON_SECRET`
   - **Schedule**: Every 15 minutes.

## Credits

- [Lanyard](https://github.com/Phineas/lanyard) - Live Discord Rich Presence REST API

## License

This project is licensed under the [MIT License](LICENSE).
