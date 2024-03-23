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
    state.makeMove([source,target], promotionPiece);
    // board.position(state.position); // needed for promotions
    setTimeout(() => board.position(state.position), 10);


    // sendPosition(window.conn, newPos);
    sendMove(window.conn, [source, target], promotionPiece);
    window.enPassant = null;
}








function updateToMove(player, roll, required){
    // window.whoseMove = player;
    // state.whoseTurn = player;

    if (roll === undefined || required === undefined){
        document.getElementById('toMove').innerHTML = `${player}'s turn to move`;
    }
    else{
        document.getElementById('toMove').innerHTML = `${player} needed a ${required} and rolled a ${roll}. ${player}'s turn to move`;
    }
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
        navigator.clipboard.writeText(`https://jackeown.github.io/DiceChess/#${peer.id}`);
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
    
    updateToMove(color, roll, requiredRoll(opponentsTurn));
    if (requiredRoll(opponentsTurn) == roll){
        state.anotherTurn = true;
        if (opponentsTurn){
            boardStatus("bad");
        }
        if (!opponentsTurn){
            boardStatus("good");
        }
    }
}

function rollDice(){
    // Roll 2 dice and send the result to the opponent.
    let roll = Math.floor(Math.random() * 6) + 1;
    let roll2 = Math.floor(Math.random() * 6) + 1;

    // let roll = Math.floor(Math.random() * 6)+1;
    // let roll2 = requiredRoll(false) - roll;

    window.conn.send({
        type: 'roll',
        value: [roll,roll2]
    });

    // rollDiceGUI(roll,roll2);
    processRoll([roll,roll2], 0);
}


function initializeOrientation(){
    if (peer.id < window.conn.peer){
        board.orientation('white');
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
            updateToMove(board.orientation() == 'white' ? 'black' : 'white');
            rollDice();
        }
        else if (chessBoard.classList.contains("bad")) {
            boardStatus("active");
            updateToMove(board.orientation() == 'white' ? 'black' : 'white');
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
    updateToMove('white');
    document.getElementById('opponentCode').value = window.conn.peer;
    document.getElementById('connect').disabled = true;
    initializeOrientation();
    document.getElementById('chessBoard').classList.add("active")
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



document.body.onload = function () {
    window.peer = new Peer();

    peer.on('connection', processConnection);

    // Set Connect code in the DOM.
    setTimeout(function(){
        document.getElementById('connectCode').innerHTML = peer.id;
    },2000);

    setTimeout(function(){
        // If there's a hash in the url, use it to connect to the peer.
        if (window.location.hash.length > 1){
            connectToPeer(window.location.hash.slice(1));
        }
    }, 4000);
};


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