import HttpProxy from 'http-proxy';

// This exists to:
//
// 1. Make bodies available to request filters via "req.body"
// 2. Allow bodies to be _modified_ by the request filter
//
// We basically restream parsed body (via bodyparser which consumes the Buffer) before
// forward proxying down the middleware chain.
//
// Basically, body parser consumes the stream, so the next link in the proxy chain is waiting
// for the content but never sees it.
//
// This writes the data back to the stream and continues the proxy middleware chain
// NOTE: if any of the proxy wide middleware change above, the logic here will need
//       revisiting. At the moment, JSON payloads will show up as "object" and all else
//       will be a buffer
//
// See https://github.com/http-party/node-http-proxy/blob/master/examples/middleware/bodyDecoder-middleware.js
// for an example that inspired this code
export const rehydrateBody = (proxy: HttpProxy): void => {
  proxy.on('proxyReq', (proxyReq, req: any) => {
    if (!req.body || !Object.keys(req.body).length) {
      return;
    }

    let bodyData;

    if (Buffer.isBuffer(req.body)) {
      bodyData = req.body;
    } else if (typeof req.body === 'object') {
      bodyData = JSON.stringify(req.body);
    }

    if (bodyData) {
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  });
};
