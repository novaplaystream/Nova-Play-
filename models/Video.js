const mongoose = require("mongoose")

const videoSchema = new mongoose.Schema({
  title: String,
  videoId: { type: String, unique: true },
  views: Number,
  likes: Number,
  category: String,
  language: String,
  thumbnailUrl: String,
  source: String,
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
  createdAt: String,
  updatedAt: String,
  creatorEmail: String,
  creatorChannelId: String,
  creatorChannelName: String
})

module.exports = mongoose.model("Video", videoSchema)
