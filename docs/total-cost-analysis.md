# Total Cost Analysis: AI + Supabase

_Complete infrastructure cost breakdown for profitability modeling_

---

## Executive Summary

**Current costs per 1,000 active users**:

- AI costs: $900/mo (unoptimized)
- Supabase: $25-$100/mo
- **Total: ~$1,000/mo**

**Optimized costs per 1,000 active users**:

- AI costs: $190/mo (smart routing + caching)
- Supabase: $25/mo (optimized)
- **Total: ~$215/mo** (78% reduction!)

---

## Supabase Cost Breakdown

### Pricing Tiers

| Tier           | Price   | Database  | Storage   | Bandwidth | Rows      |
| -------------- | ------- | --------- | --------- | --------- | --------- |
| **Free**       | $0      | 500MB     | 1GB       | 2GB       | ~50k      |
| **Pro**        | $25/mo  | 8GB       | 100GB     | 250GB     | ~4M       |
| **Team**       | $599/mo | 100GB     | 500GB     | 2TB       | ~50M      |
| **Enterprise** | Custom  | Unlimited | Unlimited | Unlimited | Unlimited |

**Key insight**: You can support **~5,000-10,000 users** on the **$25/mo Pro plan** with optimization!

---

## Per-User Supabase Usage

### Database Storage (Postgres)

**Tables by size**:

```sql
-- Estimate table sizes
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size
FROM (
  VALUES
    ('master_recipes'),
    ('master_recipe_versions'),
    ('cook_sessions'),
    ('cook_session_messages'),
    ('ai_response_cache'),
    ('ai_call_logs')
) AS t(table_name);
```

**Per-user storage estimate**:

| Table                    | Avg Rows per User            | Avg Size per Row | Total per User      |
| ------------------------ | ---------------------------- | ---------------- | ------------------- |
| `master_recipes`         | 10                           | 2KB              | 20KB                |
| `master_recipe_versions` | 20 (2 versions × 10 recipes) | 5KB              | 100KB               |
| `cook_sessions`          | 30                           | 1KB              | 30KB                |
| `cook_session_messages`  | 500 (chat history)           | 500B             | 250KB               |
| `ai_response_cache`      | 0 (shared)                   | -                | 0KB                 |
| `ai_call_logs`           | 100                          | 200B             | 20KB                |
| **Total**                |                              |                  | **~420KB per user** |

**At scale**:

- 1,000 users = 420MB
- 10,000 users = 4.2GB ✅ (fits in Pro plan)
- 100,000 users = 42GB ❌ (need Team plan: $599/mo)

---

### Storage (Files)

**What's stored**:

- User profile pictures: ~100KB per user
- Recipe cover images: ~200KB per recipe (10 recipes = 2MB)
- Cached video thumbnails: ~50KB per source (negligible)

**Per-user storage estimate**:

- Profile pic: 100KB
- Recipe images: 2MB (10 recipes)
- **Total: ~2.1MB per user**

**At scale**:

- 1,000 users = 2.1GB ❌ (exceeds Free tier)
- 10,000 users = 21GB ✅ (fits in Pro plan)
- 100,000 users = 210GB ✅ (fits in Pro plan)

**Optimization**: Use image CDN (Cloudflare Images, imgix) to reduce Supabase storage:

- Pro plan storage: 100GB included
- Cost: $0.10/GB over limit
- **Recommendation**: Stay under 100GB with CDN

---

### Bandwidth (Data Transfer)

**What generates bandwidth**:

- Recipe fetches: ~50KB per load
- Chat messages: ~1KB per message
- Image loads: ~200KB per recipe view

**Per-user monthly bandwidth**:

- 30 recipe views × 50KB = 1.5MB
- 25 chat messages × 1KB = 25KB
- 30 recipe images × 200KB = 6MB
- **Total: ~7.5MB per active user/month**

**At scale**:

