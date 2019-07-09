import fs from 'fs'


export const walk = async(path, ignore, callback) => {
  for( let i in ignore ) {
    if ( null !== path.match( ignore[i] ) ) {
      return
    }
  }

  const stat = fs.lstatSync(path)

  if (stat.isFile()) {
    await callback(path, stat)
  }
  else {
    const files = fs.readdirSync(path)
    for( let f in files ) {
      await walk(`${path}/${files[f]}`, ignore, callback)
    }
  }
}