import React, {useState, useReducer, useEffect, useRef, useCallback, act} from "react";
import './Arcade.css';

//Audio Section
//Uitilizes Web Audio API for sound
const AudioEngine = {
    ctx: null,
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }

        if (this.ctx.state === 'suspended'){
            this.ctx.resume();
        }
    },
    playTone(freq, type = 'shine', duration= 0.1, vol = 0.1){
        if(!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain= this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001,this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    playMove() {this.playTone(440, 'sine', 0.1, 0.05);},
    playWin() {
        this.playTone(523.25,'square',0.1,0.1);
        setTimeout(()=>this.playTone(659.25,'square',0.1,0.1), 100);
        setTimeout(()=>this.playTone(783.99,'square', 0.2,0.1), 200);
    },

    playLoss(){
        this.playTone(300,'sawtooth',0.2,0.1);
        setTimeout(()=>this.playTone(250,'sawtooth',0.4,0.1),200);
    },
    
    playSelect() {this.playTone(880,'triangle',0.05,0.05);}
};

//SVG ICONS

const IconTrophy = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arcade-icon"><path d="M8 21h8M12 12v4M7 4h10M5 4h14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4zm2 6v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-7"/> </svg>);
const IconHome = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="arcade-icon"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>);

//GLOBAL STATE MANAGEMENT

const arcadeStateInit = {
  activeGame: null,
  stats: {
    tictactoe: { wins: 0, losses: 0, draws: 0 },
    connectfour: { wins: 0, losses: 0, draws: 0 },
    checkers: { wins: 0, losses: 0, draws: 0 },
    snake: { highscore: 0 }
  },
  settings: { sound: true, difficulty: 'hard' },
  view: 'dashboard'
};

function arcadeReducer(state, action) {
  switch (action.type) {
    case 'SET_VIEW': return { ...state, view: action.payload };
    case 'START_GAME': return { ...state, activeGame: action.payload, view: 'game' };
    case 'UPDATE_STATS': {
      const newStats = { ...state.stats };
      const { game, result, score } = action.payload;
      if (game === 'snake') {
        newStats.snake.highscore = Math.max(newStats.snake.highscore, score);
      } else {
        newStats[game][result]++;
      }
      localStorage.setItem('arcade_stats', JSON.stringify(newStats));
      return { ...state, stats: newStats };
    }
    case 'LOAD_STATS': return { ...state, stats: action.payload };
    case 'TOGGLE_SOUND': return { ...state, settings: { ...state.settings, sound: !state.settings.sound } };
    case 'SET_DIFFICULTY': return { ...state, settings: { ...state.settings, difficulty: action.payload } };
    default: return state;
  }
}

//GAME 1: TIC-TAC-TOE 
const checkWinTTT = (board,size,player)=>{
    const target = Array(size).fill(player).join('');
    for(let i=0;i<size;i++){
        let row='',col='';
        for(let j=0; j<size;j++){
            row += board[i*size+j];
            col += board[j*size+i];
        }
        if (row===target || col===target) return true;
    }
    let d1 ='', d2='';
    for (let i=0; i<size; i++){
        d1 += board[i*size +i];
        d2 += board[i*size + (size-1-i)];
    }
    if (d1===target||d2===target)return true;
    return false;
};

const tttMinimax= (board,depth,alpha,beta,isMaximizing,size,maxDepth) => {
    if(checkWinTTT(board,size,'O')) return 10 - depth;
    if(checkWinTTT(board,size,'X')) return depth - 10;
    if(!board.includes(null)) return 0;
    if(depth >= maxDepth) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i=0; i< board.length; i++){
            if(!board[i]){
                board[i]='O';
                let score = tttMinimax(board,depth + 1, alpha, beta, false, size, maxDepth);
                board[i] = null;
                bestScore= Math.max(score, bestScore);
                alpha = Math.max(alpha, bestScore);
                if (beta <= alpha) break;
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i=0; i< board.length; i++){
            if(!board[i]){
                board[i]='X';
                let score = tttMinimax(board,depth + 1, alpha, beta, true, size, maxDepth);
                board[i] = null;
                bestScore= Math.min(score, bestScore);
                beta = Math.min(beta, bestScore);
                if (beta <= alpha) break;
            }
        }
        return bestScore;
    }
};

