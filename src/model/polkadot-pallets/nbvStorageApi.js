const BasePolkadot = require('../basePolkadot')

class NbvStorageApi extends BasePolkadot {
  constructor (polkadotApi, notify) {
    super(polkadotApi, 'nbvStorage', notify)
  }

  /**
   * @description Set signer for external wallet
   * @param {String} signer Polkadot address
   */
  setSigner (signer) {
    this._signer = signer
  }

  /**
   * @name getXpubByUser
   * @description Get Xpub by user
   * @param {String} user User address
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   * { id, xpub }
   */
  getXpubByUser (user, subTrigger) {
    return this.exQuery('xpubsByOwner', [user], subTrigger)
  }

  /**
   * @name getXpubByUser
   * @description Get Xpub by user
   * @param {String} xpubId Xpub id
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Object}
   * { id, xpub }
   */
  getXpubById (xpubId, subTrigger) {
    return this.exQuery('xpubs', [xpubId], subTrigger)
  }

  /**
   * @name getVaultsByUser
   * @description Get all vaults where user is owner or cosigner
   * @param {String} user User address
   * @returns {Array} array of vaults Id
   * [{ id }]
   */
  getVaultsByUser ({ user, subTrigger }) {
    return this.exQuery('vaultsBySigner', [user], subTrigger)
  }

  /**
   * @name getVaultsById
   * @description Get an array of vaults details
   * @param {String} Ids Array of vaults id
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Array} list vaults array
   * [{ id, description, descriptor, owner, cosigners }]
   */
  getVaultsById ({ Ids, subTrigger }) {
    return this.exMultiQuery('vaults', Ids, subTrigger)
  }

  /**
   * @name createVault
   * @description Create a new vault
   * @returns undefined
   */
  async createVault ({ threshold, description, cosigners, includeOwnerAsCosigner }) {
    // Call Extrinsic
    return this.callTx({
      extrinsicName: 'createVault',
      signer: this._signer,
      params: [threshold, description, includeOwnerAsCosigner, cosigners]
    })
  }

  /**
  * @name removeVault
  * @description Remove a vault
  * @param {String} id Vault id
  * @returns undefined
  */
  async removeVault ({ id }) {
    return this.callTx({
      extrinsicName: 'removeVault',
      signer: this._signer,
      params: [id]
    })
  }

  /**
   * @name submitXPUB
   * @description Set XPUB for a user
   * @param {String} XPUB XPUB String
   * @returns undefined
   */
  async submitXPUB ({ XPUB }) {
    // Call Extrinsic
    return this.callTx({
      extrinsicName: 'setXpub',
      signer: this._signer,
      params: [XPUB]
    })
  }

  /**
   * @name removeXpub
   * @description Remove XPUB for a user
   * @returns undefined
   */
  async removeXpub () {
    // Call Extrinsic
    return this.callTx({
      extrinsicName: 'removeXpub',
      signer: this._signer
    })
  }

  /**
   * @name createProposal
   * @description Create new proposal for a vault
   * @param {String} vaultId vault Id
   * @param {String} recipientAddress user address to receive BTC
   * @param {String} satoshiAmount Satoshi amount
   * @returns undefined
   */
  async createProposal ({ vaultId, recipientAddress, satoshiAmount, description }) {
    // Call Extrinsic
    const params = [vaultId, recipientAddress, satoshiAmount, description]
    return this.callTx({
      extrinsicName: 'propose',
      signer: this._signer,
      params
    })
  }

  /**
   * @name getProposalsByVault
   * @description Get all proposals for a vault
   * @param {String} vaultId Vault Id
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Array} array of vaults Id
   * [{ id }]
   */
  getProposalsByVault ({ vaultId, subTrigger }) {
    return this.exQuery('proposalsByVault', [vaultId], subTrigger)
  }

  /**
   * @name getProposalsById
   * @description Get an array of proposals details
   * @param {String} Ids Array of proposals id
   * @param {Function} subTrigger Function to trigger when subscription detect changes
   * @returns {Array} list vaults array
   * [{ id, description, descriptor, owner, cosigners }]
   */
  getProposalsById ({ Ids, subTrigger }) {
    return this.exMultiQuery('proposals', Ids, subTrigger)
  }

  /**
   * @name removeProposal
   * @description Remove a proposal
   * @param {String} proposalId Proposal Id
   * @returns
   */
  removeProposal ({ proposalId }) {
    return this.callTx({
      extrinsicName: 'removeProposal',
      signer: this._signer,
      params: [proposalId]
    })
  }

  /**
   * @description Save signed PSBT for a user
   * @param {String} proposalId Proposal Id
   * @param {String} psbt Payload PSBT
   * @returns
   */
  savePsbt ({ proposalId, psbt }) {
    return this.callTx({
      extrinsicName: 'savePsbt',
      signer: this._signer,
      params: [proposalId, psbt]
    })
  }

  /**
   * @description Finalize PSBT
   * @param {String} proposalId Proposal Id
   * @param {String} broadcast Boolean
   * @returns
   */
  finalizePsbt ({ proposalId, broadcast = false }) {
    return this.callTx({
      extrinsicName: 'finalizePsbt',
      signer: this._signer,
      params: [proposalId, broadcast]
    })
  }

  /**
   * @description Broadcast PSBT
   * @param {String} proposalId Proposal Id
   * @returns
   */
  broadcastPsbt ({ proposalId }) {
    return this.callTx({
      extrinsicName: 'broadcastPsbt',
      signer: this._signer,
      params: [proposalId]
    })
  }
}

// export default NbvStorageApi
module.exports = NbvStorageApi
