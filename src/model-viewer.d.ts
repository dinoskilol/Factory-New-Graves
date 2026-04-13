import type * as React from 'react'

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        src?: string
        alt?: string
        autoplay?: boolean
        'auto-rotate'?: boolean
        'camera-controls'?: boolean
        'animation-name'?: string
        'interaction-prompt'?: string
        orientation?: string
        scale?: string
        'camera-target'?: string
        'camera-orbit'?: string
        'min-camera-orbit'?: string
        'max-camera-orbit'?: string
        'field-of-view'?: string
        'shadow-intensity'?: string
        'disable-pan'?: boolean
        'disable-tap'?: boolean
        'touch-action'?: string
      }
    }
  }
}
