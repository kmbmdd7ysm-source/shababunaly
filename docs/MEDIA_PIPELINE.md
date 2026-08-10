# Media pipeline

Final campaign video and client-project photography are intentionally not bundled. Reserved media areas remain visible as premium placeholders until approved assets are supplied.

Product media records support `{id,type,src,mobileSrc,desktopSrc,poster,thumbnail,alt,caption,width,height,aspectRatio,variant,color,sortOrder}`. Supported types include image, video, sequence360, detail, lifestyle, fit, size-reference, material, front, back and side.

Production rules:

- Export AVIF/WebP plus JPEG/PNG fallback where appropriate.
- Store intrinsic width and height to prevent layout shift.
- Use dedicated mobile crops instead of shrinking desktop compositions.
- Do not expose 360 controls unless every declared frame exists.
- Lazy-load below-the-fold media and never autoplay audio.
- Keep real client media, logos and approvals traceable to the corresponding project/account.
- Product cards should remain visually quiet: one strong image, name, price and verified availability only.
