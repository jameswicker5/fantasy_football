import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://zitmhrlmmxxzkwauhbfa.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdG1ocmxtbXh4emt3YXVoYmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjExMzAsImV4cCI6MjA3MDQzNzEzMH0.grgX_2m3IEuK9Vfj5YvZGRr3dDaYVORT6rWxmoZ_rZ8'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/** ──────────────────────────────────────────────────────────────────────────
 *  Timezone helpers (America/New_York precision)
 *  These ensure our "local" deadline of 7:00 PM ET maps to the correct UTC instant,
 *  including across DST transitions.
 *  ────────────────────────────────────────────────────────────────────────── */
const ET_TZ = 'America/New_York'

function getTimeZoneOffsetMillis(date, timeZone) {
  // How many milliseconds you add to 'date' to get the same wall-clock time in 'timeZone'
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const parts = dtf.formatToParts(date).reduce((acc, p) => {
    acc[p.type] = p.value
    return acc
  }, {})
  // The timeZone-rendered wall-clock interpreted as UTC
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  )
  return asUTC - date.getTime()
}

function zonedTimeToUtc({ year, monthIndex, day, hour = 0, minute = 0, second = 0 }, timeZone) {
  // Start with the intended wall-clock in UTC space
  const utcCandidate = new Date(Date.UTC(year, monthIndex, day, hour, minute, second))
  // Calculate offset between the zone's wall-clock and UTC
  const offset = getTimeZoneOffsetMillis(utcCandidate, timeZone)
  // Subtract offset to get the real instant
  return new Date(utcCandidate.getTime() - offset)
}

function formatInET(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: ET_TZ,
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date)
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Deadlines (with open window)
 *  ────────────────────────────────────────────────────────────────────────── */

// Updated Configuration for 2025 NFL Season
const DEADLINE_CONFIG = {
  default: {
    dayOfWeek: 4, // Thursday (0 = Sunday, 1 = Monday, etc.)
    hour: 19,     // 7:00 PM ET
    minute: 0     // 7:00 PM ET exactly
  },
  weekOverrides: {
    1: { dayOfWeek: 4, hour: 20, minute: 0 },  // Tue 7:00 PM ET
    2: { dayOfWeek: 4, hour: 20, minute: 0 },
    3: { dayOfWeek: 2, hour: 19, minute: 0 },
    4: { dayOfWeek: 2, hour: 19, minute: 0 },
    5: { dayOfWeek: 2, hour: 19, minute: 0 },
    6: { dayOfWeek: 2, hour: 19, minute: 0 },
    7: { dayOfWeek: 2, hour: 19, minute: 0 },
    8: { dayOfWeek: 2, hour: 19, minute: 0 },
    9: { dayOfWeek: 2, hour: 19, minute: 0 },
    10:{ dayOfWeek: 2, hour: 19, minute: 0 },
    11:{ dayOfWeek: 2, hour: 19, minute: 0 },
    12:{ dayOfWeek: 2, hour: 19, minute: 0 },
    13:{ dayOfWeek: 2, hour: 19, minute: 0 },
    14:{ dayOfWeek: 2, hour: 19, minute: 0 },
    15:{ dayOfWeek: 2, hour: 19, minute: 0 },
    16:{ dayOfWeek: 2, hour: 19, minute: 0 },
    17:{ dayOfWeek: 2, hour: 19, minute: 0 },
    18:{ dayOfWeek: 4, hour: 19, minute: 0 }   // Thu 7:00 PM ET
  },
  seasonStartMonth: 8, // September (0-indexed)
  seasonStartDay: 1
}

