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
    let promotionPiece = undefined;
    if (whitePromotion || blackPromotion) {
        promotionPiece = promptForPromotion(piece);
        newPos[target] = promotionPiece;
    }

    if(!includesMove(state.legalMoves(), [source,target]) || target == "offboard" || source == target || state.whoseTurn.toUpperCase() != board.orientation().toUpperCase()){
        console.log(`Illegal move moving ${piece} from ${source} to ${target}`)
        setTimeout(() => board.position(oldPos), 10); // hacky
        return false;
    }

    boardStatus("active");
    window.position = newPos;
    state.makeMove([source,target], promotionPiece);
    setTimeout(() => board.position(state.position), 10);

    sendMove(window.conn, [source, target], promotionPiece);
    window.enPassant = null;
}





function checkConnectCode(){
    // enable/disable connect button if username/opponentConnect is nonempty/empty.
    let opponentCode = document.getElementById('opponentCode').value;
    if (opponentCode.length > 0){
        document.getElementById('connect').disabled = false;
    }
    else{
        document.getElementById('connect').disabled = true;
    }
}

function copyGameLink(){
        const l = window.location;
        navigator.clipboard.writeText(`${l.protocol}//${l.host}${l.pathname}?theirId=${peer.id}`);
}

function updateURL(myId, theirId){
    const l = window.location;
    window.history.replaceState(null, null, `${l.protocol}//${l.host}${l.pathname}?theirId=${theirId}&myId=${myId}`);
}





function boardStatus(status){
    let chessBoard = document.getElementById("chessBoard");
    chessBoard.classList.remove("active");
    chessBoard.classList.remove("bad");
    chessBoard.classList.remove("good");
    chessBoard.classList.add(status);
}

function sendPosition(conn, position){
    conn.send({
        type: 'position',
        value: position
    });
}

function sendMove(conn, move, promotionPiece){
    conn.send({
        type: 'move',
        value: move,
        promotionPiece: promotionPiece
    });
}

function advantage(){
    let material = 0;

    let values = {
        'P': 1,
        'N': 3,
        'B': 3,
        'R': 5,
        'Q': 9,
        'K': 0
    };

    for(let val of Object.values(board.position())){
        let white = val.includes('w');
        let sign = white ? 1 : -1;
        material += sign * values[val[1]];
    }

    let sign = board.orientation() == 'white' ? 1 : -1;
    return material * sign;
}

function requiredRoll(opponentsRoll){
    if(opponentsRoll){
        return 7 + Math.max(-advantage(), 0);
    }
    return 7 + Math.max(advantage(), 0);
}

function processRoll(roll, opponentsTurn){
    rollDiceGUI(roll[0],roll[1]);
    roll = roll[0] + roll[1];

    let opponentColor = board.orientation() == 'white' ? 'black' : 'white';
    let color = opponentsTurn ? opponentColor : board.orientation();
    
    if (requiredRoll(opponentsTurn) == roll){
        state.anotherTurn = true;
        if (opponentsTurn){
            boardStatus("bad");
        }
        if (!opponentsTurn){
            boardStatus("good");
        }
    }
    else{
        state.anotherTurn = false;
        boardStatus("active");
    }
    state.updateToMove();
}

function rollDice(){
    // Roll 2 dice and send the result to the opponent.
    let roll = Math.floor(Math.random() * 6) + 1;
    let roll2 = Math.floor(Math.random() * 6) + 1;
    console.log(`Rolled ${roll} and ${roll2}`);

    window.conn.send({
        type: 'roll',
        value: [roll,roll2]
    });

    processRoll([roll,roll2], 0);
}


function initializeOrientation(){
    if (peer.id < window.conn.peer){
        board.orientation('white');
        rollDice();
    }
    else{
        board.orientation('black');
    }
}






function recvData(data){
    let chessBoard = document.getElementById("chessBoard");

    console.log('Received', data);
    if (data.type == 'move'){
        state.makeMove(data.value, data.promotionPiece);
        board.position(state.position);
        if (chessBoard.classList.contains("active")) {
            boardStatus("active");
            rollDice();
        }
        else if (chessBoard.classList.contains("bad")) {
            boardStatus("active");
        }
    }
    else if(data.type == 'roll'){
        processRoll(data.value, 1);
    }
    else if(data.type == 'takebackProposal'){
        alert("Your opponent has requested a takeback. Press accept or reject button after closing this popup");
        document.querySelector('#proposeTakeback').disabled = true;
        document.querySelector('#acceptTakeback').disabled = false;
        document.querySelector('#rejectTakeback').disabled = false;
    }
    else if(data.type = 'takeback'){
        if (data.value){
            state.revertMove();
        }
        else{
            alert("Opponent rejected takeback request");
        }
    }
}



function processConnection(conn){
    if (conn){
        window.conn = conn;
        conn.on('data', recvData);
    }
    console.log('Connected to', window.conn.peer);
    updateURL(peer.id, window.conn.peer);

    document.getElementById('opponentCode').value = window.conn.peer;
    document.getElementById('connect').disabled = true;
    document.getElementById('chessBoard').classList.add("active");

    setTimeout(initializeOrientation, 1000);
}




function connectToPeer(id){
    if (!id)
        id = document.getElementById('opponentCode').value;

    let conn = peer.connect(id);
    conn.on('open', processConnection);
    conn.on('data', recvData);
    window.conn = conn;
    return conn;
}


function proposeTakeback(){
        conn.send({
            type: 'takebackProposal',
        });
}

function acceptTakeback(){
    conn.send({
        type: 'takeback',
        value: true
    });
    state.revertMove();
}

function rejectTakeback(){
    conn.send({
        type: 'takeback',
        value: false
    });
    document.querySelector('#proposeTakeback').disabled = true;
    document.querySelector('#acceptTakeback').disabled = false;
    document.querySelector('#rejectTakeback').disabled = false;
}







document.body.onload = function () {

    const urlStuff = new URL(window.location.href);
    const params = new URLSearchParams(urlStuff.search);
    let myId = params.get('myId');
    window.peer = new Peer(myId);
    
    peer.on('connection', processConnection);
    
    // Set Connect code in the DOM.
    setTimeout(function(){
        document.getElementById('connectCode').innerHTML = peer.id;
        localStorage.setItem("peerId", peer.id);
    },2000);

    setTimeout(function(){

        const url = new URL(window.location.href);
        const params = new URLSearchParams(url.search);
        const theirId = params.get('theirId');

        // If there's a hash in the url, use it to connect to the peer.
        if (theirId != null){
            connectToPeer(theirId);
        }
    }, 4000);
};