# 🏈 Fantasy Football Weekly Picks

A modern, interactive fantasy football application where users can submit weekly picks and compete in season-long leaderboards. Built with vanilla JavaScript and Supabase for real-time data management.

<img src="./images/fantasy_football_logo.png" alt="Football Player" width="33%">

## ✨ Features

- **🔐 Magic Link Authentication** - Secure email-based login via Supabase Auth
- **⏰ Time-Based Deadlines** - Automatic pick locking with visual countdown warnings
- **🏆 Dual Leaderboards** - Weekly points and season total competitions
- **📱 Responsive Design** - Works seamlessly on desktop and mobile devices
- **🎯 Smart Pick Validation** - Prevents duplicate selections and enforces bye week rules
- **📊 Real-Time Updates** - Live scoring and leaderboard updates

## 🎮 How to Play

1. **Sign Up** - Enter your email to receive a magic link
2. **Select Season & Week** - Choose the current fantasy week
3. **Build Your Lineup** - Pick players for each position:
   - 1 Quarterback (QB)
   - 2 Running Backs (RB1, RB2)
   - 2 Wide Receivers (WR1, WR2) 
   - 1 Tight End (TE)
   - 1 Flex Player (RB/WR/TE)
   - 1 Kicker (K)
   - 1 Defense/Special Teams (DEF)
4. **Submit Before Deadline** - Picks lock automatically on Thursday nights
5. **Track Your Performance** - Monitor weekly points and season rankings

## 🎨 Visual Features

- **Gradient Backgrounds** - Modern purple-blue aesthetic
- **Animated Buttons** - Hover effects and smooth transitions
- **Status Indicators** - Color-coded deadline warnings
- **Responsive Grid** - Adaptive layout for all screen sizes
- **Medal System** - 🥇🥈🥉 for top 3 leaderboard positions
- **Real-time Countdown** - Live deadline timer with urgency indicators

## 🔧 Technical Stack

- **Frontend**: Vanilla JavaScript (ES6 modules), CSS Grid/Flexbox
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Authentication**: Magic link email authentication
- **Data Validation**: Client and server-side pick validation
- **Real-time Updates**: Automatic leaderboard refreshing

## 🎯 Key Gameplay Rules

- **One Lineup Per Week** - Submit your best 9-player roster
- **No Duplicate Players** - Each player can only be used once per lineup  
- **Bye Week Protection** - Ineligible players are automatically filtered out
- **Season-Long Strategy** - Players can only be picked once per season
- **Deadline Enforcement** - No late submissions accepted

## 📱 User Experience

- **Mobile Optimized** - Fully responsive design for phones and tablets
- **Intuitive Interface** - Clean, modern UI with clear visual hierarchy
- **Smart Notifications** - Visual deadline warnings with increasing urgency
- **Performance Tracking** - Detailed weekly breakdowns and season totals
- **Social Competition** - Public leaderboards to compete with friends

---

**A fantasy football experience designed for competitive play and maximum engagement!** 🏆