// Precise deadline dates for 2025 NFL season (in ET)
function calculateWeekDeadline(season, week) {
  const weekDeadlinesET = {
    1: { m: 8,  d: 3,  h: 19, min: 0 },   // Tue Sept 3, 7:00 PM ET
    2: { m: 8,  d: 10, h: 19, min: 0 },
    3: { m: 8,  d: 17, h: 19, min: 0 },
    4: { m: 8,  d: 24, h: 19, min: 0 },
    5: { m: 9,  d: 1,  h: 19, min: 0 },   // Tue Oct 1
    6: { m: 9,  d: 8,  h: 19, min: 0 },
    7: { m: 9,  d: 15, h: 19, min: 0 },
    8: { m: 9,  d: 22, h: 19, min: 0 },
    9: { m: 9,  d: 29, h: 19, min: 0 },
    10:{ m: 10, d: 5,  h: 19, min: 0 },   // Tue Nov 5
    11:{ m: 10, d: 12, h: 19, min: 0 },
    12:{ m: 10, d: 19, h: 19, min: 0 },
    13:{ m: 10, d: 26, h: 19, min: 0 },   // Tue Nov 26
    14:{ m: 11, d: 3,  h: 19, min: 0 },   // Tue Dec 3
    15:{ m: 11, d: 10, h: 19, min: 0 },
    16:{ m: 11, d: 17, h: 19, min: 0 },
    17:{ m: 11, d: 24, h: 19, min: 0 },   // Tue Dec 24
    18:{ m: 0,  d: 2,  h: 19, min: 0 }    // Thu Jan 2, 2026
  }

  if (season === 2025 && weekDeadlinesET[week]) {
    const { m, d, h, min } = weekDeadlinesET[week]
    return zonedTimeToUtc({ year: week === 18 ? season + 1 : season, monthIndex: m, day: d, hour: h, minute: min, second: 0 }, ET_TZ)
  }
  return null
}

const WARNING_THRESHOLDS = {
  CRITICAL: 1000 * 60 * 30,     // 30 minutes
  WARNING:  1000 * 60 * 60 * 2, // 2 hours
  NOTICE:   1000 * 60 * 60 * 24 // 24 hours
}

// NEW: open window (picks open 7 days before deadline)
const OPEN_DAYS_BEFORE_DEADLINE = 7

function updateDebugInfo(message) {
  const debugEl = document.getElementById('debug-info')
  if (debugEl) {
    debugEl.innerHTML += `<div>${new Date().toLocaleTimeString()}: ${message}</div>`
    debugEl.scrollTop = debugEl.scrollHeight
  }
  console.log('DEBUG:', message)
}

// UI slots
const slots = [
  { key: 'QB',  label: 'Quarterback' },
  { key: 'RB1', label: 'Running Back #1' },
  { key: 'RB2', label: 'Running Back #2' },
  { key: 'WR1', label: 'Wide Receiver #1' },
  { key: 'WR2', label: 'Wide Receiver #2' },
  { key: 'TE',  label: 'Tight End' },
  { key: 'FLEX', label: 'Flex (RB/WR/TE)' },
  { key: 'K',   label: 'Kicker' },
  { key: 'DEF', label: 'Defense/ST' }
]
const flexPositions = new Set(['RB','WR','TE'])

// DOM Elements
const authEl = document.getElementById('auth')
const mainContentEl = document.getElementById('main-content')
const formEl = document.getElementById('pick-form')
const submitBtn = document.getElementById('submit')
const submitStatus = document.getElementById('submit-status')
const seasonEl = document.getElementById('season')
const weekEl = document.getElementById('week')
const leaderboardEl = document.getElementById('leaderboard')
const leaderboardDesc = document.getElementById('leaderboard-description')
const weeklyTabEl = document.getElementById('weekly-tab')
const seasonTabEl = document.getElementById('season-tab')
const deadlineInfoEl = document.getElementById('picks-deadline')

// State
let currentUser = null
let teamIndex = new Map()
let eligibleCache = []
let currentLeaderboardTab = 'weekly'

// Initialize app
await initializeApp()

async function initializeApp() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user || null

    supabase.auth.onAuthStateChange(async (_evt, session) => {
      currentUser = session?.user || null
      await refreshAuthUI()
    })

    await refreshAuthUI()
  } catch (e) {
    updateDebugInfo(`Initialization error: ${e.message}`)
    authEl.innerHTML = '<div class="status error">Error loading app. Please refresh.</div>'
  }
}

