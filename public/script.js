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

const LIBRARY_FILTERS = {
  home: {
    label: "All Videos",
    subtitle: "Browse everything available on NovaPlay.",
    mode: "flat",
    test: () => true
  },
  movies: {
    label: "Movies",
    subtitle: "All movies available on NovaPlay.",
    mode: "flat",
    test: video => hasAnyCategory(video, ["movie", "movies", "film", "cinema"])
  },
  music: {
    label: "Music",
    subtitle: "Music videos and performances across genres.",
    mode: "flat",
    test: video => hasAnyCategory(video, ["music", "song", "songs", "audio", "album"])
  },
  webseries: {
    label: "Web Series",
    subtitle: "Series, episodes, and serialized shows.",
    mode: "flat",
    test: video => hasAnyCategory(video, ["web", "series", "show", "shows", "episode"])
  },
  categories: {
    label: "Categories",
    subtitle: "Browse videos category-wise.",
    mode: "group",
    test: () => true
  }
}

const libraryState = {
  videos: [],
  activeFilter: "home"
}

function normalizeCategory(video) {
  return String(video?.category || "").trim().toLowerCase()
}

function hasAnyCategory(video, keys) {
  const category = normalizeCategory(video)
  if (!category) return false
  return keys.some(key => category.includes(key))
}

function setLibraryHeader(filterKey, count) {
  const info = LIBRARY_FILTERS[filterKey] || LIBRARY_FILTERS.home
  const titleEl = document.getElementById("libraryTitle")
  const subtitleEl = document.getElementById("librarySubtitle")
  const countEl = document.getElementById("libraryCount")
  if (titleEl) titleEl.textContent = info.label
  if (subtitleEl) subtitleEl.textContent = info.subtitle
  if (countEl) countEl.textContent = `${count} video${count === 1 ? "" : "s"}`
}

function buildVideoCard(video) {
  const card = document.createElement("div")
  card.className = "video-card"

  const thumb = document.createElement("div")
  thumb.className = "video-thumb"
  const thumbUrl = getThumb(video)
  if (thumbUrl) thumb.style.backgroundImage = `url('${thumbUrl}')`

  const body = document.createElement("div")
  body.className = "video-body"

  const title = document.createElement("h4")
  title.textContent = video.title || "Untitled video"

  const meta = document.createElement("div")
  meta.className = "video-meta"
  const category = normalizeCategory(video) || "general"
  const language = String(video.language || "")
  meta.textContent = [category, language].filter(Boolean).join(" · ")

  const action = document.createElement("button")
  action.className = "video-btn"
  action.type = "button"
  action.textContent = "Watch"

  const id = String(video.id || video._id || "").trim()
  if (id) {
    card.addEventListener("click", () => {
      location.href = `/watch.html?id=${encodeURIComponent(id)}`
    })
    action.addEventListener("click", event => {
      event.stopPropagation()
      location.href = `/watch.html?id=${encodeURIComponent(id)}`
    })
  } else {
    action.disabled = true
    action.textContent = "Unavailable"
  }

  body.appendChild(title)
  body.appendChild(meta)
  body.appendChild(action)
  card.appendChild(thumb)
  card.appendChild(body)
  return card
}

function renderVideoGrid(videos) {
  const grid = document.createElement("div")
  grid.className = "video-grid"
  videos.forEach(video => {
    grid.appendChild(buildVideoCard(video))
  })
  return grid
}

function renderGroupedVideos(videos) {
  const wrapper = document.createElement("div")
  wrapper.className = "category-groups"
  const map = new Map()

  videos.forEach(video => {
    const category = normalizeCategory(video) || "other"
    if (!map.has(category)) map.set(category, [])
    map.get(category).push(video)
  })

  const sorted = Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  sorted.forEach(([category, items]) => {
    const group = document.createElement("section")
    group.className = "category-group"

    const head = document.createElement("div")
    head.className = "category-head"
    const title = document.createElement("h3")
    title.textContent = category.replace(/\b\w/g, s => s.toUpperCase())
    const count = document.createElement("span")
    count.textContent = `${items.length} video${items.length === 1 ? "" : "s"}`
    head.appendChild(title)
    head.appendChild(count)

    group.appendChild(head)
    group.appendChild(renderVideoGrid(items))
    wrapper.appendChild(group)
  })

  return wrapper
}

function renderLibrary(filterKey) {
  const info = LIBRARY_FILTERS[filterKey] || LIBRARY_FILTERS.home
  const content = document.getElementById("libraryContent")
  const empty = document.getElementById("libraryEmpty")
  if (!content) return

  const filtered = libraryState.videos.filter(info.test)
  setLibraryHeader(filterKey, filtered.length)

  content.innerHTML = ""
  if (!filtered.length) {
    if (empty) {
      empty.textContent = "No videos found for this section yet."
      content.appendChild(empty)
    }
    return
  }

  if (info.mode === "group") {
    content.appendChild(renderGroupedVideos(filtered))
  } else {
    content.appendChild(renderVideoGrid(filtered))
  }
}

function setActiveFilter(filterKey, scrollToLibrary) {
  libraryState.activeFilter = filterKey
  const filterLinks = document.querySelectorAll("[data-filter]")
  filterLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.filter === filterKey)
  })
  renderLibrary(filterKey)
  if (scrollToLibrary) {
    document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })
  }
}

async function loadLibraryVideos() {
  const empty = document.getElementById("libraryEmpty")
  try {
    const res = await fetch("/api/videos")
    if (res.ok) {
      const data = await res.json().catch(() => [])
      if (Array.isArray(data)) {
        libraryState.videos = data
      }
    }
  } catch {
    // ignore
  }

  if (!libraryState.videos.length && empty) {
    empty.textContent = "No videos available yet."
  }
  renderLibrary(libraryState.activeFilter)
}

function setupLibraryNav() {
  const filterLinks = document.querySelectorAll("[data-filter]")
  filterLinks.forEach(link => {
    link.addEventListener("click", event => {
      const filterKey = link.dataset.filter
      if (!filterKey) return
      event.preventDefault()
      setActiveFilter(filterKey, filterKey !== "home")
    })
  })

  const hash = location.hash.replace("#", "")
  if (LIBRARY_FILTERS[hash]) {
    setActiveFilter(hash, true)
  } else {
    setActiveFilter("home", false)
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "home") {
    setupLibraryNav()
    loadTrendingBoxes()
    loadLibraryVideos()
  }
  revealAdminLink()
})
