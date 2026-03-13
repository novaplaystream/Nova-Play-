const state = {
  videos: [],
  filtered: [],
  channel: null,
  selectedVideo: null,
  editingVideo: null,
  lastAi: null
}

const creatorTitle = document.getElementById("creatorTitle")
const creatorSubtitle = document.getElementById("creatorSubtitle")
const channelDetails = document.getElementById("channelDetails")
const channelNameInput = document.getElementById("channelName")
const channelDescInput = document.getElementById("channelDesc")
const saveChannelBtn = document.getElementById("saveChannelBtn")
const channelStatus = document.getElementById("channelStatus")
const channelStatusInline = document.getElementById("channelStatusInline")
const publicChannelLink = document.getElementById("publicChannelLink")

const submitVideoBtn = document.getElementById("submitVideoBtn")
const aiSuggestUploadBtn = document.getElementById("aiSuggestUploadBtn")
const videoTitle = document.getElementById("videoTitle")
const videoDescription = document.getElementById("videoDescription")
const videoUrl = document.getElementById("videoUrl")
const videoThumb = document.getElementById("videoThumb")
const videoCategory = document.getElementById("videoCategory")
const videoLanguage = document.getElementById("videoLanguage")
const videoTags = document.getElementById("videoTags")
const videoHashtags = document.getElementById("videoHashtags")
const uploadStatus = document.getElementById("uploadStatus")

const myVideos = document.getElementById("myVideos")
const videoSearch = document.getElementById("videoSearch")
const statusFilter = document.getElementById("statusFilter")
const sortFilter = document.getElementById("sortFilter")
const categoryFilter = document.getElementById("categoryFilter")

const statTotal = document.getElementById("statTotal")
const statPublished = document.getElementById("statPublished")
const statPending = document.getElementById("statPending")
const statViews = document.getElementById("statViews")
const statLikes = document.getElementById("statLikes")
const recentUploads = document.getElementById("recentUploads")
const analyticsCards = document.getElementById("analyticsCards")
const topVideos = document.getElementById("topVideos")

const playerTitle = document.getElementById("playerTitle")
const playerMeta = document.getElementById("playerMeta")
const creatorPlayerStage = document.getElementById("creatorPlayerStage")
const playerPlaylist = document.getElementById("playerPlaylist")
const openFullPlayerBtn = document.getElementById("openFullPlayerBtn")

const aiTitle = document.getElementById("aiTitle")
const aiDescription = document.getElementById("aiDescription")
const aiUrl = document.getElementById("aiUrl")
const aiAnalyzeBtn = document.getElementById("aiAnalyzeBtn")
const aiAnalyzeSelectedBtn = document.getElementById("aiAnalyzeSelectedBtn")
const aiOutput = document.getElementById("aiOutput")
const aiSummary = document.getElementById("aiSummary")
const aiStatus = document.getElementById("aiStatus")
const aiInlineStatus = document.getElementById("aiInlineStatus")
const aiApplyUploadBtn = document.getElementById("aiApplyUploadBtn")
const aiApplySelectedBtn = document.getElementById("aiApplySelectedBtn")
const aiApplyUploadBtn2 = document.getElementById("aiApplyUploadBtn2")
const aiApplySelectedBtn2 = document.getElementById("aiApplySelectedBtn2")

const editDrawer = document.getElementById("editDrawer")
const editTitle = document.getElementById("editTitle")
const editDescription = document.getElementById("editDescription")
const editTags = document.getElementById("editTags")
const editHashtags = document.getElementById("editHashtags")
const editCategory = document.getElementById("editCategory")
const editLanguage = document.getElementById("editLanguage")
const editThumb = document.getElementById("editThumb")
const editSaveBtn = document.getElementById("editSaveBtn")
const editAiBtn = document.getElementById("editAiBtn")
const editCloseBtn = document.getElementById("editCloseBtn")
const editStatus = document.getElementById("editStatus")

