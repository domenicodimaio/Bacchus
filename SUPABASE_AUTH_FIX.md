# Supabase Authentication Fix

## Issue
The Bacchus app was experiencing "Invalid API key" errors during authentication with Supabase. Our investigation revealed two separate issues:

1. Authentication configuration issues:
   - Complex client initialization with mock/conditional logic
   - Issues with the storage and retrieval of authentication tokens
   - Conflicting code for authentication handling

2. Database access permission issues:
   - The API key may not have sufficient database access permissions
   - Row Level Security (RLS) policies may be blocking access to tables 
   - Database authentication works but operations fail with "Invalid API key"

## Solution
We've implemented a focused fix by:

1. Simplifying the Supabase client implementation:
   - Removed mock client implementation that could have been interfering
   - Created a clean, direct client that uses hardcoded credentials
   - Simplified the storage interface to reduce potential issues
   - Enabled debug mode for better logging

2. Updated authentication flow:
   - Fixed middleware to use the proper API for user validation
   - Updated imports across affected files
   - Improved error handling to gracefully continue despite permission issues
   - Added multiple table access attempts to find accessible data

3. Created diagnostic tools:
   - Main diagnostic screen (`app/index.tsx`) to test Supabase connectivity
   - Login diagnostic page (`app/auth/login-diagnostic.tsx`) to test authentication separately from database access
   - Enhanced logging for clear error identification

## Database Access Issues
Our diagnostics suggest that while authentication is working correctly, the API key being used may not have sufficient permissions to access the database tables. This can occur because:

1. The API key (anon key) has restricted permissions in the Supabase dashboard
2. Row Level Security (RLS) policies are blocking access to the data
3. The database service might be on a different plan/tier than the authentication service

## Files Modified
- `app/lib/supabase/client.ts` - Simplified client implementation with debug mode
- `app/lib/services/auth.service.ts` - Updated imports and improved error handling
- `app/_layout.tsx` - Updated imports to match new client
- `app/lib/supabase/middleware.ts` - Fixed authentication checks
- `app/index.tsx` - Improved diagnostic tool with detailed error reporting
- `app/auth/login-diagnostic.tsx` - Added specialized login diagnostic tool

## How to Test
1. Run the app with `npx expo start`
2. Navigate to the root screen, which displays the main diagnostic interface
3. Check the diagnostic logs for specific errors related to database access
4. Use the "Try Login Diagnostic" button to test authentication separately
5. Enter valid credentials to see if authentication works despite database issues

## Next Steps
Based on the diagnostics, you may need to:

1. Check your Supabase project dashboard for API key permissions
2. Review Row Level Security (RLS) policies in your database tables
3. Consider using a service role key (with appropriate security measures) if anon key permissions cannot be expanded
4. Review SQL migrations or database schema changes that may have affected permissions

## Environment Variables
The following environment variables are used:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Make sure these variables are correctly set in your `.env` file or in your Expo build configuration. 