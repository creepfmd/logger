var express = require('express')
var mongoose = require('mongoose')
var getRawBody = require('raw-body')
var app = express()

var loggerCollection

mongoose.connect(process.env.MONGO_URL, { useMongoClient: true }, function (err) {
  if (err) {
    console.error('[LOGGER] ', err.message)
    process.exit()
  }

  loggerCollection = mongoose.connection.db.collection('logger')

  app.listen(8084, function () {
    console.log('Logger listening on port 8084!')
  })
})

app.use(function (req, res, next) {
  getRawBody(req, {
    length: req.headers['content-length'],
    limit: '1mb',
    encoding: 'utf-8'
  }, function (err, string) {
    if (err) return next(err)
    req.text = string
    next()
  })
})

app.get('/new/:correlationId/:sourceId', function (req, res) {
  var docObject = {
    $set: {
      _id: req.params.correlationId
    }
  }
  docObject.$set['sourceId'] = req.params.sourceId

  upsertMongo(req.params.correlationId, docObject, res)
})

app.get('/queued/:correlationId/:timeQueued', function (req, res) {
  var docObject = {
    $set: {
      _id: req.params.correlationId
    }
  }
  docObject.$set['timeQueued'] = req.params.timeQueued

  upsertMongo(req.params.correlationId, docObject, res)
})

app.get('/update/:correlationId/:field/:value', function (req, res) {
  var docObject = {
    $set: {
      _id: req.params.correlationId
    }
  }
  docObject.$set[req.params.field] = req.params.value

  upsertMongo(req.params.correlationId, docObject, res)
})

app.get('/destinationAdded/:correlationId/:destinationId/:messageId/:timeQueued', function (req, res) {
  var docObject = {
    $set: {
      _id: req.params.correlationId
    }
  }
  docObject.$set['destinations.' + req.params.destinationId + '.' + req.params.messageId + '.timeQueued'] = req.params.timeQueued

  upsertMongo(req.params.correlationId, docObject, res)
})

app.get('/destinationUpdated/:correlationId/:destinationId/:messageId/:field/:value', function (req, res) {
  var docObject = {
    $set: {
      _id: req.params.correlationId
    }
  }
  docObject.$set['destinations.' + req.params.destinationId + '.' + req.params.messageId + '.' + req.params.field] = req.params.value

  upsertMongo(req.params.correlationId, docObject, res)
})

function upsertMongo (id, docObject, res) {
  loggerCollection.updateOne(
    { _id: id },
    docObject,
    { upsert: true },
    function (err, result) {
      if (err) {
        console.log(err)
        res.status(500).json({ error: err.message })
      } else {
        if (result) {
          res.status(200).json({ status: 'OK' })
        } else {
          console.log(result)
          res.status(500).json({ error: 'DB error' })
        }
      }
    }
  )
}
