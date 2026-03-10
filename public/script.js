const videosContainer = document.getElementById("videos")
const shortsContainer = document.getElementById("shorts")
const searchInput = document.getElementById("search")
const searchBtn = document.querySelector(".search-btn")
const sidebarCategory = document.getElementById("sidebarCategory")
const sidebarLanguage = document.getElementById("sidebarLanguage")
const chipButtons = Array.from(document.querySelectorAll(".chip"))
const menuBtn = document.querySelector('.left-header .icon-btn[aria-label="Menu"]')
const uploadBtn = document.querySelector('.right-header .icon-btn[aria-label="Upload"]')
const notificationsBtn = document.querySelector('.right-header .icon-btn[aria-label="Notifications"]')
const avatarBtn = document.querySelector(".avatar")
const sidebar = document.querySelector(".sidebar")
const sideLinks = Array.from(document.querySelectorAll(".side-link"))
const languageToggleBtn = document.getElementById("languageToggleBtn")
const languageMenu = document.getElementById("languageMenu")
const headerLanguageSelect = document.getElementById("headerLanguageSelect")

const aiToggleBtn = document.getElementById("aiToggleBtn")
const aiPanel = document.getElementById("aiPanel")
const aiInput = document.getElementById("aiInput")
const aiAskBtn = document.getElementById("aiAskBtn")
const aiReply = document.getElementById("aiReply")
const aiReco = document.getElementById("aiReco")

const DUB_LANG_KEY = "novaplay_dub_language"
const RECO_CONTEXT_KEY = "novaplay_reco_context"
const MINIPLAYER_KEY = "novaplay_miniplayer"
const HISTORY_KEY = "novaplay_history_ids"

let allVideos = []
let currentSearch = ""
let currentCategory = "all"
let currentLanguage = "all"
let currentChip = "all"
let currentView = "home"
let likedVideoIds = new Set()

function getPreferredDubLanguage() {
  const lang = String(localStorage.getItem(DUB_LANG_KEY) || "original").trim().toLowerCase()
  return lang || "original"
}

function setPreferredDubLanguage(lang) {
  localStorage.setItem(DUB_LANG_KEY, String(lang || "original").toLowerCase())
}

function getRecoContext() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECO_CONTEXT_KEY) || "{}")
    return {
      mode: String(parsed.mode || "auto"),
      category: String(parsed.category || "all"),
      search: String(parsed.search || "")
    }
  } catch {
    return { mode: "auto", category: "all", search: "" }
  }
}

function setManualRecoContext() {
  const payload = {
    mode: "manual",
    category: currentCategory,
    search: currentSearch
  }
  localStorage.setItem(RECO_CONTEXT_KEY, JSON.stringify(payload))
}


function getHistoryIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
    return Array.isArray(parsed) ? parsed.map(id => Number(id)).filter(Boolean) : []
  } catch {
    return []
  }
}

function recordHistoryId(videoId) {
  const id = Number(videoId)
  if (!id) return

  const prev = getHistoryIds().filter(item => item !== id)
  prev.unshift(id)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(prev.slice(0, 120)))
}

async function refreshLikedVideoIds() {
  try {
    const data = await fetchJson("/api/favorite")
    const ids = Array.isArray(data) ? data.map(id => Number(id)).filter(Boolean) : []
    likedVideoIds = new Set(ids)
  } catch {
    likedVideoIds = new Set()
  }
}
function getMiniPlayerState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MINIPLAYER_KEY) || "{}")
    return {
      id: Number(parsed.id) || 0,
      title: String(parsed.title || "NovaPlay"),
      source: String(parsed.source || "local").toLowerCase(),
      videoId: String(parsed.videoId || ""),
      playbackUrl: String(parsed.playbackUrl || ""),
      thumbnailUrl: String(parsed.thumbnailUrl || "")
    }
  } catch {
    return null
  }
}

function clearMiniPlayerState() {
  localStorage.removeItem(MINIPLAYER_KEY)
  const current = document.getElementById("miniPlayer")
  if (current) current.remove()
}

