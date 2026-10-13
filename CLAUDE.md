# On Target: project notes for Claude Code

Read this first. It tells you what this project is, the rules, and how Carl likes to work.

## What this is

On Target is the club app for **Ravenshoe & District Sporting Shooters** (SSAA Branch Q48), Queensland.
It is a free, installable web app (PWA) hosted on GitHub Pages from this repo:

- Repo: `ravenshoegunclub/on-target` (owned by the club's own GitHub account, `ravenshoegunclub`)
- Live: https://ontarget.ravenshoegunclub.com.au/ (still unlisted). The `CNAME` file at the repo root tells GitHub Pages to use this address; never delete or change it. DNS is at GoDaddy (which reserves the name `app`, so the app lives at `ontarget`): `ontarget` must be a CNAME record pointing to `ravenshoegunclub.github.io`.
- Old address: https://ravenshoegunclub.github.io/on-target/ now redirects to the new one.
- The app uses relative paths everywhere (manifest, service worker, icons, share links), so it works at either address. Keep it that way: no hard-coded `ravenshoegunclub.github.io` or `/on-target`.
- A new address is a new site as far as phones are concerned: a saved club team sign-in and a home-screen install at the old address do not carry over.
- Club website: https://ravenshoegunclub.com.au

Carl is a volunteer club member (a former IT professional), not on the committee. He builds and looks after the app.

## The plan (phases)

1. **Move to a proper app (now):** public pages (events, results, photos, club info), then the committee's tools (posting events/results/photos with a PIN, messages inbox, admin: payments and members).
2. Members sign in (email + one-time code): my membership and expiry, renew, digital card, my results history, renewal reminders. **Part 1 built in v2.0.0** (sign-in, card, my results, renew link, my details, "App sign-ups to check"). **Next job: members-only events for signed-in members** (today only the club team sees them, though the posting message already says "signed-in members"). After that: renewal reminders.
3. Club life: RSVP, training and safety course bookings, members-only documents, Learn section, calendar subscription.
4. Bench booking (pistol range 5 benches, rifle range 10; benches 9 and 10 for big calibres and muzzle brakes). **Built in v2.2.0.**

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
    - `?feed=events&n=30` → `{events:[{date,start,end,title,discipline,description}]}` (upcoming, soonest first). `start` and `end` go out ready to show ("8:30am"); `end` is `""` when there isn't one. The website shows `start` exactly as sent, so never change its format.
    - `?feed=results&all=1&n=12` → `{days:[{date,competitions:[{competition,discipline,rows:[{place,shooter,class,score}]}]}]}`
    - `?feed=photos&n=60` → `{photos:[{date,album,caption,thumb,full}]}`
    - Dates are `yyyy-mm-dd`. The feed caches for 2 minutes.
- **The old On Target app's screen is retired** (back end version 25). The Apps Script `/exec` address with no `?feed=` now shows an "On Target has moved" page (`Moved.html`) with a button to the new address. This app is the club's working tool.
  - The Apps Script is still the back end for everything: the website's feeds (`?feed=`), the website's join form (`doPost`) and this app's front door. Never change or break those.
  - The old screen's file, `Index.html`, is still in the Apps Script project. To bring it back, change `'Moved'` to `'Index'` in `doGet` in `Code.js` and redeploy (or redeploy version 24).
- Apps Script changes can be made from here with clasp (see "Back end" below). Add new functions rather than changing existing ones.

## Back end (clasp)

The Apps Script project is cloned into `backend/` with clasp, Google's free command-line tool.

- **`backend/` is in `.gitignore` and must stay there.** The code contains the club's bank details. Never commit it, and never copy its contents into tracked files or commit messages.
- clasp is signed in as the club Google account. To sign in again: `clasp login --no-localhost` (the Apps Script API must be On at script.google.com/home/usersettings).
- The Script ID is not recorded here. It is in the Apps Script editor under Project Settings. To clone again: `clasp clone <Script ID>` inside an empty `backend/`.
- `website/` (also in `.gitignore`) holds copies of the code blocks Carl pastes into the GoDaddy website by hand (What's on, Calendar). They are for copying only; the live website is whatever is pasted in GoDaddy.
- Files: `Code.js` (server code), `Api.js` (the new app's front door, shows as `Api.gs` in the editor), `Moved.html` (the "On Target has moved" page that `doGet` serves), `Index.html` (the old app's screen, kept but no longer served), `appsscript.json` (settings).
- **Front door for this app (`Api.js`):** POST to the feed address with `Content-Type: text/plain` and body `{"action":"api","fn":"<name>","pin":"<pin>","args":[...]}`. Reply is `{"ok":true,"data":...}` or `{"ok":false,"error":"<plain-English message>"}`. Only functions listed in `API_FUNCTIONS` can be called. Existing functions, called unchanged: `signIn`, `addEvent`, `addPhoto`, `listItems`, `updateEvent`, `deleteEvent`, `deleteResults`, `updatePhoto`, `deletePhoto`, `photoForShare`, and the admin ones `adminSummary`, `adminPending`, `adminMarkPaid`, `adminSheetLink`, `adminListPeople`, `adminSavePerson`, `adminRemovePerson`. New functions in `Api.js`: `memberNames`, `postResults`, `saveResults`, `manageItems`, `postEvent`, `saveEvent`, `privateEvents`, `updatePrivateEvent`, `deletePrivateEvent`, `setEventAudience`, `msgCount`, `msgList`, `msgRead`, `msgClaim`, `msgUnclaim`, `msgReply`, `msgArchive`, `savedReplies`, `membersList`, `membersSummary`, `membersExport`. The existing `updateResults` is deliberately left off: it drops member IDs, so the app uses `saveResults`. Photos go up one per request as a JPEG data URL, already shrunk in the browser to 1600px; a cross-origin request can't report upload progress without a CORS preflight, which Apps Script doesn't answer, so the progress bar is a "working" bar.
- **Messages (v1.6.0)** are open to every committee PIN; the old app's `admin*` message functions are untouched and still admin-only. Account and security emails (password resets, sign-in codes, security alerts) are shown **only to admins**, checked on the server for every message function (`accountMail_`). Claimed-by and replied-by live in a "Message log" tab, and saved replies in a "Saved replies" tab (Title, Text), both in the private Members spreadsheet. Labels (Membership, Training, Range, Website, Replied) are real Gmail labels. The app keeps emails in memory only, never in localStorage.
- **Admin section (v1.7.0), admins only:** Payments to confirm, Members, People and PINs. Member statuses follow the renewal season, set in one place (`MEMBER_SEASON_` in `Api.js`): from 1 May to 30 June a member who has not paid for next year is "Not renewed yet" (still financial); from 1 to 31 July they are "Not financial – renewal overdue" (NOT financial, follow-up only); from 1 August "Expired". Not-financial is always shown in red, never as current. The old app's 30-day "due" status (`adminMembers`, `memberState_`) is not used by this app. Member details and new PINs are kept in memory only.
- **Event times (v1.8.0):** events have a start and an optional end time, saved as plain text in one format, `HH:MM` on the 24-hour clock ("08:30"). The "End" column is the last column of the Events tab and of the Private events tab; the back end adds the header itself the first time an event is saved, and existing rows are never rewritten. Older rows hold whatever was typed ("8:30 am"); `time24_` reads them all. The app posts and edits events with `postEvent`, `saveEvent`, `updatePrivateEvent` and `setEventAudience`, which keep the end time; the old `addEvent` and `updateEvent` still work but know nothing about it. The one change inside `Code.js` is in `feedEvents_` (times through `feedTime_`).
- **Sharing to Facebook or Instagram (v1.8.0):** On Target can't post for anyone. It gets the photos and a caption ready: phones hand the photos to the share sheet (the caption is copied, because both apps ignore text sent with a photo), laptops get "Save photo" and "Copy caption". Photos chosen in Manage posts come from the club Drive through `photoForShare`, one request each, up to 10; straight after Add photos the pictures just uploaded are shared from memory. Events and results have a Share button that makes a club-colours picture (v2.1.1: drawn in the browser on a canvas by `eventPicture` and `resultsPicture`, 1080 x 1350, nothing fetched; results show the top 3 of up to 6 competitions) and a caption (results: the whole competition day). Phones get Share picture, Save picture and Copy caption; laptops get Save picture and Copy caption. Private and hidden events never get a Share button. Captions are the one place emoji are used.
- **Member sign-in (v2.0.0):** a member types their email and is emailed a one-time 6-digit code; there are no passwords. All of it is new functions at the end of `Api.js`.
  - Open to anyone (no PIN; the front door passes no PIN to them): `memberRequestCode(email)`, `memberVerifyCode(email, code)`, `memberLink(token, fullName, ssaaNo, useAsContact)`, `memberMe(token)`, `memberSetContact(token, useAsContact)`, `memberSignOut(token)`. Admins only (PIN): `memberLinkRequests`, `memberLinkCount`, `memberLinkApprove(id, memberId)`, `memberLinkDecline(id)`.
  - **A code is always sent and the reply is always the same**, whether or not the email belongs to a member. Never add anything that reveals who is a member.
  - Codes and sign-in tokens are stored only as SHA-256 hashes made with a secret salt (`MEMBER_SALT` in Script Properties, made automatically; never put it anywhere else). Codes live in the script cache: 15 minutes, 5 tries, 5 codes per email per hour, 50 codes a day in all (`CODE_`). Past the daily limit, or if the email can't be sent, the message is "We can't send codes right now, please try again tomorrow."
  - Codes are sent with `GmailApp` (as every other club email is), not `MailApp`: `MailApp` needs a permission the script doesn't have, and asking for it would stop the whole web app, feeds included, until someone re-authorised it in the editor. Don't add new permissions (`oauthScopes`) without planning for that.
  - Sessions: the token is kept on the phone (`ot:member` in localStorage, with the member's initials, first name and status so the button and Home strip can be drawn); its hash is in the "App sessions" tab of the private Members spreadsheet. Valid 12 months from last use; Sign out deletes the row. The member's details are fetched each time and kept in memory only.
  - An email is linked to a member by the "App email" column of the Members tab. The four new columns (App email, Use for club news, Previous email, App linked on) are added at the END by the back end the first time someone links, on the person's latest row. Who a session belongs to is always worked out from "App email", so member functions can only return that member's own details. The hidden member ID is never sent to a member.
  - Linking is automatic only when the SSAA number (digits only) and the surname (last word, any capitals) match exactly one member who isn't already linked to a different email. Everything else goes to the "App link requests" tab and shows for admins under "App sign-ups to check"; automatic links are listed there too. With "Yes" to club news the app email becomes the contact email and the old one moves to "Previous email" (never deleted).
  - Member statuses on the card use the same logic as the Admin section (`memberStatus_`, `MEMBER_SEASON_`).
  - Safeguard: when a contact email is replaced without the club team checking (an automatic link with "Yes", or a member switching to "Yes" later), a short notice goes to the OLD address, and the automatic link shows "Email changed" under "App sign-ups to check" (saved as the status "Linked automatically – email changed").
- **Me and Club admin (v2.3.0; this replaces the v2.0.0 layout of Me):** the bottom bar is always five buttons: Home, Events, Results, Photos, Me. `#/more` goes to `#/me`; `#/committee` goes to `#/admin`; the club team's screens are still `#/committee/...`, with "Club admin" as their back link.
  - **Me, not signed in:** the member sign-in box, then CLUB: Visit the range · FAQs · Club website ↗ · Contact the club · Handgun shoot calculator · Club documents · "Add On Target to your phone" (gold, hidden when running as an installed app), then "Club team? Sign in with your PIN".
  - **Me, member:** greeting, card, the quick row My results · My bookings · My details, then one wide Renew row ("Opens 1 May <year>" until renewals open for that member, then a "Renew my membership" button). CLUB: Book a bench (financial members) · Club documents · Handgun shoot calculator · FAQs · Contact the club · Club website ↗ · Sign out. One Sign out for both sign-ins.
  - **Me, club team (PIN):** the same, plus a GREEN "Club admin" button straight under Renew ("Messages, posts, range, members", with a white "x new" badge: new messages + booking requests, and for admins payments + app sign-ups too). A red dot on Me means new messages or booking requests. There is no club admin list on Me any more. An unlinked PIN sees "Link your membership: ask an admin to link you in People and PINs."
  - **Club admin (`#/admin`, back to Me):** red Emergency contacts; EVERY DAY: Messages · Post something new (`#/admin/post`: Event, Results, Photos) · Manage posts; RANGE: Today at the range · Booking requests · Reserve for a competition; CLUB: Manage club documents; ADMIN ONLY (admin PINs, hidden from range officers): Payments to confirm · All members & status · App sign-ups to check · People and PINs.
  - **Who can see a club document (v2.3.0):** each document is "Everyone" or "Members only" (the fourth line of the file's Drive description; anything not marked Everyone is Members only, so older documents are). `clubDocuments` gives every document to a club team PIN or a linked member's token, and only the Everyone ones to anybody else (no sign-in, or an email not linked yet). Club documents is open on Me to everyone.
- **v2.1.0 (all new functions in `Api.js`):**
  - **One email for everything.** Linking makes the sign-in email the contact email too (the old one goes to "Previous email", with the notice to the old address). The first-time screen and My details have a tick box "Send me club news and renewal reminders" (the "Use for club news" column) in place of Yes / Sign-in only. `memberSetContact` is kept only for phones still on v2.0.0.
  - **Signed-in members are recognised ONLY by the "App email" column, never the join form's Email column** (families share emails). One sign-in email links to one membership: a second person gets "This email is already linked to another member. Please use your own email address."
  - **My details, no club team approval:** `memberSaveDetails(token, {mobile, emName, emRelation, emPhone, news})`, `memberChangeEmail(token, newEmail)` (a code goes to the NEW address; the reply is always the same) and `memberConfirmEmail(token, newEmail, code)` (only then does the email change; the "already linked" check happens here, after the code, so nothing is revealed before). Every phone signed in with the old email carries on under the new one. Each change is a row in the "Details changes" tab (Date, Member, Field, Old, New, Member ID). Mobile is the "Phone" column; the three emergency columns (Emergency contact, Emergency relationship, Emergency phone) are added at the END. Details are written on the person's latest row and read from the latest row that has them. Name and SSAA number: "ask the club".
  - **Emergency contacts (any PIN):** `emergencySearch(pin, query)` gives names only; `emergencyContact(pin, memberId)` gives the contact and writes the "Emergency look-ups" tab (When, Looked up by, Member, Member ID) first. Live only: the app keeps nothing on the phone. The screen says "In a medical emergency, call 000 first. Range address: 311 Cemetery Road, Ravenshoe."
  - **A PIN is their membership too:** admins link a PIN person to a member in People and PINs (`peopleLinks`, `personLinkMember`; the member ID is kept with the PIN in Script Properties as `memberId`, and `adminSavePerson` leaves it alone). The member functions take `'pin:<PIN>'` in place of a token (`who_`), so a linked PIN shows that member's card and My details. The app hides the email sign-in box for anyone signed in with a PIN; an unlinked PIN sees "Link your membership: ask an admin to link you in People and PINs."
  - **Club documents, managed by any PIN:** `docAdd`, `docSave` (title, type), `docReplace` (new file takes the old one's title and type; the old file goes to the Drive bin), `docRemove` (Drive bin). One file per request as a data URL, up to 10 MB: PDF, Word, or a photo (shrunk in the browser as gallery photos are). The type (Policy / Form / Minutes / Other) is kept in the file's Drive description.
  - **Manage posts, events:** upcoming first (soonest at the top), then "Past events" (newest first).
  - **No "Refresh club data" button.** Club data is fetched again once it is 2 minutes old while On Target is on the screen, and when it comes back to the screen (`visibilitychange`). There is no pull-down to refresh.
  - The one-time code logic is shared (`newCode_`, `takeCode_`, `sendCode_`): kind `''` is signing in, `'x'` is confirming a new email; both count towards the same limits.
- **Handgun shoot calculator (v2.2.2, front end only):** "Handgun shoot calculator" in Me, Club, for everyone; its own page `#/calculator`. Category H holders tick classes A to D, each with months held this financial year (1 July to 30 June). The rules are in one function, `shootsNeeded` in `app.js`: one class needs floor(6 × m / 12) competitions; two or more need floor(4 × m / 12) shoots each, of which min(total, floor(6 × longest months / 12)) are competitions and Class C's own number are accredited events. Nothing is saved or sent. It is a guide only and always shows the note and the Queensland Police link.
- **Clearer club documents (v2.2.1):** each document has a name, "What it's for" (one sentence) and "Who it's for" (short), as well as its type. They are kept in the file's Drive description, one per line: type, what, who (`docMeta_`, `docDesc_`); older files hold only the type and show just the name until someone edits them. `clubDocuments` sends `what` and `who`; `docAdd` and `docSave` take them; `docReplace` carries them over. A phone on an older version that saves without them leaves them as they were. Members see the list grouped Forms, Policies, Minutes, Other (empty groups hidden), with "Who it's for" as a maroon tag.
- **Club documents (v2.0.0):** `clubDocuments(pin, token)` lists the files in the Drive folder "On Target – Club documents" (owned by the club account; made the first time, ID kept in Script Properties) for the club team (PIN) and linked members (token). Each file is set to "anyone with the link can view" when it is listed, because members aren't signed in to Google as the club: only put things there that members may see.
- **Testing against a test copy of the server:** a copy of On Target on `localhost` or a Codespace address (never the live address) can be pointed at a test deployment by opening it once with `?server=<deployment ID>`, and back with `?server=live`; More then shows "TEST SERVER". A test deployment is the one time a plain `clasp deploy -d "TEST ..."` is right, and only when Carl asks for one. It still uses the club's real Sheets and Gmail. `clasp deployments` lists them.
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

- **Bump the version on every change:** `APP_VERSION` in `app.js`, every `?v=x.y.z` in `index.html`, `manifest.webmanifest` and `sw.js`, and `CACHE` in `sw.js`. Phones only pick up changes when these change. Current version: **2.3.0**.
- Carl previews with `python3 -m http.server 8080` (he calls this "8080"). It is usually already running in another terminal.
- Prefer complete, tidy files over scattered patches.
- Commit messages: short, e.g. `On Target v1.2.0 committee sign-in`.

## Look and feel

- Club colours: maroon `#5C0F1F`, crimson `#9B1B35`, gold `#E9B44C`. Background `#F6F2EE`. Dark mode follows the phone's setting.
- Fonts: Montserrat (headings, 800) and Poppins (body), from Google Fonts.
- Icons: simple inline stroke SVGs. No emoji (the only exception is the ready-made Facebook and Instagram captions).
- Polished, first-class app feel: bottom tab bar, cards, smooth slide-in, skeleton loading (no spinners), friendly empty states.

## Who uses it

Many members and committee members are older and easily confused by technology. So:

- Large text and buttons (touch targets at least 44px), plain words, one clear action per screen.
- Works the same on phone, tablet and laptop.
- Say "competition days", not "shoot days".
- On events the field is called **"Type of event"** (events aren't always shooting); it is still saved in the Events tab's "Discipline" column and sent as `discipline`. Results keep "Discipline".
- The app's name is **"On Target"**: two words, capital O and capital T. In anything a person reads (screens, messages, emails), say "On Target" rather than "the app" wherever it reads well, e.g. "It appears on the website and On Target", "This part of On Target is for the club team".
- Members sign in with their email ("Member sign-in", "My membership"); say "Sign out", never "log out".
- The people who sign in with a PIN are the **"Club team"** (the committee plus range officers): capital C only, never "Club Team". As a label or heading it is "Club team" (the tab, "Club team sign-in", the badge); inside a sentence it is "the club team". Use that name for anything a person sees. The code still says `committee` in routes, function names and the saved "Committee" event audience; that is fine and should not be shown.
- Real buttons and links, labels on icon-only buttons, good contrast.

## Working with Carl

- He often wants to **talk ideas through first** ("what do you think?", "would this work?"). Discuss before coding when he does.
- He likes to **see what a screen will look like** before it's built (layout, how it looks to a member).
- Give instructions as **short numbered steps**, one action each (1. Click this 2. Paste that).
- If he asks about a step (e.g. "at step 3 I can't see the button"), clarify it, then **repeat the remaining steps** from there, so he doesn't have to scroll back.
- He works on a Windows laptop in Chrome. The "RDSS" Chrome profile is the club's (club Gmail, Drive, GitHub); his normal profile is personal.
- Keep it friendly and plain-English. Australian spelling.

