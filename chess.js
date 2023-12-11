
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
}



// UI Stuff ////////////////////////////////////////////////////
function promptForPromotion(piece){
    let newPiece = 'P';
    while (!['Q', 'R', 'B', 'N'].includes(newPiece.toUpperCase())){
        newPiece = window.prompt(`Promote to which piece? Enter Q, R, B, or N.`, 'Q');
    }
    return piece[0] + newPiece.toUpperCase();
}



////////////////////////////////////////////////////////////////



function xDistSigned(source, target){
    return target.charCodeAt(0) - source.charCodeAt(0);
}

function yDistSigned(source, target){
    return target.charCodeAt(1) - source.charCodeAt(1);
}

function xDist(source, target){
    return Math.abs(source.charCodeAt(0) - target.charCodeAt(0));
}

function yDist(source, target){
    return Math.abs(source.charCodeAt(1) - target.charCodeAt(1));
}


////////////////////////////////////////////////////////////////
//            CHESS LOGIC FUNCTIONS HERE                      //
// legitXMove functions only check that there are no          //
// pieces in the way and that that type of movement is        // 
// generally legal for the piece type.                        //
//                                                            //
// isLegalMove() considers moving into and out of check stuff //
// and whose turn it is is checked in onDragStart()           //
// Consequently, all the legitXMove functions consider both   //
// white and black moves at all times assuming the turn from  //
// the piece.                                                 //
////////////////////////////////////////////////////////////////

// Helper functions:

function getRank(spot){
    return spot[1];
}

function getFile(spot){
    return spot[0];
}

function rankPlus(pos, n){
    return String.fromCharCode(pos.charCodeAt(1) + n);
}

function filePlus(pos, n){
    return String.fromCharCode(pos.charCodeAt(0) + n);
}

function nothingBetweenDiag(source, target, pos){
    for(let i = 1; i < xDist(source, target); i++){
        let file = getFile(source) < getFile(target) ? filePlus(source, i) : filePlus(source, -i);
        let rank = getRank(source) < getRank(target) ? rankPlus(source, i) : rankPlus(source, -i);
        let spot = `${file}${rank}`;
        let piece = pos[spot];
        if(piece !== undefined){
            return false;
        }
    }
    return true;
}

function nothingBetweenRowCol(source, target, pos){
    if (xDist(source, target) == 0){
        for(let i = 1; i < yDist(source, target); i++){
            let rank = getRank(source) < getRank(target) ? rankPlus(source,i) : rankPlus(source, -i);
            let spot = `${source}${rank}`;
            let piece = pos[spot];
            if(piece !== undefined){
                return false;
            }
        }
        return true;
    }
    else if (yDist(source, target) == 0){
        for(let i = 1; i < xDist(source, target); i++){
            let file = getFile(source) < getFile(target) ? filePlus(source, i) : filePlus(source, -i);
            let spot = `${file}${source}`;
            let piece = pos[spot];
            if(piece !== undefined){
                return false;
            }
        }
        return true;
    }
    else{
        return false;
    }
}


// Here are the legitXMove functions:

function legitBishMove(source, target, piece, newPos, oldPos){

    if (xDist(source, target) == yDist(source, target) && piece[1] == 'B'){

        // is source left or right of target?
        let xSign = xDistSigned(source, target) > 0 ? 1 : -1;
        
        // is source above or below target?
        let ySign = yDistSigned(source, target) > 0 ? 1 : -1;

        // Find out if there is a piece in the way.
        for(let i = 1; i < xDist(source, target); i++){
            let spot = `${String.fromCharCode(source.charCodeAt(0) + i * xSign)}${String.fromCharCode(source.charCodeAt(1) + i * ySign)}`;
            let piece = oldPos[spot];
            if (piece !== undefined) {
                return false; // there is a piece in the way, so it is not a legal move
            }
        }

        // if no piece is in the way, then it is a legal move
        return true;
    }

    return false;
}

function legitRookMove(source, target, piece, newPos, oldPos){
    let purelyHorizontal = yDist(source, target) == 0;
    let purelyVertical = xDist(source, target) == 0;
    if (!(purelyHorizontal || purelyVertical) || piece[1] != 'R'){
        return false;
    }
    else{

        // Is there anything in the way?
        let nothingInTheWay = nothingBetweenRowCol(source, target, oldPos);

        // Is the target occupied?
        let emptyOrCapture = (oldPos[target] === undefined || oldPos[target][0] != piece[0]);

        return emptyOrCapture && nothingInTheWay;
    }
}

function legitQueenMove(source, target, piece, newPos, oldPos){
    if (piece[1] != 'Q'){
        return false;
    }
    else if (xDist(source,target) == 0 || yDist(source,target) == 0){  // horizontal and vertical moves
        let nothingInTheWay = nothingBetweenRowCol(source, target, oldPos);
        let emptyOrCapture = (oldPos[target] === undefined || oldPos[target][0] != piece[0]);
        return emptyOrCapture && nothingInTheWay;
    }
    else if (xDist(source,target) == yDist(source,target)){ // diagonal moves
        let nothingInTheWay = nothingBetweenDiag(source, target, oldPos);
        let emptyOrCapture = (oldPos[target] === undefined || oldPos[target][0] != piece[0]);
        return emptyOrCapture && nothingInTheWay;
    }
    else{
        return false;
    }
}

