const BasePolkadot = require('../basePolkadot')
const Rbac = require('../rbacApi')

class MarketplaceApi extends BasePolkadot {
  constructor (polkadotApi, notify, palletId) {
    super(polkadotApi, 'gatedMarketplace', notify)
    this.RBAC = new Rbac(polkadotApi)
    this.palletId = palletId
  }

  /**
   * Method to set the palletId
   * @name setPalletId
   * @param {string} palletId The id of the pallet on the RBAC pallet
   */
  setPalletId (palletId) {
    this.palletId = palletId
  }

  /**
   * @description Set signer for external wallet
   * @param {String} signer Polkadot address
   */
  setSigner (signer) {
    this._signer = signer
  }

  /**
   * @name getMarketplaceById
   * @description Get afloat marketplace details
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async getMarketplaceById ({ marketId }, subTrigger) {
    const market = await this.exQuery('marketplaces', [marketId])
    if (!market.isEmpty) {
      return market.toHuman()
    }
    return undefined
  }

  /**
   * @name getAuthoritiesByMarketplace
   * @description Get authorities by marketplace
   * @param {String} marketId Marketplace Id
   * @param {String} authTypes Array for types example ['Owner', 'Admin', 'Appraiser']
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async getAuthoritiesByMarketplace ({ marketId, authTypes }, subTrigger) {
    const authorities = await this.RBAC.exEntriesQuery('usersByScope', [this.palletId, marketId])
    const mapAuthorities = this.mapEntries(authorities)
    const rolesIds = mapAuthorities.map(auth => {
      return auth.id[2]
    })
    const roles = await this.RBAC.exMultiQuery('roles', rolesIds)
    const rolesHuman = roles.map(role => role.toHuman())
    const authMap = mapAuthorities.map((m, index) => {
      return {
        id: m.id[1],
        type: rolesHuman[index], // Owner
        address: m.value[0]
      }
    })
    return authMap
  }

  /**
   * @name getAllMarketplaces
   * @description Get all marketplaces
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async getAllMarketplaces ({ startKey, pageSize }, subTrigger) {
    const allIds = await this.exEntriesQuery('marketplaces', [], { startKey, pageSize })
    const map = this.mapEntries(allIds)
    const allMarketplaces = map.map(v => {
      return {
        ...v,
        id: v.id[0]
      }
    })
    const promises = []
    allMarketplaces.forEach(market => {
      promises.push(this.getAuthoritiesByMarketplace({ marketId: market.id }, subTrigger))
    })
    const marketDetails = await Promise.all(promises)
    const adminTag = 'Admin'
    const ownerTag = 'Owner'
    allMarketplaces.map((market, i) => {
      const admin = marketDetails[i].find(({ type }) => type === adminTag)
      const owner = marketDetails[i].find(({ type }) => type === ownerTag)
      market.administrator = admin?.address
      market.owner = owner?.address
      return market
    })
    return allMarketplaces
  }

  /**
   * @name getMyMarketplaces
   * @description Get ALL my marketplaces
   * @param {String} accountId User polkadot address
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async getMyMarketplaces ({ accountId }, subTrigger) {
    // 1 Get all the applications by user address
    const allIds = await this.exEntriesQuery('applicationsByAccount', [accountId])
    const map = this.mapEntries(allIds)
    const response = map.map(v => {
      return {
        marketId: v.id[1],
        applicationId: v.value
      }
    })
    // 2 Map all the aplicationsIds into array of application id
    const applicationsId = map.map(v => v.value)
    // 2.1 Execute multiquery to retrieve the applications details
    const applications = await this.exMultiQuery('applications', applicationsId)
    // 3 Map all the applications into array of application details
    const applicationsReadable = applications.map((v, index) => {
      const marketId = response.find(r => r.applicationId === applicationsId[index]).marketId
      return {
        id: applicationsId[index],
        marketId,
        value: v.toHuman()
      }
    })
    // 4 filter all the applications by approved status
    const marketplacesIds = applicationsReadable.filter(v => v.value.status === 'Approved').map(v => v.marketId)
    // 5 Execute Query to retrieve the marketplaces By Authority [Admin flow]
    // const authorities = await this.exEntriesQuery('marketplacesByAuthority', [accountId])
    const authorities = await this.RBAC.exEntriesQuery('rolesByUser', [accountId, this.palletId], subTrigger)
    const mapAuthorities = this.mapEntries(authorities)
    // 6 map mapAuthorities to array of authorities readable
    const authoritiesMap = mapAuthorities.map(v => {
      return v.id[2]
    })
    // 7 Join all the from the admin flow & when the user is applicant
    const marketplacesIdJoined = marketplacesIds.concat(authoritiesMap)
    // Remove duplicated marketplaces ids
    const uniquesMarketplaces = []
    marketplacesIdJoined.forEach((market) => {
      if (!uniquesMarketplaces.includes(market)) {
        uniquesMarketplaces.push(market)
      }
    })
    // 8 get marketplaces details
    const marketplaces = await this.exMultiQuery('marketplaces', uniquesMarketplaces)
    // 9 map marketplaces details toHuman
    const marketLabels = marketplaces.map((v, index) => {
      return v.toHuman()
    })
    // 10 Join marketplace label with marketplaceId
    const marketInfo = marketLabels.map((v, index) => {
      return {
        id: marketplacesIdJoined[index],
        label: v.label
      }
    })
    // 11 Get Authorities by marketplaces given marketplacesId
    const promises = []
    marketInfo.forEach(market => {
      promises.push(this.getAuthoritiesByMarketplace({ marketId: market.id }, subTrigger))
    })
    const marketDetails = await Promise.all(promises)
    // 12 Map marketplaces details
    const adminTag = 'Admin'
    const ownerTag = 'Owner'
    return marketInfo.map((market, i) => {
      const admin = marketDetails[i].find(({ type }) => type === adminTag)
      const owner = marketDetails[i].find(({ type }) => type === ownerTag)
      return {
        ...market,
        value: { label: market.label },
        administrator: admin?.address,
        owner: owner?.address
      }
    })
  }

  /**
   * @name getParticipantsByMarket
   * @description Get marketplace's participants by market id
   * @param {String} marketId Market id
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  // async getParticipantsByMarket ({ marketId }, subTrigger) {
  //   return participants
  // }

  async getParticipantsByMarket ({ marketId }, subTrigger) {
    // 1 Get applicants address by Marketplace
    const applicants = await this.exQuery('applicantsByMarketplace', [marketId, 'Approved'])
    return applicants.toHuman()
  }

  /**
   * @name getApplicantsByMarket
   * @description Get marketplace's applicants details by market id
   * @param {String} marketId Market id
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async getApplicantsByMarket ({ marketId }, subTrigger) {
    // 1 Get applicants address by Marketplace
    const applicants = await this.exEntriesQuery('applicantsByMarketplace', [marketId])
    // Map to human
    const map = this.mapEntries(applicants)

    // Map applicant addresses by applicant status
    const applicantsByState = map.map(v => {
      return {
        applicantId: v.id[0],
        status: v.id[1],
        addresses: v.value,
        key: v.key
      }
    })

    // Applicants address to call in multiquery
    let applicantsAddress = []
    applicantsByState.forEach(ap => {
      applicantsAddress = applicantsAddress.concat(ap.addresses.map(e => {
        return [
          e,
          marketId
        ]
      }))
    })
    // 2 Get applicants Ids
    const applicantsIds = await this.exMultiQuery('applicationsByAccount', applicantsAddress, subTrigger)

    // 3 Get applicant details
    const applicantsDetails = await this.exMultiQuery('applications', applicantsIds.map(v => v.toHuman()), subTrigger)

    // Add address to applicant details
    const details = applicantsDetails.map((v, i) => {
      const auxObj = {
        ...v.toHuman(),
        address: applicantsAddress[i][0]
      }
      return auxObj
    })
    return details
  }

  /**
   * @name ApplyFor
   * @description This function call apply extrinsic
   */
  async applyFor ({ marketId, fields, custodianFields }, subTrigger) {
    return this.callTx({
      extrinsicName: 'apply',
      signer: this._signer,
      params: [marketId, fields, custodianFields]
    })
  }

