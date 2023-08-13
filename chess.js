
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

    if(target == "offboard" || source == target){
        return false;
    }

    let chessBoard = document.getElementById("chessBoard");

    if (chessBoard.classList.contains("active")){
        updateToMove(board.orientation() == 'white' ? 'black' : 'white');
    }
    else{
        updateToMove(board.orientation());
    }

    boardStatus("active");
    window.position = newPos;
    sendPosition(window.conn, newPos);
}

