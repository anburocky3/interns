# Implementation notes — CyberDude Intern Management

Required environment variables (add to `.env.local`):

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` (optional)
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` (optional)
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Setup steps:

1. Create a Firebase project and enable Authentication -> Google sign-in.
2. Create a Firestore database in production or test mode and deploy `firestore.rules` from this repo.
3. Set the `.env.local` variables above with your Firebase project's values.
4. Install dependencies:

```bash
npm install
# or
pnpm install
```

Notes:

- Google Auth is the chosen provider. New users are created in `/users/{uid}` with default role `intern`.
- Attendance uses realtime listeners (only the attendance collection uses `onSnapshot` presently).
- `weeklyTasks` includes `sessionLinks: string[]` (admins can add session links on the task document).
- File uploads are not included — submissions store URLs (githubUrl, deploymentUrl) only.

Admin onboarding recommendation:

- Create the first admin manually in the Firebase Console by creating a document under `/users/{uid}` and set `role: 'admin'` for the intended admin user's UID. We can add an invite flow later.