  /**
   * @name reapplyFor
   * @description This function call reapply extrinsic
   */
  async reapplyFor ({ marketId, fields, custodianFields }, subTrigger) {
    return this.callTx({
      extrinsicName: 'reapply',
      signer: this._signer,
      params: [marketId, fields, custodianFields]
    })
  }

  async createMarketplace ({ admin, label }, subTrigger) {
    return this.callTx({
      extrinsicName: 'createMarketplace',
      signer: this._signer,
      params: [admin, label]
    })
  }

  /**
   *
   * @name enrollApplicant
   * @description enroll to a marketplace
   * @param {String [address]} user User address to sign the transaction
   * @param {String} marketId Market id
   * @param {String} accountOrApplication Application id or account address
   * @param {Boolean} approved Approved or not
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   */
  async enrollApplicant ({ marketId, accountOrApplication, approved, feedback }, subTrigger) {
    return this.callTx({
      extrinsicName: 'enrollApplicant',
      signer: this._signer,
      params: [marketId, accountOrApplication, approved, feedback]
    })
  }

  /**
   * @name getApplicationStatusByAccount
   * @description Get application information by account
   * @param {String} marketId Market id
   * @param {String} account Current account address
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   */
  async getApplicationStatusByAccount ({ marketId, account }, subTrigger) {
    const applicantionId = await this.exQuery('applicationsByAccount', [account, marketId])
    if (applicantionId.isEmpty) {
      return undefined
    }
    const application = await this.exQuery('applications', [applicantionId.toHuman()])
    return application.toHuman()
  }

