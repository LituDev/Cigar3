'use strict'

const path = require('path')
const fastify = require('fastify')({ logger: false })

fastify
  .register(require("fastify-static"), {
    // An absolute path containing static files to serve.
    root: path.join(__dirname, '/web')
  })
  .listen(3000, err => {
    if (err) throw err
    else {
        console.log("Local web server opened on port 3000!")
    }
  })