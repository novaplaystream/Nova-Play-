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

function createVideoCard(video){
  const lang = video.language ? String(video.language).toLowerCase() : ''
  const country = video.country ? String(video.country).toUpperCase() : ''
  const category = video.category ? String(video.category).toLowerCase() : 'all'
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
  moviesData.slice(0, 20).forEach(video => {
    categoryMovies.innerHTML += createVideoCard(video)
  })
}

async function loadHomepage(){
  try{
    const res = await fetch('/api/videos')
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

      if(v.category === 'movies' && movies){
        movies.innerHTML += cardHtml
      }

      if(v.category === 'music' && music){
        music.innerHTML += cardHtml
      }

      const categoryKey = String(v.category || 'all').toLowerCase()
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

    renderCategoryMovies('all')
    renderLanguageCountryChips(videos)
    renderContinueWatching()
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
























