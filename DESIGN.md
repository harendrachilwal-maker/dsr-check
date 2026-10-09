Shaktimaan, here's my DESIGN.md for Build Sprint. Check it the way the Design thinking pages on the dashboard teach: labels instead of vague words, one reference per component with what to take and what to ignore, one font, a few sizes and the colours, every screen with its empty, loading, error and done states, first-screen words that say the outcome, and principles that hold on every screen. Tell me the weakest part first and make me rewrite it. Don't write it for me.# DESIGN.md
Read this before building or changing any screen. If a choice isn't covered here, ask me instead of guessing.

## 1.The feeling, in labels

**1. Centred, single-column layout**

- **Element:** Manager upload page headline, supporting instructions, and primary upload button.
- **What it does:** Creates a clear top-to-bottom reading path. The manager sees the headline first, reads the instructions second, and finds the upload button third.
- **How:**
  - Use a single-column layout on mobile.
  - Centre-align both the headline and supporting instructions.
  - Stack the headline, instructions, and one full-width primary button vertically.
  - Use 24px horizontal padding at 390px screen width and 16px at 320px.
  - Keep 16px between the headline and instructions.
  - Keep at least 24px between the instructions and upload button.
  - Position the button near the bottom of the phone when space allows; on shorter screens, allow natural scrolling.
  - Make the button full-width within the content column, with a minimum height of 48px.

**2. Typographic contrast and visual hierarchy**

- **Element:** Main headline, supporting instructions, and primary upload button.
- **What it does:** Makes the headline visually dominant while keeping the instructions readable and the main action easy to identify.
- **How:**
  - Headline: Inter, 40px, bold (700), letter spacing -0.02em and line height 1.15.
  - Supporting instructions: Inter, 16px, regular (400), normal letter spacing and line height 1.5.
  - Centre-align both headline and instructions.
  - Use text colour #17212F on background #F8FAFC.
  - Use accent #1D4ED8 only for the primary action, with white button text.
  - Establish hierarchy through font size, weight, spacing, and alignment without introducing additional fonts or colours.

## 2. References, one per component

**Reference 1 — Manager Upload Page Headline**

**Reference:** SiteGPT homepage hero

https://sitegpt.ai/

**Take:**
- Large, bold headline that draws attention before the supporting instructions.
- Tight letter spacing for compact typography.
- Meaningful line breaks that keep related words together.
- Strong typographic hierarchy through size and weight.
- Clear spacing between headline and supporting instructions.

**Ignore:**
- SiteGPT's original font family, sizes, and colours.
- Blue highlighting inside headline words.
- Desktop two-column hero layout.
- Decorative marketing elements, navigation, and secondary CTAs.
- Original headline wording.

**Apply:**
- Headline: "Turn Your Paper DSR into a Digital DSR"
- Inter, 40px, bold 700.
- Letter spacing -0.02em.
- Line height 1.15.
- Centre alignment.
- Text #17212F on background #F8FAFC.
- 16px gap before supporting instructions.

**Proposed line breaks at 320px:**

Turn Your  
Paper DSR into  
a Digital DSR

**Proposed line breaks at 390px:**

Turn Your  
Paper DSR  
into a Digital DSR

**Mobile rule:** Verify both versions in the actual browser. Keep the approved 40px display size, prevent clipping, and preserve meaningful phrases.

---

**Reference 2 — Primary Upload Button**

**Reference:** Oscentique upload interface — Screenshot 1.

**Take:**
- One visually dominant upload action.
- Short instructions explaining what to upload.
- Clear whitespace separating the instructions from the action.

**Ignore:**
- Dashed upload container and decorative illustration.
- Black pill-shaped button.
- Secondary "Paste link" button.
- Fragrance-related content and styling.

**Apply:**
- One full-width blue button labelled "Add Photos or Files".
- Background #1D4ED8 with white text.
- Minimum 48px button height.
- Position near the bottom of the mobile screen when space allows.
- Tapping opens the photo/file selector.
- After successful uploads, "Start AI Scanning" becomes the primary action.
- Adding more files remains available as a secondary action.

---

**Reference 3 — File Upload Progress List**

**Reference:** File upload progress interface — Screenshot 2.