const newUploadBtn = document.getElementById("newUploadBtn")
const openContentBtn = document.getElementById("openContentBtn")
const openPlayerBtn = document.getElementById("openPlayerBtn")
const openAiBtn = document.getElementById("openAiBtn")
const editChannelBtn = document.getElementById("editChannelBtn")

const navButtons = Array.from(document.querySelectorAll(".creator-nav button"))
const sections = new Map(Array.from(document.querySelectorAll(".creator-section")).map(section => [section.id.replace("section-", ""), section]))

const numberFormat = new Intl.NumberFormat()

function setStatus(el, msg, isError) {
  if (!el) return
  el.textContent = msg || ""
  el.classList.toggle("error", Boolean(isError))
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.error || "Request failed")
  }
  return data
}

function formatNumber(value) {
  return numberFormat.format(Number(value) || 0)
}

function getStatus(video) {
  if (video.rejected) return "rejected"
  if (!video.approved) return "pending"
  return "approved"
}

function getThumbnail(video) {
  if (video.thumbnailUrl) return video.thumbnailUrl
  if (video.videoId) return `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
  return ""
}

function showSection(key) {
  sections.forEach((section, name) => {
    section.classList.toggle("active", name === key)
  })
  navButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.section === key)
  })
}

function applyFilters() {
  const q = videoSearch.value.trim().toLowerCase()
  const status = statusFilter.value
  const category = categoryFilter.value
  const sort = sortFilter.value

  let list = [...state.videos]
  if (q) {
    list = list.filter(video => {
      const hay = `${video.title || ""} ${video.category || ""} ${video.language || ""}`.toLowerCase()
      return hay.includes(q)
    })
  }
  if (status !== "all") {
    list = list.filter(video => getStatus(video) === status)
  }
  if (category !== "all") {
    list = list.filter(video => String(video.category || "general").toLowerCase() === category)
  }

  if (sort === "views") {
    list.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0))
  } else if (sort === "likes") {
    list.sort((a, b) => (Number(b.likes) || 0) - (Number(a.likes) || 0))
  } else {
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }

  state.filtered = list
  renderVideos(list)
}

function renderStatusPill(status) {
  const span = document.createElement("span")
  span.className = "status-pill"
  if (status === "approved") span.classList.add("status-approved")
  if (status === "pending") span.classList.add("status-pending")
  if (status === "rejected") span.classList.add("status-rejected")
  span.textContent = status
  return span
}

function renderVideos(list) {
  myVideos.innerHTML = ""
  if (!Array.isArray(list) || list.length === 0) {
    myVideos.innerHTML = "<div class='muted'>No videos found.</div>"
    return
  }

  const header = document.createElement("div")
  header.className = "creator-row header"
  header.innerHTML = "<div></div><div>Title</div><div>Status</div><div>Visibility</div><div>Views</div><div>Likes</div><div>Actions</div>"
  myVideos.appendChild(header)

  list.forEach(video => {
    const row = document.createElement("div")
    row.className = "creator-row"

    const thumb = document.createElement("div")
    thumb.className = "creator-thumb"
    const thumbUrl = getThumbnail(video)
    if (thumbUrl) {
      thumb.style.backgroundImage = `url('${thumbUrl}')`
    }

    const titleCell = document.createElement("div")
    titleCell.className = "creator-cell"
    const title = document.createElement("div")
    title.className = "creator-title"
    title.textContent = video.title || "Untitled"
    const meta = document.createElement("div")
    meta.className = "creator-meta"
    meta.textContent = [video.category, video.language].filter(Boolean).join(" • ")
    titleCell.appendChild(title)
    titleCell.appendChild(meta)

    const statusCell = document.createElement("div")
    statusCell.className = "creator-cell status"
    statusCell.appendChild(renderStatusPill(getStatus(video)))

    const visibilityCell = document.createElement("div")
    visibilityCell.className = "creator-cell visibility"
    visibilityCell.textContent = getStatusLabel(video)

    const viewsCell = document.createElement("div")
    viewsCell.className = "creator-cell views"
    viewsCell.textContent = formatNumber(video.views)

    const likesCell = document.createElement("div")
    likesCell.className = "creator-cell likes"
    likesCell.textContent = formatNumber(video.likes)

    const actionsCell = document.createElement("div")
    actionsCell.className = "creator-cell actions"
    const playBtn = document.createElement("button")
    playBtn.className = "mini-btn primary"
    playBtn.textContent = "Play"
    playBtn.addEventListener("click", () => {
      selectVideo(video)
      showSection("player")
    })
    const editBtn = document.createElement("button")
    editBtn.className = "mini-btn"
    editBtn.textContent = "Edit"
    editBtn.addEventListener("click", () => openEditDrawer(video))
    const openBtn = document.createElement("button")
    openBtn.className = "mini-btn"
    openBtn.textContent = "Open"
    openBtn.addEventListener("click", () => {
      const vid = String(video.id || video._id || "").trim()
      if (vid) window.open(`/watch.html?id=${encodeURIComponent(vid)}`, "_blank")
    })
    actionsCell.appendChild(playBtn)
    actionsCell.appendChild(editBtn)
    actionsCell.appendChild(openBtn)

    row.appendChild(thumb)
    row.appendChild(titleCell)
    row.appendChild(statusCell)
    row.appendChild(visibilityCell)
    row.appendChild(viewsCell)
    row.appendChild(likesCell)
    row.appendChild(actionsCell)
    myVideos.appendChild(row)
  })
}

function getStatusLabel(video) {
  const status = getStatus(video)
  if (status === "approved") return "Published"
  if (status === "rejected") return "Rejected"
  return "Unpublished"
}

function updateStats() {
  const total = state.videos.length
  const published = state.videos.filter(v => getStatus(v) === "approved").length
  const pending = state.videos.filter(v => getStatus(v) === "pending").length
  const views = state.videos.reduce((sum, v) => sum + (Number(v.views) || 0), 0)
  const likes = state.videos.reduce((sum, v) => sum + (Number(v.likes) || 0), 0)

  statTotal.textContent = formatNumber(total)
  statPublished.textContent = formatNumber(published)
  statPending.textContent = formatNumber(pending)
  statViews.textContent = formatNumber(views)
  statLikes.textContent = formatNumber(likes)
}

function renderRecentUploads() {
  if (!state.videos.length) {
    recentUploads.innerHTML = "<div class='muted'>No uploads yet.</div>"
    return
  }
  const sorted = [...state.videos].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5)
  recentUploads.innerHTML = ""
  sorted.forEach(video => {
    const item = document.createElement("div")
    item.style.display = "flex"
    item.style.justifyContent = "space-between"
    item.style.alignItems = "center"
    item.style.padding = "8px 0"
    const title = document.createElement("div")
    title.textContent = video.title || "Untitled"
    const status = renderStatusPill(getStatus(video))
    item.appendChild(title)
    item.appendChild(status)
    recentUploads.appendChild(item)
  })
}

function renderAnalytics() {
  analyticsCards.innerHTML = ""
  const totalViews = state.videos.reduce((sum, v) => sum + (Number(v.views) || 0), 0)
  const totalLikes = state.videos.reduce((sum, v) => sum + (Number(v.likes) || 0), 0)
  const avgViews = state.videos.length ? Math.round(totalViews / state.videos.length) : 0
  const avgLikes = state.videos.length ? Math.round(totalLikes / state.videos.length) : 0

  const metrics = [
    { label: "Total Views", value: formatNumber(totalViews) },
    { label: "Total Likes", value: formatNumber(totalLikes) },
    { label: "Avg Views", value: formatNumber(avgViews) },
    { label: "Avg Likes", value: formatNumber(avgLikes) }
  ]
  metrics.forEach(metric => {
    const card = document.createElement("div")
    card.className = "creator-card"
    card.innerHTML = `<div class='creator-eyebrow'>${metric.label}</div><div style='font-size:26px;font-weight:700;margin-top:6px;'>${metric.value}</div>`
    analyticsCards.appendChild(card)
  })

  if (!state.videos.length) {
    topVideos.innerHTML = "<div class='muted'>No analytics yet.</div>"
    return
  }

  const sorted = [...state.videos].sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0)).slice(0, 6)
  const maxViews = sorted.reduce((max, v) => Math.max(max, Number(v.views) || 0), 0) || 1
  topVideos.innerHTML = ""
  sorted.forEach(video => {
    const row = document.createElement("div")
    row.className = "row"
    const title = document.createElement("div")
    title.textContent = video.title || "Untitled"
    const views = document.createElement("div")
    views.textContent = `${formatNumber(video.views)} views`
    views.className = "muted"
    const bar = document.createElement("div")
    bar.className = "analytics-bar"
    const barFill = document.createElement("span")
    barFill.style.width = `${Math.max(8, (Number(video.views) || 0) / maxViews * 100)}%`
    bar.appendChild(barFill)
    row.appendChild(title)
    row.appendChild(views)
    row.appendChild(bar)
    topVideos.appendChild(row)
  })
}

function renderPlaylist() {
  playerPlaylist.innerHTML = ""
  if (!state.videos.length) {
    playerPlaylist.innerHTML = "<div class='muted'>No videos yet.</div>"
    return
  }
  state.videos.forEach(video => {
    const item = document.createElement("div")
    item.className = "creator-playlist-item"
    if (state.selectedVideo && String(state.selectedVideo.id) === String(video.id)) {
      item.classList.add("active")
    }
    const thumb = document.createElement("div")
    thumb.className = "creator-thumb"
    const thumbUrl = getThumbnail(video)
    if (thumbUrl) thumb.style.backgroundImage = `url('${thumbUrl}')`
    const body = document.createElement("div")
    const title = document.createElement("h4")
    title.textContent = video.title || "Untitled"
    const meta = document.createElement("p")
    meta.textContent = [video.category, video.language].filter(Boolean).join(" • ")
    body.appendChild(title)
    body.appendChild(meta)
    item.appendChild(thumb)
    item.appendChild(body)
    item.addEventListener("click", () => selectVideo(video))
    playerPlaylist.appendChild(item)
  })
}

function renderPlayer(video) {
  creatorPlayerStage.innerHTML = ""
  if (!video) {
    creatorPlayerStage.innerHTML = "<div class='muted'>Select a video.</div>"
    playerTitle.textContent = "Select a video"
    playerMeta.textContent = ""
    return
  }

  playerTitle.textContent = video.title || "Untitled"
  playerMeta.textContent = [video.category, video.language, getStatusLabel(video)].filter(Boolean).join(" • ")

  const source = String(video.source || "local").toLowerCase()
  const vid = String(video.videoId || "")

  if (source === "youtube" && vid) {
    const iframe = document.createElement("iframe")
    iframe.src = `https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1`
    iframe.allow = "autoplay; fullscreen"
    iframe.allowFullscreen = true
    creatorPlayerStage.appendChild(iframe)
    return
  }
  if (source === "vimeo" && vid) {
    const iframe = document.createElement("iframe")
    iframe.src = `https://player.vimeo.com/video/${vid}`
    iframe.allow = "autoplay; fullscreen"
    iframe.allowFullscreen = true
    creatorPlayerStage.appendChild(iframe)
    return
  }
  if (source === "dailymotion" && vid) {
    const iframe = document.createElement("iframe")
    iframe.src = `https://www.dailymotion.com/embed/video/${vid}`
    iframe.allow = "autoplay; fullscreen"
    iframe.allowFullscreen = true
    creatorPlayerStage.appendChild(iframe)
    return
  }
  if (video.playbackUrl) {
    const nativePlayer = document.createElement("video")
    nativePlayer.controls = true
    nativePlayer.playsInline = true
    nativePlayer.src = video.playbackUrl
    creatorPlayerStage.appendChild(nativePlayer)
    return
  }

  creatorPlayerStage.innerHTML = "<div class='muted'>Unable to play this video.</div>"
}

