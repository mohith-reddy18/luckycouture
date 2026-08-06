# Task: Wire Frontend Auth to Backend API

- [x] Step 1: Update vite.config.js — Add /api proxy to backend
- [x] Step 2: Create frontend/src/utils/api.js — Fetch client utility
- [x] Step 3: Update AppContext.jsx — Real login/signup/logout/session restore
- [x] Step 4: Update Login.jsx — Connect to backend with error + loading states
- [x] Step 5: Update Signup.jsx — Connect to backend with error + loading states

All steps verified complete and reviewed. Additional polish applied on top:
- Navbar and Profile page now use `authLoading` to avoid a "logged out" flash
  for already-authenticated users while the session-restore request
  (`GET /api/auth/me`) is in flight on page load.

Next natural step (not part of this task): wire Cart and Wishlist to their
real API endpoints too — they're still client-side/localStorage only.
