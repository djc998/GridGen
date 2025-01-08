import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg) {
    return ffmpeg
  }

  ffmpeg = new FFmpeg()

  if (!ffmpeg.loaded) {
    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(
          '/ffmpeg/ffmpeg-core.js',
          'text/javascript'
        ),
        wasmURL: await toBlobURL(
          '/ffmpeg/ffmpeg-core.wasm',
          'application/wasm'
        ),
      })
    } catch (error) {
      console.error('Error loading FFmpeg:', error)
      throw new Error('Failed to load FFmpeg')
    }
  }

  return ffmpeg
} 