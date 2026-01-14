"use client"

import * as React from "react"
import { Monitor, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

type ThemeOption = "system" | "light" | "dark"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Éviter l'hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = (theme as ThemeOption) || "system"

  const themes: { id: ThemeOption; icon: React.ReactNode }[] = [
    { id: "system", icon: <Monitor className="w-4 h-4" /> },
    { id: "light", icon: <Sun className="w-4 h-4" /> },
    { id: "dark", icon: <Moon className="w-4 h-4" /> },
  ]

  const getIndicatorPosition = () => {
    switch (currentTheme) {
      case "system": return "left-1"
      case "light": return "left-[34px]"
      case "dark": return "left-[66px]"
      default: return "left-1"
    }
  }

  if (!mounted) {
    return (
      <div className="flex items-center h-8 rounded-full p-1 bg-gray-100 dark:bg-gray-800" style={{ width: '100px' }}>
        <span className="w-6 h-6 rounded-full bg-white dark:bg-gray-700 shadow-sm" />
      </div>
    )
  }

  return (
    <div
      className="relative flex items-center h-8 rounded-full p-1 bg-gray-100 dark:bg-gray-800 transition-colors"
      style={{ width: '100px' }}
    >
      {/* Sliding indicator */}
      <span
        className={`
          absolute w-7 h-6 bg-white dark:bg-gray-700 rounded-full shadow-sm transition-all duration-200
          ${getIndicatorPosition()}
        `}
      />

      {/* Theme buttons */}
      {themes.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          className={`
            relative z-10 flex items-center justify-center w-7 h-6 rounded-full transition-colors duration-200
            ${currentTheme === t.id
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }
          `}
          title={t.id === "system" ? "Système" : t.id === "light" ? "Clair" : "Sombre"}
        >
          {t.icon}
        </button>
      ))}
    </div>
  )
}