// Authentication
async function refreshAuthUI() {
  if (!currentUser) {
    authEl.innerHTML = `
      <div class="auth-section">
        <div class="auth-form">
          <input id="email" type="email" placeholder="Enter your email address" style="min-width: 280px;" />
          <button id="signin" type="button">Send Magic Link</button>
          <p class="muted">We'll send you a secure sign-in link via email</p>
        </div>
      </div>`
    document.getElementById('signin').onclick = async () => {
      const email = document.getElementById('email').value.trim()
      if (!email) return alert('Please enter an email')
      const { error } = await supabase.auth.signInWithOtp({ 
        email, 
        options: { emailRedirectTo: window.location.href } 
      })
      if (error) return alert(error.message)
      alert('Check your email for the sign-in link!')
    }
    mainContentEl.style.display = 'none'
    return
  }

  // user is signed in
  const displayName = await getDisplayName(currentUser.id, currentUser.email)
  authEl.innerHTML = `
    <div class="user-info">
      <span style="font-weight:600;color:#2d3748;">Welcome, ${displayName}! 👋</span>
      <button id="signout" type="button">Sign Out</button>
    </div>`
  document.getElementById('signout').onclick = async () => { await supabase.auth.signOut() }

  mainContentEl.style.display = 'block'

  await buildTeamIndex()
  await buildForm()
  await loadMyWeekPoints()
  await loadLeaderboard()
}

async function getDisplayName(userId, fallbackEmail) {
  const { data, error } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) updateDebugInfo(`profiles select error: ${error.message}`)
  return data?.display_name || (fallbackEmail?.split('@')[0] ?? 'Player')
}

async function ensureProfile(userId, email) {
  const { data } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) {
    await supabase.from('profiles').insert({ 
      user_id: userId, 
      email, 
      display_name: email.split('@')[0] 
    })
  }
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Deadline checks (ET) + open window
 *  ────────────────────────────────────────────────────────────────────────── */
function checkPicksDeadline(season, week) {
  const now = new Date()

  // Prefer precise hard-coded ET dates for 2025
  let deadline = null
  if (season === 2025) {
    deadline = calculateWeekDeadline(season, week)
  }

  // Fallback to computed schedule for other seasons (still in ET)
  if (!deadline) {
    const cfg = DEADLINE_CONFIG.weekOverrides[week] || DEADLINE_CONFIG.default
    const seasonStart = new Date(season, DEADLINE_CONFIG.seasonStartMonth, DEADLINE_CONFIG.seasonStartDay)

    // Find first Thursday of the season
    const firstThursday = new Date(seasonStart)
    const daysToFirstThursday = (DEADLINE_CONFIG.default.dayOfWeek - seasonStart.getDay() + 7) % 7
    firstThursday.setDate(seasonStart.getDate() + daysToFirstThursday)

    // Base date for this week
    const base = new Date(firstThursday)
    base.setDate(firstThursday.getDate() + (week - 1) * 7)

    // If there's a week override for day-of-week, shift by the difference
    if (DEADLINE_CONFIG.weekOverrides[week]) {
      const daysDiff = cfg.dayOfWeek - DEADLINE_CONFIG.default.dayOfWeek
      base.setDate(base.getDate() + daysDiff)
    }

    // Construct ET deadline instant from calendar Y-M-D + ET time
    deadline = zonedTimeToUtc({
      year: base.getFullYear(),
      monthIndex: base.getMonth(),
      day: base.getDate(),
      hour: cfg.hour,
      minute: cfg.minute,
      second: 0
    }, ET_TZ)
  }

  // Opening time is OPEN_DAYS_BEFORE_DEADLINE days before the deadline (in ET)
  const openTime = new Date(deadline.getTime() - OPEN_DAYS_BEFORE_DEADLINE * 24 * 60 * 60 * 1000)

  const isBeforeOpen = now < openTime
  const isLocked = now > deadline
  const timeUntilOpen = Math.max(0, openTime - now)
  const timeUntilDeadline = Math.max(0, deadline - now)

  return {
    isBeforeOpen,
    isLocked,
    deadline,
    openTime,
    timeUntilOpen,
    timeUntilDeadline
  }
}

