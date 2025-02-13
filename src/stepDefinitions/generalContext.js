const { client } = require('../config.js')
const { After, Given } = require('../context')
const httpHelper = require('../helpers/httpHelper')
const backendHelper = require('../helpers/backendHelper')
const occHelper = require('../helpers/occHelper')
const codify = require('../helpers/codify')


Given('the setting {string} of app {string} has been set to {string}', function(
  setting,
  app,
  value
) {
  if (client.globals.ocis) {
    // TODO: decide if we fail on OCIS when a scenario even tries to use this given step
    return
  }
  return occHelper.runOcc(['config:app:set', app, setting, '--value=' + value])
})

Given('the setting {string} of app {string} has been set to {string} on remote server', function(
  setting,
  app,
  value
) {
  return backendHelper.runOnRemoteBackend(occHelper.runOcc, [
    'config:app:set',
    app,
    setting,
    '--value=' + value
  ])
})

Given('the administrator has cleared the versions for user {string}', function(userId) {
  if (client.globals.ocis) {
    // TODO: decide if we fail on OCIS when a scenario even tries to use this given step
    return
  }
  return occHelper.runOcc(['versions:cleanup', userId])
})

Given('the administrator has cleared the versions for all users', function() {
  if (client.globals.ocis) {
    // TODO: decide if we fail on OCIS when a scenario even tries to use this given step
    return
  }
  return occHelper.runOcc(['versions:cleanup'])
})

const setTrustedServer = function(url) {
  const body = new URLSearchParams()
  body.append('url', url)
  const postUrl = 'apps/testing/api/v1/trustedservers'
  return httpHelper.postOCS(postUrl, 'admin', body).then(res => {
    return httpHelper.checkStatus(res)
  })
}

Given('server {string} has been added as trusted server', function(server) {
  return setTrustedServer(codify.replaceInlineCode(server))
})

Given('server {string} has been added as trusted server on remote server', function(url) {
  return backendHelper.runOnRemoteBackend(setTrustedServer, codify.replaceInlineCode(url))
})

After(async function(testCase) {
  if (client.globals.ocis) {
    return
  }

  // clear file locks
  const body = new URLSearchParams()
  body.append('global', 'true')
  const url = 'apps/testing/api/v1/lockprovisioning'
  await httpHelper.deleteOCS(url, 'admin', body)
})

// Tag support
// Before({ tags: '@disablePreviews' }, () => {
//   if (!client.globals.ocis) {
//     occHelper.runOcc(['config:system:set enable_previews --type=boolean --value=false'])
//   }
// })

Given('the app {string} has been disabled', function(app) {
  if (client.globals.ocis) {
    // TODO: decide if we fail on OCIS when a scenario even tries to use this given step
    return
  }
  return occHelper.runOcc(['app:disable', app])
})

Given('default expiration date for users is set to {int} day/days', function(days) {
  if (client.globals.ocis) {
    // TODO: decide if we fail on OCIS when a scenario even tries to use this given step
    return
  }
  occHelper.runOcc([`config:app:set --value ${days} core shareapi_expire_after_n_days_user_share`])

  return this
})
