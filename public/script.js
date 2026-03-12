async function revealAdminLink() {
  const adminLink = document.getElementById("adminLink")
  if (!adminLink) return
  try {
    const res = await fetch("/api/me")
    const data = await res.json().catch(() => ({}))
    if (res.ok && data && data.isAdmin) {
      adminLink.classList.remove("hidden")
    }
  } catch {
    // ignore
  }
}

// ===== NOVAPLAY HOMEPAGE LOADER =====

function normalizeCategory(category, title) {
  const raw = String(category || title || '').trim().toLowerCase()
  if (!raw) return 'all'
  if (raw.includes('movie') || raw.includes('film') || raw.includes('cinema') || raw.includes('bollywood') || raw.includes('hollywood') || raw.includes('trailer')) return 'movies'
  if (raw.includes('music') || raw.includes('song') || raw.includes('album') || raw.includes('bhajan')) return 'music'
  if (raw.includes('news') || raw.includes('politic') || raw.includes('headlines')) return 'news'
  if (raw.includes('sport') || raw.includes('cricket') || raw.includes('football') || raw.includes('ipl')) return 'sports'
  if (raw.includes('game') || raw.includes('gaming') || raw.includes('esports')) return 'gaming'
  if (raw.includes('tech') || raw.includes('ai') || raw.includes('code') || raw.includes('program')) return 'technology'
  if (raw.includes('education') || raw.includes('tutorial') || raw.includes('course') || raw.includes('lecture')) return 'education'
  if (raw.includes('travel') || raw.includes('nature') || raw.includes('vlog')) return 'travel'
  return raw
}

function createVideoCard(video){
  const lang = video.language ? String(video.language).toLowerCase() : ''
  const country = video.country ? String(video.country).toUpperCase() : ''
  const category = normalizeCategory(video.category, video.title)
  return `
  <div class="card" data-videoid="${video.id || video._id || ''}" data-title="${video.title || ''}" data-thumbnail="${video.thumbnailUrl || video.thumbnail || 'https://via.placeholder.com/320x180?text=No+Image'}" data-category="${category}" data-language="${lang}" data-country="${country}">
    <img src="${video.thumbnailUrl || video.thumbnail || 'https://via.placeholder.com/320x180?text=No+Image'}" alt="${video.title}">
    <h4>${video.title}</h4>
    <a class="watch-btn" href="/watch.html?id=${video.id || video._id || ''}&fs=1">Watch</a>
  </div>
  `
}

function renderCategoryMovies(categoryKey='all'){
  const categoryTitle = document.getElementById('categoryTitle')
  const categoryMovies = document.getElementById('categoryMovies')
  if(!categoryTitle || !categoryMovies) return

  const normalized = String(categoryKey || 'all').toLowerCase()

  categoryTitle.textContent = `Category: ${normalized === 'all' ? 'All' : normalized.charAt(0).toUpperCase() + normalized.slice(1)}`

  const data = window.movieCategoriesData || {}
  const moviesData = normalized === 'all' ? Object.values(data).flat() : (data[normalized] || [])

  categoryMovies.innerHTML = ''
  if (!moviesData.length) {
    categoryMovies.innerHTML = `<div class="empty-row">No videos found for ${categoryKey}</div>`
  } else {
    moviesData.slice(0, 20).forEach(video => {
      categoryMovies.innerHTML += createVideoCard(video)
    })
  }

  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'))
  document.getElementById('categorySection').classList.remove('hidden')
}

function showCategoryByKey(key){
  const sections = {
    home: [],
    movies: ['categorySection'],
    music: ['categorySection'],
    categories: ['categorySection'],
    all: ['categorySection']
  }

  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'))

  if (key === 'home') {
    document.getElementById('trendingSection').classList.add('hidden')
    return
  }

  if (key === 'movies' || key === 'music' || key === 'categories' || key === 'all') {
    renderCategoryMovies(key === 'categories' ? 'all' : key)
  }
}

function setNavActive(id){
  document.querySelectorAll('.main-nav a').forEach(a => a.classList.remove('active'))
  const el = document.getElementById(id)
  if (el) el.classList.add('active')
}

function initSidebarAnchorActions(){
  const searchInput = document.getElementById('search')
  document.querySelectorAll('.sidebar a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', event => {
      event.preventDefault()
      const target = anchor.getAttribute('href')
      if (target === '#top') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (target === '#searchSection' && searchInput) {
        searchInput.focus({ preventScroll:true })
      } else {
        const el = document.querySelector(target)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    })
  })
}

