require("dotenv").config()
const express = require("express")
const path = require("path")
const crypto = require("crypto")
const dns = require("node:dns/promises")
const net = require("node:net")
const fs = require("fs/promises")
const { getTrendingVideos } = require("./lib/trending")

const VIDEOS_FILE = path.join(__dirname, "database", "videos.json")
const COMMENTS_FILE = path.join(__dirname, "database", "comments.json")
const FAVORITES_FILE = path.join(__dirname, "favorites.json")
const DUBBING_JOBS_FILE = path.join(__dirname, "dubbing-jobs.json")

const YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
const YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
const YOUTUBE_CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"
const YOUTUBE_COMMENT_THREADS_URL = "https://www.googleapis.com/youtube/v3/commentThreads"
const VIMEO_SEARCH_URL = "https://api.vimeo.com/videos"
const DAILYMOTION_SEARCH_URL = "https://api.dailymotion.com/videos"
const PEXELS_SEARCH_URL = "https://api.pexels.com/videos/search"
const PIXABAY_SEARCH_URL = "https://pixabay.com/api/videos/"
const PEERTUBE_SEARCH_PATH = "/api/v1/search/videos"
const ARCHIVE_SEARCH_URL = "https://archive.org/advancedsearch.php"
const ARCHIVE_METADATA_BASE = "https://archive.org/metadata/"
const OMDB_API_URL = "https://www.omdbapi.com/"
const WATCHMODE_SEARCH_URL = "https://api.watchmode.com/v1/search/"
const WATCHMODE_TITLE_BASE_URL = "https://api.watchmode.com/v1/title/"
const TRAKT_SEARCH_URL = "https://api.trakt.tv/search/movie,show"

const writeQueues = new Map()
const adminSessions = new Map()
const loginAttempts = new Map()
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

const SUPPORTED_LANGUAGES = [
  "en", "hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "ur",
  "as", "or", "sa", "ne", "kok", "doi", "mai", "bho", "sat", "hne", "mni", "sd",
  "ar", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "id", "tr", "vi", "th",
  "pl", "nl", "sv", "fi", "no", "da", "cs", "ro", "hu", "el", "he", "uk", "fa", "ms", "sw",
  "am", "sr", "hr", "sk", "bg", "lt", "lv", "et", "sl", "fil"
]


const LIVE_TV_CHANNELS = [
  {
    id: "nasa-tv",
    name: "NASA TV",
    country: "US",
    language: "en",
    category: "science",
    source: "hls",
    streamUrl: "https://ntv1.nasa.gov/hls/live/2030106/NASA-NTV1.m3u8"
  },
  {
    id: "dw-news",
    name: "DW News",
    country: "DE",
    language: "en",
    category: "news",
    source: "youtube",
    channelId: "UCknLrEdhRCp1aegoMqRaCZg"
  },
  {
    id: "france24-english",
    name: "France 24 English",
    country: "FR",
    language: "en",
    category: "news",
    source: "youtube",
    channelId: "UCQfwfsi5VrQ8yKZ-UWmAEFg"
  },
  {
    id: "sky-news",
    name: "Sky News",
    country: "UK",
    language: "en",
    category: "news",
    source: "youtube",
    channelId: "UCXIJgqnII2ZOINSWNOGFThA"
  },
  {
    id: "aljazeera-english",
    name: "Al Jazeera English",
    country: "QA",
    language: "en",
    category: "news",
    source: "youtube",
    channelId: "UCNye-wNBqNL5ZzHSJj3l8Bg"
  },
  {
    id: "sansad-tv",
    name: "Sansad TV",
    country: "IN",
    language: "hi",
    category: "news",
    source: "youtube",
    channelId: "UCvK4bOhULCpmLabd2pDMtnA"
  },
  {
    id: "dd-news",
    name: "DD News",
    country: "IN",
    language: "hi",
    category: "news",
    source: "youtube",
    channelId: "UCJG7sZxAw3T6D9XhQ0fB1pg"
  },
  {
    id: "loksabha-tv",
    name: "Lok Sabha TV",
    country: "IN",
    language: "hi",
    category: "news",
    source: "youtube",
    channelId: "UCxI2rR1Ff5Hj7Q8N8N4h2fg"
  },
  {
    id: "test-global-1",
    name: "Global Free Stream 1",
    country: "GLOBAL",
    language: "en",
    category: "general",
    source: "hls",
    streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
  },
  {
    id: "test-global-2",
    name: "Global Free Stream 2",
    country: "GLOBAL",
    language: "en",
    category: "general",
    source: "hls",
    streamUrl: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8"
  }
]


const LIVE_TV_CHANNELS_API = "https://iptv-org.github.io/api/channels.json"
const LIVE_TV_STREAMS_API = "https://iptv-org.github.io/api/streams.json"
const LIVE_TV_M3U_INDEX_URL = "https://iptv-org.github.io/iptv/index.m3u"
const LIVE_TV_REMOTE_CACHE_MS = 30 * 60 * 1000
const LIVE_TV_ROUTE_FALLBACK_TIMEOUT_MS = 8000
const LIVE_TV_REMOTE_DEFAULT_LIMIT = 10000

let liveTvRemoteCache = {
  expiresAt: 0,
  channels: []
}

async function fetchJsonWithTimeout(url, timeoutMs = 12000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { signal: controller.signal })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return data
  } finally {
    clearTimeout(timer)
  }
}

function getOmdbApiKey(env) {
  const direct = String(env.OMDB_API_KEY || env.OMDB_API || "").trim()
  if (direct) return direct

  const alt = String(env["OMDb API"] || "").trim()
  return alt
}

async function fetchOmdbByTitle(title, apiKey) {
  const query = String(title || "").trim()
  if (!query || !apiKey) {
    return null
  }

  const url = new URL(OMDB_API_URL)
  url.searchParams.set("apikey", apiKey)
  url.searchParams.set("t", query)

  const data = await fetchJsonWithTimeout(url.toString(), 12000)
  if (!data || String(data.Response || "").toLowerCase() === "false") {
    return null
  }

  return {
    title: String(data.Title || ""),
    year: String(data.Year || ""),
    rated: String(data.Rated || ""),
    released: String(data.Released || ""),
    runtime: String(data.Runtime || ""),
    genre: String(data.Genre || ""),
    director: String(data.Director || ""),
    actors: String(data.Actors || ""),
    plot: String(data.Plot || ""),
    language: String(data.Language || ""),
    country: String(data.Country || ""),
    awards: String(data.Awards || ""),
    poster: String(data.Poster || ""),
    imdbRating: String(data.imdbRating || ""),
    imdbVotes: String(data.imdbVotes || ""),
    imdbID: String(data.imdbID || ""),
    type: String(data.Type || ""),
    boxOffice: String(data.BoxOffice || "")
  }
}
function getWatchmodeApiKey(env) {
  const direct = String(env.WATCHMODE_API_KEY || env.WATCHMODE_API || "").trim()
  if (direct) return direct

  const alt = String(env.WatchmodeAPI || env.WATCHMODEAPI || "").trim()
  return alt
}

async function fetchWatchmodeByTitle(title, apiKey) {
  const query = String(title || "").trim()
  if (!query || !apiKey) {
    return []
  }

  const url = new URL(WATCHMODE_SEARCH_URL)
  url.searchParams.set("apiKey", apiKey)
  url.searchParams.set("search_field", "name")
  url.searchParams.set("search_value", query)
  url.searchParams.set("types", "movie,tv")

  const data = await fetchJsonWithTimeout(url.toString(), 12000)
  const rawResults = Array.isArray(data?.title_results)
    ? data.title_results
    : (Array.isArray(data?.results) ? data.results : [])

  return rawResults.slice(0, 10).map(item => ({
    id: Number(item.id) || 0,
    title: String(item.name || item.title || ""),
    type: String(item.type || ""),
    year: Number(item.year) || null,
    imdbId: String(item.imdb_id || item.imdbId || ""),
    tmdbId: Number(item.tmdb_id) || null
  }))
}
function getTraktApiKey(env) {
  const direct = String(env.TRAKT_CLIENT_ID || env.TRAKT_API_KEY || env.TRAKT_API || "").trim()
  if (direct) return direct

  const alt = String(env.TraktTVAPI || env.TRAKTTVAPI || "").trim()
  return alt
}

async function fetchTraktByTitle(title, apiKey) {
  const query = String(title || "").trim()
  if (!query || !apiKey) {
    return []
  }

  const url = new URL(TRAKT_SEARCH_URL)
  url.searchParams.set("query", query)
  url.searchParams.set("limit", "10")

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-key": apiKey,
      "trakt-api-version": "2"
    }
  })

  const data = await res.json().catch(() => ([]))
  if (!res.ok || !Array.isArray(data)) {
    return []
  }

  return data.slice(0, 10).map(item => {
    const kind = String(item.type || "")
    const src = kind === "movie" ? item.movie : item.show
    return {
      type: kind,
      title: String(src?.title || ""),
      year: Number(src?.year) || null,
      traktId: Number(src?.ids?.trakt) || 0,
      imdbId: String(src?.ids?.imdb || ""),
      tmdbId: Number(src?.ids?.tmdb) || null,
      slug: String(src?.ids?.slug || "")
    }
  })
}
async function fetchBinaryWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    const arrayBuffer = await res.arrayBuffer()
    return {
      data: Buffer.from(arrayBuffer),
      contentType: res.headers.get("content-type") || "application/octet-stream"
    }
  } finally {
    clearTimeout(timer)
  }
}

function parseLiveTvCountry(channel) {
  if (typeof channel?.country === "string" && channel.country.trim()) {
    return channel.country.trim().toUpperCase()
  }
  if (Array.isArray(channel?.countries) && channel.countries[0]?.code) {
    return String(channel.countries[0].code).toUpperCase()
  }
  return "GLOBAL"
}

function parseLiveTvLanguage(channel) {
  if (typeof channel?.language === "string" && channel.language.trim()) {
    return channel.language.trim().toLowerCase()
  }
  if (Array.isArray(channel?.languages) && channel.languages[0]?.code) {
    return String(channel.languages[0].code).toLowerCase()
  }
  return "en"
}

function parseLiveTvCategory(channel) {
  if (typeof channel?.category === "string" && channel.category.trim()) {
    return channel.category.trim().toLowerCase()
  }
  if (Array.isArray(channel?.categories) && channel.categories[0]?.name) {
    return String(channel.categories[0].name).toLowerCase()
  }
  return "general"
}

function buildFaviconLogoFromWebsite(website) {
  const raw = String(website || "").trim()
  if (!raw) return ""

  try {
    const normalized = raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`
    const host = new URL(normalized).hostname
    if (!host) return ""
    return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`
  } catch {
    return ""
  }
}

function parseLiveTvLogo(channel) {
  if (typeof channel?.logo === "string" && channel.logo.trim()) {
    return channel.logo.trim()
  }
  if (typeof channel?.icon === "string" && channel.icon.trim()) {
    return channel.icon.trim()
  }
  return buildFaviconLogoFromWebsite(channel?.website)
}

