# AGENTS.md

## 1. How the product works

### Interface
The manager uses a mobile web app to upload the paper DSR and supporting records, review the extracted Digital DSR, correct reading mistakes, and confirm the report. The owner receives the manager's manually sent WhatsApp summaries. The approved development-only property extension also gives the owner a signed-in web view of their property's saved monthly figures and dated receipts, with separately recorded owner edits. WhatsApp questions, automatic delivery and financial approval remain separate later work.

### Business logic
Backend code coordinates AI extraction, calculates cash differences, checks required evidence, saves manager-confirmed reports, and sends their summaries. It checks report eligibility and the owner's authority before recording financial approval. AI extraction, manager confirmation, message delivery, and owner approval are separate states.

### Database
Remember original documents; dated reports and their versions; AI-extracted values and later corrections; supporting evidence; explanations; manager confirmations; WhatsApp delivery status; and owner decisions. Preserve sources and history rather than silently replacing confirmed or approved financial information.

### Third parties
AI: see section 4. Current WhatsApp sharing uses a manual draft link. The property extension adds no WhatsApp API or email-delivery service.

### Approved property-owner extension (development only, 2026-10-12)
- The owner signs up or signs in with the existing Convex email/password system and creates one property. One owner and one active manager are in scope; no multi-property controls.
- The owner invites one manager by email and copies a private invite link to share themselves. The manager signs in or signs up with the invited email. The backend binds acceptance to the authenticated account and checks membership on every request; a link alone grants no record access.
- The owner sees one selected month's five saved corrected DSR totals: Room revenue, Food revenue, Guest cash, Guest UPI and Expenses. Show the three existing Sales vs money counts: Matches, Check and Not enough info. The existing missing-amount count means saved confirmed days with at least one missing or uncertain summary amount; it is not a count of absent calendar dates. Keep missing amounts distinct from zero and keep supporting-evidence status separate.
- The owner can open the existing saved-day receipt and edit saved labels and amounts. Each owner save creates a new report version with its own author and time, preserving original AI readings, manager corrections, the original manager confirmation and earlier versions. An owner edit is not a new manager confirmation or financial approval.
- Removing the manager revokes their property access on the backend, including requests from an already signed-in session. Keep the property's reports and history.
- The manager belongs to one property and retains the existing upload, correction, Confirm day, History, receipt and Send to owner flow. Property membership replaces account-only record scope; every backend read and write enforces property isolation and role permissions.
- Only the currently authenticated account's own private legacy account records may be attached to its new property. Preserve existing records and versions; do not gather other accounts' records, bulk-migrate test accounts or migrate anonymous browser records. Photos remain unstored. No production operation, deployment or paid test call is authorised by this extension.

### Still outside this extension
- Multi-property management, more than one active manager per property, automatic invitation emails, WhatsApp API delivery, owner Q&A, financial approval and new stored photos.

### Governing rule
AI reads and helps explain. Code calculates and enforces rules. The manager verifies. The owner approves.

### First value and scope
The first useful result is the manager-confirmed summary, not owner approval. Approval comes afterward and has its own checks. Follow the approved IDEA_SCOPE.md, PRODUCT.md, PLAN.md and DESIGN.md for scope, wording and exclusions. The explicit property extension approved on 2026-10-12 supersedes the older blanket exclusion of owner web screens only within the narrow scope above. Older WhatsApp-only or broad dashboard descriptions do not authorise additional features.

### Bug reports
When I report a bug, I will describe what I did, what I expected, what happened, and the suspected part. Investigate that part first, but tell me if the evidence points elsewhere. Find the cause before changing code.

## 2. How we work

- Read IDEA_SCOPE.md, PRODUCT.md, PLAN.md and PROGRESS.md before starting. Read DESIGN.md before any screen work. If a required file is missing, say so; do not invent its contents.
- Before writing code, explain your understanding in two or three sentences, then give your plan. Wait for my approval.
- Build only the next milestone in PLAN.md, end to end. Put new ideas in the parked list instead of expanding the task.
- Test the manager's flow on the mobile web app and the owner's flow in WhatsApp. A web simulation does not prove WhatsApp works.
- Before reporting a milestone as ready, run relevant tests, check the interface at phone width, and tell me exactly how to test it on my phone. State anything you could not verify.
- Use a separate, read-only review before accepting a milestone. Classify issues as blocker, should-fix or cosmetic. Fix blockers before moving on.
- When I report a bug, find the cause before changing code. Fix that issue without unrelated changes.
- Add or update tests to protect existing behaviour. Remove tests only when the behaviour they check is deliberately removed.
- After I confirm a milestone works, update PROGRESS.md, commit and push. Follow the agreed shipping rules for deployment.
- Never put secrets in frontend code, VITE_ variables or committed files. Never ask me to paste a secret into chat. Use made-up hotel records in public test files.
- Do not change approved product scope, locked design or copy, or financial approval rules without my explicit approval.
- Ask before destructive operations or actions that introduce new charges. Do not assume unrestricted permission.

## 3. Shipping