function formatTimeRemaining(milliseconds) {
  if (milliseconds <= 0) return '0m'
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function getDeadlineWarningLevel(timeUntilDeadline) {
  if (timeUntilDeadline <= 0) return 'locked'
  if (timeUntilDeadline <= WARNING_THRESHOLDS.CRITICAL) return 'critical'
  if (timeUntilDeadline <= WARNING_THRESHOLDS.WARNING) return 'warning'
  if (timeUntilDeadline <= WARNING_THRESHOLDS.NOTICE) return 'notice'
  return 'normal'
}

function updateDeadlineInfo(season, week) {
  const { isBeforeOpen, isLocked, deadline, openTime, timeUntilOpen, timeUntilDeadline } = checkPicksDeadline(season, week)
  const warningLevel = getDeadlineWarningLevel(timeUntilDeadline)

  if (isBeforeOpen) {
    deadlineInfoEl.innerHTML = `
      <div class="locked">
        🔒 <strong>Picks Not Open</strong><br>
        Opens (ET): ${formatInET(openTime)}<br>
        Time until open: ${formatTimeRemaining(timeUntilOpen)}
      </div>
    `
    deadlineInfoEl.className = 'deadline-info locked'
    submitBtn.disabled = true
    submitBtn.textContent = 'Picks Not Open'
    return
  }

  if (isLocked) {
    deadlineInfoEl.innerHTML = `
      <div class="locked">
        🔒 <strong>Picks Locked</strong><br>
        Deadline (ET): ${formatInET(deadline)}
      </div>
    `
    deadlineInfoEl.className = 'deadline-info locked'
    submitBtn.disabled = true
    submitBtn.textContent = 'Picks Locked'
    return
  }

  // OPEN
  const timeStr = formatTimeRemaining(timeUntilDeadline)
  let icon = '⏰'
  let statusText = 'Picks Open'

  switch (warningLevel) {
    case 'critical':
      icon = '🚨'
      statusText = 'Deadline Soon!'
      break
    case 'warning':
      icon = '⚠️'
      statusText = 'Deadline Approaching'
      break
    case 'notice':
      icon = '📅'
      statusText = 'Deadline Tomorrow'
      break
  }

  deadlineInfoEl.innerHTML = `
    <div class="open">
      ${icon} <strong>${statusText}</strong><br>
      Deadline (ET): ${formatInET(deadline)}<br>
      Time remaining: ${timeStr}
    </div>
  `
  deadlineInfoEl.className = `deadline-info open ${warningLevel}`
  submitBtn.disabled = false
  submitBtn.textContent = 'Submit My Picks'
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Data helpers
 *  ────────────────────────────────────────────────────────────────────────── */
async function buildTeamIndex() {
  const { data, error } = await supabase.from('teams').select('id, abbr')
  if (error) { 
    updateDebugInfo(`teams load error: ${error.message}`)
    return 
  }
  teamIndex = new Map(data.map(r => [r.id, r.abbr]))
}

async function fetchEligible(season, week) {
  const { data, error } = await supabase.rpc('get_eligible_players', {
    _user_id: currentUser.id,
    _season: season,
    _week: week
  })
  if (error) { 
    updateDebugInfo(`eligible RPC error: ${error.message}`)
    return [] 
  }
  return data
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Event Listeners
 *  ────────────────────────────────────────────────────────────────────────── */
seasonEl.addEventListener('change', async () => { 
  await buildForm()
  await loadMyWeekPoints()
  await loadLeaderboard()
})

weekEl.addEventListener('change', async () => { 
  await buildForm()
  await loadMyWeekPoints()
  await loadLeaderboard()
})

/** ──────────────────────────────────────────────────────────────────────────
 *  Form Management
 *  ────────────────────────────────────────────────────────────────────────── */
async function buildForm() {
  formEl.innerHTML = '<div class="status loading">Loading eligible players…</div>'
  const season = Number(seasonEl.value)
  const week = Number(weekEl.value)

  // Update deadline info (uses ET + open window)
  updateDeadlineInfo(season, week)

  eligibleCache = await fetchEligible(season, week)

  const byPos = new Map()
  for (const p of eligibleCache) {
    const pos = p.player_position
    if (!byPos.has(pos)) byPos.set(pos, [])
    const teamAbbr = teamIndex.get(p.team_id) || 'FA'
    byPos.get(pos).push({ 
      value: String(p.player_id), 
      label: `${p.full_name} (${teamAbbr} ${pos})` 
    })
  }

  const slotEls = []
  for (const slot of slots) {
    const pos = slot.key === 'FLEX' ? 'FLEX' : (slot.key === 'DEF' ? 'DEF' : slot.key.replace(/\d/, ''))
    const select = document.createElement('select')
    select.id = `slot-${slot.key}`
    select.required = true

    const defOpt = document.createElement('option')
    defOpt.value = ''
    defOpt.textContent = `-- Select ${slot.label} --`
    select.appendChild(defOpt)

    let options = []
    if (pos === 'FLEX') {
      options = [ 
        ...(byPos.get('RB')||[]), 
        ...(byPos.get('WR')||[]), 
        ...(byPos.get('TE')||[]) 
      ]
    } else {
      options = byPos.get(pos) || []
    }
    
    options.sort((a,b) => a.label.localeCompare(b.label))
    for (const opt of options) {
      const o = document.createElement('option')
      o.value = opt.value
      o.textContent = opt.label
      select.appendChild(o)
    }

    const slotDiv = document.createElement('div')
    slotDiv.className = 'pick-slot'
    slotDiv.innerHTML = `<label class="position-label">${slot.label}</label>`
    slotDiv.appendChild(select)
    slotEls.push(slotDiv)
  }

  formEl.innerHTML = ''
  slotEls.forEach(el => formEl.appendChild(el))
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Submit picks (guards for open window + deadline)
 *  ────────────────────────────────────────────────────────────────────────── */
submitBtn.onclick = async () => {
  if (!currentUser) return alert('Please sign in first')

  const season = Number(seasonEl.value)
  const week = Number(weekEl.value)
  
  // Guard both "not open yet" and "deadline passed"
  const { isBeforeOpen, isLocked } = checkPicksDeadline(season, week)
  if (isBeforeOpen) {
    alert('Picks are not open yet for this week.')
    return
  }
  if (isLocked) {
    alert('Picks are locked for this week. The deadline has passed.')
    return
  }

  submitBtn.disabled = true
  submitStatus.innerHTML = '<div class="status loading">Submitting your picks…</div>'

  try {
    await ensureProfile(currentUser.id, currentUser.email)

    const selected = []
    const used = new Set()
    for (const { key, label } of slots) {
      const val = document.getElementById(`slot-${key}`).value
      if (!val) throw new Error(`Please select ${label}`)
      if (used.has(val)) throw new Error(`Duplicate player selected: ${label}`)
      used.add(val)
      selected.push(Number(val))
    }

    for (const pid of selected) {
      const { data, error } = await supabase.rpc('make_pick', {
        _user_id: currentUser.id,
        _season: season,
        _week: week,
        _player_id: pid
      })
      if (error) throw error
      updateDebugInfo(`make_pick -> ${data}`)
    }

    submitStatus.innerHTML = '<div class="status success">✅ Picks submitted successfully!</div>'
    await loadMyWeekPoints()
    await loadLeaderboard()
  } catch (e) {
    console.error(e)
    submitStatus.innerHTML = `<div class="status error">❌ ${e.message}</div>`
  } finally {
    // Re-check deadline in case time passed during submission
    const { isLocked } = checkPicksDeadline(season, week)
    if (!isLocked) {
      submitBtn.disabled = false
    }
  }
}

/** ──────────────────────────────────────────────────────────────────────────
 *  My Week Points
 *  ────────────────────────────────────────────────────────────────────────── */
async function loadMyWeekPoints() {
  const season = Number(seasonEl.value)
  const week = Number(weekEl.value)
  if (!currentUser) return

  const container = document.getElementById('my-week')
  const totalEl = document.getElementById('my-week-total')
  container.innerHTML = '<div class="status loading">Loading your points…</div>'
  totalEl.textContent = ''

  const { data, error } = await supabase.rpc('get_user_week_points', {
    _user_id: currentUser.id,
    _season: season,
    _week: week
  })

  if (error) {
    container.innerHTML = '<div class="status error">Could not load your points.</div>'
    totalEl.textContent = ''
    updateDebugInfo(`get_user_week_points error: ${error.message}`)
    return
  }

  if (!data || data.length === 0) {
    container.innerHTML = '<p class="muted">No picks submitted for this week yet.</p>'
    totalEl.textContent = ''
    return
  }

  let html = '<div class="leaderboard-list">'
  let total = 0
  data.forEach(row => {
    const team = row.team_abbr || 'FA'
    const pts = Number(row.points ?? 0)
    total += pts
    html += `<div class="leaderboard-item">
      <span>${row.full_name} (${team} ${row.player_position})</span>
      <span><strong>${pts.toFixed(2)} pts</strong></span>
    </div>`
  })
  html += '</div>'

  container.innerHTML = html
  totalEl.textContent = `Week ${week} total: ${total.toFixed(2)} pts`
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Leaderboard Tabs
 *  ────────────────────────────────────────────────────────────────────────── */
weeklyTabEl.onclick = () => {
  currentLeaderboardTab = 'weekly'
  weeklyTabEl.classList.add('active')
  seasonTabEl.classList.remove('active')
  loadLeaderboard()
}

seasonTabEl.onclick = () => {
  currentLeaderboardTab = 'season'
  seasonTabEl.classList.add('active')
  weeklyTabEl.classList.remove('active')
  loadLeaderboard()
}

/** ──────────────────────────────────────────────────────────────────────────
 *  Leaderboard
 *  ────────────────────────────────────────────────────────────────────────── */
async function loadLeaderboard() {
  const season = Number(seasonEl.value)
  const week = Number(weekEl.value)
  
  leaderboardEl.innerHTML = '<div class="status loading">Loading leaderboard…</div>'

  if (currentLeaderboardTab === 'weekly') {
    await loadWeeklyLeaderboard(season, week)
  } else {
    await loadSeasonLeaderboard(season)
  }
}

async function loadWeeklyLeaderboard(season, week) {
  const { data, error } = await supabase.rpc('get_weekly_leaderboard', { 
    _season: season, 
    _week: week 
  })
  
  if (error) { 
    leaderboardEl.innerHTML = '<p class="muted">Could not load weekly leaderboard.</p>'
    updateDebugInfo(`get_weekly_leaderboard error: ${error.message}`)
    return 
  }
  
  if (!data || data.length === 0) { 
    leaderboardEl.innerHTML = '<p class="muted">No scores yet for this week.</p>'
    return 
  }

  leaderboardDesc.textContent = `Rankings based on total points scored for week ${week}.`
  leaderboardEl.innerHTML = '<div class="leaderboard-list"></div>'
  const list = leaderboardEl.querySelector('.leaderboard-list')
  
  data.forEach((row, i) => {
    const medal = ['🥇','🥈','🥉'][i] ?? `${i+1}.`
    const div = document.createElement('div')
    div.className = 'leaderboard-item'
    div.innerHTML = `<span>${medal} ${row.display_name}</span><span><strong>${Number(row.total_points).toFixed(2)} pts</strong></span>`
    list.appendChild(div)
  })
}

async function loadSeasonLeaderboard(season) {
  const { data, error } = await supabase.rpc('get_season_leaderboard', { _season: season })
  console.log('Season leaderboard data:', data)
  if (error) { 
    leaderboardEl.innerHTML = '<p class="muted">Could not load season leaderboard.</p>'
    updateDebugInfo(`get_season_leaderboard error: ${error.message}`)
    return 
  }

  if (!data || data.length === 0) {
    leaderboardEl.innerHTML = '<p class="muted">No picks submitted yet for this season.</p>'
    return
  }

  leaderboardDesc.textContent = 'Rankings based on total points scored this season.'
  leaderboardEl.innerHTML = '<div class="leaderboard-list"></div>'
  const list = leaderboardEl.querySelector('.leaderboard-list')

  data.forEach((row, i) => {
    const medal = ['🥇','🥈','🥉'][i] ?? `${i+1}.`
    const div = document.createElement('div')
    div.className = 'leaderboard-item'
    div.innerHTML = `<span>${medal} ${row.display_name}</span><span><strong>${Number(row.total_points).toFixed(2)} pts</strong></span>`
    list.appendChild(div)
  })
}

// Update deadline info every minute
setInterval(() => {
  const season = Number(seasonEl.value)
  const week = Number(weekEl.value)
  updateDeadlineInfo(season, week)
}, 60000)
