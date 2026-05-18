/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  X, 
  Trophy, 
  Settings, 
  PlayCircle, 
  ChevronDown, 
  ChevronUp, 
  Share2, 
  Copy, 
  Check, 
  RotateCcw,
  Medal,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---

interface Player {
  id: string;
  name: string;
  color: string;
}

interface Match {
  id: string;
  round: number;
  playerAId: string;
  playerBId: string;
  scoreA: number | null;
  scoreB: number | null;
  status: 'pending' | 'completed';
}

interface Tournament {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
  isDoubleRound: boolean;
  isStarted: boolean;
  createdAt: number;
}

interface TournamentState {
  tournaments: Tournament[];
  currentTournamentId: string | null;
}

interface LeaderboardEntry {
  playerId: string;
  name: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  winPercentage: number;
}

// --- Constants ---

const PLAYER_COLORS = [
  '#00d4ff', '#8b5cf6', '#10b981', '#f43f5e', '#f59e0b', 
  '#3b82f6', '#ec4899', '#06b6d4', '#84cc16', '#a855f7'
];

const STORAGE_KEY = 'spinmaster_tournaments_v2';

// --- Utilities ---

const generateId = () => Math.random().toString(36).substring(2, 9);

const getInitials = (name: string) => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

// --- Round Robin Algorithm ---

const generateRounds = (players: Player[], isDoubleRound: boolean): Match[] => {
  let pool = [...players];
  if (pool.length % 2 !== 0) {
    pool.push({ id: 'BYE', name: 'BYE', color: 'transparent' });
  }

  const n = pool.length;
  const roundsCount = n - 1;
  const matchesPerRound = n / 2;
  const matches: Match[] = [];

  for (let r = 0; r < roundsCount; r++) {
    for (let m = 0; m < matchesPerRound; m++) {
      const p1 = pool[m];
      const p2 = pool[n - 1 - m];

      if (p1.id !== 'BYE' && p2.id !== 'BYE') {
        matches.push({
          id: generateId(),
          round: r + 1,
          playerAId: p1.id,
          playerBId: p2.id,
          scoreA: null,
          scoreB: null,
          status: 'pending'
        });
      }
    }
    // Rotate pool (keep first element fixed)
    pool.splice(1, 0, pool.pop()!);
  }

  if (isDoubleRound) {
    const secondHalf = matches.map(m => ({
      ...m,
      id: generateId(),
      round: m.round + roundsCount,
      playerAId: m.playerBId,
      playerBId: m.playerAId
    }));
    return [...matches, ...secondHalf];
  }

  return matches;
};

// --- Main Component ---

