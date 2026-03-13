const mongoose = require("mongoose")

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  videoId: { type: String, index: true },
  views: Number,
  likes: Number,
  category: String,
  language: String,
  description: String,
  tags: [String],
  hashtags: [String],
  thumbnailUrl: String,
  source: { type: String, index: true },
  approved: Boolean,
  homepage: Boolean,
  rejected: Boolean,
  playbackUrl: String,
  publishedAt: String,
  uploadedAt: String,
  channelId: String,
  channelName: String,
  subscriberCount: Number,
  moderationStatus: String,
  moderationReason: String,
  country: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  creatorEmail: String,
  creatorChannelId: String,
  creatorChannelName: String
})

videoSchema.index({ source: 1, videoId: 1 }, { unique: true, partialFilterExpression: { videoId: { $type: "string", $ne: "" } } })

module.exports = mongoose.model("Video", videoSchema)