- 1,000 users = 7.5GB ❌ (exceeds Free tier 2GB)
- 10,000 users = 75GB ✅ (fits in Pro plan 250GB)
- 100,000 users = 750GB ❌ (exceeds Pro plan)

**Over-limit cost**: $0.09/GB

- 100k users = 750GB - 250GB = 500GB over
- Extra cost: 500 × $0.09 = **$45/mo**

---

## Supabase Optimization Strategies

### 1. Image Optimization

**Problem**: Recipe images are eating storage and bandwidth.

**Solution**: Use external CDN + aggressive compression.

```typescript
// Instead of storing in Supabase Storage
const supabaseUrl = await uploadToSupabaseStorage(image);

// Use Cloudflare Images (cheaper!)
const cloudflareUrl = await uploadToCloudflare(image);
```

**Cost comparison**:
| Service | Storage | Bandwidth | Cost (100k users) |
|---------|---------|-----------|-------------------|
| Supabase | $0.021/GB | $0.09/GB | $285/mo |
| Cloudflare Images | $5/mo | Free | $5/mo |
| **Savings** | | | **$280/mo** |

### 2. Cache Response Optimization

**Problem**: `ai_response_cache` table growing fast.

**Solution**: TTL (time-to-live) + LRU eviction.

```sql
-- Delete cached responses older than 90 days
DELETE FROM ai_response_cache
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete low-hit cached responses
DELETE FROM ai_response_cache
WHERE hit_count < 3 AND created_at < NOW() - INTERVAL '30 days';
```

**Run this as a daily Supabase cron job**:

```sql
-- supabase/migrations/add_cache_cleanup_cron.sql
SELECT cron.schedule(
  'cleanup-ai-cache',
  '0 2 * * *', -- Run at 2 AM daily
  $$
  DELETE FROM ai_response_cache
  WHERE created_at < NOW() - INTERVAL '90 days'
     OR (hit_count < 3 AND created_at < NOW() - INTERVAL '30 days');
  $$
);
```

**Impact**: Reduce cache table growth by 80%.

### 3. Message History Limits

**Problem**: `cook_session_messages` grows unbounded.

**Solution**: Keep only last 50 messages per session.

```typescript
// When saving new message
await supabase.from("cook_session_messages").insert({
  session_id: sessionId,
  role: "user",
  content: message,
  // ...
});

// Delete old messages (keep last 50)
const { data: oldMessages } = await supabase
  .from("cook_session_messages")
  .select("id")
  .eq("session_id", sessionId)
  .order("created_at", { ascending: false })
  .range(50, 999999); // Get messages beyond 50th

if (oldMessages && oldMessages.length > 0) {
  await supabase
    .from("cook_session_messages")
    .delete()
    .in(
      "id",
      oldMessages.map((m) => m.id)
    );
}
```

**Impact**: Reduce message storage by 70%.

### 4. Archive Old Sessions

**Problem**: Completed cook sessions pile up.

**Solution**: Archive to cheaper storage after 6 months.

```sql
-- Archive completed sessions older than 6 months
-- Move to S3/Archive storage, delete from Postgres
-- Keep only last 10 sessions per user in hot storage
```

---

## Total Monthly Costs at Scale

### Unoptimized (Current State)

| Users     | AI Costs | Supabase Tier  | Supabase Cost | Total Monthly |
| --------- | -------- | -------------- | ------------- | ------------- |
| 1,000     | $900     | Free           | $0            | $900          |
| 10,000    | $9,000   | Pro + overage  | $150          | $9,150        |
| 100,000   | $90,000  | Team + overage | $900          | $90,900       |
| 1,000,000 | $900,000 | Enterprise     | $5,000+       | $905,000+     |

🔴 **Unprofitable at all scales**

---

### Optimized (Smart Routing + Caching + Supabase Optimization)