**Take:**
- Individual file rows displaying filenames.
- Visible progress while each file uploads.
- Clear uploading and completed statuses.
- Ability to remove incorrectly selected files.

**Ignore:**
- Separate upload modal.
- Desktop drag-and-drop interface.
- Example PDF filenames and unrelated file types.
- Reference fonts, colours, and decorative styling.

**Apply:**
- Show selected DSR files, bills, and expense documents on the same manager upload screen.
- Display each filename and upload status.
- Allow the manager to remove incorrectly selected files.
- Provide retry options for failed uploads without deleting successful files.
- Keep uploading, AI scanning, and manager confirmation as separate statuses.
- Start AI scanning only after the paper DSR has uploaded successfully.
- AI scanning starts through a separate manager action.

---

**Reference 4 — Start AI Scanning Animation**

**Reference:** X Money Card Envelop Reveal Animation

https://60fps.design/appsites/x-money-card-envelop-reveal-animation

**Take:**
- Smooth 3D tilt as the paper document enters.
- Unfolding reveal inspired by the envelope opening.
- Sequential motion: tilt first, unfold second, reveal third.
- Ease-out timing as the document settles.
- One-time entrance animation triggered by Start AI Scanning.

**Ignore:**
- Black envelope and metallic credit card.
- X Money logo, branding, and promotional copy.
- Dramatic rotation that distracts from scanning.
- Marketing CTA animations.
- Continuous looping while AI processes documents.

**Apply:**
- Manager taps "Start AI Scanning".
- A simplified paper DSR tilts forward.
- Folded edges open sequentially.
- A Digital DSR placeholder is revealed.
- The illustration settles into a static processing state.
- Display "Reading your DSR…" while actual AI processing continues.
- Show real extracted figures only when processing succeeds.
- If processing fails, preserve uploaded documents and provide Retry Scanning.

**Motion:**
- Total entrance: approximately 700–850ms.
- Tilt: 150–200ms.
- Unfold: 300–350ms.
- Reveal: 200–300ms.
- Easing: ease-out.
- Do not repeat the entrance while waiting.
- Respect reduced-motion preferences with a static alternative.
- Do not delay completed AI results merely to finish the animation.

**Testing:** Motion timing, phone-width rendering, and reduced-motion behaviour remain pending verification.

---

**Reference 5 — Digital DSR Inline Verification and Correction**

**Reference:** Nanonets document extraction and table editing interface.

**URL:** https://docs.nanonets.com/do/docs/table-annotation

**Component:** AI-extracted financial fields with original-document access and inline correction.

**Take:**
- Keep the original uploaded document accessible while reviewing extracted values.
- Display each AI-extracted financial value as an identifiable field.
- Allow correction even when AI reports successful extraction.
- Keep original documents accessible while making corrections.
- Connect each extracted value to its original source document.
- Provide explicit Save Correction and Cancel actions.
- Show the corrected value after saving.

**Ignore:**
- Desktop two-column layout.
- Nanonets' fonts, colours, and styling.
- Complex spreadsheet and annotation tools.
- Model-training features.
- Automatic saving without an explicit manager action.

**Apply to my DSR app:**
- Keep corrections inside the existing Digital DSR Verification screen.
- Show View Original DSR and Correct for every extracted financial field.
- Tapping View Original DSR expands the actual uploaded document directly above the selected field.
- Allow the manager to zoom into the original document.
- Highlight the relevant source region only when its location is reliably known.
- Tapping Correct makes the extracted amount editable within the same report row.
- Keep the original AI-extracted value available for comparison.
- Allow only one active correction at a time.
- Save Correction validates and saves the corrected value.
- Cancel discards unsaved changes.
- Preserve the original document, previous AI value, corrected value, selected staff identity, and correction timestamp.
- Recalculate affected totals and cash differences after saving.
- If saving fails, preserve the typed correction and allow Retry.
- Correcting an individual amount does not automatically confirm the whole Digital DSR.

**Mobile behaviour:**
- Single-column layout.
- Original DSR image expands above the edited field.
- Keep Save Correction and Cancel accessible when the keyboard opens.
- Avoid sudden scrolling that moves the active field out of view.
- Use the locked Inter font, approved sizes, colours, and spacing.
- Test at 320px and 390px.

