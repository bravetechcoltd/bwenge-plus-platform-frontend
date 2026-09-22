"use client";

import { useEffect, useRef } from "react";

export default function VideoBackground() {
	const videoRef = useRef<HTMLVideoElement>(null);

	useEffect(() => {
		if (videoRef.current) {
			videoRef.current.playbackRate = 0.8; // Slightly slower for more cinematic feel
		}
	}, []);

	return (
		<div className="video-background">
			<video
				ref={videoRef}
				autoPlay
				muted
				loop
				playsInline
				className="video-background-element"
				poster="/placeholder.svg?height=1080&width=1920"
			>
				<source src="/videos/video1.mp4" type="video/mp4" />
				{/* Fallback for browsers that don't support video */}
				<div className="video-fallback">
					<div className="background-slide background-slide-1 active"></div>
				</div>
			</video>

			{/* Video overlay for better text readability */}
			<div className="video-overlay"></div>
		</div>
	);
}