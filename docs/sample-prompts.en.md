# Sample Prompts

With the e-shiwake MCP server connected, you can copy-paste the following prompts to try UI-less bookkeeping through an AI agent.

## Daily Expense Recording

```
I bought a USB cable on Amazon for ¥3,980 today. Paid by credit card.
Please create a journal entry.
```

```
On January 15, I paid ¥1,200 for train fare (JR East) in cash.
Record this journal entry.
```

```
My Sakura Internet server fee of ¥1,320 was debited from my bank account this month.
It's a taxable purchase at 10%.
```

## Business-Personal Split (Compound Entry)

```
Record the NTT Docomo mobile phone bill of ¥10,000 on January 20.
Split 80% business / 20% personal. Debited from bank account.
```

## Revenue Recording

```
Received ¥500,000 from Client A into my bank account on January 31.
This is collection of accounts receivable. Please create the journal entry.
```

```
Record ¥300,000 in accounts receivable for February system development to Client B.
Consumption tax at 10%.
```

## Withholding Tax (Compound Entry)

```
I invoiced Client C for ¥110,000 (tax included) for March consulting.
Withholding tax of ¥10,210 was deducted, and ¥99,790 was deposited into my bank.
Please create the journal entry.
```

## Financial Reports

```
Show me the trial balance for fiscal year 2025. I want to check if debits and credits match.
```

```
Display the profit & loss statement for 2025. How much profit did I make?
```

```
Generate the balance sheet for fiscal year 2025.
```

```
Show the consumption tax summary for 2025. How much tax do I need to pay?
```

## Full Report Overview (Tax Return Preparation)

```
Show all financial reports for 2025 (trial balance, P/L, B/S, tax summary) at once.
I'm preparing for my tax return.
```

## Journal List & Search

```
Show me all journal entries for fiscal year 2025.
```

```
Were there any transactions with Amazon in 2025? Show me the list.
```

## Master Data Management

### Chart of Accounts

```
List the current chart of accounts, expenses only.
```

```
Add a new expense account called "Subscription Fee".
```

### Vendors

```
Show me the vendor list.
```

```
Register a new vendor "Test Corp" with address in Shibuya, Tokyo.
Contact person: Taro Tanaka.
```

## Data Backup

```
Export the 2025 fiscal year data in JSON format.
```

## Advanced: Monthly Routine

You can also combine multiple operations in a single request.

```
I need to record January expenses. Please create journal entries for all of these:

- 1/5  Sakura Internet server fee ¥1,320, bank account
- 1/10 Amazon USB hub ¥2,980, credit card
- 1/15 JR East train fare ¥1,200, cash
- 1/20 NTT Docomo phone ¥10,000, bank account (80% business split)
- 1/25 Starbucks meeting ¥1,500, cash
- 1/31 Client A system development ¥500,000, accounts receivable

When done, show me the January trial balance.
```
