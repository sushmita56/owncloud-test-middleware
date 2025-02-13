const { When, Then } = require('../context')
require('url-search-params-polyfill')
const sharingHelper = require('../helpers/sharingHelper')
const assert = require('assert')
const { SHARE_TYPES } = require('../helpers/sharingHelper')
const path = require('../helpers/path')

When(
  'user {string} changes the password of last public link  to {string} using the Sharing API',
  async function(user, password) {
    const lastShare = await sharingHelper.fetchLastPublicLinkShare(user)
    await sharingHelper.updatePublicLinkPassword(user, lastShare.id, password)
  }
)

Then('user {string} should not have any public link', async function(sharer) {
  const resp = await sharingHelper.getAllPublicLinkShares(sharer)
  assert.strictEqual(resp.length, 0, 'User has shares. Response: ' + resp)
})

Then('user {string} should have some public shares', async function(sharer) {
  const publicShares = await sharingHelper.getAllPublicLinkShares(sharer)
  if (publicShares.length === 0) {
    assert.fail('Shares not found')
  }
})

Then(
  'as user {string} the file/folder {string} should have a public link',
  async function(linkCreator, resource) {
    const publicLinkShares = await sharingHelper.getAllPublicLinkShares(linkCreator)
    resource = path.resolve(resource)
    for (const share of publicLinkShares) {
      if (share.path === resource && share.share_type === SHARE_TYPES.public_link) {
        return
      }
    }
  }
)

Then('the last public link share response of user {string} should include the following fields', function(
  linkCreator,
  dataTable
) {
  const fieldsData = dataTable.rowsHash()
  return sharingHelper.assertUserLastPublicShareDetails(linkCreator, fieldsData)
})

Then('as user {string} the file/folder {string} should not have any public link', async function(
  sharer,
  resource
) {
  const publicLinkShares = await sharingHelper.getAllPublicLinkShares(sharer)
  resource = path.resolve(resource)
  for (const share of publicLinkShares) {
    if (share.path === resource && share.share_type === SHARE_TYPES.public_link) {
      assert.fail(
        'Expected share with user ' +
          sharer +
          ' and resource ' +
          resource +
          ' is present!\n' +
          JSON.stringify(publicLinkShares)
      )
    }
  }
  return this
})

Then(
  'the public should be able to download the file/folder {string} without password from the last created public link by {string}',
  function(resource, linkCreator) {
    return sharingHelper.downloadLastPublicLinkResource(linkCreator, resource)
  }
)

Then(
  'the public should be able to download the file/folder {string} with password {string} from the last created public link by {string}',
  function(resource, password, linkCreator) {
    return sharingHelper.downloadLastPublicLinkResource(linkCreator, resource, password)
  }
)

Then(
  'the public should not be able to download the file/folder {string} from the last created public link by {string}',
  function(resource, linkCreator) {
    return sharingHelper.downloadLastPublicLinkResource(linkCreator, resource)
  }
)