async function selectVideo(video) {
  state.selectedVideo = video
  renderPlayer(video)
  renderPlaylist()
}

function openEditDrawer(video) {
  state.editingVideo = video
  editDrawer.classList.add("show")
  editTitle.value = video.title || ""
  editDescription.value = video.description || ""
  editTags.value = Array.isArray(video.tags) ? video.tags.join(", ") : ""
  editHashtags.value = Array.isArray(video.hashtags) ? video.hashtags.join(" ") : ""
  editCategory.value = video.category || ""
  editLanguage.value = video.language || ""
  editThumb.value = video.thumbnailUrl || ""
  setStatus(editStatus, "")
}

async function initCreator() {
  try {
    const meRes = await apiFetch("/api/me")
    const channelRes = await apiFetch("/api/creator/channel")
    state.channel = channelRes.channel || null

    if (!state.channel) {
      creatorSubtitle.textContent = "Create your channel first to upload videos."
    } else {
      const url = `/channel/${state.channel.channelId}`
      publicChannelLink.href = url
      publicChannelLink.textContent = "Open Public Channel"
      publicChannelLink.style.display = "block"
      channelDetails.innerHTML = `
        <div style="font-size:22px;font-weight:700;margin-bottom:4px;">${state.channel.name}</div>
        <div style="color:rgba(180,200,240,0.9);margin-bottom:12px;">${state.channel.description || ""}</div>
        <a href="/channel/${state.channel.channelId}" target="_blank" style="color:#5fd0ff;text-decoration:none;">View Public Channel</a>
      `
    }

    const videosRes = await apiFetch("/api/creator/videos")
    state.videos = videosRes
    state.filtered = [...state.videos]

    updateStats()
    renderVideos(state.filtered)
    renderRecentUploads()
    renderAnalytics()
    renderPlaylist()

    populateFilters()
  } catch (err) {
    console.error("Creator init failed:", err)
    setStatus(channelStatus, "Failed to load creator data", true)
  }
}