function renderMiniPlayer() {
  const state = getMiniPlayerState()
  const existing = document.getElementById("miniPlayer")
  if (!state || !state.id) {
    if (existing) existing.remove()
    return
  }

  if (existing) existing.remove()

  const wrapper = document.createElement("div")
  wrapper.id = "miniPlayer"
  wrapper.className = "mini-player"

  const header = document.createElement("div")
  header.className = "mini-player-header"

  const title = document.createElement("div")
  title.className = "mini-player-title"
  title.textContent = state.title

  const actions = document.createElement("div")
  actions.className = "mini-player-actions"

  const openBtn = document.createElement("button")
  openBtn.className = "mini-btn"
  openBtn.textContent = "Open"
  openBtn.addEventListener("click", () => {
    window.location.href = `/watch.html?id=${encodeURIComponent(String(state.id))}`
  })

  const closeBtn = document.createElement("button")
  closeBtn.className = "mini-btn danger"
  closeBtn.textContent = "Close"
  closeBtn.addEventListener("click", clearMiniPlayerState)

  actions.appendChild(openBtn)
  actions.appendChild(closeBtn)
  header.appendChild(title)
  header.appendChild(actions)

  const body = document.createElement("div")
  body.className = "mini-player-body"

  const source = state.source
  if ((source === "youtube" || source === "local") && state.videoId) {
    const iframe = document.createElement("iframe")
    iframe.src = `https://www.youtube.com/embed/${encodeURIComponent(state.videoId)}?autoplay=1&mute=1&playsinline=1&rel=0`
    iframe.allow = "autoplay; encrypted-media; picture-in-picture"
    iframe.allowFullscreen = true
    body.appendChild(iframe)
  } else if (state.playbackUrl) {
    const video = document.createElement("video")
    video.src = state.playbackUrl
    video.autoplay = true
    video.muted = true
    video.controls = true
    video.playsInline = true
    body.appendChild(video)
  } else {
    const empty = document.createElement("div")
    empty.className = "mini-player-empty"
    empty.textContent = "Mini preview unavailable"
    body.appendChild(empty)
  }

  wrapper.appendChild(header)
  wrapper.appendChild(body)
  document.body.appendChild(wrapper)
}
function getShortCandidates(videos) {
  const list = Array.isArray(videos) ? videos : []
  const explicit = list.filter(video => {
    const title = String(video.title || "").toLowerCase()
    const category = String(video.category || "").toLowerCase()
    return category === "shorts" || title.includes("#shorts") || /\bshorts?\b/.test(title)
  })

  if (explicit.length > 0) {
    return explicit.slice(0, 12)
  }

  return [...list]
    .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
    .slice(0, 12)
}

function getExplicitShorts(videos) {
  const list = Array.isArray(videos) ? videos : []
  return list.filter(video => {
    const title = String(video.title || "").toLowerCase()
    const category = String(video.category || "").toLowerCase()
    return category === "shorts" || title.includes("#shorts") || /\bshorts?\b/.test(title)
  })
}

function renderShorts(videos, options = {}) {
  if (!shortsContainer) return

  const useFallback = options.useFallback !== false
  const explicit = getExplicitShorts(videos)
  const shorts = explicit.length > 0
    ? explicit.slice(0, 12)
    : (useFallback ? getShortCandidates(videos) : [])
  shortsContainer.innerHTML = ""

  if (!shorts.length) {
    const empty = document.createElement("div")
    empty.className = "feed-message"
    empty.textContent = "No shorts available"
    shortsContainer.appendChild(empty)
    return
  }

  shorts.forEach(video => {
    const card = document.createElement("a")
    card.className = "short-card"
    const params = new URLSearchParams({ id: String(video.id) })
    const dubLang = getPreferredDubLanguage()
    if (dubLang && dubLang !== "original") params.set("lang", dubLang)
    card.href = `watch.html?${params.toString()}`

    const img = document.createElement("img")
    img.src = getThumbnail(video)
    img.alt = `${video.title} short`

    const title = document.createElement("div")
    title.className = "short-card-title"
    title.textContent = String(video.title || "Untitled")

    card.appendChild(img)
    card.appendChild(title)
    shortsContainer.appendChild(card)
  })
}

