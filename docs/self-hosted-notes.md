# Self-hosted Notes

This project is intended for self-hosted use and is **not affiliated with GitHub**.

This file is practical guidance for deploying and operating the app. It is not legal advice.

## License

This project is released under the **MIT** license. You are free to use, modify, and redistribute it. See [LICENSE](../LICENSE).

## GitHub API and OAuth compliance

- The app relies on GitHub APIs and GitHub OAuth for several features. Operators should follow GitHub's API, OAuth, branding, and acceptable-use terms.
- Self-hosting is lower risk than operating a public multi-tenant SaaS, because each operator runs their own instance with their own OAuth app and database.

## GitHub trademark and branding

This project uses "GitHub" descriptively in its name to indicate what data source it works with. This is nominative use, not a claim of affiliation, sponsorship, or endorsement by GitHub, Inc.

GitHub's trademark policy prohibits using "GitHub" in a way that implies your project **is** by GitHub or endorsed by GitHub. If you fork or deploy this project, do not use branding that implies official GitHub affiliation.

## Use your own GitHub app

- Create and configure your own GitHub OAuth App for each deployment or organization.
- Avoid application names that imply official GitHub affiliation.
- If you publish a public demo or team instance, add a visible note such as: `Not affiliated with GitHub`.

## Data your instance stores

Depending on enabled features and user behavior, the app may store:

- GitHub profile identifiers such as username and avatar URL
- Encrypted GitHub OAuth access tokens
- Session records and browser session cookies
- Followed repos, notes, presets, release cache, and star-history cache
- Timeline events and repo snapshots derived from fetched GitHub data
- Hashed agent/API tokens for automation access

If anyone besides you will use the instance, assume you are the operator responsible for protecting that data.

## Deployment checklist

- Use your own GitHub OAuth app and review GitHub terms before opening the instance to others.
- Use HTTPS in production so auth cookies are marked `Secure`.
- Generate a strong `ENCRYPTION_KEY` and keep `.env` secrets out of version control.
- Restrict database and app access to trusted users unless you are ready to operate it publicly.
- Provide a way to revoke sessions, revoke agent tokens, and remove stored user data if other people use the instance.
