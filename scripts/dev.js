const { spawn } = require('child_process')

const npmCommand = process.platform === 'win32' ? (process.env.npm_execpath ? process.execPath : 'npm.cmd') : 'npm'
const npmArgs = process.env.npm_execpath ? [process.env.npm_execpath] : []
const spawnOptions = { stdio: 'inherit', env: process.env }
const processes = [
  spawn(npmCommand, [...npmArgs, 'run', 'start'], spawnOptions),
  spawn(npmCommand, [...npmArgs, '--prefix', 'frontend', 'run', 'dev'], spawnOptions)
]

let stopping = false
const stop = code => {
  if (stopping) return
  stopping = true
  processes.forEach(child => child.kill())
  process.exit(code)
}

processes.forEach(child => child.on('exit', code => {
  if (!stopping && code !== 0) stop(code || 1)
}))
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