## 3. Type and colour

**Font:** Inter — one typeface across the product's web interface.

**Sizes:**
- **Display:** 40px — main screen headline or primary number.
- **Heading:** 20px — section headings.
- **Body:** 16px — instructions, labels, buttons, and supporting text.

**Colours:**
- **Text:** #17212F — dark slate.
- **Background:** #F8FAFC — cool off-white.
- **Accent:** #1D4ED8 — blue, reserved for the main action.
- **Errors:** #B42318 — red, reserved for errors.
- **Button text:** #FFFFFF — white on the blue primary button.

**Rules:**
- Use Inter throughout the web interface.
- Do not introduce additional font sizes or colours without approval.
- Keep one visually dominant main action per screen state.
- Maintain at least 4.5:1 contrast for normal text and 3:1 for large text.
- Check the 40px display headline at 320px and 390px phone widths.

## 4. Screens

**Flow:** Owner grants shared staff access → Manager uploads paper DSR → Starts AI scanning → Verifies Digital DSR → Corrects AI reading errors if necessary → Adds required supporting records → Confirms DSR → Owner receives WhatsApp summary → Owner investigates flagged items when needed → Owner financially approves an eligible report by replying "checked".

**Reporting schedule:**
- **Reporting date:** Same calendar day.
- **Daily closing:** Paper DSR and physical cash count completed before 13:00.
- **Reporting time:** 13:00 IST.
- **Final cutoff:** 15:00 IST.
- **Timezone:** Asia/Kolkata.
- **Reminder:** At 13:00, remind staff if the same day's DSR is not manager-confirmed.
- **Owner alert:** At 15:00, notify the owner if the same day's DSR remains missing, incomplete, or unconfirmed.

### Owner setup — Website

**For:** Giving hotel staff access to submit daily DSRs.

**Top to bottom:** Short explanation · Shared staff access setup · Primary action

**Main action:** Create Staff Access Link → enables staff access to the manager upload workflow.

**Empty, first visit:** "No staff access has been configured yet."

**Empty, coming back:** Show existing shared access or unfinished setup.

**Loading:** "Setting up staff access…"

**Error:** "We couldn't create the access link. Please try again."

**Done:** "Staff access is ready."

**If the AI answer is wrong:** Not applicable.

**Rules:**
- Staff use shared access to the web app.
- Staff select their name when confirming a Digital DSR.
- The person who physically counted cash must be identified separately.
- Staff name selection is self-reported and is not authenticated identity verification.
- Access must remain restricted to the appropriate hotel and records.

### Manager daily upload — Website

**For:** Uploading the current day's paper DSR and supporting documents so AI can create a Digital DSR.

**Top to bottom:** Headline · Upload instructions · Selected document list · Upload progress · Paper DSR requirement · Primary action

**Main action, initial:** Add Photos or Files → opens the photo/file selector.

**Main action, files ready:** Start AI Scanning → AI begins reading the uploaded documents.

**Empty, first visit:** "Turn Your Paper DSR into a Digital DSR" · "Upload photos or files of your paper DSR, expense bills, and payment records." · Add Photos or Files

**Empty, coming back:** "No DSR uploaded for [date] yet." Restore unfinished uploads when available.

**Loading, uploading:** "Uploading your documents…" Show individual filename and upload progress.

**Loading, scanning:** "Reading your DSR…" Play the approved Paper DSR Reveal animation once, then maintain honest processing feedback.

**Error, upload failed:** "[Filename] couldn't be uploaded. Try again."

**Error, unreadable DSR:** "We couldn't read your DSR clearly. Upload a clearer photo."

**Error, scanning failed:** "We couldn't finish reading your DSR. Try scanning again."

**Done, files uploaded:** "Paper DSR uploaded. Ready to scan."

**Done, scanning completed:** "Digital DSR ready for verification."

**If the AI answer is wrong:** The manager corrects extracted figures or reuploads affected documents during Digital DSR Verification.

