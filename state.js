// This file defines the DiceChess state schema.
// window.state = {
//     "board": null,
//     "whoseTurn": null,
//     "enPassant": null,
//     "castleEligibility": null
// }

DIAGONALS = [[1,1],[1,-1],[-1,1],[-1,-1]]
ROWSANDCOLS = [[1,0],[-1,0],[0,1],[0,-1]]
KNIGHTOFFSETS = [[1,2],[1,-2],[-1,2],[-1,-2],[2,1],[2,-1],[-2,1],[-2,-1]]

function includesMove(arr, move){
    for (let i = 0; i < arr.length; i++){
        if (arr[i][0] == move[0] && arr[i][1] == move[1]){
            return true;
        }
    }
    return false;
}

// A move is a pair of spots like ['a1', 'b2']
// A promotion can also be a triple like ['b7', 'b8', 'Q']

class DiceChessState {
    constructor() {
        this.board;
        this.position = null;
        this.whoseTurn = null;
        this.anotherTurn = false;
        this.isSecondTurn = false;
        this.enPassant = null;
        this.castleEligibility = null;
        this.simulated = false;
        this.gameHistoryStack = [];
    }

    log(...args){
        if (!this.simulated){
            console.log(...args);
        }
    }

    clone(){
        let newState = new DiceChessState();
        newState.board = this.board;
        newState.position = JSON.parse(JSON.stringify(this.position)); // deep copy this.position;
        newState.whoseTurn = this.whoseTurn;
        newState.anotherTurn = this.anotherTurn;
        newState.isSecondTurn = this.isSecondTurn;
        newState.enPassant = this.enPassant;
        newState.castleEligibility = JSON.parse(JSON.stringify(this.castleEligibility)); // deep copy this.castleEligibility;
        newState.simulated = this.simulated;
        newState.gameHistoryStack = Array.from(this.gameHistoryStack);
        return newState;
    }

    initGame(board){
        this.board = board;
        this.position = board.position();
        this.whoseTurn = 'White';
        this.anotherTurn = false;
        this.isSecondTurn = false;
        this.enPassant = null;
        this.castleEligibility = {
            'WK': true,
            'BK': true,
            'WRa': true, // a file rooks
            'BRa': true,
            'WRh': true, // h file rooks
            'BRh': true
        } // first letters capital because whoseTurn is capitalized: see makeMove
        this.gameHistoryStack = [];
    }

    // ASSUMES A GLOBAL window.state VARIABLE IS THE MAIN STATE and board IS THE CHESS BOARD!!!
    revertMove(numMoves=1){
        for (let i = 0; i < numMoves; i++){
            window.state = this.gameHistoryStack.pop();
        }
        window.board.position(window.state.position);

        document.querySelector('#proposeTakeback').disabled = false;
        document.querySelector('#acceptTakeback').disabled = true;
        document.querySelector('#rejectTakeback').disabled = true;
    }
    

    updateToMove(){
        const required = requiredRoll(false);
        let nMoves = this.anotherTurn ? `First of two moves! (A ${required} was rolled!)` :
                            (this.isSecondTurn ? `Second of two moves.` : `1 move only (didn't roll a ${required})`);
        document.querySelector('#toMove').innerHTML = `${this.whoseTurn} to move <br>${nMoves}`;
    }

    check(){
        // If it were the other player's turn, could they capture your king?
        let king = this.getPieces('K')[0];
        return this.squareIsAttacked(king);
    }

    checkmate(){
        const standardMate = this.legalMoves().length == 0 && this.check();
        const kingCapture = this.getPieces('K').length == 0;
        return standardMate || kingCapture;
    }

    stalemate(){
        return this.legalMoves().length == 0 && !this.check();
    }

    tryMakeMove(move){
        if (includesMove(this.legalMoves(), move)){
            this.makeMove(move);
            return true;
        }
        return false;
    }

