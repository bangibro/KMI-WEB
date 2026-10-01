const { spawn } = require('child_process')

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const processes = [
  spawn(npmCommand, ['run', 'start'], { stdio: 'inherit', env: process.env }),
  spawn(npmCommand, ['--prefix', 'frontend', 'run', 'dev'], { stdio: 'inherit', env: process.env })
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
