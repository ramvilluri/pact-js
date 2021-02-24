"use strict"

const { pactWith } = require("jest-pact")
const { Matchers } = require("@pact-foundation/pact")

const { fetchInitialAssets } = require("../services")

pactWith(
  { consumer: "Jest Consumer Example", provider: "Jest Provider Example" },
  provider => {
    describe("fetchInitialAssets", () => {
      const expectedBody = {
        someField: Matchers.like("Whatever the content is meant to be"),
      }

      beforeEach(() => {
        const interaction = {
          state: "<Token> is a valid Bearer token",
          uponReceiving: "a request for the batch with ID 'foo'",
          withRequest: {
            method: "GET",
            path: "/get_batch_by_id/foo",
            headers: {
              Accept: "application/json, text/plain, */*",
              authorization: "Bearer <token>",
            },
          },
          willRespondWith: {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
            body: expectedBody,
          },
        }
        return provider.addInteraction(interaction)
      })

      // add expectations
      it("returns a successful body", () => {
        return fetchInitialAssets(
          "foo",
          provider.mockService.baseUrl,
          "<token>"
        ).then(content => {
          expect(content).toEqual(Matchers.extractPayload(expectedBody))
        })
      })
    })
  }
)