function showMessage(message) {
  videosContainer.innerHTML = ""
  const box = document.createElement("div")
  box.className = "feed-message"
  box.textContent = message
  videosContainer.appendChild(box)
}

function getThumbnail(video) {
  if (video.thumbnailUrl) return video.thumbnailUrl
  if (video.videoId) return `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
  return ""
}

function createVideoCard(video) {
  const card = document.createElement("div")
  card.className = "card"

  const link = document.createElement("a")
  const params = new URLSearchParams({ id: String(video.id) })
  const dubLang = getPreferredDubLanguage()
  if (dubLang && dubLang !== "original") {
    params.set("lang", dubLang)
  }
  link.href = `watch.html?${params.toString()}`
  link.className = "video-link"
  link.addEventListener("click", () => recordHistoryId(video.id))

  const image = document.createElement("img")
  image.src = getThumbnail(video)
  image.alt = `${video.title} thumbnail`

  const info = document.createElement("div")
  info.className = "video-info"

  const title = document.createElement("div")
  title.className = "title"
  title.textContent = video.title

  const meta = document.createElement("div")
  meta.className = "video-meta"
  const views = Number(video.views) || 0
  const source = String(video.source || "local")
  const category = String(video.category || "general")
  const language = String(video.language || "en")
  meta.textContent = `${source} | ${category} | ${language} | ${views.toLocaleString()} views`

  info.appendChild(title)
  info.appendChild(meta)
  link.appendChild(image)
  link.appendChild(info)
  card.appendChild(link)
  return card
}

function renderVideos(videos) {
  videosContainer.innerHTML = ""

  if (!Array.isArray(videos) || videos.length === 0) {
    showMessage("No videos found")
    return
  }

  videos.forEach(video => videosContainer.appendChild(createVideoCard(video)))
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = ""

  const all = document.createElement("option")
  all.value = "all"
  all.textContent = allLabel
  select.appendChild(all)

  values.forEach(value => {
    const option = document.createElement("option")
    option.value = value
    option.textContent = value
    select.appendChild(option)
  })
}

function fillHeaderLanguageSelect(languages) {
  if (!headerLanguageSelect) return

  headerLanguageSelect.innerHTML = ""
  const original = document.createElement("option")
  original.value = "original"
  original.textContent = "Original Audio"
  headerLanguageSelect.appendChild(original)

  languages.forEach(language => {
    const option = document.createElement("option")
    option.value = language
    option.textContent = language
    headerLanguageSelect.appendChild(option)
  })

  const preferred = getPreferredDubLanguage()
  const exists = Array.from(headerLanguageSelect.options).some(o => o.value === preferred)
  headerLanguageSelect.value = exists ? preferred : "original"
}

function applyFilters() {
  let filtered = [...allVideos]

  if (currentSearch) {
    const q = currentSearch.toLowerCase()
    filtered = filtered.filter(video =>
      String(video.title || "").toLowerCase().includes(q) ||
      String(video.source || "").toLowerCase().includes(q) ||
      String(video.category || "").toLowerCase().includes(q) ||
      String(video.language || "").toLowerCase().includes(q)
    )
  }

  if (currentCategory !== "all") {
    filtered = filtered.filter(video => String(video.category || "general").toLowerCase() === currentCategory)
  }

  if (currentLanguage !== "all") {
    filtered = filtered.filter(video => String(video.language || "en").toLowerCase() === currentLanguage)
  }

  if (currentChip !== "all") {
    if (currentChip === "live") {
      filtered = filtered.filter(video => String(video.title || "").toLowerCase().includes("live"))
    } else {
      filtered = filtered.filter(video => String(video.category || "general").toLowerCase() === currentChip)
    }
  }

  if (currentView === "shorts") {
    const explicitShorts = getExplicitShorts(filtered)
    const shortsFeed = explicitShorts.length > 0 ? explicitShorts : getShortCandidates(filtered)
    renderShorts(shortsFeed, { useFallback: true })
    showMessage(explicitShorts.length > 0 ? "Shorts mode active" : "No explicit shorts found, showing quick vertical picks")
    return
  }

  if (currentView === "subscriptions") {
    const subFeed = filtered.filter(video => String(video.source || "").toLowerCase() === "youtube")
    renderShorts(subFeed, { useFallback: true })
    renderVideos(subFeed)
    return
  }

  if (currentView === "history") {
    const historyIds = getHistoryIds()
    const historySet = new Set(historyIds)
    const historyFeed = filtered.filter(video => historySet.has(Number(video.id)))
      .sort((a, b) => historyIds.indexOf(Number(a.id)) - historyIds.indexOf(Number(b.id)))
    renderShorts(historyFeed, { useFallback: false })
    renderVideos(historyFeed)
    return
  }

  if (currentView === "liked videos") {
    const likedFeed = filtered.filter(video => likedVideoIds.has(Number(video.id)))
    renderShorts(likedFeed, { useFallback: false })
    renderVideos(likedFeed)
    return
  }

  renderShorts(filtered, { useFallback: true })
  renderVideos(filtered)
}

async function fetchJson(url, options) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || "Request failed")
  return data
}

async function loadSidebarFilters() {
  const [categories, languages] = await Promise.all([
    fetchJson("/api/categories"),
    fetchJson("/api/languages")
  ])

  const fallbackCategories = [...new Set(allVideos.map(v => String(v.category || "general").toLowerCase()))].sort()
  const fallbackLanguages = [...new Set(allVideos.map(v => String(v.language || "en").toLowerCase()))].sort()

  const finalCategories = Array.isArray(categories) && categories.length ? categories : fallbackCategories
  const finalLanguages = Array.isArray(languages) && languages.length ? languages : fallbackLanguages

  fillSelect(sidebarCategory, finalCategories, "All Categories")
  fillSelect(sidebarLanguage, finalLanguages, "All Languages")
  fillHeaderLanguageSelect(finalLanguages)

  sidebarCategory.value = currentCategory
  sidebarLanguage.value = currentLanguage
}

async function loadVideos() {
  try {
    const context = getRecoContext()
    if (context.mode === "manual") {
      currentCategory = context.category || "all"
      currentSearch = context.search || ""
      searchInput.value = currentSearch
    }

    allVideos = await fetchJson("/api/videos/trending")
    await refreshLikedVideoIds()
    await loadSidebarFilters()
    applyFilters()
  } catch (err) {
    showMessage(`Unable to load videos: ${err.message}`)
  }
}

function renderAiRecommendations(items) {
  if (!aiReco) return
  aiReco.innerHTML = ""

  if (!Array.isArray(items) || items.length === 0) {
    aiReco.textContent = "No recommendations right now"
    return
  }

  items.forEach(video => {
    const link = document.createElement("a")
    link.className = "ai-reco-item"
    const params = new URLSearchParams({ id: String(video.id) })
    const dubLang = getPreferredDubLanguage()
    if (dubLang !== "original") params.set("lang", dubLang)
    link.href = `watch.html?${params.toString()}`
    link.textContent = `${video.title} (${video.category || "general"} | ${video.language || "en"})`
    aiReco.appendChild(link)
  })
}

async function askAssistant() {
  if (!aiInput || !aiReply) return

  try {
    const payload = await fetchJson("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: aiInput.value.trim(),
        category: currentCategory,
        search: currentSearch
      })
    })

    aiReply.textContent = payload.reply || "AI response unavailable"
    renderAiRecommendations(payload.recommendations || [])
  } catch (err) {
    aiReply.textContent = `AI unavailable: ${err.message}`
  }
}

let searchTimer
searchInput.addEventListener("input", event => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentSearch = event.target.value.trim()
    setManualRecoContext()
    applyFilters()
  }, 250)
})

if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    currentSearch = searchInput.value.trim()
    setManualRecoContext()
    applyFilters()
  })
}

searchInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    currentSearch = event.target.value.trim()
    setManualRecoContext()
    applyFilters()
  }
})

sidebarCategory.addEventListener("change", event => {
  currentCategory = event.target.value
  setManualRecoContext()
  applyFilters()
})

sidebarLanguage.addEventListener("change", event => {
  currentLanguage = event.target.value
  if (currentLanguage !== "all") {
    setPreferredDubLanguage(currentLanguage)
    if (headerLanguageSelect) headerLanguageSelect.value = currentLanguage
  }
  setManualRecoContext()
  applyFilters()
})

chipButtons.forEach(button => {
  button.addEventListener("click", () => {
    chipButtons.forEach(chip => chip.classList.remove("active"))
    button.classList.add("active")
    currentChip = String(button.textContent || "all").trim().toLowerCase()
    if (currentChip !== "all") {
      currentCategory = currentChip === "live" ? "all" : currentChip
      sidebarCategory.value = currentCategory
    }
    setManualRecoContext()
    applyFilters()
  })
})

if (menuBtn && sidebar) {
  menuBtn.addEventListener("click", () => sidebar.classList.toggle("collapsed"))
}

if (uploadBtn) {
  uploadBtn.addEventListener("click", () => {
    window.location.href = "/admin.html"
  })
}

if (notificationsBtn) {
  notificationsBtn.addEventListener("click", () => {
    window.alert("Notifications feature will be available soon.")
  })
}

if (avatarBtn) {
  avatarBtn.addEventListener("click", () => {
    window.location.href = "/admin.html"
  })
}

if (languageToggleBtn && languageMenu) {
  languageToggleBtn.addEventListener("click", () => {
    languageMenu.classList.toggle("hidden")
  })

  document.addEventListener("click", event => {
    const target = event.target
    if (!languageMenu.contains(target) && target !== languageToggleBtn) {
      languageMenu.classList.add("hidden")
    }
  })
}

if (headerLanguageSelect) {
  headerLanguageSelect.addEventListener("change", () => {
    const selected = String(headerLanguageSelect.value || "original").toLowerCase()
    setPreferredDubLanguage(selected)

    if (selected === "original") {
      currentLanguage = "all"
      sidebarLanguage.value = "all"
    } else {
      currentLanguage = selected
      sidebarLanguage.value = selected
    }

    setManualRecoContext()
    applyFilters()
    languageMenu?.classList.add("hidden")
  })
}

if (aiToggleBtn && aiPanel) {
  aiToggleBtn.addEventListener("click", () => {
    aiPanel.classList.toggle("hidden")
  })
}

if (aiAskBtn) {
  aiAskBtn.addEventListener("click", askAssistant)
}

if (aiInput) {
  aiInput.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      askAssistant()
    }
  })
}

sideLinks.forEach(link => {
  link.addEventListener("click", async event => {
    const href = String(link.getAttribute("href") || "")
    if (href.startsWith("#") || href === "") {
      event.preventDefault()
      sideLinks.forEach(item => item.classList.remove("active"))
      link.classList.add("active")

      const label = String(link.textContent || "").trim().toLowerCase()
      if (["home", "shorts", "subscriptions", "history", "liked videos"].includes(label)) {
        currentView = label
        currentCategory = "all"
        currentChip = "all"
        if (sidebarCategory) sidebarCategory.value = "all"
        chipButtons.forEach(chip => chip.classList.remove("active"))
        if (chipButtons[0]) chipButtons[0].classList.add("active")

        if (label === "liked videos") {
          await refreshLikedVideoIds()
        }

        setManualRecoContext()
        applyFilters()

        if (label === "shorts") {
          const shortsBlock = document.querySelector(".shorts-section")
          shortsBlock?.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }
      return
    }
  })
})

loadVideos()
renderMiniPlayer()
const liveChannels = [
{
name:"News Live",
logo:"https://img.icons8.com/color/96/news.png",
url:"/watch.html?channel=news"
},
{
name:"Sports Live",
logo:"https://img.icons8.com/color/96/trophy.png",
url:"/watch.html?channel=sports"
},
{
name:"Music Live",
logo:"https://img.icons8.com/color/96/musical-notes.png",
url:"/watch.html?channel=music"
},
{
name:"Movie Channel",
logo:"https://img.icons8.com/color/96/movie.png",
url:"/watch.html?channel=movies"
}
];

const channelContainer = document.getElementById("channels");

if(channelContainer){
liveChannels.forEach(channel=>{
channelContainer.innerHTML += `
<div class="channel-card">
<img src="${channel.logo}">
<h3>${channel.name}</h3>
<a href="${channel.url}">Watch</a>
</div>
`;
});
}

async function loadTrendingVideos(){

const container = document.getElementById("trendingVideos")

if(!container) return

const res = await fetch("/api/videos/trending")
const videos = await res.json()

videos.forEach(video=>{

container.innerHTML += `
<div class="video-card">
<img src="${video.thumbnailUrl}">
<h3>${video.title}</h3>
<a href="/watch.html?id=${video.id}">Watch</a>
</div>
`

})

}

loadTrendingVideos()

async function loadCategoryRows(){

const res = await fetch("/api/videos")
const videos = await res.json()

const moviesRow = document.getElementById("moviesRow")
const musicRow = document.getElementById("musicRow")
const gamingRow = document.getElementById("gamingRow")
const newsRow = document.getElementById("newsRow")

videos.forEach(video=>{

const card = `
<div class="video-card">
<img src="${video.thumbnailUrl}">
<p>${video.title}</p>
<a href="/watch.html?id=${video.id}">Watch</a>
</div>
`

if(video.category==="movies" && moviesRow){
moviesRow.innerHTML += card
}

if(video.category==="music" && musicRow){
musicRow.innerHTML += card
}

if(video.category==="gaming" && gamingRow){
gamingRow.innerHTML += card
}

if(video.category==="news" && newsRow){
newsRow.innerHTML += card
}

})

}

loadCategoryRows()

async function loadLiveChannels(){

const container = document.getElementById("channels")

if(!container) return

const res = await fetch("/api/live-tv")
const channels = await res.json()

channels.slice(0,12).forEach(ch=>{

container.innerHTML += `
<div class="channel-card">
<img src="${ch.logo || 'https://via.placeholder.com/200'}">
<h3>${ch.name}</h3>
<a href="/live.html?id=${ch.id}">Watch Live</a>
</div>
`

})

}

loadLiveChannels()

async function loadHomepage(){

const res = await fetch("/api/videos")

const videos = await res.json()

const trending = document.getElementById("trendingVideos")
const movies = document.getElementById("moviesRow")
const music = document.getElementById("musicRow")

if(!videos) return

videos.forEach(v=>{

const card = `
<div class="card">

<img src="${v.thumbnailUrl || v.thumbnail || ''}">

<h4>${v.title}</h4>

<a href="/watch.html?id=${v.id}">Watch</a>

</div>
`

if(v.category==="movies" && movies){
movies.innerHTML += card
}

if(v.category==="music" && music){
music.innerHTML += card
}

if(trending && trending.children.length < 10){
trending.innerHTML += card
}

})

}

loadHomepage()


async function loadHomepage(){

const res = await fetch("/api/videos")

const videos = await res.json()

const trending = document.getElementById("trendingVideos")
const movies = document.getElementById("moviesRow")
const music = document.getElementById("musicRow")

videos.forEach(v=>{

const card = `
<div class="card">

<img src="${v.thumbnailUrl || v.thumbnail}">

<h4>${v.title}</h4>

</div>
`

if(trending && trending.children.length < 8){
trending.innerHTML += card
}

if(v.category==="movies" && movies){
movies.innerHTML += card
}

if(v.category==="music" && music){
music.innerHTML += card
}

})

}

loadHomepage()







