// https://github.com/node-ffi/node-ffi/wiki/Node-FFI-Tutorial
const ffi = require("ffi-napi")
const path = require("path")
const url = require("url")
import { VerifierOptions } from "@pact-foundation/pact-node"
import { flatten } from "lodash"

// TODO: make this dynamic, and download during install/on-demand
const dll = "../../native/libpact_verifier_ffi.dylib"

// Map the FFI c interface
//
// char* version();
// void free_string(char* s);
// int verify(char* s);
const lib = ffi.Library(path.join(__dirname, dll), {
  init: ["string", ["string"]],
  version: ["string", []],
  free_string: ["void", ["string"]],
  verify: ["int", ["string"]],
})

export const verify = (opts: VerifierOptions): Promise<any> => {
  return new Promise((resolve, reject) => {
    lib.init("LOG_LEVEL")
    const port = 1234
    const u = url.parse(opts.providerBaseUrl)

    const mappedArgs = [
      "--provider-name",
      opts.provider,
      "--state-change-url",
      opts.providerStatesSetupUrl,
      "--loglevel",
      opts.logLevel?.toLocaleLowerCase(),
      "--port",
      u.port,
      "--hostname",
      u.hostname,
      "--broker-url",
      opts.pactBrokerUrl,
      "--user",
      opts.pactBrokerUsername,
      "--password",
      opts.pactBrokerPassword,
      "--provider-version",
      opts.providerVersion,
    ]

    if (opts.publishVerificationResult) {
      mappedArgs.push("--publish")
    }

    if (opts.enablePending) {
      mappedArgs.push("--enable-pending")
    }

    if (opts.consumerVersionTags) {
      mappedArgs.push("--consumer-version-tags")
      mappedArgs.push(flatten([opts.consumerVersionTags]).join(","))
    }
    if (opts.providerVersionTags) {
      mappedArgs.push("--provider-version-tags")
      mappedArgs.push(flatten([opts.providerVersionTags]).join(","))
    }

    const request = mappedArgs.join("\n")
    console.log("sending arguments to FFI:", request)

    lib.verify.async(request, (err: any, res: any) => {
      console.log("response from verifier", err, res)
      if (err) {
        reject(err)
      } else {
        resolve(`finished: ${res}`)
      }
    })
  })
}