function populateFilters() {
  const categories = [...new Set(state.videos.map(v => v.category).filter(Boolean))].sort()
  categoryFilter.innerHTML = '<option value="all">All Categories</option>'
  categories.forEach(cat => {
    const option = document.createElement("option")
    option.value = cat
    option.textContent = cat
    categoryFilter.appendChild(option)
  })

  videoSearch.addEventListener("input", applyFilters)
  statusFilter.addEventListener("change", applyFilters)
  categoryFilter.addEventListener("change", applyFilters)
  sortFilter.addEventListener("change", applyFilters)
}

navButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const section = btn.dataset.section
    if (section) showSection(section)
  })
})

newUploadBtn?.addEventListener("click", () => showSection("content"))
openContentBtn?.addEventListener("click", () => showSection("content"))
openPlayerBtn?.addEventListener("click", () => showSection("player"))
openAiBtn?.addEventListener("click", () => showSection("ai"))
editChannelBtn?.addEventListener("click", () => showSection("channel"))

saveChannelBtn?.addEventListener("click", async () => {
  try {
    setStatus(channelStatus, "Saving...")
    const name = channelNameInput.value.trim()
    const desc = channelDescInput.value.trim()
    if (!name) {
      setStatus(channelStatus, "Channel name required", true)
      return
    }
    const res = await apiFetch("/api/creator/channel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description: desc })
    })
    state.channel = res.channel
    setStatus(channelStatus, "Channel created!")
    publicChannelLink.href = `/channel/${state.channel.channelId}`
    publicChannelLink.style.display = "block"
  } catch (err) {
    setStatus(channelStatus, err.message || "Failed to save", true)
  }
})

