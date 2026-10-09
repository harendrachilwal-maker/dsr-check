# Plan

From PRODUCT.md milestones. Build one milestone at a time.

1. **PHONE FLOW CHECKED — I can** upload one real DSR and read every monetary line grouped into Sales, Payment, Expense and Cash balance, preserving the written labels and flagging uncertainty. Code calculates section totals. (Current owner-approved revision of PRODUCT.md milestone 1.)
2. **PHONE FLOW CHECKED — I can** choose the reporting date, upload DSR photos separately from Other photos, and read each document without combining amounts.
3. **COMPARISON TRIAL BUILT — I can** compare those records with the DSR and find a real mismatch.
4. **I can** show where each important number came from.
5. **DEV PASSED — I can** correct labels and amounts inline, preserving the original AI values, then Confirm day.
6. **DEV PASSED — I can** save the confirmed report by document date and reopen it from History.
7. **I can** send the owner a WhatsApp summary without the owner uploading or checking anything first.
8. **I can** clearly show the owner what matched, what did not match, and what is still unexplained.
9. **I can** let the owner ask the manager about a flagged item and approve it.
10. **I can** let the team submit the next day’s DSR and repeat the same flow.
11. **I can** mark a day as missing or unconfirmed if the team does not submit it.
12. **I can** answer a simple owner question like “Why is cash short?” using the saved DSR, bills and notes.
13. **Last:** I can close it, reopen it, and my data is still there.

Milestone 1: one DSR, with up to six photos of the same date (including front and back), 10 MB combined; each returned line has section, exact label, amount and unclear; sections are Sales, Payment, Expense and Cash balance. Code calculates totals from extracted entries; uncertain or unreadable contributing lines leave totals incomplete. Unreadable fields show "Not extracted". No login, WhatsApp, manager confirmation, owner approval or owner dashboard. Limit AI calls server-side. Real photos remain local and are never committed.

Latest approved revision: restore the Reporting date field and provide separate DSR photos and Other photos selection areas. Other photos include guest bills, food bills, UPI records and expenses without category forms. Photos only; no Excel option. The selected date chooses the row from a monthly sheet. Code passes declared DSR source numbers, checks response date/source/type and never lets bill photos replace a DSR or fill blank sheet cells. Missing/wrong-date DSR rows remain unextracted. Comparison stays milestone 3. No paid test call is approved for this revision. No login, confirmation, approval or owner dashboard.


Approved comparison revision: read source-grounded roles, payment direction, payee, purpose and references alongside the unchanged original lines. Code groups a bill with its payments and counts the expense once; split cash/online payments may share an established expense. Show source photos, matches, differences and missing information. Equal amounts alone do not establish a connection. Ask the manager for context when needed, label their answers separately, and recheck in Convex without another AI call. Missing or unclear figures never become zero; missing bills remain flagged even when totals agree. No confirmation, approval, report persistence, WhatsApp or dashboard. No paid test call approved for this revision.

Current owner-approved revision (2026-10-09): add inline label/amount corrections with Save Correction and Cancel, followed by Confirm day. Save every source line, AI values, changed labels/amounts, original written totals, code-calculated Matches/Differs/incomplete checks and backend confirmation time in Convex under the identified DSR document date. History lists dates newest first and opens saved lines after a refresh. Confirming an existing date asks "Replace the saved day?"; code checks the current saved version before replacing and preserves the old version. Missing amounts stay null/Not extracted and unresolved differences remain flagged. No photos are saved, no login, WhatsApp or owner screens. Anonymous History is private to the same browser using a random access key, separate for dev/prod. AI reading, instructions and model are unchanged. Only dev is updated for this step; one real-photo scan of the 4 October records was approved.
