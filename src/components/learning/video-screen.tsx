import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle, Video, Clock, Loader2 } from "lucide-react"

interface VideoScreenProps {
  lesson: {
    id: string
    title: string
    videoUrl: string
    duration: number
  }
  onComplete: () => void
  isCompleted: boolean
}

export function VideoScreen({ lesson, onComplete, isCompleted }: VideoScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const isYouTube = lesson.videoUrl?.includes("youtube.com") || lesson.videoUrl?.includes("youtu.be")
  const isVimeo = lesson.videoUrl?.includes("vimeo.com")

  useEffect(() => {
    // Track video progress
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setIsLoading(false)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)
    video.addEventListener("play", handlePlay)
    video.addEventListener("pause", handlePause)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
      video.removeEventListener("play", handlePlay)
      video.removeEventListener("pause", handlePause)
    }
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const videoProgress = duration > 0 ? (currentTime / duration) * 100 : 0

  const getEmbedUrl = (url: string) => {
    if (isYouTube) {
      const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1]
      return videoId ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1` : url
    }
    if (isVimeo) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1]
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url
    }
    return url
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Card className="border border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="w-6 h-6 text-[#0158B7]" />
              <div>
                <CardTitle className="text-xl text-gray-900">{lesson.title}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Clock className="w-4 h-4" />
                  <span>{lesson.duration > 0 ? `${lesson.duration} minutes` : "Self-paced"}</span>
                </div>
              </div>
            </div>
            {!isCompleted && (
              <Button 
                onClick={onComplete} 
                className="flex items-center gap-2 bg-[#0158B7] hover:bg-[#014A9C]"
              >
                <CheckCircle className="w-4 h-4" />
                Mark Complete
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {lesson.videoUrl ? (
            <div className="space-y-4">
              {/* Video Player */}
              <div className="bg-black aspect-video relative rounded-lg overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <Loader2 className="w-8 h-8 animate-spin text-white" />
                  </div>
                )}
                
                {isYouTube || isVimeo ? (
                  <iframe
                    src={getEmbedUrl(lesson.videoUrl)}
                    title={lesson.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    onLoad={() => setIsLoading(false)}
                  />
                ) : (
                  <video
                    ref={videoRef}
                    src={lesson.videoUrl}
                    controls
                    className="w-full h-full"
                    controlsList="nodownload"
                  >
                    Your browser does not support the video tag.
                  </video>
                )}
              </div>

              {/* Video Progress Bar (for non-embedded videos) */}
              {!isYouTube && !isVimeo && duration > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{Math.round(videoProgress)}% watched</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#0158B7] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${videoProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Video className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-gray-600">No video available for this lesson yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}