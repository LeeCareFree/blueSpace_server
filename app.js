/*
 * @Author: your name
 * @Date: 2020-10-09 11:26:39
 * @LastEditTime: 2021-03-08 12:22:42
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \blueSpace_server\app.js
 */
const Koa = require('koa')
const app = new Koa()
const parameter = require('koa-parameter');
const views = require('koa-views')
const json = require('koa-json')
const onerror = require('koa-onerror')
const bodyparser = require('koa-bodyparser')
const logger = require('koa-logger')
const conditional = require('./middleware/conditionalParameters');
const users = require('./routes/users');
const home = require('./routes/home');
const upload = require('./routes/upload');
const jwtKoa = require('koa-jwt');
const {secret} = require('./bin/config');
const checkToken  = require('./middleware/checkToken');
const db = require('./db/dbConnect')
const path = require('path')
const koaBody = require('koa-body')
const cors = require('koa2-cors')

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('db success');
});
// error handler
onerror(app)

app.use(
  cors({
      origin: function(ctx) { //设置允许来自指定域名请求
          if (ctx.url === '/test') {
              return '*'; // 允许来自所有域名请求
          }
          return 'http://localhost:8080';
      },
      maxAge: 5, //指定本次预检请求的有效期，单位为秒。
      credentials: true, //是否允许发送Cookie
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], //设置所允许的HTTP请求方法
      allowHeaders: ['Content-Type', 'Authorization', 'Accept'], //设置服务器支持的所有头信息字段
      exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'] //设置获取其他自定义字段
  })
)

// middlewares
// app.use(bodyparser({
//   enableTypes:['json', 'form', 'text']
// }))
app.use(json())
app.use(logger())
app.use(require('koa-static')(__dirname + '/public'))
app.use(views(__dirname + '/views', {
  extension: 'ejs'
}))
app.use(checkToken());
app.use(jwtKoa({
  secret: secret
}).unless({
  path: [/^\/api\/users\/login/,/^\/api\/users\/register/,/^\/upload\/*/]
}));

app.use(koaBody({
  multipart: true,
  strict: false,
  formidable: {
    // uploadDir:path.join(__dirname,'public/upload/'),
    keepExtensions: true,
    // onFileBegin:(name,file) => {
    //   const dir = path.join(__dirname,`public/upload/`)
    //   if(name === 'publish') {
    //     file.path = `${dir}/publish/${file.name}`
    //   } else if (name === '') {

    //   }
    // }
    multipart: true
  }
}))

// logger
app.use(async (ctx, next) => {
  const start = new Date()
  await next()
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}ms`)
})

app.use(users.routes(), users.allowedMethods())
app.use(home.routes(), home.allowedMethods())
app.use(upload.routes())

// error-handling
app.on('error', (err, ctx) => {
  console.error('server error', err, ctx)
});
app.use(conditional(app));
app.use(parameter(app))
module.exports = app