  /**
   * The following function is used by the Custodian Page
   * The functionality is to get the files guarded by the account
   * @param {Address} Account
   * @param {*} subTrigger
   */
  async getApplicationsByCustodian ({ account }, subTrigger) {
    // 1. Get accounts ids by Custodian
    const accountsIds = await this.exEntriesQuery('custodians', [account])
    // There is no custodian files
    if (accountsIds.length === 0) return []
    // 2. Map entries of the response of the query
    const mapEntries = this.mapEntries(accountsIds)
    // 3. Map response by Account id [Applicant]. The response contains more information (filtering)
    const applicantIdsArray = mapEntries.map(v => v.value)
    // 4. Execute entries query to get applications details
    const promises = []
    // Loop through each market
    applicantIdsArray?.forEach((applicantId, index) => {
      applicantId.forEach((applicantByMarket, marketIndex) => {
        // Loop through each applicant by market
        promises.push(this.exEntriesQuery('applicationsByAccount', [applicantByMarket]))
      })
    })
    // Wait for all promises to be resolved
    const applications = await Promise.all(promises)
    // 5. Map applications by market
    const mapApplications = applications.map((app, index) => {
      const mappedEntries = this.mapEntries(app)
      return {
        address: mappedEntries[0].id[0],
        marketId: mappedEntries[0].id[1],
        applicantionId: mappedEntries[0].value
      }
    })

    // 6, Get the applications details
    const applicationsDetails = await this.exMultiQuery('applications', mapApplications.map(v => v.applicantionId), subTrigger)
    // 7. Map applications details
    const mapApplicationsDetails = applicationsDetails.map((v, index) => {
      const address = mapApplications[index].address
      const marketId = mapApplications[index].marketId
      return {
        address,
        marketId,
        ...v.toHuman()
      }
    })

    return mapApplicationsDetails
  }
}

module.exports = MarketplaceApi