submitVideoBtn?.addEventListener("click", async () => {
  try {
    setStatus(uploadStatus, "Submitting...")
    const body = {
      title: videoTitle.value.trim(),
      url: videoUrl.value.trim(),
      thumbnailUrl: videoThumb.value.trim(),
      category: videoCategory.value.trim(),
      language: videoLanguage.value.trim(),
      description: videoDescription.value.trim(),
      tags: videoTags.value.trim(),
      hashtags: videoHashtags.value.trim()
    }
    if (!body.title || !body.url) {
      setStatus(uploadStatus, "Title and URL required", true)
      return
    }
    const res = await apiFetch("/api/creator/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
    setStatus(uploadStatus, "Video submitted for approval!")
    
    // Reset form
    videoTitle.value = ""
    videoDescription.value = ""
    videoUrl.value = ""
    videoThumb.value = ""
    videoCategory.value = ""
    videoLanguage.value = ""
    videoTags.value = ""
    videoHashtags.value = ""
    
    // Refresh videos
    const videosRes = await apiFetch("/api/creator/videos")
    state.videos = videosRes
    applyFilters()
    updateStats()
  } catch (err) {
    setStatus(uploadStatus, err.message || "Upload failed", true)
  }
})

aiSuggestUploadBtn?.addEventListener("click", async () => {
  try {
    setStatus(aiInlineStatus, "Analyzing...")
    const payload = {
      url: videoUrl.value.trim(),
      title: videoTitle.value.trim(),
      category: videoCategory.value.trim(),
      language: videoLanguage.value.trim()
    }
    const res = await apiFetch("/api/creator/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
    
    state.lastAi = res.suggested
    aiSummary.innerHTML = `
      <div class="row">
        <strong>Title:</strong> <span style="color:#5fd0ff;">${res.suggested.title}</span>
      </div>
      <div class="row">
        <strong>Category:</strong> <span>${res.suggested.category}</span>
        <strong>Language:</strong> <span>${res.suggested.language}</span>
      </div>
    `
    setStatus(aiInlineStatus, "AI analysis complete ✓")
  } catch (err) {
    setStatus(aiInlineStatus, "AI analysis failed", true)
  }
})

aiApplyUploadBtn?.addEventListener("click", () => {
  if (!state.lastAi) return
  videoTitle.value = state.lastAi.title
  videoCategory.value = state.lastAi.category
  videoLanguage.value = state.lastAi.language
  videoDescription.value = state.lastAi.description
  videoTags.value = state.lastAi.tags.join(", ")
  videoHashtags.value = state.lastAi.hashtags.join(" ")
})

editCloseBtn?.addEventListener("click", () => {
  editDrawer.classList.remove("show")
  state.editingVideo = null
})

editSaveBtn?.addEventListener("click", async () => {
  if (!state.editingVideo) return
  try {
    setStatus(editStatus, "Saving...")
    const updates = {
      title: editTitle.value.trim(),
      description: editDescription.value.trim(),
      category: editCategory.value.trim(),
      language: editLanguage.value.trim(),
      thumbnailUrl: editThumb.value.trim(),
      tags: editTags.value.trim(),
      hashtags: editHashtags.value.trim()
    }
    const res = await apiFetch(`/api/creator/video/${state.editingVideo.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    })
    editDrawer.classList.remove("show")
    
    // Refresh
    const videosRes = await apiFetch("/api/creator/videos")
    state.videos = videosRes
    applyFilters()
    updateStats()
  } catch (err) {
    setStatus(editStatus, err.message || "Update failed", true)
  }
})

document.addEventListener("DOMContentLoaded", initCreator)

