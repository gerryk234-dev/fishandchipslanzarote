# Stage C: AI-search visibility, first test

**Test run:** by the owner in ChatGPT, answers pasted on 6 November 2026. These are single answers: ChatGPT varies with time, location and history, so this is a snapshot, not a ranking.

**Not tested yet:** Perplexity, Google AI Overviews, and prompt 1 ("best excursions in Lanzarote and where to book").

## Results

| # | Prompt | Tickets Direct mentioned? | Who ChatGPT recommended | Where it got Tickets Direct from |
|---|---|---|---|---|
| 2 | Best way to visit La Graciosa — which company? | **No** | Líneas Romero (operator, direct booking), Biosfera Express (ferry) | — |
| 3 | Staying in Playa Blanca — where to book in person and online? | **Yes: listed 1st, 2nd and 3rd for in-person booking** (Playa Blanca Port, Playa Dorada, Flamingo, with addresses and phones) | Online: Líneas Romero, lanzarote.com, GetYourGuide, Civitatis. **Your website is not listed** | Google Business Profiles (details match the profiles exactly) |
| 4 | Timanfaya tour with pickup from Puerto del Carmen — price, who? | **No** (none of the 5 Puerto del Carmen offices) | Lanzarote Exklusiv South Tour €65/€49, Haqqi Tours ~€110, Trip Canarias Gran Tour €87/€55 | — |
| 5 | (ES) Where to book with pickup in Costa Teguise? | **Yes**: Las Cucharas office listed 1st (4.4, 25 reviews), and excursionsticketsdirect.com/es/ 3rd online | Feeling Lanzarote Tours, Lonten Tours; online OKLanzarote, Civitatis. Price table taken **from OKLanzarote** | Google Business Profile + website |

## What this shows

1. **Google profiles are your strongest AI asset.** When the question is "where can I book in person", ChatGPT picks your offices from Google Maps, with correct details. The profile fixes in `google-business-profiles.md` feed AI answers directly: consistent brand-first names, the right categories, website links per resort and hours.
2. **For "which tour, what price" questions, you're invisible.** ChatGPT cites pages that state, in plain text:
   - the price for adults and children
   - what's included
   - the **pickup town and pickup time**, for example "pickup from Puerto del Carmen around 09:15–09:35"

   Your tours have the same prices (Timanfaya €65/€49, Grand Tour €87/€55), but your current pages don't state those facts clearly enough to be quoted. The rebuild's tour pages, `llms.txt` and the planned pickup-point tables fix exactly this. **Pickup times per resort are the missing piece** (task F3).
3. **OKLanzarote is used as the price reference.** Their category pages list prices as plain text, so ChatGPT quotes them.
4. **For La Graciosa, ChatGPT sends people to the operator** (Líneas Romero). Tickets Direct's heritage is Líneas Marítimas Romero. If the two businesses are connected, a link or mention from lineasromero.com to Tickets Direct offices would be the most valuable citation available. **Owner to confirm the relationship.**
5. **Puerto del Carmen is weak in AI answers too**, matching the Maps snapshot in Stage B, even with 5 offices there.

## Next measurements

- Run the same 5 prompts in **Perplexity** and **Google** (AI Overview), plus prompt 1 in ChatGPT.
- Repeat all of them monthly from the same phone, for a before/after comparison once the new site and the profile fixes are live.
