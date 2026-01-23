# Deployment Guide

## Quick Deploy

```bash
# Deploy via doctl CLI
doctl apps create --spec .do/app.yaml

# Or update existing app
doctl apps update <app-id> --spec .do/app.yaml
```

## GitHub Repository
- **Repo:** https://github.com/thingvallatech/bookfair
- **Auto-deploy:** Enabled on push to `main`

## Digital Ocean App Platform

### App Spec Location
`.do/app.yaml`

### Settings
- **Region:** NYC
- **Instance:** basic-xxs (smallest, cheapest)
- **Port:** 3000
- **Build:** `npm ci && npm run build`
- **Run:** `node build`

### Manual Setup (if not using doctl)
1. Go to https://cloud.digitalocean.com/apps
2. Create App → GitHub → `thingvallatech/bookfair`
3. It should auto-detect settings from `.do/app.yaml`

## Required Secrets

### GitHub Secrets (for CI/CD workflow)
Add at: https://github.com/thingvallatech/bookfair/settings/secrets/actions

| Secret | Description |
|--------|-------------|
| `DIGITALOCEAN_ACCESS_TOKEN` | DO API token from https://cloud.digitalocean.com/account/api/tokens |

### Digital Ocean App Secrets
None required for this app (no database/API keys needed).

## Reference: Other Projects

These projects have similar DO + GitHub setups:

| Project | Repo | Has DB |
|---------|------|--------|
| sammy-chores | thingvallatech/sammy-chores | Yes |
| happenmap | thingvallatech/happenmap | No |
| neurotranslate | thingvallatech/neurotranslate | Yes |
| biasswap | thingvallatech/biasswap | Yes |

## doctl Commands

```bash
# List apps
doctl apps list

# Get app ID
doctl apps list --format ID,Spec.Name

# View app logs
doctl apps logs <app-id>

# View deployments
doctl apps list-deployments <app-id>
```
