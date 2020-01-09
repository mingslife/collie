const os = require('os')
const path = require('path')
const axios = require('axios')

const constants = require('../constants')

let axiosInstance = null

async function getPackageData(packageName) {
  let response = await axiosInstance.get(constants.PACKAGE_INFO.replace('{packageName}', packageName))
  let packageData = response.data
  return packageData
}
// 获取远端的 package 信息
function getRemotePackageInfo(packageName) {
  let response = await axiosInstance.get(constants.PACKAGE_INFO.replace('{packageName}', packageName))
  let packageInfo = response.data
  return packageInfo
}
// 获取本地的 package 信息
function getLocalPackageData(packageName) {
  path.join(os.homedir(), constants.USER_CONFIG_NAME)
}

module.exports = argv => {
  axiosInstance = axios.create({
    baseURL: argv.$config.getUserConfig('registry') || constants.DEFAULT_REMOTE_REGISTRY,
    // timeout: 60000,
    headers: {
      'User-Agent': `collie/${require('../package.json').version}`
    }
  })

  const registryInterface = {
    axios: axiosInstance,
    getPackageData,
  }
  Object.freeze(registryInterface)
  argv.$registry = registryInterface

  return {}
}
