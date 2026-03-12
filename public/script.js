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

async function loadHomepage(){

try{

const res = await fetch("/api/videos")
const videos = await res.json()

const trending = document.getElementById("trendingVideos")
const movies = document.getElementById("moviesRow")
const music = document.getElementById("musicRow")

if(!Array.isArray(videos)) return

videos.forEach(v => {

const card = `
<div class="card">

<img src="${v.thumbnailUrl || v.thumbnail || ''}">

<h4>${v.title}</h4>

<a class="watch-btn" href="/watch.html?id=${v.id || v._id}&fs=1">Watch</a>

</div>
`

if(trending && trending.children.length < 8){
trending.innerHTML += card
}

const heroRow = document.getElementById("heroRow")
if(heroRow && heroRow.children.length < 6){
  heroRow.innerHTML += card
}

if(v.category === "movies" && movies){
movies.innerHTML += card
}

if(v.category === "music" && music){
music.innerHTML += card
}

})

}catch(err){

console.error("Homepage error:",err)

}

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

setupRowButtons()

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
























