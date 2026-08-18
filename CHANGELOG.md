# Changelog

## 0.1.0

Initial release.

- Assignment API: `assignment.next()` and `assignment.batch()`
- Dials API: `dials.create()`
- Custom Dialer Integration API: `custom.campaigns`, `custom.dispos`, `custom.anis` (create, update, get, delete)
- NRM API v2: `nrm.listAnis()`, `nrm.remediate()`, `nrm.pause()`, `nrm.activate()`
- Live Feed: `liveFeed.ringcx.upload()`
- Webhooks: `verifyWebhookSignature()`, `constructWebhookEvent()`, typed `dial.batch` payloads
- Zero runtime dependencies. Works in Node 18+, Cloudflare Workers, Deno, and Bun.