**Rules:**
- Paper DSR is mandatory to start AI scanning.
- Supporting bills and payment records can be uploaded before or after the initial scan.
- File selection and upload progress remain on the same screen.
- Preserve successfully uploaded files if another upload fails.
- Do not show invented extracted figures during scanning.
- Successful scanning opens Digital DSR Verification.

### Digital DSR verification — Website

**For:** Helping the manager check AI-extracted numbers against the paper DSR and confirm that mandatory supporting records have been uploaded.

**Top to bottom:** Reporting date · Extracted Digital DSR · Revenue · Cash · UPI · Guest payments · OTA payments · Expenses · Expected closing cash · Physically counted cash · Cash difference · Original evidence · Supporting-document checklist · Cash counter selection · Verifying staff selection · Main confirmation action

**Main action, incomplete:** Add Required Records → returns to the existing upload interface for the same dated report.

**Main action, complete:** Confirm DSR → saves the manager-confirmed report and initiates delivery of the owner's WhatsApp summary.

**Empty, first visit:** "No Digital DSR yet. Upload your paper DSR to begin."

**Empty, coming back:** Restore an unfinished verification, including uploaded records and corrections.

**Loading:** "Preparing your Digital DSR…"

**Loading, additional documents:** "Checking your additional records…"

**Error, incorrect AI reading:** "This number doesn't match your paper DSR. Correct it or upload the document again."

**Error, required document missing:** "Required supporting records are still missing. Add them before confirming."

**Error, confirmation failed:** "Your DSR couldn't be confirmed. Please try again."

**Done:** "Digital DSR verified and saved." Show WhatsApp delivery status separately.

**If the AI answer is wrong:** The manager compares extracted values with original evidence, corrects misread figures or reuploads affected documents.

**Inline Correction — AI-extracted financial fields**

**For:** Helping the manager compare AI-extracted financial figures against the paper DSR and correct mistakes without leaving the verification screen.

**Top to bottom:**
- Financial field name.
- AI-extracted value.
- View Original DSR action.
- Correct action.
- Expandable original paper DSR image above the selected field.
- Editable amount when correction begins.
- Save Correction and Cancel actions.

**Main action, default:** Continue reviewing extracted figures.

**Main action, editing:** Save Correction → validates and saves the changed amount.

**Default:**
- Show the extracted amount with View Original DSR and Correct actions.
- Keep Correct available even when AI reports successful scanning or high confidence.
- Allow the manager to inspect the source before confirmation.

**Source expanded:**
- Show the actual uploaded paper DSR directly above the selected financial field.
- Support document zoom.
- Keep the manager on the same verification screen.
- Highlight the relevant source area only when its location is reliably known.

**Editing:**
- Make the selected amount or payment classification editable.
- Keep the original source accessible.
- Show the previous AI-extracted value.
- Allow only one active correction at a time.
- Provide Save Correction and Cancel.
- Do not allow whole-report confirmation while an edit remains unsaved.

**Cancel:** Discard the unsaved correction and restore the previously saved value.

**Loading:** "Saving your correction…"

**Error, invalid value:** Explain what needs to be corrected before saving.

**Error, save failed:** "Your correction couldn't be saved. Try again." Preserve the entered amount.

**Done:** "Correction saved." Show the corrected figure and update affected totals and cash differences.

**If AI is wrong:** The manager compares the extracted figure with the paper DSR and corrects the amount or reuploads the relevant document.

**Incomplete extraction:**
- **Not extracted:** AI couldn't determine the amount. Do not treat it as zero. Require the manager to inspect the original evidence, supply a verified value, or reupload the source. Block confirmation while a mandatory financial field remains unresolved.
- **₹0:** A numerical zero, which must still be checked against the original record.
- **No activity:** Explicit confirmation that the category has no transactions. Do not treat it as missing extraction.

**Correction history:**
- Preserve the original AI-extracted value.
- Preserve the manager's corrected value.
- Record the selected correcting staff member and correction timestamp.
- Preserve the original uploaded document.
- Recalculate relevant totals and cash differences.
- Never overwrite original source evidence.

**Paper DSR Error:** If AI reads the paper correctly but the original DSR contains a financial mistake, flag the error and show it in the owner's WhatsApp summary. Do not adjust the original or Digital DSR in v1.