    // Doesn't check for legality at all, but actually makes the move
    makeMove(move, promotionPiece){
        this.log(`Moving piece '${this.position[move[0]]}' from ${move[0]} to ${move[1]}: (promotion piece: ${promotionPiece})`);
        let stateBefore = this.clone();
        this.gameHistoryStack.push(stateBefore);
        this.log(`state before:`, stateBefore);

        if (this.position[move[0]] === undefined){
            this.log("Invalid move: (source empty) ", move, this.position);
            return false;
        }

        // Check for castling:
        let isKingMove = this.position[move[0]][1] == 'K';
        let kingRankDist = xDistSigned(move[0], move[1]);
        if (isKingMove && Math.abs(kingRankDist) == 2){
            this.log("Castling: ", move, this.position);
            let r = rank(move[0]);
            if (kingRankDist > 0){ // Kingside castle
                // Move Kingside rook to f file
                this.position['f' + r] = this.position['h' + r];
                delete this.position['h' + r];
            } else { // Queenside castle
                // Move Queenside rook to d file
                this.position['d' + r] = this.position['a' + r];
                delete this.position['a' + r];
            }
        }
        
        // If it's an en passant capture, then
        // delete the captured pawn (special case)
        let isPawnMove = this.position[move[0]][1] == 'P'
        let direction = (rank(move[0]) < rank(move[1])) ? 1 : -1;
        if (isPawnMove && (move[1] == this.enPassant)){
            let squareToDelete = `${file(move[1])}${rank(move[1]) - direction}`;
            delete this.position[squareToDelete];
        }


        // If it's a two-square pawn move, set enPassant:
        this.enPassant = null;
        if (isPawnMove && Math.abs(rank(move[0]) - rank(move[1])) == 2){
            this.enPassant = `${file(move[0])}${rank(move[0]) + direction}`;
        }

        // This is so that it actually updates when later doing
        // board.position(state.position)
        // It seems without it, chessboardjs thinks the position hasn't changed.
        this.position = JSON.parse(JSON.stringify(this.position));

        // Updating castling eligibility
        if (isKingMove){
            this.castleEligibility[`${this.whoseTurn[0]}K`] = false;
        }
        for(let rank of [1,8]){
            for (let file of ['a','h']){
                let color = rank == 1 ? 'W' : 'B';
                let moveStartsOnRookHome = (move[0] == `${file}${rank}`);
                if (moveStartsOnRookHome)
                    this.castleEligibility[`${color}R${file}`] = false;
            }
        }
        
        let [from, to] = move;
        this.position[to] = this.position[from];
        delete this.position[from];

        // If it's a pawn move, check for promotion and update piece type
        if (isPawnMove && (rank(move[1]) == 1 || rank(move[1]) == 8))
            this.position[to] = promotionPiece;

        if (this.anotherTurn){
            this.anotherTurn = false;
            this.isSecondTurn = true;
        }
        else{
            this.whoseTurn = (this.whoseTurn == "White") ? "Black" : "White";
            this.isSecondTurn = false;
        }
        
        this.log("state after: ", this.clone());

        if (!this.simulated){
            document.querySelector("#proposeTakeback").disabled = false;
            document.querySelector("#acceptTakeback").disabled = true;
            document.querySelector("#rejectTakeback").disabled = true;
            this.updateToMove();
        }
    }


    getPieces(type){
        let pieces = [];
        for (let [spot, piece] of Object.entries(this.position)){
            if (piece != undefined && piece[0].toUpperCase() == this.whoseTurn[0] && piece[1] == type){
                pieces.push(spot);
            }
        }
        return pieces;
    }



    exploreDirections(spot, directions){
        let moves = [];
        for(let direction of directions){
            for(let i = 1; i < 8; i++){
                let newSpot = offsetSpot(spot, direction[0]*i, direction[1]*i);
                let [newFile, newRank] = [file(newSpot), rank(newSpot)];
                let withinBoard = (newFile >= 'a' && newFile <= 'h' && newRank >= 1 && newRank <= 8);
                let targetEmpty = (this.position[newSpot] === undefined);

                let targetEnemy;
                try{
                    targetEnemy = (!targetEmpty && this.position[newSpot][0].toLowerCase() != this.whoseTurn[0].toLowerCase());
                }
                catch{
                    this.log("weirdness: ", newSpot, targetEmpty, targetEnemy, this.position);
                }

                if (withinBoard && (targetEmpty || targetEnemy)){
                    moves.push([spot, newSpot]);
                }

                // Break out if we hit a piece or the edge of the board
                if (!withinBoard || !targetEmpty){
                    break;
                }
            }
        }
        return moves;
    }



    /////////////////////////////////////////////////////
    // Move Legality Checking Below Here               //
    //                                                 //
    // prelimXMoves() do not consider being in check.  //
    /////////////////////////////////////////////////////


    prelimKnightMoves(){
        // 1.) Find knights owned by the current player.
        let knights = this.getPieces('N')

        // 2.) Find their legal moves.
        let moves = [];
        for (let spot of knights){
            for (let [i,j] of KNIGHTOFFSETS){
                let newSpot = offsetSpot(spot, i, j);
                let [newFile, newRank] = [file(newSpot), rank(newSpot)];
                let withinBoard = (newFile >= 'a' && newFile <= 'h' && newRank >= 1 && newRank <= 8);
                let targetEmpty = (this.position[newSpot] === undefined);
                let targetEnemy = (this.position[newSpot] !== undefined && this.position[newSpot][0] != this.whoseTurn[0].toLowerCase());

                if (withinBoard && (targetEmpty || targetEnemy)){
                    moves.push([spot, newSpot]);
                }
            }
        }

        return moves;
    }

    prelimBishopMoves(){
        let moves = [];
        for (let spot of this.getPieces('B')){
            moves.push(...this.exploreDirections(spot, DIAGONALS));
        }
        return moves;
    }

    prelimRookMoves(){
        let moves = [];
        for (let spot of this.getPieces('R')){
            moves.push(...this.exploreDirections(spot, ROWSANDCOLS));
        }
        return moves;
    }


