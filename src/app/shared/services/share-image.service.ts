import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { blobToBase64 } from './blob.utils';

export interface ShareImageOptions {
  title?: string;
  text?: string;
  dialogTitle?: string;
  /** Without an extension; a timestamp is appended. */
  baseName?: string;
}

/**
 * Shares an in-memory image.
 *
 * `@capacitor/share` cannot take a `blob:` or `data:` URL - the Android plugin
 * rejects any url that is not `file://`/`http`, and then hands the path to
 * `FileProvider.getUriForFile`, which needs a real file. So on native the blob is
 * written to the cache directory first. `Directory.Cache` needs no permission and
 * is already covered by the app's existing FileProvider `<cache-path>` mapping.
 */
@Injectable({
  providedIn: 'root',
})
export class ShareImageService {
  async share(blob: Blob, options: ShareImageOptions = {}): Promise<void> {
    // Fresh name per capture, so a share target never picks up a cached older
    // image under a reused FileProvider uri.
    const fileName = `${options.baseName ?? 'selfie'}-${Date.now()}.jpg`;

    if (Capacitor.isNativePlatform()) {
      await this.shareNative(blob, fileName, options);
      return;
    }
    await this.shareWeb(blob, fileName, options);
  }

  private async shareNative(
    blob: Blob,
    fileName: string,
    options: ShareImageOptions,
  ): Promise<void> {
    const written = await Filesystem.writeFile({
      path: fileName,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });

    // `files`, not `url`: passing both text and files still works - Android sets
    // the image MIME type but EXTRA_TEXT survives, so the caption comes along.
    await Share.share({
      title: options.title,
      text: options.text,
      files: [written.uri],
      dialogTitle: options.dialogTitle,
    });
  }

  private async shareWeb(
    blob: Blob,
    fileName: string,
    options: ShareImageOptions,
  ): Promise<void> {
    const file = new File([blob], fileName, { type: 'image/jpeg' });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: options.title,
        text: options.text,
      });
      return;
    }

    // Desktop browsers without file sharing: fall back to a download so the
    // capture is still reachable during `ng serve` development.
    const url = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
    } finally {
      // Revoking immediately can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
  }
}
