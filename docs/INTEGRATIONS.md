# Lead source integrations

How each lead source reaches the CRM, and exactly what to send the people who
have to enable it on the other end.

All webhook URLs are generated in **Settings → Integrations**. The token inside
each URL is the authentication — anyone holding the URL can create leads, so
treat it as a password. Regenerating a URL immediately invalidates the old one.

---

## Housing.com / 99acres / MagicBricks

These portals push leads to a URL you give their team.

**Settings → Integrations → the portal's card → "Email account manager".** Type
their address and send. The app generates the webhook URL if one does not exist
yet, emails them the endpoint and instructions, and records who it went to and
when — shown on the card afterwards.

Nothing needs to be copied into your own mail client, and the secret-bearing URL
never leaves the app. If the send fails, you are told why and nothing is
recorded as sent.

Send it only to the named account manager. Anyone holding that URL can create
leads in your CRM, so it does not belong in a shared or group inbox.

### What the endpoint accepts

`POST /api/v1/integrations/leads/{housing|99acres|magicbricks|webflow}`

Auth: `?token=…` in the URL **or** an `X-Nidhivan-Token` header. Both work —
several portal consoles only accept a bare URL with no custom headers.

Field names are matched case-insensitively across the spellings these portals
commonly use (`name`/`Name`/`full_name`/`ContactName`,
`phone`/`Mobile`/`contact_number`, and so on), and leads nested one level deep
under `lead`, `data`, `enquiry` or `fields` are read correctly. If a portal
sends something unexpected, override it per-field in the **Field mapping**
dialog rather than changing code.

Phone numbers are normalised (`+91`, `0091`, leading `0`, spaces and dashes are
stripped) and must be a valid 10-digit Indian mobile. A payload without a usable
number is rejected and logged rather than creating an unworkable lead.

### Responses

| Status | Meaning |
|---|---|
| `created` | Lead created |
| `duplicate` | Already seen (Facebook only — replayed `leadgen_id`) |
| `rejected` | No usable phone number, or unrecognised payload |
| `error` | Downstream failure; see the delivery log |
| HTTP 401 | Wrong or missing token |

Every delivery is recorded. See it in Settings → Integrations → **Deliveries**,
including the raw payload — that is the first place to look when a portal says
they are sending leads and nothing is arriving.

---

## Facebook Lead Ads

`POST /api/v1/integrations/facebook` — a fixed URL, no token in it. Facebook
signs every delivery instead.

Setup — all three values are entered in the app, none are environment variables:

1. Meta app → **Settings → Basic** → copy the **App Secret**.
2. Generate a permanent **Page Access Token** (Business Suite → System Users).
3. Choose any phrase as a **Verify Token**.
4. Paste all three into Settings → Integrations → *Facebook credentials* → **Save**.
5. Click **Verify with Facebook**. It calls the Graph API and reports back the
   page name on success, or the exact reason on failure — including calling out
   a missing app secret as the thing silently rejecting your deliveries.
6. In the Meta app → **Webhooks**, add the callback URL above with the same
   verify token, subscribed to the **`leadgen`** field.

Without the app secret, **every delivery is rejected** — the CRM verifies the
`X-Hub-Signature-256` HMAC over the raw request body and fails closed.

There is deliberately no default verify token. An unset one means the handshake
rejects everything rather than falling back to a value committed to this repo.

Facebook retries deliveries, so replays of a `leadgen_id` already in the
database return `duplicate` and create nothing.

---

## Exotel — click-to-call and IVR

Configured in **Settings → Telephony**.

Exotel authenticates with an **API Key + API Token** pair. These are *not* the
Account SID — the SID only appears in the URL path. Accounts are also
region-pinned; the wrong region returns an auth error, so pick Singapore
(`api.exotel.com`) or Mumbai (`api.in.exotel.com`) to match your account.

Once saved, the Telephony tab shows two webhook URLs to paste into your Exotel
call flow:

| URL | Purpose |
|---|---|
| `…/telephony/exotel/passthru/{secret}` | Call status: duration, recording URL, outcome |
| `…/telephony/exotel/incoming/{secret}` | Incoming call → find or create a lead |

The incoming URL is what turns the ExoPhone into a lead source: an unrecognised
caller becomes a new lead tagged `utmSource: exotel-ivr`, and a known caller
just gets the call logged against their existing record. Attach it to a
**Passthru applet** in the call flow.

Two caveats worth knowing before you wire it up:

- The endpoint returns HTTP 200, which a Passthru applet reads as "continue down
  Choice A". Changing that status code changes call routing.
- Exotel does not publish the Passthru applet's parameter list. The handler
  reads several spellings defensively (`CallFrom`/`From`, `CallTo`/`To`,
  `CallStatus`/`Status`), but confirm against a real call and check the delivery
  log if a field comes through empty.

Use **Test connection** to confirm the credentials before relying on any of it.

---

## No API access yet?

Both Housing.com and 99acres let you export enquiries as a spreadsheet from
their dashboard. Import one at **Leads → Import** with a `Source` column set to
`HOUSING_COM` or `NINETYNINE_ACRES`, and the leads land tagged correctly. This
works today without waiting on anyone's account manager.

Auto-parsing the portals' lead-alert emails is deliberately not implemented —
it needs an inbound mail route and per-portal HTML parsers that break whenever a
portal restyles its template.