    prelimQueenMoves(){
        let moves = [];
        for (let spot of this.getPieces('Q')){
            moves.push(...this.exploreDirections(spot, ROWSANDCOLS.concat(DIAGONALS)));
        }
        return moves;
    }


    squareIsAttacked(spot){
        let clone = this.clone();
        clone.simulated = true;
        clone.whoseTurn = (this.whoseTurn == "White") ? "Black" : "White";
        let moves = clone.prelimMoves();
        for (let move of moves){
            if (move[1] == spot){
                return true;
            }
        }
        return false;
    }

    squareIsEmpty(spot){
        return (this.position[spot] === undefined);
    }

    prelimKingMoves(){

        let kings = this.getPieces('K');
        let king = kings[0]; // We can assume you have exactly one king

        // A hack needed for putsMeInCheck (why?...)
        if (king === undefined){
            return [];
        }

        let moves = [];
        for (let [i,j] of ROWSANDCOLS.concat(DIAGONALS)){
            let newSpot = offsetSpot(king, i, j);
            if ((this.position[newSpot] === undefined || this.position[newSpot][0] != this.whoseTurn[0].toLowerCase()) && rank(newSpot) >= 1 && rank(newSpot) <= 8 && file(newSpot) >= 'a' && file(newSpot) <= 'h'){
                moves.push([king, newSpot]);
            }
        }

        // Castling (more checks come later in legalMoves)
        let kingIsEligible = this.castleEligibility[this.whoseTurn[0] + 'K'] // && !this.check();
        let [k,q] = this.whoseTurn[0] == 'W' ? ['h','a'] : ['a','h'];
        let kingsideRookIsEligible = this.castleEligibility[this.whoseTurn[0] + 'R' + k];
        let queensideRookIsEligible = this.castleEligibility[this.whoseTurn[0] + 'R' + q];

        let r = this.whoseTurn[0] == 'W' ? '1' : '8';
        if (kingIsEligible && kingsideRookIsEligible){
            moves.push([`e${r}`, `g${r}`]);
        }
        if (kingIsEligible && queensideRookIsEligible){
            moves.push([`e${r}`, `c${r}`]);
        }
        
        return moves;
    }

    prelimPawnMoves(){
        let pawns = this.getPieces('P');
        let direction = this.whoseTurn[0] == 'W' ? 1 : -1;

        let moves = [];
        for (let spot of pawns){
            let onSecondRank = (spot[1] == '2' && this.whoseTurn[0] == 'W') || (spot[1] == '7' && this.whoseTurn[0] == 'B');
            
            // Check if moving one forward is legal
            let newSpot = offsetSpot(spot, 0, direction);
            if (this.position[newSpot] === undefined){
                moves.push([spot, newSpot]);
            }

            // Check if moving two forward is legal
            if (onSecondRank){
                let newSpot = offsetSpot(spot, 0, direction * 2);
                if (this.position[newSpot] === undefined){
                    moves.push([spot, newSpot]);
                }
            }

            // Check if we can take an enemy piece
            for (let [i,j] of [[-1, direction], [1, direction]]){
                let newSpot = offsetSpot(spot, i, j);
                if (this.position[newSpot] !== undefined && this.position[newSpot][0] != this.whoseTurn[0]){
                    moves.push([spot, newSpot]);
                }

                // Check if we can take en passant
                else if(this.enPassant === newSpot){
                    moves.push([spot, newSpot]);
                }
            }
        }

        return moves;
    }

    prelimMoves(){
        return [
            ...this.prelimKnightMoves(),
            ...this.prelimBishopMoves(),
            ...this.prelimRookMoves(),
            ...this.prelimQueenMoves(),
            ...this.prelimKingMoves(),
            ...this.prelimPawnMoves()
        ];
    }

    legalMoves(){
        return this.prelimMoves().filter(
            move => !this.putsMeInCheck(move) && !this.isBadCastle(move)
        );
    }


    putsMeInCheck(move){
        let newBoard = this.clone();
        newBoard.simulated = true;
        
        newBoard.anotherTurn = false;
        newBoard.makeMove(move);

        newBoard.whoseTurn = (newBoard.whoseTurn == "White") ? "Black" : "White";
        return newBoard.check();
    }

    isBadCastle(move){
        // A castle move is bad in this sense if:
        // 1.) It's a castle and...
        // 2.) you're in check.
        //     OR
        //     the king will pass through a threatened square.
        
        let isKingMove = this.position[move[0]] !== undefined && this.position[move[0]][1].toUpperCase() == 'K';
        let inCheck = this.check();

        if (!isKingMove){
            return false;
        } else if (move[0] == 'e1' && move[1] == 'g1'){
            return this.squareIsAttacked('f1') || inCheck;
        } else if (move[0] == 'e1' && move[1] == 'c1'){
            return this.squareIsAttacked('d1') || inCheck;
        } else if (move[0] == 'e8' && move[1] == 'g8'){
            return this.squareIsAttacked('f8') || inCheck;
        } else if (move[0] == 'e8' && move[1] == 'c8'){
            return this.squareIsAttacked('d8') || inCheck;
        } else {
            return false;
        }
    }

}