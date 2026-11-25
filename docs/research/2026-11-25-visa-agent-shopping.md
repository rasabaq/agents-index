# Visa's AI shopping benchmark, the trust survey, and who pays when an agent buys wrong

Research note, 2026-11-25. Every number below was checked against Visa's own pages, Visa's published results file, or a regulator's text.

## 1. The short answer

- All four numbers hold: 22 models, 42.8% of runs failed, 54% of failed runs still ended in a purchase ("about 1-in-2" in Visa's words), and 23% of US consumers trust AI to pay for them.
- Two limits matter. The "purchases" happened in a simulated shop with a simulated customer, and the test stops before checkout, so no money moved. The 23% comes from a separate Visa survey of US adults (Harris Poll, May 2026).
- Safe sentence: "Visa tested 22 AI models as shopping assistants in a simulated store. They failed 42.8% of runs, and 54% of the failed runs still ended in a purchase." Source: [Visa, 5 November 2026](https://investor.visa.com/news/news-details/2026/Visa-Releases-First-of-Its-Kind-Industry-Benchmark-for-AI-Shopping-Almost-Half-of-Test-Runs-Fail/default.aspx).
- New for the index: Visa's own card rules now name agent purchases in every country. They say you are responsible for what your agent does "as if the Cardholder initiated the Transaction". That is a rule about agents, but it does not protect you, so 0 of 24 still holds.

## 2. The numbers, checked

The investor release blocks direct downloads (HTTP 403). The quotes below come from a page reader that showed the text, and each one was asked for word for word. The results file and the whitepaper were downloaded directly.

| Claim | Exact quote | Source | Verdict |
| --- | --- | --- | --- |
| 22 models | "The first round of tests involved 22 different AI models from 12 labs" | Visa investor release, 2026-11-05 | Holds. The results file says `"modelCount":22`, 12 labs, 15 episodes, 3 runs each, 990 runs. |
| 42.8% failed | Subhead: "models failed 42.8% of test runs". Body: "an overall benchmark pass rate of about half (57.2%)." | Visa investor release, 2026-11-05 | Holds. The results file has 566 passes out of 990 runs (57.2%), so 424 runs (42.8%) did not pass. |
| About half of failed runs still bought | "About 1-in-2 (54%) of failed runs still ended in the AI making a purchase." | Visa investor release, 2026-11-05 | Holds, but say 54%, not "about half". The results file has 229 "Purchase missed a requirement" runs out of 424 failed runs (54.0%). Those 229 runs are 23.1% of all runs. The benchmark site says the same: "Of the runs that didn't pass, 54.0% ended with the customer buying an offer that missed a requirement, or one chosen before a requirement came out." |
| 23% trust | Trust Index: "only 23% of U.S. consumers trust GenAI to handle payment transactions on their behalf." Benchmark release: "Visa's Trust Index, released in September 2026, found that while 72% of U.S. consumers had used an AI assistant, only 23% trusted AI to handle payment transactions on their behalf." | Visa Trust Index release, 2026-09-09; Visa investor release, 2026-11-05 | Holds. The survey asked about "GenAI", in the US only. |
| Best and worst models | "The best performing models passed 82.2% of attempts, the worst 28.9%." | Visa investor release, 2026-11-05 | Holds. The release names no model. The benchmark site does (see section 3). |
| Runs that pass every time | "Across all models and scenarios, all three attempts passed just 34.2% of the time." | Visa investor release, 2026-11-05 | Holds. The site rounds it to 34%. |

The Visa Agentic Ready release (dated 11/18/2026 on the page, dateline 17 November 2026) has none of these numbers. It is about merchants and payment firms testing agent payments. Its only mention of disputes is one partner's "dispute management" tools.

## 3. How Visa ran the test

Sources: the benchmark page, its results file `api/results.json` (snapshot `results-2026-11-03`, "October 2026 results snapshot"), and the Visa Research whitepaper (PDF, October 2026, 17 pages).

- **What is tested.** Each "episode" is a chat between two AI models. The model under test is the shopping assistant. A second model plays the customer. The customer starts with a few facts and holds the rest back. A separate "release matcher" model gives the customer a hidden fact only when the assistant asks the right question or asks for the right action, such as "check with your spouse".
- **What is not tested.** The whitepaper says: "The benchmark stops at that point, before checkout. Payment, order placement, and fulfillment are outside the current scope." A "purchase" is the simulated customer picking an offer.
- **The shop.** A fixed, simulated market, the same for every model and cut off from the live web. Listings copy real products and real seller policies, and some reviews come from the Amazon Reviews 2023 dataset. The whitepaper says brands and retailers are named so listings look real, and "the benchmark is not affiliated with or endorsed by any of them." The public TV episode has 265 TVs.
- **Tasks.** 15 episodes: 3 hair-care, 2 laptop and 10 TV episodes (episode IDs in the results file: `hair-101` to `hair-103`, `lap-111`, `lap-112`, and ten `tv-` episodes). The press release calls them challenges "such as buying a TV, laptop, or personal care appliance". The whitepaper says the market covers "consumer electronics, personal-care appliances, and home appliances". Only one episode is public ("Sam's TV"). The other 14 are private on purpose.
- **Runs.** 22 models × 15 episodes × 3 runs = 990 runs.
- **What counts as a pass.** The results file says: "A purchase passes when the product meets every requirement in the answer key and each requirement was established during the session. Ending without a purchase passes only when nothing on the market fits. Runs without a valid final decision do not pass." A lucky fit fails. A run also fails if the assistant misinforms the customer, which a judge model checks twice, with a person reviewing when the two answers disagree.
- **How runs end** (all 990, from the results file):

| Outcome | Runs | Share |
| --- | --- | --- |
| Passed | 566 | 57.2% |
| Purchase missed a requirement | 229 | 23.1% |
| No purchase, though a fit was available | 114 | 11.5% |
| Hit the tool-call limit | 51 | 5.2% |
| Reply format not accepted | 26 | 2.6% |
| No final decision | 4 | 0.4% |

So the 42.8% "failed" is not all wrong purchases. It also covers the assistant wrongly saying nothing fits (11.5%) and runs that broke down (8.2%).

- **Models.** The release names none. The benchmark site and results file name all 22. Best: Gemini 4 Argon (Google) and Muse Wonder (Meta), 37 of 45 runs (82.2%). Then Claude Fable 5.1 (Anthropic) at 75.6%. Worst: Inkling (Thinking Machines), 13 of 45 (28.9%), with MiniMax M3.1 Flash at 33.3% and Gemini 3.1 Pro at 35.6%. Visa warns: "No model clearly leads." It also says: "Each rate has a wide 95% confidence interval, and those of the next eleven models overlap theirs." With only 45 runs per model, do not rank models from this.
- **Other figures, rechecked from the file.** The five models that drew out the most hidden facts passed 70.2% of runs and the bottom five 44.4%. The five most expensive models passed 67.1% and the five cheapest 50.2%. Both match the release.
- **Who made it.** Visa Research. The page footer says the figures are "provided 'AS IS' for informational purposes only, without warranty as to completeness or accuracy". Visa also runs card networks for agent payments, so it has a stake in the result.
- **Code or dataset.** No GitHub repo or episode dataset was found. The per-model results are public as the JSON file. The whitepaper says the benchmark "is designed to be a private benchmark".

## 4. What "failed but still bought" means

Visa's own label is "Purchase did not pass". In the whitepaper's terms it is a "wrong selection": "The customer selected an offer outside S, or an offer in S, without every fact in E having been released." In plain words, there are two kinds:

1. **The product was wrong.** It missed at least one need, such as a picture format the family needs, the budget, or the return window.
2. **The product was right by luck.** It fits, but the assistant never found out one of the needs, so Visa scores it as a failure.

The public numbers do not split these two apart. What we can say:

- **Bought before confirming a need.** 190 of 990 runs (19.2%) ended in "a purchase made before a requirement was confirmed, by asking or by reasoning from the conversation" (field `unest` in the results file). Under Visa's pass rule all of these fail, so they make up about 190 of the 229 failed purchases (83%). That share is our own calculation.
- **Bought when nothing fit.** Two episodes have no correct product. In 46 of those 132 runs (34.8%) the customer bought something anyway (fields `empty_n` and `empty_buy`).
- **The typical miss,** from the public TV episode in the whitepaper: "An assistant that never asked the kid about the washed-out videos had no reason to require HDR10+, and it often selected a premium set that lacks it."
- **By model.** Gemini 3.1 Pro bought a failing product in 23 of 45 runs (51%). The OpenAI models fail the other way: GPT-6.1 Terra ended with no purchase, though a fit existed, in 17 of 45 runs (38%).
- **Not found:** a split by type of error. The whitepaper says each wrong selection is labelled with "the budget, a hard requirement, compatibility with a product the customer owns, a safety requirement, or a requirement that was never established", but those counts are not published. Wrong size, wrong price and over-budget counts are not public either.

## 5. The trust survey

From the [Visa Trust Index release](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22736.html) (9 September 2026) and Visa's methodology note:

- **Who ran it:** "This survey was conducted on behalf of Visa by the Harris Poll using its Omnibus survey platform".
- **When:** "The survey was fielded May 26 - 28, 2026".
- **Where:** the United States. "Respondents are matched to the US General Adult population based on the US Census."
- **Sample:** "The total sample size was 2,065 US consumers. The payment transaction question sample was 1,028 – 1,034 per brand tested."
- **The finding:** "only 23% of U.S. consumers trust GenAI to handle payment transactions on their behalf." In the same question, 61% said "they would trust Visa to handle agentic transactions."
- **The exact question:** not published. The per-brand sample suggests a split sample: each person was asked about some brands, with "GenAI" as one of them, so the 23% likely rests on about 1,030 people. That is our reading. Visa does not say it.
- No margin of error is given.

The 5 November release turns "GenAI" into "AI". To stay exact, say "23% of US adults said they trust generative AI to handle payments for them (Visa Trust Index, Harris Poll, May 2026)."

## 6. Who pays when an agent buys wrong

### Card networks

- **Visa's rules now cover agent purchases, and they put the purchase on you.** The [Visa Core Rules](https://usa.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf) (edition of 24 October 2026, agent sections added in April 2026) define an "Agentic Transaction" and an "Agentic Payment Provider". Section 4.1.23.10 (page 268) says: "A Cardholder is responsible for any actions taken by an Agentic Payment Provider as part of an Agentic Transaction as if the Cardholder initiated the Transaction." Section 4.1.23.3 makes the agent get "Cardholder acknowledgement that they are responsible for actions taken by the Agentic Payment Provider". The glossary adds: "For the purpose of the Visa Rules, an Agentic Payment Provider is considered to be the Cardholder for an Agentic Transaction." Section 1.7.6.1 says the issuer must pay the merchant's bank for "An Agentic Transaction processed in accordance with a Cardholder's payment instructions".
- **What still protects you under Visa's rules.** The agent must "Use only the Cardholder-defined criteria for purchasing the goods or services" (4.1.23.4). It must keep an order confirmation for you for at least 120 days (4.1.23.8). A merchant "must not require a Cardholder to waive the right to dispute a Transaction, including an Agentic Transaction, with the Issuer" (page 392). We found no dispute reason written for agents. The only agent wording in the dispute rules lets merchants use "login IDs for an Agentic Payment Provider" as evidence against a fraud dispute (condition 10.4, page 710). So an agent's mistake inside your instructions looks like your own purchase, not fraud. Your usual "not as described" or "not received" disputes still apply.
- **Visa itself says the gap is open.** Visa's [Agentic Payments from the Ground Up](https://www.visa.com/vcom-assets/content/dam/visa/reimagine-visa/thought-leadership/documents/agentic-payments-report.pdf) report (July 2026) says: "Disputes lack established resolution mechanisms." It also says: "When an agent makes an unauthorized purchase, the responsible party may initially be unclear."
- **Mastercard.** We could not open Mastercard's rulebook (HTTP 403). Mastercard's developer guide for merchants, [Level 2 Agentic Commerce](https://developer.mastercard.com/merchant-cloud/documentation/tutorials-and-guides/agentic-commerce-guide/22/) (no date, latest date in the text 10 April 2026), says "Standard chargeback rights and dispute resolution processes apply today". It also says current frameworks "are not fully adequate for agent-mediated transactions" and "Payment networks are actively developing agentic-specific dispute protocols." It lists "That's not what I meant" ("Agent misinterpreted the consumer's instructions and purchased the wrong item") and agent error ("wrong quantity, wrong variant") as dispute types. Mastercard's Verifiable Intent is a signed record of what you allowed an agent to do, meant as evidence in disputes. Its open spec is still a "Draft (v0.1)" (seen in a search result for the [GitHub repo](https://github.com/agent-intent/verifiable-intent/); we did not open it). Mastercard's [30 September 2026 Agent Pay release](https://investor.mastercard.com/investor-news/investor-news-details/2026/Mastercard-Advances-Agentic-Commerce-With-New-Trust-and-Intelligence-Services/default.aspx) says nothing about disputes or liability.
- **American Express** sells "Agent Purchase Protection" for registered agents (April 2026, already in the index). It is a company product, not a rule. We did not check it again.

### United States

These rules were written for human buyers. None mentions AI agents.

- **Debit and bank accounts, Regulation E.** [12 CFR 1005.2(m)](https://www.ecfr.gov/current/title-12/chapter-X/part-1005/section-1005.2) defines an unauthorized transfer. It says the term does not include a transfer "By a person who was furnished the access device to the consumer's account by the consumer, unless the consumer has notified the financial institution that transfers by that person are no longer authorized". If you give an agent your card details, its purchases are likely not "unauthorized", so the $50 and $500 limits in section 1005.6 would not help.
- **Credit cards, Regulation Z.** [12 CFR 1026.12(b)](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/section-1026.12) limits you to $50 for "unauthorized use", which means use "by a person, other than the cardholder, who does not have actual, implied, or apparent authority for such use". An agent you set up likely has authority. The closest help is the billing error rule in [12 CFR 1026.13(a)(3)](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/section-1026.13): a charge "for property or services not accepted by the consumer or the consumer's designee, or not delivered to the consumer or the consumer's designee as agreed". Whether "the wrong thing, ordered by my agent" counts is untested.
- **CFPB on agents.** No rule or guidance. The CFPB's [Consumer Credit Card Market Report](https://files.consumerfinance.gov/f/documents/cfpb_consumer-credit-card-market-report_2025.pdf) (December 2025, section 8.1.4, pages 183 to 184) says: "AI agents developed specifically for shopping, payments, and commerce are in the initial stages of development and deployment." It adds that they could bring new challenges, including making sure "that users can resolve disputes." That is an observation, not a rule.

### United Kingdom

- **The rules.** The Payment Services Regulations 2017 and section 75 of the Consumer Credit Act 1974 (already in the index) were written for human payers and do not mention agents.
- **HM Treasury.** The [Modernising Payment Services Regulation consultation](https://www.gov.uk/government/consultations/modernising-payment-services-regulation) (14 July to 6 October 2026) says: "the PSRs were designed before the development of AI and may not fully facilitate the use of agentic AI." Question 15 asks: "How does existing payment services regulation need to adapt to support agentic payments? For example, do provisions relating to authentication and consent of payments transactions, and liability for unauthorised payment transactions, need updating?" On 25 November 2026 the page says "We are analysing your feedback". No answer yet.
- **FCA.** In a [speech on 19 October 2026](https://www.fca.org.uk/news/speeches/building-future-finance-age-ai), Jessica Rusu (FCA chief data, information and intelligence officer) said: "The FCA will work with industry, fellow regulators and frontier labs to develop a trusted framework for agentic finance, including clear approaches to agent identity, delegated authority, accountability and execution." That is a plan, not a rule.

### European Union

- **Current law.** PSD2 refunds unauthorised payments (already in the index). It does not mention agents.
- **The new Payment Services Regulation.** The Council [adopted its first-reading position on 29 October 2026](https://data.consilium.europa.eu/doc/document/ST-15154-2026-INIT/en/pdf). The [adopted text](https://data.consilium.europa.eu/doc/document/ST-8543-2026-REV-1/en/pdf) (Council document 8543/1/26 REV 1, 4 November 2026) still reads "Regulation (EU) 2026/…", so it is not yet in the Official Journal. Article 50 says: "A payment transaction or a series of payment transactions shall be authorised only if the payer has given its consent for the execution of the payment transaction." A transaction is "deemed to be unauthorised where the transaction was initiated or modified by a third party who is acting without the consent of the payer". The text has no words for AI agents. Every "agent" in it means a payment institution's agent or a commercial agent. We searched both the PSR text and the PSD3 text ([8535/1/26 REV 1](https://data.consilium.europa.eu/doc/document/ST-8535-2026-REV-1/en/pdf)) for "artificial intelligence", "AI agent" and "agentic" and found nothing.
- **EBA.** The [EBA Work Programme 2027](https://www.eba.europa.eu/sites/default/files/2026-09/f6561915-4192-4d73-88ac-10f8bc09abca/EBA%20Work%20programme%202027.pdf) (September 2026) says: "in 2027 the EBA will commence new targeted analysis of the use of Agentic AI in payments, in particular to inform PSD3/R implementation activities (e.g. on SCA)". It also promises "a particular focus on the opportunities and risks for consumers." That is planned work, not a rule.
- **European Commission:** no text on agent payments found.

## 7. What this means for the index

**`rules.agent-purchase-protection`** (21 Limited, 3 Not yet, 0 Live). The findings support 0 Live. No consumer or payment law in the US, UK or EU names AI agents. The one rule that does, Visa's, makes you responsible for what your agent buys. It is a private network rule, not a protection, so it should not move any cell to Live.

Proposed edits (statuses stay the same):

1. **US, note.** Replace "Authorization is defined as the consumer's permission, so an agent's mistake is a gray area." with: "Regulation E does not treat transfers by someone you gave your card or account details to as unauthorized, and Regulation Z's $50 limit does not cover use by someone with your authority, so an agent you set up likely falls outside both. The billing error rule for goods 'not accepted by the consumer or the consumer's designee' is the closest fit, but it is untested for agents. Since April 2026 Visa's card rules say the cardholder is responsible for an agent's purchases 'as if the Cardholder initiated the Transaction'. The CFPB has only noted that users of agents must be able to 'resolve disputes'." Add evidence: eCFR 12 CFR 1005.2, eCFR 12 CFR 1026.12, eCFR 12 CFR 1026.13, Visa Core Rules (2026-10-24), CFPB Consumer Credit Card Market Report (2025-12).
2. **GB, note.** Change "its answer is still open" to "the consultation closed on 6 October 2026 and on 25 November HM Treasury was still analysing responses. In October 2026 the FCA said it will build a framework for agentic finance that covers delegated authority and accountability." Add evidence: FCA speech "Building the future of finance in the age of AI" (2026-10-19).
3. **DE, ES, FR, IT, NL, notes.** Replace "agreed in November 2025 and not yet applying" with "adopted by the Council on 29 October 2026 and not yet in the Official Journal; its consent rule (Article 50) does not mention agents." Replace the 2025-11-27 Council press release with Council document 8543/1/26 REV 1 (2026-11-04). Add the EBA Work Programme 2027 (2026-09), which plans a study of agentic AI in payments for 2027.
4. **All 24 countries (optional).** Visa's rules apply wherever Visa cards are used, so the Visa Core Rules could be added as evidence in every cell with one shared sentence: "Visa's card rules make you responsible for an agent's purchases as if you made them yourself." This adds context and changes no status, including the three Not yet cells (ID, SA, KE).

**`payments.card-agent-token`** (Live only in the US). Nothing here changes a status. Visa's rules require agents to "Enroll in and comply with the Visa Intelligent Commerce program and register with Visa" and to use Visa tokens. That confirms the program is a formal network service, not a demo. Optional edit: add the Visa Core Rules (2026-10-24, section 4.1.23) as evidence for US. The 17 November Agentic Ready release says 175+ issuers in 45 markets are taking part, but it describes testing, so no country moves to Live. The benchmark does not test payment, so it is not evidence for this cell.

**For the headline.** Pairing the two facts works, if worded with care:

- "In Visa's own test, AI shopping assistants failed 42.8% of runs, and 54% of those failed runs still ended in a purchase. In 0 of 24 countries do consumer or payment rules clearly say you get your money back when an agent buys the wrong thing."
- Do not write that agents "spent money" or "bought the wrong thing for real". The test was simulated and stopped before payment.
- A sharper, true line: "Visa's card rules say you are responsible for your agent's purchases as if you made them yourself."

## 8. Sources

| Source | Publisher | Date |
| --- | --- | --- |
| [Visa Releases First-of-Its-Kind Industry Benchmark for AI Shopping; Almost Half of Test Runs Fail](https://investor.visa.com/news/news-details/2026/Visa-Releases-First-of-Its-Kind-Industry-Benchmark-for-AI-Shopping-Almost-Half-of-Test-Runs-Fail/default.aspx) | Visa (investor relations) | 2026-11-05 |
| [Visa Agentic Commerce Benchmark page](https://www.visapaymentsfrontier.io/articles/agentic-commerce-benchmark/agentic-commerce-benchmark.html) | Visa Payments Frontier | October 2026 snapshot, read 2026-11-25 |
| [Benchmark results file](https://www.visapaymentsfrontier.io/articles/agentic-commerce-benchmark/api/results.json) | Visa Payments Frontier | snapshot captured 2026-11-03 |
| [Visa Commerce Benchmark whitepaper: Can an AI agent shop with you?](https://www.visapaymentsfrontier.io/articles/agentic-commerce-benchmark/assets/visa-agentic-commerce-benchmark-whitepaper.pdf) | Visa Research | October 2026 |
| [Visa Expands Agentic Ready to Help Scale Trusted AI Commerce Globally](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22986.html) | Visa | 2026-11-17 (page shows 11/18/2026) |
| [New Visa Research Finds Consumer Trust is Accelerating the Path to Agentic Commerce](https://usa.visa.com/about-visa/newsroom/press-releases.releaseId.22736.html) | Visa | 2026-09-09 |
| [Your AI just bought you a couch. Are you okay with that?](https://corporate.visa.com/en/sites/visa-perspectives/innovation/visa-trust-index-trust-powers-agentic-commerce.html) (Trust Index method note) | Visa, Jack Forestell | 2026-09-09 |
| [Visa Core Rules and Visa Product and Service Rules](https://usa.visa.com/content/dam/VCOM/download/about-visa/visa-rules-public.pdf) | Visa | 2026-10-24 edition |
| [Agentic Payments from the Ground Up](https://www.visa.com/vcom-assets/content/dam/visa/reimagine-visa/thought-leadership/documents/agentic-payments-report.pdf) | Visa | July 2026 |
| [Visa unveils new services to modernize dispute resolution process](https://corporate.visa.com/en/sites/visa-perspectives/newsroom/dispute-resolution-services.html) (no agent rules) | Visa | 2026-04-01 |
| [Level 2 Agentic Commerce: Optimization and Best Practices](https://developer.mastercard.com/merchant-cloud/documentation/tutorials-and-guides/agentic-commerce-guide/22/) | Mastercard Developers | undated, latest date in text 2026-04-10 |
| [Mastercard Advances Agentic Commerce With New Trust and Intelligence Services](https://investor.mastercard.com/investor-news/investor-news-details/2026/Mastercard-Advances-Agentic-Commerce-With-New-Trust-and-Intelligence-Services/default.aspx) | Mastercard | 2026-09-30 |
| [verifiable-intent (GitHub)](https://github.com/agent-intent/verifiable-intent/) (seen in search results only) | Mastercard (maintainer) | Draft v0.1 |
| [12 CFR 1005.2, Regulation E definitions](https://www.ecfr.gov/current/title-12/chapter-X/part-1005/section-1005.2) | eCFR (CFPB rule) | current as of 2026-11-23 |
| [12 CFR 1026.12, Regulation Z, special credit card rules](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/section-1026.12) | eCFR (CFPB rule) | current as of 2026-11-23 |
| [12 CFR 1026.13, Regulation Z, billing error resolution](https://www.ecfr.gov/current/title-12/chapter-X/part-1026/section-1026.13) | eCFR (CFPB rule) | current as of 2026-11-23 |
| [The Consumer Credit Card Market Report to Congress](https://files.consumerfinance.gov/f/documents/cfpb_consumer-credit-card-market-report_2025.pdf) | CFPB | December 2025 |
| [Modernising Payment Services Regulation (consultation)](https://www.gov.uk/government/consultations/modernising-payment-services-regulation) and [PDF](https://assets.publishing.service.gov.uk/media/6a54b3302467584757371dc4/Modernising_payment_services_consultation.pdf) | HM Treasury | 2026-07-14 |
| [Building the future of finance in the age of AI](https://www.fca.org.uk/news/speeches/building-future-finance-age-ai) | FCA, Jessica Rusu | 2026-10-19 |
| [PSR, final compromise text (8221/26)](https://data.consilium.europa.eu/doc/document/ST-8221-2026-INIT/en/pdf) | Council of the EU | 2026-04-17 |
| [PSR, Council position at first reading (8543/1/26 REV 1)](https://data.consilium.europa.eu/doc/document/ST-8543-2026-REV-1/en/pdf) | Council of the EU | 2026-11-04 |
| [PSD3, Council position at first reading (8535/1/26 REV 1)](https://data.consilium.europa.eu/doc/document/ST-8535-2026-REV-1/en/pdf) | Council of the EU | 2026-11-04 |
| [PSR voting result (15154/26)](https://data.consilium.europa.eu/doc/document/ST-15154-2026-INIT/en/pdf) | Council of the EU | 2026-10-30 |
| [EBA Work Programme 2027](https://www.eba.europa.eu/sites/default/files/2026-09/f6561915-4192-4d73-88ac-10f8bc09abca/EBA%20Work%20programme%202027.pdf) | European Banking Authority | September 2026 |

News used only to find primary sources: [The Next Web](https://thenextweb.com/news/visa-ai-shopping-benchmark-agentic-commerce-ai-models-fail) and [Matheson](https://www.matheson.com/insights/psd3-and-psr-published-whats-changing-for-eu-payment-services/) (2026-04-29, which pointed to the Council documents).

## 9. Not found

- **The exact Trust Index question.** Not on Visa's release or method note. Searched: "Visa Trust Index September 2026 consumers AI payments 23% trust survey methodology".
- **A split of failed purchases by error type** (budget, wrong spec, compatibility, safety). The whitepaper says the labels exist but does not publish counts. Checked the page, the results file and the page scripts.
- **A GitHub repo or episode dataset.** Not found. The whitepaper says the benchmark is private. Only the results file and one public episode are online.
- **A working link to the Trust Index from the release.** The link in the benchmark release goes to a corporate.visa.com page that returned 404. We used the usa.visa.com copy instead.
- **Mastercard's rulebook text on agents.** mastercard.us and mastercard.com returned HTTP 403 to our downloads, and the Verifiable Intent story page returned 403 too. Searched: "Mastercard Agent Pay disputes chargeback rules agentic transactions consumer protection liability" and two searches on "Verifiable Intent" and disputes.
- **A Visa or Mastercard dispute reason written for agent mistakes.** Not in the Visa Core Rules (October 2026). Searched: "Visa agentic commerce dispute rules agent chargeback reason code Visa Core Rules agentic transactions".
- **Any CFPB rule, guidance or statement aimed at AI agent payments.** Searched consumerfinance.gov, federalregister.gov and regulations.gov: "CFPB AI agents payments consumer statement 2026 agentic Regulation E". Only the December 2025 market report passage came up.
- **A European Commission text on agent payments.** Searched: "EBA OR European Commission AI agents agentic payments statement 2026 consent liability payment services".
- **PSR or PSD3 in the Official Journal.** Not published as of the 4 November 2026 Council text. Searched: "payment services in the internal market Regulation (EU) 2026 Official Journal published PSR signed".
- **The investor release as a direct download.** investor.visa.com returned HTTP 403. The text was read with a page reader instead.

Searches used: 11.
