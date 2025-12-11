// js/TabRules.js
export class TabRules {
  constructor(rows = 4, cols = 9) {
    this.rows = rows;
    this.cols = cols;
    this.board = [];
    this.currentPlayer = "G";
    this.currentRoll = null;
  }

  setState(board, currentPlayer, currentRoll) {
    this.board = board;
    this.currentPlayer = currentPlayer;
    this.currentRoll = currentRoll;
  }

  // Mesmo espelhamento que usas no TabGame
  mirrorIndex(idx) {
    return this.rows * this.cols - 1 - idx;
  }

  // Caminho em serpente (igual ao TabGame)
  getBoardPath() {
    const path = [];
    for (let r = 0; r < this.rows; r++) {
      if (r % 2 === 0) {
        for (let c = this.cols - 1; c >= 0; c--) {
          path.push(r * this.cols + c);
        }
      } else {
        for (let c = 0; c < this.cols; c++) {
          path.push(r * this.cols + c);
        }
      }
    }
    return path;
  }

  // Um passo no caminho + bifurcação 3ª→4ª fila para a 2ª
  computeNextPositions(idx) {
    const path = this.getBoardPath();

    const idxToPathPos = new Map();
    for (let i = 0; i < path.length; i++) {
      idxToPathPos.set(path[i], i);
    }

    const p = idxToPathPos.get(idx);
    if (p == null) return [];

    const result = [];

    if (p + 1 < path.length) {
      const curIdx = path[p];
      const nextIdx = path[p + 1];
      result.push(nextIdx);

      // Bifurcação: de row 2 para row 3 pode saltar para row 1 (mesma coluna)
      const rCur = Math.floor(curIdx / this.cols);
      const rNext = Math.floor(nextIdx / this.cols);
      const cCur = curIdx % this.cols;

      if (rCur === 2 && rNext === 3) {
        const rr = 1;           // 2ª fila (0-based)
        const cc = cCur;        // mesma coluna
        result.push(rr * this.cols + cc);
      }
    }

    return result;
  }

  // Avançar 'steps' passos, considerando bifurcações
  advanceVariants(startIdx, steps) {
    let frontier = [startIdx];
    for (let i = 0; i < steps; i++) {
      const next = [];
      for (const pos of frontier) {
        next.push(...this.computeNextPositions(pos));
      }
      frontier = [...new Set(next)];
    }
    return frontier;
  }

  // Destinos válidos para a peça na casa idx
  validTargetsFrom(idx) {
    const roll = this.currentRoll;
    if (!roll || roll <= 0) return [];
    if (!this.board) return [];

    const board = this.board;
    const player = this.currentPlayer;
    const mirror = this.mirrorIndex.bind(this);

    // Trabalhamos sempre no "espaço Gold"
    let start = idx;
    if (player === "B") start = mirror(start);

    const destsGold = this.advanceVariants(start, roll);
    const dests = player === "B" ? destsGold.map(mirror) : destsGold;

    const piece = board[idx];
    const rowFrom = Math.floor(idx / this.cols);

    const playerStartRow = player === "G" ? 0 : this.rows - 1;
    const playerFinalRow = player === "G" ? this.rows - 1 : 0;

    return dests.filter((i) => {
      if (i < 0 || i >= board.length) return false;

      const targetPiece = board[i];
      const rowTo = Math.floor(i / this.cols);

      // (1) Não pode cair em cima de peça da mesma cor
      if (targetPiece && targetPiece.player === player) return false;

      // (2) Opcional – não voltar à fila final depois de sair dela.
      //    Aqui esta regra só funciona se board[i].wasOnLastRow estiver cheio.
      if (
        piece &&
        piece.wasOnLastRow &&
        rowFrom !== playerFinalRow &&
        rowTo === playerFinalRow
      ) {
        return false;
      }

      // (3) NÃO pode voltar à fila inicial depois de a deixar
      if (rowTo === playerStartRow && rowFrom !== playerStartRow) {
        return false;
      }

      // (4) Só pode ENTRAR na fila FINAL se a fila INICIAL estiver vazia
      if (rowTo === playerFinalRow) {
        const startSlice = board.slice(
          playerStartRow * this.cols,
          (playerStartRow + 1) * this.cols
        );
        const hasStartPieces = startSlice.some(
          (cell) => cell && cell.player === player
        );
        if (hasStartPieces) return false;
      }

      return true;
    });
  }
}
