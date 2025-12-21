"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Settings,
  Maximize,
  Minimize,
  Captions,
  Download,
  Share2,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface VideoPlayerProps {
  videoUrl: string
  title: string
  thumbnailUrl?: string
  onProgress?: (progress: number, currentTime: number) => void
  onComplete?: () => void
  onPause?: () => void
  onPlay?: () => void
  downloadable?: boolean
  shareable?: boolean
  showCaptions?: boolean
  className?: string
}

export function VideoPlayer({
  videoUrl,
  title,
  thumbnailUrl,
  onProgress,
  onComplete,
  onPause,
  onPlay,
  downloadable = false,
  shareable = false,
  showCaptions = false,
  className,
}: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(100)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [quality, setQuality] = useState("auto")

  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      const progress = (video.currentTime / video.duration) * 100
      setCurrentTime(video.currentTime)
      setProgress(progress)
      onProgress?.(progress, video.currentTime)

      if (progress >= 99.9) {
        onComplete?.()
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
    }

    video.addEventListener("timeupdate", handleTimeUpdate)
    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate)
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [onProgress, onComplete])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
      onPause?.()
    } else {
      video.play()
      onPlay?.()
    }
    setIsPlaying(!isPlaying)
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return

    video.muted = !video.muted
    setIsMuted(!isMuted)
  }

  const handleVolumeChange = (value: number[]) => {
    const volume = value[0]
    const video = videoRef.current
    if (!video) return

    video.volume = volume / 100
    setVolume(volume)
    setIsMuted(volume === 0)
  }

  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0]
    const video = videoRef.current
    if (!video) return

    const newTime = (newProgress / 100) * duration
    video.currentTime = newTime
    setProgress(newProgress)
    setCurrentTime(newTime)
  }

  const toggleFullscreen = () => {
    if (!playerRef.current) return

    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const skipForward = () => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.min(video.currentTime + 10, duration)
  }

  const skipBackward = () => {
    const video = videoRef.current
    if (!video) return

    video.currentTime = Math.max(video.currentTime - 10, 0)
  }

  const changePlaybackRate = (rate: number) => {
    const video = videoRef.current
    if (!video) return

    video.playbackRate = rate
    setPlaybackRate(rate)
    setShowSettings(false)
  }

  const changeQuality = (quality: string) => {
    setQuality(quality)
    setShowSettings(false)
    // Implement quality change logic here
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = videoUrl
    link.download = title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.mp4'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: `Check out this video: ${title}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('Link copied to clipboard!'))
        .catch(err => console.error('Failed to copy:', err))
    }
  }

  return (
    <div ref={playerRef} className={cn("relative bg-black rounded-lg overflow-hidden group", className)}>
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl}
        poster={thumbnailUrl}
        className="w-full aspect-video"
        onClick={togglePlay}
      />

      {/* Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        <div className="mb-4">
          <Slider
            value={[progress]}
            onValueChange={handleProgressChange}
            max={100}
            step={0.1}
            className="w-full"
          />
          <div className="flex items-center justify-between text-xs text-white mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={skipBackward}
            >
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={skipForward}
            >
              <SkipForward className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <div className="w-24">
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={100}
                step={1}
                className="w-full"
              />
            </div>
            <span className="text-xs text-white">{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-2">
            {showCaptions && (
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <Captions className="w-4 h-4" />
              </Button>
            )}
            {downloadable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="w-4 h-4" />
              </Button>
            )}
            {shareable && (
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={handleShare}
              >
                <Share2 className="w-4 h-4" />
              </Button>
            )}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/20"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4" />
              </Button>
              {showSettings && (
                <div className="absolute bottom-10 right-0 bg-gray-900 rounded-lg p-2 min-w-32 z-10">
                  <div className="space-y-1">
                    <p className="text-xs text-white font-medium px-2 py-1">Playback Speed</p>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => changePlaybackRate(rate)}
                        className={cn(
                          "block w-full text-left px-2 py-1 text-sm rounded hover:bg-gray-700",
                          playbackRate === rate ? "text-primary font-medium" : "text-gray-300"
                        )}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Title Overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Play className="w-8 h-8 ml-1" />
            </div>
            <p className="text-lg font-medium">{title}</p>
            {thumbnailUrl && !videoUrl && (
              <p className="text-sm opacity-75 mt-2">Click to play video</p>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isPlaying && currentTime === 0 && duration === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-white text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading video...</p>
          </div>
        </div>
      )}
    </div>
  )
}