**Confirmation rule:** Saving a correction does not confirm the whole report. Confirm DSR remains the separate final manager action after all required checks pass.

**Mobile rule:** Use the existing single-column layout, approved typography, and colours. Keep Save Correction and Cancel accessible above the keyboard. Test at 320px and 390px.

**Cash verification rules:**
- AI extracts expected closing cash and physically counted cash separately from the paper DSR.
- Do not ask the manager to enter the same cash amount again.
- Calculate the difference between expected and physically counted cash.
- The manager selects who physically counted cash.
- The confirming staff member selects their own name separately.
- Record the digital confirmation timestamp automatically.
- Do not invent the physical cash-count time.
- Preserve genuine financial differences even when the AI has read the records correctly.

**Mandatory supporting records:**
- Daily paper DSR.
- Daily UPI statement when UPI activity exists.
- Daily guest/PMS report when applicable.
- OTA booking/payment records when applicable.
- Individual expense bills or uploaded alternative evidence.
- Available underlying proof for flagged transactions.
- Explicit No activity status when a payment category has no transactions.

**Confirmation rules:**
- AI extraction must be checked and verified by the manager.
- All applicable mandatory underlying records must be uploaded.
- Uploaded alternative evidence can remain pending owner acceptance.
- Genuine unexplained financial differences do not block sending an otherwise complete, manager-confirmed report.
- Manager confirmation does not mean owner financial approval.
- Preserve original documents, corrections, and verification history.

### Reports dashboard — Website

**For:** Allowing the owner to inspect full Digital DSR records, cash information, supporting evidence, financial history, and approval statuses whenever needed.

**Top to bottom:** Dated report history · Reporting status · Revenue · Cash · UPI · Guest payments · OTA payments · Expenses · Dues · Cash differences · Flagged items · Original documents · Explanations · Evidence decisions · Financial approval history

**Main action:** Open Report → displays the selected date's full Digital DSR.

**Empty, first visit:** "No daily reports have been submitted yet."

**Empty, coming back:** "No report found for [date]." Keep other report dates accessible.

**Loading:** "Loading your saved reports…"

**Error:** "We couldn't load this report. Please try again."

**Done:** Show the full saved report, its current approval status, and associated evidence.

**If the AI answer is wrong:** Preserve original evidence. Required corrections go through manager verification and maintain report-version history.

**Rules:**
- The dashboard is optional for the owner.
- WhatsApp remains the owner's primary daily reporting and financial approval interface.
- Do not require a web dashboard visit for daily financial approval.
- Preserve original DSR records, explanations, evidence decisions, and report versions.
- Owner cash-check records can also appear in the dashboard.

### Owner daily summary — WhatsApp

**For:** Showing the owner the same calendar day's manager-confirmed financial report, including figures and items that need attention.

**Top to bottom:** Hotel · DSR date · Report version · Revenue · Cash · UPI · Guest payments · OTA payments · Expenses · Dues · Cash differences · Flagged items · Supporting evidence status · Financial approval status · Dashboard link when needed

**Main action, eligible report:** Reply "checked" → financially approves the specific dated report.

**Main action, unresolved issues:** Investigate the flagged item, review evidence, and accept the required explanation before financial approval.

**Empty, first visit:** "Today's report has not been confirmed yet."

**Empty, coming back:** Previous report messages remain accessible in WhatsApp.

**Loading:** "Checking today's confirmed DSR…"

**Error, missing report:** "The DSR for [date] is missing or unconfirmed. I can't verify that day's cash yet."

**Error, approval blocked:** "This DSR cannot be approved yet. [Specific missing evidence or unresolved difference] still needs attention."

**Error, ambiguous approval:** Ask which reporting date and version the owner wants to approve.

**Done, summary delivered:** Show the manager-confirmed daily figures and any remaining financial flags.

**Done, owner approved:** "DSR for [date] approved." Save the owner approval against the correct report version.

**If the AI answer is wrong:** Owner can question any number and request its underlying evidence. The agent must not invent explanations or silently change confirmed records.

