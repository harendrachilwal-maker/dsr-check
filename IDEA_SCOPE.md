# Agreed scope

Confirmed by the owner after the grill-me interview. This section is the current scope; the original idea below is background, not an additional feature list.

## Person and problem

The first user is the owner of this hotel, who has about five years of experience in this workflow. Two other hotel owners in their existing network are possible early testers; their participation is not yet confirmed.

The owner cannot check every report, expense bill, cash collection, or payment every day. Paper numbers and prices may be overwritten. Some guest payments go into a manager's personal account. Later, the owner struggles to reconstruct what happened and whether money or records are missing.

The job: give the owner a clear record for each date of guest charges, payments, vendor expenses, supporting bills, and unresolved differences.

## First version

Managers upload the daily sales report (DSR), guest bills, vendor bills, and payment evidence on a web page. The owner receives a daily WhatsApp summary.

Accept clear photos of handwritten reports and bills, or reports/screenshots from the property management system (PMS). If numbers cannot be read, request a clearer photo or PMS report instead of treating them as verified.

Guest records are organized by date and room number. Accommodation and food charges are separate. Keep booking source separate from payment method: bookings may come through an online travel agency (OTA), such as MakeMyTrip, a travel agent, or a walk-in guest; payments may be cash, UPI, card, or a payment from an OTA or agent. Track advances, refunds, and discounts separately so an advance is not counted twice as revenue. Show amounts received separately from amounts still owed.

Compare guest bills, payment evidence, and the DSR. Match vendor expenses using the vendor and amount already written in the DSR. If a report only has an expense total, its breakdown needs checking during the manual trial.

Each manager uses their own account. Keep uploaded source documents and the history of corrections: original reading, corrected value, person making the change, and reason. Managers confirm or correct extracted information before the daily summary.

## Matching and review rules

- Automatically mark matching vendor bills and DSR expenses as matched. A manager can correct a wrong match.
- Keep vendor or amount mismatches flagged for the owner to review. The manager may add an explanation.
- For a missing bill, let the manager upload it or explain. An explanation alone does not remove the missing-bill flag from the daily summary.
- Track guest bill numbers and ask the manager to explain gaps. Do not assume a gap proves theft.
- Keep cancelled and changed guest bills with their reasons. The manager also calls the owner that day to explain.
- For guest payments into a manager's personal GPay account, require the receipt to be uploaded on the payment date and linked to the guest's room and bill. Keep it flagged until the owner confirms that the money reached them. A receipt in the manager's account alone does not prove transfer to the owner.
- For cash, record each payment against the guest's room and bill, and the cash counted at day's end. These figures are reported by the manager; the app cannot independently count physical cash.
- The owner can upload OTA documents received by email and a statement from the hotel's current account. The account statement confirms that an OTA payment arrived; the email supports booking details.
- Show unresolved missing bills, mismatches, payment evidence, and explanations in the daily summary.

## Later work

The owner wants an internal web billing system so staff create and store guest bills digitally instead of relying on paper. That is a later stage.

Natural-language questions over WhatsApp, broad anomaly detection, occupancy analysis, and seasonal predictions appeared in the original vision but have not been confirmed for this first version. Daily WhatsApp summaries are included.

## Manual trial before building

Status: agreed, not yet completed. No real reports or bills have been reviewed in this interview.

Spend 30 minutes checking one completed day's records with the manager:

1. Gather the DSR, paper guest bills, vendor bills, available payment receipts, relevant OTA documents, and the available account statement. Record missing documents.
2. Make one row per room/bill: accommodation charge, food charge, booking source, payment method, amount received, amount owed, and supporting document.
3. Check guest bill numbers, cancellations, corrections, and gaps. Save explanations.
4. Compare guest charges and recorded payments with the DSR. Identify differences without assuming revenue earned equals money collected that day.
5. Match each vendor expense to its bill. List missing bills and differences.
6. Compare reported cash with the cash counted. Check personal-account GPay receipts and whether that money reached the owner. Confirm OTA receipts against the account statement.
7. Write the daily summary by hand: charges, money received, amounts pending, expenses, and unresolved items.
8. Note what was hard to read, missing, slow to find, or impossible to verify. Record whether the manager could realistically repeat this daily.

