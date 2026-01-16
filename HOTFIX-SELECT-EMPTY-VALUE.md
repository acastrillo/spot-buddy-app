# Hotfix: Select Component Empty Value Error

## Issue
Admin panel crashed with error:
```
Uncaught Error: A <Select.Item /> must have a value prop that is not an empty string.
This is because the Select value can be set to an empty string to clear the selection and show the placeholder.
```

## Root Cause
The `user-filters.tsx` component had three `<SelectItem>` components with empty string values:
- Subscription Tier: `<SelectItem value="">All Tiers</SelectItem>`
- Status: `<SelectItem value="">All Statuses</SelectItem>`
- Beta Filter: `<SelectItem value="">All Users</SelectItem>`

The Radix UI Select component doesn't allow empty string values because it uses empty string internally to clear selections.

## Fix Applied
**File**: [src/components/admin/user-filters.tsx](src/components/admin/user-filters.tsx)

### Changes:
1. **Updated SelectItem values** - Changed from `""` to `"all"`:
   ```typescript
   <SelectItem value="all">All Tiers</SelectItem>
   <SelectItem value="all">All Statuses</SelectItem>
   <SelectItem value="all">All Users</SelectItem>
   ```

2. **Updated default values** - Changed from `|| ''` to `|| 'all'`:
   ```typescript
   value={searchParams.get('tier') || 'all'}
   value={searchParams.get('status') || 'all'}
   value={searchParams.get('isBeta') || 'all'}
   ```

3. **Updated filter logic** - Treat `"all"` as clearing the filter:
   ```typescript
   const updateFilter = useCallback((key: string, value: string) => {
     const params = new URLSearchParams(searchParams);

     // Treat "all" as clearing the filter
     if (value && value.trim() && value !== 'all') {
       params.set(key, value);
     } else {
       params.delete(key);
     }

     // Reset pagination when filters change
     params.delete('lastEvaluatedKey');

     router.push(`/admin/users?${params.toString()}`);
   }, [router, searchParams]);
   ```

## Testing
- ✅ Build successful (`npm run build`)
- ✅ No TypeScript errors
- ✅ Select dropdowns now use "all" instead of empty strings
- ✅ Filter logic correctly clears URL params when "all" is selected
- ✅ Pagination resets when filters change

## Deployment
This fix needs to be deployed immediately to restore admin panel functionality:

```bash
# 1. Build
npm run build

# 2. Docker build & push
docker build -t spotter-app:latest .
docker tag spotter-app:latest 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 920013187591.dkr.ecr.us-east-1.amazonaws.com
docker push 920013187591.dkr.ecr.us-east-1.amazonaws.com/spotter-app:latest

# 3. Force new deployment
aws ecs update-service \
  --cluster spotter-cluster \
  --service spotter-app-service \
  --force-new-deployment \
  --region us-east-1
```

## Verification
After deployment:
1. Navigate to `/admin/users`
2. ✅ Page should load without errors
3. ✅ Filter dropdowns should work correctly
4. ✅ Selecting "All Tiers/Statuses/Users" should clear the filter from URL
5. ✅ Selecting specific values should add them to URL params

## Related Files
- [src/components/admin/user-filters.tsx](src/components/admin/user-filters.tsx) - Fixed component
- [src/components/ui/select.tsx](src/components/ui/select.tsx) - Radix UI Select wrapper

## Prevention
For future Select components:
- **Never use empty string (`""`) as a value** in `<SelectItem>`
- Use meaningful values like `"all"`, `"none"`, or `"default"`
- Handle clearing filters in the `onValueChange` handler logic
- Test all Select dropdowns before deployment

## Status
- ✅ Fix applied
- ✅ Build verified
- ⚠️ **Requires deployment** to fix production
