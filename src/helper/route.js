const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const promisify = require('util').promisify;
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
// const conf = require('../config/defaultConf');
const mime = require('./mime');
const compress = require('./compress');
const range = require('./range');
const isFresh = require('./cache');

// 确保相对路径没问题，所以引入path进行绝对路径拼接
const tplPath = path.join(__dirname,'../template/dir.tpl');
// 读取模板文件，将读取到的buffer强制转换成utf-8字符串；也可以在source中通过toString()转成字符串
const source = fs.readFileSync(tplPath,'utf-8');
// 编译模板文件
const template = Handlebars.compile(source);

module.exports = async function(req, res, filePath, conf){
  try{
    const stats = await stat(filePath);
    if(stats.isFile()){
      const contentType = mime(filePath);
      res.setHeader('Content-Type', contentType);

      if (isFresh(stats, req, res)) {
        res.statusCode = 304;
        res.end();
        return;
      }

      let rs;
      const {code, start, end} = range(stats.size, req, res);
      if(code === 200){
        res.statusCode = 200;
        rs = fs.createReadStream(filePath);
      }else{
        res.statusCode = 206;
        rs = fs.createReadStream(filePath,{ start: start, end: end});
      }

      if(filePath.match(conf.compress)) rs = compress(rs, req, res);
      rs.pipe(res);
    }else if(stats.isDirectory()){
      const files = await readdir(filePath);
      const dir = path.relative(conf.root, filePath);
      const data = {
        title: path.basename(filePath),
        dir: dir ? `/${dir}` : '',
        files
      };
      res.statusCode = 200;
      res.setHeader('Content-Type','text/html');
      // res.end(files.join(','));
      res.end(template(data));
    }
  }catch(ex){
    console.error(ex);
    res.statusCode = 404;
    res.setHeader('Content-Type','text/plain');
    res.end(`${filePath} is not a directory or file\n ${ex}`);
  }
};
