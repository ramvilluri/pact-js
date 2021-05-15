// IIFE - TL;DR gives us async/await
//
// mkdir -p pacts; touch pacts/_.json; rm pacts/*.json; LOG_LEVEL=info node test.js

(async () => {
  // https://github.com/node-ffi/node-ffi/wiki/Node-FFI-Tutorial
  const ffi = require("ffi-napi")
  const path = require("path")
  const axios = require("axios")
  const ref = require('ref-napi')
  const struct = require('ref-struct-di')(ref)
  const { isFunction, isNil } = require("lodash")


  // TODO: make this dynamic, and download during install/on-demand
  // TODO: use install_name_tool to dynamically set the id (because OSX)
  const dll = "../../native/libpact_mock_server_ffi.dylib"
  const pactDir = path.join(__dirname, "pacts")

  // Condensed c headers

  /// External interface to cleanup a mock server. This function will try terminate the mock server
  /// with the given port number and cleanup any memory allocated for it. Returns true, unless a
  /// mock server with the given port number does not exist, or the function panics.
  ///
  /// **NOTE:** Although `close()` on the listener for the mock server is called, this does not
  /// currently work and the listener will continue handling requests. In this
  /// case, it will always return a 404 once the mock server has been cleaned up.
  // bool cleanup_mock_server(int32_t mock_server_port);

  /// External interface to create a mock server. A pointer to the pact JSON as a C string is passed in,
  /// as well as the port for the mock server to run on. A value of 0 for the port will result in a
  /// port being allocated by the operating system. The port of the mock server is returned.
  ///
  /// # Errors
  ///
  /// Errors are returned as negative values.
  ///
  /// | Error | Description |
  /// |-------|-------------|
  /// | -1 | A null pointer was received |
  /// | -2 | The pact JSON could not be parsed |
  /// | -3 | The mock server could not be started |
  /// | -4 | The method panicked |
  /// | -5 | The address is not valid |
  ///
  // int32_t create_mock_server(const char *pact_str, const char *addr_str);

  /// Adds a provider state to the Interaction
  // void given(InteractionHandle interaction, const char *description);

  /// Initialise the mock server library
  // void init();

  /// Get self signed certificate for TLS mode
  // char* get_tls_ca_certificate()

  /// Free a string allocated on the Rust heap
  // void free_string(const char *s)

  /// External interface to check if a mock server has matched all its requests. The port number is
  /// passed in, and if all requests have been matched, true is returned. False is returned if there
  /// is no mock server on the given port, or if any request has not been successfully matched, or
  /// the method panics.
  // bool mock_server_matched(int32_t mock_server_port);

  /// External interface to get all the mismatches from a mock server. The port number of the mock
  /// server is passed in, and a pointer to a C string with the mismatches in JSON format is
  /// returned.
  ///
  /// **NOTE:** The JSON string for the result is allocated on the heap, and will have to be freed
  /// once the code using the mock server is complete. The [`cleanup_mock_server`](fn.cleanup_mock_server.html) function is
  /// provided for this purpose.
  ///
  /// # Errors
  ///
  /// If there is no mock server with the provided port number, or the function panics, a NULL
  /// pointer will be returned. Don't try to dereference it, it will not end well for you.
  ///
  // char *mock_server_mismatches(int32_t mock_server_port);

  /// Creates a new Interaction and returns a handle to it
  // InteractionHandle new_interaction(PactHandle pact, const char *description);

  /// Creates a new Pact model and returns a handle to it
  // PactHandle new_pact(const char *consumer_name, const char *provider_name);

  /// Sets the description for the Interaction
  // void upon_receiving(InteractionHandle interaction, const char *description);

  /// External interface to trigger a mock server to write out its pact file. This function should
  /// be called if all the consumer tests have passed. The directory to write the file to is passed
  /// as the second parameter. If a NULL pointer is passed, the current working directory is used.
  ///
  /// Returns 0 if the pact file was successfully written. Returns a positive code if the file can
  /// not be written, or there is no mock server running on that port or the function panics.
  ///
  /// # Errors
  ///
  /// Errors are returned as positive values.
  ///
  /// | Error | Description |
  /// |-------|-------------|
  /// | 1 | A general panic was caught |
  /// | 2 | The pact file was not able to be written |
  /// | 3 | A mock server with the provided port was not found |
  // int32_t write_pact_file(int32_t mock_server_port, const char *directory);


  // Struct Mapping (not needed for C++ as it reads the .h file directly)
  const pact = ref.types.void // unknown type
  const interaction = ref.types.void // unknown type
  const InteractionPtr = ref.refType(interaction)
  const PactPtr = ref.refType(pact)
  const PactHandle = struct({
    'pact': PactPtr,
  })
  const InteractionHandle = struct({
    'pact': PactPtr,
    'interaction': InteractionPtr,
  })
  const INTERACTION_PART_REQUEST = 0;
  const INTERACTION_PART_RESPONSE = 1;

  // Spec version enum
  const SPECIFICATION_VERSION_UNKNOWN = 0;
  const SPECIFICATION_VERSION_V1 = 1;
  const SPECIFICATION_VERSION_V1_1 = 2;
  const SPECIFICATION_VERSION_V2 = 3;
  const SPECIFICATION_VERSION_V3 = 4;
  const SPECIFICATION_VERSION_V4 = 5;

  // Function mapping
  // see https://github.com/pact-foundation/pact-cplusplus/blob/master/consumer/src/consumer.cpp for example usage
  const lib = ffi.Library(path.join(__dirname, dll), {
    init: ["string", ["string"]],
    version: ["string", []],
    free_string: ["void", ["string"]],
    create_mock_server_for_pact: ["int", [PactHandle, "string", "bool"]], // Pact handle, address, tls -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.create_mock_server_for_pact.html
    new_pact: [PactHandle, ["string", "string"]], // consumer name, provider name -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.new_pact.html
    new_interaction: [InteractionHandle, [PactHandle, "string"]], // pact handle, description -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.new_interaction.html
    upon_receiving: ["void", [InteractionHandle, "string"]], // interaction handle, description -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.upon_receiving.html
    given: ["void", [InteractionHandle, "string"]], // interaction handle, state -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.new_interaction.html
    with_request: ["void", [InteractionHandle, "string", "string"]], // interaction handle, method,path -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.with_request.html
    with_query_parameter: ["void", [InteractionHandle, "string", "int", "string"]], // interaction handle, name, index, value -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.with_query_parameter.html
    with_header: ["void", [InteractionHandle, "int", "string", "int", "string"]], // interaction handle, interaction part, name, index, value -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.with_header.html
    with_body: ["void", [InteractionHandle, "int", "string", "string"]], // interaction handle,interaction part, content_type, body ->https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.with_body.html
    response_status: ["void", [InteractionHandle, "int"]], // interaction handle, status -> https://docs.rs/pact_mock_server_ffi/0.0.7/pact_mock_server_ffi/fn.response_status.html
    write_pact_file: ["int", ["int", "string"]], // mock server port, directory to write file to
    cleanup_mock_server: ["bool", ["int"]], // mock server port
    mock_server_mismatches: ["string", ["int"]], // mock server port
    log: ["void", ["string", 'string']], // log level, message
    with_specification: ["void", [PactHandle, "int"]], // pact handle, specification version (see const/enum above)
    get_tls_ca_certificate: ["string", []], // get back the TLS certificate as a string. Useful to load into the trust store in advance if people are desperate for using TLS
  })

  const newPact = (consumer, provider, version) => {
    lib.init("LOG_LEVEL")

    const p = lib.new_pact(consumer, provider)
    lib.with_specification(p, version)

    return p
  }

  const newInteraction = (handle, description) => {
    return lib.new_interaction(handle, description)
  }

  const uponReceiving = (handle, description) => {
    lib.upon_receiving(handle, description)

    return handle
  }

  const given = (handle, state) => {
    lib.given(handle, state)

    return handle
  }

  const withRequest = (handle, method, path) => {
    lib.with_request(handle, method, path)

    return handle
  }

  const withQuery = (handle, name, index, value) => {
    lib.with_query_parameter(handle, name, index, value)

    return handle
  }

  const withRequestHeader = (handle, name, index, value) => {
    lib.with_header(handle, INTERACTION_PART_REQUEST, name, index, value)

    return handle
  }

  const withJSONRequestBody = (handle, body) => {
    lib.with_body(handle, INTERACTION_PART_REQUEST, "application/json", body)

    return handle
  }

  const withRequestBody = (handle, contentType, body) => {
    lib.with_body(handle, INTERACTION_PART_REQUEST, contentType, body)

    return handle
  }

    const withResponseHeader = (handle, name, index, value) => {
      lib.with_header(handle, INTERACTION_PART_RESPONSE, name, index, value)

      return handle
    }

  const withJSONResponseBody = (handle, body) => {
    const json = (typeof body === "string") ? body : JSON.stringify(body)
    lib.with_body(handle, INTERACTION_PART_RESPONSE, "application/json", json)

    return handle
  }

  const withResponseBody = (handle, contentType, body) => {
    lib.with_body(handle, INTERACTION_PART_RESPONSE, contentType, body)

    return handle
  }

  const withStatus = (handle, status) => {
    lib.response_status(handle, status)

    return handle
  }

  //
  // Example matchers. See Matchers.ts in v3 repo for the structure of these
  //

  const like = (value) => {
    if (isNil(value) || isFunction(value)) {
      throw new MatcherError(
        "Error creating a Pact somethingLike Match. Value cannot be a function or undefined"
      )
    }

    return {
      "pact:matcher:type": "type",
      value,
    }
  }


  //
  // Example project
  //

  // Create the Pact and interaction
  const p = newPact("foo-consumer", "bar-provider", SPECIFICATION_VERSION_V2)
  const i = newInteraction(p, "some description")
  uponReceiving(i, "a request to get a dog") // not sure why a description here is needed if newInteraction also has it?
  given(i, "fido exists")
  withRequest(i, "GET", "/dogs/1234")
  withRequestHeader(i, "x-special-header", 0, "header")
  withQuery(i, "someParam", 0, "someValue")
  withJSONResponseBody(i, {
    name: like("fido"),
    age: like(23),
    alive: like(true)
  })
  withResponseHeader(i, "x-special-header", 0, "header")
  withStatus(i, 200)

  lib.log("INFO", "this message came frome Pact JS")

  // Start the mock service
  const host = "127.0.0.1"
  const port = lib.create_mock_server_for_pact(p, `${host}:0`, false)
  console.log("have a port: ", port)

  // Run the test
  try {
    const res = await axios.request({
      baseURL: `http://${host}:${port}`,
      headers: { Accept: "application/json", "x-special-header": "header" },
      params: {
        someParam: "someValue"
      },
      method: "GET",
      url: "/dogs/1234", // break me, I dare you!
    })

    console.log('successful response!', res.status, res.data)

  } catch (e) {
    console.error("error making dogs API call: ", e.response.status, e.response.data)
  }

  // Exit status
  let status = 0

  // Check for any mismatches
  const mismatches = JSON.parse(lib.mock_server_mismatches(port))
  if (mismatches.length > 0) {
    console.dir("mismatches: ")
    console.dir(mismatches, { depth: 10 })
    status = 1
  } else {
    // Write pact file
    const status = lib.write_pact_file(port, pactDir)
    console.log("write pact done => ", status)
  }

  // Cleanup any remaining processes
  console.log("cleaning up")
  const clean = lib.cleanup_mock_server(port)
  console.log("shutdown server on port", port, "success?", clean)

  // Pass/Fail?
  process.exit(status)
})()