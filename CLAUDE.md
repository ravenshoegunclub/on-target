# On Target: project notes for Claude Code

Read this first. It tells you what this project is, the rules, and how Carl likes to work.

## What this is

On Target is the club app for **Ravenshoe & District Sporting Shooters** (SSAA Branch Q48), Queensland.
It is a free, installable web app (PWA) hosted on GitHub Pages from this repo:

- Repo: `ravenshoegunclub/on-target` (owned by the club's own GitHub account, `ravenshoegunclub`)
- Live (development, unlisted): https://ravenshoegunclub.github.io/on-target/
- Later, at launch: app.ravenshoegunclub.com.au (DNS at GoDaddy, not set up yet)
- Club website: https://ravenshoegunclub.com.au

Carl is a volunteer club member (a former IT professional), not on the committee. He builds and looks after the app.

## The plan (phases)

1. **Move to a proper app (now):** public pages (events, results, photos, club info), then the committee's tools (posting events/results/photos with a PIN, messages inbox, admin: payments and members).
2. Members sign in (email + one-time code): my membership and expiry, renew, digital card, my results history, renewal reminders.
3. Club life: RSVP, training and safety course bookings, members-only documents, Learn section, calendar subscription.
4. Bench booking (pistol range 5 benches, rifle range 10; benches 9 and 10 for big calibres and muzzle brakes).

Event visibility (built in v1.5.0 with Manage posts):

- Events have a "Who can see this?" choice: **Everyone / Members only / Committee only**. Until members can sign in (phase 2), only signed-in committee see the last two.
- Members-only and committee-only events must **never** appear on the website or the public feed, and must **not be stored in the published RDSS Club Data sheet**. They live in a "Private events" tab of the private Members spreadsheet, and the app keeps them in memory only (never in localStorage).

Parked: electronic range sign-in / Form 33 (waiting on Queensland Police), online payments, SMS alerts, one-tap Facebook/Instagram posting.

## How it fits together

- **Front end (this repo):** plain HTML, CSS and JavaScript. No build step, no framework, no npm dependencies.
  - `index.html` app shell, `styles.css`, `app.js` (views, hash router `#/home` etc., data loading), `sw.js` (offline support), `manifest.webmanifest`, `icons/`.
- **Back end (NOT in this repo):** the existing "On Target" Google Apps Script web app, running as the club Google account, with the "RDSS Club Data" Google Sheet.
  - Public read-only feed (no PINs, no member details):
    `https://script.google.com/macros/s/AKfycbynN-K_c3FSzsGzaKeh8cGusDD8UEbvX2QvDmq_TJY1epuzPz5phpa2AAVBx5-SytV7ig/exec`
    - `?feed=events&n=30` → `{events:[{date,start,title,discipline,description}]}` (upcoming, soonest first)
    - `?feed=results&all=1&n=12` → `{days:[{date,competitions:[{competition,discipline,rows:[{place,shooter,class,score}]}]}]}`
    - `?feed=photos&n=60` → `{photos:[{date,album,caption,thumb,full}]}`
    - Dates are `yyyy-mm-dd`. The feed caches for 2 minutes.
- **The current On Target app (Apps Script page) stays the club's working tool** for posting, messages, payments and members until this app does everything it does. Never change or break anything it or the website relies on.
- Apps Script changes can be made from here with clasp (see "Back end" below). Add new functions rather than changing existing ones.

## Back end (clasp)

The Apps Script project is cloned into `backend/` with clasp, Google's free command-line tool.

- **`backend/` is in `.gitignore` and must stay there.** The code contains the club's bank details. Never commit it, and never copy its contents into tracked files or commit messages.
- clasp is signed in as the club Google account. To sign in again: `clasp login --no-localhost` (the Apps Script API must be On at script.google.com/home/usersettings).
- The Script ID is not recorded here. It is in the Apps Script editor under Project Settings. To clone again: `clasp clone <Script ID>` inside an empty `backend/`.
- Files: `Code.js` (server code), `Api.js` (the new app's front door, shows as `Api.gs` in the editor), `Index.html` (the current On Target page), `appsscript.json` (settings).
- **Front door for this app (`Api.js`):** POST to the feed address with `Content-Type: text/plain` and body `{"action":"api","fn":"<name>","pin":"<pin>","args":[...]}`. Reply is `{"ok":true,"data":...}` or `{"ok":false,"error":"<plain-English message>"}`. Only functions listed in `API_FUNCTIONS` can be called. Existing functions, called unchanged: `signIn`, `addEvent`, `addPhoto`, `listItems`, `updateEvent`, `deleteEvent`, `deleteResults`, `updatePhoto`, `deletePhoto`, and the admin ones `adminSummary`, `adminPending`, `adminMarkPaid`, `adminSheetLink`, `adminListPeople`, `adminSavePerson`, `adminRemovePerson`. New functions in `Api.js`: `memberNames`, `postResults`, `saveResults`, `manageItems`, `postEvent`, `privateEvents`, `updatePrivateEvent`, `deletePrivateEvent`, `setEventAudience`, `msgCount`, `msgList`, `msgRead`, `msgClaim`, `msgUnclaim`, `msgReply`, `msgArchive`, `savedReplies`, `membersList`, `membersSummary`, `membersExport`. The existing `updateResults` is deliberately left off: it drops member IDs, so the app uses `saveResults`. Photos go up one per request as a JPEG data URL, already shrunk in the browser to 1600px; a cross-origin request can't report upload progress without a CORS preflight, which Apps Script doesn't answer, so the progress bar is a "working" bar.
- **Messages (v1.6.0)** are open to every committee PIN; the old app's `admin*` message functions are untouched and still admin-only. Account and security emails (password resets, sign-in codes, security alerts) are shown **only to admins**, checked on the server for every message function (`accountMail_`). Claimed-by and replied-by live in a "Message log" tab, and saved replies in a "Saved replies" tab (Title, Text), both in the private Members spreadsheet. Labels (Membership, Training, Range, Website, Replied) are real Gmail labels. The app keeps emails in memory only, never in localStorage.
- **Admin section (v1.7.0), admins only:** Payments to confirm, Members, People and PINs. Member statuses follow the renewal season, set in one place (`MEMBER_SEASON_` in `Api.js`): from 1 May to 30 June a member who has not paid for next year is "Not renewed yet" (still financial); from 1 to 31 July they are "Not financial – renewal overdue" (NOT financial, follow-up only); from 1 August "Expired". Not-financial is always shown in red, never as current. The old app's 30-day "due" status (`adminMembers`, `memberState_`) is not used by this app. Member details and new PINs are kept in memory only.
- **Never refer to something in `Code.js` from the top level of `Api.js`** (only inside functions). Files load in order, and a top-level reference to a file not yet loaded would break the whole web app, feeds included.
- **Edits and deletes** carry the sheet row number and a fingerprint of what the app last saw. If the server answers "Someone else has just changed this", the app says so and reloads the Manage posts list.
- **Member IDs on results:** `postResults` saves a "Member ID" in the last column of the Results tab (it adds the header itself the first time). The public feeds read columns by header name and never output it. Member names from `memberNames` are kept in memory in the app, never saved on the phone or in this repo. Editing a competition in the old On Target app rewrites its rows without the Member IDs; editing it in this app keeps them.
- **One member ID per person for life** (from back end version 20): the Members sheet has one row per membership year, and a renewal reuses the ID from the person's oldest row with the same SSAA number. `memberNames` lists each person once, named from their latest row that isn't "Waiting for payment". So an ID can be on several rows: never treat it as a row key.
- A new deploy can take about a minute before the live address serves it.
- To roll back a bad deploy, redeploy the previous version: add `-V <version number>` to the deploy command below (`clasp versions` lists them).
- **Run `clasp pull` before any change.** Carl may also edit in the Apps Script editor, and `clasp push` overwrites what is there.
- **Don't push or deploy without asking.** Tell Carl what changed first, the same as for this repo.
- **Deploy only to the live deployment**, so the feed address never changes:
  `clasp deploy -i AKfycbynN-K_c3FSzsGzaKeh8cGusDD8UEbvX2QvDmq_TJY1epuzPz5phpa2AAVBx5-SytV7ig -d "short description"`
  Never run a plain `clasp deploy` (it makes a new address) and never `clasp undeploy`.

## Hard rules

- **Free only.** Nothing that costs money beyond the club's existing GoDaddy plan and domain. No paid services, APIs or libraries.
- **This repo is public.** Never put PINs, passwords, API keys, bank details or member information in it.
- **Don't push without asking.** Make the change, test it, tell Carl what changed, and commit/push only when he says so.
- The committee doesn't see the new app until it's finished. Nothing here should be advertised or linked from the website yet.

## Conventions

- **Bump the version on every change:** `APP_VERSION` in `app.js`, every `?v=x.y.z` in `index.html`, `manifest.webmanifest` and `sw.js`, and `CACHE` in `sw.js`. Phones only pick up changes when these change. Current version: **1.7.1**.
- Carl previews with `python3 -m http.server 8080` (he calls this "8080"). It is usually already running in another terminal.
- Prefer complete, tidy files over scattered patches.
- Commit messages: short, e.g. `On Target v1.2.0 committee sign-in`.

## Look and feel

- Club colours: maroon `#5C0F1F`, crimson `#9B1B35`, gold `#E9B44C`. Background `#F6F2EE`. Dark mode follows the phone's setting.
- Fonts: Montserrat (headings, 800) and Poppins (body), from Google Fonts.
- Icons: simple inline stroke SVGs. No emoji.
- Polished, first-class app feel: bottom tab bar, cards, smooth slide-in, skeleton loading (no spinners), friendly empty states.

## Who uses it

Many members and committee members are older and easily confused by technology. So:

- Large text and buttons (touch targets at least 44px), plain words, one clear action per screen.
- Works the same on phone, tablet and laptop.
- Say "competition days", not "shoot days".
- The people who sign in with a PIN are the **"Club Team"** (the committee plus range officers). Use that name for anything a person sees: the tab, sign-in, badges and messages. The code still says `committee` in routes, function names and the saved "Committee" event audience; that is fine and should not be shown.
- Real buttons and links, labels on icon-only buttons, good contrast.

## Working with Carl

- He often wants to **talk ideas through first** ("what do you think?", "would this work?"). Discuss before coding when he does.
- He likes to **see what a screen will look like** before it's built (layout, how it looks to a member).
- Give instructions as **short numbered steps**, one action each (1. Click this 2. Paste that).
- If he asks about a step (e.g. "at step 3 I can't see the button"), clarify it, then **repeat the remaining steps** from there, so he doesn't have to scroll back.
- He works on a Windows laptop in Chrome. The "RDSS" Chrome profile is the club's (club Gmail, Drive, GitHub); his normal profile is personal.
- Keep it friendly and plain-English. Australian spelling.