The riskiest assumption is that managers will consistently provide complete daily records. One manual day tests whether the necessary documents can be gathered; it does not yet prove a lasting daily habit or willingness to pay.

Before building, review the trial's findings. Confirm how guest vouchers attach to room records, whether vendor details exist in the actual DSR, and how room stays spanning several days are represented. Avoid filling these gaps with invented figures.

---

# Original idea — background

THE IDEA
The idea, in one line:
A Digital DSR AI Agent for small hotel owners that works through WhatsApp and helps them track daily revenue, cash, expenses, bills, dues, and money leakage without opening complicated hotel software.

Why me:
I have spent around 5 years inside this workflow as a hotel owner. I know where money gets missed, where staff reporting becomes unclear, and what information an owner actually needs every day.

The problem is not that hotels have no data. The problem is that owners don't check that data consistently because it is spread across PMS software, paper DSRs, bills, WhatsApp messages, and conversations with staff.

I experience this problem myself, and I still don't have the simple solution I want: send the information through WhatsApp and let an AI remember, verify, and track everything for me.





GOAL
The one goal they hire it for:
Help hotel owners catch money leakage and stay in control of their hotel's daily finances without manually checking reports every day.

The AI should:

Track daily revenue.

Track cash, UPI, OTA, advances, dues, and expenses.

Match expenses with bills.

Identify missing or mismatched amounts.

Remember previous days, weeks, and months.

Allow the owner to ask questions in natural language.

Alert the owner when something looks unusual.

Instead of the owner remembering everything, the AI remembers the hotel's financial context for them.





DELTA 4
Today
Staff prepares the DSR.

The DSR may be printed, written manually, or entered into a PMS.

The owner does not check it every day.

A few days or weeks later, the owner wants to understand revenue, cash, expenses, or pending payments.

The owner calls the manager or front office.

Staff searches old reports, WhatsApp messages, bills, or PMS entries.

The owner tries to remember what happened.

Numbers may not match.

The owner starts questioning staff.

It becomes difficult to know whether there was a mistake, forgotten context, or actual money leakage.

With the product
Staff uploads today's DSR and bills.

AI reads the DSR automatically.

AI extracts revenue, cash, UPI, OTA, advances, dues, expenses, occupancy, and other important numbers.

AI compares the numbers and checks whether they add up.

Manager confirms the extracted information.

The report is saved automatically by date.

The owner receives a simple WhatsApp summary.

Any mismatch or unusual transaction is highlighted.

The AI remembers the context permanently.

The owner can later ask:

"How much cash did we collect last week?"
"Why were expenses higher on Saturday?"
"Which payments are still pending?"
"Show me days where cash didn't match the DSR."
"How much revenue came from Booking.com this month?"

The owner doesn't search reports. They ask the AI.





USER
The trigger — when the pain hits
The pain usually appears when the owner has not checked the DSR for several days.

Later they want to understand something from last week or last month and realize they have forgotten the context.

For example:

Cash looks lower than expected.

An expense seems unusually high.

An OTA payment is missing.

A guest payment is still due.

The staff says a payment happened, but the owner doesn't remember it.

Revenue doesn't match what the owner expected.

A bill is missing.

At that point, the owner starts calling staff and questioning what happened.

The real pain is:

"I don't know exactly what happened, and I don't know whether I should trust these numbers."





Today's path
Today the owner normally:

Calls the manager or front office → asks about revenue → asks about cash → asks about expenses → asks about pending payments → checks PMS or spreadsheets → searches WhatsApp → looks for old bills → tries to reconstruct what happened.

Because doing this every day takes attention and effort, most owners don't build the habit.

The problem becomes visible only later.



Who they trust when making this decision
Small hotel owners are likely to trust:

Another hotel owner they respect.

Word of mouth.