function setupHomepageNav(){
  const options = [
    {id:'navHome', key:'home'},
    {id:'navMovies', key:'movies'},
    {id:'navMusic', key:'music'},
    {id:'navCategories', key:'all'}
  ]
  options.forEach(item => {
    const el = document.getElementById(item.id)
    if(!el) return
    el.addEventListener('click', e=>{
      e.preventDefault()
      setNavActive(item.id)
      if(item.key==='home'){
        document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'))
        return
      }
      showCategoryByKey(item.key)
    })
  })
}
async function rotateHeroBackground(){
  const hero = document.querySelector('.hero')
  if(!hero) return
  const heroImages = [
    'https://images.unsplash.com/photo-1517605196450-3ac39f5e6d5d?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1542206395-9feb3edaa68f?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1517602302552-471fe67acf66?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1502920917128-1aa500764b2b?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1511765224389-37f0e77cf0eb?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1497032205916-ac775f0649ae?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=1600&q=80',
    'https://images.unsplash.com/photo-1485564389323-8bdfa0c8b4f9?auto=format&fit=crop&w=1600&q=80'
  ]

  let currentIndex = 0
  const setSlide = () => {
    const imageURL = heroImages[currentIndex]
    hero.style.backgroundImage = `linear-gradient(145deg, rgba(14, 23, 48, 0.48), rgba(5, 10, 24, 0.75)), url('${imageURL}')`
    currentIndex = (currentIndex + 1) % heroImages.length
  }

  setSlide()
  window.setInterval(setSlide, 5000)
}

function isYouTubeStyleId(value){ return /^[A-Za-z0-9_-]{11}$/.test(String(value || "")) }

function createMiniPoster(container, video){
  const poster = document.createElement("div")
  poster.className = "mini-poster"
  const thumb = video.thumbnailUrl || video.thumbnail || ""
  if (thumb) poster.style.backgroundImage = `url('${thumb}')`
  container.appendChild(poster)
}

