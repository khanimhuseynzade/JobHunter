import "./load-env";
import { createServer } from "node:http";
import { google } from "googleapis";

/**
 * One-time helper to obtain a Gmail refresh token.
 *
 * Prerequisites (do this once in Google Cloud Console):
 *   1. Create a project and enable the "Gmail API".
 *   2. Configure the OAuth consent screen (External is fine; add yourself as a
 *      test user, or publish the app to avoid the ~7 day refresh-token expiry).
 *   3. Create an OAuth client of type "Web application".
 *   4. Add this Authorized redirect URI: http://localhost:5555/oauth2callback
 *   5. Put the client id/secret in .env as GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET.
 *
 * Then run:  npm run gmail:auth
 * Open the printed URL, approve access, and copy GOOGLE_REFRESH_TOKEN into .env.
 */

const PORT = 5555;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;
const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

async function main() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env before running this."
    );
    process.exit(1);
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

  const authUrl = oauth2.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });

  console.log("\nOpen this URL in your browser and approve access:\n");
  console.log(authUrl + "\n");

  await new Promise<void>((resolve) => {
    const server = createServer(async (req, res) => {
      if (!req.url?.startsWith("/oauth2callback")) {
        res.writeHead(404).end();
        return;
      }

      const url = new URL(req.url, REDIRECT_URI);
      const code = url.searchParams.get("code");

      if (!code) {
        res.writeHead(400).end("Missing authorization code.");
        return;
      }

      try {
        const { tokens } = await oauth2.getToken(code);
        res
          .writeHead(200, { "Content-Type": "text/plain" })
          .end("Done. You can close this tab and return to the terminal.");

        if (tokens.refresh_token) {
          console.log("\nAdd this to your .env (and Vercel env):\n");
          console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        } else {
          console.error(
            "\nNo refresh token returned. Revoke prior access at " +
              "https://myaccount.google.com/permissions and run again.\n"
          );
        }
      } catch (err) {
        res.writeHead(500).end("Token exchange failed. Check the terminal.");
        console.error("Token exchange failed:", err);
      } finally {
        server.close();
        resolve();
      }
    });

    server.listen(PORT, () => {
      console.log(`Waiting for the OAuth redirect on ${REDIRECT_URI} ...`);
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
