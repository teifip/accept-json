const http = require('http');
const https = require('https');
const qs = require('querystring');
const { URL } = require('url');

module.exports = function(baseUrl, options = {}) {
  return new ApiClient(new URL(baseUrl), options);
}

function ApiClient(baseUrl, options) {
  if (baseUrl.protocol !== 'http:' && baseUrl.protocol !== 'https:') {
    throw new TypeError('Invalid URL');
  }

  this.protocol = baseUrl.protocol === 'http:' ? http : https;

  if (baseUrl.pathname !== '/' && baseUrl.pathname.endsWith('/')) {
    baseUrl.pathname = baseUrl.pathname.slice(0, -1);
  }

  this.endpoint = {
    protocol: baseUrl.protocol,
    hostname: baseUrl.hostname,
    port: baseUrl.port,
    path: baseUrl.pathname
  };

  this.headers = Object.assign({'accept': 'application/json'}, options.headers);

  this.timeout = options.timeout;

  if (options.token) {
    this.headers.authorization = `Bearer ${options.token}`;
  } else if (options.basic) {
    this.headers.authorization = `Basic ${options.basic}`;
  } else if (options.user && options.password) {
    this.endpoint.auth = `${options.user}:${options.password}`;
  }

  if (options.rejectUnauthorized !== undefined) {
    this.endpoint.rejectUnauthorized = options.rejectUnauthorized;
  }

  if (options.ca !== undefined) {
    this.endpoint.ca = options.ca;
  }

  if (options.keepAliveMsecs) {
    this.endpoint.agent = new this.protocol.Agent({
      keepAlive: true,
      keepAliveMsecs: options.keepAliveMsecs,
      maxSockets: options.maxSockets || 1
    });
  }
}

ApiClient.prototype.get = function(path, ...rest) {
  return makeRequest.call(this, 'GET', path, rest);
}

ApiClient.prototype.post = function(path, ...rest) {
  return makeRequest.call(this, 'POST', path, rest);
}

ApiClient.prototype.put = function(path, ...rest) {
  return makeRequest.call(this, 'PUT', path, rest);
}

ApiClient.prototype.patch = function(path, ...rest) {
  return makeRequest.call(this, 'PATCH', path, rest);
}

ApiClient.prototype.delete = function(path, ...rest) {
  return makeRequest.call(this, 'DELETE', path, rest);
}

ApiClient.prototype.options = function(path, ...rest) {
  return makeRequest.call(this, 'OPTIONS', path, rest);
}

ApiClient.prototype.head = function(path, ...rest) {
  return makeRequest.call(this, 'HEAD', path, rest);
}

ApiClient.prototype.destroy = function() {
  if (this.endpoint.agent) {
    this.endpoint.agent.destroy();
  }
}

function makeRequest(method, path = '/', rest) {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    throw new TypeError('Invalid path');
  }

  let options = {};
  let callback = null;

  if (rest.length > 0 && rest[rest.length - 1] === undefined) {
    rest.pop();
  }
  if (rest.length > 0 && rest[0].constructor === Object) {
    options = rest.shift();
  }
  if (rest.length > 0 && typeof rest[0] === 'function') {
    callback = rest.shift();
  }
  if (rest.length > 0) {
    throw new TypeError('Invalid arguments');
  }

  let reqOptions = Object.assign({ method: method }, this.endpoint);

  if (path !== '/') {
    reqOptions.path += (reqOptions.path === '/' ? path.slice(1) : path);
  }

  if (options.query) {
    reqOptions.path += `?${qs.stringify(options.query)}`;
  }

  reqOptions.headers = Object.assign({}, this.headers);

  let reqBody = '';

  if (options.json) {
    reqOptions.headers['content-type'] = 'application/json';
    reqBody = JSON.stringify(options.json);
  } else if (options.form) {
    reqOptions.headers['content-type'] = 'application/x-www-form-urlencoded';
    reqBody = qs.stringify(options.form);
  } else if (options.text) {
    reqOptions.headers['content-type'] = 'text/plain';
    reqBody = options.text;
  }

  if (options.token) {
    reqOptions.headers.authorization = `Bearer ${options.token}`;
  } else if (options.basic) {
    reqOptions.headers.authorization = `Basic ${options.basic}`;
  } else if (options.user && options.password) {
    reqOptions.auth = `${options.user}:${options.password}`;
  }

  Object.assign(reqOptions.headers, options.headers);

  if (callback) {
    request.call(this, reqOptions, reqBody, path, callback);
  } else {
    return new Promise((resolve, reject) => {
      request.call(this, reqOptions, reqBody, path, resolve, reject);
    });
  }
}

function request(reqOptions, reqBody, path, ...callbacks) {
  let req = this.protocol.request(reqOptions, (res) => {
    let resBody = '';

    res.on('data', data => resBody += data);

    res.on('end', () => {
      try {
        resBody = JSON.parse(resBody);
      } catch (error) {}

      let response = {
        code: res.statusCode,
        message: res.statusMessage,
        headers: res.headers,
        body: resBody || {}
      };

      if (res.headers.location) {
        let loc = new URL(res.headers.location);
        loc.search = '';
        loc.pathname = loc.pathname.slice(0, loc.pathname.indexOf(path));
        response.redirection = loc.toString();
      }

      if (callbacks.length === 1) {
        callbacks[0](null, response);
      } else {
        callbacks[0](response);
      }
    });
  });

  if (this.timeout) {
    req.setTimeout(this.timeout, () => req.abort());
  }

  req.on('error', error => callbacks[callbacks.length - 1](error));

  req.end(reqBody);
}
