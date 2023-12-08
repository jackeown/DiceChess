function updateToMove(player, roll, required){
    window.whoseMove = player;

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
    let opponentColor = board.orientation() == 'white' ? 'black' : 'white';
    let color = opponentsTurn ? opponentColor : board.orientation();
    
    updateToMove(color, roll, requiredRoll(opponentsTurn));
    if (opponentsTurn && roll == requiredRoll(opponentsTurn)){
        boardStatus("bad");
    }
    if (!opponentsTurn && roll == requiredRoll(opponentsTurn)){
        boardStatus("good");
    }
}

function rollDice(){
    // Roll 2 dice and send the result to the opponent.
    let roll = Math.floor(Math.random() * 6) + 1;
    let roll2 = Math.floor(Math.random() * 6) + 1;
    let total = roll + roll2;
    window.conn.send({
        type: 'roll',
        value: total
    });

    // Trigger Animation CSS
    // TODO


    processRoll(total, 0);
}

function recvData(data){
    let chessBoard = document.getElementById("chessBoard");

    console.log('Received', data);
    if (data.type == 'position'){
        board.position(data.value);
        window.position = data.value;
        if(chessBoard.classList.contains("active")){ // if opponent only has one move or is on its second.
            updateToMove(board.orientation());
            boardStatus("active");
            rollDice();
        }
        else if(chessBoard.classList.contains("bad")){ // The first move of two.
            boardStatus("active");
            updateToMove(board.orientation() == 'white' ? 'black' : 'white');
        }
    }
    else if(data.type == 'roll'){
        processRoll(data.value, 1);
    }
}

function initializeOrientation(){
    if (peer.id < window.conn.peer){
        board.orientation('white');
    }
    else{
        board.orientation('black');
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


    // Setup global game state:
    // 1.) window.position holds the current location of all pieces
    window.position = board.position();
    // 2.) window.enPassant holds any legal en passant moves
    window.enPassant = [];
    // 3.) window.castleEligibility maps each king and rook to a boolean for whether they can castle.
    window.castleEligibility = {
        'wK': true,
        'bK': true,
        'wRa': true, // a file rooks
        'bRa': true,
        'wRh': true, // h file rooks
        'bRh': true
    }

    // Add white glow to the board.
    // This is also the sketchy way I'm tracking whether someone has two moves.
    // White/active means you or your opponent are on the only move or second move of the persons turn.
    // Green/good means you have two moves and you're on your first.
    // Red/bad means your opponent has two moves, and they're on their first.
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