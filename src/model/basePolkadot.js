class BasePolkadot {
  /**
   * Class constructor
   * @param {Polkadot} polkadot Instance from Polkadot class
   * @param {String} palletName Pallet Name
   */
  constructor (polkadot, palletName, notify) {
    this.polkadot = polkadot
    this.palletName = palletName
    this.notify = notify
    this._signer = undefined
  }

  /**
   * @name callTx
   * @description Call a TX from polkadot api for NbvStorage and handler response subscription
   * @param {String} extrinsicName Extrinsic function name to call
   * @param {String} signer User address to sign transaction
   * @param {*} params Params for extrinsic function
   * @returns tx response from polkadot api
   */
  async callTx ({ extrinsicName, signer = null, params }) {
    const txResponseHandler = (e, resolve, reject, unsub) => {
      this.handlerTXResponse(e, resolve, reject, unsub)
    }
    return this.polkadot.callTx({
      palletName: this.palletName,
      extrinsicName,
      params,
      txResponseHandler,
      signer
    })
  }

  /**
   * @name exQuery
   * @description Execute a query or query subscription from polkadot api
   * @param {String} queryName Query name to execute
   * @param {*} params Params for query execution
   * @param {*} subTrigger Function handler to query subscription
   * @returns Query response or unsubscribe function from polkadot api
   */
  async exQuery (queryName, params, subTrigger) {
    // console.log('polkadot', this.polkadot._api)
    return this.polkadot._api.query[this.palletName][queryName](...params, subTrigger)
  }

  /**
   * @name exMultiQuery
   * @description Execute a query or query subscription from polkadot api
   * @param {String} queryName Query name to execute
   * @param {Array} params Params for query execution, Params [Array]
   * @param {*} subTrigger Function handler to query subscription
   * @returns Query response or unsubscribe function from polkadot api
   */
  async exMultiQuery (queryName, params, subTrigger) {
    return this.polkadot._api.query[this.palletName][queryName].multi(params, subTrigger)
  }

  /**
   * @name exEntriesQuery
   * @description Execute a query or query subscription from polkadot api
   * @param {String} queryName Query name to execute
   * @param {Array} params Params for query execution, Params [Array]
   * @param {*} subTrigger Function handler to query subscription
   * @returns Query response or unsubscribe function from polkadot api
   */
  async exEntriesQuery (queryName, params, pagination, subTrigger) {
    console.log('exEntriesQuery params', { queryName, params, pagination, subTrigger })
    if (!params) {
      return this.polkadot._api.query[this.palletName][queryName].entries()
    }
    if (pagination) {
      return this.polkadot._api.query[this.palletName][queryName].entriesPaged({
        pageSize: pagination.pageSize || 10,
        args: [...params],
        startKey: pagination.startKey || null
      })
    }
    return this.polkadot._api.query[this.palletName][queryName].entries(...params)
  }

  /**
   * @name handlerTXResponse
   * @description Function to resolve a promise evaluating Extrinsic state event
   * @param {*} e Event from transaction subscription
   * @param {*} resolve Resolve Function
   * @param {*} reject Reject Function
   * @param {*} unsub Unsubscribe Function
   */
  async handlerTXResponse (e, resolve, reject, unsub) {
    this.notify({
      message: 'Waiting for Hashed Chain confirmation',
      // background: 'green',
      type: 'listening'
    })
    const { events = [], status } = e
    console.log('events', events)
    console.log('status', status)
    if (status.isFinalized || status.isInBlock) {
      // console.log(`Transaction included at blockHash ${status.asFinalized}`)

      // Loop through Vec<EventRecord> to display all events
      events.forEach(({ phase, event: { data, method, section } }) => {
        console.log(`\t' ${phase}: ${section}.${method}:: ${data}`)
      })

      events.filter(({ event: { section } }) => section === 'system').forEach(({ event: { method, data } }) => {
        if (method === 'ExtrinsicFailed') {
          // txFailedCb(result);
          console.log('ExtrinsicFailed', data)
          const [dispatchError] = data
          let errorInfo

          console.log('ExtrinsicFailed error', data)
          // decode the error
          if (dispatchError.isModule) {
            const decoded = data.registry.findMetaError(dispatchError.asModule)
            errorInfo = `${decoded.section}.${decoded.name}`
          } else {
            // Other, CannotLookup, BadOrigin, no extra info
            errorInfo = dispatchError.toString()
          }

          // console.error('errorInfo', errorInfo)
          console.log('unsub', unsub)
          unsub()
          reject(`Extrinsic failed: ${errorInfo}`)
          // const mod = data[0].asModule
        } else if (method === 'ExtrinsicSuccess') {
          console.log('ExtrinsicSuccess', data)
          console.log('unsub', unsub)
          unsub()
          resolve(data)
          // txSuccessCb(result);
        }
      })
    }
  }

  /**
   * @name requestUsers
   * @description Return available accounts from web3Accounts
   * @returns {Array}
   * [{ address, meta: { genesisHash, name, source }, type }]
   */
  requestUsers () {
    return this.polkadot.requestUsers()
  }

  /**
   * @name getAccountInfo
   * @description Get user details info
   * @param {*} user User address
   * @returns { Object }
   * { identity }
   */
  getAccountInfo (user) {
    return this.polkadot.getAccountInfo(user)
  }

  /**
   * @name isValidPolkadotAddress
   * @description Return a boolean to indicate if is a valid polkadot address
   * @param {String} address polkadot Address
   * @returns BooleanP
   */
  isValidPolkadotAddress (address) {
    return this.polkadot.isValidPolkadotAddress(address)
  }

  /**
   * @name signMessage
   * @description Sign a message
   * @param {String} message Message to sign
   * @param {String} signer User address
   * @returns Object
   */
  async signMessage (message, signer) {
    return this.polkadot.signMessage(message, signer)
  }

  /**
   * @name verifyMessage
   * @description Verify a message
   * @param {String} message Message to verify
   * @param {String} signature Signature from signMessage result
   * @param {String} signer User Address
   * @returns Object
   */
  async verifyMessage (message, signature, signer) {
    return this.polkadot.verifyMessage(message, signature, signer)
  }

  /**
   * @description Just a function to map entries response
   * @param {Array} entries Entries query response
   * @returns Array
   */
  mapEntries (entries) {
    if (!entries.isEmpty) {
      return entries.map(e => {
        // console.log('IDDDD', e[0], e[0].toHuman())
        return {
          key: e[0],
          id: e[0].toHuman(),
          value: e[1].toHuman()
        }
      })
    }
    return undefined
  }
}

// export default BasePolkadot
module.exports = BasePolkadot
