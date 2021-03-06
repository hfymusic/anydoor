const {cache} = require('../config/defaultConf');

function refreshRes(stats, res) {
  const {maxAge, expires, cacheControl, lastModified, etag} = cache;

  if (expires) {
    res.setHeader('Expires', (new Date(Date.now() + maxAge * 1000)).toUTCString());
  }

  if (cacheControl) {
    res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
  }

  if (lastModified) {
    res.setHeader('Last-Modified', stats.mtime.toUTCString());
  }

  if (etag) {
    res.setHeader('ETag', `${stats.size}-${stats.mtime.toUTCString()}`); // mtime 需要转成字符串，否则在 windows 环境下会报错
  }
}

module.exports = function isFresh(stats, req, res) {
  refreshRes(stats, res);

  const lastModified = req.headers['if-modified-since'];
  const etag = req.headers['if-none-match'];

  if (!lastModified && !etag) { // 有可能是第一次请求
    return false;
  }

  if (lastModified && lastModified !== res.getHeader('Last-Modified')) { // 失效了
    return false;
  }

  if (etag && etag !== res.getHeader('ETag')) { // 不新鲜了
    return false;
  }

  return true;
};
