"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Trash2, Plus, BarChart3, Target, Users, Settings, Calendar, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

type ShotType = "triple" | "doble" | "libre"
type ShotResult = "convertido" | "fallado"

interface Shot {
  id: string
  type: ShotType
  result: ShotResult
  player_name: string
  timestamp: number
}

interface Player {
  id: string
  name: string
}

interface Game {
  id: string
  name: string
  date: string
  shots: Shot[]
}

type AppPage = "setup" | "game" | "stats"

export default function BasketballApp() {
  const [currentPage, setCurrentPage] = useState<AppPage>("setup")
  const [teamName, setTeamName] = useState("")
  const [teamId, setTeamId] = useState<string | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const [games, setGames] = useState<Game[]>([])
  const [currentGame, setCurrentGame] = useState<Game | null>(null)
  const [newGameName, setNewGameName] = useState("")
  const [showNewGameDialog, setShowNewGameDialog] = useState(false)

  // Game state
  const [selectedShotType, setSelectedShotType] = useState<ShotType | null>(null)
  const [selectedResult, setSelectedResult] = useState<ShotResult | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<string>("")

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        await loadTeamData(user.id)
      }
      setLoading(false)
    }
    getUser()
  }, [])

  const loadTeamData = async (userId: string) => {
    try {
      // Load team
      const { data: teams } = await supabase.from("teams").select("*").eq("user_id", userId).limit(1)

      if (teams && teams.length > 0) {
        const team = teams[0]
        setTeamName(team.name)
        setTeamId(team.id)

        // Load players
        const { data: playersData } = await supabase.from("players").select("*").eq("team_id", team.id)

        if (playersData) {
          setPlayers(playersData)
        }

        // Load games with shots
        const { data: gamesData } = await supabase
          .from("games")
          .select(`
            *,
            shots (*)
          `)
          .eq("team_id", team.id)
          .order("created_at", { ascending: false })

        if (gamesData) {
          const formattedGames = gamesData.map((game) => ({
            id: game.id,
            name: game.name,
            date: game.date,
            shots: game.shots || [],
          }))
          setGames(formattedGames)
        }
      }
    } catch (error) {
      console.error("Error loading team data:", error)
    }
  }

  const saveTeam = async () => {
    if (!user || !teamName.trim()) return

    try {
      if (teamId) {
        // Update existing team
        await supabase.from("teams").update({ name: teamName }).eq("id", teamId)
      } else {
        // Create new team
        const { data } = await supabase.from("teams").insert({ name: teamName, user_id: user.id }).select().single()

        if (data) {
          setTeamId(data.id)
        }
      }
    } catch (error) {
      console.error("Error saving team:", error)
    }
  }

  const addPlayer = async () => {
    if (!newPlayerName.trim() || !teamId) return

    try {
      const { data } = await supabase
        .from("players")
        .insert({ name: newPlayerName.trim(), team_id: teamId })
        .select()
        .single()

      if (data) {
        setPlayers([...players, data])
        setNewPlayerName("")
      }
    } catch (error) {
      console.error("Error adding player:", error)
    }
  }

  const removePlayer = async (id: string) => {
    try {
      await supabase.from("players").delete().eq("id", id)

      setPlayers(players.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Error removing player:", error)
    }
  }

  const createNewGame = async () => {
    if (!newGameName.trim() || !teamId) return

    try {
      const { data } = await supabase
        .from("games")
        .insert({
          name: newGameName.trim(),
          date: new Date().toLocaleDateString("es-ES"),
          team_id: teamId,
        })
        .select()
        .single()

      if (data) {
        const game: Game = {
          id: data.id,
          name: data.name,
          date: data.date,
          shots: [],
        }
        setGames([game, ...games])
        setCurrentGame(game)
        setNewGameName("")
        setShowNewGameDialog(false)
      }
    } catch (error) {
      console.error("Error creating game:", error)
    }
  }

  const selectGame = (game: Game) => {
    setCurrentGame(game)
  }

  const handlePlayerSelect = (playerName: string) => {
    setSelectedPlayer(playerName)
    setShowConfirmation(true)
  }

  const confirmShot = async () => {
    if (selectedShotType && selectedResult && selectedPlayer && currentGame) {
      try {
        const { data } = await supabase
          .from("shots")
          .insert({
            type: selectedShotType,
            result: selectedResult,
            player_name: selectedPlayer,
            game_id: currentGame.id,
            timestamp: Date.now(),
          })
          .select()
          .single()

        if (data) {
          const newShot: Shot = {
            id: data.id,
            type: data.type,
            result: data.result,
            player_name: data.player_name,
            timestamp: data.timestamp,
          }

          const updatedGame = {
            ...currentGame,
            shots: [...currentGame.shots, newShot],
          }
          setCurrentGame(updatedGame)
          setGames(games.map((g) => (g.id === updatedGame.id ? updatedGame : g)))
        }

        // Reset state
        setSelectedShotType(null)
        setSelectedResult(null)
        setSelectedPlayer("")
        setShowConfirmation(false)
      } catch (error) {
        console.error("Error saving shot:", error)
      }
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  // Save team name when it changes
  useEffect(() => {
    if (teamName && user) {
      const timeoutId = setTimeout(() => {
        saveTeam()
      }, 1000) // Debounce for 1 second

      return () => clearTimeout(timeoutId)
    }
  }, [teamName, user])

  const resetGame = () => {
    setSelectedShotType(null)
    setSelectedResult(null)
    setSelectedPlayer("")
    setShowConfirmation(false)
  }

  const getShotTypeLabel = (type: ShotType) => {
    switch (type) {
      case "triple":
        return "Triple (3 puntos)"
      case "doble":
        return "Doble (2 puntos)"
      case "libre":
        return "Tiro libre (1 punto)"
    }
  }

  const getShotPoints = (type: ShotType) => {
    switch (type) {
      case "triple":
        return 3
      case "doble":
        return 2
      case "libre":
        return 1
    }
  }

  const getTeamStats = () => {
    const allShots = games.flatMap((game) => game.shots)
    const totalShots = allShots.length
    const madeShots = allShots.filter((s) => s.result === "convertido").length
    const percentage = totalShots > 0 ? Math.round((madeShots / totalShots) * 100) : 0

    const statsByType = ["triple", "doble", "libre"].map((type) => {
      const typeShots = allShots.filter((s) => s.type === type)
      const typeMade = typeShots.filter((s) => s.result === "convertido")
      return {
        type: type as ShotType,
        attempts: typeShots.length,
        made: typeMade.length,
        percentage: typeShots.length > 0 ? Math.round((typeMade.length / typeShots.length) * 100) : 0,
      }
    })

    return { totalShots, madeShots, percentage, statsByType }
  }

  const getPlayerStats = () => {
    const allShots = games.flatMap((game) => game.shots)

    return players.map((player) => {
      const playerShots = allShots.filter((s) => s.player_name === player.name)
      const playerMade = playerShots.filter((s) => s.result === "convertido")
      const percentage = playerShots.length > 0 ? Math.round((playerMade.length / playerShots.length) * 100) : 0

      // Calculate stats by shot type for each player
      const statsByType = ["triple", "doble", "libre"].map((type) => {
        const typeShots = playerShots.filter((s) => s.type === type)
        const typeMade = typeShots.filter((s) => s.result === "convertido")
        return {
          type: type as ShotType,
          attempts: typeShots.length,
          made: typeMade.length,
          percentage: typeShots.length > 0 ? Math.round((typeMade.length / typeShots.length) * 100) : 0,
        }
      })

      return {
        name: player.name,
        attempts: playerShots.length,
        made: playerMade.length,
        percentage,
        statsByType,
      }
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Basketball Tracker</div>
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    router.push("/auth/login")
    return null
  }

  if (currentPage === "setup") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <h1 className="text-3xl font-bold text-primary mb-2">Basketball Tracker</h1>
              <p className="text-muted-foreground">Configura tu equipo</p>
            </div>
            <Button variant="ghost" onClick={handleLogout} size="sm">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Equipo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="team-name">Nombre del equipo</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ingresa el nombre del equipo"
                  className="text-lg h-12"
                />
              </div>

              <div>
                <Label>Jugadores</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Nombre del jugador"
                    className="text-lg h-12"
                    onKeyPress={(e) => e.key === "Enter" && addPlayer()}
                  />
                  <Button onClick={addPlayer} size="lg" className="h-12 px-4">
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {players.length > 0 && (
                <div className="space-y-2">
                  {players.map((player) => (
                    <div key={player.id} className="flex items-center justify-between bg-card p-3 rounded-lg">
                      <span className="font-medium">{player.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlayer(player.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Juegos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => setShowNewGameDialog(true)}
                disabled={!teamName || players.length === 0}
                className="w-full h-12 text-lg"
                variant="outline"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Juego
              </Button>

              {games.length > 0 && (
                <div className="space-y-2">
                  <Label>Juegos anteriores</Label>
                  {games.map((game) => (
                    <div key={game.id} className="flex items-center justify-between bg-card p-3 rounded-lg">
                      <div>
                        <span className="font-medium">{game.name}</span>
                        <p className="text-sm text-muted-foreground">
                          {game.date} • {game.shots.length} tiros
                        </p>
                      </div>
                      <Button
                        onClick={() => selectGame(game)}
                        variant={currentGame?.id === game.id ? "default" : "ghost"}
                        size="sm"
                      >
                        {currentGame?.id === game.id ? "Actual" : "Seleccionar"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={() => setCurrentPage("game")}
              disabled={!teamName || players.length === 0 || !currentGame}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              <Target className="h-6 w-6 mr-2" />
              {currentGame ? `Continuar: ${currentGame.name}` : "Selecciona un juego"}
            </Button>

            {games.length > 0 && (
              <Button
                onClick={() => setCurrentPage("stats")}
                variant="outline"
                className="w-full h-14 text-lg font-semibold"
                size="lg"
              >
                <BarChart3 className="h-6 w-6 mr-2" />
                Ver Estadísticas
              </Button>
            )}
          </div>

          <Dialog open={showNewGameDialog} onOpenChange={setShowNewGameDialog}>
            <DialogContent className="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle>Nuevo Juego</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="game-name">Nombre del juego</Label>
                  <Input
                    id="game-name"
                    value={newGameName}
                    onChange={(e) => setNewGameName(e.target.value)}
                    placeholder="ej. vs Lakers, Entrenamiento..."
                    className="text-lg h-12"
                    onKeyPress={(e) => e.key === "Enter" && createNewGame()}
                  />
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button onClick={() => setShowNewGameDialog(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={createNewGame} disabled={!newGameName.trim()} className="flex-1">
                  Crear
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  if (currentPage === "game") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setCurrentPage("setup")} className="text-lg">
              <Settings className="h-5 w-5 mr-2" />
              Configurar
            </Button>
            <div className="text-center">
              <h1 className="text-xl font-bold">{teamName}</h1>
              <p className="text-sm text-muted-foreground">{currentGame?.name}</p>
            </div>
            <Button variant="ghost" onClick={() => setCurrentPage("stats")} className="text-lg">
              <BarChart3 className="h-5 w-5 mr-2" />
              Stats
            </Button>
          </div>

          {/* Step 1: Shot Type Selection */}
          {!selectedShotType && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center mb-6">Tipo de Tiro</h2>
              <div className="space-y-4">
                <Button
                  onClick={() => setSelectedShotType("triple")}
                  className="w-full h-20 text-xl font-bold bg-primary hover:bg-primary/90"
                  size="lg"
                >
                  Triple (3 puntos)
                </Button>
                <Button
                  onClick={() => setSelectedShotType("doble")}
                  className="w-full h-20 text-xl font-bold bg-secondary hover:bg-secondary/90"
                  size="lg"
                >
                  Doble (2 puntos)
                </Button>
                <Button
                  onClick={() => setSelectedShotType("libre")}
                  className="w-full h-20 text-xl font-bold bg-accent hover:bg-accent/90"
                  size="lg"
                >
                  Tiro libre (1 punto)
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Result Selection */}
          {selectedShotType && !selectedResult && (
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant="outline" className="text-lg px-4 py-2 mb-4">
                  {getShotTypeLabel(selectedShotType)}
                </Badge>
                <h2 className="text-2xl font-bold">Resultado</h2>
              </div>
              <div className="space-y-4">
                <Button
                  onClick={() => setSelectedResult("convertido")}
                  className="w-full h-20 text-xl font-bold bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  ✓ Convertido
                </Button>
                <Button
                  onClick={() => setSelectedResult("fallado")}
                  className="w-full h-20 text-xl font-bold bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  ✗ Fallado
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Player Selection */}
          {selectedShotType && selectedResult && !showConfirmation && (
            <div className="space-y-4">
              <div className="text-center">
                <Badge variant="outline" className="text-lg px-4 py-2 mb-2">
                  {getShotTypeLabel(selectedShotType)}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-lg px-4 py-2 mb-4 ml-2 ${
                    selectedResult === "convertido" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedResult === "convertido" ? "✓ Convertido" : "✗ Fallado"}
                </Badge>
                <h2 className="text-2xl font-bold">Seleccionar Jugador</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {players.map((player) => (
                  <Button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player.name)}
                    className="h-16 text-lg font-semibold"
                    variant="outline"
                    size="lg"
                  >
                    {player.name}
                  </Button>
                ))}
              </div>
              <Button onClick={resetGame} variant="ghost" className="w-full text-lg">
                Cancelar
              </Button>
            </div>
          )}

          {/* Confirmation Dialog */}
          <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
            <DialogContent className="max-w-sm mx-auto">
              <DialogHeader>
                <DialogTitle className="text-center">Confirmar Tiro</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-center">
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{selectedPlayer}</p>
                  <p className="text-base">{selectedShotType && getShotTypeLabel(selectedShotType)}</p>
                  <Badge
                    className={`text-base px-4 py-2 ${
                      selectedResult === "convertido" ? "bg-green-600 text-white" : "bg-red-600 text-white"
                    }`}
                  >
                    {selectedResult === "convertido" ? "✓ Convertido" : "✗ Fallado"}
                  </Badge>
                </div>
              </div>
              <DialogFooter className="flex gap-2">
                <Button onClick={resetGame} variant="outline" className="flex-1 bg-transparent">
                  Cancelar
                </Button>
                <Button onClick={confirmShot} className="flex-1">
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    )
  }

  if (currentPage === "stats") {
    const teamStats = getTeamStats()
    const playerStats = getPlayerStats()

    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-md mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => setCurrentPage("setup")} className="text-lg">
              <Settings className="h-5 w-5 mr-2" />
              Configurar
            </Button>
            <h1 className="text-xl font-bold text-center">{teamName}</h1>
            <Button variant="ghost" onClick={() => setCurrentPage("game")} className="text-lg">
              <Target className="h-5 w-5 mr-2" />
              Juego
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Resumen de Juegos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2 mb-4">
                <div className="text-2xl font-bold text-primary">{games.length} juegos</div>
                <div className="text-lg text-muted-foreground">
                  {games.reduce((total, game) => total + game.shots.length, 0)} tiros totales
                </div>
              </div>
              {games.length > 0 && (
                <div className="space-y-2">
                  {games.map((game) => (
                    <div key={game.id} className="flex justify-between items-center p-2 bg-card rounded">
                      <div>
                        <span className="font-medium">{game.name}</span>
                        <p className="text-sm text-muted-foreground">{game.date}</p>
                      </div>
                      <span className="text-sm">{game.shots.length} tiros</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Estadísticas del Equipo (Todos los juegos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2 mb-4">
                <div className="text-3xl font-bold text-primary">
                  {teamStats.madeShots}/{teamStats.totalShots}
                </div>
                <div className="text-lg text-muted-foreground">{teamStats.percentage}% efectividad</div>
              </div>

              <div className="space-y-3">
                {teamStats.statsByType.map((stat) => (
                  <div key={stat.type} className="flex justify-between items-center p-3 bg-card rounded-lg">
                    <span className="font-medium">{getShotTypeLabel(stat.type)}</span>
                    <div className="text-right">
                      <div className="font-bold">
                        {stat.made}/{stat.attempts}
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-center">Estadísticas por Jugador (Todos los juegos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {playerStats.map((stat) => (
                  <div key={stat.name} className="p-4 bg-card rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-lg">{stat.name}</span>
                      <div className="text-right">
                        <div className="font-bold text-lg">
                          {stat.made}/{stat.attempts}
                        </div>
                        <div className="text-sm text-muted-foreground">{stat.percentage}%</div>
                      </div>
                    </div>

                    {/* Shot type breakdown for each player */}
                    <div className="space-y-2">
                      {stat.statsByType.map((typestat) => (
                        <div
                          key={typestat.type}
                          className="flex justify-between items-center text-sm bg-background p-2 rounded"
                        >
                          <span>{getShotTypeLabel(typestat.type)}</span>
                          <div className="text-right">
                            <span className="font-medium">
                              {typestat.made}/{typestat.attempts}
                            </span>
                            <span className="text-muted-foreground ml-2">({typestat.percentage}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return null
}
