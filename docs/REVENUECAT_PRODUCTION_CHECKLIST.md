# RevenueCat Production Launch Checklist

## Code Complete ✅

- [x] Re-enable webhook authentication
- [x] Add Terms of Service and Privacy Policy links to paywall
- [x] Add "Manage Subscription" link for Chef users in profile
- [x] Fix trigger to allow service-role updates (migration applied)
- [x] Deploy webhook to production

## Manual Steps Required

- [ ] **Update legal URLs** in `app/paywall.tsx` (lines 26-27):
  - Replace `https://chez.app/terms` with your actual Terms URL
  - Replace `https://chez.app/privacy` with your actual Privacy URL

- [ ] **Configure webhook in RevenueCat Dashboard**:
  1. Go to RevenueCat → Your App → Integrations → Webhooks
  2. Add webhook URL: `https://bnzggihiartfgemdbxts.supabase.co/functions/v1/revenuecat-webhook`
  3. Set Authorization header: `Bearer <your-REVENUECAT_WEBHOOK_SECRET>`

- [ ] **Verify secret is set**:

  ```bash
  supabase secrets list
  # Should see REVENUECAT_WEBHOOK_SECRET
  ```

- [ ] **Test end-to-end** with a new sandbox user

- [ ] Submit app for App Store review (subscriptions reviewed together)

## After App Store Approval

- Products automatically become available to real users
- No code changes needed - RevenueCat handles sandbox vs production automatically
- Monitor purchases in RevenueCat Dashboard → Customers

## Sandbox Testing Notes

- Each Sandbox Tester can only do "first purchase" once
- Create new testers in App Store Connect → Users and Access → Sandbox → Testers
- Sandbox subscriptions auto-renew every few minutes (not monthly/yearly)
- Sign out of real Apple ID before testing (Settings → App Store)

## Current Configuration

- **Bundle ID**: com.chez.app
- **Entitlement ID**: chef
- **Products**: chef_monthly ($9.99/mo), chef_annual
- **Offering**: default
