export function success(body) {
  return buildResponse(200, body)
}

export function failure(body) {
  return buildResponse(500, body)
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      // Just in case, CORS and no-cache
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': 0,
    },
    body: JSON.stringify(body),
  }
}
