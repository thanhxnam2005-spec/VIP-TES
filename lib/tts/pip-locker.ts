/**
 * Picture-in-Picture background audio keep-alive.
 *
 * On mobile browsers (and some desktop browsers) switching tabs or locking the
 * screen suspends `<audio>` playback. This class creates a tiny silent video,
 * requests PiP for it, and thereby keeps the audio context alive.
 */
export class PIPLocker {
  private pipVideo: HTMLVideoElement | null = null;
  private _isActive = false;

  get isActive(): boolean {
    return this._isActive;
  }

  /**
   * Create a silent canvas-sourced video and request Picture-in-Picture.
   *
   * If PiP is not supported or the request is denied the method resolves
   * silently — playback will still work but may be suspended on tab blur.
   */
  async activate(): Promise<void> {
    if (this._isActive) return;

    // PiP availability check
    if (!document.pictureInPictureEnabled) {
      console.warn("PiP is not supported in this browser");
      return;
    }

    try {
      const video = document.createElement("video");

      // Create a tiny silent video stream from a canvas
      const canvas = document.createElement("canvas");
      canvas.width = 2;
      canvas.height = 2;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, 2, 2);
      }

      const stream = canvas.captureStream(0); // 0 fps — static frame
      video.srcObject = stream;
      video.muted = true;
      video.loop = true;

      // Required attributes for autoplay / PiP on mobile
      video.setAttribute("playsinline", "");
      video.style.position = "fixed";
      video.style.opacity = "0";
      video.style.pointerEvents = "none";
      video.style.width = "1px";
      video.style.height = "1px";
      video.style.bottom = "0";
      video.style.left = "0";
      document.body.appendChild(video);

      await video.play();
      await video.requestPictureInPicture();

      this.pipVideo = video;
      this._isActive = true;
    } catch (err) {
      console.warn("Failed to activate PiP locker:", err);
      this.cleanup();
    }
  }

  /**
   * Exit PiP and clean up the synthetic video element.
   */
  async deactivate(): Promise<void> {
    if (!this._isActive) return;

    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch {
      // Ignore — element may already have exited PiP
    }

    this.cleanup();
  }

  private cleanup(): void {
    if (this.pipVideo) {
      this.pipVideo.pause();
      this.pipVideo.srcObject = null;
      this.pipVideo.remove();
      this.pipVideo = null;
    }
    this._isActive = false;
  }
}
