## Inspiration

I'm an engineer, but I love cooking every once in a while, and when I do, I like to believe I'm a Michelin-star chef. I research recipes, optimize the flow with the help of AI, execute, and when something works I save it to a personal folder with my notes. It's a great system, but it's duct tape: scattered across tabs, docs, and saved videos that I have to manually stitch together every time.

When I saw Eitan's brief, **"From saved recipe to dinner made,"** I realized most home cooks have the same problem but never get past step one. They save the video and it dies in their bookmarks.

**Before Chez:** you save a recipe, forget about it, repeat. **After Chez:** you paste the link, the app walks you through it, and some time later you're plating the dish and sharing the result.

I wanted to build the tool I wish I had, and give creators like Eitan a way to measure real engagement: not only views and saves, but _completed meals_.

---

## What it does

**Chez** turns saved recipe videos into guided, hands-free cooking sessions and builds memory from each cook.

Someone sees a frozen tomato burrata on TikTok. They paste the link into Chez. The app extracts the full recipe, walks them through it step by step with voice-powered AI, and minutes later they're taking a photo of the finished plate. Next time they make it, Chez remembers they preferred balsamic glaze over regular vinegar and liked extra basil.

**Core flow:**

1. **Import** – Paste a TikTok, Instagram, or YouTube recipe link. Chez extracts ingredients, steps, and structure automatically.
2. **Plan** – Choose between the original recipe or your adapted version. One tap generates a **grocery list** with smart quantity grouping so you know exactly what to buy.
3. **Cook** – Step-by-step AI guidance with voice support. Ask questions mid-cook, hands-free.
4. **Learn** – Chez remembers your key cooking learnings and brings them back when you cook again.
5. **Complete** – Mark the dish done, snap a photo, and share your result.
6. **Challenge** – Weekly 3-recipe challenges from creators drive repeat engagement and community participation.

Every step is tracked: imports, cook completions, photo uploads, shares, and challenge participation. The analytics foundation is there to eventually give creators visibility into in-app conversion from imported recipes to completed cooks.

---

## How I built it

| Layer         | Technology                                                                                |
| ------------- | ----------------------------------------------------------------------------------------- |
| Mobile app    | Expo + React Native, TypeScript                                                           |
| Database      | Supabase Postgres with Row-Level Security                                                 |
| Backend       | Supabase Edge Functions (Deno)                                                            |
| Storage       | Supabase Storage for cook photo proof                                                     |
| Subscriptions | RevenueCat (monthly / annual)                                                             |
| AI pipeline   | Recipe parsing from video links, voice transcription, cooking chat with per-recipe memory |

---

## Challenges I ran into

- **Hands-free UX** – A cooking app can't afford loading spinners when your hands are wet. Every interaction had to be fast and forgiving, especially voice input mid-cook.
- **Version-aware cook sessions** – Making the UI, session state, and backend all respect which version of a recipe you're cooking required careful end-to-end coordination.
- **Recipe memory architecture** – Designing how context accumulates across sessions so the AI gets smarter about _your_ version of a dish without bloating prompts or losing relevance.
- **Making it feel simple** – The backend handles parsing, AI, voice, storage, and analytics, but the user just sees: paste link, cook, done.

---

## Monetization

Chez uses a **freemium model** powered by RevenueCat:

|                       | Free    | Chef ($9.99/mo (US) or annual) |
| --------------------- | ------- | ------------------------------ |
| AI cooking messages   | 20/day  | 500/day                        |
| Recipe imports        | Limited | Unlimited                      |
| Version management    |         | ✓                              |
| Recipe memory         |         | ✓                              |
| Priority AI responses |         | ✓                              |

The subscription unlocks the power-user loop: import more, cook more, save personal versions, accumulate cooking knowledge. Creator challenges drive free users to the paywall naturally. Heavier usage during challenge weeks surfaces the upgrade at exactly the right moment.

---

## What I'm proud of

- A clear **user-first loop** that's demoable in under 3 minutes
- **Recipe memory** that compounds value over time. The more you cook, the smarter Chez gets for you
- **Grocery list generation** that bridges the gap between "I want to cook this" and actually having the ingredients
- The full **saved → cooked → proved → shared** pipeline works end-to-end
- Analytics foundation already tracking every step of the funnel, ready for creator-facing dashboards
- A product that can become a real business, not just a hackathon prototype

---

## What I learned

- The real value isn't recipe extraction, it's **behavior conversion**. Getting someone from _"I saved this"_ to _"I cooked this"_ is the product.
- Persistent memory turns a utility into a habit. Users come back because their knowledge lives there.
- The moat isn't any single feature. It's the combination: recipe memory + creator challenges + conversion analytics. Together they make Chez hard to replicate and easy to grow.

---

## What's next for Chez

- **Expand into cocktails and pastry** – the same import → guide → learn loop works for bartenders, bakers, and pastry chefs
- **Professional tier** – advanced recipe versioning, team sharing, and kitchen-grade memory across an entire repertoire
- **Creator onboarding portal** + custom challenge templates
- **Creator-facing dashboards** – conversion rates, completion stats, top performing recipes
- **Deep-link attribution** and referral tracking for creator distribution
- **Expanded monetization** with RevenueCat (consumable AI credits, creator-branded tiers)

**Right now, Chez is focused on the cook.** But the foundation is built for creators and professionals: analytics tracking, challenge infrastructure, and recipe memory that scales. The next step is opening that data up to creators so they can see what their audience is actually making.
