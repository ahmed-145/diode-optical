# Deploy the static interface to Vercel

## Live deployment

- App: https://diode-optical.vercel.app/
- Sender: https://diode-optical.vercel.app/send
- Receiver (open in iPhone Safari): https://diode-optical.vercel.app/receive

Deployed by the owner on 2026-11-17. Keep these URLs as the canonical hosted entry points. Hosting supplies the interface; file bytes still travel optically between devices.

## Redeploy

The repository includes vercel.json with a static build and camera permissions separated by page. No backend, database, file storage, API key, or environment variable is required.

1. In Vercel, create a project and import `ahmed-145/diode-optical` from GitHub.
2. Use the repository root, Framework Preset **Other**, Node.js **22**, build command `npm run build`, and output directory `dist`. The checked-in configuration supplies the build/output settings.
3. Deploy. Open `/send` on the sending computer and `/receive` in Safari on the receiving iPhone. The root also opens the sender.
4. On the iPhone, choose Start camera, grant camera permission, and scan the code displayed on the computer.

Vercel hosts the application interface. The file bytes are encoded and recovered locally; this application has no file-upload endpoint. A permanent HTTPS deployment removes the development-server/tunnel setup. It does not speed the optical transfer. The generated URL's audience depends on the deployment protection configured in your Vercel account.

Vercel does not consume the dist/_headers format used by some other static hosts; equivalent headers are declared in vercel.json. Receiver camera access is enabled for its own origin; sender/root camera and microphone access are disabled. The application retains its script-hash CSP and no-connect policy in the HTML.

Reference: [Vercel build configuration](https://vercel.com/docs/builds/configure-a-build), [project configuration](https://vercel.com/docs/project-configuration).

## Speed expectations

The default Balanced profile has a nominal 4096-byte/second payload ceiling; Dense has 12288 bytes/second. These are pre-loss channel capacities, not measured iPhone file throughput. Dense codes need more pixels per module, so Dense may be slower if the camera misses codes. Rendering speed, camera exposure/focus, scanner CPU work, frame loss, and recovery overhead determine actual throughput. Hosting is outside this path after the pages load.

Start with a 10 KB file. Record profile, sender's measured displayed fps, useful symbols collected, and recovery percentage after 30 seconds. A stall calls for improved framing/focus, lower playback speed, or a less dense profile before simply increasing fps. The best current use is small configurations, text and similar payloads where an optical-only path matters; large photos/videos are not the current implementation's strength.
