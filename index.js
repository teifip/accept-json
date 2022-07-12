const http = require('http');
const https = require('https');

module.exports = (baseUrl, options = {}) => {
  const url = new URL(baseUrl);

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new TypeError('Invalid base URL');
  }

  if (url.search || url.hash) {
    throw new TypeError('Invalid base URL');
  }

  return new ApiClient(baseUrl, options);
}

function ApiClient(baseUrl, options) {
  this.baseUrl = baseUrl;

  this.options = {
    headers: Object.assign({'accept': 'application/json'}, options.headers)
  };

  if (options.timeout) {
    this.options.timeout = options.timeout;
  }

  if (options.token) {
    this.options.headers.authorization = `Bearer ${options.token}`;
  } else if (options.basic) {
    this.options.headers.authorization = `Basic ${options.basic}`;
  } else if (options.user && options.password) {
    this.options.auth = `${options.user}:${options.password}`;
  }

  if (options.rejectUnauthorized !== undefined) {
    this.options.rejectUnauthorized = options.rejectUnauthorized;
  }

  if (options.ca !== undefined) {
    this.options.ca = options.ca;
  }

  if (options.keepAliveMsecs) {
    const protocol = baseUrl.startsWith('http:') ? http : https;
    this.options.agent = new protocol.Agent({
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

  const reqUrl = new URL(path, this.baseUrl);
  const reqOptions = Object.assign({ method: method }, this.options);

  if (options.query) {
    const keys = Object.keys(options.query);
    keys.forEach(key => reqUrl.searchParams.append(key, options.query[key]));
  }

  let reqBody = '';

  if (options.json) {
    reqOptions.headers['content-type'] = 'application/json';
    reqBody = JSON.stringify(options.json);
  } else if (options.form) {
    reqOptions.headers['content-type'] = 'application/x-www-form-urlencoded';
    reqBody = (new URLSearchParams(options.form)).toString();
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
    request.call(this, reqUrl, reqOptions, reqBody, callback);
  } else {
    return new Promise((resolve, reject) => {
      request.call(this, reqUrl, reqOptions, reqBody, resolve, reject);
    });
  }
}

function request(reqUrl, reqOptions, reqBody, ...callbacks) {
  const protocol =  reqUrl.protocol === 'http:' ? http : https;

  const req = protocol.request(reqUrl, reqOptions, (res) => {
    let resBody = '';

    res.on('data', data => resBody += data);

    res.on('end', () => {
      try {
        resBody = JSON.parse(resBody.trim());
      } catch (error) {}

      let response = {
        code: res.statusCode,
        message: res.statusMessage,
        headers: res.headers,
        body: resBody || {}
      };

      if (callbacks.length === 1) {
        callbacks[0](null, response);
      } else {
        callbacks[0](response);
      }
    });
  });

  req.on('error', error => callbacks[callbacks.length - 1](error));

  req.on('timeout', () => req.abort());

  req.end(reqBody);
}
