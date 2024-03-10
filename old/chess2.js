// alternate approach where the set of legal moves is generated explicitly.


// CHESS EVENT HANDLERS ////////////////////////////////////////
function onDragStart (source, piece, position, orientation) {
    if (!window.conn){
        return false;
    }
    if ((orientation === 'white' && piece.search(/^w/) === -1) ||
        (orientation === 'black' && piece.search(/^b/) === -1)) {
      return false
    }
}

function onDrop (source, target, piece, newPos, oldPos, orientation) {
    console.log('Source: ' + source)
    console.log('Target: ' + target)
    console.log('Piece: ' + piece)
    console.log('New position: ' + Chessboard.objToFen(newPos))
    console.log('Old position: ' + Chessboard.objToFen(oldPos))
    console.log('Orientation: ' + orientation)
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')

    // If it's a pawn move to the 1st or 8th rank, prompt for promotion.
    // piece will remain a pawn, but newPos[target] will be the new piece.
    let whitePromotion = piece[1] == 'P' && (source[1] == '7' && target[1] == '8');
    let blackPromotion = piece[1] == 'P' && (source[1] == '2' && target[1] == '1');
    if (whitePromotion || blackPromotion) {
        newPos[target] = promptForPromotion(piece);
    }

    if(!isLegalMove(source, target, piece, newPos, oldPos, orientation) || target == "offboard" || source == target || window.whoseMove != board.orientation()){
    
        console.log(`Illegal move moving ${piece} from ${source} to ${target}`)
        setTimeout(() => board.position(window.position), 500); // reset board.position(oldPos);

        return false;
    }

    let chessBoard = document.getElementById("chessBoard");

    // Switch whose turn it is if the person is doing their second move or if the opponent only has one move.
    if (chessBoard.classList.contains("active")){
        updateToMove(board.orientation() == 'white' ? 'black' : 'white');
    }
    // otherwise they are doing their first move and we don't need to switch.
    else{
        updateToMove(board.orientation());
    }

    boardStatus("active");
    window.position = newPos;
    board.position(newPos); // needed for promotions
    sendPosition(window.conn, newPos);
    window.enPassant = null;

}




function playersPieces(pos, player){
    let pieces = Object.keys(pos).filter(spot => pos[spot] !== undefined && pos[spot][0] == player[0]);
    return pieces.map(spot => [spot, pos[spot]]);
}


function inCheck(position, player){
    return false // TODO: idea, see if any opponent pieces can capture the king...
}


function legalPawnMoves(pos, player){
    // Five cases for each pawn:
    // 1.) single push 
    
    // 2.) double push, 
    
    // 3.) normal capture,

    // 4.) en passant capture,

    // 5.) promotion

}

function legalKnightMoves(pos, player){
}

function legalBishopMoves(pos, player){
}

function legalRookMoves(pos, player){
}

function legalQueenMoves(pos, player){
}


function legalKingMoves(pos, player){
}




// returns a list of [[source, target], [source, target], ...]
// Castling is implied by a king moving 2 squares horizontally.
// Promotion requires another piece of information and is [source, target, newPiece]
function legalMoves(pos, player){
    return [...legalPawnMoves(pos, player), 
            ...legalKnightMoves(pos, player), 
            ...legalBishopMoves(pos, player), 
            ...legalRookMoves(pos, player), 
            ...legalQueenMoves(pos, player)];
}