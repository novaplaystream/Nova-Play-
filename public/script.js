function revealAdminLink() {
  const adminLink = document.getElementById("adminLink")
  if (!adminLink) return
  try {
    fetch("/api/me")
      .then(res => res.json().catch(() => ({})))
      .then(data => {
        if (data && data.isAdmin) adminLink.classList.remove("hidden")
      })
      .catch(() => undefined)
  } catch {
    // ignore
  }
}

function setupTopNavActive() {
  const links = document.querySelectorAll(".ott-top-nav a")
  links.forEach(link => {
    link.addEventListener("click", () => {
      links.forEach(l => l.classList.remove("active"))
      link.classList.add("active")
    })
  })
}

function getThumb(video) {
  if (!video) return ""
  if (video.thumbnailUrl) return video.thumbnailUrl
  if (video.thumbnail) return video.thumbnail
  if (video.videoId) return `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
  return ""
}

async function fetchTrendingList() {
  try {
    const res = await fetch("/api/videos/trending")
    if (res.ok) {
      const data = await res.json().catch(() => [])
      if (Array.isArray(data) && data.length) return data
    }
  } catch {
    // ignore
  }
  try {
    const res = await fetch("/api/videos")
    if (res.ok) {
      const data = await res.json().catch(() => [])
      if (Array.isArray(data)) return data
    }
  } catch {
    // ignore
  }
  return []
}

async function loadTrendingBoxes() {
  const boxes = Array.from(document.querySelectorAll(".trend-box"))
  if (!boxes.length) return
  const list = await fetchTrendingList()
  boxes.forEach((box, idx) => {
    const video = list[idx]
    const titleEl = box.querySelector(".trend-title")
    const thumbEl = box.querySelector(".trend-thumb")
    if (!video) {
      if (titleEl) titleEl.textContent = "Trending update coming soon"
      return
    }
    const title = video.title || "NovaPlay Trending"
    const thumb = getThumb(video)
    const id = String(video.id || video._id || "").trim()
    if (titleEl) titleEl.textContent = title
    if (thumbEl && thumb) thumbEl.style.backgroundImage = `url('${thumb}')`
    if (id) {
      box.style.cursor = "pointer"
      box.addEventListener("click", () => {
        location.href = `/watch.html?id=${encodeURIComponent(id)}&fs=1`
      })
    }
  })
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "home") {
    setupTopNavActive()
    loadTrendingBoxes()
  }
  revealAdminLink()
})
