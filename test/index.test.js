// const PolkadotApi = require('../src/model/polkadotApi')
const ConfidentialDocs = require('./utils/confidentialDocs')
const { NbvStorageApi } = require('../src/model/polkadot-pallets')
global.window = { addEventListener () {} }

jest.setTimeout(40000)
// let polkadotApi
let nbvStorageApi
let confidentialDocs

beforeAll(async () => {
  confidentialDocs = new ConfidentialDocs({
    ipfsURL: process.env.IPFS_URL,
    ipfsAuthHeader: `Basic ${Buffer.from(`${process.env.IPFS_PROJECT_ID}:${process.env.IPFS_PROJECT_SECRET}`).toString('base64')}`,
    chainURI: process.env.WSS,
    appName: process.env.APP_NAME,
    signer: process.env.SIGNER
  })
  await confidentialDocs.init()
})

afterAll(async () => {
  confidentialDocs.disconnect()
})

describe('Connect with hashedChain and create instances', () => {
  test('Create ConfidentialDocs instance', async () => {
    expect(confidentialDocs).toBeInstanceOf(ConfidentialDocs)
  })
  test('Create NbvStorageApi instance', async () => {
    nbvStorageApi = new NbvStorageApi(confidentialDocs.getPolkadotApi())
    expect(nbvStorageApi).toBeInstanceOf(NbvStorageApi)
  })
})

describe('Execute queries', () => {
  let xpubId, xpub, vaultsIds
  const testUser = '5HGZfBpqUUqGY7uRCYA6aRwnRHJVhrikn8to31GcfNcifkym'

  test('Get Xpub by User', async () => {
    xpubId = await nbvStorageApi.getXpubByUser(testUser)
    expect(xpubId.toHuman()).toBe('0x4e265972fb50625b2c37138556a430b1b12d41fa7af8b46d173421f140018cc7')
  })
  test('Get Xpub by Id', async () => {
    xpub = await nbvStorageApi.getXpubById(xpubId.toHuman())
    expect(xpub.toHuman()).toBeDefined()
  })
  test('Get vaults by User', async () => {
    vaultsIds = await nbvStorageApi.getVaultsByUser({ user: testUser })
    // console.log('Vaults Ids', vaultsIds.toHuman())
    expect(Array.isArray(vaultsIds.toHuman())).toBe(true)
  })
  test('Get vaults by Id', async () => {
    const response = await nbvStorageApi.getVaultsById({ Ids: vaultsIds })
    // console.log('vaults', mapEntries(response))
    expect(Array.isArray(response)).toBe(true)
  })
  // test('Get proposals by vault Id', async () => {
  //   const response = await nbvStorageApi.getProposalsByVault({ vaultId: testUser })
  //   expect(Array.isArray(response.toHuman())).toBe(true)
  // })
  // test('Get proposals by Ids', async () => {
  //   const response = await nbvStorageApi.getProposalsById({ Ids: testUser })
  //   expect(Array.isArray(response.toHuman())).toBe(true)
  // })
})
