-- Allow administrators to store playable video media in the public site-assets bucket.
update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array[
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'application/pdf',
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime'
    ]
where id = 'site-assets';
