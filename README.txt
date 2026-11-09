MY FINANCE TRACKER — PRIVACY-FIRST PWA MVP

This is an installable Progressive Web App, not a native iOS IPA.

SECURITY INCLUDED:
- 6-digit PIN setup and unlock
- AES-256-GCM encryption for the stored finance data
- PIN-derived key using PBKDF2-SHA-256 (600,000 iterations)
- 60-second inactivity lock
- Locks when the app is sent to the background
- No analytics, ads, bank connections, cloud database or app server
- Transaction, loan and investment records
- Permanent local vault deletion

IMPORTANT LIMITATIONS:
- A six-digit PIN is not as strong as a long passphrase. If someone copies the encrypted browser database, an attacker may attempt offline PIN guesses. Use a unique PIN and a strong iPhone device passcode.
- This PWA cannot access iOS Keychain or invoke native Face ID as a true native app can.
- There is no backup or recovery. Forgetting the PIN or clearing Safari website data can permanently destroy records.
- The app shell must be hosted on HTTPS to install as a PWA. Only static application files are hosted; financial records remain encrypted in local IndexedDB.
- No software can guarantee absolute privacy if the iPhone itself is compromised.

HOSTING / INSTALLATION:
1. Host the files in this folder at the root of an HTTPS static site.
2. Open that HTTPS URL in Safari on iPhone.
3. Tap Share > Add to Home Screen > Add.
4. Launch the home-screen icon and create your six-digit PIN.
5. Open the app once online so its shell is cached. Then test Airplane Mode.
