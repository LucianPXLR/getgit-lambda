import _ from 'lodash'
import { failure, success } from './lib/response.js'
import * as s3 from './lib/s3.js'
import fs from 'fs'
import { execSync } from 'child_process'


//
// Authorizer for the getGit function

export const getGitAuthorizer = async(event, context, callback) => {
  const jaffa = _.get(event, 'queryStringParameters.jaffa', '')

  if ('kree' !== jaffa) {
    throw new Error('Unauthorized access')
  }

  callback(null, {
    principalId: 'Authorized',
    policyDocument: {
      'Version': '2012-10-17',
      'Statement': [{
        'Sid': 'FirstStatement',
        'Action': 'execute-api:Invoke',
        'Effect': 'Allow',
        'Resource': event.methodArn,
      }, ],
    },
  }, )
}

//
// GetGit downloads a Git repository (ussing SSH for authentication) to a S3 bucket

export const getGit = async(event, context, callback) => {
  try {
    const execSyncParams = {
        encoding: 'utf8',
        stdio: 'inherit',
      },
      tmpDir = '/tmp/getgit',
      repoDir = `${tmpDir}/repo`,
      knownHostsFile = `${tmpDir}/known_hosts`,
      keyFile = `${tmpDir}/id_rsa`

    // Cleanup
    execSync(`rm -rf ${tmpDir} && mkdir -p ${repoDir}`, execSyncParams)

    // Add git host to known_hosts
    execSync(`ssh-keyscan -H ${process.env.GIT_HOST} >> ${knownHostsFile}`, execSyncParams)

    // Get private key
    const deployKey = await s3.getObject({
      Bucket: process.env.DEPLOYKEYS_BUCKET,
      Key: 'id_rsa',
    })

    fs.writeFileSync(`${keyFile}`, deployKey)
    execSync(`chmod 400 ${keyFile}`, execSyncParams)

    // Cloan the repo
    process.env.GIT_SSH_COMMAND = `ssh -o UserKnownknownHostsFile=${knownHostsFile} -i ${keyFile}`
    execSync(`git clone --single-branch --branch ${process.env.GIT_BRANCH} --depth 1 ${process.env.GIT_REPOSITORY} ${repoDir}`, execSyncParams)

    // Zip cloned repo and sync to S3
    execSync(`cd ${repoDir} && git archive -o source.zip HEAD`, execSyncParams)

    // Source bucket is versioned, no need to empty it first
    // await s3.emptyBucket({ Bucket: process.env.SOURCE_BUCKET })

    await s3.putObject({
      Bucket: process.env.SOURCE_BUCKET,
      Key: 'source.zip',
      Body: fs.readFileSync(`${repoDir}/source.zip`),
    })

    // Sync cloned repo to S3
    // await s3.sync({
    //   path: `${repoDir}`,
    //   ignore: [
    //     /\.git$/,
    //     /\.gitignore$/,
    //     /\.md$/,
    //   ],
    //   emptyFirst: true,
    //   logSyncedFiles: true,
    // }, {
    //   Bucket: process.env.SOURCE_BUCKET
    // })

    // Done
    callback(null, success({ status: true }))
  }
  catch (err) {
    console.log(err)
    callback(null, failure({ status: false, message: _.get(err, 'message', '') }))
  }
}