Their accountant.

The strongest acquisition channel could be:

One hotel owner telling another owner, "I send my DSR every day and this AI tells me if something doesn't match."





Would they pay?
Yes.

Hotel owners already pay for:

PMS software.

Channel managers.

Accounting software.

Booking engines.

Revenue-management tools.

Accountants.

But many owners still don't check these systems daily.

The opportunity is not necessarily replacing the PMS.

The opportunity is becoming the daily intelligence layer on top of the hotel's existing reports.

A PMS stores information.

This product watches the information for the owner.





PRODUCT
Onboarding
The fastest way for a first-time user to experience value:

Day 1
The owner connects their WhatsApp number and creates their hotel account.

The staff member opens the dashboard and uploads:

Today's DSR photo/PDF.

Expense bills.

Any supporting payment screenshots if required.

The AI reads everything automatically.

Example:

Today's DSR

Room Revenue: ₹24,500
Cash: ₹7,360
UPI: ₹12,074
OTA: ₹5,066
Advance Received: ₹3,000
Expenses: ₹2,400
Pending Guest Payment: ₹1,800

The AI then checks whether the numbers match.

If something is unclear, it asks the manager:

"I found ₹2,400 in expenses but bills uploaded total ₹1,900. ₹500 is missing. Please check."

The manager confirms or corrects it.

Then the owner receives the summary on WhatsApp.

The owner understands the value on the first day.





THE CORE LOOP
1. Upload
At around 13:00 or after closing the previous day's accounts, the manager photographs the DSR and uploads it to the AI dashboard.

Bills and expense receipts are uploaded with it.

2. AI reads
The AI extracts:

Total revenue

Room revenue

Cash

UPI

Card

OTA

Advances

Guest dues

Expenses

Discounts

Refunds

Occupancy

Rooms sold

Complimentary rooms

Bills

3. AI verifies
The system checks:

Does total collection match revenue?

Does cash match expected cash?

Are expenses supported by bills?

Are there missing bills?

Are guest dues increasing?

Are OTA amounts accounted for?

Are advances correctly recorded?

Are there unusual discounts?

Is anything significantly different from normal?

4. Manager confirms
The AI replies:

Cash ₹7,360
UPI ₹12,074
OTA ₹5,066
Expenses ₹2,400
Guest Due ₹1,800

Everything matches except ₹500 of expenses has no uploaded bill.

Correct?

Yes / Edit

The manager taps Yes or corrects the number.

5. Owner gets the WhatsApp summary
The owner receives something like:

Himalaya Mount View Resort — Daily Summary

Revenue: ₹24,500
Cash: ₹7,360
UPI: ₹12,074
OTA: ₹5,066
Expenses: ₹2,400
Pending: ₹1,800

⚠️ Attention: ₹500 expense bill missing.

No dashboard checking is required.

6. AI remembers
Tomorrow's report is added to the history.

Over time, the AI understands:

Normal revenue.

Normal expenses.

Payment patterns.

Staff reporting patterns.

Outstanding dues.

Seasonal patterns.

Common mismatches.

This makes the AI more useful every day.





AI-FIRST PART
AI is not simply an extra feature.

AI performs the work that currently requires the owner's attention.

The user uploads:

DSR + bills + supporting documents

The AI:

Reads → structures → checks → compares → remembers → alerts → answers questions

The owner only needs to look when something deserves attention.

Instead of:

Owner checking every report

The model becomes:

AI checks every report. Owner checks exceptions.

That is the main AI-first experience.





OWNER CHAT EXPERIENCE
The long-term product could become a financial memory for the hotel.

The owner could WhatsApp:

"How was business this week?"

AI:

Revenue this week: ₹1,74,500
Up 12% from last week.

Cash: ₹43,200
UPI: ₹79,400
OTA: ₹51,900

Expenses: ₹31,600

Three things need attention:

₹3,400 guest payment pending for 6 days.

Two expense bills worth ₹1,250 are missing.

Tuesday's cash was ₹2,000 lower than expected.





Owner:

