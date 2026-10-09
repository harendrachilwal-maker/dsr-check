Shaktimaan, here's my PRODUCT.md for Build Sprint. Check it the way the Product thinking pages on the dashboard teach: the job in one sentence with one "so I can", the forces that matter and what the product does about each, today's journey, then the core flow from the moment it hurts to the job done, with what must not happen where it matters, onboarding that asks for the smallest commitment before the first value, what v1 does and doesn't do, and milestones that start with the riskiest part in its simplest form. Tell me the weakest part first and make me rewrite it. Don't write it for me. When every part holds up, lock my product scope.
# PRODUCT.md

## 1. The job
When I have not checked the DSR for a few days and find less cash in the drawer than the DSR’s closing cash balance, I want to quickly understand what happened with the money, so I can catch mistakes or leakage without calling staff and checking old reports one by one.

Other moments it happens:
At month-end when I check the cash records, or at tax time when my accountant asks about old entries and I cannot remember the details.

Who, by situation:
A hotel owner who does not check the daily numbers consistently and depends on staff, DSRs, bills, PMS and WhatsApp to understand what happened with the money.

Today they hire:
Calls to the manager or front office, paper DSRs, PMS, spreadsheets, WhatsApp, bills and their own memory—or they leave the checking until later.

(More than one person in the product? Write a job for each, and mark the one you build for this weekend.)

(Advanced, optional) What needs doing: [ ]

(Advanced, optional) How they want to feel: [ ]

(Advanced, optional) How they want to look to others: [ ]

(B2B only) The bench: end user [ ], decision maker [ ], who pays [ ]

The one we serve first: [ ]

## 2. The switch
What they'd fire: Calling staff and searching old DSRs, bills and WhatsApp messages to find out where the money went.

