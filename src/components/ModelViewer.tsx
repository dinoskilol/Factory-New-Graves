import { useEffect, useRef } from 'react'

type ModelViewerElement = HTMLElement & {
  updateFraming?: () => void
}

export function ModelViewer() {
  const viewerRef = useRef<ModelViewerElement | null>(null)

  useEffect(() => {
    let frameId = 0
    let startTime = 0

    const animate = (time: number) => {
      if (!startTime) {
        startTime = time
      }

      const elapsedSeconds = (time - startTime) / 1000
      const angle = 180 + elapsedSeconds * 14

      viewerRef.current?.setAttribute('orientation', `180deg 180deg ${angle}deg`)
      frameId = requestAnimationFrame(animate)
    }

    frameId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [])

  return (
    <div className="model-display">
      <model-viewer
        ref={viewerRef}
        src="/models/praetorian_graves.glb"
        alt="Praetorian Graves"
        autoplay
        animation-name="Idle1"
        interaction-prompt="none"
        orientation="180deg 180deg 0deg"
        scale="0.01 0.01 0.01"
        camera-target="0m 0.9m 0m"
        camera-orbit="0deg 75deg 5.2m"
        field-of-view="30deg"
        shadow-intensity="1"
        disable-pan
        disable-tap
        touch-action="none"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
