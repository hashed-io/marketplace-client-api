const ConfidentialDocs = require('./utils/confidentialDocs')
const { MarketplaceApi } = require('../src/model/polkadot-pallets')
global.window = { addEventListener () {} }

jest.setTimeout(40000)
let marketplaceApi
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
  test('Create MarketplaceApi instance', async () => {
    marketplaceApi = new MarketplaceApi(confidentialDocs.getPolkadotApi())
    expect(marketplaceApi).toBeInstanceOf(MarketplaceApi)
  })
})

describe('Execute queries', () => {
  const marketId = '0xc520accc57a5828b158fa13d2938c87b01aaa305f10d7fad70fbcb9214936796'
  const lebelForMarketplace = 'Daniel\'s Marketplace'
  const accountId = '5Ft1pwMVeLRdRFiZNTtfxvnn1W8vPp71u215uoU4eDWixCok'

  test('Get Marketplace by id', async () => {
    const marketplace = await marketplaceApi.getMarketplaceById({ marketId })
    expect(marketplace).toBeInstanceOf(Object)
    const { label } = marketplace
    expect(label).toEqual(lebelForMarketplace)
  })

  test('Get Authorities By Marketplace response with an Array', async () => {
    const authorities = await marketplaceApi.getAuthoritiesByMarketplace({ marketId })
    const isArray = Array.isArray(authorities)
    expect(isArray).toBeTruthy()
  })

  test('Get All Marketplaces response with an array', async () => {
    const marketplaces = await marketplaceApi.getAllMarketplaces({ pageSize: 10 })
    const isArray = Array.isArray(marketplaces)
    expect(isArray).toBeTruthy()
  })

  test('Get My Marketplaces', async () => {
    const marketplaces = await marketplaceApi.getMyMarketplaces({ accountId })
    const isArray = Array.isArray(marketplaces)
    expect(isArray).toBeTruthy()
  })

  test('Get Participants By Market', async () => {
    const participants = await marketplaceApi.getParticipantsByMarket({ marketId })
    const isArray = Array.isArray(participants)
    expect(isArray).toBeTruthy()
  })

  test('Get Applicants By Market', async () => {
    const applicants = await marketplaceApi.getApplicantsByMarket({ marketId })
    const isArray = Array.isArray(applicants)
    expect(isArray).toBeTruthy()
  })

  test('Get Application Status By Account', async () => {
    const application = await marketplaceApi.getApplicationStatusByAccount({ marketId, account: accountId })
    expect(application).toBe(undefined)
  })

  test('Get Marketplaces By Authority', async () => {
    // Error al ejecutarse
    const marketplaces = await marketplaceApi.getMarketplacesByAuthority({ accountId, marketplaceId: marketId })
    console.log({ marketplaces })
  })

  test('Get Applications By Custodian', async () => {
    const applications = await marketplaceApi.getApplicationsByCustodian({ account: accountId })
    const isArray = Array.isArray(applications)
    expect(isArray).toBeTruthy()
  })
})
