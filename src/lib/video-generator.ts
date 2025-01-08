import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import { getFFmpeg } from './ffmpeg-loader'

interface VideoOptions {
  title: string
  originalImage: string
  grid15Image: string
  grid10Image: string
  grid5Image: string
  imageName: string
}

export class VideoGenerator {
  private ffmpeg: FFmpeg | null = null

  async generateVideo(options: VideoOptions): Promise<Blob> {
    try {
      // Get FFmpeg instance
      this.ffmpeg = await getFFmpeg()

      // Download all images
      const images = await Promise.all([
        fetchFile(options.grid15Image),
        fetchFile(options.grid10Image),
        fetchFile(options.grid5Image),
        fetchFile(options.originalImage),
      ])

      // Write images to virtual filesystem
      await this.ffmpeg.writeFile('15x15.jpg', images[0])
      await this.ffmpeg.writeFile('10x10.jpg', images[1])
      await this.ffmpeg.writeFile('5x5.jpg', images[2])
      await this.ffmpeg.writeFile('original.jpg', images[3])

      // Create text overlays
      const titleText = options.title || 'Untitled'
      const grid15Text = '15 x 15'
      const grid10Text = '10 x 10'
      const grid5Text = '5 x 5'
      const originalText = options.imageName

      // FFmpeg command to create video with transitions and text
      await this.ffmpeg.exec([
        '-framerate', '30',
        '-loop', '1', '-t', '15', '-i', '15x15.jpg',
        '-loop', '1', '-t', '5', '-i', '10x10.jpg',
        '-loop', '1', '-t', '5', '-i', '5x5.jpg',
        '-loop', '1', '-t', '5', '-i', 'original.jpg',
        '-filter_complex',
        `[0:v]format=yuva444p,drawtext=text='${titleText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=10:box=1:boxcolor=black@0.5:boxborderw=5[v0];
         [1:v]format=yuva444p,drawtext=text='${titleText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=10:box=1:boxcolor=black@0.5:boxborderw=5[v1];
         [2:v]format=yuva444p,drawtext=text='${titleText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=10:box=1:boxcolor=black@0.5:boxborderw=5[v2];
         [3:v]format=yuva444p,drawtext=text='${titleText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=10:box=1:boxcolor=black@0.5:boxborderw=5[v3];
         [v0]drawtext=text='${grid15Text}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-30:box=1:boxcolor=black@0.5:boxborderw=5[v0text];
         [v1]drawtext=text='${grid10Text}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-30:box=1:boxcolor=black@0.5:boxborderw=5[v1text];
         [v2]drawtext=text='${grid5Text}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-30:box=1:boxcolor=black@0.5:boxborderw=5[v2text];
         [v3]drawtext=text='${originalText}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-30:box=1:boxcolor=black@0.5:boxborderw=5[v3text];
         [v0text][v1text]xfade=transition=fade:duration=1:offset=14[xf0];
         [xf0][v2text]xfade=transition=fade:duration=1:offset=18[xf1];
         [xf1][v3text]xfade=transition=fade:duration=1:offset=22[video]`,
        '-map', '[video]',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-y', 'output.mp4'
      ])

      // Read the generated video
      const data = await this.ffmpeg.readFile('output.mp4')
      return new Blob([data], { type: 'video/mp4' })
    } catch (error) {
      console.error('Video generation error:', error)
      throw error
    }
  }
} 