**Rules:**
- A manager-confirmed report may contain genuine unresolved financial differences.
- Paper DSR Errors are flagged and shown in the owner's WhatsApp summary without adjusting the original or Digital DSR in v1.
- Those differences remain visible in the WhatsApp summary.
- Owner financial approval remains blocked until required explanations and evidence have been accepted.
- Only the owner can financially approve the DSR.
- Replying "checked" means financial approval, not merely that the message was read.
- Approval must be attached to the correct reporting date and report version.
- Revised reports do not automatically inherit an earlier approval.

### Flagged-item explanation and evidence review — Existing Website and WhatsApp

**For:** Allowing the manager or owner to explain flagged differences and provide supporting evidence without creating a separate mandatory screen.

**Top to bottom:** Flag reason · Amount · Original DSR entry · Existing supporting evidence · Explanation · Additional evidence · Current issue status

**Manager action:** Add Explanation or Supporting Evidence → saves information against the existing dated Digital DSR.

**Owner action:** Review Explanation or Evidence → accepts or rejects the relevant item through WhatsApp.

**Empty:** "There are no flagged items requiring an explanation."

**Loading:** "Opening the flagged item and supporting records…"

**Error:** "The supporting record couldn't be opened. Ask the manager to provide it again."

**Done, explanation submitted:** "Explanation saved and awaiting owner review."

**Done, owner accepted:** Record the accepted explanation or evidence against the relevant flagged item.

**If the AI answer is wrong:** The original record remains visible, and any correction must follow the manager's verification process.

**Rules:**
- The manager may record an explanation in the web app.
- The owner may record an explanation through WhatsApp.
- The owner reviews alternative evidence in WhatsApp or through a secure document link.
- Only the owner can accept or reject explanations and alternative evidence.
- Accepting an explanation is not the same as financially approving the DSR.
- The original flagged difference remains visible in history.
- If an original bill is missing, uploaded alternative evidence must be explicitly accepted by the owner.
- Rejected or unavailable evidence remains an approval blocker.
- Keep the original evidence, explanation source, acceptance decision, and timestamps.

### Why is cash short? — WhatsApp

**For:** Helping the owner understand differences between expected cash and independently counted physical cash using saved DSR records.

**Top to bottom:** Count date/time · Last relevant closing cash · Cash received · Cash expenses · Deposits and transfers · Expected drawer cash · Owner physically counted cash · Difference · Source records · Verification status

**Main action:** Send Cash Count → owner provides the physically counted cash amount and actual count time.

**Empty:** "No independent cash count has been recorded yet."

**Loading:** "Checking the saved DSRs and cash movements…"

**Error, incomplete records:** "I can't verify the cash difference yet. Some cash movements or transaction times are missing."

**Done, verified:** Show expected cash, owner-counted cash, any difference, and the supporting records.

**Done, pending:** Save the owner's cash count and explain what information is needed for reconciliation.

**If the AI answer is wrong:** Owner can request source evidence. Correct AI extraction errors through manager verification and preserve the original records.

**Rules:**
- The hotel uses one central cash drawer.
- The manager physically counts cash at daily closing.
- The paper DSR records daily cash movements as totals without individual transaction times.
- The owner may physically count cash at different times of day.
- Record the owner's actual counted amount and actual count date/time.
- Do not assume the WhatsApp message time is the physical cash-count time.
- Use the last suitable closing cash balance and relevant subsequent cash movements.
- Do not double-count movements already included in the closing balance.
- Do not assume daily totals identify which transactions happened before a midday count.
- Allow an optional same-time cash checkpoint through WhatsApp.
- At the optional checkpoint, the owner or team may provide cash received, expenses, deposits, and transfers since the last relevant closing.
- Preserve the amount, time period, and source of checkpoint movements.
- If information is insufficient, show "Not verified" rather than inventing a cash shortage.
- Save the owner's independent cash count separately from the manager's daily count.
- A cash-count message does not count as financial approval of a DSR.

### Missing-day alert — WhatsApp

**For:** Informing the owner that the manager has not completed the required same-day DSR.

**Top to bottom:** Reporting date · Missing or incomplete records · Manager verification status · What cannot be verified · Current report status

**Main action:** View Report Status → opens the relevant incomplete report in the optional dashboard, where authorised.

**Empty:** "All required daily reports are complete."

