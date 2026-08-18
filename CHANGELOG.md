# @outboundiq/client

## 0.2.0

### Minor Changes

- 38189d0: Add the ANI Planner client: `oiq.aniPlanner.generate()` wraps `POST /ani-planner/generate`, with typed region stats, campaign filters, and plan totals.

## 0.1.0

### Minor Changes

- c9be7f7: Initial release. Typed coverage of the Assignment, Dials, Custom Dialer Integration, NRM v2, and Live Feed (RingCX) APIs, plus webhook signature verification with typed dial.batch payloads. Zero runtime dependencies; works in Node 20+, Cloudflare Workers, Deno, and Bun.