function renderMiniPlayerVideo(container, video){
  container.innerHTML = ""
  const videoId = String(video.videoId || "").trim()
  if (isYouTubeStyleId(videoId)) {
    const iframe = document.createElement("iframe")
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}`
    iframe.setAttribute("allow", "autoplay; fullscreen")
    iframe.allowFullscreen = true
    container.appendChild(iframe)
    return true
  }

  const playback = String(video.playbackUrl || "").trim()
  if (playback && /\.(mp4|webm|ogg|m4v)(\?.*)?$/i.test(playback)) {
    const vid = document.createElement("video")
    vid.muted = true
    vid.autoplay = true
    vid.loop = true
    vid.playsInline = true
    vid.src = playback
    vid.addEventListener("error", () => {
      container.innerHTML = ""
      createMiniPoster(container, video)
    })
    container.appendChild(vid)
    return true
  }

  createMiniPoster(container, video)
  return false
}

function setupMiniPlayer(videos){
  const container = document.getElementById("miniPlayer")
  const titleEl = document.getElementById("miniTitle")
  const playBtn = document.getElementById("miniPlayBtn")
  if (!container || !Array.isArray(videos) || videos.length === 0) return

  const pool = videos.filter(v => v && (v.videoId || v.playbackUrl || v.thumbnailUrl || v.thumbnail))
  if (!pool.length) return

  let index = Math.floor(Math.random() * pool.length)
  const render = () => {
    const video = pool[index % pool.length]
    const id = String(video.id || video._id || "").trim()
    if (titleEl) titleEl.textContent = video.title || "Now Playing"
    if (playBtn) playBtn.href = id ? `/watch.html?id=${encodeURIComponent(id)}&fs=1` : "#"
    renderMiniPlayerVideo(container, video)
    index = (index + 1) % pool.length
  }

  render()
  window.setInterval(render, 12000)
}

function renderBackdropWall(videos){
  const wall = document.getElementById("wallGrid")
  if (!wall || !Array.isArray(videos)) return
  wall.innerHTML = ""
  const picks = videos.filter(v => v && (v.thumbnailUrl || v.thumbnail)).slice(0, 15)
  picks.forEach(video => {
    const id = String(video.id || video._id || "").trim()
    const tile = document.createElement("div")
    tile.className = "wall-tile"
    const thumb = video.thumbnailUrl || video.thumbnail || ""
    if (thumb) tile.style.backgroundImage = `url('${thumb}')`
    tile.title = video.title || "Open"
    if (id) {
      tile.addEventListener("click", () => {
        location.href = `/watch.html?id=${encodeURIComponent(id)}&fs=1`
      })
    }
    wall.appendChild(tile)
  })
}

async function loadHomepage(){
  try{
    rotateHeroBackground()
    const res = await fetch('/api/videos')
    if (res.status === 401) {
      const categoryMovies = document.getElementById('categoryMovies')
      const trending = document.getElementById('trendingVideos')
      if (categoryMovies) categoryMovies.innerHTML = '<div class="empty-row">Login to see personalized content</div>'
      if (trending) trending.innerHTML = '<div class="empty-row">Login to see trending videos</div>'
      return
    }
    const videos = await res.json()

    const trending = document.getElementById('trendingVideos')
    const movies = document.getElementById('moviesRow')
    const music = document.getElementById('musicRow')
    const heroRow = document.getElementById('heroRow')
    const categoryFilters = document.getElementById('categoryFilters')

    if(!Array.isArray(videos)) return

    window.movieCategoriesData = {}

    videos.forEach(v => {
      const cardHtml = createVideoCard(v)

      if(trending && trending.children.length < 8){
        trending.innerHTML += cardHtml
      }

      if(heroRow && heroRow.children.length < 6){
        heroRow.innerHTML += cardHtml
      }

      const categoryKey = normalizeCategory(v.category, v.title)

      if(categoryKey === 'movies' && movies){
        movies.innerHTML += cardHtml
      }

      if(categoryKey === 'music' && music){
        music.innerHTML += cardHtml
      }

      if(categoryKey === 'news' && false){
        // optional row for news in future
      }

      if(categoryKey === 'live' && false){
        // optional row for live in future
      }

      if(!window.movieCategoriesData[categoryKey]) window.movieCategoriesData[categoryKey] = []
      window.movieCategoriesData[categoryKey].push(v)
    })

    const allCats = new Set(['all'])
    videos.forEach(v => {
      if(v.category) allCats.add(String(v.category).toLowerCase())
    })

    if(categoryFilters){
      categoryFilters.innerHTML = ''
      Array.from(allCats).forEach(cat => {
        const btn = document.createElement('button')
        btn.className = `filter-chip ${cat === 'all' ? 'active' : ''}`
        btn.textContent = cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)
        btn.addEventListener('click', () => {
          document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'))
          btn.classList.add('active')
          renderCategoryMovies(cat)
        })
        categoryFilters.appendChild(btn)
      })
    }

    setupMiniPlayer(videos)
    renderBackdropWall(videos)
    renderCategoryMovies('all')
    renderLanguageCountryChips(videos)
    renderContinueWatching()
    initSidebarAnchorActions()
    setupHomepageNav()
    // by default hide category section until user selects category
    document.getElementById('categorySection')?.classList.add('hidden')
    document.getElementById('trendingSection')?.classList.add('hidden')
    document.getElementById('continueSection')?.classList.add('hidden')
    document.getElementById('musicSection')?.classList.add('hidden')
  }catch(err){
    console.error('Homepage error:',err)
  }
}

function renderLanguageCountryChips(videos){
  const langEl = document.getElementById('langChips')
  const countryEl = document.getElementById('countryChips')
  if(!langEl || !countryEl) return

  const langs = new Set(['all'])
  const countries = new Set(['all'])

  videos.forEach(v => {
    if(v.language) langs.add(String(v.language).toLowerCase())
    if(v.country) countries.add(String(v.country).toUpperCase())
  })

  const renderChip = (value, container, activeClass) => {
    const btn = document.createElement('button')
    btn.className = `filter-chip ${activeClass ? 'active' : ''}`
    btn.textContent = value === 'all' ? 'All' : value
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(el => el.classList.remove('active'))
      btn.classList.add('active')
      if(container === langEl) filterByLanguage(value)
      else filterByCountry(value)
    })
    return btn
  }

  langEl.innerHTML = ''
  Array.from(langs).sort().forEach((lang, idx) => {
    langEl.appendChild(renderChip(lang, langEl, idx === 0))
  })

  countryEl.innerHTML = ''
  Array.from(countries).sort().forEach((country, idx) => {
    countryEl.appendChild(renderChip(country, countryEl, idx === 0))
  })
}

function filterByLanguage(lang) {
  const norm = String(lang || 'all').toLowerCase()
  if(norm==='all') return renderCategoryMovies(document.querySelector('.filter-chip.active')?.textContent?.toLowerCase()||'all')
  const data = window.movieCategoriesData || {}
  const all = Object.values(data).flat().filter(v => (v.language||'').toLowerCase()===norm)
  const categoryMovies = document.getElementById('categoryMovies')
  if(!categoryMovies) return
  categoryMovies.innerHTML = ''
  all.slice(0,20).forEach(v=>categoryMovies.innerHTML += createVideoCard(v))
}

function filterByCountry(country) {
  const norm = String(country || 'all').toUpperCase()
  if(norm==='ALL') return renderCategoryMovies(document.querySelector('.filter-chip.active')?.textContent?.toLowerCase()||'all')
  const data = window.movieCategoriesData || {}
  const all = Object.values(data).flat().filter(v => (v.country||'').toUpperCase()===norm)
  const categoryMovies = document.getElementById('categoryMovies')
  if(!categoryMovies) return
  categoryMovies.innerHTML = ''
  all.slice(0,20).forEach(v=>categoryMovies.innerHTML += createVideoCard(v))
}

function getContinueWatching(){
  try{
    const raw = localStorage.getItem('novaplay_continue_watching')
    const arr = raw ? JSON.parse(raw):[]
    return Array.isArray(arr)?arr:[]
  }catch{return []}
}

function setContinueWatching(item){
  if(!item||!item.id)return
  const list = getContinueWatching().filter(i=>i.id!==item.id)
  list.unshift(item)
  if(list.length>8) list.splice(8)
  localStorage.setItem('novaplay_continue_watching',JSON.stringify(list))
  renderContinueWatching()
}

function renderContinueWatching(){
  const continueRow = document.getElementById('continueRow')
  if(!continueRow) return
  const list = getContinueWatching()
  continueRow.innerHTML = ''
  if(!list.length){
    continueRow.innerHTML = '<div class="empty-row">No recently watched videos yet</div>'
    return
  }
  list.forEach(item=>{
    continueRow.innerHTML += `
      <div class="card">
        <img src="${item.thumbnail||'https://via.placeholder.com/320x180?text=No+Image'}" alt="${item.title}">
        <h4>${item.title}</h4>
        <a class="watch-btn" href="/watch.html?id=${item.id}&fs=1">Continue</a>
      </div>
    `
  })
}




// ===== LIVE CHANNELS =====

async function loadLiveChannels(){

try{

const container = document.getElementById("channels")

if(!container) return

const res = await fetch("/api/live-tv")
const channels = await res.json()

channels.slice(0,12).forEach(ch=>{

container.innerHTML += `
<div class="card">
<img src="${ch.logo || 'https://via.placeholder.com/200'}">
<h4>${ch.name}</h4>
<a class="watch-btn" href="/live.html?id=${ch.id}">Watch Live</a>
</div>
`

})

}catch(e){

console.log("Live channel error",e)

}

}



// ===== AUTO SCROLL =====
function autoScrollRows(){

const rows=document.querySelectorAll(".row-scroll")

rows.forEach(row=>{

let scrollAmount=0

setInterval(()=>{

row.scrollLeft+=1
scrollAmount++

if(scrollAmount>row.scrollWidth){
scrollAmount=0
row.scrollLeft=0
}

},30)

row.addEventListener('wheel', e => {
  e.preventDefault()
  row.scrollLeft += e.deltaY > 0 ? 130 : -130
})

})

}

function enableRowButtons(){
  document.querySelectorAll('.row-wrapper').forEach(wrapper => {
    const row = wrapper.querySelector('.row-scroll')
    const prev = wrapper.querySelector('.row-btn.prev')
    const next = wrapper.querySelector('.row-btn.next')
    if(!row) return
    if(prev) prev.addEventListener('click', () => row.scrollBy({ left: -320, behavior: 'smooth'}))
    if(next) next.addEventListener('click', () => row.scrollBy({ left: 320, behavior: 'smooth'}))
  })
}


// ===== RUN =====

function formatLocalDateTime() {
  const now = new Date()
  const locale = navigator.language || "en-US"
  const options = {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short"
  }
  return new Intl.DateTimeFormat(locale, options).format(now)
}

function updateLocalDateTime() {
  const el = document.getElementById("localDateTime")
  if (!el) return
  el.textContent = formatLocalDateTime()
}

document.addEventListener("DOMContentLoaded", () => {

loadHomepage()
loadLiveChannels()

revealAdminLink()

enableRowButtons()

updateLocalDateTime()
setInterval(updateLocalDateTime, 1000)

})

function setupRowButtons(){

document.querySelectorAll(".row-wrapper").forEach(wrapper => {

const row = wrapper.querySelector(".row-scroll")
const next = wrapper.querySelector(".next")
const prev = wrapper.querySelector(".prev")

if(!row) return

if(next) next.addEventListener("click", () => {

row.scrollBy({
left: 350,
behavior: "smooth"
})

})

if(prev) prev.addEventListener("click", () => {

row.scrollBy({
left: -350,
behavior: "smooth"
})

})

})

}






























