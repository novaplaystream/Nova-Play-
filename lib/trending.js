function getVideoAgeHours(video){
const dateField=video.publishedAt||video.createdAt||video.uploadedAt
if(!dateField){
return 24*14
}

const publishedMs=new Date(dateField).getTime()
if(Number.isNaN(publishedMs)){
return 24*14
}

const ageMs=Date.now()-publishedMs
return Math.max(ageMs/(1000*60*60),1)
}

function getTrendingScore(video,commentsCount){
const views=Number(video.views)||0
const likes=Number(video.likes)||0
const comments=Number(commentsCount)||0
const ageHours=getVideoAgeHours(video)

const engagement=(views*1)+(likes*4)+(comments*3)
const recencyBoost=1/(1+Math.pow(ageHours/24,1.25))

return engagement*recencyBoost
}

function getTrendingVideos(videos,comments){
const commentsByVideo=comments.reduce((acc,c)=>{
const key=String(c.videoId)
acc[key]=(acc[key]||0)+1
return acc
},{})

return [...videos]
.filter(v=>v.homepage)
.sort((a,b)=>{
const scoreA=getTrendingScore(a,commentsByVideo[String(a.id)]||0)
const scoreB=getTrendingScore(b,commentsByVideo[String(b.id)]||0)
if(scoreB!==scoreA){
return scoreB-scoreA
}
return (Number(b.views)||0)-(Number(a.views)||0)
})
}

module.exports={
getVideoAgeHours,
getTrendingScore,
getTrendingVideos

}


