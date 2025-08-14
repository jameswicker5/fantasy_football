import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// TODO: replace with your project values
const SUPABASE_URL = 'https://zitmhrlmmxxzkwauhbfa.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppdG1ocmxtbXh4emt3YXVoYmZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4NjExMzAsImV4cCI6MjA3MDQzNzEzMH0.grgX_2m3IEuK9Vfj5YvZGRr3dDaYVORT6rWxmoZ_rZ8'
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Configuration
const DEADLINE_CONFIG = {
  default: {
    dayOfWeek: 4, // Thursday (0 = Sunday, 1 = Monday, etc.)
    hour: 20,     // 8:00 PM
    minute: 15    // 8:15 PM
  },
  weekOverrides: {
    // Example: Week 12 might be on Wednesday due to Thanksgiving
    // 12: { dayOfWeek: 3, hour: 18, minute: 0 }
  },
  seasonStartMonth: 8, // September (0-indexed)
  seasonStartDay: 1
}

const WARNING_THRESHOLDS = {
  CRITICAL: 1000 * 60 * 30,    // 30 minutes
  WARNING: 1000 * 60 * 60 * 2,  // 2 hours
  NOTICE: 1000 * 60 * 60 * 24   // 24 hours
}

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

// Deadline Management
function checkPicksDeadline(season, week) {
  const now = new Date()
  
  // Use override if available, otherwise use default
  const deadlineConfig = DEADLINE_CONFIG.weekOverrides[week] || DEADLINE_CONFIG.default
  
  // Calculate the target day of the given week in the season
  const seasonStart = new Date(season, DEADLINE_CONFIG.seasonStartMonth, DEADLINE_CONFIG.seasonStartDay)
  
  // Find the first Thursday of the season
  const firstThursday = new Date(seasonStart)
  const daysToFirstThursday = (DEADLINE_CONFIG.default.dayOfWeek - seasonStart.getDay() + 7) % 7
  firstThursday.setDate(seasonStart.getDate() + daysToFirstThursday)
  
  // Calculate the deadline for the specific week
  const deadline = new Date(firstThursday)
  deadline.setDate(firstThursday.getDate() + (week - 1) * 7)
  
  // Adjust if this week has an override day
  if (DEADLINE_CONFIG.weekOverrides[week]) {
    const daysDiff = deadlineConfig.dayOfWeek - DEADLINE_CONFIG.default.dayOfWeek
    deadline.setDate(deadline.getDate() + daysDiff)
  }
  
  deadline.setHours(deadlineConfig.hour, deadlineConfig.minute, 0, 0)
  
  const isLocked = now > deadline
  const timeUntilDeadline = deadline - now
  
  return {
    isLocked,
    deadline,
    timeUntilDeadline: Math.max(0, timeUntilDeadline),
    config: deadlineConfig
  }
}

function formatTimeRemaining(milliseconds) {
  if (milliseconds <= 0) return 'Deadline passed'
  
  const days = Math.floor(milliseconds / (1000 * 60 * 60 * 24))
  const hours = Math.floor((milliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60))
  
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

function getDeadlineWarningLevel(timeUntilDeadline) {
  if (timeUntilDeadline <= 0) return 'locked'
  if (timeUntilDeadline <= WARNING_THRESHOLDS.CRITICAL) return 'critical'
  if (timeUntilDeadline <= WARNING_THRESHOLDS.WARNING) return 'warning'
  if (timeUntilDeadline <= WARNING_THRESHOLDS.NOTICE) return 'notice'
  return 'normal'
}

function updateDeadlineInfo(season, week) {
  const { isLocked, deadline, timeUntilDeadline } = checkPicksDeadline(season, week)
  const warningLevel = getDeadlineWarningLevel(timeUntilDeadline)
  
  if (isLocked) {
    deadlineInfoEl.innerHTML = `
      <div class="locked">
        🔒 <strong>Picks Locked</strong><br>
        Deadline was ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}
      </div>
    `
    deadlineInfoEl.className = 'deadline-info locked'
    submitBtn.disabled = true
    submitBtn.textContent = 'Picks Locked'
  } else {
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
        Deadline: ${deadline.toLocaleDateString()} at ${deadline.toLocaleTimeString()}<br>
        Time remaining: ${timeStr}
      </div>
    `
    deadlineInfoEl.className = `deadline-info open ${warningLevel}`
    submitBtn.disabled = false
    submitBtn.textContent = 'Submit My Picks'
  }
}

// Data helpers
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

// Event Listeners
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

// Form Management
async function buildForm() {
  formEl.innerHTML = '<div class="status loading">Loading eligible players…</div>'
  const season = Number(seasonEl.value)
  const week = Number(weekEl.value)
  
  // Update deadline info
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

// Submit picks
submitBtn.onclick = async () => {
  if (!currentUser) return alert('Please sign in first')

  const season = Number(seasonEl.value)
  const week = Number(weekEl.value)
  
  // Check deadline
  const { isLocked } = checkPicksDeadline(season, week)
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

// My Week Points
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

// Leaderboard Tabs
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

// Leaderboard
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
  // Updated to use RPC function for season total points
  const { data, error } = await supabase.rpc('get_season_leaderboard', { 
    _season: season 
  })
  
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