function extractYouTubeVideoIdFromUrl(urlValue) {
  const raw = String(urlValue || "")
  if (!raw) return ""

  try {
    const url = new URL(raw)
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace(/^\//, "")
    }

    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v")
      if (v) return v
      const parts = url.pathname.split("/").filter(Boolean)
      if (parts[0] === "embed" && parts[1]) return parts[1]
      if (parts[0] === "live" && parts[1]) return parts[1]
    }
  } catch {
    return ""
  }

  return ""
}

function isYouTubeLikeId(value) {
  return /^[A-Za-z0-9_-]{11}$/.test(String(value || ""))
}

function hasDirectPlaybackUrl(value) {
  const raw = String(value || "").trim()
  if (!raw) return false
  return /^https?:\/\//i.test(raw)
}

function isPlayableVideo(video) {
  const source = String(video?.source || "").toLowerCase()
  const videoId = String(video?.videoId || "").trim()
  const playbackUrl = String(video?.playbackUrl || "").trim()

  if ((source === "youtube" || source === "local") && isYouTubeLikeId(videoId)) return true
  if ((source === "watchmode" || source === "omdb" || source === "trakt") && isYouTubeLikeId(videoId)) return true
  if (source === "vimeo" && videoId) return true
  if (source === "dailymotion" && videoId) return true
  if (hasDirectPlaybackUrl(playbackUrl)) return true

  return false
}

function resolveWatchmodePlayableCandidate(sources) {
  const items = Array.isArray(sources) ? sources : []
  for (const source of items) {
    const directUrl = String(source?.url || source?.web_url || source?.link || "").trim()
    const providerName = String(source?.name || source?.source_name || source?.provider_name || source?.network || "").trim()

    const youtubeVideoId = extractYouTubeVideoIdFromUrl(directUrl)
    if (youtubeVideoId) {
      return { videoId: youtubeVideoId, playbackUrl: "", providerName }
    }

    const lowerUrl = directUrl.toLowerCase()
    if (lowerUrl.includes('.m3u8') || lowerUrl.includes('.mp4') || lowerUrl.includes('.webm') || lowerUrl.includes('.mkv')) {
      return { videoId: "", playbackUrl: directUrl, providerName }
    }
  }

  return { videoId: "", playbackUrl: "", providerName: "" }
}

async function fetchWatchmodeSources(titleId, apiKey) {
  const parsedId = Number(titleId)
  const key = String(apiKey || "").trim()
  if (!Number.isFinite(parsedId) || parsedId <= 0 || !key) {
    return []
  }

  const url = new URL(`${WATCHMODE_TITLE_BASE_URL}${parsedId}/sources/`)
  url.searchParams.set("apiKey", key)

  const data = await fetchJsonWithTimeout(url.toString(), 12000)
  return Array.isArray(data) ? data : []
}
function parseAttributesFromExtInf(line) {
  const attrs = {}
  const regex = /(\w[\w-]*)="([^"]*)"/g
  let match
  while ((match = regex.exec(String(line || ""))) !== null) {
    attrs[match[1]] = String(match[2] || "")
  }
  return attrs
}

function parseM3uChannels(text, limit = 220) {
  const lines = String(text || "").split(/\r?\n/)
  const channels = []
  let pending = null

  for (const rawLine of lines) {
    const line = String(rawLine || "").trim()
    if (!line) continue

    if (line.startsWith("#EXTINF")) {
      const attrs = parseAttributesFromExtInf(line)
      const title = line.includes(",") ? line.slice(line.lastIndexOf(",") + 1).trim() : "Live TV"
      pending = {
        channelId: attrs["tvg-id"] || "",
        name: attrs["tvg-name"] || title || "Live TV",
        country: String(attrs["tvg-country"] || attrs["country"] || "GLOBAL").toUpperCase() || "GLOBAL",
        language: String(attrs["tvg-language"] || attrs["language"] || "en").toLowerCase() || "en",
        category: String(attrs["group-title"] || attrs["category"] || "general").toLowerCase() || "general",
        logo: String(attrs["tvg-logo"] || attrs["logo"] || "")
      }
      continue
    }

    if (line.startsWith("#")) continue

    if (!pending) {
      pending = {
        channelId: "",
        name: "Live TV",
        country: "GLOBAL",
        language: "en",
        category: "general",
        logo: ""
      }
    }

    const streamUrl = line
    const youtubeVideoId = extractYouTubeVideoIdFromUrl(streamUrl)
    const isHls = streamUrl.toLowerCase().includes(".m3u8")

    if (isHls || youtubeVideoId) {
      channels.push({
        id: `iptv-m3u-${channels.length + 1}`,
        name: pending.name,
        country: pending.country,
        language: pending.language,
        category: pending.category,
        logo: pending.logo,
        source: youtubeVideoId ? "youtubeVideo" : "hls",
        streamUrl: isHls ? streamUrl : "",
        videoId: youtubeVideoId,
        channelId: pending.channelId
      })
    }

    pending = null
    if (channels.length >= limit) break
  }

  return channels
}

