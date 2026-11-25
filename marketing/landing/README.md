# Gatherwell static landing page

This is a framework-free static site. Deploy the contents of this directory as
the site root on any static host. It has no build step, server dependency, or
connection to the application backend. The brand name and contact/legal copy
are launch placeholders and should be checked before publication.

## Configure the demo lead form

The form does not submit anywhere by default. Before accepting requests, edit
`config.js` and set `window.LANDING_CONFIG.leadEndpoint` to an HTTPS endpoint
that your organization controls. This project does not provide that endpoint
or store submissions.

The browser sends a `POST` request with
`Content-Type: application/x-www-form-urlencoded;charset=UTF-8`. The body
contains `name`, `email`, `church`, `interest`, and `message`. The endpoint
must be reachable from the deployed page, allow the page origin via CORS, and
return a successful 2xx response when the request is accepted. Configure
validation, spam protection, privacy/retention practices, and a monitored
destination at the endpoint. If it is not configured or a request fails, the
page reports that clearly; it does not claim to have sent or saved a lead.

## Pre-launch checklist

- Set the real brand, contact details, and legal links/copy.
- Configure the lead endpoint and test an end-to-end submission.
- Confirm the listed plan capabilities; replace each clearly labeled pricing
  placeholder only with approved plan details and prices.
- Replace testimonial and case-study placeholders only with approved,
  permissioned statements and verified outcomes.
- Replace `YOUR-DOMAIN.example` in `robots.txt` and `sitemap.xml` with the
  canonical public origin. Add a canonical link and production social image
  once the permanent URL and image are known.
- Serve the site over HTTPS.

## Files

- `index.html`, `styles.css`, `script.js`, `config.js`: page and behavior
- `robots.txt`, `sitemap.xml`: crawler guidance and the single-page sitemap
- `../content/`: original draft articles, ads, and explainer storyboard
