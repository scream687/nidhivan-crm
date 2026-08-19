import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Deliberately minimal. No incremental cache is wired up: every route in this
// app is either static or rendered on demand from the Render API, so there is
// no ISR output worth persisting. Adding a KV or R2 cache binding is a separate
// decision — see the deploy notes before turning one on.
export default defineCloudflareConfig();
