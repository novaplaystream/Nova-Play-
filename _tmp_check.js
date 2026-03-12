(function(){
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
    "/api/live-dub/status",
    (req, res) => {
      const channelId = typeof req.query.channelId === "string" ? req.query.channelId.trim() : ""
      res.json({
        enabled: LIVE_DUBBING_ENABLED,
        provider: LIVE_DUBBING_PROVIDER,
        languages: LIVE_DUBBING_LANGS,
        credentialsConfigured: LIVE_DUBBING_HAS_CREDS,
        availableLanguages: channelId ? getAvailableDubLanguages(channelId) : []
      })
    })
  )

  app.post(
    "/api/live-dub/start",
    asyncHandler(async (req, res) => {
      const channelId = String(req.body.channelId || "").trim()
      const streamUrl = String(req.body.streamUrl || "").trim()
      const sourceLang = String(req.body.sourceLang || "en").trim().toLowerCase()
      const result = await startLiveDubbing({ channelId, streamUrl, sourceLang })
      res.json(result)
    })
  )

  app.post(
})()
