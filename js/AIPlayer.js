// js/AIPlayer.js
export class AIPlayer {

  // Construtor 
  constructor(level, game) {
    this.level = level.toLowerCase(); // "easy" | "medium" | "hard" | "adaptive"
    this.game = game; // instância de TabGame
  }

  
  // Movimento principal da IA (ponto de entrada)
  makeMove() {
    // Ignora se o jogo acabou ou não é a vez da IA
    if (this.game.gameOver || this.game.currentPlayer !== "B") return;

    // Lança os paus se ainda não houver roll válido
    if (!this.game.currentRoll) {
        this.game.rollSticks();
        setTimeout(() => this.makeMove(), 1000);
        return;
    }

    const validMoves = this.getAllValidMoves();

    // Sem jogadas possíveis - passa o turno
    if (validMoves.length === 0) {
      this.game.ui.addMessage("System", "AI has no valid moves — skipping turn.");
      setTimeout(() => this.game.switchTurn(), 1000);
      return;
    }

    // Escolhe jogada conforme o nível
    const move = this.chooseMove(validMoves);

    //Executa o movimento escolhido
    if (move) {
      setTimeout(() => {
        this.game.movePiece(move.from, move.to);
      }, 900);
    }
  }

  // Escolher jogada conforme nível de dificuldade
  chooseMove(validMoves) {
    switch (this.level) {
      case "easy":   return this.randomMove(validMoves);
      case "medium": return this.mediumHeuristic(validMoves);
      case "hard":   return this.hardHeuristic(validMoves);
      case "adaptive": return this.adaptiveMove(validMoves);
      default:       return this.randomMove(validMoves);
    }
  }

  // Gera todas as jogadas válidas 
  getAllValidMoves() {
    const moves = [];
    const player = "B"; // IA joga sempre com pretas
    const board = this.game.board;

    for (let i = 0; i < board.length; i++) {
      const piece = board[i];
      if (!piece || piece.player !== player) continue;

      
      if (!this.game.canMovePiece(piece)) continue;

      const targets = this.game.validTargetsFrom(i);
      for (const t of targets) {
        const targetPiece = board[t];
        moves.push({
          from: i,
          to: t,
          isCapture: !!(targetPiece && targetPiece.player !== player),
        });
      }
    }

    return moves;
  }

  // EASY — Movimento aleatório
  randomMove(moves) {
    // 10% de probabilidade de escolher a primeira jogada (erro simulado)
    if (Math.random() < 0.1) return moves[0];
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // MEDIUM — Heurística simples
  mediumHeuristic(moves) {
    let best = null, bestScore = -Infinity;
    const cols = this.game.cols;

    for (const move of moves) {
      let score = 0;
      const fromR = Math.floor(move.from / cols);
      const toR = Math.floor(move.to / cols);
      const piece = this.game.board[move.from];

      // Estratégia básica
      if (move.isCapture) score += 10; // capturar inimigo

      if (fromR > toR) score += 3; // avançar no tabuleiro

      if (fromR === 3 && toR !== 3) score += 4; // sair da base

      if (toR === 0) score += 6;  // atingir linha final

      if (piece?.type === "final") score -= 2; // evitar mover finais
    

      score += Math.random() * 0.5; // variação aleatória

      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }

    return best;
  }

  // HARD — Heurística posicional multi-critério
  hardHeuristic(moves) {
    let best = null;
    let bestScore = -Infinity;

    for (const move of moves) {
      const sim = this.simulateMove(move);
      const sc = this.evaluateBoard(sim);
      if (sc > bestScore) {
        bestScore = sc;
        best = move;
      }
    }

    return best;
  }

    // Adaptive — alterna entre easy/medium/hard conforme o estado do jogo
    adaptiveMove(moves) {
      const totalGold = this.game.board.filter(p => p?.player === "G").length;
      const totalBlack = this.game.board.filter(p => p?.player === "B").length;
      const advantage = totalBlack - totalGold;

      let mode = "easy";

      // Estratégia: quanto maior a vantagem, mais relaxada a IA;
      // quanto mais atrás, mais séria.
      if (advantage < -2) mode = "hard";        // Está a perder → joga a sério
      else if (advantage <= 1) mode = "medium"; // Jogo equilibrado
      else mode = "easy";                       // Está a ganhar → arrisca menos

      // Pequena aleatoriedade: 20% de chance de escolher outro modo
      if (Math.random() < 0.2) {
        const rand = ["easy", "medium", "hard"];
        mode = rand[Math.floor(Math.random() * 3)];
      }

      this.game.ui.addMessage("System", `AI switched to ${mode.toUpperCase()} mode.`);

      switch (mode) {
        case "easy":   return this.randomMove(moves);
        case "medium": return this.mediumHeuristic(moves);
        case "hard":   return this.hardHeuristic(moves);
        default:       return this.mediumHeuristic(moves);
      }
    }

  // Simulação de jogada
  simulateMove(move) {
    const copy = JSON.parse(JSON.stringify(this.game.board));
    copy[move.to] = copy[move.from];
    copy[move.from] = null;
    return copy;
  }

  // Avaliação de tabuleiro (para o modo HARD)
  evaluateBoard(board) {
    const cols = this.game.cols;
    let score = 0;

    for (let i = 0; i < board.length; i++) {
      const cell = board[i];
      if (!cell) continue;

      const row = Math.floor(i / cols);
      const col = i % cols;

      if (cell.player === "B") {
        // Peças pretas (IA)
        score += 10; // peça viva

        score += (3 - row) * 2; // avanço (quanto mais alto, melhor)

        if (row === 0) score += 5; // linha final

        if (col === 0 || col === cols - 1) score += 1; // bordas seguras

        if (col >= 3 && col <= 5) score += 1; // centro flexível

      } else if (cell.player === "G") {
        // Peças douradas (oponente)

        score -= 10; // peça inimiga viva

        score -= row * 2; // mais avançadas = pior

        if (row === 3) score -= 3; // perto da tua base
      }
    }
    // Pequena aleatoriedade para desempates
    return score + Math.random() * 0.05; 
  }

}