**Loading:** "Checking today's DSR submission status…"

**Error:** "The DSR for [date] is missing or unconfirmed. I can't verify that day's cash yet."

**Done, report completed:** "The team has completed the DSR for [date]. The confirmed summary is now available."

**If the AI answer is wrong:** Verify the report date and saved submission status before issuing an alert. Do not invent missing financial information.

**Reporting rules:**
- **Daily closing:** Paper DSR and physical cash count are completed before 13:00.
- **Reporting date:** Same calendar day.
- **Reporting reminder:** 13:00 IST.
- **Final cutoff:** 15:00 IST.
- **At 13:00:** Remind staff if that day's DSR is not manager-confirmed.
- **At 15:00:** Notify the owner if the same day's DSR remains missing, incomplete, or unconfirmed.
- **After cutoff:** Manager may still complete the report.
- **Late submission:** Send the summary once manager-confirmed and retain its late-submission history.
- **Delivery failure:** Keep manager confirmation separate from WhatsApp delivery status, and retry without duplicate submissions or approvals.
- A missing-day alert must never be presented as a verified daily financial summary.

**Pending implementation and testing:**
- Determine the exact business closing cutoff, which is known to occur before 13:00.
- Test all screens at 320px and 390px widths.
- Verify full-width button visibility, tap targets, keyboard behaviour, and scrolling.
- Verify paper DSR animation timing and reduced-motion support.
- Test AI extraction against original handwritten records.
- Test inline correction, Save Correction, Cancel, save failure, and source expansion.
- Test confidently wrong AI-extracted figures, Not extracted, ₹0, and No activity.
- Test missing evidence, alternative evidence acceptance, and blocked approvals.
- Test Paper DSR Error flags appearing in the owner's WhatsApp summary without adjusting original figures.
- Test WhatsApp delivery failures, ambiguous "checked" replies, and report-version handling.
- Check shared-link permissions and self-reported staff attribution.
- Test first-visit, returning, loading, error, and done words with actual users.

## 5. The first screen's words

**Headline:** Turn Your Paper DSR into a Digital DSR

**Under it:** Upload photos or files of your paper DSR, expense bills, and payment records.

**Button:** Add Photos or Files

## 6. Principles

### 1. One main action per screen state

- Every screen should have one clearly identifiable primary action.
- Keep the main action within comfortable thumb reach on mobile.
- Change the primary action based on the user's current state, rather than displaying competing primary buttons.
- Keep secondary actions visually less prominent.
- Do not add an action unless it serves the user's core flow.

### 2. Never hide uncertainty

- Clearly distinguish AI-extracted, manager-confirmed and owner-approved information.
- Display missing evidence, uncertain figures and unexplained financial differences visibly.
- Never present an AI guess as a verified financial fact.
- When information cannot be verified, explicitly say "Not verified" and explain what information is missing.
- Preserve original evidence so users can understand where financial numbers came from.

### 3. Make mistakes recoverable

- Every error must explain what went wrong and what the user should do next.
- Allow users to retry failed uploads, reupload unreadable documents and correct AI-extracted values.
- Preserve successfully uploaded files, corrections and other completed work when an error occurs.
- Never silently overwrite original financial records.
- Confirm successful actions and clearly show what changed.

### 4. Maintain one visual language

- Follow the typography, colours, spacing and layout decisions already approved in DESIGN.md.
- Use Inter as the single typeface, with the approved 40px, 20px and 16px type scale.
- Use the approved text, background, primary-action and error colours only in their defined roles.
- Keep visual hierarchy consistent through typography, alignment, spacing and weight.
- Do not introduce new fonts, colours or type sizes without approval.
- Validate screens at mobile widths before treating the design as complete.

### 5. Design for the user's existing workflow

- Design around the actions users already perform rather than forcing unnecessary new habits.
- Keep WhatsApp as the owner's primary daily reporting, questioning and approval interface.
- Keep document uploading and manager verification in the web app.
- Do not ask users to enter information again when it can be reliably extracted from existing records.
- Merge screens when they serve the same job, and avoid unnecessary navigation.
- Keep the optional web dashboard available without making it a mandatory part of the owner's daily reporting routine.