"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Fuel, Calculator } from "lucide-react"

export default function FuelCalculator() {
  const [amount, setAmount] = useState("")
  const [kilometers, setKilometers] = useState<number | null>(null)
  const [error, setError] = useState("")

  const calculateKilometers = () => {
    // Limpiar errores previos
    setError("")

    // Validar que el campo no esté vacío
    if (!amount.trim()) {
      setError("Por favor ingrese una cantidad")
      return
    }

    // Validar que sea un número válido
    const numericAmount = Number.parseFloat(amount)
    if (isNaN(numericAmount) || numericAmount < 0) {
      setError("Por favor ingrese un número válido mayor a 0")
      return
    }

    // Calcular kilómetros: 50 córdobas = 8 km
    // Por cada córdoba = 8/50 = 0.16 km
    const kmPerCordoba = 8 / 50
    const calculatedKm = numericAmount * kmPerCordoba

    setKilometers(Math.round(calculatedKm * 100) / 100) // Redondear a 2 decimales
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Permitir solo números y punto decimal
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value)
      setError("")
    }
  }

  const resetCalculator = () => {
    setAmount("")
    setKilometers(null)
    setError("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Fuel className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Calculadora de Combustible</h1>
          <p className="text-gray-600 text-sm">Calcula cuántos kilómetros puedes recorrer</p>
        </div>

        {/* Main Card */}
        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-lg flex items-center justify-center gap-2">
              <Calculator className="w-5 h-5" />
              Calculadora
            </CardTitle>
            <CardDescription>Con 50 córdobas recorres 8 kilómetros</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Input Field */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Digite la cantidad de dinero (Córdobas)
              </Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="text"
                  value={amount}
                  onChange={handleInputChange}
                  placeholder="Ej: 100"
                  className={`text-lg h-12 pr-12 ${error ? "border-red-500" : ""}`}
                />
                <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">C$</span>
              </div>
              {error && <p className="text-red-500 text-sm">{error}</p>}
            </div>

            {/* Calculate Button */}
            <Button
              onClick={calculateKilometers}
              className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700"
              disabled={!amount.trim()}
            >
              <Calculator className="w-5 h-5 mr-2" />
              Calcular Kilómetros
            </Button>

            {/* Result */}
            {kilometers !== null && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="text-sm text-green-600 mb-1">Podrás recorrer:</div>
                <div className="text-3xl font-bold text-green-700">{kilometers} km</div>
                <div className="text-sm text-green-600 mt-1">con C$ {amount}</div>
              </div>
            )}

            {/* Reset Button */}
            {(amount || kilometers !== null) && (
              <Button onClick={resetCalculator} variant="outline" className="w-full bg-transparent">
                Nuevo Cálculo
              </Button>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="text-xs text-blue-600 text-center">
                <strong>Referencia:</strong> 50 córdobas = 8 kilómetros
                <br />1 córdoba = 0.16 kilómetros
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-xs text-gray-500">Calculadora de Combustible v1.0</div>
      </div>
    </div>
  )
}
