-- Create teams table
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shots table
CREATE TABLE IF NOT EXISTS shots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('triple', 'doble', 'libre')),
  result TEXT NOT NULL CHECK (result IN ('convertido', 'fallado')),
  player_name TEXT NOT NULL,
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE shots ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for teams
CREATE POLICY "Users can view their own teams" ON teams FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own teams" ON teams FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own teams" ON teams FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own teams" ON teams FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for players
CREATE POLICY "Users can view players from their teams" ON players FOR SELECT USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
);
CREATE POLICY "Users can insert players to their teams" ON players FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
);
CREATE POLICY "Users can update players from their teams" ON players FOR UPDATE USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
);
CREATE POLICY "Users can delete players from their teams" ON players FOR DELETE USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = players.team_id AND teams.user_id = auth.uid())
);

-- Create RLS policies for games
CREATE POLICY "Users can view games from their teams" ON games FOR SELECT USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = games.team_id AND teams.user_id = auth.uid())
);
CREATE POLICY "Users can insert games to their teams" ON games FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = games.team_id AND teams.user_id = auth.uid())
);
CREATE POLICY "Users can update games from their teams" ON games FOR UPDATE USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = games.team_id AND teams.user_id = auth.uid())
);
CREATE POLICY "Users can delete games from their teams" ON games FOR DELETE USING (
  EXISTS (SELECT 1 FROM teams WHERE teams.id = games.team_id AND teams.user_id = auth.uid())
);

-- Create RLS policies for shots
CREATE POLICY "Users can view shots from their games" ON shots FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM games 
    JOIN teams ON teams.id = games.team_id 
    WHERE games.id = shots.game_id AND teams.user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert shots to their games" ON shots FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM games 
    JOIN teams ON teams.id = games.team_id 
    WHERE games.id = shots.game_id AND teams.user_id = auth.uid()
  )
);
CREATE POLICY "Users can update shots from their games" ON shots FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM games 
    JOIN teams ON teams.id = games.team_id 
    WHERE games.id = shots.game_id AND teams.user_id = auth.uid()
  )
);
CREATE POLICY "Users can delete shots from their games" ON shots FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM games 
    JOIN teams ON teams.id = games.team_id 
    WHERE games.id = shots.game_id AND teams.user_id = auth.uid()
  )
);