- **Live link:** https://ideal-mongoose-563.convex.site (production; first deployment confirmed by the owner and page verified on 2026-10-09). Never give someone a `localhost` link as the live app.
- **Repo:** https://github.com/harendrachilwal-maker/dsr-check (public code repository). Public repo means code only, not real hotel/guest records, receipts or secrets.
- **Stack and host:** Use Convex for backend functions, database and the existing email/password sign-in; use Convex Static Hosting for the web interface. Preserve manual WhatsApp sharing alongside the approved development-only owner property view. No substitute web chatbot is in scope. Check the chosen component's current integration guidance before wiring deployment.
- **Deploy:** Set up and document an `npm run deploy` script for the project. In this sprint workflow a `git push` by itself is not assumed to deploy. Only after I say a milestone works: update progress, commit, push, then deploy when that milestone is ready to ship; provide the new live link and result.
- **Dev vs. prod:** Keep development and production Convex deployments, stored records and environment variables distinct. A dev upload must not appear in production automatically. Test missing production configuration rather than assuming dev settings copied across.
- **Secrets:** `OPENAI_API_KEY` must be stored in Convex environment variables separately for dev and prod; the value is never committed, copied into a `VITE_` variable, printed in logs or requested in chat. `VITE_CONVEX_URL` is a public endpoint, not a secret. A future WhatsApp credential follows the same backend-only principle, with its final variable name chosen at that milestone.
- **Public repo hygiene:** `.gitignore` includes `.env.local` and other local secret files. Inspect current files and Git history for secrets before making the repo public. Use fabricated test DSRs in commits; never commit real guests' names, phones, documents, bills or financial records. Rotate any leaked key; deleting it from the current file does not clear history.
- **Access enforcement:** Backend functions enforce property-record access, active owner/manager membership, upload permissions, owner edits and financial-approval rules. Property invitations are private and bound to the authenticated invited email; the link alone is not proof of identity. Older shared staff links and staff name selections are not authority for property access. Only an authorised owner may financially approve a specifically identified dated/versioned DSR when that later feature exists. Never rely on hiding a UI control for security.
- **Release check:** Open the deployed manager site on a real phone at mobile width, logged out and using mobile data; run the actual core flow with a safe test record. Check the WhatsApp flow in WhatsApp once its milestone exists. Confirm the production API key, hard spend limit, call cap and error states before enabling paid public AI use.
- **Recovery:** Preserve the last known working Git version. If a release breaks, inspect logs and compare commits before changing code; keep unshipped work on another branch when reverting.

## 4. The AI call

- **Model:** `gpt-6-luna` (OpenAI Responses API), `reasoning.effort: low`.
- **Purpose:** Read the supplied paper DSR and extract source-grounded figures and payment categories (cash, UPI, guest and OTA), then eventually help answer an owner's questions from authorised saved evidence. Do not treat the model as an accounting or approval authority.
- **Input:** Only the documents and relevant instructions needed for the current user action. For Milestone 1, the paper DSR is mandatory; other supporting documents are optional at scanning time. Handle images/PDF pages with readable original details. Do not blindly resize dense handwritten DSRs to 1024 pixels; test legibility, enforce backend upload limits after reviewing sample documents, and preserve the original upload securely.
- **Output:** Ask for structured data, with the source field/page when available, a clearly marked uncertain or missing state instead of a guessed amount, and the original AI answer retained separately from later manager corrections. Validate data types and allowed categories in backend code; perform all money calculations deterministically in backend code.
- **Where it runs:** A Convex **action**, never the phone's interface. A server-side internal mutation can enforce rate limits and an internal query/mutation can read/write records; the action does not write database rows directly.
- **Key:** `OPENAI_API_KEY` in Convex backend environment variables for development and production. Never in code, `VITE_` variables, browser requests, committed files or chat.
- **Reply cap:** Use `max_output_tokens: 500` as the handbook's initial **Milestone 1 trial cap**, not as a proven size for full multi-page DSR extraction. Check real structured-output completeness; adjust to the smallest verified cap before production if needed. Later owner Q&A requires its own tested cap.
- **Calls cap:** Start with at most **100 AI calls/hour across the app**, enforced server-side before the chargeable API call (not just on the screen). Consider a smaller dev allowance and per-access-link abuse limits when implementing; test cap-hit handling.
- **Provider limit:** Set and enable an enforced **hard monthly spend limit** in the OpenAI project/organisation before any public paid AI access. The owner must choose the dollar amount; **no amount has been chosen or set yet**. An alert alone is not a cap, and enforcement can lag slightly.
- **Failure:** If the AI call fails or a cap is reached, show **“Busy right now. Try again in a few minutes.”** Keep uploaded files and in-progress corrections where safe; do not invent a DSR or mark a report confirmed.
- **Login/access:** Do not copy PhotoCal's anonymous phone-label scheme. Use the existing Convex email/password sign-in for owners and invited managers in the approved property extension. Derive property membership and role permissions in the backend. Manual WhatsApp sharing remains separate; the future authorised WhatsApp channel and financial approvals are not implemented by an owner web view or edit.
- **The AI must never:** Invent an unreadable amount or missing cash movement; silently modify original source figures, previously confirmed reports or approvals; accept a manager's action as owner approval; expose records from another hotel; approve a DSR from an ambiguous “checked”; claim a message was delivered when delivery failed.
- **Evaluation:** Compare outputs against a representative DSR, including clear and blurry photos, handwritten numbers, missing fields and ambiguous categories. Log useful, access-controlled traces without storing secrets; preserve original extraction and human correction. Use measured accuracy and cost to tune the limits before launch.
