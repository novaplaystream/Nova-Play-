const app={get:()=>{}};
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

