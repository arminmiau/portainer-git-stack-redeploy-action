# Portainer stack redeploy action

This action allows you to update the stack with pull new images if you can't use webhooks. For example, in Portainer Community Edition.

## Inputs

### `portainerUrl`

**Required** URL to the application instance. For example, https://example.com:9443

### `accessToken`

**Required** Token for API requests, can be created on the page https://example.com:9443/#!/account/tokens/new

### `useAuthentication`

**Required** If the git stack is configured with authentication

```yaml
uses:  arminmiau/portainer-git-stack-redeploy-action@v1.0
with:
  portainerUrl: 'https://example.com:9443'
  accessToken: 'ptr_XXXyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy'
  stackName: 'company-stack'
  useAuthentication: true
```
