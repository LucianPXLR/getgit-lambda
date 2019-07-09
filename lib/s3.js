import _ from 'lodash'
import { walk } from './fs'
import AWS from 'aws-sdk'
import fs from 'fs'


const s3 = new AWS.S3()

export const getObject = (params) => {
  return new Promise((resolve, reject) => {
    s3.getObject(params, (err, data) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(data.Body.toString())
      }
    })
  })
}

export const listObjects = (params) => {
  return new Promise((resolve, reject) => {
    s3.listObjects(params, (err, data) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(data)
      }
    })
  })
}

export const emptyBucket = async(params) => {
  const listResult = await listObjects(params),
    resultContents = _.get(listResult, 'Contents', []),
    objects = _.map(resultContents, (obj) => _.pick(obj, ['Key'])),
    deleteParams = {
      ...params,
      Delete: {
        Objects: objects
      }
    }

  return new Promise((resolve, reject) => {
    if (!objects.length) {
      resolve(deleteParams)
    }

    s3.deleteObjects(deleteParams, (err, data) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(data)
      }
    })
  })
}

export const putObject = (params) => {
  return new Promise((resolve, reject) => {
    s3.putObject(params, (err, data) => {
      if (err) {
        reject(err)
      }
      else {
        resolve(data)
      }
    })
  })
}

export const sync = async(options, params) => {
  const {
    path,
    ignore = [],
    emptyFirst = false,
    logSyncedFiles = false,
  } = options

  if (true === emptyFirst) {
    await emptyBucket(params)
  }

  await walk(path, ignore, async(filePath, stat) => {
    const putObjectParams = {
      ...params,
      Key: filePath.substring(path.length + 1),
      Body: fs.readFileSync(filePath),
    }

    await putObject(putObjectParams)

    if ( logSyncedFiles ) {
      console.log( `Synced ${putObjectParams.Key}` )
    }
  })
}
