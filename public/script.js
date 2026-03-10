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

<a href="/watch.html?id=${v._id || v.id}">Watch</a>

</div>
`

if(trending && trending.children.length < 8){
trending.innerHTML += card
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
<div class="channel-card">
<img src="${ch.logo || 'https://via.placeholder.com/200'}">
<h3>${ch.name}</h3>
<a href="/live.html?id=${ch.id}">Watch Live</a>
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

autoScrollRows()



// ===== RUN =====

loadHomepage()
loadLiveChannels()

setTimeout(()=>{
autoScrollRows()
},1000)


document.querySelectorAll(".row").forEach(section=>{

const row=section.querySelector(".row-scroll")
const next=section.querySelector(".next")
const prev=section.querySelector(".prev")

if(!row) return

next?.addEventListener("click",()=>{
row.scrollBy({left:300,behavior:"smooth"})
})

prev?.addEventListener("click",()=>{
row.scrollBy({left:-300,behavior:"smooth"})
})

})











