let runtime = null

const setRuntime = (value) => {
  runtime = value || null
}

const getRuntime = () => {
  if (!runtime) {
    throw new Error('Hydra runtime is not initialized. Create a Hydra instance before using 3D helpers.')
  }
  return runtime
}

const clearRuntime = () => {
  runtime = null
}

export { setRuntime, getRuntime, clearRuntime }
