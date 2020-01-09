const axios = require('axios')

const constants = require('../constants')

let axiosInstance = null

const registryInterface = {}

registryInterface.axios = axiosInstance
registryInterface.getPackageData = async (packageName) => {
  let response = await axiosInstance.get(constants.PACKAGE_DATA.replace('{packageName}', packageName))
  let packageData = response.data
  return packageData
}

module.exports = argv => {
  axiosInstance = axios.create({
    baseURL: argv.$config.getUserConfig('registry') || constants.DEFAULT_REGISTRY,
    // timeout: 60000,
    headers: {
      'User-Agent': 'collie/0.0.1'
    }
  })

  Object.freeze(registryInterface)
  argv.$registry = registryInterface

  return {}
}