export default function App() {
  const [tournaments, setTournaments] = useState<Tournament[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: TournamentState = JSON.parse(saved);
        return state.tournaments || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [currentTournamentId, setCurrentTournamentId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: TournamentState = JSON.parse(saved);
        return state.currentTournamentId || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [view, setView] = useState<'list' | 'setup' | 'detail'>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const state: TournamentState = JSON.parse(saved);
        return state.currentTournamentId ? 'detail' : 'list';
      } catch (e) {
        return 'list';
      }
    }
    return 'list';
  });

  const [activeDetailTab, setActiveDetailTab] = useState<'matches' | 'leaderboard'>('matches');
  
  // Setup state
  const [tournamentName, setTournamentName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [isDoubleRound, setIsDoubleRound] = useState(false);
  
  const [activeRound, setActiveRound] = useState<number>(1);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState<'view' | 'edit' | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const currentTournament = useMemo(() => 
    tournaments.find(t => t.id === currentTournamentId), 
    [tournaments, currentTournamentId]
  );

  // Persistence
  useEffect(() => {
    const state: TournamentState = {
      tournaments,
      currentTournamentId
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [tournaments, currentTournamentId]);

  // Handlers
  const createNewTournament = () => {
    setTournamentName('');
    setPlayers([]);
    setIsDoubleRound(false);
    setView('setup');
  };

  const addPlayer = () => {
    if (!playerNameInput.trim()) return;
    const newPlayer: Player = {
      id: generateId(),
      name: playerNameInput.trim(),
      color: PLAYER_COLORS[players.length % PLAYER_COLORS.length]
    };
    setPlayers([...players, newPlayer]);
    setPlayerNameInput('');
  };

  const removePlayer = (id: string) => {
    setPlayers(players.filter(p => p.id !== id));
  };

  const startTournament = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generatedMatches = generateRounds(players, isDoubleRound);
      const newTournament: Tournament = {
        id: generateId(),
        name: tournamentName.trim(),
        players,
        matches: generatedMatches,
        isDoubleRound,
        isStarted: true,
        createdAt: Date.now()
      };
      setTournaments([newTournament, ...tournaments]);
      setCurrentTournamentId(newTournament.id);
      setView('detail');
      setActiveDetailTab('matches');
      setActiveRound(1);
      setIsGenerating(false);
    }, 600);
  };

  const openTournament = (id: string) => {
    setCurrentTournamentId(id);
    setView('detail');
    setActiveDetailTab('matches');
    setActiveRound(1);
  };

  const deleteTournament = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTournaments(tournaments.filter(t => t.id !== id));
    if (currentTournamentId === id) {
      setCurrentTournamentId(null);
      setView('list');
    }
  };

  const updateScore = (matchId: string, player: 'A' | 'B', value: string) => {
    const score = value === '' ? null : parseInt(value);
    setTournaments(prev => prev.map(t => {
      if (t.id === currentTournamentId) {
        const updatedMatches = t.matches.map(m => {
          if (m.id === matchId) {
            const updated = { ...m, [player === 'A' ? 'scoreA' : 'scoreB']: score };
            updated.status = (updated.scoreA !== null && updated.scoreB !== null) ? 'completed' : 'pending';
            return updated;
          }
          return m;
        });
        return { ...t, matches: updatedMatches };
      }
      return t;
    }));
  };

  // Leaderboard Logic
  const leaderboard = useMemo(() => {
    if (!currentTournament) return [];
    const stats: Record<string, LeaderboardEntry> = {};
    currentTournament.players.forEach(p => {
      stats[p.id] = {
        playerId: p.id,
        name: p.name,
        played: 0,
        won: 0,
        lost: 0,
        points: 0,
        winPercentage: 0
      };
    });

    currentTournament.matches.forEach(m => {
      if (m.status === 'completed' && m.scoreA !== null && m.scoreB !== null) {
        const pA = stats[m.playerAId];
        const pB = stats[m.playerBId];

        if (pA && pB) {
          pA.played++;
          pB.played++;

          if (m.scoreA > m.scoreB) {
            pA.won++;
            pA.points += 2;
            pB.lost++;
          } else if (m.scoreB > m.scoreA) {
            pB.won++;
            pB.points += 2;
            pA.lost++;
          } else {
            pA.points += 1;
            pB.points += 1;
          }
        }
      }
    });

    return Object.values(stats)
      .map(s => ({
        ...s,
        winPercentage: s.played > 0 ? Math.round((s.won / s.played) * 100) : 0
      }))
      .sort((a, b) => b.points - a.points || b.winPercentage - a.winPercentage);
  }, [currentTournament]);

  const copyToClipboard = (type: 'view' | 'edit') => {
    const url = `tt-tourney.app/${type}/${currentTournamentId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  // Render Helpers
  const renderTournamentList = () => (
    <div className="space-y-8 p-4 pb-24 max-w-md mx-auto h-full overflow-y-auto">
      <div className="text-center space-y-2 py-6">
        <h1 className="text-4xl font-display font-bold tracking-wider text-accent-cyan uppercase">
          SpinMaster
        </h1>
        <p className="text-white/60 text-sm">Tournament Manager</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-display font-bold uppercase tracking-widest text-white/40">My Tournaments</h2>
          <button 
            onClick={createNewTournament}
            className="p-2 glass text-accent-cyan hover:bg-accent-cyan/10 transition-colors rounded-full"
          >
            <Plus size={24} />
          </button>
        </div>

        <div className="grid gap-4">
          {tournaments.length === 0 ? (
            <div className="glass-card p-12 text-center space-y-4">
              <Trophy size={48} className="mx-auto text-white/10" />
              <p className="text-white/40 text-sm">No tournaments found. Create your first one!</p>
              <button 
                onClick={createNewTournament}
                className="px-6 py-2 glass text-accent-cyan font-display font-bold uppercase tracking-widest"
              >
                New Tournament
              </button>
            </div>
          ) : (
            tournaments.map(t => (
              <motion.div 
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => openTournament(t.id)}
                className="glass-card p-5 flex items-center justify-between cursor-pointer hover:bg-white/10 transition-colors group"
              >
                <div className="space-y-1">
                  <h3 className="text-xl font-display font-bold text-white group-hover:text-accent-cyan transition-colors">{t.name}</h3>
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1"><Users size={12} /> {t.players.length} Players</span>
                    <span>•</span>
                    <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <button 
                  onClick={(e) => deleteTournament(t.id, e)}
                  className="p-2 text-white/20 hover:text-rose-500 transition-colors"
                >
                  <X size={20} />
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="space-y-8 p-4 pb-24 max-w-md mx-auto h-full overflow-y-auto">
      <div className="flex items-center gap-4 py-4">
        <button onClick={() => setView('list')} className="p-2 glass text-white/40 hover:text-white">
          <ChevronDown size={24} className="rotate-90" />
        </button>
        <h1 className="text-2xl font-display font-bold tracking-wider text-accent-cyan uppercase">
          New Tournament
        </h1>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="space-y-4">
          <label className="text-xs font-display uppercase tracking-widest text-white/40">Tournament Name</label>
          <input 
            type="text"
            value={tournamentName}
            onChange={(e) => setTournamentName(e.target.value)}
            placeholder="e.g. Summer Smash 2024"
            className="w-full bg-white/5 border-b border-white/10 py-3 px-4 outline-none focus:border-accent-cyan transition-colors"
          />
        </div>

        <div className="space-y-4">
          <label className="text-xs font-display uppercase tracking-widest text-white/40">Add Players</label>
          <div className="relative">
            <input 
              type="text"
              value={playerNameInput}
              onChange={(e) => setPlayerNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
              placeholder="Enter player name..."
              className="w-full bg-white/5 border-b border-white/10 py-3 px-4 outline-none focus:border-accent-cyan transition-colors"
            />
            <button 
              onClick={addPlayer}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent-cyan hover:bg-white/5 rounded-full transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <AnimatePresence>
            {players.map(p => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, scale: 0.8, x: -10 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 px-3 py-1.5 glass rounded-full border-l-4"
                style={{ borderLeftColor: p.color }}
              >
                <span className="text-sm font-medium">{p.name}</span>
                <button onClick={() => removePlayer(p.id)} className="text-white/40 hover:text-white">
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="pt-4 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium">Double Round</p>
              <p className="text-xs text-white/40">Every pair plays twice</p>
            </div>
            <button 
              onClick={() => setIsDoubleRound(!isDoubleRound)}
              className={`w-12 h-6 rounded-full transition-colors relative ${isDoubleRound ? 'bg-accent-cyan' : 'bg-white/10'}`}
            >
              <motion.div 
                animate={{ x: isDoubleRound ? 24 : 4 }}
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
              />
            </button>
          </div>

          <button 
            disabled={players.length < 3 || !tournamentName.trim() || isGenerating}
            onClick={startTournament}
            className={`w-full py-4 rounded-full font-display font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
              players.length >= 3 && tournamentName.trim()
                ? 'bg-gradient-to-r from-accent-cyan to-accent-violet text-bg-dark shadow-[0_0_20px_rgba(0,212,255,0.3)]' 
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            {isGenerating ? (
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                className="w-5 h-5 border-2 border-bg-dark border-t-transparent rounded-full"
              />
            ) : (
              <PlayCircle size={20} />
            )}
            {isGenerating ? 'Generating...' : 'Start Tournament'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderMatches = () => {
    if (!currentTournament) return null;
    const rounds = Array.from(new Set(currentTournament.matches.map(m => m.round))).sort((a: number, b: number) => a - b);
    
    return (
      <div className="space-y-6 h-full flex flex-col">
        {/* Round Tabs */}
        <div className="flex overflow-x-auto gap-2 py-2 px-4 no-scrollbar">
          {rounds.map(r => (
            <button
              key={r}
              onClick={() => setActiveRound(r)}
              className={`flex-shrink-0 px-6 py-2 rounded-full font-display font-bold uppercase tracking-widest text-xs transition-all ${
                activeRound === r 
                  ? 'bg-accent-cyan text-bg-dark shadow-[0_0_15px_rgba(0,212,255,0.4)]' 
                  : 'glass text-white/40 hover:text-white/60'
              }`}
            >
              Round {r}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRound}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {currentTournament.matches.filter(m => m.round === activeRound).map(m => {
                const pA = currentTournament.players.find(p => p.id === m.playerAId);
                const pB = currentTournament.players.find(p => p.id === m.playerBId);
                if (!pA || !pB) return null;

                const isCompleted = m.status === 'completed';
                const winner = m.scoreA !== null && m.scoreB !== null 
                  ? (m.scoreA > m.scoreB ? 'A' : m.scoreB > m.scoreA ? 'B' : null)
                  : null;

                return (
                  <motion.div 
                    key={m.id}
                    layout
                    initial={false}
                    animate={isCompleted ? { scale: [1, 1.02, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className={`p-4 glass-card border-l-4 transition-all ${
                      isCompleted ? 'border-emerald-500/50' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Player A */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                            winner === 'A' ? 'border-accent-cyan shadow-[0_0_10px_rgba(0,212,255,0.5)]' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: pA.color + '33', color: pA.color }}
                        >
                          {getInitials(pA.name)}
                        </div>
                        <span className={`text-[10px] font-medium text-center truncate w-full ${winner === 'A' ? 'text-accent-cyan' : 'text-white/60'}`}>
                          {pA.name}
                        </span>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={m.scoreA ?? ''}
                          onChange={(e) => updateScore(m.id, 'A', e.target.value)}
                          className="w-12 h-12 glass text-center text-xl font-bold outline-none focus:border-accent-cyan"
                        />
                      </div>

                      <div className="flex flex-col items-center gap-1">
                        <span className="text-white/20 font-display font-bold text-xs">VS</span>
                        <div className={`px-2 py-0.5 rounded text-[8px] uppercase font-bold tracking-tighter ${
                          isCompleted ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-white/30'
                        }`}>
                          {isCompleted ? 'Final' : 'Live'}
                        </div>
                      </div>

                      {/* Player B */}
                      <div className="flex-1 flex flex-col items-center gap-2">
                        <div 
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                            winner === 'B' ? 'border-accent-cyan shadow-[0_0_10px_rgba(0,212,255,0.5)]' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: pB.color + '33', color: pB.color }}
                        >
                          {getInitials(pB.name)}
                        </div>
                        <span className={`text-[10px] font-medium text-center truncate w-full ${winner === 'B' ? 'text-accent-cyan' : 'text-white/60'}`}>
                          {pB.name}
                        </span>
                        <input 
                          type="number"
                          inputMode="numeric"
                          value={m.scoreB ?? ''}
                          onChange={(e) => updateScore(m.id, 'B', e.target.value)}
                          className="w-12 h-12 glass text-center text-xl font-bold outline-none focus:border-accent-cyan"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => (
    <div className="px-4 pb-24 h-full overflow-y-auto space-y-4">
      <div className="glass-card overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-white/5">
              <th className="p-4 text-[10px] uppercase tracking-widest text-white/40 font-display">Pos</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-white/40 font-display">Player</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-white/40 font-display text-center">P</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-white/40 font-display text-center">W</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-white/40 font-display text-center">L</th>
              <th className="p-4 text-[10px] uppercase tracking-widest text-white/40 font-display text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => {
              const player = currentTournament?.players.find(p => p.id === entry.playerId);
              return (
                <motion.tr 
                  key={entry.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Medal size={14} className="text-yellow-400" />}
                      {index === 1 && <Medal size={14} className="text-slate-300" />}
                      {index === 2 && <Medal size={14} className="text-amber-600" />}
                      <span className={`font-display font-bold ${index < 3 ? 'text-accent-cyan' : 'text-white/40'}`}>
                        {index + 1}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold"
                        style={{ backgroundColor: player?.color + '33', color: player?.color }}
                      >
                        {getInitials(entry.name)}
                      </div>
                      <span className="font-medium text-sm truncate max-w-[100px]">{entry.name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center text-sm text-white/60">{entry.played}</td>
                  <td className="p-4 text-center text-sm text-emerald-500 font-bold">{entry.won}</td>
                  <td className="p-4 text-center text-sm text-rose-500/60">{entry.lost}</td>
                  <td className="p-4 text-center">
                    <span className="px-2 py-1 glass rounded text-xs font-bold text-accent-cyan">
                      {entry.points}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {leaderboard.length > 0 && (
        <div className="glass-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-accent-cyan">
            <Trophy size={16} />
            <h3 className="text-xs font-display font-bold uppercase tracking-widest">Tournament Leader</h3>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold border-2 border-accent-cyan shadow-[0_0_15px_rgba(0,212,255,0.3)]"
                style={{ backgroundColor: currentTournament?.players.find(p => p.id === leaderboard[0].playerId)?.color + '33', color: currentTournament?.players.find(p => p.id === leaderboard[0].playerId)?.color }}
              >
                {getInitials(leaderboard[0].name)}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{leaderboard[0].name}</p>
                <p className="text-[10px] text-white/40 uppercase tracking-tighter">{leaderboard[0].winPercentage}% Win Rate</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-display font-bold text-accent-cyan">{leaderboard[0].points}</p>
              <p className="text-[10px] text-white/40 uppercase tracking-tighter">Points</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderDetail = () => {
    if (!currentTournament) return null;
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setView('list')} className="p-2 glass text-white/40 hover:text-white">
              <ChevronDown size={20} className="rotate-90" />
            </button>
            <h2 className="text-xl font-display font-bold text-accent-cyan uppercase tracking-wider truncate max-w-[180px]">
              {currentTournament.name}
            </h2>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowShareModal(true)} className="p-2 glass text-white/60 hover:text-white">
              <Share2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden pt-4">
          <AnimatePresence mode="wait">
            {activeDetailTab === 'matches' ? (
              <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                {renderMatches()}
              </motion.div>
            ) : (
              <motion.div key="leaderboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                {renderLeaderboard()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="glass border-t border-white/10 p-2 flex items-center justify-around pb-8 pt-3">
          <button 
            onClick={() => setActiveDetailTab('matches')}
            className={`flex flex-col items-center gap-1 px-8 py-2 rounded-2xl transition-all ${
              activeDetailTab === 'matches' ? 'text-accent-cyan bg-accent-cyan/10' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <PlayCircle size={24} />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest">Matches</span>
            {activeDetailTab === 'matches' && (
              <motion.div layoutId="nav-dot" className="w-1 h-1 bg-accent-cyan rounded-full mt-1 shadow-[0_0_8px_#00d4ff]" />
            )}
          </button>
          <button 
            onClick={() => setActiveDetailTab('leaderboard')}
            className={`flex flex-col items-center gap-1 px-8 py-2 rounded-2xl transition-all ${
              activeDetailTab === 'leaderboard' ? 'text-accent-cyan bg-accent-cyan/10' : 'text-white/40 hover:text-white/60'
            }`}
          >
            <Medal size={24} />
            <span className="text-[10px] font-display font-bold uppercase tracking-widest">Rankings</span>
            {activeDetailTab === 'leaderboard' && (
              <motion.div layoutId="nav-dot" className="w-1 h-1 bg-accent-cyan rounded-full mt-1 shadow-[0_0_8px_#00d4ff]" />
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative h-screen flex flex-col">
      {/* Background Mesh */}
      <div className="mesh-gradient">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
        <div className="blob blob-3"></div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'list' && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
              {renderTournamentList()}
            </motion.div>
          )}
          {view === 'setup' && (
            <motion.div key="setup" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full">
              {renderSetup()}
            </motion.div>
          )}
          {view === 'detail' && (
            <motion.div key="detail" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="h-full">
              {renderDetail()}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowShareModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm glass-card p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-accent-cyan uppercase tracking-wider">Share Tournament</h3>
                <button onClick={() => setShowShareModal(false)} className="text-white/40 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-display">View Only Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1 glass bg-white/5 p-3 text-xs text-white/60 truncate">
                      tt-tourney.app/view/{currentTournamentId}
                    </div>
                    <button 
                      onClick={() => copyToClipboard('view')}
                      className="p-3 glass text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                    >
                      {copiedLink === 'view' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest text-white/40 font-display">Editor Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1 glass bg-white/5 p-3 text-xs text-white/60 truncate">
                      tt-tourney.app/edit/{currentTournamentId}
                    </div>
                    <button 
                      onClick={() => copyToClipboard('edit')}
                      className="p-3 glass text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                    >
                      {copiedLink === 'edit' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-white/20 text-center italic">
                * Links are simulated for this demo. State is saved to your local browser storage.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
