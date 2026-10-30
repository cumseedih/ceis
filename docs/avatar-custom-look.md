# Custom image as the default look: design proposal

Status: proposal only, 2026-10-18. Not implemented: the profile look mechanism is a
closed set and there is no custom-image path today. The default face stays the
bundled dragon until this is built.

## What exists today

The agent's look is one profile field, `avatar`, synced per account through the relay
(`PUT /v1/me/profile`, `GET /v1/me/profile`, hub `profile` frames with a `rev`). The
runtime's `ceis/hub/profile.py` (`ProfileSync`) and the phone's
`io.github.ceis.cloud.ProfileSync` implement the same three kinds:

- `dragon`: a built-in illustration id. Every client bundles the dragon stills
  (`web/public/avatars/`, the Android app's `avatar/`); nothing is synced.
- `emoji`: an emoji plus a colour (`emoji`, `color` fields). Nothing is synced.
- `face`: a face drawn in the avatar studio. The relay keeps the five mood stills as
  WebP; the profile wears `face_id` (the hash of the idle still). On pull, the stills
  land in the workspace under `avatar/sync-<hash>/<mood>.webp` and the web app shows
  them through the files API like any studio face. The description and style travel
  too, so other devices can redraw poses with their own image model.

There is no kind that carries an arbitrary image supplied by the operator. Seeding
`assets/brand/ceis-mark.png` as the default would mean smuggling bytes through a
pipeline that only understands these three kinds, which is why it was left alone.

## Proposal: a fourth look kind, `image`

Follow the `face` kind's shape rather than inventing a parallel system.

1. **New look kind.** `avatar: "image"` with an `image_id` field (the SHA-256 of the
   file bytes, hex). The relay's profile record gains the image bytes (one WebP,
   resized to the same still size the studio uses) next to the face stills.
2. **Storage and sync.** On push, the device uploads the image when `image_id`
   changed; on pull, the still lands in the workspace under
   `avatar/image-<hash>.webp` (one file, no moods; clients fall back to it for every
   mood). The `rev` mechanism is unchanged: a newer rev pulls, the hash comparison
   skips re-downloads, and a rename keeps the bytes on the relay, exactly like faces.
3. **Validation.** The relay accepts only WebP/PNG under the studio's byte cap and
   rejects anything else, so a malicious image cannot ride the profile to other
   devices. The Sentinel treats setting the image like setting a face (user-approved,
   low risk).
4. **What each client renders.**
   - Web: the look resolver in the client already maps `face_id` to the files API
     stills; map `image_id` the same way, falling back to the dragon when missing.
   - Desktop: the same resolver lives in the dsh client's profile code; one more
     branch.
   - Android: `ProfileSync` downloads the still beside the face stills and the
     avatar composables load it from disk; the in-app icon picker is untouched.
5. **Default.** With the kind in place, the default look becomes
   `("ceis", "image")` with the brand mark's `image_id` seeded at build time from
   `assets/brand/ceis-mark.png`, converted to WebP once by the release script.

## Rollback

The kind is additive: older clients see an unknown `avatar` value and keep the
previous look, the way they already do for a face they have not downloaded yet.
Removing the feature is deleting the kind and its one branch per client.
