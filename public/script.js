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

const authState = {
  checked: false,
  isLoggedIn: false
}

async function fetchAuthState() {
  try {
    const res = await fetch("/api/me")
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      authState.isLoggedIn = Boolean(data && data.email)
    } else {
      authState.isLoggedIn = false
    }
  } catch {
    authState.isLoggedIn = false
  }
  authState.checked = true
  return authState.isLoggedIn
}

function buildLoginRedirect(target) {
  const safeTarget = target && String(target).startsWith("/") ? target : "/"
  return `/login.html?redirect=${encodeURIComponent(safeTarget)}`
}

function redirectToLogin(target) {
  location.href = buildLoginRedirect(target)
}

function attachLoginGate(el, target) {
  if (!el) return
  if (el.dataset.loginGateBound) return
  el.dataset.loginGateBound = "1"
  el.classList.toggle("login-gated", !authState.isLoggedIn)
  el.addEventListener(
    "click",
    event => {
      if (authState.isLoggedIn) return
      event.preventDefault()
      event.stopPropagation()
      redirectToLogin(target)
    },
    true
  )
}

function applyAuthStateToPage() {
  document.body.classList.toggle("auth-locked", !authState.isLoggedIn)

  const searchInput = document.getElementById("search")
  const searchBtn = document.getElementById("btnSearch")
  if (searchInput) {
    searchInput.disabled = !authState.isLoggedIn
    if (!authState.isLoggedIn) {
      searchInput.placeholder = "Login to search..."
    }
  }
  if (searchBtn) searchBtn.disabled = !authState.isLoggedIn

  const gatedLinks = Array.from(document.querySelectorAll(".ott-top-nav a, .side-nav a, .footer-links a"))
  gatedLinks.forEach(link => {
    const href = link.getAttribute("href") || ""
    if (href === "/login.html") return
    if (link.classList.contains("side-login")) return
    link.setAttribute("aria-disabled", authState.isLoggedIn ? "false" : "true")
    attachLoginGate(link, href.startsWith("/") ? href : "/")
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
      const watchTarget = `/watch.html?id=${encodeURIComponent(id)}&fs=1`
      box.style.cursor = "pointer"
      box.addEventListener("click", () => {
        if (!authState.isLoggedIn) {
          redirectToLogin(watchTarget)
          return
        }
        location.href = watchTarget
      })
      attachLoginGate(box, watchTarget)
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
  meta.textContent = [category, language].filter(Boolean).join(" � ")

  const action = document.createElement("button")
  action.className = "video-btn"
  action.type = "button"
  action.textContent = "Watch"

  const id = String(video.id || video._id || "").trim()
  if (id) {
    const watchTarget = `/watch.html?id=${encodeURIComponent(id)}`
    card.addEventListener(
      "click",
      event => {
        if (!authState.isLoggedIn) {
          event.preventDefault()
          event.stopPropagation()
          redirectToLogin(watchTarget)
          return
        }
        location.href = watchTarget
      },
      true
    )
    action.addEventListener("click", event => {
      event.stopPropagation()
      if (!authState.isLoggedIn) {
        redirectToLogin(watchTarget)
        return
      }
      location.href = watchTarget
    })
    if (!authState.isLoggedIn) {
      action.textContent = "Login to Watch"
      card.classList.add("login-gated")
      action.classList.add("login-gated")
    }
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

  const availableVideos = libraryState.partitions?.[filterKey] || libraryState.videos
  const filtered = availableVideos.filter(info.test)
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
  
  // Use partitioned videos for this filter
  if (libraryState.partitions && libraryState.partitions[filterKey]) {
    libraryState.videos = libraryState.partitions[filterKey]
  }
  
  renderLibrary(filterKey)
  if (scrollToLibrary) {
    document.getElementById("library")?.scrollIntoView({ behavior: "smooth" })
  }
}

async function partitionVideos(allVideos) {
  const filters = LIBRARY_FILTERS
  const partitioned = {}
  const categoryVideos = {}
  const used = new Set()

  // Group and shuffle videos by category
  allVideos.forEach(video => {
    const cat = normalizeCategory(video) || 'general'
    if (!categoryVideos[cat]) categoryVideos[cat] = []
    categoryVideos[cat].push(video)
  })

  Object.values(categoryVideos).forEach(group => {
    for (let i = group.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[group[i], group[j]] = [group[j], group[i]]
    }
  })

  // Assign unique videos to each filter (max 6 per filter)
  Object.entries(filters).forEach(([filterKey, filterInfo]) => {
    const available = []
    
    // Prioritize filter-specific videos
    if (filterInfo.test !== LIBRARY_FILTERS.home.test) {
      allVideos.forEach(video => {
        if (!used.has(video.id) && filterInfo.test(video)) {
          available.push(video)
        }
      })
    }
    
    // Fill with general pool if needed
    if (available.length < 6) {
      Object.entries(categoryVideos).forEach(([cat, videos]) => {
        for (const video of videos) {
          if (!used.has(video.id) && available.length < 6) {
            available.push(video)
          }
        }
      })
    }
    
    // Shuffle final selection
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[available[i], available[j]] = [available[j], available[i]]
    }
    
    partitioned[filterKey] = available.slice(0, 6)
    available.slice(0, 6).forEach(video => used.add(video.id))
  })
  
  return partitioned
}

async function loadLibraryVideos() {
  const empty = document.getElementById("libraryEmpty")
  try {
    const res = await fetch("/api/videos")
    if (res.ok) {
      const data = await res.json().catch(() => [])
      if (Array.isArray(data)) {
        const partitioned = await partitionVideos(data)
        libraryState.videos = partitioned[libraryState.activeFilter] || []
        libraryState.partitions = partitioned
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

function syncSidebarNav() {
  // Sync sidebar active state with top nav and URL hash
  const activeFilter = libraryState.activeFilter || 'home';
  const sidebarLinks = document.querySelectorAll('.side-nav a[data-filter]');
  const topNavLinks = document.querySelectorAll('.ott-top-nav a[data-filter]');
  
  sidebarLinks.forEach(link => {
    const filter = link.dataset.filter;
    link.classList.toggle('active', filter === activeFilter);
  });
  
  topNavLinks.forEach(link => {
    const filter = link.dataset.filter;
    link.classList.toggle('active', filter === activeFilter);
  });
}

function setupLibraryNav() {
  const filterLinks = document.querySelectorAll("[data-filter]")
  filterLinks.forEach(link => {
    link.addEventListener("click", event => {
      const filterKey = link.dataset.filter
      if (!filterKey) return
      event.preventDefault()
      setActiveFilter(filterKey, filterKey !== "home")
      syncSidebarNav();
      // Update URL hash without page reload
      history.replaceState(null, null, `#${filterKey === 'home' ? 'top' : 'library'}`);
    })
  })

  // Sidebar specific links (Live TV, Creator Studio)
  const sidebarActionLinks = document.querySelectorAll('.side-nav a:not([data-filter])');
  sidebarActionLinks.forEach(link => {
    link.addEventListener('click', () => {
      // Clear library filter when navigating away
      if (libraryState.activeFilter && libraryState.activeFilter !== 'home') {
        setActiveFilter('home', false);
      }
    });
  });

  const hash = location.hash.replace("#", "")
  if (LIBRARY_FILTERS[hash]) {
    setActiveFilter(hash, true)
  } else {
    setActiveFilter("home", false)
  }
  
  syncSidebarNav();
}

async function initHome() {
  await fetchAuthState()
  applyAuthStateToPage()
  setupLibraryNav()
  loadTrendingBoxes()
  loadLibraryVideos()
}

document.addEventListener("DOMContentLoaded", () => {
  if (document.body.dataset.page === "home") {
    initHome().catch(() => {
      setupLibraryNav()
      loadTrendingBoxes()
      loadLibraryVideos()
    })
  }
  revealAdminLink()
})