"Why was Tuesday cash short?"

AI:

Tuesday's DSR showed expected cash of ₹9,400 but confirmed cash was ₹7,400.

Manager added a note saying ₹2,000 was used for vegetable purchases.

No bill has been uploaded for that expense.





That is where the product becomes much more valuable than a spreadsheet.

It remembers the story behind the numbers.





MARKET
Tailwinds
Several behavioral trends make the timing interesting:

Low attention:
Small business owners don't want another dashboard they need to remember to open.

WhatsApp-first businesses:
A large amount of communication between owners, managers, staff, suppliers, and customers already happens through WhatsApp.

AI document understanding:
AI can increasingly extract structured information from photos, PDFs, receipts, and handwritten or printed reports.

AI agents:
Software is moving from "show me information" toward "watch this for me and tell me when something needs attention."

Existing software fatigue:
Hotels already use PMS and accounting software. The opportunity may be to work on top of those systems rather than asking owners to replace them.

This product fits that behavior:

Don't give the owner another dashboard. Bring the important information to where they already are — WhatsApp.





COMPETITORS / ALTERNATIVES
The biggest competitor may not initially be another AI startup.

It is:

Paper + PMS + Excel + WhatsApp + memory + phone calls.

Spreadsheet
What I like:

It provides chronological tracking.



"Will you actually send your DSR every day?"

If hotel owners consistently use it daily, that's a strong signal.





THE IDEA
In one line:
AI DSR tool for small hotel owners that works through WhatsApp to track daily revenue, cash, expenses, bills, dues, and money leakage.

Why me:
I have worked inside this hotel workflow for 5 years. I understand where money gets missed, where staff reporting becomes unclear, and what hotel owners actually need to know daily.





GOAL
Main job:
Help hotel owners catch money leakage and stay updated without checking PMS, spreadsheets, or calling staff every day.

What the AI should remember:
Revenue, cash, UPI, OTA, advances, expenses, bills, dues, mismatches, and past explanations.





DELTA 4
Today:
DSR prepared → owner doesn't check daily → later calls manager → searches PMS/WhatsApp/bills → forgets context → doubts numbers/staff.

With product:
Staff uploads DSR + bills → AI reads → checks mismatch → manager confirms → owner gets WhatsApp summary → AI remembers everything.





USER
Trigger:
Owner hasn't checked the DSR for days/weeks and later finds a cash, expense, payment, or revenue mismatch.

Current behavior:
Call manager/front office → ask for numbers → check old reports → search bills/messages → try to understand what happened.

Who they trust:
Other hotel owners, word of mouth, accountants, and trusted managers.

Would they pay?
Yes. They already pay for PMS/accounting software, but many don't check it daily.





PRODUCT
Onboarding:
Staff uploads today's DSR and bills. AI reads the numbers, checks them, and sends the owner the first WhatsApp summary.

Core loop:
DSR uploaded → AI extracts data → checks calculations/bills → manager confirms → owner gets summary + alerts → data saved by date.

Example:
Revenue: ₹24,500
Cash: ₹7,360
UPI: ₹12,074
OTA: ₹5,066
Expenses: ₹2,400

⚠️ ₹500 expense bill missing.





AI-FIRST PART
AI does the repetitive checking.

DSR + Bills → Read → Structure → Compare → Remember → Alert

The owner doesn't check every report.

AI checks every report. Owner checks exceptions.





OWNER EXPERIENCE
Owner can ask on WhatsApp:

How much revenue did we make last week?

Which payments are still pending?

Why were expenses high yesterday?

Which days had cash mismatches?

How much came from OTAs this month?

The AI remembers the context behind the numbers.





MARKET
Tailwinds:
Low owner attention, heavy WhatsApp usage, better AI document reading, and growing AI-agent adoption.

Main alternative today:
Paper + PMS + Excel + WhatsApp + phone calls + memory. My network:
Around 50–60 hotel owners/operators who could fit this use case.  Shaktimaan, this is what I have thought about the user, product and market. Lock it in.