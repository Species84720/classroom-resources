# Presentation Studio

Open `presentations/` from the classroom library. Anyone can view published presentations; teachers sign in with Google to create, import and edit their own work. New presentations are private drafts until the creator selects **Share publicly** and saves. The catalogue automatically loads shared presentations alongside existing resources and games.

## Connect Google sign-in and storage (one-time owner setup)

The site is hosted on GitHub Pages, which cannot keep private data or enforce ownership by itself. The studio uses Firebase Authentication and Cloud Firestore. No Firebase project or credentials are included in this repository. Until you connect one, the example and PowerPoint export work, but sign-in, creating and saving remain disabled.

1. In the [Firebase console](https://console.firebase.google.com/), create or select your project and register a **Web app**. Google Analytics is not needed.
2. In **Authentication → Sign-in method**, enable **Google** and choose your support email. In **Settings → Authorised domains**, add `species84720.github.io` and any custom site domain. Add `localhost` only if you need local testing.
3. Create a **Cloud Firestore Standard edition** database in **production mode**, choosing an appropriate region.
4. Deploy the included security rules before enabling the app. From a local checkout, run:

   ```sh
   npm ci
   npx firebase login
   npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

   Alternatively, paste `firestore.rules` into Firestore's **Rules** tab and publish. These rules enforce Google authentication, immutable ownership, creator-only changes, private drafts and public viewing. Do not replace them with “allow all” test rules.
5. Copy the **public Firebase web configuration** from Project settings into `presentations/config.js`:

   ```js
   window.PRESENTATIONS_FIREBASE_CONFIG = {
     apiKey: 'YOUR_PUBLIC_WEB_API_KEY',
     authDomain: 'YOUR_PROJECT.firebaseapp.com',
     projectId: 'YOUR_PROJECT',
     appId: 'YOUR_WEB_APP_ID'
   };
   ```

   Firebase web configuration is meant to be public; database rules provide authorisation. Never add service-account credentials, private keys or OAuth client secrets. The application does not request Google Drive access.
6. Commit and push `config.js`. Wait for **Deploy GitHub Pages** to succeed.
7. Verify with two Google accounts: create and save a draft with account A; account B and a signed-out window must not open its link. Publish with A; both should be able to view, and only A should see Edit. Confirm B cannot write directly to Firestore. Unpublish with A and confirm public access is removed.

Any signed-in Google user can create their own presentations. Existing presentations can only be changed or deleted by their creator. Set Firebase quota/budget alerts to suit your usage; a public library receives database reads from visitors.

## Using the studio

- Sign in, choose **Create a presentation**, then use a blank, lesson, discussion or nested-topic template.
- Add and duplicate slides, move them earlier/later, and choose a title, picture or split layout.
- Add PNG, JPEG or WebP pictures. Images are resized and embedded; no separate storage bucket is needed.
- Choose Classic slides or a Three.js Zoom journey. Whole-slide transitions remain available, alongside separate animations for each title, main text block, main picture and added object.
- Under **Objects and animations**, choose a field or object. Pick Appear, Fade, Rise, Grow or Turn, and set the duration and delay in milliseconds. Choose **When the slide opens** or **On a click / Next**. Objects with the same click step appear together; lower step numbers play first. Line-by-line text starts after the object click steps. Previous hides the latest build again.
- Add up to 20 extra text boxes and pictures per slide. Select any main title, main text, main picture or added object in the Object menu or preview. Drag the item to move it; drag its corner or edge handles to resize it. Numeric left/top/width/height controls work for all items. Moving a main item freezes the other main items in place, so they do not jump around. **Reset main items to layout** restores automatic layout. Text boxes also have a font-size control. These extra objects are included as editable items in `.pptx` exports.
- Use **Slide inside this one** to create a nested zoom target, or choose **Place inside** on an existing slide. Nest up to four levels deep. The Zoom canvas map supports drag placement and keyboard selection, with position and size fields for precise placement. A nested slide’s coordinates and size are relative to its parent. Top-level slides can be freely positioned and resized.
- Next follows the slide-list order. Click smaller slides or use **Zoom into…** buttons to explore another branch. **Zoom out to parent** (or Backspace when the stage is focused) returns to the containing slide. Overview shows the whole canvas. Reordering slides does not break nesting; deleting a parent promotes its children while preserving their positions. Choose the **Try nested zooms + object animations** example to explore without signing in.
- **Undo / Redo** restores text, pictures, positions, sizes, effects, canvas placement, slide additions/deletions/reordering, templates and the public-sharing checkbox. Use Ctrl/Cmd+Z to undo, Ctrl/Cmd+Shift+Z or Ctrl+Y to redo. A whole drag/resize is one action; continuous typing is grouped. Arrow keys on the preview move the selected item (Shift = 10 pixels); arrow keys on a resize handle resize it. Escape cancels an active preview gesture. History is local to the current editing session, keeps up to 60 edits subject to a memory limit, survives Save, and resets when another presentation is opened. Undoing a saved edit changes the working copy; press Save again to update the shared copy. Permanently deleting a presentation is not undoable.
- Save explicitly. Unsaved changes trigger a warning before leaving. A version check prevents overwriting a newer save from another tab; download a JSON backup before reloading a conflicting edit.
- In playback use Previous/Next, arrow keys, Space, Home/End, full screen or Overview. Reduced-motion preferences disable transitions.
- **Download .pptx** creates editable PowerPoint slides with text, images and teaching notes. Web animations and zoom journeys do not transfer to PowerPoint.
- **Import PowerPoint** supports `.pptx` text and one embedded raster picture per slide, simplified into the studio's layouts. Original animations, complex formatting, charts, tables, video, audio and extra images are not preserved. Legacy `.ppt` files are not supported. Review imported content before saving.
- JSON backups preserve the studio's layouts, notes, all object animations and the nested canvas. Older studio backups and saved decks load automatically with their original content and default object animations. Importing creates a new private presentation owned by the importing teacher; it cannot overwrite someone else's work.
- Up to 40 slides and 700 KB per presentation (including embedded pictures). Large imports are rejected; some pictures may be omitted during import to stay within this limit.
- Shared presentations, including teaching notes and embedded pictures, are public. Drafts are accessible only to their creator. The site does not collect student accounts or student responses. Firebase handles teacher sign-in and session storage; presentation records store a creator UID, not their name or email. Google/Firebase receive the requests necessary for authentication and storage.

## Development and checks

```sh
npm ci
npm test
npm run build
npm run test:rules   # requires Java 17+ and downloads the Firestore emulator
npm run test:ui      # requires Playwright Chromium: npx playwright install chromium
npm run build:site
python3 -m http.server 8000 --directory _site
```

The production build bundles pinned dependencies locally. There are no third-party script CDN dependencies or analytics. Firebase is loaded only when configured. The Pages workflow publishes `_site/`, excluding node_modules, tests and emulator files. Bundled `presentations/dist/` files are committed so a checkout can also run on a plain static server.

UI tests use an isolated mock of the cloud adapter to exercise editing; the separate emulator suite tests actual database rules, including anonymous reads, ownership changes, private queries, stale versions and invalid writes. Real Google OAuth and a deployed Firebase project need the owner setup above.

References: [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin), [Firestore security rules](https://firebase.google.com/docs/firestore/security/rules-conditions), [Three.js CSS3DRenderer](https://threejs.org/docs/pages/CSS3DRenderer.html).