async function fetchTextWithTimeout(url, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`)
    }
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function fetchRemoteLiveChannels(limit = LIVE_TV_REMOTE_DEFAULT_LIMIT) {
  const now = Date.now()
  if (liveTvRemoteCache.expiresAt > now && liveTvRemoteCache.channels.length > 0) {
    return liveTvRemoteCache.channels
  }

  const [channelsData, streamsData, m3uText] = await Promise.all([
    fetchJsonWithTimeout(LIVE_TV_CHANNELS_API, 15000).catch(() => []),
    fetchJsonWithTimeout(LIVE_TV_STREAMS_API, 15000).catch(() => []),
    fetchTextWithTimeout(LIVE_TV_M3U_INDEX_URL, 20000).catch(() => "")
  ])

  const channels = Array.isArray(channelsData) ? channelsData : []
  const streams = Array.isArray(streamsData) ? streamsData : []

  const channelMap = new Map()
  channels.forEach(channel => {
    const id = String(channel?.id || "")
    if (!id) return
    if (channel?.is_nsfw === true) return
    channelMap.set(id, channel)
  })

  const remote = []
  const seen = new Set()

  for (const stream of streams) {
    if (remote.length >= limit) break

    const url = String(stream?.url || "")
    const channelId = String(stream?.channel || "")
    const status = String(stream?.status || "").toLowerCase()
    if (!url || !channelId || seen.has(`${channelId}:${url}`)) continue
    if (status && status !== "online") continue

    const channel = channelMap.get(channelId)
    if (!channel) continue

    const youtubeVideoId = extractYouTubeVideoIdFromUrl(url)
    const isHls = url.toLowerCase().includes(".m3u8")
    if (!isHls && !youtubeVideoId) continue

    remote.push({
      id: `iptv-${channelId}-${remote.length + 1}`,
      name: String(channel?.name || `Live ${channelId}`),
      country: parseLiveTvCountry(channel),
      language: parseLiveTvLanguage(channel),
      category: parseLiveTvCategory(channel),
      logo: parseLiveTvLogo(channel),
      website: String(channel?.website || ""),
      source: youtubeVideoId ? "youtubeVideo" : "hls",
      streamUrl: isHls ? url : "",
      videoId: youtubeVideoId
    })

    seen.add(`${channelId}:${url}`)
  }

  const m3uChannels = parseM3uChannels(m3uText, Math.max(limit * 2, 300))
  for (const item of m3uChannels) {
    if (remote.length >= limit) break
    const key = `${String(item.channelId || item.name || "").toLowerCase()}:${String(item.streamUrl || item.videoId || "")}`
    if (seen.has(key)) continue
    if (!item.streamUrl && !item.videoId) continue

    remote.push(item)
    seen.add(key)
  }

  liveTvRemoteCache = {
    expiresAt: now + LIVE_TV_REMOTE_CACHE_MS,
    channels: remote
  }

  return remote
}

async function getLiveTvChannels() {
  const includeRemote = String(process.env.LIVE_TV_REMOTE_ENABLED || "true").toLowerCase() === "true"
  const local = [...LIVE_TV_CHANNELS]

  if (!includeRemote) {
    return local
  }

  const timeoutMs = Math.max(2000, Number(process.env.LIVE_TV_ROUTE_FALLBACK_TIMEOUT_MS) || LIVE_TV_ROUTE_FALLBACK_TIMEOUT_MS)
  const remoteLimit = Math.min(10000, Math.max(100, Number(process.env.LIVE_TV_REMOTE_LIMIT) || LIVE_TV_REMOTE_DEFAULT_LIMIT))
  const remotePromise = fetchRemoteLiveChannels(remoteLimit).catch(err => {
    console.warn("[LIVE_TV] remote list failed", err.message)
    return []
  })
  const timeoutPromise = new Promise(resolve => {
    setTimeout(() => resolve(null), timeoutMs)
  })

  const remote = await Promise.race([remotePromise, timeoutPromise])
  if (Array.isArray(remote)) {
    return [...local, ...remote]
  }

  if (liveTvRemoteCache.channels.length > 0) {
    return [...local, ...liveTvRemoteCache.channels]
  }

  return local
}
function createHttpError(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
}

function nowIso() {
  return new Date().toISOString()
}

function cleanupExpiredSessions() {
  const now = Date.now()
  for (const [token, session] of adminSessions.entries()) {
    if (session.expiresAt <= now) {
      adminSessions.delete(token)
    }
  }
}

function deriveCategory(title) {
  const text = String(title || "").toLowerCase()

  if (text.includes("music") || text.includes("song") || text.includes("album") || text.includes("bhajan") || text.includes("qawwali")) return "music"
  if (text.includes("game") || text.includes("gaming") || text.includes("esports")) return "gaming"
  if (
    text.includes("movie") ||
    text.includes("film") ||
    text.includes("trailer") ||
    text.includes("cinema") ||
    text.includes("bollywood") ||
    text.includes("hollywood") ||
    text.includes("full movie") ||
    text.includes("web series") ||
    text.includes("film") ||
    text.includes("?????") ||
    text.includes("????")
  ) return "movies"
  if (text.includes("news") || text.includes("politic") || text.includes("election") || text.includes("headlines")) return "news"
  if (text.includes("tech") || text.includes("ai") || text.includes("code") || text.includes("program")) return "technology"
  if (text.includes("sport") || text.includes("cricket") || text.includes("football") || text.includes("ipl")) return "sports"
  if (text.includes("education") || text.includes("tutorial") || text.includes("course") || text.includes("lecture")) return "education"
  if (text.includes("travel") || text.includes("nature") || text.includes("vlog")) return "travel"
  return "general"
}
function deriveLanguage(title) {
  const text = String(title || "").toLowerCase()

  if (/[\u0A00-\u0A7F]/.test(text) || text.includes("punjabi") || text.includes("??????")) return "pa"
  if (/[\u0A80-\u0AFF]/.test(text) || text.includes("gujarati")) return "gu"
  if (/[\u0B80-\u0BFF]/.test(text) || text.includes("tamil")) return "ta"
  if (/[\u0C00-\u0C7F]/.test(text) || text.includes("telugu")) return "te"
  if (/[\u0C80-\u0CFF]/.test(text) || text.includes("kannada")) return "kn"
  if (/[\u0D00-\u0D7F]/.test(text) || text.includes("malayalam")) return "ml"
  if (/[\u0B00-\u0B7F]/.test(text) || text.includes("odia") || text.includes("oriya")) return "or"
  if (/[\u0980-\u09FF]/.test(text) || text.includes("bangla") || text.includes("bengali")) {
    if (text.includes("assam") || text.includes("assamese")) return "as"
    return "bn"
  }
  if (/[\u0600-\u06FF]/.test(text) || text.includes("urdu") || text.includes("arabic")) return "ur"

  if (text.includes("haryanvi") || text.includes("????????")) return "hne"
  if (text.includes("sanskrit") || text.includes("???????")) return "sa"
  if (text.includes("marathi") || text.includes("?????")) return "mr"
  if (text.includes("maithili") || text.includes("??????")) return "mai"
  if (text.includes("bhojpuri") || text.includes("???????")) return "bho"
  if (text.includes("dogri") || text.includes("?????")) return "doi"
  if (text.includes("konkani") || text.includes("??????")) return "kok"
  if (text.includes("nepali") || text.includes("??????")) return "ne"
  if (text.includes("sindhi") || text.includes("??????")) return "sd"

  if (/[\u0900-\u097F]/.test(text) || text.includes("hindi") || text.includes("bharat") || text.includes("namaste")) return "hi"
  if (/[\u3040-\u30FF]/.test(text) || text.includes("japanese")) return "ja"
  if (/[\uAC00-\uD7AF]/.test(text) || text.includes("korean")) return "ko"
  if (/[\u4E00-\u9FFF]/.test(text) || text.includes("chinese")) return "zh"
  if (text.includes("spanish") || text.includes("espanol")) return "es"
  if (text.includes("french") || text.includes("francais")) return "fr"
  if (text.includes("german") || text.includes("deutsch")) return "de"
  if (text.includes("portuguese")) return "pt"
  if (text.includes("russian")) return "ru"
  return "en"
}
function getAdultRiskSignals(video) {
  const text = [
    String(video?.title || ""),
    String(video?.category || ""),
    String(video?.channelName || "")
  ].join(" ").toLowerCase()

  const highRiskKeywords = [
    "porn", "porno", "xxx", "sex video", "sex clip", "nudity", "nude", "nsfw", "erotic", "18+",
    "adult only", "hardcore", "onlyfans", "camgirl", "camshow"
  ]
  const mediumRiskKeywords = [
    "sexy", "hot girl", "hot scene", "bikini", "lingerie", "uncensored", "sensual", "dating prank"
  ]

  const matched = []
  let score = 0

  highRiskKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 3
      matched.push(keyword)
    }
  })

  mediumRiskKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      score += 1
      matched.push(keyword)
    }
  })

  return { score, matched }
}

function getModerationDecision(video) {
  const threshold = Math.max(1, Number(process.env.ADULT_REVIEW_SCORE_THRESHOLD) || 2)
  const risk = getAdultRiskSignals(video)

  if (risk.score >= threshold) {
    const matchedPreview = risk.matched.slice(0, 3).join(",")
    return {
      requiresReview: true,
      reason: matchedPreview ? `adult-risk:${matchedPreview}` : "adult-risk",
      status: "needs_manual_review"
    }
  }

  return {
    requiresReview: false,
    reason: "safe-auto-published",
    status: "auto-published"
  }
}

function applyModerationDecision(video, decision) {
  let changed = false

  if (video.rejected) {
    if (video.approved || video.homepage) {
      video.approved = false
      video.homepage = false
      video.updatedAt = nowIso()
      changed = true
    }
    return changed
  }

  if (decision.requiresReview) {
    if (video.approved || video.homepage || video.moderationStatus !== "needs_manual_review" || video.moderationReason !== decision.reason) {
      video.approved = false
      video.homepage = false
      video.moderationStatus = "needs_manual_review"
      video.moderationReason = decision.reason
      video.updatedAt = nowIso()
      changed = true
    }
    return changed
  }

  if (!video.approved || !video.homepage || video.moderationStatus !== "auto-published" || video.moderationReason !== decision.reason) {
    video.approved = true
    video.homepage = true
    video.moderationStatus = "auto-published"
    video.moderationReason = decision.reason
    video.updatedAt = nowIso()
    changed = true
  }

  return changed
}
function normalizeVideo(video, fallbackId) {
  const rawVideo = video && typeof video === "object" ? video : {}
  const source = String(rawVideo.source || "local")
  const videoId = String(rawVideo.videoId || "")

  return {
    ...rawVideo,
    id: Number(rawVideo.id) || fallbackId,
    title: String(rawVideo.title || "Untitled video"),
    videoId,
    views: Math.max(0, Number(rawVideo.views) || 0),
    likes: Math.max(0, Number(rawVideo.likes) || 0),
    homepage: typeof rawVideo.homepage === "boolean" ? rawVideo.homepage : true,
    approved: typeof rawVideo.approved === "boolean" ? rawVideo.approved : true,
    rejected: typeof rawVideo.rejected === "boolean" ? rawVideo.rejected : false,
    source,
    language: String(rawVideo.language || deriveLanguage(rawVideo.title || "")),
    category: String(rawVideo.category || deriveCategory(rawVideo.title || "")),
    thumbnailUrl: String(rawVideo.thumbnailUrl || ""),
    playbackUrl: String(rawVideo.playbackUrl || ""),
    publishedAt: String(rawVideo.publishedAt || ""),
    uploadedAt: String(rawVideo.uploadedAt || ""),
    channelId: String(rawVideo.channelId || ""),
    channelName: String(rawVideo.channelName || ""),
    subscriberCount: Math.max(0, Number(rawVideo.subscriberCount) || 0),
    moderationStatus: String(rawVideo.moderationStatus || ""),
    moderationReason: String(rawVideo.moderationReason || ""),
    country: String(rawVideo.country || ""),
    createdAt: rawVideo.createdAt || nowIso(),
    updatedAt: rawVideo.updatedAt || nowIso()
  }
}

function getVideoStatus(video) {
  if (video.rejected) {
    return "rejected"
  }
  if (!video.approved) {
    return "pending"
  }
  return "approved"
}

function getThumbnailUrl(video) {
  if (video.thumbnailUrl) {
    return video.thumbnailUrl
  }

  if (video.videoId) {
    return `https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`
  }

  return ""
}

function toPendingVideo({ title, videoId, views, likes, source, thumbnailUrl, playbackUrl, language, category, channelId, channelName, subscriberCount }) {
  const normalizedTitle = String(title || "Untitled video")
  return {
    title: normalizedTitle,
    videoId: String(videoId || ""),
    views: Math.max(0, Number(views) || 0),
    likes: Math.max(0, Number(likes) || 0),
    source: String(source || "local"),
    language: String(language || deriveLanguage(normalizedTitle)),
    category: String(category || deriveCategory(normalizedTitle)),
    channelId: String(channelId || ""),
    channelName: String(channelName || ""),
    subscriberCount: Math.max(0, Number(subscriberCount) || 0),
    thumbnailUrl: String(thumbnailUrl || ""),
    playbackUrl: String(playbackUrl || ""),
    approved: false,
    homepage: false,
    rejected: false,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
}

async function fetchYouTubeChannelMap(channelIds, apiKey) {
  const uniqueIds = [...new Set(channelIds.map(id => String(id || "").trim()).filter(Boolean))]
  const map = new Map()

  if (uniqueIds.length === 0) {
    return map
  }

  const channelUrl = new URL(YOUTUBE_CHANNELS_URL)
  channelUrl.searchParams.set("key", apiKey)
  channelUrl.searchParams.set("part", "snippet,statistics")
  channelUrl.searchParams.set("id", uniqueIds.join(","))

  const channelRes = await fetch(channelUrl.toString())
  const channelData = await channelRes.json().catch(() => ({}))
  if (!channelRes.ok) {
    return map
  }

  const channelItems = Array.isArray(channelData.items) ? channelData.items : []
  channelItems.forEach(item => {
    const id = String(item?.id || "")
    if (!id) return
    map.set(id, {
      channelName: String(item?.snippet?.title || ""),
      subscriberCount: Math.max(0, Number(item?.statistics?.subscriberCount) || 0)
    })
  })

  return map
}

async function enrichYouTubeVideoMetadata(video, apiKey) {
  const source = String(video.source || "").toLowerCase()
  if (source !== "youtube" || !video.videoId || !apiKey) {
    return video
  }

  if (video.channelId && video.channelName && Number(video.subscriberCount) > 0) {
    return video
  }

  const statsUrl = new URL(YOUTUBE_VIDEOS_URL)
  statsUrl.searchParams.set("key", apiKey)
  statsUrl.searchParams.set("part", "snippet")
  statsUrl.searchParams.set("id", String(video.videoId))

  const statsRes = await fetch(statsUrl.toString())
  const statsData = await statsRes.json().catch(() => ({}))
  if (!statsRes.ok) {
    return video
  }

  const item = Array.isArray(statsData.items) ? statsData.items[0] : null
  if (!item) {
    return video
  }

  const channelId = String(item?.snippet?.channelId || video.channelId || "")
  const fallbackName = String(item?.snippet?.channelTitle || video.channelName || "")
  const channelMap = await fetchYouTubeChannelMap([channelId], apiKey)
  const channelInfo = channelMap.get(channelId) || {}

  return {
    ...video,
    channelId,
    channelName: String(channelInfo.channelName || fallbackName),
    subscriberCount: Math.max(0, Number(channelInfo.subscriberCount) || Number(video.subscriberCount) || 0),
    updatedAt: nowIso()
  }
}

async function fetchYouTubeTopComments(videoId, apiKey, maxResults = 20) {
  if (!apiKey || !videoId) {
    return []
  }

  const requestUrl = new URL(YOUTUBE_COMMENT_THREADS_URL)
  requestUrl.searchParams.set("key", apiKey)
  requestUrl.searchParams.set("part", "snippet")
  requestUrl.searchParams.set("videoId", String(videoId))
  requestUrl.searchParams.set("order", "relevance")
  requestUrl.searchParams.set("textFormat", "plainText")
  requestUrl.searchParams.set("maxResults", String(Math.min(50, Math.max(1, Number(maxResults) || 20))))

  const res = await fetch(requestUrl.toString())
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return []
  }

  const items = Array.isArray(data.items) ? data.items : []
  return items.map(item => {
    const top = item?.snippet?.topLevelComment?.snippet || {}
    return {
      id: String(item?.id || crypto.randomUUID()),
      author: String(top.authorDisplayName || "YouTube user"),
      text: String(top.textDisplay || ""),
      likeCount: Math.max(0, Number(top.likeCount) || 0),
      publishedAt: top.publishedAt || nowIso(),
      source: "youtube"
    }
  }).filter(comment => String(comment.text || "").trim())
}
function parseVimeoVideoId(uri) {
  const match = String(uri || "").match(/\/videos\/(\d+)/)
  return match ? match[1] : ""
}

async function readJson(filePath, fallbackValue) {
  try {
    const raw = (await fs.readFile(filePath, "utf8")).trim()
    if (!raw) {
      return fallbackValue
    }
    return JSON.parse(raw)
  } catch (err) {
    if (err && err.code === "ENOENT") {
      return fallbackValue
    }
    throw err
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableWriteError(err) {
  if (!err || typeof err.code !== "string") {
    return false
  }
  return err.code === "EPERM" || err.code === "EACCES" || err.code === "EBUSY"
}

async function writeFileWithRetry(filePath, body, retries = 4) {
  let attempt = 0
  while (true) {
    try {
      await fs.writeFile(filePath, body, "utf8")
      return
    } catch (err) {
      if (!isRetryableWriteError(err) || attempt >= retries) {
        throw err
      }
      attempt += 1
      await sleep(75 * attempt)
    }
  }
}

async function writeJsonQueued(filePath, data) {
  const previous = writeQueues.get(filePath) || Promise.resolve()
  const body = JSON.stringify(data, null, 2)
  const next = previous
    .catch(() => undefined)
    .then(() => writeFileWithRetry(filePath, body))

  writeQueues.set(filePath, next)
  await next
}

async function getVideos() {
  const raw = await readJson(VIDEOS_FILE, [])
  return raw.map((video, index) => normalizeVideo(video, index + 1))
}

async function saveVideos(videos) {
  const normalized = videos.map((video, index) => normalizeVideo(video, index + 1))
  await writeJsonQueued(VIDEOS_FILE, normalized)
}

async function getComments() {
  return readJson(COMMENTS_FILE, [])
}

async function saveComments(comments) {
  await writeJsonQueued(COMMENTS_FILE, comments)
}

async function getFavorites() {
  return readJson(FAVORITES_FILE, [])
}

async function saveFavorites(favorites) {
  await writeJsonQueued(FAVORITES_FILE, favorites)
}

async function getDubbingJobs() {
  return readJson(DUBBING_JOBS_FILE, [])
}

async function saveDubbingJobs(jobs) {
  await writeJsonQueued(DUBBING_JOBS_FILE, jobs)
}

function normalizeDubStatus(value) {
  const raw = String(value || "").trim().toLowerCase()
  if (!raw) return "processing"
  if (raw === "done" || raw === "ready" || raw === "success") return "completed"
  if (raw === "error") return "failed"
  if (["queued", "submitted", "processing", "completed", "failed"].includes(raw)) {
    return raw
  }
  return "processing"
}

function findDubbingJobIndex(jobs, { id, videoId, language }) {
  const jobId = String(id || "").trim()
  if (jobId) {
    return jobs.findIndex(job => String(job.id || "") === jobId)
  }

  const parsedVideoId = Number(videoId)
  const normalizedLang = String(language || "").trim().toLowerCase()
  if (!Number.isFinite(parsedVideoId) || !normalizedLang) {
    return -1
  }

  for (let i = jobs.length - 1; i >= 0; i -= 1) {
    const job = jobs[i]
    if (Number(job.videoId) === parsedVideoId && String(job.language || "").toLowerCase() === normalizedLang) {
      return i
    }
  }
  return -1
}

function applyDubbingJobUpdate(job, update) {
  if (Object.prototype.hasOwnProperty.call(update, "status")) {
    job.status = normalizeDubStatus(update.status)
  }

  if (typeof update.audioUrl === "string") {
    const nextAudioUrl = update.audioUrl.trim()
    if (nextAudioUrl) {
      job.audioUrl = nextAudioUrl
      if (job.status !== "failed") {
        job.status = "completed"
      }
      job.error = ""
    }
  }

  if (typeof update.error === "string") {
    const nextError = update.error.trim()
    if (nextError) {
      job.error = nextError
      if (!job.audioUrl) {
        job.status = "failed"
      }
    } else if (job.audioUrl) {
      job.error = ""
    }
  }

  job.updatedAt = nowIso()
  return job
}

function parsePositiveInt(value, fieldName) {
  const parsed = Number.parseInt(String(value), 10)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `Invalid ${fieldName}`)
  }
  return parsed
}

function normalizeString(value, fieldName, maxLen) {
  if (typeof value !== "string") {
    throw createHttpError(400, `Invalid ${fieldName}`)
  }

  const trimmed = value.trim()
  if (!trimmed) {
    throw createHttpError(400, `${fieldName} is required`)
  }

  if (trimmed.length > maxLen) {
    throw createHttpError(400, `${fieldName} too long`)
  }

  return trimmed
}

function getAuthToken(req) {
  const bearer = req.headers.authorization || ""
  if (bearer.startsWith("Bearer ")) {
    return bearer.slice("Bearer ".length).trim()
  }

  const direct = req.headers["x-admin-token"]
  return typeof direct === "string" ? direct.trim() : ""
}

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^192\.168\./,
  /^0\./,
  /^255\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./
]

function isPrivateIPv4(value) {
  return PRIVATE_IPV4_RANGES.some(pattern => pattern.test(value))
}

function isPrivateIPv6(value) {
  const normalized = String(value || "").toLowerCase()
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  )
}

function isPrivateIp(value) {
  const ipType = net.isIP(value)
  if (ipType === 4) {
    return isPrivateIPv4(value)
  }
  if (ipType === 6) {
    return isPrivateIPv6(value)
  }
  return false
}

async function assertSafePublicUrl(parsedUrl) {
  const hostname = String(parsedUrl.hostname || "").trim().toLowerCase()
  if (!hostname) {
    throw createHttpError(400, "Invalid playback URL host")
  }

  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw createHttpError(400, "Local playback URLs are not allowed")
  }

  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) {
      throw createHttpError(400, "Private playback URLs are not allowed")
    }
    return
  }

  let records = []
  try {
    records = await dns.lookup(hostname, { all: true, verbatim: true })
  } catch {
    throw createHttpError(400, "Playback host DNS lookup failed")
  }

  if (!Array.isArray(records) || records.length === 0) {
    throw createHttpError(400, "Playback host DNS lookup failed")
  }

  const hasPrivateRecord = records.some(record => isPrivateIp(record.address))
  if (hasPrivateRecord) {
    throw createHttpError(400, "Private playback URLs are not allowed")
  }
}

function secureTokenEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  if (leftBuffer.length !== rightBuffer.length) {
    return false
  }
  return crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim()
  }

  return (
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    "unknown"
  )
}

function assertLoginRateLimit(req) {
  const ip = String(getClientIp(req))
  const current = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 }
  const now = Date.now()

  if (current.blockedUntil > now) {
    throw createHttpError(429, "Too many login attempts. Try again later.")
  }
}

function trackFailedLogin(req) {
  const ip = String(getClientIp(req))
  const current = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 }
  const count = current.count + 1

  const next = { count, blockedUntil: 0 }
  if (count >= 5) {
    next.blockedUntil = Date.now() + 15 * 60 * 1000
    next.count = 0
  }

  loginAttempts.set(ip, next)
}

function clearLoginAttempts(req) {
  loginAttempts.delete(String(getClientIp(req)))
}

function getProviderConfig(env) {
  return {
    youtube: {
      enabled: Boolean(env.YOUTUBE_API_KEY),
      keyName: "YOUTUBE_API_KEY"
    },
    vimeo: {
      enabled: Boolean(env.VIMEO_ACCESS_TOKEN),
      keyName: "VIMEO_ACCESS_TOKEN"
    },
    dailymotion: {
      enabled: true,
      keyName: "none"
    },
    pexels: {
      enabled: Boolean(env.PEXELS_API_KEY),
      keyName: "PEXELS_API_KEY"
    },
    pixabay: {
      enabled: Boolean(env.PIXABAY_API_KEY),
      keyName: "PIXABAY_API_KEY"
    },
    peertube: {
      enabled: true,
      keyName: "none"
    },
    archive: {
      enabled: true,
      keyName: "none"
    },
    omdb: {
      enabled: Boolean(getOmdbApiKey(env)),
      keyName: "OMDB_API_KEY"
    },
    watchmode: {
      enabled: Boolean(getWatchmodeApiKey(env)),
      keyName: "WATCHMODE_API_KEY"
    },
    trakt: {
      enabled: Boolean(getTraktApiKey(env)),
      keyName: "TRAKT_CLIENT_ID"
    },
    dubbing: {
      enabled: Boolean(env.DUBBING_WEBHOOK_URL),
      keyName: "DUBBING_WEBHOOK_URL"
    }
  }
}

async function importFromYouTube({ query, maxResults, apiKey }) {
  const searchUrl = new URL(YOUTUBE_SEARCH_URL)
  searchUrl.searchParams.set("key", apiKey)
  searchUrl.searchParams.set("part", "snippet")
  searchUrl.searchParams.set("type", "video")
  searchUrl.searchParams.set("maxResults", String(maxResults))
  searchUrl.searchParams.set("q", query)

  const searchRes = await fetch(searchUrl.toString())
  const searchData = await searchRes.json().catch(() => ({}))
  if (!searchRes.ok) {
    const msg = searchData?.error?.message || "YouTube search failed"
    throw createHttpError(502, msg)
  }

  const items = Array.isArray(searchData.items) ? searchData.items : []
  const ids = items
    .map(item => item?.id?.videoId)
    .filter(Boolean)

  if (ids.length === 0) {
    return []
  }

  const statsUrl = new URL(YOUTUBE_VIDEOS_URL)
  statsUrl.searchParams.set("key", apiKey)
  statsUrl.searchParams.set("part", "snippet,statistics")
  statsUrl.searchParams.set("id", ids.join(","))

  const statsRes = await fetch(statsUrl.toString())
  const statsData = await statsRes.json().catch(() => ({}))
  if (!statsRes.ok) {
    const msg = statsData?.error?.message || "YouTube stats fetch failed"
    throw createHttpError(502, msg)
  }

  const statsItems = Array.isArray(statsData.items) ? statsData.items : []
  const channelIds = [...new Set(statsItems.map(item => item?.snippet?.channelId).filter(Boolean))]
  const channelMap = new Map()

  if (channelIds.length > 0) {
    const channelUrl = new URL(YOUTUBE_CHANNELS_URL)
    channelUrl.searchParams.set("key", apiKey)
    channelUrl.searchParams.set("part", "snippet,statistics")
    channelUrl.searchParams.set("id", channelIds.join(","))

    const channelRes = await fetch(channelUrl.toString())
    const channelData = await channelRes.json().catch(() => ({}))

    if (channelRes.ok) {
      const channelItems = Array.isArray(channelData.items) ? channelData.items : []
      channelItems.forEach(item => {
        const id = String(item?.id || "")
        if (!id) return
        channelMap.set(id, {
          channelName: String(item?.snippet?.title || ""),
          subscriberCount: Math.max(0, Number(item?.statistics?.subscriberCount) || 0)
        })
      })
    }
  }

  return statsItems.map(item => {
    const channelId = String(item?.snippet?.channelId || "")
    const channelInfo = channelMap.get(channelId) || {}

    return toPendingVideo({
      title: item?.snippet?.title || "Untitled video",
      videoId: item?.id || "",
      views: Number(item?.statistics?.viewCount) || 0,
      likes: Number(item?.statistics?.likeCount) || 0,
      source: "youtube",
      channelId,
      channelName: channelInfo.channelName || String(item?.snippet?.channelTitle || ""),
      subscriberCount: Number(channelInfo.subscriberCount) || 0,
      thumbnailUrl: item?.snippet?.thumbnails?.medium?.url || ""
    })
  })
}

async function findYouTubeFallbackVideoId(title, apiKey) {
  const query = String(title || "").trim()
  const key = String(apiKey || "").trim()
  if (!query || !key) {
    return ""
  }

  const searchUrl = new URL(YOUTUBE_SEARCH_URL)
  searchUrl.searchParams.set("key", key)
  searchUrl.searchParams.set("part", "snippet")
  searchUrl.searchParams.set("type", "video")
  searchUrl.searchParams.set("maxResults", "1")
  searchUrl.searchParams.set("q", query + " trailer")

  const res = await fetch(searchUrl.toString())
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return ""
  }

  const first = Array.isArray(data?.items) ? data.items[0] : null
  return String(first?.id?.videoId || "")
}
async function importFromVimeo({ query, maxResults, accessToken }) {
  const url = new URL(VIMEO_SEARCH_URL)
  url.searchParams.set("query", query)
  url.searchParams.set("per_page", String(maxResults))
  url.searchParams.set("sort", "relevant")

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = data?.error || data?.message || "Vimeo import failed"
    throw createHttpError(502, msg)
  }

  const items = Array.isArray(data.data) ? data.data : []
  return items
    .map(item =>
      toPendingVideo({
        title: item?.name || "Untitled video",
        videoId: parseVimeoVideoId(item?.uri),
        views: Number(item?.stats?.plays) || 0,
        likes: Number(item?.metadata?.connections?.likes?.total) || 0,
        source: "vimeo",
        thumbnailUrl: item?.pictures?.sizes?.[3]?.link || item?.pictures?.sizes?.[0]?.link || ""
      })
    )
    .filter(item => item.videoId)
}

async function importFromDailymotion({ query, maxResults }) {
  const url = new URL(DAILYMOTION_SEARCH_URL)
  url.searchParams.set("search", query)
  url.searchParams.set("limit", String(maxResults))
  url.searchParams.set("fields", "id,title,thumbnail_url,views_total")

  const res = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw createHttpError(502, "Dailymotion import failed")
  }

  const items = Array.isArray(data.list) ? data.list : []
  return items.map(item =>
    toPendingVideo({
      title: item?.title || "Untitled video",
      videoId: item?.id || "",
      views: Number(item?.views_total) || 0,
      likes: 0,
      source: "dailymotion",
      thumbnailUrl: item?.thumbnail_url || ""
    })
  )
}

async function importFromPexels({ query, maxResults, apiKey }) {
  const url = new URL(PEXELS_SEARCH_URL)
  url.searchParams.set("query", query)
  url.searchParams.set("per_page", String(maxResults))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: apiKey
    }
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = data?.error || "Pexels import failed"
    throw createHttpError(502, msg)
  }

  const items = Array.isArray(data.videos) ? data.videos : []
  return items.map(item => {
    const bestFile = Array.isArray(item.video_files)
      ? item.video_files.find(file => file.quality === "sd") || item.video_files[0]
      : null

    return toPendingVideo({
      title: item?.url ? `Pexels video ${item.id}` : `Pexels video ${item?.id || ""}`,
      videoId: String(item?.id || ""),
      views: 0,
      likes: 0,
      source: "pexels",
      thumbnailUrl: item?.image || "",
      playbackUrl: bestFile?.link || ""
    })
  })
}

async function importFromPixabay({ query, maxResults, apiKey }) {
  const url = new URL(PIXABAY_SEARCH_URL)
  url.searchParams.set("key", apiKey)
  url.searchParams.set("q", query)
  url.searchParams.set("per_page", String(maxResults))

  const res = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = data?.error || "Pixabay import failed"
    throw createHttpError(502, msg)
  }

  const items = Array.isArray(data.hits) ? data.hits : []
  return items.map(item =>
    toPendingVideo({
      title: item?.tags ? `Pixabay ${item.tags}` : `Pixabay video ${item?.id || ""}`,
      videoId: String(item?.id || ""),
      views: Number(item?.views) || 0,
      likes: Number(item?.likes) || 0,
      source: "pixabay",
      thumbnailUrl: item?.videos?.tiny?.thumbnail || item?.picture_id || "",
      playbackUrl: item?.videos?.medium?.url || item?.videos?.small?.url || item?.videos?.tiny?.url || ""
    })
  )
}

async function importFromPeerTube({ query, maxResults, baseUrl }) {
  const root = String(baseUrl || "https://peertube.tv").replace(/\/$/, "")
  const url = new URL(`${root}${PEERTUBE_SEARCH_PATH}`)
  url.searchParams.set("search", query)
  url.searchParams.set("count", String(maxResults))

  const res = await fetch(url.toString())
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw createHttpError(502, "PeerTube import failed")
  }

  const items = Array.isArray(data.data) ? data.data : []
  return items.map(item =>
    toPendingVideo({
      title: item?.name || "Untitled video",
      videoId: String(item?.uuid || item?.shortUUID || ""),
      views: Number(item?.views) || 0,
      likes: Number(item?.likes) || 0,
      source: "peertube",
      thumbnailUrl: item?.thumbnailPath ? `${root}${item.thumbnailPath}` : "",
      playbackUrl: item?.streamingPlaylists?.[0]?.playlistUrl || ""
    })
  )
}

async function importFromArchive({ query, maxResults }) {
  const searchUrl = new URL(ARCHIVE_SEARCH_URL)
  searchUrl.searchParams.set("q", `(title:(${query})) AND mediatype:(movies)`)
  searchUrl.searchParams.set("fl[]", "identifier,title,downloads,language")
  searchUrl.searchParams.set("rows", String(maxResults))
  searchUrl.searchParams.set("page", "1")
  searchUrl.searchParams.set("output", "json")

  const searchRes = await fetch(searchUrl.toString())
  const searchData = await searchRes.json().catch(() => ({}))
  if (!searchRes.ok) {
    throw createHttpError(502, "Archive.org search failed")
  }

  const docs = Array.isArray(searchData?.response?.docs) ? searchData.response.docs : []
  const results = []

  for (const doc of docs) {
    const identifier = String(doc?.identifier || "")
    if (!identifier) {
      continue
    }

    const metaRes = await fetch(`${ARCHIVE_METADATA_BASE}${encodeURIComponent(identifier)}`)
    const metaData = await metaRes.json().catch(() => ({}))
    if (!metaRes.ok) {
      continue
    }

    const files = Array.isArray(metaData.files) ? metaData.files : []
    const mp4 = files.find(file => String(file?.name || "").toLowerCase().endsWith(".mp4"))
    if (!mp4?.name) {
      continue
    }

    results.push(
      toPendingVideo({
        title: doc?.title || identifier,
        videoId: identifier,
        views: Number(doc?.downloads) || 0,
        likes: 0,
        source: "archive",
        thumbnailUrl: `https://archive.org/services/img/${identifier}`,
        playbackUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(mp4.name)}`
      })
    )
  }

  return results
}
async function importFromOmdb({ query, maxResults, apiKey }) {
  const searchUrl = new URL(OMDB_API_URL)
  searchUrl.searchParams.set("apikey", apiKey)
  searchUrl.searchParams.set("s", query)
  searchUrl.searchParams.set("type", "movie")

  const data = await fetchJsonWithTimeout(searchUrl.toString(), 12000)
  const items = Array.isArray(data?.Search) ? data.Search : []

  return items.slice(0, maxResults).map(item =>
    toPendingVideo({
      title: String(item?.Title || "Untitled movie"),
      videoId: String(item?.imdbID || item?.Title || crypto.randomUUID()),
      views: 0,
      likes: 0,
      source: "omdb",
      language: "en",
      category: "movies",
      thumbnailUrl: String(item?.Poster || "") !== "N/A" ? String(item?.Poster || "") : ""
    })
  )
}

async function importFromWatchmode({ query, maxResults, apiKey, youtubeApiKey }) {
  const url = new URL(WATCHMODE_SEARCH_URL)
  url.searchParams.set("apiKey", apiKey)
  url.searchParams.set("search_field", "name")
  url.searchParams.set("search_value", query)
  url.searchParams.set("types", "movie,tv")

  const data = await fetchJsonWithTimeout(url.toString(), 12000)
  const rawResults = Array.isArray(data?.title_results)
    ? data.title_results
    : (Array.isArray(data?.results) ? data.results : [])

  const picked = rawResults.slice(0, maxResults)
  const videos = await Promise.all(
    picked.map(async item => {
      const title = String(item?.name || item?.title || "Untitled title")
      const titleId = Number(item?.id) || 0
      const sources = titleId > 0 ? await fetchWatchmodeSources(titleId, apiKey).catch(() => []) : []
      const candidate = resolveWatchmodePlayableCandidate(sources)

      let fallbackYoutubeId = ""
      if (!candidate.videoId && !candidate.playbackUrl) {
        fallbackYoutubeId = await findYouTubeFallbackVideoId(title, youtubeApiKey)
      }

      return toPendingVideo({
        title,
        videoId: candidate.videoId || fallbackYoutubeId || "",
        views: 0,
        likes: 0,
        source: "watchmode",
        language: "en",
        category: String(item?.type || "") === "tv_series" ? "general" : "movies",
        thumbnailUrl: String(item?.poster || item?.image_url || ""),
        playbackUrl: candidate.playbackUrl || "",
        channelName: candidate.providerName || ""
      })
    })
  )

  return videos.filter(isPlayableVideo)
}
async function importFromTrakt({ query, maxResults, apiKey }) {
  const url = new URL(TRAKT_SEARCH_URL)
  url.searchParams.set("query", query)
  url.searchParams.set("limit", String(maxResults))

  const res = await fetch(url.toString(), {
    headers: {
      "Content-Type": "application/json",
      "trakt-api-key": apiKey,
      "trakt-api-version": "2"
    }
  })

  const data = await res.json().catch(() => ([]))
  if (!res.ok || !Array.isArray(data)) {
    throw createHttpError(502, "Trakt import failed")
  }

  return data.slice(0, maxResults).map(item => {
    const kind = String(item?.type || "")
    const src = kind === "movie" ? item?.movie : item?.show
    return toPendingVideo({
      title: String(src?.title || "Untitled title"),
      videoId: String(src?.ids?.imdb || src?.ids?.trakt || crypto.randomUUID()),
      views: 0,
      likes: 0,
      source: "trakt",
      language: "en",
      category: kind === "movie" ? "movies" : "general"
    })
  })
}
async function createDubbingJobs({ videoId, languages, provider, env }) {
  const webhook = env.DUBBING_WEBHOOK_URL || ""
  const jobs = await getDubbingJobs()
  const created = []

  for (const language of languages) {
    const exists = jobs.find(job => Number(job.videoId) === Number(videoId) && job.language === language && ["queued", "submitted", "processing"].includes(job.status))
    if (exists) {
      continue
    }

    const job = {
      id: crypto.randomBytes(10).toString("hex"),
      videoId: Number(videoId),
      language,
      provider,
      status: webhook ? "submitted" : "queued",
      audioUrl: "",
      error: "",
      createdAt: nowIso(),
      updatedAt: nowIso()
    }

    if (webhook) {
      try {
        const response = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(job)
        })
        if (!response.ok) {
          job.status = "failed"
          job.error = "Webhook rejected request"
        }
      } catch {
        job.status = "failed"
        job.error = "Webhook request failed"
      }
    }

    created.push(job)
  }

  if (created.length > 0) {
    await saveDubbingJobs([...jobs, ...created])
  }

  return created
}
async function importByProvider({ provider, query, maxResults, env }) {
  if (provider === "youtube") {
    if (!env.YOUTUBE_API_KEY) {
      throw createHttpError(400, "YOUTUBE_API_KEY is not configured")
    }
    return importFromYouTube({ query, maxResults, apiKey: env.YOUTUBE_API_KEY })
  }

  if (provider === "vimeo") {
    if (!env.VIMEO_ACCESS_TOKEN) {
      throw createHttpError(400, "VIMEO_ACCESS_TOKEN is not configured")
    }
    return importFromVimeo({ query, maxResults, accessToken: env.VIMEO_ACCESS_TOKEN })
  }

  if (provider === "dailymotion") {
    return importFromDailymotion({ query, maxResults })
  }

  if (provider === "pexels") {
    if (!env.PEXELS_API_KEY) {
      throw createHttpError(400, "PEXELS_API_KEY is not configured")
    }
    return importFromPexels({ query, maxResults, apiKey: env.PEXELS_API_KEY })
  }

  if (provider === "pixabay") {
    if (!env.PIXABAY_API_KEY) {
      throw createHttpError(400, "PIXABAY_API_KEY is not configured")
    }
    return importFromPixabay({ query, maxResults, apiKey: env.PIXABAY_API_KEY })
  }

  if (provider === "peertube") {
    return importFromPeerTube({
      query,
      maxResults,
      baseUrl: env.PEERTUBE_BASE_URL || "https://peertube.tv"
    })
  }

  if (provider === "archive") {
    return importFromArchive({ query, maxResults })
  }

  if (provider === "omdb") {
    const key = getOmdbApiKey(env)
    if (!key) {
      throw createHttpError(400, "OMDB_API_KEY is not configured")
    }
    return importFromOmdb({ query, maxResults, apiKey: key })
  }

  if (provider === "watchmode") {
    const key = getWatchmodeApiKey(env)
    if (!key) {
      throw createHttpError(400, "WATCHMODE_API_KEY is not configured")
    }
    return importFromWatchmode({ query, maxResults, apiKey: key, youtubeApiKey: env.YOUTUBE_API_KEY || "" })
  }

  if (provider === "trakt") {
    const key = getTraktApiKey(env)
    if (!key) {
      throw createHttpError(400, "TRAKT_CLIENT_ID is not configured")
    }
    return importFromTrakt({ query, maxResults, apiKey: key })
  }

  throw createHttpError(400, "Unsupported provider")
}

async function persistImportedVideos(importedAll) {
  const videos = await getVideos()
  const existingKeys = new Set(videos.map(v => `${v.source}:${v.videoId}`))
  let nextId = videos.reduce((max, v) => Math.max(max, Number(v.id) || 0), 0) + 1

  const newVideos = []
  importedAll.forEach(video => {
    const dedupeKey = `${video.source}:${video.videoId}`
    if (!isPlayableVideo(video) || !video.videoId || existingKeys.has(dedupeKey)) {
      return
    }

    if (!isPlayableVideo(video)) {
      if (!video.rejected || video.approved || video.homepage || video.moderationStatus !== "rejected_unplayable" || video.moderationReason !== "unplayable-source") {
        video.rejected = true
        video.approved = false
        video.homepage = false
        video.moderationStatus = "rejected_unplayable"
        video.moderationReason = "unplayable-source"
        video.updatedAt = nowIso()
        changed = true
      }
      
    }

    const decision = getModerationDecision(video)

    newVideos.push({
      ...video,
      id: nextId++,
      approved: decision.requiresReview ? false : true,
      homepage: decision.requiresReview ? false : true,
      rejected: false,
      moderationStatus: decision.status,
      moderationReason: decision.reason
    })
    existingKeys.add(dedupeKey)
  })

  if (newVideos.length > 0) {
    await saveVideos([...videos, ...newVideos])
  }

  return newVideos
}

function parseAutoImportConfig(env) {
  const enabled = String(env.AUTO_IMPORT_ENABLED || "false").toLowerCase() === "true"
  const intervalSecondsRaw = Number(env.AUTO_IMPORT_INTERVAL_SECONDS)
  const intervalMs = Number.isFinite(intervalSecondsRaw) && intervalSecondsRaw > 0
    ? Math.max(1, intervalSecondsRaw) * 1000
    : Math.max(1, Number(env.AUTO_IMPORT_INTERVAL_MINUTES) || 30) * 60 * 1000

  const maxResults = Math.min(100, Math.max(1, Number(env.AUTO_IMPORT_MAX_RESULTS) || 20))
  const provider = String(env.AUTO_IMPORT_PROVIDER || "all").trim().toLowerCase()
  const queries = String(env.AUTO_IMPORT_QUERIES || "trending news,latest music,new movie trailer,bollywood movie")
    .split(",")
    .map(item => item.trim())
    .filter(Boolean)

  return { enabled, intervalMs, maxResults, provider, queries }
}
async function runAutoImportOnce(config, env) {
  const providers = ["youtube", "vimeo", "dailymotion", "pexels", "pixabay", "peertube", "archive", "omdb", "watchmode", "trakt"]
  const targetProviders = config.provider === "all" ? providers : [config.provider]

  for (const query of config.queries) {
    const importedAll = []

    for (const provider of targetProviders) {
      try {
        const imported = await importByProvider({
          provider,
          query,
          maxResults: config.maxResults,
          env
        })
        importedAll.push(...imported)
      } catch (err) {
        console.warn(`[AUTO_IMPORT] ${provider} failed for query "${query}": ${err.message}`)
      }
    }

    const newVideos = await persistImportedVideos(importedAll)
    if (newVideos.length > 0) {
      const autoPublished = newVideos.filter(v => v.approved && v.homepage).length
      const reviewQueue = newVideos.length - autoPublished
      console.log(`[AUTO_IMPORT] Added ${newVideos.length} videos | auto-published: ${autoPublished} | review: ${reviewQueue} | query: ${query}`)
    }
  }
}
async function backfillVideoClassification() {
  const videos = await getVideos()
  let changed = false

  for (const video of videos) {
    const normalizedCategory = String(video.category || deriveCategory(video.title || "")).toLowerCase()
    const normalizedLanguage = String(video.language || deriveLanguage(video.title || "")).toLowerCase()

    if (video.category !== normalizedCategory) {
      video.category = normalizedCategory
      changed = true
    }

    if (video.language !== normalizedLanguage) {
      video.language = normalizedLanguage
      changed = true
    }

    if (!isPlayableVideo(video)) {
      if (!video.rejected || video.approved || video.homepage || video.moderationStatus !== "rejected_unplayable" || video.moderationReason !== "unplayable-source") {
        video.rejected = true
        video.approved = false
        video.homepage = false
        video.moderationStatus = "rejected_unplayable"
        video.moderationReason = "unplayable-source"
        video.updatedAt = nowIso()
        changed = true
      }
      continue
    }

    const decision = getModerationDecision(video)
    if (applyModerationDecision(video, decision)) {
      changed = true
    }
  }

  if (changed) {
    await saveVideos(videos)
  }
}

async function runAutoHealCycle() {
  const videos = await getVideos()
  const comments = await getComments()

  let videoChanged = false
  let commentChanged = false
  let nextId = videos.reduce((max, video) => Math.max(max, Number(video.id) || 0), 0) + 1
  const seenIds = new Set()

  for (let index = 0; index < videos.length; index += 1) {
    const original = videos[index]
    const normalized = normalizeVideo(original, index + 1)

    if (seenIds.has(normalized.id)) {
      normalized.id = nextId
      nextId += 1
      videoChanged = true
    }
    seenIds.add(normalized.id)

    if (normalized.rejected) {
      if (normalized.approved || normalized.homepage) {
        normalized.approved = false
        normalized.homepage = false
        normalized.updatedAt = nowIso()
        videoChanged = true
      }
    }

    if (!normalized.approved && normalized.homepage) {
      normalized.homepage = false
      normalized.updatedAt = nowIso()
      videoChanged = true
    }

    const decision = getModerationDecision(normalized)
    if (applyModerationDecision(normalized, decision)) {
      videoChanged = true
    }

    if (JSON.stringify(original) !== JSON.stringify(normalized)) {
      videos[index] = normalized
      videoChanged = true
    }
  }

  const validVideoIds = new Set(videos.map(video => Number(video.id)))
  const nextComments = comments.filter(comment => {
    if (!Number.isFinite(Number(comment?.videoId))) {
      commentChanged = true
      return false
    }
    if (!String(comment?.text || "").trim()) {
      commentChanged = true
      return false
    }
    if (!validVideoIds.has(Number(comment.videoId))) {
      commentChanged = true
      return false
    }
    return true
  })

  if (videoChanged) {
    await saveVideos(videos)
  }

  if (commentChanged) {
    await saveComments(nextComments)
  }

  return {
    videosUpdated: videoChanged,
    commentsUpdated: commentChanged,
    totalVideos: videos.length,
    totalComments: nextComments.length
  }
}

function detectAssistantIntent(message) {
  const text = String(message || "").toLowerCase()
  if (!text.trim()) return "help"

  if (text.includes("movie") || text.includes("film") || text.includes("trailer")) return "movies"
  if (text.includes("music") || text.includes("song") || text.includes("album")) return "music"
  if (text.includes("news") || text.includes("live")) return "news"
  if (text.includes("game") || text.includes("gaming")) return "gaming"
  if (text.includes("search") || text.includes("find")) return "search"
  if (text.includes("admin") || text.includes("approve") || text.includes("reject")) return "admin"
  if (text.includes("language") || text.includes("dub")) return "language"
  return "help"
}

function buildAssistantReply(intent) {
  if (intent === "movies") return "Movies dekhne ke liye homepage par Movies chip ya category filter use karein. Agar dub chahiye to player me dub language select karein."
  if (intent === "music") return "Music ke liye Music category/chip use karein. Search box me artist ya song name likh kar Enter dabayein."
  if (intent === "news") return "News ya Live content ke liye News category select karein aur Live TV page se live channels chalayen."
  if (intent === "gaming") return "Gaming videos ke liye Gaming category choose karein. Search me game ka naam dal kar results refine kar sakte hain."
  if (intent === "search") return "Search box me keyword likhkar Enter ya Search button dabayein. Category/language filters se result aur accurate hoga."
  if (intent === "admin") return "Admin page par login karke videos approve/reject/hide kar sakte hain. Sirf approved + homepage videos public feed me dikhte hain."
  if (intent === "language") return "Top language button se preferred language choose karein. Dub available hoga to player auto-dub apply karega, warna original audio chalega."
  return "Main aapki help ke liye hoon. Aap search, category, language, admin approval, live tv ya dub ke baare me pooch sakte hain."
}

function pickAssistantRecommendations(videos, intent, category, search) {
  let filtered = [...videos]

  if (search) {
    const q = String(search).toLowerCase()
    filtered = filtered.filter(video => String(video.title || "").toLowerCase().includes(q))
  }

  if (category && category !== "all") {
    filtered = filtered.filter(video => String(video.category || "general").toLowerCase() === String(category).toLowerCase())
  } else {
    if (intent === "movies") filtered = filtered.filter(video => String(video.category || "").toLowerCase() === "movies")
    if (intent === "music") filtered = filtered.filter(video => String(video.category || "").toLowerCase() === "music")
    if (intent === "news") filtered = filtered.filter(video => ["news", "live"].includes(String(video.category || "").toLowerCase()))
    if (intent === "gaming") filtered = filtered.filter(video => String(video.category || "").toLowerCase() === "gaming")
  }

  return filtered.slice(0, 8)
}

function createApp() {
  const app = express()

  app.use(express.json({ limit: "150kb" }))

  const studioAccessKey = String(process.env.STUDIO_ACCESS_KEY || "")
  app.use((req, res, next) => {
    if (req.path !== "/studio.html") return next()

    if (!studioAccessKey) {
      return res.status(404).send("Not Found")
    }

    const provided = String(req.query.key || req.headers["x-studio-key"] || "")
    if (!provided || !secureTokenEqual(provided, studioAccessKey)) {
      return res.status(404).send("Not Found")
    }

    return next()
  })

  app.use(express.static("public"))

  const adminPassword = process.env.ADMIN_PASSWORD || ""
  const adminTokenFallback = process.env.ADMIN_TOKEN || ""

  const requireAdmin = (req, res, next) => {
    cleanupExpiredSessions()
    const token = getAuthToken(req)
    if (!token) {
      return next(createHttpError(401, "Unauthorized"))
    }

    if (adminTokenFallback && secureTokenEqual(token, adminTokenFallback)) {
      return next()
    }

    const session = adminSessions.get(token)
    if (!session || session.expiresAt <= Date.now()) {
      return next(createHttpError(401, "Unauthorized"))
    }

    return next()
  }

  backfillVideoClassification()
    .then(() => console.log("[AUTO_CLASSIFY] classification backfill completed"))
    .catch(err => console.error("[AUTO_CLASSIFY] classification backfill failed", err.message))
  const autoImportConfig = parseAutoImportConfig(process.env)
  if (autoImportConfig.enabled) {
    console.log(`[AUTO_IMPORT] initialized | provider=${autoImportConfig.provider} | intervalMs=${autoImportConfig.intervalMs}`)
    let autoImportRunning = false
    const runAutoImportSafe = async (label) => {
      if (autoImportRunning) {
        return
      }
      autoImportRunning = true
      try {
        await runAutoImportOnce(autoImportConfig, process.env)
      } catch (err) {
        console.error(`[AUTO_IMPORT] ${label} failed`, err.message)
      } finally {
        autoImportRunning = false
      }
    }

    runAutoImportSafe("initial run")

    setInterval(() => {
      runAutoImportSafe("interval run")
    }, autoImportConfig.intervalMs)
  }

  const autoHealEnabled = String(process.env.AUTO_HEAL_ENABLED || "true").toLowerCase() === "true"
  const autoHealIntervalMinutes = Math.max(1, Number(process.env.AUTO_HEAL_INTERVAL_MINUTES) || 15)
  if (autoHealEnabled) {
    runAutoHealCycle()
      .then(result => console.log(`[AUTO_HEAL] startup complete | videos=${result.totalVideos} comments=${result.totalComments}`))
      .catch(err => console.error("[AUTO_HEAL] startup failed", err.message))

    setInterval(() => {
      runAutoHealCycle().catch(err => {
        console.error("[AUTO_HEAL] interval failed", err.message)
      })
    }, autoHealIntervalMinutes * 60 * 1000)
  }
  app.get("/api/health", (req, res) => {
    res.json({ ok: true })
  })

  app.get(
    "/api/videos",
    asyncHandler(async (req, res) => {
      const videos = await getVideos()
      const publicVideos = videos.filter(v => v.approved && v.homepage && !v.rejected && isPlayableVideo(v))
      res.json(publicVideos)
    })
  )

  app.get(
    "/api/videos/trending",
    asyncHandler(async (req, res) => {
      const [videos, comments] = await Promise.all([getVideos(), getComments()])
      const publicVideos = videos.filter(v => v.approved && v.homepage && !v.rejected && isPlayableVideo(v))
      res.json(getTrendingVideos(publicVideos, comments))
    })
  )

  app.get(
    "/api/categories",
    asyncHandler(async (req, res) => {
      const videos = await getVideos()
      const defaults = ["general", "music", "gaming", "live", "technology", "movies", "news", "sports", "education", "travel"]
      const fromPublicVideos = videos
        .filter(v => v.approved && v.homepage && !v.rejected)
        .map(v => String(v.category || deriveCategory(v.title || "")).toLowerCase())

      const categories = [...new Set([...defaults, ...fromPublicVideos])].sort()
      res.json(categories)
    })
  )

  app.get(
    "/api/languages",
    asyncHandler(async (req, res) => {
      const videos = await getVideos()
      const indianDefaults = ["hi", "bn", "ta", "te", "mr", "gu", "kn", "ml", "pa", "ur", "as", "or", "sa", "ne", "kok", "doi", "mai", "bho", "sat", "hne", "mni", "sd"]
      const fromPublicVideos = videos
        .filter(v => v.approved && v.homepage && !v.rejected)
        .map(v => String(v.language || deriveLanguage(v.title || "")).toLowerCase())

      const languages = [...new Set([...indianDefaults, ...fromPublicVideos])].sort()
      res.json(languages)
    })
  )
  app.get(
    "/api/live-tv",
    asyncHandler(async (req, res) => {
      const language = typeof req.query.language === "string" ? req.query.language.trim().toLowerCase() : ""

      const category = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : ""
      const country = typeof req.query.country === "string" ? req.query.country.trim().toUpperCase() : ""
      const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""

      let channels = await getLiveTvChannels()

      const limit = Math.min(10000, Math.max(1, Number(req.query.limit) || 10000))

      if (language && language !== "all") {
        channels = channels.filter(ch => String(ch.language || "").toLowerCase() === language)
      }

      if (category && category !== "all") {
        channels = channels.filter(ch => String(ch.category || "").toLowerCase() === category)
      }

      if (country && country !== "ALL") {
        channels = channels.filter(ch => String(ch.country || "").toUpperCase() === country)
      }

      if (q) {
        channels = channels.filter(ch => {
          const hay = `${ch.name} ${ch.country} ${ch.language} ${ch.category}`.toLowerCase()
          return hay.includes(q)
        })
      }

      res.json(channels.slice(0, limit))
    })
  )
  app.get(
    "/api/video/:id",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const index = videos.findIndex(v => Number(v.id) === id && v.approved && !v.rejected && isPlayableVideo(v))
      const video = index >= 0 ? videos[index] : null

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const enriched = await enrichYouTubeVideoMetadata(video, process.env.YOUTUBE_API_KEY || "")
      if (enriched.channelId !== video.channelId || enriched.channelName !== video.channelName || Number(enriched.subscriberCount) !== Number(video.subscriberCount)) {
        videos[index] = enriched
        await saveVideos(videos)
      }

      res.json(enriched)
    })
  )

  app.get(
    "/api/video/:id/omdb",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id && v.approved && !v.rejected)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const apiKey = getOmdbApiKey(process.env)
      if (!apiKey) {
        return res.json({ enabled: false, reason: "omdb-api-key-missing", data: null })
      }

      const title = String(video.title || "")
      const data = await fetchOmdbByTitle(title, apiKey).catch(() => null)
      return res.json({
        enabled: true,
        videoId: video.id,
        title,
        data
      })
    })
  )

  app.get(
    "/api/video/:id/watchmode",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id && v.approved && !v.rejected)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const apiKey = getWatchmodeApiKey(process.env)
      if (!apiKey) {
        return res.json({ enabled: false, reason: "watchmode-api-key-missing", results: [] })
      }

      const title = String(video.title || "")
      const results = await fetchWatchmodeByTitle(title, apiKey).catch(() => [])
      return res.json({
        enabled: true,
        videoId: video.id,
        title,
        results
      })
    })
  )

  app.get(
    "/api/video/:id/trakt",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id && v.approved && !v.rejected)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const apiKey = getTraktApiKey(process.env)
      if (!apiKey) {
        return res.json({ enabled: false, reason: "trakt-api-key-missing", results: [] })
      }

      const title = String(video.title || "")
      const results = await fetchTraktByTitle(title, apiKey).catch(() => [])
      return res.json({
        enabled: true,
        videoId: video.id,
        title,
        results
      })
    })
  )

  app.get(
    "/api/video/:id/source-comments",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20))
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id && v.approved && !v.rejected)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const source = String(video.source || "").toLowerCase()
      if (source !== "youtube" && source !== "local") {
        return res.json({ source, comments: [], reason: "source-not-supported" })
      }

      if (!video.videoId) {
        return res.json({ source, comments: [], reason: "video-id-missing" })
      }

      const apiKey = String(process.env.YOUTUBE_API_KEY || "").trim()
      if (!apiKey) {
        return res.json({ source: "youtube", comments: [], reason: "youtube-api-key-missing" })
      }

      const comments = await fetchYouTubeTopComments(video.videoId, apiKey, limit)
      return res.json({ source: "youtube", comments, reason: comments.length ? "ok" : "empty" })
    })
  )

  app.get(
    "/api/video/:id/dubs",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const jobs = await getDubbingJobs()
      res.json(jobs.filter(job => Number(job.videoId) === id))
    })
  )
  app.post(
    "/api/video/:id/view",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id && v.approved && !v.rejected)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      video.views = (Number(video.views) || 0) + 1
      video.updatedAt = nowIso()
      await saveVideos(videos)

      res.json({ id: video.id, views: video.views })
    })
  )

  app.get(
    "/api/comments/:id",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const comments = await getComments()
      const videoComments = comments.filter(c => Number(c.videoId) === id)
      res.json(videoComments)
    })
  )

  app.post(
    "/api/comments",
    asyncHandler(async (req, res) => {
      const videoId = parsePositiveInt(req.body.videoId, "video id")
      const text = normalizeString(req.body.text, "text", 500)

      const [videos, comments] = await Promise.all([getVideos(), getComments()])
      const video = videos.find(v => Number(v.id) === videoId && v.approved && !v.rejected)
      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const newComment = {
        id: Date.now(),
        videoId,
        text,
        createdAt: nowIso()
      }

      comments.push(newComment)
      await saveComments(comments)
      res.status(201).json(newComment)
    })
  )

  app.get(
    "/api/search",
    asyncHandler(async (req, res) => {
      const country = typeof req.query.country === "string" ? req.query.country.trim().toUpperCase() : ""
      const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
      if (!q) {
        return res.json([])
      }

      const videos = await getVideos()
      const result = videos.filter(v => v.approved && !v.rejected && isPlayableVideo(v) && String(v.title || "").toLowerCase().includes(q))
      return res.json(result)
    })
  )
  app.post(
    "/api/assistant",
    asyncHandler(async (req, res) => {
      const rawMessage = typeof req.body.message === "string" ? req.body.message.trim() : ""
      const category = typeof req.body.category === "string" ? req.body.category.trim().toLowerCase() : ""
      const search = typeof req.body.search === "string" ? req.body.search.trim().toLowerCase() : ""

      const intent = detectAssistantIntent(rawMessage)
      const reply = buildAssistantReply(intent)

      const videos = await getVideos()
      const publicVideos = videos.filter(v => v.approved && v.homepage && !v.rejected && isPlayableVideo(v))
      const recommendations = pickAssistantRecommendations(publicVideos, intent, category, search)

      res.json({
        reply,
        intent,
        recommendations: recommendations.map(video => ({
          id: video.id,
          title: video.title,
          category: video.category,
          language: video.language,
          thumbnailUrl: getThumbnailUrl(video)
        }))
      })
    })
  )

  app.post(
    "/api/like/:id",
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id && v.approved && !v.rejected)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      video.likes = (Number(video.likes) || 0) + 1
      video.updatedAt = nowIso()
      await saveVideos(videos)

      res.json(video)
    })
  )

  app.get(
    "/api/favorite",
    asyncHandler(async (req, res) => {
      const favorites = await getFavorites()
      res.json(favorites)
    })
  )

  app.post(
    "/api/favorite",
    asyncHandler(async (req, res) => {
      const videoId = parsePositiveInt(req.body.videoId, "video id")
      const [videos, favorites] = await Promise.all([getVideos(), getFavorites()])

      const video = videos.find(v => Number(v.id) === videoId && v.approved && !v.rejected)
      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      if (!favorites.includes(videoId)) {
        favorites.push(videoId)
        await saveFavorites(favorites)
      }

      res.status(201).json({ videoId })
    })
  )

  app.post(
    "/api/admin/login",
    asyncHandler(async (req, res) => {
      assertLoginRateLimit(req)

      if (!adminPassword) {
        throw createHttpError(500, "ADMIN_PASSWORD is not configured")
      }

      const password = normalizeString(req.body.password, "password", 200)
      if (!secureTokenEqual(password, adminPassword)) {
        trackFailedLogin(req)
        throw createHttpError(401, "Invalid password")
      }

      clearLoginAttempts(req)
      const token = crypto.randomBytes(24).toString("hex")
      adminSessions.set(token, {
        createdAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS
      })

      res.json({ token, expiresInMs: SESSION_TTL_MS })
    })
  )

  app.post(
    "/api/admin/logout",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const token = getAuthToken(req)
      adminSessions.delete(token)
      res.json({ ok: true })
    })
  )

  app.get(
    "/api/admin/me",
    requireAdmin,
    asyncHandler(async (req, res) => {
      res.json({ ok: true })
    })
  )
  app.post(
    "/api/admin/self-heal",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const result = await runAutoHealCycle()
      res.json({ ok: true, result })
    })
  )

  app.get(
    "/api/admin/providers",
    requireAdmin,
    asyncHandler(async (req, res) => {
      res.json(getProviderConfig(process.env))
    })
  )

  app.get(
    "/api/admin/categories",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const videos = await getVideos()
      const defaults = ["general", "music", "gaming", "movies", "news", "technology", "sports", "education", "travel"]
      const fromVideos = videos.map(v => String(v.category || deriveCategory(v.title || "")).toLowerCase())
      const categories = [...new Set([...defaults, ...fromVideos])].sort()
      res.json({ total: categories.length, categories })
    })
  )
  app.get(
    "/api/admin/sources",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const videos = await getVideos()
      const defaults = ["local", "youtube", "vimeo", "dailymotion", "pexels", "pixabay", "peertube", "archive", "omdb", "watchmode", "trakt"]
      const fromVideos = videos.map(v => String(v.source || "local").toLowerCase())
      const sources = [...new Set([...defaults, ...fromVideos])].sort()
      res.json({ total: sources.length, sources })
    })
  )
  app.get(
    "/api/admin/languages",
    requireAdmin,
    asyncHandler(async (req, res) => {
      res.json({
        total: SUPPORTED_LANGUAGES.length,
        languages: SUPPORTED_LANGUAGES
      })
    })
  )

  app.get(
    "/api/admin/dubbing/jobs",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const jobs = await getDubbingJobs()
      if (!req.query.videoId) {
        return res.json(jobs)
      }

      const id = parsePositiveInt(req.query.videoId, "video id")
      return res.json(jobs.filter(job => Number(job.videoId) === id))
    })
  )

  app.post(
    "/api/admin/dub/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const provider = typeof req.body.provider === "string" ? req.body.provider : "generic"
      const inputLanguages = Array.isArray(req.body.languages) ? req.body.languages : []

      const normalized = [...new Set(inputLanguages.map(lang => String(lang).trim().toLowerCase()))]
        .filter(lang => SUPPORTED_LANGUAGES.includes(lang))

      if (normalized.length === 0) {
        throw createHttpError(400, "No valid languages provided")
      }

      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id)
      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const jobs = await createDubbingJobs({
        videoId: id,
        languages: normalized,
        provider,
        env: process.env
      })

      res.json({ queued: jobs.length, jobs })
    })
  )

  app.post(
    "/api/admin/dub-all/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const provider = typeof req.body.provider === "string" ? req.body.provider : "generic"

      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id)
      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      const jobs = await createDubbingJobs({
        videoId: id,
        languages: SUPPORTED_LANGUAGES,
        provider,
        env: process.env
      })

      res.json({ queued: jobs.length, jobs })
    })
  )
  app.get(
    "/api/admin/videos",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const status = typeof req.query.status === "string" ? req.query.status : "all"
      const videos = await getVideos()

      let filtered = videos.filter(isPlayableVideo)
      if (status === "pending") {
        filtered = videos.filter(v => getVideoStatus(v) === "pending")
      } else if (status === "approved") {
        filtered = videos.filter(v => getVideoStatus(v) === "approved")
      } else if (status === "rejected") {
        filtered = videos.filter(v => getVideoStatus(v) === "rejected")
      }

      const country = typeof req.query.country === "string" ? req.query.country.trim().toUpperCase() : ""
      const q = typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : ""
      if (q) {
        filtered = filtered.filter(v => {
          const inTitle = String(v.title || "").toLowerCase().includes(q)
          const inId = String(v.id || "").includes(q)
          const inVideoId = String(v.videoId || "").toLowerCase().includes(q)
          const inSource = String(v.source || "").toLowerCase().includes(q)
          const inCategory = String(v.category || "").toLowerCase().includes(q)
          const inLanguage = String(v.language || "").toLowerCase().includes(q)
          return inTitle || inId || inVideoId || inSource || inCategory || inLanguage
        })
      }

      if (country && country !== "ALL") {
        filtered = filtered.filter(v => String(v.country || "").toUpperCase() === country)
      }

      const category = typeof req.query.category === "string" ? req.query.category.trim().toLowerCase() : ""
      if (category && category !== "all") {
        filtered = filtered.filter(v => String(v.category || "general").toLowerCase() === category)
      }

      const language = typeof req.query.language === "string" ? req.query.language.trim().toLowerCase() : ""
      if (language && language !== "all") {
        filtered = filtered.filter(v => String(v.language || "en").toLowerCase() === language)
      }

      const source = typeof req.query.source === "string" ? req.query.source.trim().toLowerCase() : ""
      if (source && source !== "all") {
        filtered = filtered.filter(v => String(v.source || "local").toLowerCase() === source)
      }

      res.json(
        filtered.map(v => ({
          ...v,
          status: getVideoStatus(v),
          thumbnailUrl: getThumbnailUrl(v)
        }))
      )
    })
  )

  app.get(
    "/api/admin/stats",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const videos = await getVideos()
      const stats = {
        total: videos.length,
        pending: 0,
        approved: 0,
        rejected: 0,
        homepage: 0
      }

      videos.forEach(video => {
        const status = getVideoStatus(video)
        if (status === "pending") stats.pending += 1
        if (status === "approved") stats.approved += 1
        if (status === "rejected") stats.rejected += 1
        if (video.homepage && status === "approved") stats.homepage += 1
      })

      res.json(stats)
    })
  )

  app.post(
    "/api/admin/import-videos",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const query = normalizeString(req.body.query, "query", 120)
      const maxResults = Math.min(100, Math.max(1, Number(req.body.maxResults) || 10))
      const provider = typeof req.body.provider === "string" ? req.body.provider.trim().toLowerCase() : "youtube"

      const providers = ["youtube", "vimeo", "dailymotion", "pexels", "pixabay", "peertube", "archive", "omdb", "watchmode", "trakt"]
      if (provider !== "all" && !providers.includes(provider)) {
        throw createHttpError(400, "Unsupported provider")
      }

      const targetProviders = provider === "all" ? providers : [provider]
      const importedAll = []
      const providerErrors = []

      for (const target of targetProviders) {
        try {
          const imported = await importByProvider({ provider: target, query, maxResults, env: process.env })
          importedAll.push(...imported)
        } catch (err) {
          providerErrors.push({ provider: target, error: err.message || "Import failed" })
        }
      }
      const newVideos = await persistImportedVideos(importedAll)


      res.json({
        imported: newVideos.length,
        videos: newVideos,
        providerErrors
      })
    })
  )

  app.post(
    "/api/admin/import-youtube",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const query = normalizeString(req.body.query, "query", 120)
      const maxResults = Math.min(100, Math.max(1, Number(req.body.maxResults) || 10))

      const importedAll = await importByProvider({
        provider: "youtube",
        query,
        maxResults,
        env: process.env
      })
      const newVideos = await persistImportedVideos(importedAll)


      res.json({ imported: newVideos.length, videos: newVideos, providerErrors: [] })
    })
  )

  app.post(
    "/api/admin/approve/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      video.approved = true
      video.rejected = false
      video.homepage = true
      video.updatedAt = nowIso()

      await saveVideos(videos)
      res.json(video)
    })
  )

  app.post(
    "/api/admin/reject/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      video.approved = false
      video.rejected = true
      video.homepage = false
      video.updatedAt = nowIso()

      await saveVideos(videos)
      res.json(video)
    })
  )

  app.post(
    "/api/admin/toggle/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const id = parsePositiveInt(req.params.id, "video id")
      const videos = await getVideos()
      const video = videos.find(v => Number(v.id) === id)

      if (!video) {
        throw createHttpError(404, "Video not found")
      }

      if (!video.approved || video.rejected) {
        throw createHttpError(400, "Only approved videos can be shown on homepage")
      }

      video.homepage = !video.homepage
      video.updatedAt = nowIso()

      await saveVideos(videos)
      res.json(video)
    })
  )

  app.use((req, res) => {
    res.status(404).json({ error: "Route not found" })
  })

  app.use((err, req, res, next) => {
    const status = Number(err.status) || 500
    const message = status >= 500 ? "Internal server error" : err.message

    if (status >= 500) {
      console.error(err)
    }

    res.status(status).json({ error: message })
  })

  return app
}

if (require.main === module) {
  const app = createApp()
  const port = Number(process.env.PORT) || 3000
  app.listen(port, () => console.log(`NovaPlay running on port ${port}`))
}

module.exports = { createApp }



































































































