function legitKnightMove(source, target, piece, newPos, oldPos){
    let dx = xDist(source, target);
    let dy = yDist(source, target);
    let rightPath = (piece[1] == 'N') && ((dx == 2 && dy == 1) || (dx == 1 && dy == 2));
    return rightPath && (oldPos[target] == undefined || oldPos[target][0] != piece[0]);
}

// Including en passant
function legitPawnMove(source, target, piece, newPos, oldPos){
    
    // Normal move one forward:
    let isForwardOne = ((yDistSigned(source, target) == 1 && piece[0] == 'w') || (yDistSigned(source, target) == -1 && piece[0] == 'b')) && xDist(source, target) == 0;
    let isNormalPawnMove = isForwardOne && (oldPos[target] == undefined);

    // Double move from rank 2 to rank 4:
    let isDoublePawnMoveWhite = (source[1] == 2) && (target[1] == 4) && (oldPos[`${target[0]}3`] == undefined) && (oldPos[`${target[0]}4`] == undefined);
    let isDoublePawnMoveBlack = (source[1] == 7) && (target[1] == 5) && (oldPos[`${target[0]}6`] == undefined) && (oldPos[`${target[0]}5`] == undefined);
    let isDoublePawnMove = isDoublePawnMoveWhite || isDoublePawnMoveBlack;

    // Capturing a piece:
    let capturedPiece = oldPos[target];
    let enemyPieceThere = (capturedPiece !== undefined) && (capturedPiece[0] != piece[0])
    let isDiagonalOne = ((yDistSigned(source, target) == 1 && piece[0] == 'w')  || 
                         (yDistSigned(source, target) == -1 && piece[0] == 'b') ) && xDist(source, target) == 1;


    let isCapture = enemyPieceThere && isDiagonalOne && target[1] != '1' && target[1] != '8'; // promotions are handled separately
 
    // En passant (window.enPassant is null or the target of an available en passant move):
    let isEnPassant = false;
    if (window.enPassant !== null && target == window.enPassant && isDiagonalOne){
        isEnPassant = true;
        let signedOne = (piece[0] == 'w') ? -1 : 1;
        let pieceToRemove = `${target[0]}${String.fromCharCode(target.charCodeAt(1) + signedOne)}`;
        delete newPos[pieceToRemove];
    }
    


    // Promotion (including via capture):
    let targetOccupied = (oldPos[target] !== undefined);
    let targetOccupiedByEnemy = targetOccupied && (oldPos[target][0] != piece[0]);
    
    let knightBishRookQueen = (newPos[target] !== undefined) &&
                              (newPos[target][0] == piece[0]) && // same player
                              (newPos[target][1] == 'N' || newPos[target][1] == 'B' || newPos[target][1] == 'R' || newPos[target][1] == 'Q');

    let isPromotion = knightBishRookQueen && 
                      ((isForwardOne && !targetOccupied) ||
                       (isDiagonalOne && targetOccupiedByEnemy));

    return (piece[1] == 'P') && (isNormalPawnMove || isDoublePawnMove || isCapture || isEnPassant || isPromotion);
}


// Including castling
function legitKingMove(source, target, piece, newPos, oldPos){
    let notOccupiedBySelf = (oldPos[target] == undefined) ||
                            ((oldPos[target][0] != piece[0]) && // can't capture a piece of the same color
                             (oldPos[target][1] != 'K')); // can't capture a king

    let isNormalKingMove = (xDistSigned(source, target) <= 1) && 
                           (yDistSigned(source, target) <= 1) && 
                           notOccupiedBySelf;

    let isCastlingMove = false // TODO

    return (piece[1] == 'K') && (isNormalKingMove || isCastlingMove);
}




function isLegalMove(source, target, piece, newPos, oldPos, orientation){

    // Is the right player moving?
    if ((orientation == 'black' && piece[0] == 'w') || (orientation == 'white' && piece[0] == 'b')){
        console.log(`You can't move your opponents piece from ${source} to ${target}!`);
        return false;
    }


    // For debugging:
    console.log(`isLegalMove(${source}, ${target}, ${piece}, ${newPos}, ${oldPos}, ${orientation}):`);

    if(legitPawnMove(source, target, piece, newPos, oldPos)){
        console.log(`legit pawn move from ${source} to ${target}`);
        return true;
    }
    else if(legitKnightMove(source, target, piece, newPos, oldPos)){
        console.log(`legit knight move from ${source} to ${target}`);
        return true;
    }
    else if(legitBishMove(source, target, piece, newPos, oldPos)){
        console.log(`legit bishop move from ${source} to ${target}`);
        return true;
    }
    else if(legitRookMove(source, target, piece, newPos, oldPos)){
        console.log(`legit rook move from ${source} to ${target}`);
        return true;
    }
    else if(legitQueenMove(source, target, piece, newPos, oldPos)){
        console.log(`legit queen move from ${source} to ${target}`);
        return true;
    }
    else if(legitKingMove(source, target, piece, newPos, oldPos)){
        console.log(`legit king move from ${source} to ${target}`);
        return true;
    }
    else{
        console.log(`illegal move from ${source} to ${target}`);
        return false;
    }

}