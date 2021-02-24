const axios = require("axios")

const UPLOAD_API_SERVICE_URL = "http://example.com"
const token = "Whatever your token is"
const fetchInitialAssets = (
  batchId,
  baseUrl = UPLOAD_API_SERVICE_URL,
  bearerToken = token
) => {
  const endpoint = `${baseUrl}/get_batch_by_id/${batchId}`
  return axios
    .get(endpoint, {
      headers: {
        authorization: `Bearer ${bearerToken}`,
      },
    })
    .then(response => response.data)
}

module.exports.fetchInitialAssets = fetchInitialAssets
