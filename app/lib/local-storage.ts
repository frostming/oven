import { useEffect, useState } from 'react'

function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState(() => {
    let currentValue: T

    try {
      currentValue = JSON.parse(
        localStorage.getItem(key) || String(defaultValue),
      )
    }
    catch (error) {
      currentValue = defaultValue
    }

    return currentValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [value, key])

  return [value, setValue] as const
}

export default useLocalStorage