const TicTacToe = ({dispatch,settings})=> {
    const [size,setSize]= useState(3);
    const [board,setBoard]=useState(Array(9).fill(null));
    const [isXNext, setIsXNext]= useState(true);
    const [winner, setWinner]= useState(null);

  const reset = (newSize = size) => {
    setSize(newSize);
    setBoard(Array(newSize * newSize).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  useEffect(() => {
    if (!isXNext && !winner) {
      const timer = setTimeout(() => {
        let bestScore = -Infinity;
        let move = -1;
        let b = [...board];
        let maxDepth = settings.difficulty === 'hard' ? 6 : settings.difficulty === 'medium' ? 2 : 0;
        if (size === 4 && maxDepth > 4) maxDepth = 4;
        if (size === 5 && maxDepth > 3) maxDepth = 3;
        
        let available = b.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (maxDepth === 0) {
           move = available[Math.floor(Math.random() * available.length)];
        } else {
          for (let i = 0; i < b.length; i++) {
            if (!b[i]) {
              b[i] = 'O';
              let score = tttMinimax(b, 0, -Infinity, Infinity, false, size, maxDepth);
              b[i] = null;
              if (score > bestScore) {
                bestScore = score;
                move = i;
              }
            }
          }
          if (move === -1 && available.length > 0) move = available[0];
        }

        if (move !== -1) {
          const newBoard = [...board];
          newBoard[move] = 'O';
          setBoard(newBoard);
          if (settings.sound) AudioEngine.playMove();
          checkState(newBoard, false);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isXNext, board, winner, size, settings]);

  const checkState = (currentBoard, wasX) => {
    const player = wasX ? 'X' : 'O';
    if (checkWinTTT(currentBoard, size, player)) {
      setWinner(player);
      if (settings.sound) player === 'X' ? AudioEngine.playWin() : AudioEngine.playLoss();
      dispatch({ type: 'UPDATE_STATS', payload: { game: 'tictactoe', result: player === 'X' ? 'wins' : 'losses' } });
    } else if (!currentBoard.includes(null)) {
      setWinner('Draw');
      if (settings.sound) AudioEngine.playSelect();
      dispatch({ type: 'UPDATE_STATS', payload: { game: 'tictactoe', result: 'draws' } });
    } else {
      setIsXNext(!wasX);
    }
  };

  const handleClick = (index) => {
    if (board[index] || winner || !isXNext) return;
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    if (settings.sound) AudioEngine.playMove();
    checkState(newBoard, true);
  };

  return (
    <div className="game-container ttt-container">
      <h2 className="game-title">Neon Tic-Tac-Toe</h2>
      <div className="ttt-controls">
        <button className={size === 3 ? 'active' : ''} onClick={() => reset(3)}>3x3 Grid</button>
        <button className={size === 4 ? 'active' : ''} onClick={() => reset(4)}>4x4 Grid</button>
        <button className={size === 5 ? 'active' : ''} onClick={() => reset(5)}>5x5 Grid</button>
      </div>
      <div className={`ttt-board grid-${size}`}>
        {board.map((cell, idx) => (
          <div key={idx} className={`ttt-cell ${cell ? `cell-${cell}` : ''} ${!isXNext ? 'ai-turn' : ''}`} onClick={() => handleClick(idx)}>
            {cell}
          </div>
        ))}
      </div>
      {winner && (
        <div className="game-over-modal">
          <h3>{winner === 'Draw' ? "System Draw" : `Player ${winner} Wins!`}</h3>
          <button onClick={() => reset(size)} className="btn-primary">Reboot Match</button>
        </div>
      )}
    </div>
  );
};

const ROWS =6;
const COLS =7;

const checkWinC4 = (board, player) => {
    for (let r=0; r<ROWS; r++) {
        for (let c=0; c< COLS -3; c++) {
            if (board[r][c]===player && board[r][c+1]===player && board[r][c+2]===player && board [r][c+3] === player ) return true; 
        }
    }
    for (let c=0; c<COLS; c++) {
        for (let r=0; r<ROWS-3;r++){
            if (board[r][c]===player && board [r+1][c]===player && board [r+2][c]===player && board[r+3][c]===player)return true;
        }
    }
    for (let c=0; c<COLS-3;c++){
        for (let r=0; r<ROWS-3; r++){
            if (board[r][c]===player && board[r+1][c+1]===player && board [r+2][c+2]===player&&board[r+3][c+3]===player) return true;
        }
    }
for (let c=0; c<COLS-3;c++){
    for(let r=3; r<ROWS;r++){
        if(board[r][c]===player&&board[r-1][c+1]===player&&board[r-2][c+2]===player && board[r-3][c+3]===player)return true;
    }
}
return false;
};

const evaluateWindow = (window, player) => {
    let score =0;
    let opp = player === 1? 2:1;
    let countP =0, count0= 0, countE=0;
    for(let i=0; i<4; i++) {
        if(window[i]===player)countP++;
        else if(window[i]===opp) count0++;
        else countE++;
    }
    if (countP===4)score += 100;
    else if (countP===3 && countE ===1) score += 5;
    else if (countP===2 && countE===2) score +=2;
    if (count0 ===3 && countE ===1) score -=4;
    return score;
}

const evaluateBoardC4 = (board, player)=> {
    let score = 0;
    let centerArray = [];
    for(let r=0; r<ROWS; r++) centerArray.push(board[r][Math.floor(COLS/2)]);
    let centerCount = centerArray.filter (v => v===player).length;
    score += centerCount *3;

    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS-3; c++){
            score += evaluateWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]], player);
        }
    }
    for(let c=0; c<COLS; c++){
        for(let r=0; r<ROWS-3; r++){
            score += evaluateWindow([board[r][c],board[r+1][c], board[r+2][c], board[r+3][c]], player);
        }
    }
    for(let r=3; r<ROWS;r++){
        for(let c=0; c<COLS-3; c++){
            score += evaluateWindow([board[r][c],board[r-1][c+1],board[r-2][c+2], board[r-3][c+3]], player);
        }
    }
return score;
};

const getValidLoactionC4 = (board) => {
    let validLocations = [];
    for (let c=0; c<COLS; c++){
        if(board[0][c]===0)validLocations.push(c);
    }
    return validLocations;
};

const dropPieceC4 = (board, row, col, player) => {
    let b = board.map(r=>[...r]);
    b[row][col]=player;
    return b;
};

const getNextOpenRowC4 = (board, col) => {
    for(let r= ROWS -1; r>=0; r--){
        if (board[r][col]===0) return r;
    }
    return -1;
};

const minimaxC4 = (board,depth,alpha,beta,isMaximizing)=> {
    let validLocations = getValidLoactionC4(board)
    let isTerminal = checkWinC4(board,1)||checkWinC4(board,2)||validLocations.length===0;

    if(depth===0||isTerminal){
        if(isTerminal){
            if (checkWinC4(board,2)) return {score: 100000000000000};
            else if (checkWinC4(board,1)) return {score: -100000000000000};
            else return {score:0};
        }else{
            return {score:evaluateBoardC4(board,2)};
        }
    }

    if (isMaximizing){
        let value = -Infinity;
        let column = validLocations[Math.floor(Math.random()*validLocations.length)];
        for (let col of validLocations){
            let row = getNextOpenRowC4(board, col);
            let bCopy = dropPieceC4(board, row, col, 2);
            let newScore= minimaxC4(bCopy, depth-1, alpha, beta, false).score;
            if (newScore > value){
                value = newScore;
                column = col;
            }
            alpha = Math.max(alpha, value);
            if (alpha >= beta) break;
        }
        return {column, score: value};
    } else {
        let value = Infinity;
        let column = validLocations[Math.floor(Math.random()*validLocations.length)];
        for (let col of validLocations) {
            let row = getNextOpenRowC4(board, col);
            let bCopy = dropPieceC4(board, row, col, 1);
            let newScore = minimaxC4(bCopy,depth - 1, alpha, beta, true).score;
            if (newScore<value){
                value = newScore;
                column = col;
            }
            beta = Math.min(beta, value);
            if (alpha >= beta) break;
        }
        return {column, score: value};
    }
};

const ConnectFour = ({dispatch, settings}) => {
    const emptyBoard = Array(ROWS).fill(null).map(()=>Array(COLS).fill(0));
    const [board, setBoard]= useState(emptyBoard);
    const [playerTurn, setPlayerTurn]= useState(1);
    const [winner, setWinner]= useState(0);

    const reset = () => {
        setBoard(emptyBoard);
        setPlayerTurn(1);
        setWinner(0);
    };

    useEffect(()=> {
        if (playerTurn === 2 && winner ===0) {
            const timer = setTimeout(()=>{
                let depth = settings.difficulty==='hard'?5:settings.difficulty === 'medium'? 3:1;
                let result = minimaxC4(board, depth, -Infinity, Infinity, true);
                let col = result.column;
                if (col !==undefined && col !==null){
                    handleDrop(col,2);
                }
            }, 500);
            return ()=> clearTimeout(timer);
        }
    }, [playerTurn, board, winner, settings]);

    const handleDrop = (col, player) => {
        if (winner !==0) return;
        const r = getNextOpenRowC4(board, col);
        if (r !== -1) {
            const newBoard= dropPieceC4(board, r, col, player);
            setBoard(newBoard);
            if (settings.sound) AudioEngine.playMove();

            if(checkWinC4(newBoard,player)){
                setWinner(player);
                if (settings.sound) player === 1? AudioEngine.playWin(): AudioEngine.playLoss();
                dispatch({type:'UPDATE_STATS', payload: {game: 'connectfour', result:player===1? 'wins':'losses'}});
            } else if (getValidLoactionC4(newBoard).length ===0){
                setWinner(3);
                dispatch({type:'UPDATE_STATS', payload:{game:'connectfour', result:'draws'}});
            } else {
                setPlayerTurn(player===1?2:1);
            }
        }
    };

  return (
    <div className="game-container c4-container">
      <h2 className="game-title">Gravity Connect</h2>
      <div className="c4-board-wrapper">
        <div className="c4-selectors">
          {Array(COLS).fill(null).map((_, col) => (
             <div key={`sel-${col}`} className="c4-col-selector" onClick={() => playerTurn === 1 && handleDrop(col, 1)}>
               <div className="c4-selector-arrow">▼</div>
             </div>
          ))}
        </div>
        <div className="c4-board">
          {board.map((row, rIdx) => (
            <div key={`r-${rIdx}`} className="c4-row">
              {row.map((cell, cIdx) => (
                <div key={`c-${cIdx}`} className="c4-cell-wrapper">
                  <div className={`c4-cell p${cell}`}></div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {winner !== 0 && (
        <div className="game-over-modal">
          <h3>{winner === 3 ? "Gridlocked" : `Player ${winner} Claims Victory!`}</h3>
          <button onClick={reset} className="btn-primary">Play Again</button>
        </div>
      )}
    </div>
  );
};

const Dashboard = ({ state, dispatch }) => {
  return (
    <div className="dashboard">
      <div className="hero-section">
        <h1 className="glitch-text" data-text="CYBER ARCADE">CYBER ARCADE</h1>
        <p className="subtitle">Human vs AI Multi-Engine Platform</p>
      </div>

      <div className="game-selector">
        <div className="game-card" onClick={() => dispatch({ type: 'START_GAME', payload: 'tit-tac-toe' })}>
          <div className="card-icon">✕◯</div>
          <h3>Neon Tic-Tac-Toe</h3>
          <p>Advanced Minimax algorithm. Variable grid sizes.</p>
        </div>
        <div className="game-card" onClick={() => dispatch({ type: 'START_GAME', payload: 'connect-four' })}>
          <div className="card-icon">🔴🟡</div>
          <h3>Gravity Connect</h3>
          <p>Alpha-Beta pruning logic in a 7x6 gravity grid.</p>
        </div>
      </div>

      <div className="stats-panel">
        <h3><IconTrophy /> Global Lifetime Stats</h3>
        <div className="stats-grid">
          <div className="stat-box">
            <h4>Tic-Tac-Toe</h4>
            <p>Wins: {state.stats.tictactoe.wins} | Losses: {state.stats.tictactoe.losses}</p>
          </div>
          <div className="stat-box">
            <h4>Connect Four</h4>
            <p>Wins: {state.stats.connectfour.wins} | Losses: {state.stats.connectfour.losses}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Arcade(){
    const [state, dispatch] = useReducer(arcadeReducer, arcadeStateInit);

    useEffect(()=> {
        AudioEngine.init();
        const saved = localStorage.getItem('arcade_stats');
        if (saved) {
            dispatch ({type: 'LOAD_STATS', payload: JSON.parse(saved)});
        }

    }, []);

    return (
        <div className={`arcade-app theme-dark difficulty-${state.settings.difficulty}`}>
            <nav className="top-nav">
                <button className="nav-btn" onClick={()=> dispatch({type: 'SET_VIEW', payload: 'dashboard'})}>
                    <IconHome /> <span className="nav-text">Arcade Hub</span>
                </button>
                <div className="nav-controls">
                    <select
                    value={state.settings.difficulty}
                    onChange={(e)=> dispatch({type: 'SET_DIFFICULTY', payload: e.target.value})}
                    className="glass-select"
                    >
                        <option value="easy">Novice AI</option>
                        <option value="medium">Standard AI</option>
                        <option value="hard">Lethal AI</option>
                    </select>
                    <button className={`sound-btn ${state.settings.sound ? 'on' : 'off'}`}onClick={()=>dispatch({type:'TOGGLE_SOUND'})}>
                        {state.settings.sound ? 'Sound On':'Muted'}
                    </button>
                </div>
            </nav>

            <main className="main-content">
                {state.view === 'dashboard' && <Dashboard state={state} dispatch={dispatch}/>}
                {state.view === 'game' && (
                    <div className="game-wrapper fade in">
                        {state.activeGame=== 'tit-tac-toe' && <TicTacToe dispatch={dispatch} settings={state.settings}/>}
                        {state.activeGame === 'connect-four' && <ConnectFour dispatch={dispatch} settings={state.settings}/>}
                    </div>
                )}
            </main>

            <footer className="arcade-footer">
                <p>Cyber Arcade -AI Neural Engines Online</p>
            </footer>
        </div>
    );
}