Push (what's going wrong right now): There is less cash in the drawer than the DSR says, and I don’t know why.

Anxiety → Show who can see the uploaded money photos and where each number came from. Staff confirm or correct the numbers before the owner gets the WhatsApp summary.

Habit → Send the daily summary and any cash gap directly on WhatsApp. The owner can ask “Why is cash short?” and get an answer based on saved reports, bills and staff notes—not another phone call.

The one worry onboarding must remove:
“Can I safely share my money photos and trust the numbers I get back?”

## 3. The core flow

Today

1. I find less cash in the drawer than the DSR shows.
2. I call the manager and ask why.
3. I ask them to send the DSR, bills and payment details.
4. I search WhatsApp for earlier messages or expense explanations.
5. I compare the numbers and ask staff about anything missing.
6. I understand the gap—or leave it unresolved because details are missing.

With my product

1. I find less cash in the drawer than the DSR shows.
2. I message the AI on WhatsApp: “There is ₹___ in the drawer. Why is it short?”
3. The AI checks that day’s confirmed DSR, bills, payment details and saved notes. It shows the cash difference and the records behind its answer.
4. I see what explains the gap and what is still unexplained, without calling staff for information already recorded.

Steps today: 6 · With my product: 4

The daily manager submission that makes this possible is a separate flow below.

What must not happen

Step 3: The AI must not mix up payment sources, invent an explanation or use an old report as today’s. Missing information must be shown as “Not verified,” not treated as correct.

Other flows — Manager’s nightly report

1. The manager uploads the day’s DSR, bills, relevant payment details and notes.
2. The AI reads the numbers and flags gaps. The manager corrects any reading errors, adds available explanations and confirms the extracted numbers.
3. The product saves the report and supporting records by date, then sends the owner a WhatsApp summary. Unexplained gaps stay flagged, even after confirmation.

If the manager skips uploading or confirming:

The product sends a reminder at the agreed reporting time. If the report is still incomplete by the cutoff, it alerts the owner: “The DSR for [date] is missing or unconfirmed. I can’t verify that day’s cash yet.”

The missing day stays visible in the history. The AI does not guess its numbers or include it in totals as though it were checked.

## 4. Onboarding

**First value:**  
The owner receives one real day’s WhatsApp summary showing the confirmed numbers, any mismatch, and anything still unexplained.

**The smallest commitment we ask for:**  
The owner gives the team access to submit the daily DSR, bills and payment records.

**The worry it removes:**  
“Can I trust these numbers without checking everything myself?”

### From opening the link to the first value

1. The owner opens the link and adds the manager/team member who will submit the daily records.  
   **Removes:** “Do I have to do this work myself?”

2. The team uploads one day’s DSR, bills and payment records. The AI reads them, shows where each number came from, and asks the team to confirm or correct anything uncertain.  
   **Removes:** “What if the AI reads something wrong?”

3. The owner receives the first WhatsApp summary showing what matched, what did not, and what is still unexplained.  
   **First value:** “I know what happened without calling the team or checking the reports myself.”

### Missing day fallback

If the team does not upload or confirm the DSR, the owner receives:

**“The DSR for [date] is missing or unconfirmed. I can’t verify that day’s numbers yet.”**

That day stays incomplete until the team submits it. The AI does not guess the missing numbers or show the day as verified.

**Login:**  
Not needed for the owner before first value. The owner should first receive a useful WhatsApp summary.

**What we don’t ask on day one:**  
Full hotel profile, PMS connection, accounting setup, long product tour, room inventory or reporting configuration.

**What we ask later, and when:**  
Hotel details, more team members, preferred reporting time and other settings after the first daily report has been successfully submitted and sent to the owner.

## 5. v1

### Owner does
- Receives the daily WhatsApp summary.
- Sees revenue, cash, UPI, OTA, expenses, dues and mismatches.
- Sees what is confirmed and what is still unexplained.
- The owner also reviews flagged items, asks the manager, and approves.
- Asks questions like: “Why is cash short?” or “What happened yesterday?”
- Does **not** upload DSRs, bills or payment records.

### Team / Manager does
- Uploads the daily DSR, bills and payment records.
- Checks the numbers the AI extracted.
- Corrects anything the AI misunderstood.
- Adds missing context when needed.
- Confirms the day’s report.

### Product does
- Reads what the team uploads.
- Checks DSR numbers against bills and payment records.
- Separates cash, UPI, guest payments, OTA payments and expenses.
- Flags mismatches and unexplained gaps.
- Saves the daily record and context.
- Sends the owner the **real, confirmed daily update** on WhatsApp.
- Alerts the owner when a report is missing, unconfirmed or something does not add up.

### Doesn’t
Full PMS, reservations, room inventory, payroll, staff attendance, accounting software, channel manager, multi-property dashboard or forecasting.

### Nice to have
Weekly/monthly summaries, old-report search, OTA reconciliation, pending-payment reminders and automatic anomaly alerts.

### How I’ll know it worked
**In the first 7 days, the team submits and confirms at least 6 of 7 DSRs, and I call them about cash no more than 1 time instead of my usual 4 times in a week.**

## 6. The riskiest guess
If this is false, the product is pointless: [My guess:

My main concern was whether the AI could correctly understand handwritten notes and tell the difference between guest payments and OTA payments. If it gets that wrong, the owner's WhatsApp summary will also be wrong.]

Thirty-minute check, no code (run it while you build), and what happened: [My check:

I tested one full day's DSR against the same day's bills and account statement. The AI read the handwriting correctly and also correctly understood which payments were from guests and which were from OTAs. The three mismatches it found were real mistakes in the paper records, including a ₹60 difference in the final balance that our own DSR had missed.]

## 7. Milestones

1. **I can** upload one real DSR and have the AI read the numbers **and separate cash, UPI, guest and OTA payments correctly.**
2. **I can** add the same day’s bills and payment records.
3. **I can** compare those records with the DSR and find a real mismatch.
4. **I can** show where each important number came from.
5. **I can** let the team correct or confirm anything the AI is unsure about.
6. **I can** save the confirmed report by date.
7. **I can** send the owner a WhatsApp summary without the owner uploading or checking anything first.
8. **I can** clearly show the owner what matched, what did not match, and what is still unexplained.
9. **I can** let the owner ask the manager about a flagged item and approve it.
10. **I can** let the team submit the next day’s DSR and repeat the same flow.
11. **I can** mark a day as missing or unconfirmed if the team does not submit it.
12. **I can** answer a simple owner question like “Why is cash short?” using the saved DSR, bills and notes.
13. **Last:** I can close it, reopen it, and my data is still there.

### Jobs by person

**Owner — the one we serve first:**  
When the money does not match, I want to know what happened without calling the team or checking old reports myself.

**Manager/team — the person doing the daily input:**  
When the day is finished, I want to submit the DSR, bills and payment records once, confirm the numbers, and be done.

### Build for this weekend

**Team uploads one real DSR + bills → AI reads and separates the payment types → checks for mismatches → team confirms → owner gets the WhatsApp summary.**

### What needs doing

Turn one day of hotel records into a trusted daily update for the owner.

### How they want to feel

**Owner:** “I know what happened without chasing anyone.”  
**Manager/team:** “I submitted the day once and I’m done.”

### How they want to look to others

**Owner:** In control without micromanaging.  
**Manager/team:** Accountable, clear and organised.