| Users     | AI Costs | Supabase Tier | Supabase Cost | Total Monthly | Revenue (4% conv, $2.80/mo) |
| --------- | -------- | ------------- | ------------- | ------------- | --------------------------- |
| 1,000     | $190     | Free          | $0            | $190          | $112 (40 paid) ❌           |
| 10,000    | $1,900   | Pro           | $25           | $1,925        | $1,120 (400 paid) ❌        |
| 100,000   | $19,000  | Pro + overage | $70           | $19,070       | $11,200 (4k paid) ❌        |
| 1,000,000 | $190,000 | Team          | $599          | $190,599      | $112,000 (40k paid) ❌      |

🟡 **Still unprofitable** - Need higher conversion or pricing!

---

### Profitable Model (10% conversion, $6.99/mo, optimized costs)

| Users     | AI Costs | Supabase | Total Costs | Revenue (10% conv, $4.89/mo net) | Profit           |
| --------- | -------- | -------- | ----------- | -------------------------------- | ---------------- |
| 1,000     | $190     | $0       | $190        | $489 (100 paid)                  | **+$299** ✅     |
| 10,000    | $1,900   | $25      | $1,925      | $4,890 (1k paid)                 | **+$2,965** ✅   |
| 100,000   | $19,000  | $70      | $19,070     | $48,900 (10k paid)               | **+$29,830** ✅  |
| 1,000,000 | $190,000 | $599     | $190,599    | $489,000 (100k paid)             | **+$298,401** ✅ |

🟢 **PROFITABLE at all scales!**

---

## Complete Cost Optimization Checklist

### AI Optimization

- [ ] Implement smart model routing (Haiku/Mini/GPT-4)
- [ ] Add response caching (60% hit rate target)
- [ ] Optimize prompts (reduce tokens by 50%)
- [ ] Add rate limiting by user tier
- [ ] Monitor costs with daily alerts

### Supabase Optimization

- [ ] Use Cloudflare Images for recipe images
- [ ] Add TTL to AI cache table (90 days)
- [ ] Limit message history (50 per session)
- [ ] Archive old sessions (>6 months)
- [ ] Set up daily cleanup cron jobs
- [ ] Monitor database size weekly

### Pricing Optimization

- [ ] Test $6.99/mo price point
- [ ] Optimize onboarding for 10% conversion
- [ ] Add annual plan (discount to increase LTV)
- [ ] Consider usage-based pricing for power users

---

## Break-Even Analysis

**Fixed Costs** (monthly):

- Supabase Pro: $25
- Domain: $10
- Misc tools: $15
- **Total: $50/mo**

**Variable Costs** (per 1,000 users):

- AI: $190
- Supabase overage: ~$5
- **Total: $195**

**Break-even calculation**:

```
Revenue per 1k users = 1,000 × 10% conv × $4.89/mo = $489
Costs per 1k users = $195
Profit per 1k users = $294

Break-even point:
Fixed costs / Profit per 1k = $50 / $294 = 0.17k = 170 users
```

**You're profitable at just 170 users!** 🎉

---

## Summary: Path to Profitability

| Optimization            | Impact                     | Difficulty | Priority  |
| ----------------------- | -------------------------- | ---------- | --------- |
| Smart AI routing        | 60% AI cost reduction      | Medium     | 🔴 High   |
| Response caching        | 40% AI cost reduction      | Medium     | 🔴 High   |
| Image CDN               | 90% storage cost reduction | Easy       | 🟡 Medium |
| Message pruning         | 70% DB reduction           | Easy       | 🟡 Medium |
| Pricing increase        | 40% revenue increase       | Easy       | 🔴 High   |
| Conversion optimization | 150% revenue increase      | Hard       | 🔴 High   |

**Quick wins** (Week 1):

1. Increase price to $6.99/mo (+40% revenue)
2. Add image CDN (Cloudflare Images: -$280/mo)
3. Implement smart routing (−60% AI costs)

**Result**: Profitable at 200 users, scaling to $300k/mo profit at 1M users.

---

_Complete cost model for Chez • Day 1 profitability_
