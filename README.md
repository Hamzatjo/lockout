# LOCKOUT 🏋️‍♂️⚖️

A fitness accountability app — BeReal meets workout tracking. Compete with your squad, claim PRs with video proof, and let your group decide if it counts.

## Concept

- **Squads** — Small groups (5-100 people) that hold each other accountable
- **Check-ins** — BeReal-style proof you showed up to the gym (photo = 1 pt/day)
- **Tribunal** — Claim a PR with video evidence, your squad votes VALID or CAP (10-15 pts)
- **Leaderboard** — Weekly/seasonal/all-time rankings within your squad
- **Challenges** — Squad-defined competitions with point multipliers

The app facilitates competition. The group decides the stakes.

## Tech Stack

- **Frontend:** React Native (Expo 54), TypeScript
- **Backend:** Supabase (Auth, Postgres, Storage, Edge Functions)
- **Navigation:** React Navigation 7 (bottom tabs + native stack)
- **Media:** expo-camera, expo-video, expo-image-picker
- **Notifications:** expo-notifications (push via Supabase)

## Current State (as of Feb 2026)

### ✅ Built
- Auth (email signup/login via Supabase)
- Home feed with squad workouts (video autoplay, media viewer)
- Squad system (create with invite code, join, member limits by plan tier)
- Tribunal system (video upload + squad voting with majority logic)
- Fit Check (photo check-in)
- PR Leaderboard (per-exercise, estimated 1RM calculation)
- General Leaderboard (weekly/seasonal/all-time, points breakdown)
- Body Stats tracking
- Workout logging (custom workouts, exercise picker, active workout tracking)
- Schedule & events (create gym sessions, join/decline)
- Push notification infrastructure
- Dark theme (electric green + purple accent)
- RLS policies (row-level security on all tables)
- 8 DB migrations

### 🚧 Missing / Incomplete
- [ ] Streak tracking (consecutive check-in days)
- [ ] Challenges system (squad-created challenges with deadlines + rewards)
- [ ] Notifications (wired up but no triggers sending them)
- [ ] Onboarding flow (new user → create/join squad)
- [ ] Profile editing (avatar upload, username change)
- [ ] Settings screen (logout, notifications toggle, account deletion)
- [ ] Squad management (kick members, transfer leadership, leave squad)
- [ ] Quest system (AI-generated daily challenges — schema exists, no UI)
- [ ] Workout history / stats visualization
- [ ] Social features (comments, reactions on feed items)
- [ ] Invite system (deep links, share invite code)
- [ ] Offline support / optimistic updates
- [ ] Error boundaries & loading states (inconsistent)
- [ ] App icon, splash screen, app store assets
- [ ] Environment config (.env.example, setup docs)
- [ ] Tests

## Project Structure

```
lockout/
├── App.tsx                    # Entry point, auth gate
├── index.ts                   # Expo entry
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── BodyVisual.tsx
│   │   ├── CheckInButton.tsx
│   │   ├── ExercisePicker.tsx
│   │   ├── LeaderboardRow.tsx
│   │   ├── MediaViewer.tsx
│   │   └── VideoPlayer.tsx
│   ├── data/
│   │   └── exercises.ts       # Exercise database
│   ├── lib/
│   │   ├── supabase.ts        # Client + DB types
│   │   └── notifications.ts   # Push notification setup
│   ├── navigation/
│   │   ├── AuthNavigator.tsx   # Login/Signup stack
│   │   └── MainNavigator.tsx   # Tabs + modal screens
│   ├── screens/
│   │   ├── auth/              # Login, SignUp
│   │   ├── HomeScreen.tsx     # Feed
│   │   ├── SquadScreen.tsx    # Squad details
│   │   ├── LeaderboardScreen.tsx
│   │   ├── PRLeaderboardScreen.tsx
│   │   ├── TribunalUploadScreen.tsx
│   │   ├── TribunalVoteScreen.tsx
│   │   ├── FitCheckScreen.tsx
│   │   ├── WorkoutsScreen.tsx
│   │   ├── ActiveWorkoutScreen.tsx
│   │   ├── ScheduleScreen.tsx
│   │   └── ...
│   └── theme/
│       ├── colors.ts          # Dark gym aesthetic
│       ├── typography.ts
│       └── index.ts
├── supabase/
│   ├── migrations/            # 001-008 SQL migrations
│   └── functions/
│       └── cleanup-expired/   # Edge function: remove expired workouts
└── package.json
```

## Database Schema

| Table | Purpose |
|-------|---------|
| profiles | User profiles (username, avatar, push token) |
| squads | Groups with plan tiers (lite=5, pro=20, club=100) |
| squad_members | Membership junction table |
| workouts | Check-ins, logs, tribunal submissions |
| votes | Tribunal votes (valid/cap) per workout |
| quests | AI-generated challenges (unused) |
| schedule_events | Planned gym sessions |
| event_participants | RSVP for events |
| custom_workouts | User-created workout templates |
| workout_exercises | Exercises within custom workouts |
| workout_logs | Completed workout sessions |
| exercise_logs | Individual set/rep logs |

## Points System

| Action | Points |
|--------|--------|
| Daily check-in (fit check) | 1 pt/day |
| Tribunal win (verified lift) | 10 pts |
| Tribunal win (PR claim) | 15 pts |
| Tribunal loss (CAP) | 0 pts |
| Quest completion | base × multiplier |

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY

# Start dev server
npx expo start
```

## Roadmap

### Phase 1: Core Polish
1. Onboarding flow (first-time user experience)
2. Profile editing + settings
3. Squad management (kick, leave, transfer)
4. Push notification triggers (new tribunal, vote results, events)
5. Streak tracking + streak-based bonus points

### Phase 2: Engagement
6. Challenges system (squad-created, time-limited, custom point values)
7. Social features (reactions on feed, comments)
8. Invite deep links (share squad code via link)
9. Workout history + progress charts

### Phase 3: Growth
10. Quest system (auto-generated daily challenges)
11. Achievements / badges
12. Multi-squad support
13. Public profiles / cross-squad leaderboards

### Phase 4: Launch
14. App icon + splash screen
15. App Store / Play Store submission
16. Landing page
