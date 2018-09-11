# accept-json

Basic client for HTTP JSON APIs. Not a replacement for the very popular [request](https://github.com/request/request) and [got](https://github.com/sindresorhus/got) packages.

The client can send request data as query parameters, JSON body, URL encoded body or plain text body, and expects responses to be returned as non compressed JSON body.

### Overview

```javascript
const apiClient = require('accept-json');

const client = apiClient('http://localhost:8080/basepath');

client.get('/path', (error, response) => {
  // process response
});
```

All the request methods can either be invoked with callbacks (as in the example above) or return promises:

```javascript
client.get('/path').then(processResponse);
```

```javascript
async function makeRequest() {
  let response = await client.get('/path');
}
```

Once instantiated, the client can be used for multiple subsequent requests:

```javascript
async function makeRequest() {
  let response = await client.get('/path', {
    query: { p: 10, q: 20 }
  });
  let otherResponse = await client.post('/otherPath', {
    json: { a: 1, b: 'Hello World' }
  });
}
```

Options are available to configure the client and the individual requests with details such as special header fields, authentication info, request timeouts:

```javascript
const client = apiClient('http://localhost:8080/basepath', {
  keepAliveMsec: 3000,
  headers: { 'x-protocol-version': '1.0' }
});

const options = {
  token: 'RHVtbXkgQmVhcmVyIFRva2Vu',
  query: { db: 'myDB', limit: 20 }
};

client.get('/path', options).then(processResponse);
```

### Installation

```
npm install accept-json --save
```

### Usage

The API client is instantiated as follows:

```javascript
const apiClient = require('accept-json');

const client = apiClient(baseUrl, options);
```

`baseUrl` must be a valid URL string, starting with `http://` or `https://`.

If present, `options` must be an object with following properties:

| Property             | Description |
|:---------------------|:------------|
| `token`              | OPTIONAL - String; token for HTTP Bearer authentication (OAuth2) |
| `basic`              | OPTIONAL - String; base64 encoding of `<user>:<password>` (HTTP Basic authentication); alternatively, user name and password can be specified as separate strings (see next) |
| `user`               | OPTIONAL - String; user name for HTTP Basic authentication; takes effect only if also `password` is specified |
| `password`           | OPTIONAL - String; password for HTTP Basic authentication; takes effect only if also `user` is specified |
| `timeout`            | OPTIONAL - Integer number; request timeout in milliseconds |
| `headers`            | OPTIONAL - Object; headers to be added to the request; there is no need to specify the `accept` header or the `content-type` header since they are automatically generated |
| `rejectUnauthorized` | OPTIONAL - Boolean; default to `true`; see [tls.connect()](https://nodejs.org/dist/latest-v8.x/docs/api/tls.html#tls_tls_connect_options_callback) documentation for information |
| `ca` | OPTIONAL - String, array of strings, buffer, or array of buffers; default to the list of well-known CAs curated by Mozilla; see [tls.createSecureContext()](https://nodejs.org/dist/latest-v8.x/docs/api/tls.html#tls_tls_createsecurecontext_options) for information |
| `keepAliveMsec` | OPTIONAL - Integer number; when present, creates a persistent connection to the server with the specified keep alive in milliseconds |
| `maxSockets`    | OPTIONAL - Integer number; maximum number of concurrent sockets to the server; takes effect only when `keepAliveMsec` is specified and has `1` (single socket) as default value |

Once the API client has been instantiated, requests are made through the following methods:

**client.post(path[, options][, callback])**

Initiates a POST request to the server. `path`specifies the request path (relative to the `baseUrl` configured for the client). Must be a string starting with `/`.

If present, `callback` must be a function that expects `(error, result)` as input parameters. Otherwise, if `callback` is not present, then `client.post()` returns a promise to resolve `result` or to catch `error`.

If present, `options` must be an object with the following properties:

| Property        | Description |
|:----------------|:------------|
| `query`         | OPTIONAL - Object; if present, a query string is generated with the specified keys and values |
| `json`          | OPTIONAL - Object; if present, the `json` object is serialized into a JSON body and the `content-type` header is set to `application/json` |
| `form`          | OPTIONAL - Object; if present, the `form` object is serialized into a URL-encoded body and the `content-type` header is set to `application/x-www-form-urlencoded`; `form` is disregarded if `json` is present |
| `text`          | OPTIONAL - String; if present, the `text` string is used as request body and the `content-type` header is set to `text/plain`; `text` is disregarded if `json` or `form` is present |
| `token`         | OPTIONAL - String; token for HTTP Bearer authentication (OAuth2); takes precedence over the `token` optionally specified when instantiating the client |
| `basic`         | OPTIONAL - String; base64 encoding of `<user>:<password>` (HTTP Basic authentication); takes precedence over the `basic` value optionally specified when instantiating the client; alternatively, user name and password can be specified as separate strings (see next) |
| `user`          | OPTIONAL - String; user name for HTTP Basic authentication; takes effect only if also `password` is specified, and the two values take precedence over the `user` / `password` optionally specified when instantiating the client |
| `password`      | OPTIONAL - String; password for HTTP Basic authentication; takes effect only if also `user` is specified, and the two values take precedence over the `user` / `password` optionally specified when instantiating the client |
| `headers`       | OPTIONAL - Object; headers to be added to the request; values specified here take precedence over the corresponding values optionally specified when instantiating the client; there is no need to specify the `accept` header or the `content-type` header since they are automatically generated

The `result` value is an object defined as follows:

| Property      | Description |
|:--------------|:------------|
| `code`        | Integer number; response status code |
| `message`     | String; response status message |
| `header`      | Object; response headers |
| `body`        | Response body returned as object if the body received from the server is parsable with `JSON.parse()` or as string otherwise; this is intended to be robust to misbehaving servers that send plain text responses rather than JSON responses upon certain error conditions |
| `redirection` | String; only present in case the server replied with a redirection; derived from the `location` header by stripping away the search string and the request `path`. The `redirection` value can be used as `baseUrl` to instantiate a new client pointing to the new location |

**client.get(path[, options][, callback])**

Same as `client.post()` above, but for GET requests.

**client.put(path[, options][, callback])**

Same as `client.post()` above, but for PUT requests.

**client.patch(path[, options][, callback])**

Same as `client.post()` above, but for PATCH requests.

**client.delete(path[, options][, callback])**

Same as `client.post()` above, but for DELETE requests.

**client.options(path[, options][, callback])**

Same as `client.post()` above, but for OPTIONS requests.

**client.head(path[, options][, callback])**

Same as `client.post()` above, but for HEAD requests.

**client.destroy()**

In general there is no need to destroy a client. However, if a client that was configured to keep persistent connection to the server is not needed any longer, it is a good idea to destroy it so that the corresponding socket(s) are freed up.
